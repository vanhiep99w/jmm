---
title: "Testing Concurrency"
description: "Bắt bug đồng thời và đo hiệu năng đúng: stress test, JCStress, JMH"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Stress tests](#1-stress-tests)
- [2. JCStress](#2-jcstress)
- [3. JMH](#3-jmh)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Testing concurrency" trong `JMM.md`.

## Tổng quan

Bug đồng thời khó tái hiện; cần công cụ chuyên dụng để bắt bug và đo hiệu năng
chính xác.

## 1. Stress tests

_TODO: chạy nhiều thread, nhiều vòng lặp để lộ race._

## 2. JCStress

_TODO: framework test JMM behaviors của OpenJDK._

## 3. JMH

_TODO: đo benchmark đúng (warmup, fork, tránh dead-code elimination)._

## Tài liệu tham khảo

- [JCStress](https://github.com/openjdk/jcstress)
- [JMH](https://github.com/openjdk/jmh)
- Trước: [Escape Analysis](/jmm/14-escape-analysis/)
- Tiếp theo: [Pitfalls & checklist](/jmm/16-pitfalls-checklist/)
