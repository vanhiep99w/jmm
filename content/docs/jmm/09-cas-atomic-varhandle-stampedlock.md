---
title: "CAS, Atomic, VarHandle, StampedLock"
description: "Cơ chế CAS, họ Atomic*, LongAdder, VarHandle và StampedLock cho đồng bộ không khóa"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Atomic operation là gì](#1-atomic-operation-là-gì)
- [2. CAS — Compare-And-Set](#2-cas--compare-and-set)
- [3. Vì sao CAS không bị race condition](#3-vì-sao-cas-không-bị-race-condition)
- [4. Họ Atomic*](#4-họ-atomic)
- [5. Contention & LongAdder](#5-contention--longadder)
- [6. AtomicReference & ABA](#6-atomicreference--aba)
- [7. VarHandle](#7-varhandle)
- [8. Pitfalls](#8-pitfalls)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan

Đây là nhóm công cụ **đồng bộ không khóa (lock-free)** dựa trên primitive **CAS**
ở mức CPU. Ưu điểm: không block thread thua, overhead thấp khi contention thấp.

## 1. Atomic operation là gì

Một thao tác **atomic** nghĩa là:

- **Nguyên tử**: hoặc thực hiện trọn vẹn, hoặc không gì cả.
- Không bị thread khác "xen ngang" giữa chừng.
- Đảm bảo **atomicity + visibility** (thấy giá trị mới nhất ngay).

> [!NOTE]
> Tất cả các lớp `Atomic*` đều dùng **CAS** ở mức CPU để hiện thực tính nguyên tử.

## 2. CAS — Compare-And-Set

**Compare-And-Set** (hay Compare-And-Swap) là primitive được CPU hỗ trợ để cập
nhật dữ liệu theo điều kiện một cách nguyên tử.

```java
CAS(address, expectedValue, newValue):
    // 1. Đọc giá trị tại address
    // 2. Nếu == expectedValue → ghi newValue, trả về true
    // 3. Nếu != expectedValue → không làm gì, trả về false
```

Áp dụng cho counter:

```java
AtomicInteger count = new AtomicInteger(0);

void increment() {
    int oldVal, newVal;
    do {
        oldVal = count.get();   // đọc giá trị hiện tại
        newVal = oldVal + 1;    // tính giá trị mới
    } while (!count.compareAndSet(oldVal, newVal)); // CAS, thua thì lặp
}
```

So sánh CAS vs Lock:

| Đặc điểm | CAS | Lock |
|----------|-----|------|
| Blocking | ❌ Không block | ✅ Block thread thua |
| Deadlock | ❌ Không | ✅ Có thể nếu lock sai thứ tự |
| Starvation | ⚠️ Có thể (retry vô hạn) | ⚠️ Có thể |
| Overhead | Thấp khi contention thấp | Cao hơn (kernel + monitor) |
| Semantics | Atomic update + acquire-release | Mutual exclusion + HB mạnh |

## 3. Vì sao CAS không bị race condition

Nếu `read → compare → write` là ba bước rời rạc, hai thread có thể cùng đọc rồi
ghi đè nhau (lost update). Nhưng CAS gộp cả ba thành **một action duy nhất được
CPU hỗ trợ** (x86: `cmpxchg`, ARM: `ldxr/stxr`) → không thể bị xen ngang.

```text
T1: đọc 0 → tính 1
T2: đọc 0 → tính 1
T1: CAS(0→1) ✅ thành công → count = 1
T2: CAS(0→1) ❌ thất bại (giờ đã là 1) → lặp lại
T2: đọc 1 → tính 2 → CAS(1→2) ✅ → count = 2
```

> [!IMPORTANT]
> Bên trong `AtomicInteger`: giá trị lưu trong field `volatile` (đảm bảo
> visibility/ordering), còn cập nhật bằng **CAS** (đảm bảo atomicity). Chính CAS
> mới chặn race condition — `volatile` một mình thì **không** đủ.

## 4. Họ Atomic*

### 4.1 AtomicInteger / AtomicLong / AtomicBoolean

Dùng cho counter/flag đơn giản, contention thấp–vừa.

```java
ai.incrementAndGet();   // tăng trước, trả giá trị mới
ai.getAndIncrement();   // trả giá trị cũ, rồi mới tăng
ai.addAndGet(delta);    // tăng thêm delta (âm/dương), trả giá trị mới
ai.getAndSet(v);        // set v, trả giá trị cũ
ai.compareAndSet(e, u); // CAS: chỉ ghi u nếu hiện tại == e, trả true/false
ai.getAndUpdate(fn);    // áp dụng hàm fn
```

- **Ưu**: đơn giản, chính xác, không block.
- **Nhược**: dưới contention cao có thể spin nhiều (retry CAS).

## 5. Contention & LongAdder

**Contention** = mức độ tranh chấp khi nhiều thread cùng truy cập một tài nguyên.

| Mức | Đặc điểm | Khuyến nghị |
|-----|----------|-------------|
| **Thấp** | Ít thread, CAS gần như luôn thành công lần đầu | `AtomicLong` OK |
| **Vừa** | Có CAS fail nhưng chưa quá tốn CPU | `AtomicLong` vẫn ổn |
| **Cao** | CAS fail liên tục, CPU spin nhiều | Dùng `LongAdder`/sharding |

### 5.1 Vấn đề của AtomicLong khi contention cao

`AtomicLong.incrementAndGet()` là CAS loop trên **một** biến duy nhất. Khi nhiều
thread cùng increment: tất cả đọc cùng giá trị, chỉ một CAS thành công, còn lại
fail → retry → tốn CPU.

```text
T1: CAS(base) ✓
T2: CAS(base) ✗ fail → retry
T3: CAS(base) ✗ fail → retry
T4: CAS(base) ✗ fail → retry
```

### 5.2 Ý tưởng của LongAdder

`LongAdder` chia bộ đếm thành nhiều **cell**, mỗi cell là một `volatile long` cập
nhật bằng CAS riêng. Mỗi thread chọn một cell theo thread hash → ít đụng nhau.

```text
base    (volatile long)   // dùng khi contention thấp
cells[] (mảng Cell)       // mỗi cell có volatile long value
// CAS trên base fail nhiều → mở rộng cells[]
// cell = cells[threadHash & (cells.length - 1)]
// sum() = base + tổng tất cả cells
```

```text
T1: CAS(cell[0]) ✓
T2: CAS(cell[1]) ✓
T3: CAS(cell[2]) ✓
T4: CAS(cell[3]) ✓
```

> [!TIP]
> - **Ưu**: throughput cao hơn `AtomicLong` khi contention lớn.
> - **Nhược**: `sum()` **không** phải ảnh chụp nguyên tử tại một thời điểm. Nếu
>   cần snapshot chính xác → dùng `AtomicLong`.

## 6. AtomicReference & ABA

`AtomicReference<T>` giữ một tham chiếu `volatile` tới `T`, cập nhật bằng CAS để
đổi cả object "một phát".

```java
enum State { NEW, RUNNING, STOPPED }

class Service {
    private final AtomicReference<State> st = new AtomicReference<>(State.NEW);

    boolean start() { return st.compareAndSet(State.NEW, State.RUNNING); }
    boolean stop()  { return st.compareAndSet(State.RUNNING, State.STOPPED); }
    State state()   { return st.get(); }
}
```

> [!WARNING]
> `compareAndSet` so sánh theo **tham chiếu** (`==`), **không** dùng `equals()`.

### 6.1 ABA problem

Giá trị đổi từ A → B → A. CAS thấy "vẫn là A" nên thành công, nhưng thực tế giá
trị đã bị thay đổi giữa chừng → có thể sai logic.

> [!NOTE]
> Chống ABA: dùng `AtomicStampedReference<T>` (gắn thêm stamp/version) hoặc
> `AtomicMarkableReference<T>` (gắn cờ boolean).

### 6.2 Mảng & Updater

- `AtomicIntegerArray` / `AtomicLongArray` / `AtomicReferenceArray`: atomic theo
  phần tử mảng.
- `Atomic*FieldUpdater`: cập nhật trực tiếp field của object (không cần bọc
  Atomic*), tiết kiệm bộ nhớ. Yêu cầu field là `volatile`, không `final`.

## 7. VarHandle

`VarHandle` (Java 9+) là API hiện đại thay thế `Atomic*FieldUpdater` và
`sun.misc.Unsafe`, cho phép truy cập field/phần tử mảng với **mức ordering linh
hoạt**:

| Access mode | Ngữ nghĩa |
|-------------|-----------|
| `getPlain` / `setPlain` | Như biến thường, không bảo đảm gì |
| `getOpaque` / `setOpaque` | Đảm bảo tính nguyên tử + tiến triển, không ordering chéo |
| `getAcquire` / `setRelease` | Acquire/release semantics (như volatile read/write một chiều) |
| `getVolatile` / `setVolatile` | Đầy đủ như volatile |
| `compareAndSet` / `weakCompareAndSet` | CAS (weak có thể spurious fail) |

```java
class Counter {
    private static final VarHandle VALUE;
    private volatile int value;
    static {
        try {
            VALUE = MethodHandles.lookup()
                .findVarHandle(Counter.class, "value", int.class);
        } catch (ReflectiveOperationException e) {
            throw new ExceptionInInitializerError(e);
        }
    }
    void inc() {
        int prev;
        do { prev = (int) VALUE.getVolatile(this); }
        while (!VALUE.compareAndSet(this, prev, prev + 1));
    }
}
```

## 8. Pitfalls

> [!CAUTION]
> - `volatile int x; x++;` vẫn **sai** (read-modify-write 3 bước) → dùng
>   `AtomicInteger.incrementAndGet()`.
> - **Spurious failure**: `weakCompareAndSet*` có thể fail ngẫu nhiên → luôn đặt
>   trong **CAS loop**.
> - **ABA**: dùng `Stamped`/`Markable` hoặc thêm version.
> - **False sharing**: nhiều counter chung cache line → nhiễu nhau. Tránh bằng
>   `LongAdder`, padding, hoặc `@Contended` (xem [False Sharing](/jmm/13-false-sharing-padding/)).
> - `LongAdder.sum()` không phải snapshot nguyên tử → cần chính xác thì dùng
>   `AtomicLong`.

## Tài liệu tham khảo

- [Javadoc — java.util.concurrent.atomic](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html)
- [Javadoc — VarHandle](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/VarHandle.html)
- Trước: [Data race vs Race condition](/jmm/08-data-race-vs-race-condition/)
- Tiếp theo: [Thread-safe classes](/jmm/10-thread-safe-classes/)
