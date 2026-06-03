---
title: "CAS, Atomic*, VarHandle, StampedLock"
description: "Compare-And-Set, các lớp Atomic*, ABA, LongAdder và khi nào dùng cái nào"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. CAS — Compare-And-Set](#1-cas--compare-and-set)
- [2. Atomic\\*](#2-atomic)
- [3. Chống ABA](#3-chống-aba)
- [4. LongAdder / LongAccumulator](#4-longadder--longaccumulator)
- [5. Pitfalls & mẹo hiệu năng](#5-pitfalls--mẹo-hiệu-năng)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "CAS, Atomic*, VarHandle, StampedLock" trong `JMM.md`.

## Tổng quan

CAS là nền tảng lock-free; `Atomic*` bọc CAS để cập nhật nguyên tử không cần lock.

## 1. CAS — Compare-And-Set

_TODO: cơ chế CAS, vì sao tránh race condition._

## 2. Atomic\*

_TODO: AtomicInteger/Long/Boolean/Reference, contention, hoạt động bên trong._

## 3. Chống ABA

_TODO: AtomicStampedReference, AtomicMarkableReference._

## 4. LongAdder / LongAccumulator

_TODO: vì sao nhanh hơn AtomicLong khi contention cao._

## 5. Pitfalls & mẹo hiệu năng

_TODO: bẫy thường gặp khi dùng CAS/Atomic._

## Tài liệu tham khảo

- Trước: [Data race vs race condition](/jmm/08-data-race-vs-race-condition/)
- Tiếp theo: [Thread-safe classes](/jmm/10-thread-safe-classes/)
