# Rubik's Cube Viewer（魔方查看器）

在 Obsidian 笔记中直接渲染魔方图示。支持 **10+ 种魔方类型**，自动生成打乱公式并以 SVG 渲染。

![version](https://img.shields.io/badge/版本-1.0.0-blue)

## 支持的魔方

| 关键词 | 魔方 | 打乱格式 |
|---|---|---|
| `3x3`、`3` | 三阶魔方 | WCA: R U F D L B |
| `2x2`、`2` | 二阶魔方 | U R F 转动 |
| `4x4`–`7x7`、`4`–`7` | 四阶–七阶魔方 | SiGN 记法 |
| `mega`、`minx`、`megaminx` | 五魔方 | Pochmann: R++ D-- U |
| `pyra`、`pyram`、`pyraminx` | 金字塔魔方 | U L R B + 小角 |
| `clock` | 魔表 | UR/dr/DL/UL ALL y2 |
| `sq1`、`sq-1`、`square-one` | SQ1 魔方 | (x,y) / 格式 |
| `skewb`、`skb` | 斜转魔方 | R L U B（FCN 记法） |
| `random` | 随机选择 | 从以上类型中随机选取 |

所有关键词**不区分大小写**。

## 快速入门

````markdown
```cube
cube: 3x3
```

```cube
cube: pyra
```

```cube
cube: mega
```
````

每个代码块会生成随机打乱，并渲染打乱后的魔方 SVG 图示。

## 使用说明

### 打乱模式（默认）

不写额外内容时，自动生成随机打乱：

````markdown
```cube
cube: 3x3
```
````

也可以指定自定义打乱序列：

````markdown
```cube
cube: 3x3
R U R' U' R' F R2 U' R' U' R U R' F'
```
````

### 填色模式（仅限 NxN 魔方）

为 NxN 魔方（2x2–7x7）自定义每个面的颜色。每个面需要 `n×n` 个颜色字符（按行排列）。

颜色使用单字母代码：

| 代码 | 颜色 | 色值 |
|---|---|---|
| W | 白 | `#FFFFFF` |
| Y | 黄 | `#FFD500` |
| G | 绿 | `#009E60` |
| B | 蓝 | `#0051BA` |
| R | 红 | `#C41E3A` |
| O | 橙 | `#FF5800` |
| A | 灰 | `#808080` |
| K | 黑 | `#000000` |

````markdown
```cube
cube: 3x3
type: filling
U: WWWWWWWWW
D: YYYYYYYYY
F: GGGGGGGGG
```
````

## 各魔方详情与样例

### 三阶魔方（3x3x3）

标准 WCA 打乱格式，20 步随机转动，无连续同面。

````markdown
```cube
cube: 3x3
R U R' F2 L D2 B' U' R' F D' L2 B U2 R2 F' U B2 D'
```
````

### 二阶魔方（2x2x2）

仅 U/R/F 面，10 步随机打乱。

````markdown
```cube
cube: 2x2
U R' U2 F' R U' F2 R U' R'
```
````

### 四阶魔方（4x4x4）

SiGN 记法，支持多层转动。30 步随机打乱。

````markdown
```cube
cube: 4x4
Rw' U2 Fw D' B' Rw2 U Fw2 L' D Rw B2 Uw' F' L2 D2 Rw Uw2 B'
```
````

### 五阶–七阶魔方（5x5–7x7）

SiGN 记法，步数随阶数增加。示例（七阶）：

````markdown
```cube
cube: 7x7
3Rw' U2 2Fw D' 3Bw' L2 2Uw R' 2Fw' D2 3Lw B 2Rw2 U' D2
```
````

### 金字塔魔方（Pyraminx）

4 个三角形面，蝴蝶结布局。面颜色：F（绿）、D（黄）、L（红）、R（蓝）。11 步顶点转动 + 随机小角转动。

````markdown
```cube
cube: pyra
U' L B' U L' R B U' L R' B u' l' r b
```
````

### 斜转魔方（Skewb）

6 个菱形分割方形面，每面 1 中心 + 4 角块。面颜色：U（白）、F（红）、R（蓝）、L（绿）、B（橙）、D（黄）。FCN 记法 11 步。

````markdown
```cube
cube: skewb
R' U B' L R' U' B L' U R' B' L
```
````

### 魔表（Clock）

两个圆形面（正面/背面）左右排列，每面 9 个小表盘（3×3 排列）。WCA 拨杆格式 + y2（翻面）。

````markdown
```cube
cube: clock
UR4+ DR2- DL3+ UL1- U5+ R3- D4+ L2- ALL6+ y2 UR2- DR5+ DL4+ UL3- ALL1+
```
````

### SQ1 魔方（Square-1）

上下两层圆形面，各分 12 个扇形块，中间连接带。(x,y) 格式旋转，`/` 为翻转。

````markdown
```cube
cube: sq1
(3,-1) / (-2,4) / (2,-3) / (3,0) / (-3,0) / (-1,2) / (4,1) / (-1,0)
```
````

### 五魔方（Megaminx）

12 个五边形面展开图，每面 11 个色块。Pochmann 格式，7 行 × 10 步，每行以 U/U' 结尾。

````markdown
```cube
cube: mega
R++ D-- R++ D-- R++ D-- R++ D-- R++ D-- R++ D-- R++ D-- R++ D-- R++ D-- R++ D-- U
R++ D++ R++ D++ R-- D-- R-- D-- R++ D-- R-- D++ R++ D-- R++ D++ R-- D-- R++ D++ U'
R-- D++ R-- D-- R++ D++ R++ D++ R-- D++ R++ D-- R-- D-- R++ D++ R++ D-- R-- D++ U
R++ D-- R-- D-- R++ D++ R-- D++ R++ D-- R++ D++ R++ D-- R-- D++ R-- D++ R++ D-- U'
R-- D++ R++ D-- R++ D++ R-- D-- R++ D-- R-- D-- R++ D++ R-- D++ R-- D-- R++ D++ U
R-- D-- R++ D++ R++ D-- R-- D++ R-- D-- R++ D++ R-- D++ R++ D++ R-- D-- R++ D-- U'
R++ D-- R-- D++ R-- D-- R++ D++ R++ D++ R-- D-- R++ D-- R-- D++ R++ D-- R-- D++ U
```
````

### 随机（Random）

每次渲染随机选取一种魔方类型。

````markdown
```cube
cube: random
```
````

## 安装

### 从 Obsidian 社区插件市场

1. 打开 设置 → 第三方插件
2. 搜索「Rubik's Cube Viewer」
3. 安装并启用

### 手动安装

```bash
cd /你的仓库路径/.obsidian/plugins
git clone <仓库地址> rubiks-cube-viewer
cd rubiks-cube-viewer
npm install
npm run build
```

## 开发

```bash
npm install
npm run dev     # 监听模式
npm run build   # 生产构建
npm run lint    # 运行 eslint
```

## 许可证

0-BSD
