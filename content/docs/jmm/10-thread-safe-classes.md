---
title: "Thread-safe Classes"
description: "Xây dựng class thread-safe: immutability, confinement, defensive copies"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Các mức an toàn thường gặp](#1-các-mức-an-toàn-thường-gặp)
- [2. Cách xây dựng class thread-safe](#2-cách-xây-dựng-class-thread-safe)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Xây dựng thread-safe classes" trong `JMM.md`.

## Tổng quan

Thiết kế class an toàn đa luồng dựa trên: immutability, confinement, và
defensive copies.

## 1. Các mức an toàn thường gặp

_TODO: immutable, thread-safe, conditionally thread-safe, not thread-safe._

## 2. Cách xây dựng class thread-safe

_TODO: immutability, thread confinement, defensive copy, đồng bộ hóa nội bộ._

## Tài liệu tham khảo

- Trước: [CAS, Atomic*, VarHandle, StampedLock](/jmm/09-cas-atomic-varhandle-stampedlock/)
- Tiếp theo: [Happens-before trong java.util.concurrent](/jmm/11-happens-before-juc/)
