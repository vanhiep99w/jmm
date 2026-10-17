# Project conventions

## Documentation

- The published Vietnamese JMM lessons are in `content/docs/jmm/*.md`; they support MDX.
  `JMM.md` is the original reference, not the website source.
- Prefer D2 via `@vanhiep99w/docs-kit` over ASCII/Mermaid for architecture, flows,
  sequences, queues and state diagrams. This project preference overrides the generic
  Mermaid/ASCII defaults in the technical-writing skill. Keep logs, pseudocode,
  equations and directory trees as text when that is more faithful/readable.
- Use icons from https://icons.d2lang.com/ where they clarify a component's identity.
  Do not decorate abstract concepts or imply a vendor dependency that does not exist.
- Use docs-kit components where appropriate: CodeDiff for before/after code,
  CodeWalkthrough for line-by-line explanations, TerminalSession for command transcripts.
  Do not invent latency measurements, command results or protocol exchanges to use a component.
- Keep Vietnamese explanations, frontmatter, manual TOC, technical labels and HB semantics intact.
- See `README.md` for authoring examples. Register new remark plugins in `source.config.ts`,
  React components in `src/components/mdx.tsx`, and styles in `src/app/globals.css`.
  Import build-time renderers only in the build pipeline, never in client components.
- Docs-kit 0.9 removed ConcurrencyLanes; do not use its old component/plugin APIs.

## Validation

- Use Node.js 22.18+ and npm (`package-lock.json` is committed).
- Run `npm test`, `npm run typecheck`, and `npm run build` after changing diagrams/components.
- Check interactive D2 boards, light/dark, narrow screens and no-JavaScript readability
  when changing diagram presentation. Cache and build artifacts must not be committed.
