---
title: "False Sharing & Padding"
description: "False sharing do cache line, padding và @Contended để giảm contention"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. False sharing](#1-false-sharing)
- [2. Vì sao cùng cache line lại ảnh hưởng](#2-vì-sao-cùng-cache-line-lại-ảnh-hưởng)
- [3. Padding & @Contended](#3-padding--contended)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "False sharing, padding, contended fields" trong `JMM.md`.

## Tổng quan

False sharing xảy ra khi nhiều thread ghi các biến khác nhau nằm chung một cache
line, gây invalidation liên tục.

## 1. False sharing

_TODO: định nghĩa + ví dụ._

## 2. Vì sao cùng cache line lại ảnh hưởng

_TODO: cache coherence, cache line ~64 bytes._

## 3. Padding & @Contended

_TODO: padding thủ công, annotation `@Contended`._

## Tài liệu tham khảo

- Trước: [Double-Checked Locking](/jmm/12-double-checked-locking/)
- Tiếp theo: [Escape Analysis](/jmm/14-escape-analysis/)
