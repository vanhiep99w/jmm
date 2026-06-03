---
title: "Volatile"
description: "Volatile đảm bảo gì về visibility/ordering, không đảm bảo gì, và các anti-pattern"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Volatile đảm bảo gì](#1-volatile-đảm-bảo-gì)
- [2. Volatile KHÔNG đảm bảo gì](#2-volatile-không-đảm-bảo-gì)
- [3. Anti-patterns](#3-anti-patterns)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Volatile" trong `JMM.md`.

## Tổng quan

`volatile` đảm bảo visibility và ngăn reorder quanh biến volatile, nhưng không
đảm bảo atomicity cho thao tác phức hợp.

## 1. Volatile đảm bảo gì

_TODO: visibility, ordering guarantees (StoreStore/StoreLoad, LoadLoad/LoadStore)._

## 2. Volatile KHÔNG đảm bảo gì

_TODO: không atomic cho `count++`, không thay thế lock._

## 3. Anti-patterns

_TODO: ví dụ dùng sai volatile (check-then-act, compound action)._

## Tài liệu tham khảo

- Trước: [Memory Barriers](/jmm/04-memory-barriers/)
- Tiếp theo: [synchronized / monitor](/jmm/06-synchronized-monitor/)
