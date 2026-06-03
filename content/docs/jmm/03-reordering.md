---
title: "Reordering"
description: "Reordering bởi compiler, JIT và CPU; as-if-serial và khi nào reorder hợp pháp"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Ba nguồn gây reorder](#1-ba-nguồn-gây-reorder)
- [2. Khi nào reorder hợp pháp](#2-khi-nào-reorder-hợp-pháp)
- [3. Chặn reorder](#3-chặn-reorder)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Reordering" trong `JMM.md`.

## Tổng quan

Reordering = thay đổi thứ tự thực thi thực tế so với thứ tự code viết.

## 1. Ba nguồn gây reorder

| Nguồn | Lý do |
|-------|-------|
| Compiler (javac) | Tối ưu hóa, gộp/bỏ lệnh |
| JIT (HotSpot) | Reorder theo runtime info |
| CPU (hardware) | Out-of-order execution, store buffer |

_TODO: mở rộng từng nguồn._

## 2. Khi nào reorder hợp pháp

- Không đổi kết quả single-thread (**as-if-serial**).
- Không phá vỡ happens-before giữa các thread.

_TODO: giải thích as-if-serial._

## 3. Chặn reorder

- `volatile`, `synchronized`, `java.util.concurrent` → JVM chèn memory barrier.

_TODO: liên kết sang bài Memory Barriers._

## Tài liệu tham khảo

- Trước: [Happens-before](/jmm/02-happens-before/)
- Tiếp theo: [Memory Barriers](/jmm/04-memory-barriers/)
