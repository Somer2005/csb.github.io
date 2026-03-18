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

## 基座模型选择

我选择Qwen3.5-4B作为我的基础模型！

选择这个模型也没什么特别的，毕竟Qwen3就是开源里面最好的，那我肯定就用Qwen3了呗。

## 数据选择

数据选择的是**HuggingFaceM4/ChartQA**这个数据集，这个数据集包含图表相关的复杂推理问题，并且是非模板生成的，涵盖了9.6K个人工撰写的问题和23.1K个由人工撰写的图表摘要生成的问题。

关于这个数据集，可以看这篇论文：https://aclanthology.org/2022.findings-acl.177.pdf.


今天还要看论文，今天的博客就先写到这里。



