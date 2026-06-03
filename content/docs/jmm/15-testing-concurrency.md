---
title: "Testing concurrency"
description: "Vì sao test đồng thời khó, công cụ jcstress / JMH / Lincheck, và cách đo hiệu năng đúng"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Vì sao test concurrency khó](#1-vì-sao-test-concurrency-khó)
- [2. jcstress — bắt bug JMM](#2-jcstress--bắt-bug-jmm)
- [3. Lincheck — kiểm thử linearizability](#3-lincheck--kiểm-thử-linearizability)
- [4. JMH — đo hiệu năng đúng](#4-jmh--đo-hiệu-năng-đúng)
- [5. Kỹ thuật bổ trợ](#5-kỹ-thuật-bổ-trợ)
- [6. Checklist test đồng thời](#6-checklist-test-đồng-thời)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan

Test code đồng thời **không** giống test code tuần tự: bug chỉ lộ ra với một thứ
tự thực thi hiếm gặp, trên một CPU nhất định, dưới một mức tải nhất định. Cần công
cụ chuyên dụng (jcstress, Lincheck) và phương pháp đo đúng (JMH).

## 1. Vì sao test concurrency khó

- **Không xác định (non-deterministic)**: cùng một test chạy 1 triệu lần có thể
  pass, lần thứ 1.000.001 mới fail.
- **Phụ thuộc phần cứng**: bug reorder ẩn trên x86 (TSO) nhưng lộ trên ARM (weak
  memory) — xem [Memory Barriers](/jmm/04-memory-barriers/).
- **Heisenbug**: thêm `print`/`sleep`/debugger làm thay đổi timing → bug "biến
  mất".
- **Không gian trạng thái khổng lồ**: số interleaving tăng theo cấp số nhân với số
  thread và số bước.

> [!WARNING]
> Một test concurrency "pass" **không** chứng minh code đúng — chỉ chứng minh chưa
> bắt được lỗi. Cần công cụ tăng xác suất phơi bày lỗi.

## 2. jcstress — bắt bug JMM

[jcstress](https://github.com/openjdk/jcstress) (Java Concurrency Stress) là công
cụ chính thức của OpenJDK để test các hành vi JMM mức thấp (reorder, visibility).
Nó chạy hàng tỷ lần với đủ kiểu "khiêu khích" và **liệt kê mọi kết quả quan sát
được** kèm tần suất.

```java
@JCStressTest
@Outcome(id = "1, 1", expect = Expect.ACCEPTABLE,          desc = "đúng")
@Outcome(id = "0, 0", expect = Expect.ACCEPTABLE_INTERESTING, desc = "reorder lộ ra")
@State
public class Reordering {
    int x, y;

    @Actor void actor1(II_Result r) { x = 1; r.r1 = y; }
    @Actor void actor2(II_Result r) { y = 1; r.r2 = x; }
}
```

> [!TIP]
> Dùng jcstress khi bạn tự viết primitive đồng bộ (lock-free, dùng `VarHandle`) và
> cần chứng minh nó tuân thủ JMM. Kết quả `ACCEPTABLE_INTERESTING` cho thấy
> reorder thực sự xảy ra.

## 3. Lincheck — kiểm thử linearizability

[Lincheck](https://github.com/JetBrains/lincheck) (JetBrains) test xem một cấu
trúc dữ liệu đồng thời có **linearizable** không, bằng cách sinh ngẫu nhiên các
chuỗi thao tác song song rồi đối chiếu với một mô hình tuần tự (sequential
specification). Nó còn có **model checking** để liệt kê interleaving có hệ thống.

> [!NOTE]
> Lincheck phù hợp test concurrent collection / data structure tự viết (queue,
> map, counter): nó tự tìm interleaving phá vỡ tính đúng đắn và in ra trace tái
> hiện.

## 4. JMH — đo hiệu năng đúng

[JMH](https://github.com/openjdk/jmh) (Java Microbenchmark Harness) là chuẩn vàng
để benchmark JVM, xử lý đúng các cạm bẫy mà benchmark "tay mơ" hay mắc.

```java
@BenchmarkMode(Mode.Throughput)
@State(Scope.Benchmark)
public class CounterBench {
    AtomicLong atomic = new AtomicLong();
    LongAdder adder = new LongAdder();

    @Benchmark @Threads(8) public void atomicInc()  { atomic.incrementAndGet(); }
    @Benchmark @Threads(8) public void adderInc()   { adder.increment(); }
}
```

> [!IMPORTANT]
> Benchmark "tay" thường sai vì: (1) JIT chưa warmup → đo code interpreted;
> (2) dead-code elimination xóa luôn code đo; (3) constant folding; (4) hiệu ứng
> GC/JIT xen vào. JMH xử lý warmup, fork JVM riêng, và `Blackhole` để chống
> dead-code elimination.

## 5. Kỹ thuật bổ trợ

| Kỹ thuật | Mục đích |
|----------|----------|
| Tăng số thread >> số core | Ép nhiều interleaving, tăng context switch |
| `CountDownLatch` cho "đồng khởi" | Mọi thread bắt đầu cùng lúc → tăng va chạm |
| Chạy lặp nhiều lần (stress loop) | Tăng xác suất phơi bày bug hiếm |
| Chạy trên ARM (Apple Silicon / Graviton) | Phơi bày bug reorder ẩn trên x86 |
| `-Xint` / `-XX:-TieredCompilation` | Thay đổi mức tối ưu để lộ bug phụ thuộc JIT |
| `ThreadSanitizer`-style tools / `-ea` | Bật assertion kiểm tra bất biến runtime |

## 6. Checklist test đồng thời

> [!TIP]
> - [ ] Có test stress chạy lặp nhiều lần với nhiều thread không?
> - [ ] Đã thử trên cả x86 **và** ARM chưa?
> - [ ] Primitive lock-free tự viết đã chạy qua jcstress chưa?
> - [ ] Cấu trúc dữ liệu đồng thời đã test linearizability (Lincheck) chưa?
> - [ ] Số liệu hiệu năng đo bằng JMH (không phải `System.nanoTime()` thủ công)?
> - [ ] Có assertion kiểm tra bất biến (invariant) trong lúc chạy không?

## Tài liệu tham khảo

- [jcstress (OpenJDK)](https://github.com/openjdk/jcstress)
- [JMH (OpenJDK)](https://github.com/openjdk/jmh)
- [Lincheck (JetBrains)](https://github.com/JetBrains/lincheck)
- Trước: [Escape Analysis](/jmm/14-escape-analysis/)
- Tiếp theo: [Pitfalls & Checklist](/jmm/16-pitfalls-checklist/)
