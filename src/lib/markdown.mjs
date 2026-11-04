// A small Markdown to HTML converter for the technical references that are
// vendored from the three tool repositories. It covers exactly what those
// documents use: headings, paragraphs, bullet and numbered lists (nested),
// fenced code, block quotes, inline code, bold, italic and links. Constructs
// that would change the meaning if they were rendered wrongly (tables, images,
// raw HTML, setext headings, reference links, tilde and longer code fences)
// throw, so a new construct upstream is noticed by the tests instead of being
// silently mangled. Things that only affect looks stay literal text:
// underscore emphasis, hard line breaks and entities. All text is escaped; no
// raw HTML is ever passed through.

const escapeHtml = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const markerPattern = /^(\s*)([*+-]|\d+\.)\s+(.*)$/;
const fencePattern = /^(\s*)```(?!`)/;
const unsupportedBlock = [
  [/^\s*(~~~|````)/, "Tilde and four-backtick code fences are not supported"],
  [/^\s*<\/?(?!https?:)[A-Za-z!]/, "Raw HTML is not supported"],
  [/^\s{0,3}\[[^\]]+\]:\s*\S/, "Reference-style links are not supported"],
];
const tableSeparator = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const setextUnderline = /^\s{0,3}(=+|-+)\s*$/;
const headingPattern = /^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/;

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function isSafeHref(href) {
  return /^(https?:\/\/|#|[^:]*$)/.test(href) && !/^\s*javascript:/i.test(href);
}

// Inline elements: `code`, **bold**, *italic*, [text](address), <https://...>
// and backslash escapes. A marker without a partner stays literal text.
function renderInline(text, context) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\" && /[\\`*_{}[\]()#+\-.!<>|]/.test(text[i + 1] ?? "")) {
      out += escapeHtml(text[i + 1]);
      i += 2;
      continue;
    }
    if (ch === "`") {
      let run = 1;
      while (text[i + run] === "`") run++;
      const fence = "`".repeat(run);
      const end = text.indexOf(fence, i + run);
      if (end !== -1) {
        let code = text.slice(i + run, end);
        if (code.length > 2 && code.startsWith(" ") && code.endsWith(" "))
          code = code.slice(1, -1);
        out += `<code>${escapeHtml(code)}</code>`;
        i = end + run;
        continue;
      }
      out += escapeHtml(fence);
      i += run;
      continue;
    }
    if (ch === "<") {
      const auto = /^<(https?:\/\/[^\s<>]+)>/.exec(text.slice(i));
      if (auto) {
        out += link(auto[1], escapeHtml(auto[1]), context);
        i += auto[0].length;
        continue;
      }
    }
    if (ch === "!" && text[i + 1] === "[")
      throw new Error("Markdown images are not supported");
    if (ch === "[") {
      const close = findClosingBracket(text, i);
      if (close !== -1 && text[close + 1] === "(") {
        const end = findClosingParen(text, close + 1);
        if (end !== -1) {
          const href = text.slice(close + 2, end).trim();
          if (href && !/\s/.test(href)) {
            out += link(
              href,
              renderInline(text.slice(i + 1, close), context),
              context,
            );
            i = end + 1;
            continue;
          }
        }
      }
    }
    if (ch === "*") {
      const strong = text.startsWith("**", i);
      const marker = strong ? "**" : "*";
      const start = i + marker.length;
      if (start < text.length && !/\s/.test(text[start])) {
        let end = findEmphasisEnd(text, start, marker);
        if (end !== -1) {
          const tag = strong ? "strong" : "em";
          out += `<${tag}>${renderInline(text.slice(start, end), context)}</${tag}>`;
          i = end + marker.length;
          continue;
        }
      }
    }
    out += escapeHtml(ch);
    i++;
  }
  return out;
}

// The closing bracket that matches the opening one at `from`, skipping code
// spans and nested brackets.
function findClosingBracket(text, from) {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") i++;
    else if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end === -1) return -1;
      i = end;
    } else if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) return i;
  }
  return -1;
}

// The parenthesis that closes the one at `from`; addresses may hold balanced
// pairs, as in https://en.wikipedia.org/wiki/Foo_(bar).
function findClosingParen(text, from) {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === "\\") i++;
    else if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

function findEmphasisEnd(text, from, marker) {
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") i++;
    else if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end === -1) return -1;
      i = end;
    } else if (text.startsWith(marker, i) && !/\s/.test(text[i - 1] ?? " ")) {
      if (marker === "*" && text[i + 1] === "*") {
        i++;
        continue;
      }
      return i;
    }
  }
  return -1;
}

