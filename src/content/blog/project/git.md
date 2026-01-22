---
title: "Git 基础使用笔记"
description: "记录 Git 初始化、远程绑定及后续更新的常用命令"
publishDate: "2026-01-04"
tags: ["Git", "Workflow", "Tools"]
---

## git 的初始化

### 打开终端，进入项目根目录：
```bash
cd /path/to/your/project
# 这里作为笔记记录一些git的基本使用

## git的初始化

### 打开终端，进入项目根目录：
```bash
cd /path/to/your/project
```

### 初始化git仓库
```bash
git add .
git commit -m "初始化项目"

```

### 在github创建一个新仓库，这个不赘述了。

### 绑定远程仓库并推送（SSH）
```bash
git remote add origin git@github.com:Somer2005/csb.github.io.git
git remote -v
\#这里的后一行是为了检查是否绑定成功

git push -u origin main
\#这一步就是为了推送到github仓库了
```

## 后续如何更新仓库？
```bash
git add .
git commit -m "更新说明"
git push
```