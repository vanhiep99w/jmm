---
title: "Volatile"
description: "volatile đảm bảo gì (visibility + ordering), không đảm bảo gì, và các anti-pattern thường gặp"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. volatile đảm bảo gì](#1-volatile-đảm-bảo-gì)
- [2. Release / Acquire semantics](#2-release--acquire-semantics)
- [3. volatile KHÔNG đảm bảo gì](#3-volatile-không-đảm-bảo-gì)
- [4. Anti-patterns](#4-anti-patterns)
- [5. Khi nào nên dùng volatile](#5-khi-nào-nên-dùng-volatile)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan

`volatile` là từ khóa nhẹ nhất để tạo [happens-before](/jmm/02-happens-before/)
giữa các thread. Nó đảm bảo **visibility** và **ordering** cho **chính biến được
đánh dấu**, nhưng **không** đảm bảo atomicity cho thao tác nhiều bước.

## 1. volatile đảm bảo gì

- **Visibility (hiển thị)**: Mọi lần ghi vào biến volatile được các thread khác
  **thấy ngay** khi họ đọc biến volatile đó sau này. Không còn cảnh "kẹt giá trị
  cũ trong cache".
- **Ordering (thứ tự)**: ghi/đọc volatile chặn reorder qua nó (xem mục 2).

```java
// Thread 1            // Thread 2
data = 42;             if (ready) {
volatile ready = true;     print(data); // chắc chắn 42
                       }
```

Khi Thread 2 thấy `ready == true`, nó **chắc chắn** thấy `data == 42` nhờ HB edge
do volatile tạo ra.

## 2. Release / Acquire semantics

> [!IMPORTANT]
> - **Volatile write** có **release semantics**: mọi ghi thường **trước** lần ghi
>   volatile phải được publish ra bộ nhớ **trước khi** ghi volatile hoàn tất.
> - **Volatile read** có **acquire semantics**: mọi đọc/ghi **sau** lần đọc
>   volatile **không thể** bị đẩy lên trước nó.

Cặp release (write) ↔ acquire (read) trên **cùng** một biến volatile chính là
"cây cầu" happens-before giúp publish dữ liệu an toàn.

## 3. volatile KHÔNG đảm bảo gì

- **Không** mutual exclusion → không chặn hai thread chạy đè nhau trong critical
  section.
- **Không** atomic cho thao tác nhiều bước (`x++`, `balance += amount`,
  check-then-act...).
- **Không** bảo toàn bất biến (invariant) nhiều biến nếu chỉ một biến là volatile.

> [!WARNING]
> Tóm gọn: `volatile` xử lý được **data race về memory semantics** (visibility +
> ordering), nhưng **không** xử lý được [race condition](/jmm/08-data-race-vs-race-condition/)
> logic. Muốn atomic → dùng [CAS/Atomic](/jmm/09-cas-atomic-varhandle-stampedlock/)
> hoặc [synchronized](/jmm/06-synchronized-monitor/).

## 4. Anti-patterns

### 4.1 Dùng volatile cho counter

```java
volatile int counter = 0;

void increment() {
    counter++; // gồm 3 bước: read -> +1 -> write
}
```

`volatile` chỉ đảm bảo visibility/ordering, **không** gộp 3 bước thành một thao
tác nguyên tử. Hai thread có thể đọc cùng một giá trị, cộng lên, rồi ghi lại →
**lost update**. Đúng: dùng `AtomicInteger.incrementAndGet()`.

### 4.2 "Publish" object qua volatile field của chính object

```java
class Point { int x, y; }
volatile Point p;

// Thread 1
p.x = 1;
p.y = 1;
p = p; // volatile write để "publish"?  -- SAI
```

`volatile` chỉ đảm bảo cho **chính biến volatile** (ở đây là tham chiếu `p`),
**không** đảm bảo các field bên trong (`x`, `y`) được cập nhật như một đơn vị
nguyên tử. Thread khác có thể đọc `p` khi `x` đã đổi nhưng `y` chưa → bất biến
`x == y` bị phá.

> [!TIP]
> Muốn publish một object bất biến an toàn → dùng `final` field +
> [safe publication](/jmm/07-final-field-safe-publication/), hoặc gán một
> **object mới (immutable)** vào biến volatile thay vì sửa field tại chỗ.

## 5. Khi nào nên dùng volatile

| Tình huống | volatile đủ? |
|------------|--------------|
| Cờ báo hiệu dừng (`volatile boolean running`) | ✅ Đủ |
| Publish reference tới object **bất biến** | ✅ Đủ |
| Đếm số (`counter++`) | ❌ Dùng `AtomicInteger`/`LongAdder` |
| Cập nhật nhiều biến cùng lúc (invariant) | ❌ Dùng `synchronized`/`Lock` |
| Double-checked locking | ✅ Bắt buộc volatile (xem [DCL](/jmm/12-double-checked-locking/)) |

## Tài liệu tham khảo

- [JLS 8.3.1.4 — volatile Fields](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.3.1.4)
- Trước: [Memory Barriers](/jmm/04-memory-barriers/)
- Tiếp theo: [synchronized / monitor](/jmm/06-synchronized-monitor/)
