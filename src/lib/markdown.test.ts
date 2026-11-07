import assert from "node:assert/strict";
import { test } from "node:test";
import { renderMarkdown } from "./markdown.ts";

test("escapes HTML and attribute payloads while preserving text", () => {
  const html = renderMarkdown('<script>alert("x")</script><img src=x onerror="alert(1)"> &');
  assert.equal(html, '<p>&lt;script&gt;alert("x")&lt;/script&gt;&lt;img src=x onerror="alert(1)"&gt; &amp;</p>');
  assert.doesNotMatch(html, /<script|<img/);
});

test("retains supported Markdown formatting without interpreting raw HTML", () => {
  assert.equal(renderMarkdown("**bold** and `a < b`"), "<p><strong>bold</strong> and <code>a &lt; b</code></p>");
  assert.equal(renderMarkdown("[safe](https://example.com)"), '<p><a href="https://example.com" target="_blank" rel="noreferrer">safe</a></p>');
});

test("does not double-escape existing entity-looking text", () => {
  assert.equal(renderMarkdown("&lt;script&gt;"), "<p>&amp;lt;script&amp;gt;</p>");
});
