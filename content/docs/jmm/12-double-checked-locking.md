---
title: "Double-Checked Locking"
description: "DCL đúng/sai, vì sao cần volatile, và Initialization-on-Demand Holder"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. DCL — Double-Checked Locking](#1-dcl--double-checked-locking)
- [2. Vì sao cần volatile](#2-vì-sao-cần-volatile)
- [3. Tốt hơn DCL: Initialization-on-Demand Holder](#3-tốt-hơn-dcl-initialization-on-demand-holder)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Double-Checked Locking (DCL)" trong `JMM.md`.

## Tổng quan

DCL là pattern lazy init giảm chi phí synchronized, nhưng dễ sai nếu thiếu
`volatile`.

## 1. DCL — Double-Checked Locking

_TODO: code mẫu, vì sao tránh synchronized mỗi lần gọi._

## 2. Vì sao cần volatile

_TODO: tránh thấy object chưa init đầy đủ do reorder._

## 3. Tốt hơn DCL: Initialization-on-Demand Holder

_TODO: IoDH idiom, vì sao tốt hơn, điểm yếu._

## Tài liệu tham khảo

- Trước: [Happens-before trong java.util.concurrent](/jmm/11-happens-before-juc/)
- Tiếp theo: [False sharing & padding](/jmm/13-false-sharing-padding/)
