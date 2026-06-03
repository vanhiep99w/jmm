---
title: "Escape Analysis"
description: "Escape analysis của JIT và tác động tới tối ưu hóa (scalar replacement, lock elision)"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Escape Analysis là gì](#1-escape-analysis-là-gì)
- [2. Tác động tới tối ưu hóa](#2-tác-động-tới-tối-ưu-hóa)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Escape Analysis (EA)" trong `JMM.md`.

## Tổng quan

Escape Analysis là phân tích của JIT để xác định một object có "thoát" khỏi
scope/thread hay không, từ đó áp dụng tối ưu.

## 1. Escape Analysis là gì

_TODO: no-escape, arg-escape, global-escape._

## 2. Tác động tới tối ưu hóa

_TODO: scalar replacement, stack allocation, lock elision._

## Tài liệu tham khảo

- Trước: [False sharing & padding](/jmm/13-false-sharing-padding/)
- Tiếp theo: [Testing concurrency](/jmm/15-testing-concurrency/)
