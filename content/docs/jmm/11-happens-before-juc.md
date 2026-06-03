---
title: "Happens-before trong java.util.concurrent"
description: "HB edges trong Executor/Future, BlockingQueue, ConcurrentHashMap, Lock, StampedLock, synchronizers"
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [1. Executor / Future / CompletableFuture](#1-executor--future--completablefuture)
- [2. BlockingQueue / Concurrent collections](#2-blockingqueue--concurrent-collections)
- [3. Lock / ReentrantLock / ReadWriteLock](#3-lock--reentrantlock--readwritelock)
- [4. StampedLock](#4-stampedlock)
- [5. Synchronizers](#5-synchronizers)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

> [!NOTE]
> Placeholder — nội dung chi tiết lấy từ section "Happens-before trong java.util.concurrent" trong `JMM.md`.

## Tổng quan

Các tiện ích trong `java.util.concurrent` đã tích hợp sẵn HB edges, giúp publish
dữ liệu an toàn giữa các thread.

## 1. Executor / Future / CompletableFuture

_TODO: submit HB execute; execute HB get()._

## 2. BlockingQueue / Concurrent collections

_TODO: put HB take; CHM, CLQ._

## 3. Lock / ReentrantLock / ReadWriteLock

_TODO: unlock HB lock kế tiếp._

## 4. StampedLock

_TODO: optimistic read, validate._

## 5. Synchronizers

_TODO: CountDownLatch, CyclicBarrier, Phaser, Semaphore, Exchanger._

## Tài liệu tham khảo

- Trước: [Thread-safe classes](/jmm/10-thread-safe-classes/)
- Tiếp theo: [Double-Checked Locking](/jmm/12-double-checked-locking/)
