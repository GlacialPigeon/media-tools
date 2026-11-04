import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  renderMarkdown,
  slugify,
  wrapCodeLines,
} from "../src/lib/markdown.mjs";
import { prepareDocument, renderUpstream } from "../src/lib/upstream.mjs";
import { applyOverrides, upstreamRepos } from "./upstream-lib.mjs";

const render = (text, options) => renderMarkdown(text, options);

test("headings get unique, prefixed ids and the title is left without one", () => {
  const { html, headings } = render(
    "# Title\n\n## Same\n\n### Same\n\n## Same",
    {
      idPrefix: "ref-",
    },
  );
  assert.deepEqual(
    headings.map((h) => h.id),
    ["ref-same", "ref-same-2", "ref-same-3"],
  );
  assert.match(html, /<h1>Title<\/h1>/);
  assert.equal(
    slugify("Safety rules (the point of the design)"),
    "safety-rules-the-point-of-the-design",
  );
});

test("text is escaped and inline markup is rendered", () => {
  const { html } = render(
    "Use `a < b` and **bold**, *italic* and <script>alert(1)</script> here.",
  );
  assert.equal(
    html,
    "<p>Use <code>a &lt; b</code> and <strong>bold</strong>, <em>italic</em> and &lt;script&gt;alert(1)&lt;/script&gt; here.</p>",
  );
});

test("markers without a partner stay literal", () => {
  assert.equal(render("2 * 3 and a*b").html, "<p>2 * 3 and a*b</p>");
  assert.equal(
    render("modules/`**/*.py`").html,
    "<p>modules/<code>**/*.py</code></p>",
  );
});

test("links are rewritten and external ones open safely", () => {
  const rewriteHref = (href) =>
    href.startsWith("http") ? { href, external: true } : { href: "#guide" };
  const { html } = render(
    "See [the guide](README.md#x), <https://example.com/a> and [site](https://example.org).",
    {
      rewriteHref,
    },
  );
  assert.match(html, /<a href="#guide">the guide<\/a>/);
  assert.match(
    html,
    /<a href="https:\/\/example\.com\/a" target="_blank" rel="noopener noreferrer">https:\/\/example\.com\/a<\/a>/,
  );
  assert.match(
    html,
    /<a href="https:\/\/example\.org" target="_blank" rel="noopener noreferrer">site<\/a>/,
  );
  assert.throws(() => render("[x](javascript:alert(1))"), /Unsafe link/);
});

test("lists nest, continue on indented lines and can be numbered", () => {
  const { html } = render(
    "* one\n  continues\n* two:\n  * inner a\n  * inner b\n\n1. first\n2. second",
  );
  assert.equal(
    html,
    "<ul><li>one continues</li><li>two:<ul><li>inner a</li><li>inner b</li></ul></li></ul>\n<ol><li>first</li><li>second</li></ol>",
  );
});

test("block quotes and code fences", () => {
  const { html } = render(
    "> Version `1.0`\n> more\n\n```\nif a < b:\n    run()\n```",
  );
  assert.equal(
    html,
    "<blockquote><p>Version <code>1.0</code> more</p></blockquote>\n<pre><code>if a &lt; b:\n    run()</code></pre>",
  );
  assert.throws(() => render("```\nnever closed"), /Unterminated/);
});

test("long menu descriptions are re-wrapped inside their column", () => {
  const menu = [
    "[1] Generate    scan, plan, disk estimate, run",
    "[2] Verify      one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen",
    "                continued text that is also quite long and has to wrap as well because it is over the width",
    "      [3] Deep   short",
  ];
  const wrapped = wrapCodeLines(menu, 60);
  assert.ok(
    wrapped.every((line) => line.length <= 60),
    wrapped.join("\n"),
  );
  assert.equal(wrapped[0], menu[0]);
  const verify = wrapped.findIndex((line) => line.startsWith("[2] Verify"));
  assert.ok(wrapped[verify + 1].startsWith(" ".repeat(16)));
  assert.equal(
    wrapped.join(" ").replace(/\s+/g, " "),
    menu.join(" ").replace(/\s+/g, " "),
  );
  const plain = ["x".repeat(100)];
  assert.deepEqual(wrapCodeLines(plain, 60), plain);
});

