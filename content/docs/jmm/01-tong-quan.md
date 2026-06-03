---
title: "Tổng quan JMM"
description: "Mục tiêu của Java Memory Model và ba vấn đề cốt lõi: visibility, ordering, atomicity"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Mục tiêu của JMM](#1-mục-tiêu-của-jmm)
- [2. Ba vấn đề cốt lõi](#2-ba-vấn-đề-cốt-lõi)
  - [2.1 Visibility](#21-visibility)
  - [2.2 Ordering](#22-ordering)
  - [2.3 Atomicity](#23-atomicity)
- [3. Vì sao cần JMM](#3-vì-sao-cần-jmm)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Đây là file **placeholder** để dựng flow học. Nội dung chi tiết lấy từ section
> "Tổng quan JMM" trong `JMM.md` (nguồn gốc ở repo root).

## Tổng quan

Java Memory Model (JMM) được định nghĩa trong Java Language Specification (JLS),
quy định cách các thread tương tác với bộ nhớ.

_TODO: tóm tắt ngắn JMM là gì và giải quyết vấn đề gì._

## 1. Mục tiêu của JMM

- Đảm bảo tính nhất quán (consistency) của dữ liệu khi chạy đa luồng.
- Đưa ra quy tắc về visibility, ordering, atomicity giữa các thread.
- Ẩn đi khác biệt phần cứng / CPU / compiler optimization.
- Cân bằng giữa tính đúng đắn và hiệu năng.

_TODO: mở rộng từng gạch đầu dòng._

## 2. Ba vấn đề cốt lõi

### 2.1 Visibility

_TODO: thay đổi của thread A khi nào được thread B nhìn thấy._

### 2.2 Ordering

_TODO: thứ tự thực thi quan sát được giữa các thread._

### 2.3 Atomicity

_TODO: thao tác nào là nguyên tử, thao tác nào không._

## 3. Vì sao cần JMM

_TODO: ví dụ minh họa lỗi đa luồng khi không có JMM guarantees._

## Tài liệu tham khảo

- [JLS — Chapter 17: Threads and Locks](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)
- Tiếp theo: [Mô hình happens-before](/jmm/02-happens-before/)
