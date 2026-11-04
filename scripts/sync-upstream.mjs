// Keeps vendor/upstream/<Repo>/technical.md in step with the main branch of
// each tool repository.
//
//   node scripts/sync-upstream.mjs            update the vendored copies
//   node scripts/sync-upstream.mjs --check    exit 1 if they are out of date
//
// Only the content of technical.md decides: a new commit upstream that does not
// touch the document is not drift. The corrections in
// vendor/upstream/overrides.json are applied to the upstream text before it is
// compared or written.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { applyOverrides, upstreamRepos } from "./upstream-lib.mjs";

const check = process.argv.includes("--check");
const vendor = path.resolve("vendor/upstream");
const overrides = JSON.parse(
  readFileSync(path.join(vendor, "overrides.json"), "utf8"),
);
const revisionsFile = path.join(vendor, "revisions.json");
const revisions = JSON.parse(readFileSync(revisionsFile, "utf8"));
const normalize = (text) => text.replace(/\r\n?/g, "\n");
const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

let drift = 0;
for (const repo of upstreamRepos) {
  const work = mkdtempSync(path.join(tmpdir(), "upstream-"));
  try {
    git(
      work,
      "clone",
      "--quiet",
      "--depth",
      "1",
      "--branch",
      "main",
      `https://github.com/GlacialPigeon/${repo}.git`,
      ".",
    );
    const sha = git(work, "rev-parse", "HEAD");
    let source;
    try {
      source = readFileSync(path.join(work, "technical.md"), "utf8");
    } catch {
      throw new Error(
        `${repo}: technical.md was not found on its main branch.`,
      );
    }
    const upstream = applyOverrides(source, overrides[repo]);
    const file = path.join(vendor, repo, "technical.md");
    const current = normalize(readFileSync(file, "utf8"));
    const same = current === upstream;
    if (check) {
      if (!same) {
        drift++;
        console.error(
          `${repo}: technical.md differs from upstream ${sha.slice(0, 7)} (pinned ${(revisions[repo]?.sha ?? "none").slice(0, 7)}).`,
        );
      } else console.log(`${repo}: up to date (${sha.slice(0, 7)}).`);
    } else {
      writeFileSync(file, upstream);
      revisions[repo] = { sha };
      console.log(
        `${repo}: ${same ? "unchanged" : "updated"} at ${sha.slice(0, 7)}.`,
      );
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
if (check) {
  if (drift) {
    console.error(
      "Run `npm run sync:upstream`, review the diff and commit it.",
    );
    process.exit(1);
  }
} else {
  writeFileSync(revisionsFile, `${JSON.stringify(revisions, null, 2)}\n`);
}
