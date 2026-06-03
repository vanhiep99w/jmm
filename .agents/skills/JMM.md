# JMM (Java Memory Model)

## Mục lục

- Tổng quan JMM: mục tiêu, vấn đề visibility/ordering/atomicity
- Mô hình “happens-before” & quan hệ với program order
- Reordering: compiler, JIT, CPU; ví dụ minh họa
- Memory barriers & mapping trên kiến trúc CPU phổ biến
- Volatile: visibility, ordering guarantees, anti-patterns
- Synchronized/monitor: mutual exclusion & HB edges
- Final field semantics & safe publication patterns
- Data race vs. race condition; benign vs. harmful races
- CAS, Atomic\*, VarHandle, StampedLock—khi nào dùng
- Xây dựng thread-safe classes: immutability, confinement, defensive copies
- Happens-before trong java.util.concurrent (Executor, Future, ConcurrentHashMap, Phaser, etc.)
- Double-checked locking (đúng/sai), publication, lazy init
- False sharing, padding, contended fields
- Escape analysis, TL;DR & tác động tối ưu hóa
- Testing concurrency: stress tests, JCStress, JMH (đo đúng)
- Pitfalls thường gặp + checklist review code

## Tổng quan JMM: mục tiêu, vấn đề visibility/ordering/atomicity

- Java Memory Model được định nghĩa trong Java Language Specification (JLS) nhằm:
  - Đảm bảo tính nhất quán (Consistency) của dữ liệu khi chạy đa luồng.
  - Đưa ra quy tắc về visibility, ordering, atomicity giữa các thread.
  - Ẩn đi sự khác biệt của phần cứng, CPU, compiler optimization… để code chạy đúng trên mọi kiến trúc.
  - Cân bằng giữa tính đúng đắn và hiệu năng.

## Mô hình “happens-before” & quan hệ với Program order

- Trong JMM, happens-before (HB) là một quan hệ thứ tự logic giữa hai hành động (operations) A và B
  > Nếu A happens-before B → mọi thay đổi bộ nhớ mà A thực hiện đều nhìn thấy được bởi B, và A xuất hiện “xảy ra trước” B về mặt quan sát.
- Happens-Before vs Program Order
  - Program order: thứ tự lệnh bạn viết trong code, trong phạm vi một thread.
  - Happens-before: thứ tự quan sát được giữa các thread, bao gồm:
    - Thứ tự trong cùng một thread (JMM bảo toàn program order ở single-thread).
    - Thứ tự được tạo bởi cơ chế đồng bộ (volatile, synchronized, concurrent utils).

```java
// Thread 1
a = 1;        // (1)
b = true;     // (2)

// Thread 2
if (b) {      // (3)
    print(a); // (4)
}

 // Program order:
 //   T1: (1) → (2)
 //   T2: (3) → (4)

 // Happens-before:
 //   Nếu b là volatile, (2) HB (3) → đảm bảo (1) HB (4).
 //   Nếu b không volatile, không có HB giữa T1 và T2 → T2 có thể thấy a=0
```

- HB rules quan trọng (Tìm hieu thêm)

## Reordering – compiler, JIT, CPU

- Reordering = thay đổi thứ tự thực thi thực tế của các lệnh so với thứ tự bạn viết trong code.
- Có 3 nguồn gây reorder:
  - Compiler Reordering – Java compiler & JIT tối ưu code.
    - tối ưu hiệu năng, loại bỏ code thừa, gom các lệnh gần nhau, phá phụ thuộc giả.
  - CPU Reordering – do CPU có out-of-order execution.
    - CPU hiện đại không chạy tuần tự từng lệnh mà dùng out-of-order execution:
    - Nếu lệnh A phải chờ dữ liệu từ RAM, CPU có thể chạy lệnh B không phụ thuộc A trước.
  - Memory System Reordering – do cache, store buffer, write
    combining.
    - khi CPU ghi dữ liệu, nó có thể ghi vào buffer trước, flush ra RAM sau → từ góc nhìn thread khác, lệnh bị reorder.
- Khi nào reorder “hợp pháp”
  - Không thay đổi kết quả trên single-thread (as-if-serial semantics).
    > As-if-serial : Compiler, JIT, và CPU được phép sắp xếp lại (reorder) các lệnh, miễn sao kết quả cuối cùng quan sát được trong một thread đơn vẫn giống hệt như khi chương trình chạy tuần tự theo đúng thứ tự code bạn viết.
  - Không phá vỡ happens-before giữa các threads.
  - Vì vậy, nếu bạn dùng `volatile/synchronized` → JVM sẽ chèn `Memory Barrier` để chặn reorder nguy hiểm.
- Chặn reorder
  - `volatile`:
    - Ghi volatile: StoreStore + StoreLoad barrier.
    - Đọc volatile: LoadLoad + LoadStore barrier.
  - `synchronized`:
    - Unlock: StoreStore + StoreLoad.
    - Lock: LoadLoad + LoadStore.
  - `java.util.concurrent`: các cấu trúc đã tích hợp barrier.
- Vì sao lại có reordering?
  | Nguồn | Lý do |
  | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
  | **Compiler** (javac) | Tối ưu hóa code, gộp hoặc bỏ bớt lệnh, đổi thứ tự không làm thay đổi logic đơn luồng. |
  | **JIT compiler** (HotSpot JIT) | Khi runtime biết nhiều hơn (loại biến, đường branch phổ biến), nó reorder để chạy nhanh hơn. |
  | **CPU** (hardware) | CPU hiện đại có pipeline, store buffer, load buffer… thực hiện “out-of-order execution” để tận dụng tài nguyên và giảm chờ bộ nhớ. |

## Memory Barriers & mapping trên kiến trúc CPU phổ biến

- Như phần trên reorder là cần thiết giúp java hay cpu tối ứu hóa hiệu xuất nó không xấu. Chỉ là nó gây ra khả năng bị data race cần được lưu ý và xử lý.
- `Memory Barrier` (hay `fence`) là một chỉ thị đặc biệt mà compiler hoặc CPU phải tuân thủ:
  - Mọi thao tác bộ nhớ trước barrier phải hoàn thành và nhìn thấy được trước khi thực hiện bất kỳ thao tác bộ nhớ nào sau barrier.
    - Dọn dẹp = invalidate cache cũ, ép đọc từ main memory.
    - Cập nhật = đảm bảo đọc biến báo hiệu xong thì các biến liên quan cũng đã được load mới nhất.
  - Không làm thay đổi dữ liệu, mà chỉ chặn reorder và ép đồng bộ cache.

### Các loại Barrier chung

- `LoadLoad`:Không reorder giữa 2 lệnh load (Đảm bảo đọc A xong mới đọc B)
- `StoreStore`: Không reorder giữa 2 lệnh store (Ghi A xong mới ghi B)
- `LoadStore`: Không reorder giữa load và store (Đọc A xong mới ghi B)
- `StoreLoad`: Mạnh nhất: ngăn reorder store → load (Dùng trong volatile write → read)

### Barrier trong JMM

- JMM không định nghĩa barrier trực tiếp, nhưng khi bạn dùng volatile, synchronized, hoặc API đồng bộ → JVM sẽ chèn barrier vào bytecode/machine code.
- `Volatile write`: `StoreStore` + `StoreLoad`
- `Volatile read`: `LoadLoad` + `LoadStore`
- `Unlock monitor`: `StoreStore` + `StoreLoad`
- `Lock monitor`: `LoadLoad` + `LoadStore`

