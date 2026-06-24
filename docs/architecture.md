# 架构文档：从 code block 到 SVG 渲染

## 一、Obsidian 插件基础

### 1.1 插件的入口与生命周期

Obsidian 插件本质上是一个 JavaScript 类，继承自 `Plugin`：

```typescript
export default class RubiksCubePlugin extends Plugin {
  async onload() {
    // 插件加载时执行
  }
  onunload() {
    // 插件卸载时执行
  }
}
```

`onload()` 是整个插件的启动入口，在这里注册所有功能。`onunload()` 用于清理资源，当前为空（SVG 由浏览器自动管理，无需手动释放）。

### 1.2 为什么 ` ```cube ` 代码块可以自定义渲染？

Obsidian 开放了一个关键 API：

```typescript
this.registerMarkdownCodeBlockProcessor(language, callback);
```

它的工作原理是：

1. **Obsidian 内部用 CodeMirror 6 编辑器 + 自定义 Markdown 解析器**
2. 当用户书写 ` ``` ` 围栏代码块时，Markdown 解析器将其识别为 `<pre><code>` 节点
3. `registerMarkdownCodeBlockProcessor` 告诉 Obsidian：「遇到语言标记为 `cube` 的代码块时，不要用默认的 `<pre><code>` 渲染，而是调用我的回调函数」
4. 回调函数接收两个参数：**原始文本内容** + **目标 DOM 容器**，你可以往容器里塞任何 HTML

```typescript
// 这是一切的基础：接管 ` ```cube ` 代码块的渲染
this.registerMarkdownCodeBlockProcessor('cube', (source, el, ctx) => {
  // source  = 代码块的原始文本内容
  // el      = 代码块的 DOM 容器（你可以往里加任何东西）
  // ctx     = Markdown 上下文（文件路径、frontmatter 等）

  const svg = renderPuzzle(state);
  el.createDiv({ cls: 'cube-block' }).appendChild(svg);
});
```

**这意味着：任何 Obsidian 插件都可以劫持特定语言的代码块，将其渲染为任意 HTML/SVG/Canvas 内容。** 这也是为什么 Dataview、Mermaid、Excalidraw 等插件能工作的原因——它们都用的是同一个 API。

---

## 二、整体架构

```
用户输入 ```cube 代码块
        │
        ▼
┌──────────────────┐
│   parseBlock()   │  ← 解析 cube: / type: / scramble 数据
│   main.ts:27     │
└──────┬───────────┘
       │ ParsedBlock { puzzle, type, data }
       ▼
┌──────────────────────┐
│  createPuzzleState() │  ← 根据 puzzle 类型创建初始状态
│  scramble-generator  │
└──────┬───────────────┘
       │ PuzzleState { type, data }
       ▼
┌──────────────────────┐
│   generateScramble() │  ← 如果没有自定义公式，随机生成
│   scramble-generator │
└──────┬───────────────┘
       │ scramble: string
       ▼
┌──────────────────────┐
│   applyPuzzleMoves() │  ← 把公式应用到状态上（状态机）
│   scramble-generator │
└──────┬───────────────┘
       │ PuzzleState (已打乱)
       ▼
┌──────────────────┐
│  renderPuzzle()  │  ← 按 puzzle 类型路由到对应渲染器
│  main.ts:76      │
└──────┬───────────┘
       │ 路由分发
       ├── cube         → renderCube()        → 6 面展开图
       ├── pyraminx     → renderPyraminx()    → 4 三角形蝴蝶结
       ├── skewb        → renderSkewb()       → 6 菱形面
       ├── clock        → renderClock()       → 2 圆面 + 表盘
       ├── square-one   → renderSquareOne()   → 2 扇形面 + 连接带
       └── megaminx     → renderMegaminx()    → 12 五边形展开图
              │
              ▼
       ┌──────────────┐
       │  SVGSVGElement│  ← 返回完整的 SVG DOM 节点
       └──────┬───────┘
              │
              ▼
       el.createDiv().appendChild(svg)
              │
              ▼
       Obsidian 笔记中显示魔方图示
```

---

## 三、源码分层

```
src/
├── main.ts                    # 插件入口 + code block 解析 + 渲染路由
├── settings.ts                # 设置面板（默认魔方类型等）
├── colors.ts                  # 颜色码 → hex 映射，所有魔方共用
├── cube-simulator.ts          # NxN 魔方状态机（创建、打乱）
├── cube-renderer.ts           # NxN 魔方 SVG 渲染（6 面展开图）
│
└── puzzles/
    ├── types.ts               # 魔方类型定义 + 别名注册表
    ├── scramble-generator.ts  # 所有魔方的状态机 + 打乱生成
    ├── pyraminx-renderer.ts   # 金字塔魔方 SVG 渲染
    ├── skewb-renderer.ts      # 斜转魔方 SVG 渲染
    ├── clock-renderer.ts      # 魔表 SVG 渲染
    ├── square-one-renderer.ts # SQ1 魔方 SVG 渲染
    └── megaminx-renderer.ts   # 五魔方 SVG 渲染
```

---

## 四、核心模块详解

### 4.1 parseBlock() — 代码块解析

```typescript
function parseBlock(content: string, defaultCubeKey: string): ParsedBlock | { error: string } | null {
```

输入：代码块的原始文本 + 用户设置的默认魔方类型。
输出：解析后的结构化数据，或错误信息。

处理流程：

