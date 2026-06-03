---
title: "Escape Analysis"
description: "Escape Analysis là gì, ba mức escape, và các tối ưu scalar replacement / stack allocation / lock elision"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Escape Analysis là gì](#1-escape-analysis-là-gì)
- [2. Ba mức escape](#2-ba-mức-escape)
- [3. Các tối ưu EA mở khóa](#3-các-tối-ưu-ea-mở-khóa)
  - [3.1 Stack allocation](#31-stack-allocation)
  - [3.2 Scalar replacement](#32-scalar-replacement)
  - [3.3 Lock elision](#33-lock-elision)
- [4. Liên hệ với JMM](#4-liên-hệ-với-jmm)
- [5. Lưu ý thực tế](#5-lưu-ý-thực-tế)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan

**Escape Analysis (EA)** là kỹ thuật phân tích của JIT compiler nhằm xác định
**phạm vi sống** của một object: nó có "thoát" (escape) khỏi method/thread tạo ra
nó hay không. Nếu **không**, JIT có thể áp dụng nhiều tối ưu mạnh.

> [!NOTE]
> **Hình dung bằng giấy nháp**: bạn lấy một tờ giấy nháp để tính toán trong đầu,
> dùng xong vứt đi — không ai khác cần nó (NoEscape). JIT thấy vậy thì **không
> thèm cấp một tờ giấy thật** (không cấp phát heap), mà tính nhẩm luôn trong đầu
> (register). Ngược lại, nếu bạn **đưa tờ giấy cho người khác** giữ (return, gán
> field tĩnh, chia cho thread khác) thì nó "thoát" ra ngoài (GlobalEscape) → buộc
> phải là giấy thật, lưu cẩn thận. EA chính là việc JIT phán đoán "tờ giấy này có
> bị ai khác giữ không".

## 1. Escape Analysis là gì

Khi JIT (HotSpot C2) biên dịch một method, nó truy vết xem reference của một
object được tạo bên trong method có:

- Bị **trả về** ra ngoài,
- Bị **gán** vào field tĩnh/instance nhìn thấy bởi nơi khác,
- Bị **truyền** cho method khác có thể giữ lại,
- Bị một **thread khác** truy cập...

hay không. Kết quả phân tích quyết định object đó có thể được tối ưu hay phải cấp
phát "đầy đủ" trên heap.

## 2. Ba mức escape

| Mức | Ý nghĩa | Tối ưu khả thi |
|-----|---------|----------------|
| **NoEscape** | Object không thoát khỏi method | Scalar replacement, stack allocation, lock elision |
| **ArgEscape** | Thoát qua tham số gọi method khác nhưng không thoát ra thread/heap toàn cục | Một số tối ưu hạn chế |
| **GlobalEscape** | Thoát ra ngoài (return, field tĩnh, thread khác) | Không tối ưu được — cấp phát heap bình thường |

```java
// NoEscape — sb không thoát ra ngoài method
String build(int n) {
    StringBuilder sb = new StringBuilder(); // có thể bị "xóa" hoàn toàn
    for (int i = 0; i < n; i++) sb.append(i);
    return sb.toString();
}

// GlobalEscape — leak ra field tĩnh
static Object LEAK;
void escape() {
    LEAK = new Object(); // thoát ra ngoài → không tối ưu
}
```

## 3. Các tối ưu EA mở khóa

### 3.1 Stack allocation

Object **NoEscape** có thể cấp phát trên **stack** thay vì heap → tự động giải
phóng khi method return, **giảm áp lực GC**.

### 3.2 Scalar replacement

Mạnh hơn cả stack allocation: JIT "tháo rời" object thành các field nguyên thủy
(scalar) và đặt thẳng vào **register**/stack slot — object **không bao giờ được
tạo** trong bộ nhớ.

```java
Point p = new Point(1, 2);
int s = p.x + p.y;
// Sau scalar replacement: tương đương
//   int x = 1, y = 2; int s = x + y;  (không có object Point nào)
```

### 3.3 Lock elision

Nếu một object dùng để `synchronized` là **NoEscape** (chỉ một thread chạm tới),
lock đó **vô nghĩa** → JIT **loại bỏ** lock (lock elision).

```java
void f() {
    Object lock = new Object();   // không thoát ra ngoài
    synchronized (lock) {         // JIT bỏ luôn lock này
        doWork();
    }
}
```

> [!NOTE]
> Liên quan: **lock coarsening** (gộp các khối synchronized liền kề trên cùng lock
> thành một) và **biased locking** (đã bị deprecate/loại bỏ ở JDK mới) cũng là các
> tối ưu khóa của JIT.

## 4. Liên hệ với JMM

> [!IMPORTANT]
> EA chỉ áp dụng tối ưu khi object **không escape ra thread khác**. Đây chính là
> lý do bảo đảm `final` field (xem [Safe Publication](/jmm/07-final-field-safe-publication/))
> đòi hỏi **`this` không escape** trong constructor: một khi object có thể bị
> thread khác thấy, JIT buộc phải giữ đầy đủ ngữ nghĩa bộ nhớ (barrier, không
> elide lock) để không vi phạm JMM.

Nói cách khác, EA và JMM "đồng thuận": JIT chỉ được cắt bỏ đồng bộ khi chứng minh
được không có thread nào khác quan sát object — tức là không có HB edge nào cần
giữ.

## 5. Lưu ý thực tế

- EA bật mặc định trên HotSpot (`-XX:+DoEscapeAnalysis`). Có thể tắt để debug:
  `-XX:-DoEscapeAnalysis`.
- EA là **phân tích cục bộ theo method sau khi JIT** → code chạy diễn giải
  (interpreted) lúc khởi động **chưa** được tối ưu.
- **Đừng** dựa vào EA để "bỏ lock cho đúng" — bạn vẫn phải viết code đồng bộ đúng;
  EA chỉ là tối ưu trong suốt, không thay đổi ngữ nghĩa.

> [!TIP]
> Bài học rút ra: viết object **nhỏ, cục bộ, không leak** không chỉ sạch về thiết
> kế mà còn giúp JIT tối ưu mạnh (ít cấp phát heap, ít lock thừa).

## Tài liệu tham khảo

- [HotSpot — Escape Analysis (OpenJDK Wiki)](https://wiki.openjdk.org/display/HotSpot/EscapeAnalysis)
- Trước: [False sharing & padding](/jmm/13-false-sharing-padding/)
- Tiếp theo: [Testing concurrency](/jmm/15-testing-concurrency/)