### Mapping trên kiến trúc CPU

- Trong từng kiến trúc thì việc các bearrier được impl bằng các lệnh khác nhau (x86, ARM, ...)
- Tìm hiểu thêm

### Ví dụ barier

```java
// Thread 1
a = 1;                  // normal write
volatile volatileFlag = true;    // volatile write

// Thread 2
if (volatileFlag) {
    print(a);
}

// a=1 được ghi và flush trước khi volatileFlag=true.
// Thread 2 đọc volatileFlag=true → buộc đọc giá trị mới của a.
```

- Cách mà JMM xử lý với volatile trong ví dụ trên
- Trước khi ghi biến volatile JVM sẽ chèn `StoreStore barrier`
  - yêu cầu ghi toàn bộ biến trước đó vào main memory trong TH này là a = 1
- Sau khi ghi volatile, JVM chèn `StoreLoad barrier`:
  - Chặn reorder ghi volatile phải ghi xong volatile thì mới ghi load các biến tiếp theo
- ở thread read volatile thì được chèn `LoadLoad` và `LoadStore` ở ngay sau volatile để chán đọc và ghi các biến sau volatile (reorder)
- Code sau khi được chèn Bearries

```java
// Thread 1
a = 1;  // normal write
// [StoreStore]  -- JVM chèn do sắp ghi volatile -  đảm bảo ghi trước nó được publish
volatile volatileFlag = true;    // volatile write
// [StoreLoad]   -- JVM chèn ngay sau volatile write - ngăn đọc sau nhảy lên

// Thread 2
if (volatileFlag) {
  // [LoadLoad]  -- JVM chèn sau khi đọc volatile - ngăn đọcsau nhảy lên
  // [LoadStore] -- JVM chèn sau khi đọc volatile - ngăn ghi sau nhảy lên
  print(a);
}
```

## Volatile: visibility, ordering guarantees, anti-patterns

### `volatile` trong JMM đảm bảo

- Visibility (hiển thị): Mọi ghi (write) tới biến volatile được nhìn thấy ngay bởi các thread khác khi họ đọc (read) biến volatile đó sau này.
- Ordering (thứ tự):
  - Ghi volatile có release semantics: mọi ghi thường xảy ra trước ghi volatile phải publish ra bộ nhớ trước khi ghi volatile hoàn tất.
  - Đọc volatile có acquire semantics: sau khi đọc volatile, các đọc/ghi sau đó không thể bị đẩy lên trước nó.

```java
Thread 1                    Thread 2
data = 42;                  if (ready) {
volatile ready = true;        print(data); // chắc chắn 42
                            }
```

### `volatile` trong JMM `không` đảm bảo

- Không mutual exclusion → không chặn hai thread chạy “đè” nhau trong critical section.
- Không atomic cho thao tác nhiều bước (x++, balance += amount, check-then-act…).
- Không bảo toàn bất biến (invariant) nhiều biến nếu chỉ một biến volatile.
  > Nói chung ko đảm bảo race condition

### anti-patterns

```java
volatile int counter = 0;

void increment() {
    counter++; // gồm 3 bước: read -> add 1 -> write
}
// volatile chỉ đảm bảo visibility và ordering, không gộp 3 bước thành 1 thao tác nguyên tử.
// Hai thread có thể đọc cùng một giá trị, cộng lên, và ghi lại → mất update.
```

```java
class Point {
    int x, y;
}
volatile Point p;

// Thread 1
p.x = 1;
p.y = 1;
p = p; // volatile write để "publish" ?
// volatile chỉ đảm bảo cho chính biến được volatile (ở đây là tham chiếu p),không đảm bảo các field bên trong object đó được update như một đơn vị nguyên tử.
// Nếu thread khác đọc p khi x đã đổi nhưng y chưa đổi → bất biến x == y bị phá.
```

## `synchronized/monitor` — mutual exclusion & happens-before (HB) edges.

### Lock object

- Sử dụng như là `điểm đồng bộ hóa trung tâm`
- Không chó phép 2 Thread cùng lock trên 1 object

```java
final Object lock = new Object();

synchronized (lock) {
    // critical section
}
```

- lock có thể là bất kỳ object. Tránh dùng:
  - this nếu class bị lộ ra ngoài (dễ bị code khác “vô tình” lock chung).
  - String literal (vì interned, dễ va chạm global).
- Nên dùng `private final Object lock = new Object()`
  > Khi 1 Thread cướp được lock. Nó được coi là ready to run. Có nghĩa là nó đã sẵn sàng để chạy. Nhưng có chạy thực sự không thì còn phụ thuộc vào OS Scheduler + JVM scheduler. Nó sẽ phụ thuộc vào sự ưu tiên để chọn ra thread sẽ thực sự chạy (cấp phát 1 os thread thực sự để thread java chạy). Nên dù lock đã được lấy mà ko được cấp phát thread os thì code cũng sẽ ko chạy và lock vẫn sẽ được được giữ
  > convoy effect: Trong bối cảnh concurrency nghĩa là hiệu ứng “xe nối đuôi nhau” — khi một thread giữ lock quá lâu hoặc bị chậm, các thread khác phải xếp hàng chờ lock đó, dẫn tới cả hàng bị chậm theo.

### synchronized trên method

```java
class Demo {
    public synchronized void foo() { /* ... */ } // lock 'this'
    public void bar() { /* ... */ }              // không lock vì ko hề có synchronized
}

// Thread 1 gọi obj.foo() → giữ lock trên obj.
// Thread 2 cũng gọi obj.foo() → ❌ bị block, vì obj đang bị lock.
// Nhưng:
// Thread 3 gọi obj.bar() → ✅ vẫn chạy bình thường, vì bar() không yêu cầu lock gì cả.
// Thread 4 gọi obj2.foo() (object khác) → ✅ chạy song song, vì lock của obj2 khác lock obj.
```

- khi sử dụng synchronized trên function nó sẽ lock object this của method.
- Các thread khác vẫn có thể gọi các hàm khác trong cùng object, nếu các hàm đó không bị synchronized cùng trên cùng lock object.
- Trường hợp nhiều synchronized method trong cùng class

```java
class Demo {
    public synchronized void foo() { ... }  // lock this
    public synchronized void bar() { ... }  // lock this
}
// Thread 1 → obj1.doSomething();  ✅ có lock obj1
// Thread 2 → obj1.doSomething();  ❌ chờ (vì lock obj1)
// Thread 3 → obj2.doSomething();  ✅ chạy song song (lock obj2 riêng)
```

### Monitor trong JVM

- Mỗi object trong Java có header gồm:
  - Mark Word: chứa thông tin về trạng thái lock (lock flag, hashcode, age…).
  - Monitor (liên kết ngoài): có các trường:
    - Owner: thread nào đang giữ lock.
    - Entry List: danh sách thread đang chờ lấy lock.
    - Wait Set: danh sách thread đang wait() trên lock này.

#### Entry List

- Khi nào vào Entry List:
  - Một thread gọi `monitorenter(lock)` nhưng lock đã bị thread khác giữ → JVM đưa thread này vào Entry List của lock.
- Khi nào thoát Entry List
  - Khi thread đang giữ lock (Owner) gọi `monitorexit(lock)`, JVM sẽ:
    - Chọn một thread trong Entry List (theo thuật toán – thường không đảm bảo fairness). khắc chác là thread vào entry-lock trước sẽ cướp được khóa trước
    - Di chuyển thread đó từ Entry List → Running state và cho nó acquire lock.
  - Không cần notify/notifyAll; việc nhả lock là đủ để kích hoạt.