function link(href, label, context) {
  if (!isSafeHref(href)) throw new Error(`Unsafe link address: ${href}`);
  const target = context.rewriteHref(href);
  const attributes = target.external
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
  return `<a href="${escapeHtml(target.href)}"${attributes}>${label}</a>`;
}

// Breaks `text` into lines of at most `width` columns. The first line starts
// with `prefix`, the following ones are indented by `hang` spaces. A run of
// spaces inside the text is kept unless the line breaks there.
function wrapWords(prefix, text, hang, width) {
  const out = [];
  let current = prefix;
  let gap = "";
  for (const token of text.split(/( +)/).filter(Boolean)) {
    if (/^ +$/.test(token)) {
      gap = token;
      continue;
    }
    if (current === prefix) current += token;
    else if (current.length + gap.length + token.length > width) {
      out.push(current);
      current = " ".repeat(hang) + token;
    } else current += gap + token;
    gap = "";
  }
  out.push(current);
  return out;
}

// Like wrapWords, for a row of options separated by three or more spaces:
// lines break between options, so "[3] Detecting changed videos" stays whole.
// An option that is too long on its own is wrapped by words.
function wrapOptions(prefix, text, hang, width) {
  const out = [];
  let current = prefix;
  for (const option of text.split(/ {3,}/)) {
    if (current === prefix) current += option;
    else if (current.length + 3 + option.length <= width)
      current += "   " + option;
    else {
      out.push(current);
      current = " ".repeat(hang) + option;
    }
  }
  const last = current.slice(hang).length + hang > width;
  if (!last) return [...out, current];
  const [first, ...rest] = wrapWords(
    current.slice(0, hang),
    current.slice(hang),
    hang,
    width,
  );
  return [...out, first, ...rest];
}

// Re-wraps the long descriptions of a two-column listing (a menu tree: a label,
// a run of spaces, then free text that continues on the lines below) so that
// the text stays in its column and nothing is wider than `width`. Only entries
// with a line that is too long are touched. A prose description is reflowed as
// one paragraph; a row of options (text that itself starts with "[1]") keeps
// its line breaks and each line is wrapped on its own. Everything that does not
// look like such a listing is left as it is.
export function wrapCodeLines(lines, width) {
  const entryPattern = /^(\s*\[[^\]]+\].*?\S)( {2,})(?=\S)/;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const indent = lines[i].search(/\S/);
    if (lines[i].length > width && indent >= 20 && indent <= width / 2) {
      // a further row of options in the description column
      out.push(
        ...wrapOptions(" ".repeat(indent), lines[i].trim(), indent, width),
      );
      continue;
    }
    const head = entryPattern.exec(lines[i]);
    if (!head) {
      out.push(lines[i]);
      continue;
    }
    const group = [lines[i]];
    while (
      i + 1 < lines.length &&
      lines[i + 1].search(/\S/) >= 8 &&
      !/^\s*\[/.test(lines[i + 1])
    )
      group.push(lines[++i]);
    const firstHang = head[1].length + head[2].length;
    const hang = group.length > 1 ? group[1].search(/\S/) : firstHang;
    if (group.every((line) => line.length <= width) || hang > width / 2) {
      out.push(...group);
      continue;
    }
    const text = group[0].slice(firstHang);
    const prefix = group[0].slice(0, firstHang);
    if (text.startsWith("[")) {
      out.push(...wrapOptions(prefix, text, hang, width));
      for (const line of group.slice(1))
        out.push(...wrapOptions(" ".repeat(hang), line.trim(), hang, width));
    } else {
      const paragraph = [text, ...group.slice(1).map((l) => l.trim())].join(
        " ",
      );
      out.push(...wrapWords(prefix, paragraph, hang, width));
    }
  }
  return out;
}

function startsBlock(line) {
  if (fencePattern.test(line) || headingPattern.test(line)) return true;
  if (/^\s{0,3}>/.test(line)) return true;
  const marker = markerPattern.exec(line);
  return Boolean(marker && (/^[*+-]$/.test(marker[2]) || marker[2] === "1."));
}

