---
title: "False sharing & padding"
description: "False sharing do cache line dùng chung, cơ chế MESI, và cách tránh bằng padding / @Contended"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. False sharing là gì](#1-false-sharing-là-gì)
- [2. Vì sao "cùng cache line" gây chậm](#2-vì-sao-cùng-cache-line-gây-chậm)
- [3. Padding](#3-padding)
- [4. @Contended](#4-contended)
- [5. Phát hiện & né tránh](#5-phát-hiện--né-tránh)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan

**False sharing** là vấn đề **hiệu năng** (không phải bug logic) xảy ra khi nhiều
thread ghi vào các biến **khác nhau** nhưng nằm chung một **cache line** → cache
line bị "ping-pong" qua lại giữa các core.

## 1. False sharing là gì

CPU hiện đại cache theo **dòng (cache line)**, thường **64 bytes**. Nếu hai (hoặc
nhiều) thread thường xuyên ghi vào những biến khác nhau nhưng **chung một cache
line**, mỗi lần ghi sẽ invalidate cache line của core kia → hai core "giật" một
dòng cache qua lại → hiệu năng tụt (latency cao, throughput thấp) **dù không hề có
bug logic**.

```text
Cache line (64 bytes)
┌──────────────┬──────────────┬───────── ... ─────────┐
│  biến a      │  biến b      │  (các byte khác)       │
└──────────────┴──────────────┴───────── ... ─────────┘
   ↑ Core 0 ghi   ↑ Core 1 ghi
   → mỗi lần ghi a làm invalidate cả line ở Core 1 (và ngược lại)
```

## 2. Vì sao "cùng cache line" gây chậm

Khi Core 0 đọc một biến từ RAM, **cả cache line** chứa biến đó được nạp vào L1/L2
của Core 0. Nếu Core 1 đọc một biến khác nằm trong cùng line, nó cũng nạp cả line
đó. Theo giao thức **MESI** (và biến thể MOESI/MESIF):

1. Core 0 ghi `a` → đánh dấu cache line là **Modified** trong cache của nó.
2. Gửi tín hiệu **Invalidate** tới mọi core khác.
3. Core 1 thấy line bị invalidate → muốn dùng `b` phải **reload** cả line từ Core
   0 hoặc RAM.
4. Core 1 ghi `b` → quy trình invalidate chạy ngược.
5. Hai core liên tục "giật" line qua lại → **cache line ping-pong** → mất hiệu năng.

> [!NOTE]
> Điểm cốt lõi: `a` và `b` **độc lập về logic** nhưng vì **vật lý** nằm chung line
> nên CPU buộc phải đồng bộ cả line → chi phí "ảo".

## 3. Padding

Chèn "đệm" để hai biến **không** chung cache line:

```java
class PaddedLong {
    volatile long value;
    // padding (giản lược): 7 long ≈ 56B + header ~16B → tách sang line khác
    long p1, p2, p3, p4, p5, p6, p7;
}
```

> [!WARNING]
> **Nhược điểm**: cồng kềnh, phụ thuộc layout bộ nhớ (JVM có thể sắp xếp lại field
> hoặc loại bỏ field "không dùng"). Đây là cách thủ công, dễ sai.

## 4. @Contended

Annotation `@jdk.internal.vm.annotation.Contended` (trước kia
`@sun.misc.Contended`) ra lệnh cho JVM tự chèn padding quanh field/lớp để tách
cache line.

```java
@jdk.internal.vm.annotation.Contended
volatile long value;
```

> [!IMPORTANT]
> Cần bật cờ JVM `-XX:-RestrictContended` để annotation có hiệu lực ở code ngoài
> JDK. Đây là cách "sạch" hơn padding thủ công vì JVM lo việc căn chỉnh.

## 5. Phát hiện & né tránh

| Cách | Khi nào |
|------|---------|
| Dùng `LongAdder` thay `AtomicLong` | Counter contention cao — `LongAdder` đã sharded sẵn theo cell, mỗi cell padding để tránh false sharing |
| `@Contended` | Field "nóng" bị nhiều thread ghi đồng thời |
| Padding thủ công | Khi không thể dùng `@Contended` (môi trường hạn chế) |
| Tách dữ liệu ra xa | Đặt dữ liệu của từng thread ở vùng nhớ riêng |

> [!TIP]
> False sharing khó phát hiện vì code "đúng" về logic. Dấu hiệu: throughput không
> tăng (thậm chí giảm) khi thêm core. Dùng công cụ như `perf c2c` (Linux) hoặc JMH
> để đo và xác nhận trước khi tối ưu — tránh padding bừa bãi.

## Tài liệu tham khảo

- [Mechanical Sympathy — False Sharing (Martin Thompson)](https://mechanical-sympathy.blogspot.com/2011/07/false-sharing.html)
- Trước: [Double-Checked Locking](/jmm/12-double-checked-locking/)
- Tiếp theo: [Escape Analysis](/jmm/14-escape-analysis/)