#### Wait Set

- Khi nào vào Wait Set
  - Chỉ khi thread đang giữ lock gọi wait() trên chính lock đó:
    - VM thả lock (giống monitorexit tạm thời).
    - Thread chuyển vào Wait Set của lock → block hoàn toàn.
- Chỉ khi có thread khác đang giữ cùng lock gọi notify() hoặc notifyAll():
- JVM sẽ chuyển thread từ Wait Set → Entry List (chứ chưa chạy ngay).
- Thread phải tranh giành lại lock như bình thường trong Entry List trước khi chạy tiếp.

### Nguyên lý synchronized trong JMM

```java
synchronized (lock) {
    // critical section
}
```

- JVM sẽ thực hiện hai hành động đặc biệt:
  - Monitor Enter (lấy lock)
    - Xảy ra khi thread vào vùng synchronized.
    - Đây là acquire semantics:
      - Chặn reorder của các lệnh sau nó nhảy lên trước.
      - Buộc đọc dữ liệu mới nhất của các biến mà thread khác đã publish khi nhả cùng lock.
- Monitor Exit (nhả lock)
  - Xảy ra khi thread ra khỏi vùng synchronized (kể cả do return hay exception).
  - Đây là release semantics:
    - Chặn reorder của các lệnh trước nó bị đẩy xuống sau.
    - Flush toàn bộ ghi của thread hiện tại ra main memory để thread khác thấy.
- JVM chặn ko có 2 thread cùng truy cập lock của object lock nên ko có 2 thread cùng chạy vào cùng 1 critical section của 1 lock
- Tất cả các biến đọc/ghi trong vung lock sẽ
  - Khi thoát lock sẽ được publish ra main memory
  - Khi vào lock sẽ load lại giá trị mới từ main memory

```java
final Object lock = new Object();
int data = 0;

Thread t1 = new Thread(() -> {
    synchronized (lock) {  // Monitor Enter (acquire)
        data = 42;         // ghi dữ liệu
    }                      // Monitor Exit (release)
});

Thread t2 = new Thread(() -> {
    synchronized (lock) {  // Monitor Enter (acquire)
        System.out.println(data); // luôn thấy 42
    }                      // Monitor Exit (release)
});

```

### Barrier mà JVM chèn

| Hành động     | Barrier chèn                     |
| ------------- | -------------------------------- |
| Monitor Enter | LoadLoad + LoadStore (acquire)   |
| Monitor Exit  | StoreStore + StoreLoad (release) |

### Mutual Exclusion

- Tính chất đảm bảo chỉ một thread được chạy trong critical section (vùng synchronized trên cùng một lock object) tại một thời điểm.
- Cơ chế trong Java:
  - monitorenter (Acquire): lấy lock → nếu lock bận, thread vào Entry List.
  - monitorexit (Release): nhả lock → chọn thread từ Entry List để cấp lock.
- Tác dụng:
  - Ngăn race condition khi nhiều thread truy cập tài nguyên chung.
  - Cho phép nhiều thao tác liên quan chạy như một khối atomic.
- Giới hạn:
  - Mutual exclusion chỉ có ý nghĩa trên cùng lock object.
  - Không tự đảm bảo fairness (không FIFO): các thread ko đảm bảo là run theo thứ tự khi ở trong entry set
  - Không tận dụng đa core cho cùng lock.

### Happens-Before edges trong synchronized

- Release semantics khi unlock: Tất cả write của thread bên trong critical section phải được flush ra main memory trước khi nhả lock.
- Acquire semantics khi lock: Thread vào critical section sẽ thấy mọi giá trị đã được publish bởi thread vừa nhả lock.

### Vậy có thể kết luận với Barrier (chánh reorder) thì giải quyết được data race còn Mutual Exclusion (lock object) sẽ giải quyết được Race condition?

| Cơ chế                           | Mục tiêu chính                | Có xử lý data race?                           | Có xử lý race condition logic phức tạp?               |
| -------------------------------- | ----------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| **Memory barrier**               | Đảm bảo visibility + ordering | ✅ Có (loại bỏ data race về memory semantics) | ❌ Không (chỉ đồng bộ, không chặn truy cập đồng thời) |
| **Lock object (`synchronized`)** | Mutual exclusion + tạo HB     | ✅ Có (vì lock tạo HB edges)                  | ✅ Có (vì loại bỏ truy cập đồng thời → logic an toàn) |

## Final Field Semantics & Safe Publication Patterns

### Vấn đề visibility của object bình thường

- Khi bạn tạo một object, các thread khác không được đảm bảo sẽ thấy trạng thái mới nhất ngay lập tức nếu object đó được chia sẻ.
- Lý do: constructor có thể chưa hoàn tất ghi ra main memory khi reference bị chia sẻ.

```java
class Data {
    int x;
    Data() { x = 42; }
}
// Nếu một thread thấy reference Data trước khi constructor hoàn tất → có thể đọc x = 0.
```

### Final field semantics

- JMM định nghĩa một đặc điểm:
  > Các trường final được gán trị trong constructor và không bị thay đổi sau đó sẽ luôn được các thread khác thấy đúng giá trị, miễn là this không bị leak ra ngoài trong constructor.

```java
class Box {
    final int v;
    Box(int x) {
        v = x;               // (store final)
        // [StoreStore barrier]  <-- JVM/JIT coi như ở đây
    }
}
```

- Nói nôm na: “set xong final đã, rồi mới cho người khác thấy cái object này”. trước khi các biến final được khởi tạo xong thì chưa tạo refrence cho object

### Safe Publication Patterns

- Safe publication = đảm bảo rằng khi một thread thấy reference của object, nó cũng thấy toàn bộ trạng thái nội tại của object đó.

```java
public class Config {
    static final Settings SETTINGS = new Settings(...);
    // Static initializer được thực thi trong một thread khi class load, và JMM đảm bảo visibility cho các thread khác.
}
```

```java
volatile Settings settings;
// Ghi vào volatile → create HB edge → các thread khác đọc thấy version mới.
```

```java
synchronized void set(Settings s) { this.settings = s; }
synchronized Settings get() { return settings; }
// Lock đảm bảo HB cho cả read/write.
```

```java
class SettingsHolder {
    final Settings settings;
    SettingsHolder(Settings s) { this.settings = s; }
}
// Bất biến sau khi tạo → publish reference an toàn qua final/static/volatile.
```

```java
Map<String, String> map = new ConcurrentHashMap<>();
// Thêm object vào concurrent map → đảm bảo visibility.
```

```java
//  Không an toàn
class Unsafe {
    int value; // không final
    Unsafe() { value = 42; }
}

Unsafe shared;

Thread t1 = new Thread(() -> shared = new Unsafe());
Thread t2 = new Thread(() -> {
    if (shared != null) System.out.println(shared.value); // có thể in 0
});
```

## Data race vs. race condition; benign vs. harmful races

### Data race (theo JMM)

- Xảy ra khi hai (hoặc nhiều) thread truy cập cùng một biến, ít nhất một là write, và không có happens-before giữa các truy cập đó.
- Thread đọc có thể ko thấy được dữ liệu của thread ghi

```java
int x = 0;          // biến thường
boolean ready = false;

void writer() {
    x = 42;         // write 1
    ready = true;   // write 2 (không volatile, không sync)
}

void reader() {
    if (ready) {               // read 1
        System.out.println(x); // read 2 → có thể in 0 (reorder/visibility)
    }
}

// Fix: volatile boolean ready hoặc bọc bằng synchronized/công cụ concurrent.
```

