# JMM Learning

Tài liệu học **Java Memory Model (JMM)** bằng tiếng Việt — dựng bằng Next.js 15 +
[Fumadocs](https://fumadocs.vercel.app/), deploy lên Cloudflare Pages.

> Sườn project được tạo bằng skill [`write-docs`](.agents/skills/write-docs/SKILL.md).
> Nội dung gốc nằm ở [`JMM.md`](JMM.md); các file trong `content/docs/jmm/` hiện là
> **placeholder** để dựng flow học, sẽ được bổ sung chi tiết dần.

## Cấu trúc

```
jmm/
├── JMM.md                     # Nội dung gốc (master doc)
├── content/docs/              # Doc files cho Fumadocs
│   ├── meta.json              # Thứ tự category ở sidebar
│   └── jmm/
│       ├── meta.json          # Thứ tự bài học trong category
│       └── NN-*.md            # Placeholder theo từng chủ đề JMM
├── src/                       # Next.js app (Fumadocs UI)
├── source.config.ts           # Fumadocs MDX config (+ Mermaid)
├── next.config.mjs
└── wrangler.toml              # Cloudflare Pages
```

## Chạy local

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build & Deploy

```bash
npm run build    # next build → ./dist (static export)
npm run deploy   # build + wrangler pages deploy dist
```

## Thêm / sửa bài học

1. Tạo / sửa file `.md` trong `content/docs/jmm/`.
2. Đăng ký tên file (không có `.md`) vào `content/docs/jmm/meta.json` đúng thứ tự.
3. Frontmatter `title` + `description` bắt buộc, viết bằng tiếng Việt.
4. `npm run dev` để kiểm tra bài xuất hiện đúng vị trí trên sidebar.

Xem chi tiết quy ước trong [`.agents/skills/write-docs/SKILL.md`](.agents/skills/write-docs/SKILL.md).
