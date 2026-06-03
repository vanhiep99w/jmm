---
title: "Final Field & Safe Publication"
description: "Visibility của object mới tạo, ngữ nghĩa final field, và các mẫu safe publication"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Vấn đề visibility của object thường](#1-vấn-đề-visibility-của-object-thường)
- [2. Final field semantics](#2-final-field-semantics)
- [3. Safe publication là gì](#3-safe-publication-là-gì)
- [4. Năm mẫu safe publication](#4-năm-mẫu-safe-publication)
- [5. Ví dụ unsafe publication](#5-ví-dụ-unsafe-publication)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan

Khi bạn chia sẻ một object vừa tạo cho thread khác, **không** có gì đảm bảo thread
đó thấy object ở trạng thái "đã dựng xong" — trừ khi bạn dùng `final` field hoặc
một **safe publication pattern**.

## 1. Vấn đề visibility của object thường

```java
class Data {
    int x;
    Data() { x = 42; }
}
```

Nếu một thread thấy reference `Data` **trước khi** constructor hoàn tất ghi ra
main memory, nó có thể đọc `x == 0`.

> [!NOTE]
> **Hình dung bằng giao nhà đang xây**: tạo object = xây nhà; gán reference cho
> biến chia sẻ = **trao chìa khóa** cho người mua. Đáng lẽ phải xây xong (set
> `x = 42`) rồi mới trao chìa. Nhưng do reorder, JVM có thể trao chìa **trước khi**
> sơn tường xong → người mua mở cửa vào thấy nhà còn dở (`x == 0`). `final` field
> giống một **luật**: "không được trao chìa khi nhà chưa hoàn thiện phần `final`".

Một interleaving sinh ra `x == 0`:

| Bước | Thread tạo object | Thread đọc | Trạng thái |
|------|-------------------|------------|------------|
| 1 | cấp phát vùng nhớ cho Data (x=0 mặc định) | | x = 0 |
| 2 | gán `shared = <ref>` (bị đẩy lên trước) | | ref đã thấy, x = 0 |
| 3 | | thấy `shared != null`, đọc `x` → **0** ❌ | x = 0 |
| 4 | constructor ghi `x = 42` (chạy muộn) | | x = 42 |

> [!WARNING]
> Constructor có thể chưa flush xong khi reference bị chia sẻ. Việc "tạo object
> rồi gán cho biến chia sẻ" có thể bị reorder sao cho reference xuất hiện trước
> khi field được ghi.

## 2. Final field semantics

JMM cho `final` field một bảo đảm đặc biệt:

> [!IMPORTANT]
> Các trường `final` được gán trong constructor (và không đổi sau đó) sẽ **luôn**
> được các thread khác thấy đúng giá trị — **miễn là `this` không bị leak ra ngoài
> trong constructor**.

```java
class Box {
    final int v;
    Box(int x) {
        v = x;
        // [StoreStore barrier] <- JVM/JIT coi như chèn ở cuối constructor
    }
}
```

Nói nôm na: *"set xong final đã, rồi mới cho người khác thấy object này"*. Trước
khi các field `final` được khởi tạo xong, reference của object chưa được publish.

> [!CAUTION]
> Bảo đảm này **mất hiệu lực** nếu bạn để `this` "escape" trong constructor — ví
> dụ đăng ký listener, start thread, hay truyền `this` ra ngoài **trước khi**
> constructor kết thúc. Xem [Escape Analysis](/jmm/14-escape-analysis/) cho khái
> niệm "this escape".

## 3. Safe publication là gì

**Safe publication** = đảm bảo khi một thread thấy reference của object, nó cũng
thấy **toàn bộ trạng thái nội tại** của object đó (đã dựng xong).

## 4. Năm mẫu safe publication

### 4.1 Static initializer

```java
public class Config {
    static final Settings SETTINGS = new Settings(/* ... */);
    // Static initializer chạy trong một thread khi class load;
    // JMM đảm bảo visibility cho các thread khác.
}
```

### 4.2 volatile field

```java
volatile Settings settings;
// Ghi vào volatile → tạo HB edge → thread khác đọc thấy version mới.
```

### 4.3 synchronized getter/setter

```java
synchronized void set(Settings s) { this.settings = s; }
synchronized Settings get() { return settings; }
// Lock đảm bảo HB cho cả read lẫn write.
```

### 4.4 final field (immutable holder)

```java
class SettingsHolder {
    final Settings settings;
    SettingsHolder(Settings s) { this.settings = s; }
}
// Bất biến sau khi tạo → publish reference an toàn qua final/static/volatile.
```

### 4.5 Concurrent collection

```java
Map<String, String> map = new ConcurrentHashMap<>();
// Thêm object vào concurrent map → đảm bảo visibility cho thread đọc sau.
```

> [!TIP]
> Tóm tắt: publish reference qua **static / final / volatile / lock / concurrent
> collection** đều an toàn. Mọi cách khác đều có nguy cơ unsafe publication.

## 5. Ví dụ unsafe publication

```java
class Unsafe {
    int value;          // KHÔNG final
    Unsafe() { value = 42; }
}

Unsafe shared;

Thread t1 = new Thread(() -> shared = new Unsafe());
Thread t2 = new Thread(() -> {
    if (shared != null) {
        System.out.println(shared.value); // có thể in 0
    }
});
```

`shared` là biến thường, `value` không `final` → t2 có thể thấy `shared != null`
nhưng `value` vẫn là `0`. Fix: cho `value` thành `final`, hoặc cho `shared` thành
`volatile`.

## Tài liệu tham khảo

- [JLS 17.5 — final Field Semantics](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.5)
- Trước: [synchronized / monitor](/jmm/06-synchronized-monitor/)
- Tiếp theo: [Data race vs Race condition](/jmm/08-data-race-vs-race-condition/)