### Race condition (rộng hơn)

- Kết quả logic phụ thuộc vào thứ tự thực thi giữa các thread.
- Bao trùm cả data race và các tình huống logic-phối-hợp khác (kể cả khi đã có visibility nhưng thiếu mutual exclusion).
  > Mọi data race đều là race condition, nhưng race condition không nhất thiết là data race (vd: check-then-act không khoá).

```java
volatile int counter = 0;

void inc() {
    counter++;   // read-modify-write, không atomic → lost update
}
// AtomicInteger.incrementAndGet() hoặc synchronized.
```

### Benign vs. Harmful races

- Các cấp hậu quả
- `Benign race` (race lành tính):

```java
// Ghi log best-effort, chấp nhận trùng thứ tự/thiếu vài dòng
logger.debug("tick=" + tick);
// đọc một biến chỉ để hint tối ưu hoá (vd: heuristic), sai số nhỏ chấp nhận được.
```

- `Harmful race` (race gây hại):
  - Làm sai kết quả, vi phạm bất biến, crash, NPE, security bug…
- Trong một số trường hợp hoàn toàn có thể chấp nhận `race` cần đánh giá. Giải quyết race cần đánh đổi về performance

### DLC - Double-Checked Locking

```java
class Singleton {
    private static volatile Singleton instance; // volatile rất quan trọng

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {                // check 1
            synchronized (Singleton.class) {
                if (instance == null) {        // check 2
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}

```

- Chỉ tạo object một lần duy nhất khi cần (lazy init).
- Dùng synchronized để đảm bảo an toàn, nhưng tránh synchronized mỗi lần gọi hàm getter.
- Check lần 1 (bên ngoài synchronized) → nếu object chưa tạo thì mới vào synchronized.
- Check lần 2 (bên trong synchronized) → nếu vẫn chưa tạo thì mới new object.

#### Vì sao tránh synchronized ở mọi lần gọi?

- Chi phí monitor: Mỗi lần vào/ra synchronized JVM phải làm monitor-enter/exit (dù có optimize như biased/ thin lock). Khi gọi getter cực kỳ thường xuyên, chi phí này tích lũy đáng kể, nhất là khi không còn tranh chấp khóa (đọc nhiều, viết 0 lần sau khi init).
- Rào bộ nhớ (fence): synchronized chèn acquire/release barrier. Những barrier này đắt hơn một volatile read đơn giản (đặc biệt trên kiến trúc ARM).

```java
class Singleton {
  private static volatile Singleton INSTANCE;

  private Singleton() {}

  public static Singleton getInstance() {
    if (INSTANCE == null) {                 // fast path: đa số lượt gọi
      synchronized (Singleton.class) {
        if (INSTANCE == null) {
          INSTANCE = new Singleton();       // chỉ lock đúng 1 lần
        }
      }
    }
    return INSTANCE;                        // không lock ở các lượt gọi sau
  }
}
```

#### Vì sao cần volatile?

- Không có volatile, CPU/JIT có thể reorder việc:
- Thread khác có thể thấy instance != null nhưng object chưa init xong → đọc ra field mặc định (0, null…).

## CAS, Atomic\*, VarHandle, StampedLock

### Atomic

- Trong lập trình đa luồng, một thao tác atomic nghĩa là:
  - Nguyên tử: Hoặc thực hiện trọn vẹn, hoặc không thực hiện gì cả.
  - Không bị “xen ngang” bởi thread khác trong quá trình thực hiện.
  - Đảm bảo atomicity + visibility (thấy được giá trị mới nhất ngay lập tức).
  - Tất cả Atomic\* đều dùng CAS (Compare-And-Set) ở mức CPU.

### CAS - Compare-And-Set

- Compare-And-Set (hoặc Compare-And-Swap) là một primitive được CPU hỗ trợ để cập nhật dữ liệu theo điều kiện nguyên tử (atomic).

```java
CAS(address, expectedValue, newValue)

// Đọc giá trị tại address.
// Nếu giá trị này bằng expectedValue → ghi newValue vào.
// Nếu khác → không làm gì cả.
// Trả về thành công hay thất bại.

// Code trong javaAtomicInteger count = new AtomicInteger(0);

void increment() {
    int oldVal, newVal;
    do {
        oldVal = count.get();      // đọc giá trị hiện tại
        newVal = oldVal + 1;       // tính giá trị mới
        // CAS: nếu count vẫn == oldVal thì đổi thành newVal
    } while (!count.compareAndSet(oldVal, newVal));
}
// nếu gia trị cũ vẫn bằng count thì set bằng new value
// nếu giá trị chủa có sự thay đổi
```

| Đặc điểm   | CAS                             | Lock                            |
| ---------- | ------------------------------- | ------------------------------- |
| Blocking   | ❌ Không block                  | ✅ Block thread thua            |
| Deadlock   | ❌ Không                        | ✅ Có thể nếu lock sai          |
| Starvation | ❌ Có thể (retry vô hạn)        | ✅ Có thể (ưu tiên lock khác)   |
| Overhead   | Thấp nếu contention thấp        | Cao hơn (kernel + monitor mgmt) |
| Semantics  | Atomic update + acquire-release | Mutual exclusion + HB mạnh      |

#### Vì sao CAS loại ko bị race condition

- Nếu như trong ví dụ trên ta hoàn có thể nghĩ rằng nó đọc giá trị của count rồi compare rồi set. hoàn toàn có khả năng 2 thread cùng làm các bươc trên và đến bước set thì sẽ set các giá trị khác nhau -> `RACE CONDITION`
- Nhưng ko khi sử dụng CAS thì `read → compare → write` nó chỉ có 1 action duy nhất được hỗ trợ ở tâng CPU nên ko bị race condition như trên
  - T1: đọc 0 → tính 1
  - T2: đọc 0 → tính 1
  - T1: CAS(0→1) ✅ thành công → count = 1
  - T2: CAS(0→1) ❌ thất bại (vì giờ đã là 1) → lặp lại
  - T2: đọc 1 → tính 2 → CAS(1→2) ✅ → count = 2
- Atomic\*
  - Bên trong AtomicInteger, giá trị được lưu trong một field volatile; đảm bảo visibility & ordering (đọc luôn thấy mới nhất, không bị reordering nguy hiểm).
  - Cập nhật bằng CAS (compare-and-set) → đảm bảo atomicity (nguyên tử), không cần khóa.
  - Chính CAS mới là thứ chặn race condition khi cập nhật; volatile một mình thì không đủ.

### Atomic\*

#### Contention

- Contention trong lập trình đa luồng nghĩa là mức độ tranh chấp giữa các thread khi cùng truy cập một tài nguyên chung (ví dụ biến AtomicInteger).
- `Contention thấp`
  - Ít thread truy cập cùng lúc.
  - Xác suất 2 thread đụng nhau cùng một thời điểm rất thấp.
  - CAS gần như luôn thành công ngay lần đầu → ít vòng lặp retry.
  - Có 4 thread, mỗi thread increment một biến counter 1 lần/giây. Xác suất cùng increment trong đúng vài nano/micro giây là nhỏ.
- `Contention vừa`
  - Vẫn có nhiều lần CAS thất bại, nhưng chưa tới mức loop liên tục quá tốn CPU.
  - Có thể chịu được chi phí retry của CAS.
  - Throughput giảm một chút nhưng chưa nghiêm trọng.
  - 10–20 thread increment một biến khoảng vài trăm ngàn lần/giây, nhưng thời điểm update vẫn chưa trùng quá nhiều.
