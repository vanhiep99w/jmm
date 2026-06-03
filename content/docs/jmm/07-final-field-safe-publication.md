---
title: "Final Field & Safe Publication"
description: "Final field semantics và các pattern safe publication cho object"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Vấn đề visibility của object thường](#1-vấn-đề-visibility-của-object-thường)
- [2. Final field semantics](#2-final-field-semantics)
- [3. Safe publication patterns](#3-safe-publication-patterns)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Final Field Semantics & Safe Publication Patterns" trong `JMM.md`.

## Tổng quan

Final field có đảm bảo đặc biệt: nếu object được publish đúng cách, các final
field đã khởi tạo trong constructor luôn được thấy đúng.

## 1. Vấn đề visibility của object thường

_TODO: object publish không an toàn → thread khác thấy field chưa init._

## 2. Final field semantics

_TODO: freeze action cuối constructor, đảm bảo của final._

## 3. Safe publication patterns

_TODO: static initializer, volatile field, final field, concurrent collection, lock._

## Tài liệu tham khảo

- Trước: [synchronized / monitor](/jmm/06-synchronized-monitor/)
- Tiếp theo: [Data race vs race condition](/jmm/08-data-race-vs-race-condition/)
