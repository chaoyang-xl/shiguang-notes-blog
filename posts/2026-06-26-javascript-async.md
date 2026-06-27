---
title: 终于想明白了 JavaScript 异步
date: 2026-06-26
description: 用一杯咖啡的时间，重新理解调用栈、微任务和事件循环究竟是怎样配合的。
tags: [JavaScript, 学习笔记]
---

异步代码最容易让人困惑的地方，是它看起来没有按照从上到下的顺序执行。今天我试着不背概念，只记住一条主线：**JavaScript 每次只做一件事，但浏览器可以帮它等。**

## 先看一道小题

```javascript
console.log('A');

setTimeout(() => console.log('B'), 0);

Promise.resolve().then(() => console.log('C'));

console.log('D');
```

输出是 `A D C B`。同步任务先完成，Promise 回调进入微任务队列，定时器回调进入宏任务队列。

## 事件循环的朴素版本

可以把整个过程想成餐厅的出餐口：

1. 调用栈是当前正在制作的菜；
2. 微任务是“这道菜做完马上补一下”的小步骤；
3. 宏任务是下一张正式订单；
4. 每清空一轮，浏览器才有机会更新画面。

### async 与 await

`await` 后面的代码，可以大致理解为被放进了 Promise 的回调里。

```javascript
async function getNote() {
  const response = await fetch('/note.json');
  const note = await response.json();
  return note;
}
```

它没有把线程堵住，而是先把控制权交还出去，等结果准备好再继续。

## 今天的结论

遇到执行顺序问题时，分别标出**同步任务、微任务、宏任务**，大多数谜题都会突然变得很老实。理解比背答案慢一点，但更耐用。
