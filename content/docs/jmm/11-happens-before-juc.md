---
title: "Happens-before trong java.util.concurrent"
description: "HB edges của Executor/Future, BlockingQueue, ConcurrentHashMap, Lock/Condition, StampedLock và các synchronizer"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Executor / Future / CompletableFuture](#1-executor--future--completablefuture)
- [2. BlockingQueue & concurrent collections](#2-blockingqueue--concurrent-collections)
- [3. ConcurrentHashMap](#3-concurrenthashmap)
- [4. Lock / ReentrantLock](#4-lock--reentrantlock)
- [5. ReentrantReadWriteLock](#5-reentrantreadwritelock)
- [6. Condition](#6-condition)
- [7. StampedLock](#7-stampedlock)
- [8. Các synchronizer](#8-các-synchronizer)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan

`java.util.concurrent` (j.u.c) là tập công cụ đồng bộ. Mỗi công cụ tạo ra **ranh
giới happens-before**: đảm bảo thread B thấy thay đổi của thread A theo đúng thứ
tự, và đảm bảo visibility/ordering.

> [!IMPORTANT]
> HB = rào chắn ở mức ngôn ngữ. Bạn tạo HB bằng primitive (`volatile`,
> `synchronized`/`Lock`, `Atomic`/`VarHandle`, `Future.get()`,
> `BlockingQueue.put/take`...). **JIT lo barrier thật phía dưới** — bạn không cần
> (và không thể) gọi fence mức thấp.

j.u.c bảo đảm visibility & ordering ("thấy dữ liệu đã dựng xong"), **không** đảm
bảo *khi nào* chạy hay chạy *bao lâu*. Nhiều thành phần còn cung cấp atomicity cho
thao tác đơn (CAS) hoặc theo key (`computeIfAbsent` của CHM). Phần về
[`Lock` / `ReentrantLock` / `Condition`](/jmm/11a-lock-interface/) được trình bày
chi tiết ở trang riêng.

### Bảng tra nhanh: ai HB ai

Mỗi cặp dưới đây tạo "cây cầu HB" giống cặp volatile write→read. Vế trái xong thì
vế phải **chắc chắn thấy** mọi thứ vế trái đã làm:

| Công cụ | Hành động "release" (vế A) | Hành động "acquire" (vế B) |
|---------|----------------------------|----------------------------|
| Thread | `thread.start()` | việc đầu tiên trong thread mới |
| Thread | việc cuối trong thread | `thread.join()` trả về |
| Executor | code trước `submit(task)` | thân `task` khi chạy |
| Future | thân task hoàn thành | `future.get()` trả về |
| Lock | `lock.unlock()` | `lock.lock()` lần sau (cùng lock) |
| BlockingQueue | `queue.put(x)` | `queue.take()` lấy đúng `x` |
| CountDownLatch | `latch.countDown()` | `latch.await()` trả về |
| Semaphore | `sem.release()` | `sem.acquire()` thành công |
| CHM | `map.put(k, v)` | `map.get(k)` thấy `v` |
| volatile | ghi biến volatile | đọc biến volatile đó |

> [!TIP]
> Mẹo nhớ: bất cứ chỗ nào một thread **"bàn giao"** dữ liệu/tín hiệu cho thread
> khác qua một công cụ j.u.c, ở đó có một HB edge. Cứ tìm "điểm bàn giao" là tìm
> được bảo đảm visibility.

## 1. Executor / Future / CompletableFuture

> [!NOTE]
> - Mọi hành động **trước khi** `submit(task)` HB các hành động bên trong task khi
>   nó bắt đầu chạy.
> - Mọi hành động bên trong task **trước khi hoàn thành** (kể cả ném exception) HB
>   `Future.get()` trả về / hoàn thành `CompletableFuture` liên quan.

```java
ExecutorService ex = Executors.newSingleThreadExecutor();
List<String> data = List.of("a", "b");   // chuẩn bị trước submit

Future<Integer> f = ex.submit(() -> {     // actions trước submit HB ở đây
    return data.size();
});

Integer n = f.get();                      // actions trong task HB sau get()
```

## 2. BlockingQueue & concurrent collections

- Mọi hành động **trước khi** đặt phần tử vào collection concurrent HB mọi hành
  động **sau khi** thread khác lấy/truy cập phần tử đó.
- `BlockingQueue`: `put` HB `take` tương ứng (và `offer` HB `poll` khi trả về phần
  tử đó).
- `SynchronousQueue`: mỗi `put`/`take` là một "bắt tay" → publish an toàn theo cặp.

```java
BlockingQueue<Task> q = new LinkedBlockingQueue<>();

// Producer
q.put(new Task(cfg));   // mọi write tới cfg trước put HB với consumer

// Consumer
Task t = q.take();      // thấy cấu hình đã publish đầy đủ
```

## 3. ConcurrentHashMap

- `put`/`replace`/`compute`/`merge` **publish** giá trị: write trước `put` HB read
  sau `get`/`computeIfAbsent`/`remove` của **cùng** key.
- Các phép `compute*`/`merge` là **atomic compound** cho riêng từng key.

```java
Map<String, Config> cache = new ConcurrentHashMap<>();
cache.computeIfAbsent("db", k -> loadConfig(k)); // atomic theo key "db"
```

## 4. Lock / ReentrantLock

`Lock` (interface) cho phép xác định critical section **linh hoạt** hơn
`synchronized`: lock/unlock ở vị trí khác nhau, timeout, ngắt khi chờ, nhiều
`Condition`.

| Khác biệt | `synchronized` | `Lock` |
|-----------|----------------|--------|
| Quản lý thread chờ | Entry Set / Wait Set của monitor | **AQS** — hàng đợi FIFO (kiểu CLH) |
| Fairness | Không đảm bảo | Có thể chọn FAIR |
| Chờ/tín hiệu | `wait()`/`notify()`/`notifyAll()` | `Condition.await()`/`signal()`/`signalAll()` |
| Timeout / tryLock | Không | Có (`tryLock`, `lockInterruptibly`) |

`ReentrantLock` dùng **AbstractQueuedSynchronizer (AQS)** với biến `state`:

- `state == 0` → lock rảnh.
- `state > 0` → lock đang bị giữ (reentrant: cùng thread gọi `lock()` nhiều lần →
  tăng `state`).
- Khi `lock()`: nếu `state == 0` → set 1, gán owner; nếu owner là chính mình →
  tăng `state`; nếu owner khác → vào sync queue và `park()`.
- Khi `unlock()`: giảm `state`; nếu về 0 → owner = null, đánh thức thread kế tiếp.

```java
public class ReentrantLockExample {
    private final Lock lock = new ReentrantLock();
    private int counter = 0;

    public void increment() {
        lock.lock();
        try {
            counter++;
        } finally {
            lock.unlock();   // luôn unlock trong finally
        }
    }
}
```

> [!CAUTION]
> Luôn `unlock()` trong khối `finally`. Nếu critical section ném exception mà
> không unlock → lock bị giữ vĩnh viễn → deadlock.

## 5. ReentrantReadWriteLock

Tối ưu cho **đọc nhiều – ghi ít**:

- Nhiều thread có thể giữ **read lock** cùng lúc.
- Chỉ một thread giữ **write lock**; khi có writer → chặn toàn bộ reader.
- Dùng AQS, quản lý bằng bit trong `state`: phần high = số reader, phần low = số
  write lock.

```java
private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
private final Lock readLock = rwLock.readLock();
private final Lock writeLock = rwLock.writeLock();
private int value = 0;

public void readValue() {
    readLock.lock();
    try { return; /* đọc value */ } finally { readLock.unlock(); }
}

public void writeValue(int v) {
    writeLock.lock();
    try { value = v; } finally { writeLock.unlock(); }
}
```

> [!NOTE]
> Mặc định **UNFAIR** (thường ưu tiên writer để tránh writer bị đói). Có thể bật
> FAIR (lock nào vào trước chạy trước).

So sánh:

| Tiêu chí | `ReentrantLock` | `ReentrantReadWriteLock` |
|----------|-----------------|--------------------------|
| Tái nhập | Có | Có (cả read và write) |
| Song song đọc | Không | Có |
| Độc quyền ghi | Có | Có |
| Condition | Nhiều condition | Chỉ cho write lock |
| Use case | Vùng găng đơn giản | Đọc nhiều – ghi ít |

## 6. Condition

`Condition` (tạo từ `lock.newCondition()`) tương tự `wait/notify` nhưng không gắn
cứng vào object monitor, và mỗi lock có thể tạo **nhiều** Condition → tách hàng
chờ, tránh đánh thức nhầm.

Cơ chế bên trong (AQS): khi `await()` → thread rời sync queue, chuyển sang
condition queue, nhả lock (state về 0), bị `park()`. Khi `signal()` → chuyển một
thread từ condition queue về sync queue; nó phải acquire lại lock rồi mới chạy
tiếp từ điểm `await()`.

Ví dụ bounded buffer (producer–consumer):

```java
public class BoundedBuffer<E> {
    private final Queue<E> queue = new LinkedList<>();
    private final int capacity;
    private final Lock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    public BoundedBuffer(int capacity) { this.capacity = capacity; }

    public void put(E item) throws InterruptedException {
        lock.lock();
        try {
            while (queue.size() == capacity) notFull.await();  // chờ có chỗ trống
            queue.add(item);
            notEmpty.signal();                                 // báo consumer
        } finally {
            lock.unlock();
        }
    }

    public E take() throws InterruptedException {
        lock.lock();
        try {
            while (queue.isEmpty()) notEmpty.await();           // chờ có dữ liệu
            E item = queue.poll();
            notFull.signal();                                   // báo producer
            return item;
        } finally {
            lock.unlock();
        }
    }
}
```

> [!IMPORTANT]
> Luôn gọi `await()` trong vòng `while` (không phải `if`) để chống **spurious
> wakeup** và kiểm tra lại điều kiện sau khi được đánh thức.

## 7. StampedLock

`StampedLock` (Java 8) **không** kế thừa `Lock`, **không** reentrant, **không** có
`Condition`. Điểm đặc biệt: có thêm chế độ **optimistic read** (đọc lạc quan,
không khóa). Mặc định UNFAIR (ưu tiên writer).

Ba chế độ:

- **Write lock** — độc quyền, chặn mọi reader/writer khác.
- **Read lock** — nhiều reader cùng lúc nếu không có writer.
- **Optimistic read** — không khóa; đọc "liều" rồi `validate(stamp)`. Nếu có writer
  chen vào giữa → validate fail → đọc lại bằng read lock.

Mỗi lần lock trả về một `stamp` (long) dùng để unlock hoặc validate. Bên trong:
state 64-bit chứa số reader + bit cờ writer + version.

```java
private final StampedLock sl = new StampedLock();
private int x, y;

double sum() {
    long s = sl.tryOptimisticRead();   // 1) lấy stamp (version hiện tại)
    int lx = x, ly = y;                // 2) đọc vào biến local
    if (!sl.validate(s)) {             // 3) có writer chen vào không?
        s = sl.readLock();             //    -> có: fallback an toàn
        try { lx = x; ly = y; }
        finally { sl.unlockRead(s); }
    }
    return lx + ly;                    // 4) dùng snapshot local
}
```

> [!TIP]
> Optimistic read **không tăng bộ đếm reader** → cực nhanh khi ghi hiếm. Nhưng
> phải luôn `validate` và có nhánh fallback. Vì không reentrant, **đừng** lock lại
> trong khi đang giữ lock — dễ tự deadlock.

## 8. Các synchronizer

Tất cả đều tạo HB edge giữa các thread phối hợp:

| Synchronizer | Công dụng | HB edge |
|--------------|-----------|---------|
| **CountDownLatch** | Chờ N sự kiện hoàn tất (đếm ngược, dùng một lần) | `countDown()` HB `await()` trả về |
| **CyclicBarrier** | N thread cùng chờ nhau tại một điểm, **tái sử dụng** | tới barrier HB các thread khác vượt qua barrier |
| **Phaser** | Như CyclicBarrier nhưng linh hoạt, nhiều pha, số bên thay đổi động | hết pha này HB bắt đầu pha sau |
| **Semaphore** | Giới hạn số thread truy cập đồng thời (N permit) | `release()` HB `acquire()` lấy được permit |
| **Exchanger** | Hai thread trao đổi dữ liệu theo cặp | mỗi `exchange()` là "bắt tay" hai chiều |

```java
// CountDownLatch: main chờ 3 worker xong
CountDownLatch latch = new CountDownLatch(3);
for (int i = 0; i < 3; i++) {
    new Thread(() -> {
        try { doWork(); } finally { latch.countDown(); }
    }).start();
}
latch.await();   // thấy mọi kết quả của 3 worker (HB)
```

> [!NOTE]
> `CountDownLatch` dùng **một lần** (đếm về 0 là xong). Cần lặp lại nhiều vòng →
> dùng `CyclicBarrier` hoặc `Phaser`.

## Tài liệu tham khảo

- [Javadoc — java.util.concurrent (package HB spec)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)
- Trước: [Thread-safe classes](/jmm/10-thread-safe-classes/)
- Tiếp theo: [Lock interface & ReentrantLock](/jmm/11a-lock-interface/)
