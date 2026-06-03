---
title: "Pitfalls & Checklist"
description: "Các pitfall thường gặp và checklist review code đồng bộ hóa theo JMM"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Pitfalls thường gặp](#1-pitfalls-thường-gặp)
- [2. Checklist review code](#2-checklist-review-code)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Pitfalls thường gặp + Checklist" trong `JMM.md`.

## Tổng quan

Tổng hợp các lỗi đồng bộ hóa hay gặp và checklist để review code đa luồng.

## 1. Pitfalls thường gặp

_TODO: liệt kê pitfalls (quên volatile, compound action, publish không an toàn, ...)._

## 2. Checklist review code

- [ ] Shared mutable state có được đồng bộ không?
- [ ] Có compound action cần atomic không?
- [ ] Object có được publish an toàn không?
- [ ] _TODO: bổ sung các mục checklist._

## Tài liệu tham khảo

- Trước: [Testing concurrency](/jmm/15-testing-concurrency/)
- Về đầu: [Tổng quan JMM](/jmm/01-tong-quan/)
