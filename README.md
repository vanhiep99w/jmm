# JMM Learning

Tài liệu học **Java Memory Model (JMM)** bằng tiếng Việt, dựng bằng Next.js 16 +
[Fumadocs](https://www.fumadocs.dev/), xuất website tĩnh lên Cloudflare Pages.
Các bài học nằm trong `content/docs/jmm/`; `JMM.md` là bản nội dung gốc để tham khảo.

## Mục lục

- [Cấu trúc](#cấu-trúc)
- [Chạy local](#chạy-local)
- [Kiểm tra, build và deploy](#kiểm-tra-build-và-deploy)
- [Thêm / sửa bài học](#thêm--sửa-bài-học)
- [Diagram và component docs-kit](#diagram-và-component-docs-kit)

## Cấu trúc

```text
jmm/
├── JMM.md                     # Bản nội dung gốc
├── content/docs/jmm/           # Các bài học và meta.json cho sidebar
├── src/app/                    # Next.js App Router + Fumadocs
├── src/components/mdx.tsx      # Đăng ký component MDX
├── source.config.ts           # Remark plugins: alerts + docs-kit
├── tests/docs-kit.test.mjs     # Compile các bài học qua pipeline thật
├── next.config.mjs            # Static export → dist/
└── wrangler.toml              # Cloudflare Pages
```

## Chạy local

Dùng **Node.js 22.18+** (các test import cấu hình TypeScript bằng native type stripping).
Không cần D2 CLI, Go hay Java để build website. JDK chỉ cần nếu muốn chạy các ví dụ Java.

```bash
npm ci
npm run dev      # http://localhost:3000
```

## Kiểm tra, build và deploy

```bash
npm test          # Compile toàn bộ bài học, validate D2 và descriptor docs-kit
npm run typecheck
npm run build     # Static export → ./dist
npm run deploy    # Build + wrangler pages deploy dist
```

D2 và syntax highlighting chạy **lúc build**, không đưa compiler/WASM vào browser.
Cache D2 nằm ở `.next/cache/docs-kit/d2`, dùng chung khi test/build và không được deploy.
Trên Cloudflare Pages, đặt Node version phù hợp và bật Build cache nếu cần tái sử dụng
`.next/cache`; kiểm tra log restore cache của nền tảng.

## Thêm / sửa bài học

1. Tạo / sửa file `.md` trong `content/docs/jmm/` (pipeline hỗ trợ MDX components).
2. Đăng ký tên file không có `.md` vào `content/docs/jmm/meta.json` đúng thứ tự.
3. Giữ frontmatter `title`, `description`, mục lục thủ công và nội dung bằng tiếng Việt.
4. Chạy test, typecheck và build; kiểm tra sidebar, diagram ở light/dark và màn hình nhỏ.

## Diagram và component docs-kit

Website dùng [`@vanhiep99w/docs-kit`](https://www.npmjs.com/package/@vanhiep99w/docs-kit)
**0.9.x**. Plugin ở `source.config.ts`, component map ở `src/components/mdx.tsx`,
stylesheet ở `src/app/globals.css`. Giữ ba nơi này đồng bộ khi thêm loại component.

Ưu tiên **D2** cho kiến trúc, flowchart, sequence, hàng chờ và sơ đồ trạng thái.
Không còn Mermaid runtime. Giữ log, mã giả, công thức, cây thư mục và text phụ thuộc
căn lề ở dạng code/text nếu đổi thành diagram không giúp hiểu rõ hơn.

````md
```d2 interactive title="Publish qua volatile"
direction: right
write: "Thread 1: ghi data"
release: "ready = true (volatile write)"
acquire: "Thread 2: đọc ready == true"
read: "Đọc data"
write -> release: program order
release -> acquire: happens-before
acquire -> read: program order
```
````

- Bỏ `interactive` nếu chỉ cần SVG tĩnh. Viewer tương tác tải khi bấm Explore,
  hỗ trợ zoom/pan, xem/copy D2 và tải SVG.
- Dùng `mode=steps` khi cần diễn giải thay đổi queue/state theo từng bước;
  mỗi step kế thừa trạng thái trước đó. Ví dụ trong bài AQS.
- Dùng icon từ [icons.d2lang.com](https://icons.d2lang.com/) khi giúp nhận diện
  thành phần, ví dụ `icon: https://icons.d2lang.com/tech/014-cpu.svg` cho CPU.
  Không gắn icon vendor cho khái niệm Java/queue chung. URL icon ngoài phụ thuộc
  kết nối khi đọc; cần offline thì lưu icon tin cậy trong repo và cấu hình `assetsRoot`
  để nhúng lúc build theo hướng dẫn của package.
- `code-diff`: so sánh source trước/sau. Bài **volatile** dùng nó để đổi
  `counter++` sang `AtomicInteger.incrementAndGet()`. Viết lý do sửa trong bài,
  không chỉ trong metadata vì component không render mọi trường mô tả.
- `code-walkthrough`: đọc code theo bước, highlight range dòng. Bài **DCL**
  giải thích fast path, kiểm tra lần hai và volatile publication trên cùng snapshot.
- `terminal-session`: command, stdout/stderr và kết quả kỳ vọng. Bài **volatile**
  minh họa biên dịch/chạy Java; ghi rõ transcript minh họa, không giả làm số đo thực tế.
- Chỉ thêm Source Explorer, Protocol Exchange hay Span Waterfall khi có source project,
  request/response hoặc dữ liệu timing thực sự phù hợp; không thêm cho đủ bộ component.

Fence docs-kit chỉ mô tả dữ liệu, không thực thi Java/shell. Chỉ compile D2/MDX và SVG
icon do tác giả tin cậy quản lý. Không đưa secrets vào code hay transcript được publish.

Schema/API chi tiết: [README docs-kit](https://github.com/vanhiep99w/docs-kit#readme)
và [hướng dẫn D2](https://github.com/vanhiep99w/docs-kit/blob/main/docs/d2.md).