function plainText(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function renderBlocks(lines, context) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    for (const [pattern, message] of unsupportedBlock)
      if (pattern.test(line)) throw new Error(message);
    if (fencePattern.test(line)) {
      const indent = fencePattern.exec(line)[1].length;
      const code = [];
      i++;
      while (i < lines.length && !fencePattern.test(lines[i])) {
        code.push(lines[i].slice(Math.min(indent, lines[i].search(/\S|$/))));
        i++;
      }
      if (i >= lines.length) throw new Error("Unterminated code fence");
      i++;
      const shown = context.codeWidth
        ? wrapCodeLines(code, context.codeWidth)
        : code;
      blocks.push({
        type: "code",
        html: `<pre><code>${escapeHtml(shown.join("\n"))}</code></pre>`,
      });
      continue;
    }
    const heading = headingPattern.exec(line);
    if (heading) {
      const level = heading[1].length;
      const html = renderInline(heading[2], context);
      let id = "";
      if (level > 1) {
        const base = `${context.idPrefix}${slugify(plainText(html))}`;
        id = base;
        for (let n = 2; context.ids.has(id); n++) id = `${base}-${n}`;
        context.ids.add(id);
        context.headings.push({ level, id, text: plainText(html) });
      }
      const attribute = id ? ` id="${id}"` : "";
      blocks.push({
        type: "heading",
        html: `<h${level}${attribute}>${html}</h${level}>`,
      });
      i++;
      continue;
    }
    if (/^\s*\|/.test(line))
      throw new Error("Markdown tables are not supported");
    if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "rule", html: "<hr />" });
      i++;
      continue;
    }
    if (/^\s{0,3}>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s{0,3}> ?/, ""));
        i++;
      }
      blocks.push({
        type: "quote",
        html: `<blockquote>${renderBlocks(quote, context)
          .map((b) => b.html)
          .join("")}</blockquote>`,
      });
      continue;
    }
    const marker = markerPattern.exec(line);
    if (marker) {
      const base = marker[1].length;
      const ordered = /\d/.test(marker[2]);
      const raw = [];
      while (i < lines.length) {
        const current = lines[i];
        if (!current.trim()) {
          // A blank line stays inside the list only when the next text line
          // continues it (an indented line or another item of this list).
          let next = i + 1;
          while (next < lines.length && !lines[next].trim()) next++;
          const after = lines[next];
          const m = after === undefined ? null : markerPattern.exec(after);
          const indented = after !== undefined && after.search(/\S/) > base;
          if (
            indented ||
            (m && m[1].length === base && /\d/.test(m[2]) === ordered)
          ) {
            raw.push(current);
            i++;
            continue;
          }
          break;
        }
        if (fencePattern.test(current) && current.search(/\S/) <= base) break;
        const m = markerPattern.exec(current);
        const indent = current.search(/\S/);
        if (indent <= base && !m && startsBlock(current)) break;
        if (indent < base) break;
        if (m && indent === base && /\d/.test(m[2]) !== ordered) break;
        raw.push(current);
        i++;
      }
      const items = [];
      for (const rawLine of raw) {
        const m = markerPattern.exec(rawLine);
        if (m && m[1].length === base) {
          items.push([m[3]]);
        } else if (items.length) {
          items[items.length - 1].push(
            rawLine.slice(Math.min(base + 2, rawLine.search(/\S|$/))),
          );
        }
      }
      const tag = ordered ? "ol" : "ul";
      const rendered = items
        .map((itemLines) => {
          const inner = renderBlocks(itemLines, context);
          const html = inner
            .map((b, index) =>
              index === 0 && b.type === "paragraph" ? b.inline : b.html,
            )
            .join("");
          return `<li>${html}</li>`;
        })
        .join("");
      blocks.push({ type: "list", html: `<${tag}>${rendered}</${tag}>` });
      continue;
    }
    const paragraph = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      if (/^\s*\|/.test(lines[i]) || tableSeparator.test(lines[i]))
        throw new Error("Markdown tables are not supported");
      if (setextUnderline.test(lines[i]) && /\S/.test(paragraph.join("")))
        throw new Error("Setext headings are not supported");
      paragraph.push(lines[i].trim());
      i++;
    }
    const inline = renderInline(paragraph.join(" "), context);
    blocks.push({ type: "paragraph", inline, html: `<p>${inline}</p>` });
  }
  return blocks;
}

export function renderMarkdown(source, options = {}) {
  const context = {
    idPrefix: options.idPrefix ?? "",
    codeWidth: options.codeWidth ?? 0,
    rewriteHref: options.rewriteHref ?? ((href) => ({ href })),
    ids: new Set(options.reservedIds ?? []),
    headings: [],
  };
  const lines = source.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const html = renderBlocks(lines, context)
    .map((block) => block.html)
    .join("\n");
  return { html, headings: context.headings };
}
