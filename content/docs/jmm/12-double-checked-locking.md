---
title: "Double-Checked Locking (DCL)"
description: "DCL đúng cách với volatile, vì sao cần volatile, và mẫu tốt hơn Initialization-on-Demand Holder"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. DCL là gì](#1-dcl-là-gì)
- [2. Vì sao tránh synchronized mỗi lần gọi](#2-vì-sao-tránh-synchronized-mỗi-lần-gọi)
- [3. Vì sao cần volatile](#3-vì-sao-cần-volatile)
- [4. Initialization-on-Demand Holder (IoDH)](#4-initialization-on-demand-holder-iodh)
- [5. So sánh & điểm yếu](#5-so-sánh--điểm-yếu)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan

**Double-Checked Locking (DCL)** là mẫu lazy init một singleton: chỉ tạo object
một lần khi cần, tránh phải `synchronized` ở mọi lần gọi getter. Mẫu này **bắt
buộc** dùng `volatile` mới đúng.

## 1. DCL là gì

```java
class SafeSingleton {
    private static volatile SafeSingleton INSTANCE; // ✅ bắt buộc volatile

    private SafeSingleton() { /* init đầy đủ */ }

    static SafeSingleton get() {
        SafeSingleton r = INSTANCE;             // local fast-path
        if (r == null) {
            synchronized (SafeSingleton.class) {
                r = INSTANCE;
                if (r == null) {
                    r = new SafeSingleton();
                    INSTANCE = r;               // volatile write (release)
                }
            }
        }
        return r;                               // volatile read (acquire)
    }
}
```

Logic:

- **Check 1** (ngoài `synchronized`): nếu object chưa tạo thì mới vào khối khóa.
- **Check 2** (trong `synchronized`): nếu vẫn chưa tạo thì mới `new` — chống trường
  hợp hai thread cùng vượt qua check 1.

> [!TIP]
> Dùng biến local `r` để giảm số lần đọc field `volatile` (nhanh hơn một chút trên
> đường fast-path).

## 2. Vì sao tránh synchronized mỗi lần gọi

Nếu `synchronized` toàn bộ getter, mỗi lần gọi (kể cả sau khi đã init) đều phải:

- **Chi phí monitor**: monitor-enter/exit mỗi lần — dù JVM có biased/thin lock,
  chi phí vẫn tích lũy khi getter được gọi cực nhiều và **không còn tranh chấp**
  (đọc nhiều, ghi 0 lần sau init).
- **Rào bộ nhớ (fence)**: `synchronized` chèn acquire/release barrier — đắt hơn
  một `volatile` read đơn giản (nhất là trên ARM).

DCL giúp đường "fast path" (đa số lượt gọi sau init) chỉ tốn **một volatile read**.

## 3. Vì sao cần volatile

> [!WARNING]
> Không có `volatile`, dòng `INSTANCE = new SafeSingleton()` có thể bị **reorder**.
> Việc `new` gồm: (1) cấp phát bộ nhớ, (2) chạy constructor, (3) gán reference vào
> `INSTANCE`. JIT/CPU có thể đảo thành (1) → (3) → (2). Thread khác chạy check 1
> thấy `INSTANCE != null` nhưng object **chưa init xong** → đọc ra field mặc định
> (`0`, `null`...).

`volatile` chặn reorder này (release semantics khi ghi, acquire khi đọc) → khi
thread khác thấy `INSTANCE != null` thì object **chắc chắn đã dựng xong**.

## 4. Initialization-on-Demand Holder (IoDH)

Mẫu **tốt hơn** DCL, tận dụng cơ chế class initialization của JVM:

```java
class HolderSingleton {
    private HolderSingleton() { /* init */ }

    private static class Holder {
        static final HolderSingleton I = new HolderSingleton(); // class init là HB
    }

    static HolderSingleton get() { return Holder.I; }
}
```

`Holder` chỉ được nạp (và `I` được khởi tạo) **lần đầu** ai đó gọi `get()` → lazy
tự nhiên. JVM đảm bảo class initialization là thread-safe và object được publish
**fully-constructed**.

> [!IMPORTANT]
> Vì sao tốt hơn DCL:
> - Code ngắn gọn, **không** cần `synchronized` hay `volatile`.
> - Sau init, DCL vẫn phải check `if (INSTANCE == null)` + đọc volatile (acquire →
>   chặn reorder → còn overhead nhỏ). IoDH **không** có overhead này.
> - JVM đảm bảo publish an toàn qua cơ chế class initialization.

## 5. So sánh & điểm yếu

| Tiêu chí | DCL | IoDH |
|----------|-----|------|
| Cần `volatile`/`synchronized` | Có | Không |
| Overhead sau init | volatile read mỗi lần | Không (truy cập field thường) |
| Thay đổi instance về sau | ✅ Được (gán lại / `AtomicReference`) | ❌ Không (instance cố định) |
| Lazy init có tham số | ✅ Được | ❌ Không (constructor bị che, không truyền tham số) |

> [!NOTE]
> Chọn **IoDH** cho singleton bất biến, không tham số (đa số trường hợp). Chọn
> **DCL** khi cần thay instance về sau hoặc cần truyền tham số/cấu hình động vào
> lúc khởi tạo.

## Tài liệu tham khảo

- [JSR-133 FAQ — Double-Checked Locking is broken](https://www.cs.umd.edu/~pugh/java/memoryModel/DoubleCheckedLocking.html)
- Trước: [Happens-before trong java.util.concurrent](/jmm/11-happens-before-juc/)
- Tiếp theo: [False sharing & padding](/jmm/13-false-sharing-padding/)
