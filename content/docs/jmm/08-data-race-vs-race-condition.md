---
title: "Data Race vs Race Condition"
description: "Phân biệt data race và race condition; benign vs harmful races"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Data race (theo JMM)](#1-data-race-theo-jmm)
- [2. Race condition (rộng hơn)](#2-race-condition-rộng-hơn)
- [3. Benign vs Harmful races](#3-benign-vs-harmful-races)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Data race vs. race condition" trong `JMM.md`.

## Tổng quan

Data race là khái niệm hẹp theo JMM (truy cập đồng thời không đồng bộ);
race condition là khái niệm rộng hơn về tính đúng đắn logic.

## 1. Data race (theo JMM)

_TODO: định nghĩa data race theo JMM._

## 2. Race condition (rộng hơn)

_TODO: check-then-act, read-modify-write._

## 3. Benign vs Harmful races

_TODO: khi nào race vô hại, khi nào có hại._

## Tài liệu tham khảo

- Trước: [Final field & safe publication](/jmm/07-final-field-safe-publication/)
- Tiếp theo: [CAS, Atomic*, VarHandle, StampedLock](/jmm/09-cas-atomic-varhandle-stampedlock/)