test("constructs that would change meaning are refused", () => {
  assert.throws(() => render("| a | b |\n|---|---|"), /tables/);
  assert.throws(() => render("Name | Value\n--- | ---\na | b"), /tables/);
  assert.throws(() => render("![alt](x.png)"), /images/);
  assert.throws(() => render("Title\n=====\n"), /Setext/);
  assert.throws(() => render("text\n---\nmore"), /Setext/);
  assert.throws(() => render("~~~\ncode\n~~~"), /fences/);
  assert.throws(() => render("````\ncode\n````"), /fences/);
  assert.throws(() => render("<details>x</details>"), /HTML/);
  assert.throws(
    () => render("[text][ref]\n\n[ref]: https://example.com"),
    /Reference/,
  );
});

test("things that are allowed are not mistaken for refused ones", () => {
  assert.match(render("<https://example.com/x> is a link").html, /<a href=/);
  assert.match(render("a < b and a > b").html, /a &lt; b/);
  assert.match(render("text\n\n---\n\nmore").html, /<hr \/>/);
  assert.match(render("```sh\n<b>x</b>\n```").html, /&lt;b&gt;x/);
});

test("addresses may contain balanced parentheses", () => {
  const html = render("[a](https://en.wikipedia.org/wiki/Foo_(bar)) next").html;
  assert.match(html, /href="https:\/\/en\.wikipedia\.org\/wiki\/Foo_\(bar\)"/);
  assert.match(html, /<\/a> next/);
});

test("prepareDocument drops the title, the README pointer and the license", () => {
  const out = prepareDocument(
    "# T\n\nThe short introduction and the setup are in the [README](README.md).\nMore.\n\nBody.\n\n## License\n\nSee [LICENSE](LICENSE).\n",
  );
  assert.equal(out.trim(), "Body.");
  const later = prepareDocument(
    "# T\n\nBody.\n\n## License\n\nMIT.\n\n## After\n\nKept.\n",
  );
  assert.match(later, /## After/);
  assert.doesNotMatch(later, /MIT/);
});

test("overrides must match exactly once", () => {
  const rule = { description: "d", from: "old", to: "new" };
  assert.equal(applyOverrides("an old text", [rule]), "an new text");
  assert.throws(() => applyOverrides("nothing", [rule]), /0 times/);
  assert.throws(() => applyOverrides("old old", [rule]), /2 times/);
});

test("pinned revisions are complete", () => {
  const revisions = JSON.parse(
    readFileSync("vendor/upstream/revisions.json", "utf8"),
  );
  assert.deepEqual(Object.keys(revisions).sort(), [...upstreamRepos].sort());
  for (const repo of upstreamRepos)
    assert.match(revisions[repo].sha, /^[0-9a-f]{40}$/);
});

test("the vendored technical references render cleanly", () => {
  const overrides = JSON.parse(
    readFileSync("vendor/upstream/overrides.json", "utf8"),
  );
  for (const repo of upstreamRepos) {
    const doc = renderUpstream(repo);
    const ids = [...doc.html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${repo}: duplicate ids`);
    assert.ok(doc.headings.length >= 5, `${repo}: too few sections`);
    assert.doesNotMatch(
      doc.html,
      /<h1|<table|<img/,
      `${repo}: unexpected markup`,
    );
    assert.doesNotMatch(
      doc.html,
      /README\.md|\]\(/,
      `${repo}: unresolved link`,
    );
    const outsideCode = doc.html.replace(
      /<pre[\s\S]*?<\/pre>|<code>[\s\S]*?<\/code>/g,
      "",
    );
    assert.doesNotMatch(outsideCode, /\*\*|`/, `${repo}: leftover markup`);
    for (const m of doc.html.matchAll(/<a href="(#[^"]+)"/g))
      if (m[1] !== "#guide")
        assert.ok(ids.includes(m[1].slice(1)), `${repo}: broken ${m[1]}`);
    for (const m of doc.html.matchAll(/<a href="https?:[^>]*>/g))
      assert.match(m[0], /target="_blank" rel="noopener noreferrer"/);
    const source = readFileSync(`vendor/upstream/${repo}/technical.md`, "utf8");
    for (const { from, to } of overrides[repo] ?? []) {
      assert.ok(source.includes(to), `${repo}: override not applied`);
      assert.ok(!source.includes(from), `${repo}: stale text still present`);
    }
  }
});

test("the site does not repeat the stale Windows claim", () => {
  const doc = renderUpstream("MediaTrickplayGenerator").html;
  assert.doesNotMatch(doc, /real Windows machine/i);
  assert.doesNotMatch(
    readFileSync("src/data/tools.ts", "utf8"),
    /Windows adapter/i,
  );
});