- `Contention cao`
  - Nhiều thread liên tục muốn cập nhật biến đó → CAS fail liên tục.
  - CPU phải spin-loop nhiều lần mới thành công → tốn tài nguyên, latency tăng.
  - Lúc này AtomicInteger không hiệu quả → nên dùng LongAdder hoặc sharding counter.
  - 50–100 thread increment một biến hàng triệu lần/giây (vd: đếm request trong high-QPS API) → CAS thua liên tục.

#### Bên trong Atomic\* hoạt động thế nào

- Mỗi Atomic\* giữ một field volatile (ví dụ volatile int value).
- Các phép cập nhật dùng CAS (Compare-And-Set) nguyên tử ở mức CPU (x86: cmpxchg, ARM: ldxr/stxr).
- Phần lớn API là “CAS loop”:

```java
int prev, next;
do {
  prev = ai.get();       // volatile read
  next = prev + 1;       // tính giá trị mới
} while (!ai.compareAndSet(prev, next)); // CAS, thua thì lặp
// Nhờ CAS, không cần lock: thread thua không block, chỉ retry.
```

#### AtomicInteger, AtomicLong, AtomicBoolean

- Dùng khi: counter/flag đơn giản, contention thấp–vừa, cần giá trị chính xác mỗi lần đọc.

```java
inc: incrementAndGet()/getAndIncrement()
// tăng trước 1, trả về giá trị mới / trả về giá trị cũ, rồi mới tăng 1
add: addAndGet(delta)
// Tăng thêm delta (âm/dương đều được) và trả giá trị mới.
swap: getAndSet(v)
// getAndSet(v)
CAS: compareAndSet(exp, upd)
// Chỉ ghi update nếu giá trị hiện tại == expected (nguyên tử). Trả true/false.
update: getAndUpdate(fn), accumulateAndGet(x, fn)
```

- Ưu: đơn giản, chính xác, không block.
- Nhược: dưới contention cao có thể spin nhiều (retry CAS).

#### LongAdder / LongAccumulator

- Vấn đề của AtomicLong khi contention cao
  - AtomicLong.incrementAndGet() bên trong thực chất là CAS loop trên một biến duy nhất

```java
do {
    oldValue = value;          // volatile read
    newValue = oldValue + 1;
} while (!CAS(value, oldValue, newValue));

```

- Khi rất nhiều thread cùng increment:
  - Tất cả đọc cùng một giá trị.
  - Chỉ một thread CAS thành công, các thread còn lại fail → phải retry.
  - Càng nhiều thread, tỷ lệ CAS fail càng cao → tốn CPU để spin.
- Ý tưởng của `LongAdder`
  - `LongAdder` chia bộ đếm thành nhiều ô nhỏ (cell), mỗi cell là một volatile long cũng được cập nhật bằng CAS.
  - Mỗi thread khi increment sẽ chọn một cell riêng (thường dựa vào thread hash).
  - Khi không tranh chấp → thread chỉ update cell của mình.
  - Khi cần tổng → sum() cộng tất cả các cell + base (ô gốc ban đầu).

```java
LongAdder:
  base    (volatile long)      // dùng khi contention thấp
  cells[] (array of Cell)      // mỗi cell có volatile long value
  // Nếu CAS trên base fail nhiều lần → LongAdder mở rộng cells[].
  // Mỗi cell được chọn bằng (threadHash & (cells.length-1)).
  // Increment = CAS trực tiếp vào cell đó, không đụng cell của thread khác
```

- Minh họa `AtomicLong`

```java
T1: CAS(base)
T2: CAS(base) ✗ fail → retry
T3: CAS(base) ✗ fail → retry
T4: CAS(base) ✗ fail → retry
```

- Minh họa `LongAdder`

```java
T1: CAS(cell[0]) ✓
T2: CAS(cell[1]) ✓
T3: CAS(cell[2]) ✓
T4: CAS(cell[3]) ✓

```

- Ưu: throughput cao hơn AtomicLong khi contention lớn.
- Nhược: sum() không đồng bộ với cập nhật đang diễn ra; nếu bạn cần “ảnh chụp chính xác tại một điểm”, AtomicLong phù hợp hơn.

#### AtomicReference<T>

- Giữ một tham chiếu (reference) volatile tới T.
- Cập nhật bằng CAS (compare-and-set) để đổi cả object “một phát” một cách nguyên tử, không cần lock.
- Quan trọng: compareAndSet(expected, update) so sánh theo tham chiếu (==), không dùng equals().
- Có thể bị ABA problem tìm hiểu thêm

```java
enum State { NEW, RUNNING, STOPPED }

class Service {
  private final AtomicReference<State> st = new AtomicReference<>(State.NEW);

  boolean start() {                       // NEW -> RUNNING (một lần)
    return st.compareAndSet(State.NEW, State.RUNNING);
  }

  boolean stop() {                        // RUNNING -> STOPPED
    return st.compareAndSet(State.RUNNING, State.STOPPED);
  }

  State state() { return st.get(); }
}
```

#### Chống ABA: AtomicStampedReference<T>, AtomicMarkableReference<T>

- Tìm hiểu thêm

#### Mảng & Updater

- `AtomicIntegerArray/LongArray/ReferenceArray`: atomics theo phần tử mảng.
- `Atomic\*FieldUpdater`: Cập nhật trực tiếp field của object (không cần bọc Atomic\*), tiết kiệm bộ nhớ. Yêu cầu field là volatile, không final, và access hợp lệ.
- Tìm hiểu thêm

#### Pitfalls (bẫy) & mẹo hiệu năng

- volatile int x; x++; vẫn sai: x++ là 3 bước (read-modify-write) → lost update; dùng AtomicInteger.incrementAndGet().
- `Spurious failure`: weakCompareAndSet\* có thể fail ngẫu nhiên → luôn đặt trong vòng lặp (CAS loop)
- `ABA`: dùng Stamped/Markable hoặc thêm version.
- `False sharing`: nhiều counter nằm chung cache line → nhiễu nhau. Tránh bằng:
  - Dùng LongAdder (đã sharded),
  - Hoặc tách/padding, @Contended (cần bật -XX:-RestrictContended), hoặc đặt dữ liệu cách xa.
- sum() của LongAdder: không phải “điểm thời gian nguyên tử” với cập nhật đang diễn ra; nếu snapshot chính xác là bắt buộc → dùng AtomicLong.

## Xây dựng thread-safe classes: immutability, confinement, defensive copies

### Thread-safe class

- lớp an toàn luồng) là lớp mà mọi phương thức của nó có thể được gọi đồng thời từ nhiều thread mà không phá vỡ bất kỳ bất biến (invariant) nào của lớp, và kết quả quan sát được hợp lệ theo JMM (đúng về atomicity/visibility/ordering) — không yêu cầu người gọi phải tự đồng bộ (trừ khi tài liệu của lớp nói rõ).
- Khi nào gọi là “thread-safe”?
  - Không có data race gây hỏng bất biến.
  - Visibility đảm bảo: thay đổi của thread A nhìn thấy ở thread B theo HB (happens-before).
  - Atomicity đúng ngữ nghĩa: các thao tác phức hợp (check-then-act, read-modify-write) được bảo vệ.
  - Liveness hợp lý: tránh deadlock/livelock/starvation trong thiết kế thường gặp.

