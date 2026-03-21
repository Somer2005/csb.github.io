---
title: '多模态RAG项目复盘：论文Agent'
description: '本来还想按Day写日记，结果发现微调了之后，这几把玩意儿后面的RAG部分就纯调包，所以干脆一天完事。'
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

RAG的基础其实就是给基础模型加了一个知识库，这个知识库可以是文本，也可以是图片等，然后模型根据用户的问题，从知识库中提取相关信息，最后返回给用户。

提取相关信息的方法有很多，比如我这里用的Colpali模型就是基于向量检索的方法，然后再用重排模型对检索结果进行排序。

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


## 其次，切知识库数据！

切知识库数据使用的是这样的代码：

```
import os
from tqdm import tqdm
from pdf2image import convert_from_path

# ========== 工具函数 ==========
def save_images_to_local(dataset, index, output_folder):
    os.makedirs(output_folder, exist_ok=True)

    for i, item in enumerate(dataset):
        image = item[index]
        image_path = os.path.join(output_folder, f"{index}_{i}.png")
        image.save(image_path)


# ========== 主函数 ==========
def pdf_folder_to_images(
    input_folder: str,
    output_folder: str = "data/mrag/images",
    dpi: int = 300,
    index_name: str = "page",
):
    """
    Args:
        input_folder (str): 存放 pdf 的文件夹
        output_folder (str): 图片输出目录
        dpi (int): 转图分辨率
        index_name (str): 索引键
    """
    dataset = []

    pdf_files = [
        f for f in os.listdir(input_folder)
        if f.lower().endswith(".pdf")
    ]

    for pdf_file in tqdm(pdf_files, desc="converting pdf pages"):
        pdf_path = os.path.join(input_folder, pdf_file)

        try:
            pages = convert_from_path(pdf_path, dpi=dpi)
        except Exception as e:
            print(f"{pdf_file} 转换失败: {e}")
            continue

        dataset.extend([{index_name: page} for page in pages])

    save_images_to_local(
        dataset,
        index=index_name,
        output_folder=output_folder
    )


# ========== 程序入口 ==========
if __name__ == "__main__":
    pdf_folder_to_images(
        input_folder="pdfs",        # 你的PDF目录
        output_folder="images",     # 输出目录
        dpi=300
    )
```

我们使用PDF2image包来切割，切割完成后，就可以打包上传Kaggle了。

## 开始RAG部分 

RAG部分主要拆为三大阶段，分别是召回阶段，重排阶段以及用我们微调好的模型做生成。

### 召回阶段

召回阶段选择的模型是https://huggingface.co/vidore/colqwen2-v0.1，这个模型的架构是Colpali，基座模型是Qwen2，有空的话我会写一个这个架构的详细笔记。

```
class ColPali(PaliGemmaPreTrainedModel):
    def __init__(self, config: PaliGemmaConfig, mask_non_image_embeddings: bool = False):
        super().__init__(config=config)
        model = PaliGemmaForConditionalGeneration(config=config)
        self.model = model
        self.dim = 128
        self.custom_text_proj = nn.Linear(self.model.config.text_config.hidden_size, self.dim)
        self.mask_non_image_embeddings = mask_non_image_embeddings
        self.post_init()

    def forward(self, *args, **kwargs) -> torch.Tensor:
        outputs = self.model(*args, output_hidden_states=True, **kwargs)
        last_hidden_states = outputs.hidden_states[-1]  # (batch_size, sequence_length, hidden_size)
        proj = self.custom_text_proj(last_hidden_states)  # (batch_size, sequence_length, dim)

        # L2 normalization
        proj = proj / proj.norm(dim=-1, keepdim=True)  # (batch_size, sequence_length, dim)
        proj = proj * kwargs["attention_mask"].unsqueeze(-1)  # (batch_size, sequence_length, dim)

        if "pixel_values" in kwargs and self.mask_non_image_embeddings:
            # Pools only the image embeddings
            image_mask = (kwargs["input_ids"] == self.config.image_token_index).unsqueeze(-1)
            proj = proj * image_mask

        return proj
```

实战中我们将选择调包！

### 重排阶段

重排模型选择MonoT5，具体依旧调包！

### 代码实现

在Kaggle中继续添加如下代码块：

```
# 安装 pdf 处理工具、视觉检索库、交互 UI 库
!apt-get update && apt-get install -y poppler-utils
!pip install byaldi pdf2image gradio peft transformers datasets
```

然后开始调包！（注释AI写的，真的比我详细）

