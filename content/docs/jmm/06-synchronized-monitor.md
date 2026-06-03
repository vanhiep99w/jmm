---
title: "synchronized / monitor"
description: "Mutual exclusion, monitor trong JVM (Entry List, Wait Set) và happens-before edges"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Lock object & synchronized method](#1-lock-object--synchronized-method)
- [2. Monitor trong JVM](#2-monitor-trong-jvm)
- [3. Nguyên lý synchronized trong JMM](#3-nguyên-lý-synchronized-trong-jmm)
- [4. Mutual Exclusion vs Happens-before edges](#4-mutual-exclusion-vs-happens-before-edges)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "synchronized/monitor" trong `JMM.md`.

## Tổng quan

`synchronized` cung cấp **mutual exclusion** và tạo **happens-before edges** giữa
unlock và lock kế tiếp trên cùng monitor.

## 1. Lock object & synchronized method

_TODO: lock object, synchronized trên method (instance vs static)._

## 2. Monitor trong JVM

_TODO: Entry List, Wait Set, cách monitor hoạt động._

## 3. Nguyên lý synchronized trong JMM

_TODO: barrier mà JVM chèn ở lock/unlock._

## 4. Mutual Exclusion vs Happens-before edges

_TODO: barrier chống reorder (data race) vs mutual exclusion (race condition)._

## Tài liệu tham khảo

- Trước: [Volatile](/jmm/05-volatile/)
- Tiếp theo: [Final field & safe publication](/jmm/07-final-field-safe-publication/)