#### Các mức “an toàn” thường gặp

- Immutable / Stateless
  - Không có trạng thái thay đổi → tự nhiên thread-safe.
  - Ví dụ: String, LocalDate, value object với toàn final.
- Thread-safe (fully)
  - Mọi thao tác công khai là atomic & visible; lớp tự lo đồng bộ (lock/CAS).
  - Ví dụ: ConcurrentHashMap, AtomicInteger.
- Conditionally thread-safe
  - Một số thao tác riêng lẻ là an toàn, nhưng các chuỗi thao tác cần khóa ngoài.
  - Ví dụ: Collections.synchronizedList cho list.get()/list.add() thì OK, nhưng duyệt + sửa cần synchronized bên ngoài.

#### Cách xây dựng class thread-safe

- Immutability (bất biến)
  - Mục tiêu: tạo object không đổi sau khi khởi tạo ⇒ không cần đồng bộ, không có race.
  - Cách làm
    - Tất cả field là private final.
    - Không để this “escape” trong constructor (đừng đăng ký listener, start thread, hoặc truyền this ra ngoài).
    - Không expose tham chiếu tới cấu trúc mutable (mảng, List, Map) — nếu cần, sao chép/bao (unmodifiable).
    - Ưu tiên record/value object
- Confinement (giới hạn phạm vi)
  - Mục tiêu: không chia sẻ state ⇒ không cần lock.
- Defensive copies (bản sao phòng thủ)
  - Mục tiêu: không để caller/chỗ khác thay đổi state nội bộ (và ngược lại).
  - Cách làm
    - Copy vào khi nhận dữ liệu mutable từ ngoài.
    - Copy ra khi trả về cấu trúc mutable; hoặc trả Collections.unmodifiableXxx.
    - Với object lồng nhau → cân nhắc deep copy.
  ```java
  public final class SafeRange {
    private final int[] range;
    public SafeRange(int[] range) {
      this.range = range.clone();
    } // copy in
    public int[] range() {
      return range.clone(); // copy out
    }
  }
  ```
- CAS / Atomic / VarHandle (khi thao tác một biến)
  - Mục tiêu: thao tác atomic, không lock, cho một biến/trạng thái đơn giản.
  - Khi dùng
    - Bộ đếm/flag/state nhỏ: AtomicLong, AtomicReference, LongAdder (nhiều thread tăng giảm, giảm contention).
    - Truy cập field cụ thể hoặc cần mức ordering linh hoạt → VarHandle.
    - Mảng atomic: AtomicIntegerArray, hoặc VarHandle cho array.
- Đồng bộ “đúng chỗ” (synchronized/Lock/StampedLock/RWLock)
  - Tìm hiểu thêm

## Happens-before trong java.util.concurrent.

- Là tập hợp các công cụ đồng bộ hóa
- Tạo ranh giới happens-before (HB): bảo đảm thấy được các thay đổi của thread A ở thread B theo đúng thứ tự.
- Bảo đảm visibility & ordering (thấy dữ liệu “đã dựng xong”), không đảm bảo khi nào chạy hay chạy bao lâu.
- Nhiều thành phần còn cung cấp atomicity cho thao tác đơn lẻ (VD: CAS của Atomic/VarHandle) hoặc theo key (VD: computeIfAbsent của ConcurrentHashMap).

### HB - happens-before

- HB = rào chắn ở mức ngôn ngữ: đảm bảo ordering/visibility giữa các thread.
- Bạn tạo HB bằng primitive: volatile, synchronized/Lock, Atomic/VarHandle (acquire/release/volatile), Future.get(), BlockingQueue.put/take,
- JIT lo barrier thật (fence/CAS) phía dưới; bạn không cần (và không thể) gọi fence thấp tầng.

#### Executor / Future / CompletableFuture / FutureTask

- Mọi hành động trước khi submit một task (executor.submit(r)) happens-before các hành động bên trong task khi nó bắt đầu chạy.
- Mọi hành động bên trong task trước khi hoàn thành (kể cả ném exception) happens-before:
  - Future.get() trả về/ném exception tương ứng.
  - Hoàn thành CompletableFuture liên quan (complete, completeExceptionally, chuỗi then…).

```java
ExecutorService ex = Executors.newSingleThreadExecutor();
List<String> data = List.of("a", "b"); // chuẩn bị trước submit
Future<Integer> f = ex.submit(() -> {         // actions trước submit HB actions ở đây
    return data.size();
});
Integer n = f.get();                          // actions trong task HB sau get()
```

#### BlockingQueue / Concurrent collections (CHM, CLQ, …)

- Mọi hành động trước khi đặt phần tử vào collection concurrent HB mọi hành động sau khi một thread khác lấy/truy cập phần tử đó.
- Với BlockingQueue: put HB take tương ứng (và offer HB poll khi trả về phần tử đó).
- Với SynchronousQueue: mỗi put/take là một “bắt tay” → publish an toàn theo cặp.

```java
BlockingQueue<Task> q = new LinkedBlockingQueue<>();
// Producer
q.put(new Task(cfg));     // mọi write tới cfg trước put HB với consumer
// Consumer
Task t = q.take();        // thấy cấu hình đã publish đầy đủ
```

#### ConcurrentHashMap (đặc thù)

- put/replace/compute/merge publish giá trị: write trước khi put HB read sau khi get/computeIfAbsent/remove của cùng key.
- Các phép compute\*/merge là atomic compound cho riêng từng key.

#### Atomic\* / VarHandle (JAVA9) (volatile & atomic)

#### Lock / ReentrantLock / ReentrantReadWriteLock

- Khi tìm hiểu về `synchronized` ta biết về `critical section` nó được xác định ở vị trí đặt `synchronized` cũng như monitor lock object.
- Với `Lock` inteface nó cho phép linh hoạt xác định `critical section`. linh hoạt hơn về thời gian lock, ngắt lock, condition
- Ngăn nhiều thread truy cập cùng lúc vào critical section (vùng găng) làm hỏng dữ liệu chung.
- Đảm bảo mutual exclusion (chỉ 1 thread được vào) và visibility (thread sau thấy được thay đổi của thread trước).
- Giống synchronized, nhưng linh hoạt hơn:
  - Có thể lock/unlock ở các vị trí khác nhau (không bắt buộc theo block).
  - Cho phép timeout, thử lock mà không chờ (tryLock()).
  - Có thể bị ngắt khi đang chờ (lockInterruptibly()).
  - Có nhiều Condition khác nhau cho việc chờ/tín hiệu.
- Một điểm khác biệt lớn giữa `Lock` và `Synchronized`
  - với `Synchronized` các thread được khi require lock được quản lý trong `Entry Set` và `Wait Set` của object monitor. Và ko đảm bảo FAIR
  - Còn với `Lock` thì dựa trên AQS (AbstractQueuedSynchronizer). có hàng đợi FIFO (kiểu CLH) cho các thread thất bại khi acquire:
  - Bời vì ko làm việc trên object monitor lock nên nó cũng `Lock` cũng ko thể sử dụng các API như `wait() / notify() / notifyAll()`. Nó sử dụng `Condition.await(), Condition.signal(), Condition.signalAll()`
- `ReentrantLock` và `ReentrantReadWriteLock` là 2 impl của `Lock`
  - Điểm chung là `reentrant` cho phép chiến lock hay unlock nhiều lần gọi lock() 2 lần ,...
  - có Condition để quản lý lock
