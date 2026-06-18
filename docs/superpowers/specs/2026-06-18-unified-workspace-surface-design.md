# 统一工作区背景设计规格

日期：2026-06-18

状态：待用户审阅

## 目标

降低 Session Sidebar、Workspace Top Bar 与 Chat 画布之间的材质割裂感，使三个主要区域看起来属于同一个连续工作台。

本次仅调整视觉表面，不修改布局、功能、交互路径、响应式行为或 Dialog 安全规则。

## 已确认方案

采用 B 方案：Session Sidebar、Workspace Top Bar 和 Chat 主区域统一使用 `canvas` 背景。

大面积背景不再同时依靠“纯白与灰白反差”和深色边界进行双重分割。区域关系改由细边界、选中态和局部较亮表面表达。

## 视觉规则

### 主区域

- Chat 主区域继续使用 `bg-canvas`。
- Session Sidebar 的桌面与移动容器改用 `bg-canvas`。
- Workspace Top Bar 改用 `bg-canvas`。
- 深色主题使用同一组语义 Token，不单独写死颜色。

### 局部表面

以下元素继续使用较亮或不同明度的语义表面，以维持层次：

- 工作目录选择器；
- 选中的会话行；
- 输入框、Select 和 Dropdown；
- Chat Composer；
- Dialog、Popover、Tooltip 等浮层；
- 错误、警告和运行状态。

普通列表区域不增加新的卡片或背景块。

### 边界

- Sidebar 与 Chat 之间保留 1px 分隔线。
- Top Bar 与 Chat 内容之间保留 1px 分隔线。
- 主区域分隔线使用柔和的结构边界，不使用当前偏深的强边界。
- 移动端 Sidebar 保留浮层阴影与遮罩，以维持空间关系。

### Composer

本次不重构 Composer 结构，但恢复其与大画布之间的视觉层次：

- 使用较亮表面；
- 使用适度圆角；
- 使用短而低透明度的阴影；
- 不恢复装饰性渐变。

Composer 的具体 Token 应复用现有语义变量，不新增一次性颜色。

## 实现边界

主要修改范围：

- `src/layouts/agent-workspace/agent-workspace.tsx`
- `src/layouts/agent-workspace/workspace-top-bar.tsx`
- `src/features/chat/chat-input.tsx`
- `src/app/globals.css`，仅在现有 Token 需要柔化时调整
- 对应视觉契约测试

不修改：

- Session Sidebar 内的数据加载和会话逻辑；
- Workspace Top Bar 的按钮、统计信息和操作逻辑；
- Chat 消息结构；
- API、服务端模块和数据合同；
- Dialog 关闭约束和危险操作确认；
- ReactBits 或其他依赖。

## 验收标准

- Sidebar、Top Bar 和 Chat 在浅色主题中呈现连续的工作区底色。
- 区域仍能通过细边界被清楚识别，但不会像线框图。
- 选中会话、路径选择器和 Composer 仍具有明确层级。
- 深色主题没有区域明度跳变或边界过亮问题。
- 桌面和移动端 Sidebar 均保持原有行为。
- 不出现布局位移或交互回归。
- `npm run check` 和 `npm run build` 通过。
- 在浏览器中验证浅色、深色及移动宽度。

## 明确不做

- 不改变 Sidebar 宽度、Top Bar 高度或 Chat 布局。
- 不扩大衬线字体使用范围。
- 不引入新的品牌色。
- 不重新设计消息气泡或文件面板。
- 不在本次加入动效库。
