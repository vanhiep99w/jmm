import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { SKIP, visit } from 'unist-util-visit';

const alertConfig = {
  NOTE: { type: 'info', title: 'Lưu ý' },
  TIP: { type: 'success', title: 'Mẹo' },
  IMPORTANT: { type: 'idea', title: 'Quan trọng' },
  WARNING: { type: 'warning', title: 'Cảnh báo' },
  CAUTION: { type: 'error', title: 'Thận trọng' },
} as const;

function remarkGithubAlerts() {
  return (tree: import('mdast').Root) => {
    visit(tree, 'blockquote', (node, index, parent) => {
      if (index === undefined || !parent) return;

      const paragraph = node.children[0];
      if (paragraph?.type !== 'paragraph') return;

      const marker = paragraph.children[0];
      if (marker?.type !== 'text') return;

      const match = marker.value.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\r?\n|\s+)?/,
      );
      if (!match) return;

      const alert = alertConfig[match[1] as keyof typeof alertConfig];
      marker.value = marker.value.slice(match[0].length);

      if (marker.value.length === 0) paragraph.children.shift();
      if (paragraph.children.length === 0) node.children.shift();

      (parent.children as unknown[])[index] = {
        type: 'mdxJsxFlowElement',
        name: 'Callout',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'type', value: alert.type },
          { type: 'mdxJsxAttribute', name: 'title', value: alert.title },
        ],
        children: node.children,
      };

      return SKIP;
    });
  };
}

function remarkMermaid() {
  return (tree: import('mdast').Root) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || index === undefined || !parent) return;
      (parent.children as unknown[])[index] = {
        type: 'mdxJsxFlowElement',
        name: 'MermaidDiagram',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'chart',
            value: node.value,
          },
        ],
        children: [],
      };
    });
  };
}

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkGithubAlerts, remarkMermaid],
  },
});
