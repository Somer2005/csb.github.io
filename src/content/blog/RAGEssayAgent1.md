---
title: '多模态RAG项目Day1 Lora微调大模型预备'
description: 'Write your description here.'
publishDate: '2026-03-18 19:21:44'
tags:
  - RAG
  - Agent
  - Project
  - Large Language Model
  - MiniEssayReadingAgent
---

今天开始构建我的第一个Agent项目。这个项目其实是有点老了的项目了，2025年9月的项目，现在是2026年3月了，半年前的老项目，实在是太老了。
但是作为一个练手项目足够了，AI大潮来袭，还是要做点什么。

## 基础准备
### 基座模型选择

我选择Qwen3.5-4B作为我的基础模型！

选择这个模型也没什么特别的，毕竟Qwen3就是开源里面最好的，那我肯定就用Qwen3了呗。

### 数据选择

数据选择的是**HuggingFaceM4/ChartQA**这个数据集，这个数据集包含图表相关的复杂推理问题，并且是非模板生成的，涵盖了9.6K个人工撰写的问题和23.1K个由人工撰写的图表摘要生成的问题。

关于这个数据集，可以看这篇论文：https://aclanthology.org/2022.findings-acl.177.pdf.


### 平台选择
我选择Kaggle作为我的选择！因为Kaggle给三十个小时T100哈哈，爽的一。

## 首先，SFT微调基础模型

由于成本的原因我肯定要选择LoRA微调的。LoRA微调的原理和工程实现回头会专门写在另一篇博客上。

### 数据集下载与准备

在Kaggle中首先新建一个Notebook，而后执行：

```
!pip install datasets
```

```
from datasets import load_dataset

# 加载数据集
# 该数据集默认包含 'train', 'validation', 'test' 分片
dataset = load_dataset("HuggingFaceM4/ChartQA")

# 查看数据结构
print(dataset)

# 访问第一行数据 (对应你链接中的 row=0)
print(dataset['train'][0])
```

在这之后，我们就已经准备好了数据集，接下来就要开始进行数据的预处理工作了。

参考论文，我们需要标定labels，也就是哪些token需要被计算loss，也就是“谁是因变量”。那么我们就要将数据转化为ChatML格式。

什么是ChatML格式？
ChatML格式是一种用于表示对话的格式，它由多个消息组成，每个消息都有一个角色（如用户、助手、系统等）和一个内容。

首先最开始我使用的代码是这样的：