- `ReentrantLock`
- Sử dụng AbstractQueuedSynchronizer (AQS):
  - Có một biến state:
    - `= 0`→ lock rảnh.
    - `> 0` → lock đang bị giữ.
  - Khi thread gọi lock():
    - Nếu state == 0 → set state = 1, gán owner = thread đó.
    - Nếu state > 0 và owner là thread hiện tại → tăng state (reentrant count).
    - Nếu state > 0 và owner là thread khác → thread vào sync queue và bị park().
  - Khi unlock():
    - Giảm state.
    - Nếu state == 0 → owner = null, đánh thức thread kế tiếp trong queue.

```java
import java.util.concurrent.locks.*;

public class ReentrantLockExample {
    private final Lock lock = new ReentrantLock();
    private int counter = 0;

    public void increment() {
        lock.lock();
        try {
            counter++;
            System.out.println(Thread.currentThread().getName() + " tăng counter = " + counter);
        } finally {
            lock.unlock();
        }
    }

    public static void main(String[] args) {
        ReentrantLockExample ex = new ReentrantLockExample();
        Runnable task = () -> {
            for (int i = 0; i < 3; i++) {
                ex.increment();
            }
        };
        new Thread(task, "Thread-A").start();
        new Thread(task, "Thread-B").start();
    }
}
```

- `ReentrantReadWriteLock`
  - Tối ưu cho đọc nhiều – ghi ít
  - Nhiều thread có thể giữ read lock cùng lúc.
  - Chỉ 1 thread được giữ write lock, và khi có writer → chặn toàn bộ reader khác.
  - Cũng dùng AQS, nhưng quản lý bằng bit trong state:
    - Phần high: số lượng reader.
    - Phần low: số lượng write lock (thường là 0 hoặc 1).
  - ReadLock:
    - Cho phép nhiều thread vào nếu không có writer.
    - Tăng reader count.
  - WriteLock:
    - Độc quyền, chỉ cho vào khi reader count == 0 và không có writer khác.
    - Có thể reentrant cho cùng thread.
  - Trong TH có nhiều readlock và có 1 writelock vào thì thường readlock sẽ ko nhận thêm vào queue và sẽ cho run hết trong readlock để chánh writelock bị đói (UNFAIR - Thường ưu tiên Writelocl)
  - có thể setup FAIR (Lock nào vào trước chạy trước - nhả khóa cho trước)

```java
import java.util.concurrent.locks.*;

public class ReentrantReadWriteLockExample {
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final Lock readLock = rwLock.readLock();
    private final Lock writeLock = rwLock.writeLock();
    private int value = 0;

    public void readValue() {
        readLock.lock();
        try {
            System.out.println(Thread.currentThread().getName() + " đọc value = " + value);
        } finally {
            readLock.unlock();
        }
    }

    public void writeValue(int newValue) {
        writeLock.lock();
        try {
            System.out.println(Thread.currentThread().getName() + " ghi value = " + newValue);
            value = newValue;
        } finally {
            writeLock.unlock();
        }
    }

    public static void main(String[] args) {
        ReentrantReadWriteLockExample ex = new ReentrantReadWriteLockExample();

        // Thread đọc
        Runnable readTask = () -> {
            for (int i = 0; i < 3; i++) {
                ex.readValue();
                try { Thread.sleep(100); } catch (InterruptedException ignored) {}
            }
        };

        // Thread ghi
        Runnable writeTask = () -> {
            for (int i = 0; i < 3; i++) {
                ex.writeValue(i);
                try { Thread.sleep(150); } catch (InterruptedException ignored) {}
            }
        };

        new Thread(readTask, "Reader-1").start();
        new Thread(readTask, "Reader-2").start();
        new Thread(writeTask, "Writer").start();
    }
}
```

- So sánh `ReentrantLock` vs `ReentrantReadWriteLock`
  | Tiêu chí | ReentrantLock | ReentrantReadWriteLock |
  | ------------- | ------------------------- | ------------------------- |
  | Tái nhập | Có | Có (cho cả read và write) |
  | Song song đọc | Không | Có |
  | Độc quyền ghi | Có | Có |
  | Condition | Nhiều condition | Chỉ cho write lock |
  | Use case | Bảo vệ vùng găng đơn giản | Đọc nhiều – ghi ít |
- Condition
  - Là một interface trong java.util.concurrent.locks được tạo ra từ Lock (ví dụ ReentrantLock.newCondition()).
  - Tương tự như wait() / notify() / notifyAll() của synchronized nhưng:
    - Không gắn cứng vào object monitor.
    - Mỗi lock có thể tạo nhiều Condition để quản lý nhiều hàng chờ khác nhau.
    - Cho phép điều kiện chờ tách biệt → dễ đọc và tránh thức dậy không cần thiết.
- Cơ chế hoạt động Condition bên trong (AQS)
  - Khi thread gọi Condition.await():
    - Nó rời hàng đợi chính của lock (sync queue).
    - Chuyển sang condition queue của Condition đó.
    - Nhả lock (giảm state về 0) → cho thread khác vào critical section.
    - Thread bị park() (chờ).
  - Khi thread khác gọi signal():
    - Chọn 1 thread trong condition queue → chuyển lại vào sync queue.
    - Khi lock rảnh, thread đó acquire lại lock rồi mới tiếp tục chạy từ điểm await().
  - Khi gọi signalAll():
    -Tất cả thread trong condition queue được đưa lại vào sync queue.

```java
import java.util.LinkedList;
import java.util.Queue;
import java.util.concurrent.locks.*;

public class ConditionExample<E> {
    private final Queue<E> queue = new LinkedList<>();
    private final int capacity;
    private final Lock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    public ConditionExample(int capacity) {
        this.capacity = capacity;
    }

    public void put(E item) throws InterruptedException {
        lock.lock();
        try {
            while (queue.size() == capacity) {
                notFull.await(); // nhả lock, chờ notFull.signal()
            }
            queue.add(item);
            System.out.println(Thread.currentThread().getName() + " put " + item);
            notEmpty.signal(); // báo cho consumer là đã có dữ liệu
        } finally {
            lock.unlock();
        }
    }

    public E take() throws InterruptedException {
        lock.lock();
        try {
            while (queue.isEmpty()) {
                notEmpty.await(); // nhả lock, chờ notEmpty.signal()
            }
            E item = queue.poll();
            System.out.println(Thread.currentThread().getName() + " took " + item);
            notFull.signal(); // báo cho producer là đã có chỗ trống
            return item;
        } finally {
            lock.unlock();
        }
    }

    public static void main(String[] args) {
        ConditionExample<Integer> buffer = new ConditionExample<>(2);

        Runnable producer = () -> {
            for (int i = 0; i < 5; i++) {
                try {
                    buffer.put(i);
                    Thread.sleep(100);
                } catch (InterruptedException ignored) {}
            }
        };

        Runnable consumer = () -> {
            for (int i = 0; i < 5; i++) {
                try {
                    buffer.take();
                    Thread.sleep(150);
                } catch (InterruptedException ignored) {}
            }
        };

        new Thread(producer, "Producer").start();
        new Thread(consumer, "Consumer").start();
    }
}
// Yêu cầu: Tạo 1 queue cho phép truyền vòa capacity. Nếu full thì ko cho thêm vào.
```

#### StampedLock (JAVA 8)

