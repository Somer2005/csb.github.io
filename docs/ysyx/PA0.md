这一栏主要记录做ysyx实验的过程。

# 这一页记录PA0
PA0做的事情是必要的准备，首先安装Ubuntu的过程自然是不必说，我们直接进入下一个部分。

## 步骤一：更新软件源
首先，我们先明确一个概念：

```shell
sudo apt install xxx
```

上述指令是一条apt安装指令，也许你在输入这行指令的时候，就会产生疑问：我们平常不是都要去官网找安装包吗？

apt的软件源起到的就是一个整合安装包的作用，你只需要输入xxx，他就能安装名字叫xxx的文件了。

而软件源，一般就会被存储在/etc/apt/sources.list中，这就是我们要优化的对象。

我们更新软件源，防止这个系统自带的软件源过于古老。

```
sudo sed -i "s/archive.ubuntu.com/mirrors.tuna.tsinghua.edu.cn/g" /etc/apt/sources.list
```

我们可以使用

```
cat /etc/apt/sources.list
```

来检验刚才的更新是否work。

接下来的安装工具部分没有什么好做笔记的。

## 安装一个中文输入法

Ubuntu的中文输入法还是比较好安装的，步骤并不多，遇到问题问LLM基本也都能解决。

### 1. 确认系统语言环境
为防止候选框不显示或乱码，需确保系统已安装中文语言包。

```bash
sudo apt update
sudo apt install -y language-pack-zh-hans
```

### 2.安装Fcix5引擎

Fcix5是一种比较新的输入法框架，反正就类似Windows的微软拼音吧。

```bash
sudo apt install -y fcitx5 \
    fcitx5-configtool \
    fcitx5-frontend-gtk3 fcitx5-frontend-qt5 \
    fcitx5-chinese-addons fcitx5-rime
```

### 3. 切换系统输入法框架
Ubuntu 默认使用 IBus，需通过 `im-config` 将输入法框架切换为 Fcitx5。

1.  执行配置命令：
    ```bash
    im-config
    ```
2.  在弹出的对话框中选择 **fcitx5** 并确认。
3.  **系统注销（Logout）并重新登录**，确保环境变量生效。

### 4. 配置中文输入源
登录后需在 Fcitx5 配置界面中添加具体的中文输入方案。

1.  启动图形化配置工具：
    ```bash
    fcitx5-configtool
    ```
2.  操作流程：
    *   点击添加按钮（`+`）。
    *   **取消勾选** “仅显示当前语言”（Only Show Current Language）。
    *   搜索并选中 **Pinyin** 或 **Rime** 进行添加。
    *   确保中文输入法位于可用列表（Current Input Method）中。

### 5. 验证与排错
*   **切换快捷键**：默认使用 `Ctrl + Space`（可在 Global Options -> Trigger Input Method 中修改）。
*   **重载守护进程**：若状态栏无图标或无法唤起，可执行以下命令强制重启并查看调试日志：
    ```bash
    fcitx5 -r -d
    ```

## Vim

Vim的安装也比较简单，直接使用apt安装即可。

```shell
sudo apt install vim
```

之后是配置vim：


```bash
cp /etc/vim/vimrc ~/.vimrc
```

cp的意思CPDD……并非并非，cp的意思是copy，复制的意思。

上面这行命令是把系统自带的vim配置文件复制到用户目录下，作为用户自己的vim配置文件。

相信这个时候有发现力的朋友就已经感觉到了，这些配置文件，好像都在/etc目录下。

我真觉得配置vim没什么可说的，也不是PA0的重点，就这样吧，具体的详细操作，你进去看看就知道。


## gcc编译

gcc的安装也很简单，刚才安装必要工具的时候，我们已经安装过。

GDB的使用和调试在博客实用工具下面。

tmux也是，这些都是记在其它部分的，这里不说。

## 为PA整理必要资源
这个就……我不知道这个有什么好记录的，这个就是纯操作。

## 编译并让NEMU跑起来
PA一开始让我们进入/nemu，然后：

```shell
make menuconfig
```

这个命令会让我们进入一个配置界面，我们只需要把里面的选项都设置成默认即可。

但是原讲义也说了，直接跑这个会报错的，原因在于menuconfig需要五个包：

* gcc
* make
* bison
* flex
* ncurses

但是我们没有装bison，装一下问题就解决。

!!! info "NEMU"
    NEMU是一个教学用的模拟器，主要用于计算机体系结构课程中，帮助学生理解计算机系统的工作原理。NEMU支持多种指令集架构（ISA），如x86、MIPS等，允许用户在模拟环境中运行和调试程序。
    
    哦我是小丑原来PA1会详细介绍。

!!! note "关于make的一些介绍"
    make是一个自动化构建工具，主要用于管理和维护大型项目的编译过程。它通过读取名为Makefile的文件中的规则和依赖关系，自动化地执行编译、链接等任务，从而简化了软件开发中的构建过程。

    make的主要功能包括：

    1. **自动化构建**：根据Makefile中的规则，自动执行编译和链接操作，减少手动操作的繁琐。
    2. **依赖管理**：跟踪文件之间的依赖关系，仅重新编译那些自上次构建以来发生变化的文件，提高构建效率。
    3. **多平台支持**：可以在不同的操作系统和环境中使用，适应各种开发需求。
    4. **灵活定义变量**：允许用户自定义规则和变量，以适应不同的项目需求。
    5. **并行构建**：支持并行执行任务，利用多核处理器加快构建速度。

    总之，make是软件开发中不可或缺的工具，极大地简化了构建过程，提高了开发效率。

PA讲义中提到的make，会在实用工具栏详细介绍并持续更新。
