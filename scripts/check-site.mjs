import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
const errors = [];
const pages = new Map();
let links = 0;
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) await walk(file);
    else if (e.name.endsWith(".html"))
      pages.set(file, await readFile(file, "utf8"));
  }
}
await walk(root);
for (const [file, html] of pages) {
  for (const rule of [
    '<html lang="en"',
    'name="description"',
    "<title>",
    'id="main"',
    "Skip to content",
  ])
    if (!html.includes(rule)) errors.push(`${file}: missing ${rule}`);
  if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1)
    errors.push(`${file}: expected one H1`);
  if (
    /href="https:\/\/github.com\/GlacialPigeon\/media-tools(?:[\/"#?])/.test(
      html,
    )
  )
    errors.push(`${file}: website repository link`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(ids).size !== ids.length) errors.push(`${file}: duplicate IDs`);
  for (const m of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
    const url = m[1];
    if (!url.startsWith("/") && !url.startsWith("#")) continue;
    links++;
    const [pathname, hash] = url.split("#");
    let target = file;
    if (pathname) {
      if (!pathname.startsWith("/media-tools/")) {
        errors.push(`${file}: incorrect base ${url}`);
        continue;
      }
      target = path.join(root, pathname.slice("/media-tools/".length));
      if (pathname.endsWith("/")) target = path.join(target, "index.html");
      try {
        await access(target);
      } catch {
        errors.push(`${file}: broken resource ${url}`);
        continue;
      }
    }
    if (
      hash &&
      pages.has(target) &&
      !pages.get(target).includes(`id="${hash}"`)
    )
      errors.push(`${file}: broken fragment ${url}`);
  }
  for (const m of html.matchAll(/<video\b([^>]*)>/g))
    if (!/\bcontrols\b/.test(m[1]) || !/preload="none"/.test(m[1]))
      errors.push(`${file}: video needs controls and preload="none"`);
  for (const m of html.matchAll(/<a\b([^>]+)>/g)) {
    if (
      /href="https?:\/\//.test(m[1]) &&
      (!/target="_blank"/.test(m[1]) ||
        !/rel="[^"]*noopener/.test(m[1]) ||
        !/rel="[^"]*noreferrer/.test(m[1]))
    )
      errors.push(`${file}: external link must open safely in a new tab`);
  }
  for (const m of html.matchAll(/<img\b([^>]+)>/g))
    if (
      !/\balt=/.test(m[1]) ||
      !/\bwidth=/.test(m[1]) ||
      !/\bheight=/.test(m[1])
    )
      errors.push(`${file}: image needs alt and dimensions`);
  for (const m of html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"/g))
    if (!html.includes(`for="${m[1]}"`))
      errors.push(`${file}: unlabeled control ${m[1]}`);
}
if (pages.size !== 15) errors.push(`Expected 15 pages, found ${pages.size}`);
const home = pages.get(path.join(root, "index.html")) || "";
if (!home.includes('id="faq"') || !home.includes('id="compare"'))
  errors.push("Missing FAQ/comparison");
for (const slug of ["trickplay-generator", "cataloger", "diversity-sampler"]) {
  const product = pages.get(path.join(root, `tools/${slug}/index.html`)) || "";
  for (const id of [
    "overview",
    "guide",
    "technical",
    "requirements",
    "source",
    "dependencies",
    "first-run",
    "troubleshooting",
  ]) {
    if (!product.includes(`id="${id}"`)) errors.push(`${slug}: missing ${id}`);
  }
  if (
    !product.includes('data-platform="windows"') ||
    !product.includes('data-platform="linux"')
  )
    errors.push(`${slug}: missing platforms`);
  if (
    !product.includes(
      `/GlacialPigeon/${slug === "cataloger" ? "MediaCataloger" : slug === "diversity-sampler" ? "MediaDiversitySampler" : "MediaTrickplayGenerator"}/issues`,
    )
  )
    errors.push(`${slug}: missing support link`);
  for (const route of ["guides", "technical"]) {
    const old = pages.get(path.join(root, `${route}/${slug}/index.html`)) || "";
    if (
      !old.includes(
        `tools/${slug}/#${route === "guides" ? "guide" : "technical"}`,
      )
    )
      errors.push(`${slug}: missing redirect`);
  }
}
if (!home.includes('href="https://jellyfin.org/"'))
  errors.push("Missing Jellyfin link");
for (const html of pages.values()) {
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] || "";
  if (
    header.includes("Get the tools") ||
    header.includes("guides/") ||
    header.includes("technical/")
  )
    errors.push("Obsolete header navigation");
}
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
if ((sitemap.match(/<loc>/g) || []).length !== 5)
  errors.push("Sitemap route count");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `PASS: ${pages.size} pages; ${links} resource/fragment links; semantic structure, labels, images, FAQ, comparison and sitemap.`,
);
