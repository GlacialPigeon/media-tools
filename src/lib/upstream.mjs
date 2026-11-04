import { readFileSync } from "node:fs";
import { renderMarkdown } from "./markdown.mjs";

// The technical references of the three tools live in their own repositories.
// vendor/upstream holds a copy of each technical.md at a pinned revision
// (see scripts/sync-upstream.mjs), and the site renders that copy at build
// time. Paths are relative to the project root, as in media.mjs.
const root = "vendor/upstream";
const owner = "https://github.com/GlacialPigeon/";

// Drops what only makes sense on GitHub: the title (the page has its own),
// the pointer to the README (the Guide is on this page) and the license
// section (up to the next section, so anything added after it stays).
export function prepareDocument(source) {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*# [^\n]*\n+/, "")
    .replace(
      /^The short introduction and the setup are in the \[README\][^\n]*(?:\n(?!\n)[^\n]*)*\n*/,
      "",
    )
    .replace(/\n## License\n[\s\S]*?(?=\n## |$)/, "\n");
}

export function rewriteHref(repo, sha) {
  return (href) => {
    if (/^https?:\/\//.test(href)) return { href, external: true };
    if (href.startsWith("#")) return { href: `#ref-${href.slice(1)}` };
    const [file] = href.split("#");
    if (file === "README.md") return { href: "#guide" };
    return { href: `${owner}${repo}/blob/${sha}/${file}`, external: true };
  };
}

export function renderUpstream(repo) {
  const revisions = JSON.parse(readFileSync(`${root}/revisions.json`, "utf8"));
  const sha = revisions[repo]?.sha;
  if (!sha) throw new Error(`No pinned revision for ${repo}`);
  const source = readFileSync(`${root}/${repo}/technical.md`, "utf8");
  const { html, headings } = renderMarkdown(prepareDocument(source), {
    idPrefix: "ref-",
    codeWidth: 84,
    rewriteHref: rewriteHref(repo, sha),
  });
  return { html, headings, sha, shortSha: sha.slice(0, 7) };
}
