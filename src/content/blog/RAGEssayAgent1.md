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

我们接下来开始洗数据。

```
from datasets import load_dataset
from PIL import Image

# 1. 加载数据集
dataset = load_dataset("HuggingFaceM4/ChartQA")
#在最开始加载数据集的时候出现了一点小问题，就是kaggle忘了开internet，导致加载数据集失败


# 2. 定义转换函数 并构建 System Prompt
def format_data_chartqa(sample):
    system_message = """You are a Vision Language Model specialized in interpreting visual data from chart images.
Your task is to analyze the provided chart image and respond to queries with concise answers, usually a single word, number, or short phrase.
The charts include a variety of types (e.g., line charts, bar charts) and contain colors, labels, and text.
Focus on delivering accurate, succinct answers based on the visual information. Avoid additional explanation unless absolutely necessary."""
    
    # 构造 ChatML 结构
    # 注意：ChartQA 的 'label' 字段通常是一个列表，这里取第一个元素
    messages = [
        {"role": "system", "content": [{"type": "text", "text": system_message}]},
        {
            "role": "user", 
            "content": [
                {"type": "image"}, # 这里只需占位，后续处理会填入图片数据
                {"type": "text", "text": sample['query']}
            ]
        },
        {"role": "assistant", "content": [{"type": "text", "text": sample['label'][0]}]}
    ]
    
    return {"messages": messages}

# 3. 应用转换
# 将 dataset 中的每一行转换成 ChatML 格式的 messages
formatted_dataset = dataset.map(format_data_chartqa, remove_columns=dataset['train'].column_names)

# 查看转换后的结果
print(formatted_dataset['train'][0])
```

接下来我们要做的事情是处理inputs_id和labels，这一步是因为前面学transformer的时候我们也提到过，mask的机制，这里我们要做的事情就是将labels转换为inputs_id的mask。

* 详细解释：

### LoRA微调

我们这里采用LoRA微调，如下：

```
%%writefile qwen35_2b_sft.py
import torch
from datasets import load_dataset
from transformers import AutoProcessor, AutoModelForCausalLM
from peft import LoraConfig, get_peft_model
from trl import SFTConfig, SFTTrainer

# 1. 设置 Qwen3.5-2B 模型 ID
model_id = "Qwen/Qwen3.5-2B"
IGNORE_TOKEN_ID = -100
processor = AutoProcessor.from_pretrained(model_id)

# 2. 加载数据集 (RAM-Safe 模式)
print("正在加载数据集...")
raw_dataset = load_dataset("HuggingFaceM4/ChartQA")

def format_data_chartqa(sample):
    system_message = "You are a Vision Language Model specialized in interpreting visual data from chart images."
    messages =[
        {"role": "system", "content":[{"type": "text", "text": system_message}]},
        {"role": "user", "content":[{"type": "image"}, {"type": "text", "text": sample['query']}]},
        {"role": "assistant", "content":[{"type": "text", "text": str(sample['label'][0])}]}
    ]
    return {"messages": messages, "orig_image": sample["image"]}

train_dataset = raw_dataset["train"].map(format_data_chartqa, remove_columns=raw_dataset["train"].column_names)

# 3. 动态 Collate Function
def custom_collate_fn(batch):
    texts =[processor.apply_chat_template(item["messages"], tokenize=False) for item in batch]
    images = [item["orig_image"] for item in batch]
    
    inputs = processor(
        text=texts, 
        images=images, 
        return_tensors="pt", 
        padding=True,
        truncation=True,    
        max_length=1536,    
        min_pixels=128*28*28,
        max_pixels=320*28*28 
    )
    
    labels = inputs["input_ids"].clone()
    labels[labels == processor.tokenizer.pad_token_id] = IGNORE_TOKEN_ID
    
    inputs["labels"] = labels
    return inputs

# 4. 加载模型
print("加载 Qwen3.5-2B 模型中...")
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.float16,
    device_map=None
)

# 5. LoRA 配置
peft_config = LoraConfig(
    lora_alpha=16,
    lora_dropout=0.05,
    r=16, 
    bias="none",
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, peft_config)

# 6. 训练配置 
training_args = SFTConfig(
    output_dir="./qwen35-2b-chartqa",
    num_train_epochs=1,
    per_device_train_batch_size=2, 
    gradient_accumulation_steps=4, 
    gradient_checkpointing=True,
    optim="adamw_torch_fused",
    learning_rate=1e-4,
    fp16=True,
    save_steps=100,
    logging_steps=5,
    report_to="none",
    remove_unused_columns=False,
    dataset_kwargs={"skip_prepare_dataset": True}
)

# 7. 启动 SFTTrainer
trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    data_collator=custom_collate_fn,
    processing_class=processor.tokenizer, 
)

print("====== 启动 Qwen3.5-2B RAM-Safe 训练模式 ======")
trainer.train()
trainer.save_model("./qwen35-2b-final")
```

最开始的时候遇到了由于trl库导致的max_length问题，后来修复了。

之后，我们安装好需要的库：

```
!pip install -U trl peft accelerate transformers datasets`
```
再进行配置：

```
!accelerate config default --mixed_precision fp16
```

就可以开始训练了：

```
!accelerate launch --num_processes 2 qwen35_2b_sft.py!python qwen35_2b_sft.py
```

### 新的技巧：如何利用Kaggle后台做断线也能跑的训练

打开notebook后，右上角有个 Save Version，选择Run and commit all即可。

今天做完了微调部分，明天开始做RAG部分。