```
import os
import torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForCausalLM
from peft import PeftModel
from byaldi import RAGMultiModalModel
import gradio as gr

# ==========================================
# 1. 路径定义 (严格匹配你的 Kaggle 数据结构)
# ==========================================
IMAGE_PATH = "/kaggle/input/datasets/somerchen/651655"
ADAPTER_PATH = "/kaggle/input/datasets/somerchen/123456/qwen35-2b-final"
BASE_MODEL_ID = "Qwen/Qwen3.5-2B"

# ==========================================
# 2. 初始化视觉检索大脑 (ColQwen2)
# ==========================================
print("🧠 正在初始化 ColQwen2 视觉检索引擎...")
retrieval_model = RAGMultiModalModel.from_pretrained("vidore/colqwen2-v1.0", device="cuda:0")

print("🔍 正在对论文截图进行视觉索引...")
retrieval_model.index(
    input_path=IMAGE_PATH,
    index_name="paper_db",
    store_collection_with_index=False,
    overwrite=True
)

# ==========================================
# 3. 加载生成大脑 (Base + LoRA)
# ==========================================
print("🤖 正在加载微调模型...")
processor = AutoProcessor.from_pretrained(BASE_MODEL_ID)
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_ID,
    torch_dtype=torch.float16,
    device_map="cuda:1"
)
model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
model.eval()

# ==========================================
# 4. Agent 核心问答链路 (修复了路径报错)
# ==========================================
def paper_agent_qa(query):
    # 【Step 1: 视觉检索】
    results = retrieval_model.search(query, k=2)
    
    retrieved_images = []
    page_names = []
    
    for res in results:
        # --- 核心修复逻辑开始 ---
        # 尝试从 metadata 中获取原始文件名或路径
        # byaldi 的 Result 对象通常在 metadata 中存储 'doc_id' (文件名)
        raw_id = res.metadata.get('doc_id') or res.doc_id
        
        if isinstance(raw_id, int):
            # 如果还是整数，说明 metadata 里没存文件名，这通常不应该发生
            # 报错提示我们需要手动映射，但通常 raw_id 应该是文件名字符串
            print(f"警告: 检索到的 ID 为整数 {raw_id}，尝试查找文件...")
            # 备选方案：获取文件夹内文件列表按索引取（不推荐，除非万不得已）
            all_files = sorted([f for f in os.listdir(IMAGE_PATH) if f.endswith(('.png', '.jpg'))])
            img_filename = all_files[raw_id] if raw_id < len(all_files) else ""
        else:
            img_filename = str(raw_id)

        # 拼接成绝对路径
        if not os.path.isabs(img_filename):
            full_img_path = os.path.join(IMAGE_PATH, os.path.basename(img_filename))
        else:
            full_img_path = img_filename
        # --- 核心修复逻辑结束 ---

        try:
            img = Image.open(full_img_path).convert("RGB")
            retrieved_images.append(img)
            page_names.append(os.path.basename(full_img_path))
        except Exception as e:
            print(f"无法打开图片 {full_img_path}: {e}")

    if not retrieved_images:
        return "未能检索到相关页面或图片无法读取。", [], ""

    # 【Step 2: 理解生成】
    prompt = f"你是一个专业的论文助教，请结合提供的图片准确回答。问题：{query}"
    content = [{"type": "image"} for _ in retrieved_images] + [{"type": "text", "text": prompt}]
    messages = [{"role": "user", "content": content}]
    
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    
    inputs = processor(
        text=[text], 
        images=retrieved_images, 
        return_tensors="pt",
        max_pixels=320*28*28 
    ).to(model.device)
    
    with torch.no_grad():
        generated_ids = model.generate(**inputs, max_new_tokens=300)
        output_ids = generated_ids[0][inputs.input_ids.shape[1]:]
        answer = processor.decode(output_ids, skip_special_tokens=True)
    
    return answer, retrieved_images, f"参考页面: {', '.join(page_names)}"

# ==========================================
# 5. 构建 Gradio 界面 (保持不变)
# ==========================================
with gr.Blocks(theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 📑 论文视觉阅读智能体 (修复版)")
    with gr.Row():
        with gr.Column(scale=1):
            query_box = gr.Textbox(label="输入问题")
            ask_btn = gr.Button("🧠 思考回答", variant="primary")
            ref_info = gr.Markdown()
        with gr.Column(scale=2):
            ans_box = gr.Textbox(label="Agent 回答", lines=10)
            img_gallery = gr.Gallery(label="参考页面截图", columns=2)
            
    ask_btn.click(fn=paper_agent_qa, inputs=query_box, outputs=[ans_box, img_gallery, ref_info])

demo.launch(share=True, inline=True)
```


**于是，我们实现了RAG agent。**

## 简历写法：


* 为了解决传统 RAG 系统 OCR + 文本分块带来的处理时间长、召回结果差、只能利用文本 embedding 召回的问题，我们构建了基于 Qwen2.5VL 的多模态能力的原生 PDF 截图的嵌入-召回-问答 pipeline。

* 系统在 PDF 缩略图的多模态向量库基于 Late Interaction 计算召回相似度（比 cosine 相似度更精细），并且利用 Qwen2.5VL 的原生分辨率进行召回图像动态分辨率的 QA 问答。

* 为了提升 Qwen2.5VL 在 PDF 问答上的图表理解能力，我们在 pdfvqa/chartQA 上进行 SFT，并且搭建了基于 DeepSeek-Chat 的 Agent 评测系统，自动化评测 3k+ QA，问答准确率达到 x%，相比基线提高 x%。