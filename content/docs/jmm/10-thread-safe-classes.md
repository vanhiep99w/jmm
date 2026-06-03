---
title: "Thread-safe classes"
description: "Xây dựng class an toàn luồng qua immutability, confinement, defensive copies và CAS/lock"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Thread-safe class là gì](#1-thread-safe-class-là-gì)
- [2. Các mức an toàn](#2-các-mức-an-toàn)
- [3. Immutability](#3-immutability)
- [4. Confinement](#4-confinement)
- [5. Defensive copies](#5-defensive-copies)
- [6. CAS / Atomic / Lock](#6-cas--atomic--lock)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan

Một **thread-safe class** là lớp mà mọi method có thể gọi đồng thời từ nhiều
thread mà **không phá vỡ bất biến (invariant)** nào, và kết quả quan sát được hợp
lệ theo JMM — **không** yêu cầu người gọi tự đồng bộ (trừ khi tài liệu lớp nói rõ).

## 1. Thread-safe class là gì

Khi nào gọi là "thread-safe":

- Không có data race làm hỏng bất biến.
- **Visibility** đảm bảo: thay đổi của thread A thấy được ở thread B theo HB.
- **Atomicity** đúng: các thao tác phức hợp (check-then-act, read-modify-write)
  được bảo vệ.
- **Liveness** hợp lý: tránh deadlock/livelock/starvation.

## 2. Các mức an toàn

| Mức | Đặc điểm | Ví dụ |
|-----|----------|-------|
| **Immutable / Stateless** | Không có trạng thái thay đổi → tự nhiên thread-safe | `String`, `LocalDate`, value object toàn `final` |
| **Thread-safe (fully)** | Mọi thao tác công khai là atomic & visible; lớp tự lo đồng bộ | `ConcurrentHashMap`, `AtomicInteger` |
| **Conditionally thread-safe** | Thao tác đơn lẻ an toàn, nhưng chuỗi thao tác cần khóa ngoài | `Collections.synchronizedList` (duyệt + sửa cần `synchronized` ngoài) |

## 3. Immutability

> [!IMPORTANT]
> **Mục tiêu**: object không đổi sau khi khởi tạo ⇒ không cần đồng bộ, không có race.

Cách làm:

- Tất cả field là `private final`.
- Không để `this` "escape" trong constructor (đừng đăng ký listener, start thread,
  hay truyền `this` ra ngoài).
- Không expose tham chiếu tới cấu trúc mutable (mảng, `List`, `Map`) — nếu cần thì
  sao chép/bao `unmodifiable`.
- Ưu tiên `record` / value object.

```java
public record Point(int x, int y) { }  // immutable, thread-safe tự nhiên
```

Ví dụ đầy đủ hơn — immutable class có list bên trong (phải copy + bọc lại):

```java
public final class ImmutableOrder {
    private final String id;
    private final List<String> items;   // kiểu mutable → phải bảo vệ

    public ImmutableOrder(String id, List<String> items) {
        this.id = id;
        // copy vào để caller sửa list gốc cũng không ảnh hưởng:
        this.items = List.copyOf(items);   // List.copyOf tạo bản unmodifiable
    }

    public String id() { return id; }
    public List<String> items() { return items; } // đã unmodifiable, an toàn
}
```

> [!TIP]
> Vì sao immutable là "thread-safe miễn phí"? Không có ai ghi sau khi tạo → không
> thể có data race (data race cần ít nhất 1 write đồng thời). Cộng thêm bảo đảm
> `final` field ([safe publication](/jmm/07-final-field-safe-publication/)) → mọi
> thread thấy object đã dựng xong hoàn chỉnh.

## 4. Confinement

> [!NOTE]
> **Mục tiêu**: không chia sẻ state ⇒ không cần lock.

- **Thread confinement**: giữ dữ liệu trong một thread duy nhất (ví dụ
  `ThreadLocal`, biến local).
- **Stack confinement**: biến local chỉ sống trong stack frame → không thread nào
  khác chạm tới.

## 5. Defensive copies

> [!IMPORTANT]
> **Mục tiêu**: không để caller (hoặc chỗ khác) thay đổi state nội bộ, và ngược lại.

Cách làm:

- **Copy vào** khi nhận dữ liệu mutable từ ngoài.
- **Copy ra** khi trả về cấu trúc mutable; hoặc trả `Collections.unmodifiableXxx`.
- Với object lồng nhau → cân nhắc **deep copy**.

```java
public final class SafeRange {
    private final int[] range;

    public SafeRange(int[] range) {
        this.range = range.clone();  // copy in
    }

    public int[] range() {
        return range.clone();        // copy out
    }
}
```

**Điều gì xảy ra nếu KHÔNG copy?** Giả sử bỏ `.clone()`:

```java
int[] data = {1, 2, 3};
SafeRange r = new SafeRange(data);   // nếu không copy-in: r giữ CHÍNH mảng data
data[0] = 999;                       // người ngoài sửa → state nội bộ của r bị đổi!
// r giờ chứa {999, 2, 3} dù bạn không hề gọi method nào của r
```

Không copy-in → mảng bên trong và mảng `data` là **cùng một object**, nên bất
biến của `SafeRange` bị người ngoài phá từ xa. Tương tự, không copy-out → caller
nhận tham chiếu mảng thật và có thể sửa. Đây là lỗi rò rỉ đóng gói phổ biến, càng
nguy hiểm trong môi trường đa luồng vì tạo data race ngoài tầm kiểm soát.

## 6. CAS / Atomic / Lock

Khi cần state thay đổi được nhưng vẫn an toàn:

| Tình huống | Công cụ |
|------------|---------|
| Counter/flag/state nhỏ | `AtomicLong`, `AtomicReference`, `LongAdder` |
| Truy cập field cụ thể, cần ordering linh hoạt | `VarHandle` |
| Mảng atomic | `AtomicIntegerArray`, hoặc `VarHandle` cho array |
| Vùng găng phức tạp, nhiều biến | `synchronized` / `ReentrantLock` / `StampedLock` |

> [!TIP]
> Thứ tự ưu tiên khi thiết kế: **(1) Immutability** → **(2) Confinement** →
> **(3) Atomic/CAS cho một biến** → **(4) Lock khi thực sự cần bảo vệ nhiều biến/
> bất biến phức tạp**. Lock là phương án cuối vì đắt và dễ gây deadlock.

## Tài liệu tham khảo

- *Java Concurrency in Practice* — Brian Goetz (Chương 3, 4)
- Trước: [CAS, Atomic, VarHandle, StampedLock](/jmm/09-cas-atomic-varhandle-stampedlock/)
- Tiếp theo: [Happens-before trong java.util.concurrent](/jmm/11-happens-before-juc/)