1. **逐行解析** — 每一行要么是 `key: value` 键值对，要么是打乱公式
2. **识别 puzzle 类型** — 从 `cube:` 键中提取，支持别名（`pyra`→`pyraminx`，`sq1`→`square-one` 等）
3. **随机类型处理** — 如果 `cube: random`，随机选一个实际类型
4. **模式校验** — `type: filling` 只能用于 NxN 魔方，否则返回错误
5. **返回 ParsedBlock** — 包含 puzzle（魔方类型）、type（scramble/filling）、data（打乱公式原始文本）

### 4.2 状态机 — createPuzzleState / applyPuzzleMoves

每种魔方都有自己的状态表示：

| 魔方 | 状态结构 | 色块数 |
|---|---|---|
| NxN 魔方 | `{ n: number, faces: Record<Face, string[][]> }` | 6 × n² |
| 金字塔 | `{ faces: string[][] }` | 4 × 9 |
| 斜转 | `{ faces: string[][] }` | 6 × 5 |
| 魔表 | `{ pins: number[] }` | 18 |
| SQ1 | `{ pieces: string[] }` | 24 |
| 五魔方 | `{ faces: string[][] }` | 12 × 11 |

**状态机的作用**：把打乱公式（纯文本）变成色块的排列变化。

以三阶魔方为例：
```
初始状态：U 面全白，D 面全黄，F 面全绿 ...
执行 "R"：R 面顺时针旋转 90°，同时 U/F/D/B 面的右列色块联动
执行 "U'"：U 面逆时针旋转 90°，F/R/B/L 面的顶行色块联动
...
最终状态：色块已按照公式被打乱
```

每次转动都通过预定义的**色块置换映射**来交换色块位置和朝向。这些映射是根据魔方的物理结构推导出来的。

### 4.3 SVG 渲染器

所有渲染器遵循同一模式：输入状态，输出 `SVGSVGElement`。

**为什么选 SVG 而不是 Canvas？**

- SVG 是矢量图，缩放不失真，适合不同屏幕
- SVG 是 DOM 节点，可以直接 `appendChild` 到页面，无需额外框架
- 不需要 `<canvas>` 上下文管理，不用处理 DPI 缩放
- Obsidian 本身就是 DOM 环境，用 SVG 最自然

**渲染流程**：

```
状态（色块排列）
  → 遍历每个面
    → 画背景（深色圆角矩形/三角形/五边形...）
    → 遍历每个色块
      → 查颜色表得到 hex 值
      → 用 getHex(colorCode) 将单字母码转为 #RRGGBB
      → 创建对应的 SVG 图形元素（<rect> <polygon> <circle> <path>）
    → 可选的文字标签
  → 返回 <svg> 元素
```

**各魔方的渲染几何**：

| 魔方 | 布局 | 色块形状 |
|---|---|---|
| NxN | 6 面十字展开图 | `<rect>` 矩形 |
| 金字塔 | 4 个三角形蝴蝶结 | `<polygon>` 小三角形 |
| 斜转 | 6 个菱形面一字排开 | `<rect>` + `<polygon>` |
| 魔表 | 2 个圆面左右排列 | `<circle>` + `<line>` + 刻度 |
| SQ1 | 2 个扇形面 + 连接带 | `<path>` 弧线扇形 |
| 五魔方 | 12 个五边形展开图 | `<polygon>` 五边形 + 多边形 |

---

## 五、颜色系统

```typescript
// 基础六色（标准魔方用）
FACE_COLORS = { W: '#FFFFFF', Y: '#FFD500', G: '#009E60', B: '#0051BA', R: '#C41E3A', O: '#FF5800' }

// 扩展色（五魔方等用）
EXTRA_COLORS = { PK: '#FF69B4', LG: '#90EE90', LB: '#87CEEB', PI: '#800080', ... }

// 最终查询
getHex(code) → FACE_COLORS[code] ?? EXTRA_COLORS[code] ?? '#808080'
```

设计原则：用**单字母/双字母码**表示颜色，由 `getHex()` 统一转换为 RGB 值。这样状态存储极其紧凑（每个色块只占 1-2 个字符），渲染时才展开为颜色。

---

## 六、如何添加新魔方

添加一个新魔方需要 3 步（约 150-300 行代码）：

1. **`scramble-generator.ts`** — 添加状态接口、`createXxx()`、`applyXxxMove()`、`applyXxxMoves()`、`generateXxxScramble()`
2. **`xxx-renderer.ts`** — 实现 `renderXxx(state): SVGSVGElement`，定义面的几何布局和色块形状
3. **`types.ts`** — 注册别名映射
4. **`main.ts`** — 在 `createPuzzleState()`、`applyPuzzleMoves()`、`renderPuzzle()` 中添加新分支

---

## 七、关键技术决策

| 决策 | 原因 |
|---|---|
| 纯 TypeScript，零运行时依赖 | 插件体积小（~26KB），加载快，无兼容问题 |
| SVG 而非 Canvas/WebGL | Obsidian 是文档型应用，SVG 更契合静态渲染场景 |
| 随机打乱而非最优解法 | 最优解法（Kociemba 二阶段、min2phase 等）极其复杂，对可视化插件收益不大 |
| 2D 展开图而非 3D 渲染 | 不需要 Three.js 等重型依赖，渲染简单可靠，更契合笔记场景 |
| 展开图布局 | 参照 tnoodle（WCA 官方打乱程序）的面布局和配色方案 |
