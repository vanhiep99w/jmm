---
title: "Memory Barriers"
description: "Memory barrier/fence, các loại barrier trong JMM và mapping trên kiến trúc CPU"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Các loại barrier chung](#1-các-loại-barrier-chung)
- [2. Barrier trong JMM](#2-barrier-trong-jmm)
- [3. Mapping trên kiến trúc CPU](#3-mapping-trên-kiến-trúc-cpu)
- [4. Ví dụ barrier](#4-ví-dụ-barrier)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Memory Barriers & mapping trên kiến trúc CPU" trong `JMM.md`.

## Tổng quan

Memory barrier (fence) là chỉ thị buộc compiler/CPU đảm bảo thứ tự thao tác bộ
nhớ qua điểm barrier.

## 1. Các loại barrier chung

_TODO: LoadLoad, StoreStore, LoadStore, StoreLoad._

## 2. Barrier trong JMM

_TODO: barrier mà JVM chèn cho volatile read/write, lock/unlock._

## 3. Mapping trên kiến trúc CPU

_TODO: x86 (TSO) vs ARM/Power (weak memory)._

## 4. Ví dụ barrier

_TODO: ví dụ minh họa._

## Tài liệu tham khảo

- Trước: [Reordering](/jmm/03-reordering/)
- Tiếp theo: [Volatile](/jmm/05-volatile/)
