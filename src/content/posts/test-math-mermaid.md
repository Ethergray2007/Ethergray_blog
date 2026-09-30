---
title: "功能测试：数学公式与图表"
description: "临时测试用，验证 KaTeX 和 Mermaid 是否正常工作。"
pubDatetime: 2026-09-30T21:10:00+08:00
draft: false
tags:
  - 测试
---

> 这是一个临时测试页面（`draft: false`），验证完就删。

## 行内公式

质能方程 $E = mc^2$，还有欧拉恒等式 $e^{i\pi} + 1 = 0$。

圆周率约等于 $\pi \approx 3.14159$。

## 块级公式

二次方程求根公式：

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

常用的求和公式：

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

矩阵乘法：

$$
\begin{pmatrix} a & b \\ c & d \end{pmatrix}
\begin{pmatrix} x \\ y \end{pmatrix}
=
\begin{pmatrix} ax + by \\ cx + dy \end{pmatrix}
$$

带希腊字母和上下标：

$$
\theta_{i+1} = \theta_i - \eta \nabla_\theta J(\theta_i)
$$

## 流程图

```mermaid
graph TD
    A[开始] --> B{有缓存?}
    B -->|有| C[直接返回]
    B -->|没有| D[查数据库]
    D --> E[写入缓存]
    E --> C
    C --> F[结束]
```

## 时序图

```mermaid
sequenceDiagram
    participant 浏览器
    participant API
    participant 数据库
    浏览器->>API: POST /api/posts
    API->>API: 检查登录状态
    API->>数据库: INSERT
    数据库-->>API: 新文章 id
    API-->>浏览器: 201 Created
```

## 类图

```mermaid
classDiagram
    class Post {
        +int id
        +string slug
        +string title
        +string status
        +publish()
    }
    class Tag {
        +string name
    }
    Post "1" --> "*" Tag : 拥有
```
