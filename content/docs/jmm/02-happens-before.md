---
title: "Happens-before & Program Order"
description: "Quan hệ happens-before, so sánh với program order và các HB rules quan trọng"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Happens-before là gì](#1-happens-before-là-gì)
- [2. Happens-before vs Program Order](#2-happens-before-vs-program-order)
- [3. Các HB rules quan trọng](#3-các-hb-rules-quan-trọng)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Mô hình happens-before" trong `JMM.md`.

## Tổng quan

Happens-before (HB) là quan hệ thứ tự logic giữa hai hành động A và B: nếu
A happens-before B thì mọi thay đổi bộ nhớ của A đều được B nhìn thấy.

_TODO: phát biểu định nghĩa HB._

## 1. Happens-before là gì

_TODO: định nghĩa + ví dụ minh họa hai thread._

```java
// Thread 1
a = 1;        // (1)
b = true;     // (2)

// Thread 2
if (b) {      // (3)
    print(a); // (4)
}
// Nếu b là volatile, (2) HB (3) → đảm bảo (1) HB (4).
```

## 2. Happens-before vs Program Order

| Khái niệm | Phạm vi | Ý nghĩa |
|-----------|---------|---------|
| Program order | Trong 1 thread | Thứ tự lệnh viết trong code |
| Happens-before | Giữa các thread | Thứ tự quan sát được, tạo bởi cơ chế đồng bộ |

_TODO: giải thích bảng._

## 3. Các HB rules quan trọng

_TODO: liệt kê các rule (program order, monitor lock, volatile, thread start/join, transitivity...)._

## Tài liệu tham khảo

- Trước: [Tổng quan JMM](/jmm/01-tong-quan/)
- Tiếp theo: [Reordering](/jmm/03-reordering/)
