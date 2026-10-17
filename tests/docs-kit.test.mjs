import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { compile } from '@mdx-js/mdx';
import config from '../source.config.ts';

const docsDir = path.resolve('content/docs/jmm');
const withoutFrontmatter = (source) => source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

// Compile every real page through the site's plugins, including D2's light/dark
// renderer and the YAML validators/highlighters for the other docs-kit fences.
test('all JMM pages compile through the docs-kit pipeline', async (t) => {
  const names = (await readdir(docsDir)).filter((name) => name.endsWith('.md')).sort();
  assert.ok(names.length > 0);
  const components = new Set();

  for (const name of names) {
    await t.test(name, async () => {
      const file = path.join(docsDir, name);
      const source = await readFile(file, 'utf8');
      assert.doesNotMatch(source, /^```mermaid\b/m, 'Use D2 for site diagrams');
      const result = await compile({ path: file, value: withoutFrontmatter(source) }, config.mdxOptions);
      const js = String(result);
      for (const component of ['D2Diagram', 'D2InteractiveDiagram', 'CodeDiff', 'CodeWalkthrough', 'TerminalSession']) {
        if (js.includes(component)) components.add(component);
      }
      if (/^```d2\b/m.test(source)) {
        assert.match(js, /D2(?:Interactive)?Diagram/);
        assert.match(js, /<svg/, 'D2 SVG must be generated at build time');
      }
    });
  }

  for (const name of ['D2InteractiveDiagram', 'CodeDiff', 'CodeWalkthrough', 'TerminalSession']) {
    assert.ok(components.has(name), `Missing real example of ${name}`);
  }
});

test('GitHub alerts are preserved alongside docs-kit', async () => {
  const result = await compile('> [!WARNING]\n> Không dùng volatile cho counter++.', config.mdxOptions);
  assert.match(String(result), /Callout/);
  assert.match(String(result), /Cảnh báo/);
});

test('plain text and Java remain code blocks', async () => {
  const result = await compile('```text\nA HB B và B HB C ⇒ A HB C\n```\n\n```java\nint x = 1;\n```', config.mdxOptions);
  assert.doesNotMatch(String(result), /D2(?:Interactive)?Diagram/);
  assert.match(String(result), /language-text/);
  assert.match(String(result), /language-java/);
});