- Khác với `ReentrantLock` và `ReentrantReadWriteLock` thì `StampedLock` không extend từ lock
- không có `reentrant`. kho có Condition
- Có thêm chế độ đọc lạc quan (optimistic read).
- Về căn bản ngoài việc ko có `reentrant` và `condition` thì writeLock() và readLock() trong `StampedLock` giống với `RRWL` chỉ khác là mặc định UNFAIR (ưu tiên writeLock) còn `RRWL` có thể chọn FAIR hay ko FAIR
- Có 3 chế độ
  - Write lock – độc quyền, chặn mọi reader/writer khác.
  - Read lock – nhiều reader cùng lúc nếu không có writer.
  - Optimistic read – không khóa; đọc “liều”, sau đó phải validate(stamp). Nếu có writer chen vào giữa, validate sẽ fail → phải đọc lại bằng read lock.
- Mỗi lần lock, bạn nhận về một stamp (long) → dùng để unlock hoặc validate.
- Cách nó hoạt động bên trong
  - Bên trong StampedLock có:
    - State (biến số nguyên 64-bit chưa 3 thông tin):
      - Số reader hiện tại
      - Bit cờ writer. (1 | 0 . 1 là đang có write)
      - Version:
    - Queue: nếu không lấy được lock, thread sẽ bị park trong hàng đợi (giống AQS nhưng tối ưu riêng cho read/write).
    - Stamp: mã hóa thông tin state + “phiên bản” (version).
  - Khi acquire lock
    - Write lock (writeLock())
      - Kiểm tra: không có writer, không có reader → set cờ writer = 1.
      - Nếu có ai đang giữ read/write → thread bị park vào queue, chờ được đánh thức.
    - Read lock (readLock())
      - Nếu không có writer → tăng bộ đếm reader.
      - Nếu có writer → park vào queue, chờ writer xong.
    - Optimistic read (tryOptimisticRead())
      - Không thay đổi state, chỉ đọc giá trị version hiện tại và trả về stamp.
      - Stamp này sau dùng với validate(stamp) để kiểm tra trong lúc mình đọc có writer chen vào không.
  - Khi release lock
    - unlockWrite(stamp): xóa cờ writer, tăng version, đánh thức các thread chờ (ưu tiên writer chờ lâu nhất, rồi reader).
    - unlockRead(stamp): giảm bộ đếm reader, nếu về 0 → đánh thức writer đầu hàng đợi.

```java
double sum() {
  long s = sl.tryOptimisticRead();     // 1) lấy stamp
  int lx = x, ly = y;                  // 2) đọc tất cả vào local
  if (!sl.validate(s)) {               // 3) có writer chen vào trong cửa sổ đọc?
    s = sl.readLock();                 //    -> có: fallback an toàn
    try { lx = x; ly = y; }
    finally { sl.unlockRead(s); }
  }
  return lx + ly;                      // 4) dùng snapshot local
}
// StampedLock duy trì một trạng thái 64-bit: bit cờ write, bộ đếm readers, và một version (đôi khi gọi epoch).
// tryOptimisticRead(): Trả về một stamp (kiểu long) chứa version hiện tại (Chính là state) nếu không có writer đang nắm lock; nếu có writer → vẫn trả stamp nhưng version cho thấy “đang có write”.
// Bạn đọc dữ liệu vào biến local.
// validate(stamp):
// So sánh version hiện tại của lock với version trong stamp:
// Không đổi ⇒ không có writer chen vào kể từ khi lấy stamp → dữ liệu an toàn.
// Thay đổi ⇒ đã có writer vào/ra → dữ liệu có thể bẩn → phải fallback.
```

#### CountDownLatch

#### CyclicBarrier

#### Phaser

#### Semaphore

#### Exchanger

## Double-Checked Locking (DCL), publication, lazy init

### DCL

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
          INSTANCE = r;                     // volatile write (release)
        }
      }
    }
    return r;                               // volatile read (acquire)
  }
}

```

### Tốt hơn DCL: Initialization-on-Demand Holder (IoDH)

```java
class HolderSingleton {
  private HolderSingleton() { /* init */ }

  private static class Holder {
    static final HolderSingleton I = new HolderSingleton(); // class init là HB
  }
  static HolderSingleton get() { return Holder.I; }
}

```

#### Vì sao lại tốt hơn DCL

- code ngắn gọi
- ko cần `synchronized` hay `volatile`
- Sau lần khởi tạo đầu tiên vơi DCL thì nó sẽ luôn cần check if(instance == null) và đọc volatile -> acquire semantics (ngăn reorder) nên vẫn có khả năng overhead. Cond IoDH thì ko.
- Do cơ chế `class initialization` của JVM, đối tượng được publish fully-constructed.
  - class initialization: Tìm hiểu thêm

#### Điểm yếu

- Không thể thay đổi instance về sau
  - IoDH tạo INSTANCE cố định.
  - Với DCL (hoặc AtomicReference), bạn có thể thay thế instance về sau.
- Bạn cần lazy init có tham số/nguồn cấu hình thay đổi
  - IoDH che giấu contructor nên ko thể truyền them số vào contructor

## False sharing, padding, contended fields

### False sharing

- CPU hiện đại cache theo dòng (cache line), thường 64 bytes.
- Nếu hai (hoặc nhiều) thread thường xuyên ghi vào những biến khác nhau nhưng nằm chung 1 cache line, mỗi lần ghi sẽ làm invalidate cache line của thread kia → hai core giật qua giật lại một dòng cache → thụt hiệu năng (latency cao, throughput thấp), dù không hề có bug logic.

### Tại sao “cùng cache line” lại ảnh hưởng?

- Bộ nhớ vật lý chia thành cache line (thường 64 byte).
- Khi core 0 đọc 1 biến từ RAM, cả cache line chứa biến đó được nạp vào cache L1/L2 của core 0.
- Nếu core 1 cũng đọc 1 biến khác nhưng nằm trong cùng cache line đó, core 1 cũng sẽ tải toàn bộ cache line đó vào cache của mình.
- Ví dụ : Core 0: ghi vào biến a, Core 1: đọc/ghi vào biến b. a và b khác nhau nhưng nằm chung 1 cache line.
  - Khi core 0 ghi: Core 0 đánh dấu cache line là Modified trong cache của nó.
  - Gửi tín hiệu Invalidate tới tất cả core khác (theo MESI protocol hoặc biến thể như MOESI/MESIF).
  - Core 1 thấy cache line của mình bị invalidate → nếu cần dùng b lại, nó phải reload nguyên cache line từ core 0 hoặc RAM.
  - Nếu core 1 ghi b, quy trình invalidate lại chạy ngược.
  - Hai core cứ liên tục “giật” cache line qua lại → cache line ping-pong → mất hiệu năng.

### Padding, contended fields

- là các cách để chánh False Sharing

#### Padding

- Chèn “đệm” để hai biến không chung cache line.

```java
class PaddedLong {
  volatile long value;
  // padding (giản lược): 7 long ≈ 56B thêm header ~16B → tách line
  long p1,p2,p3,p4,p5,p6,p7;
}
```

- Nhược: cồng kềnh, phụ thuộc layout.

#### @Contended

- Annotations: @jdk.internal.vm.annotation.Contended (trước kia @sun.misc.Contended).
- ác dụng: JVM chèn padding quanh field/lớp để tách cache line.

## Escape Analysis (EA), TL;DR & tác động tối ưu hóa.

- Tìm hiểu thêm

## Testing concurrency — làm sao bắt bug đúng và đo hiệu năng đúng

- Tìm hiểu thêm

## Pitfalls thường gặp + Checklist review code đồng bộ hóa (JMM)

- Tìm hiểu thêm
