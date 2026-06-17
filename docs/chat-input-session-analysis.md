# Chat Input 与 Session 工作流问题分析

## 背景

本次分析聚焦 `src/features/chat/chat-input.tsx` 相关交互，但实际副作用主要在 `useChatController`、`AgentWorkspace` 和 `SessionSidebar`。`ChatInput` 当前基本是受控展示组件：输入、模型选择、发送、停止、压缩等事件都通过 props 上抛。

分析范围：

- `src/features/chat/chat-input.tsx`
- `src/features/chat/use-chat-controller.ts`
- `src/features/chat/agent-api.ts`
- `src/features/chat/chat-center.tsx`
- `src/layouts/agent-workspace/agent-workspace.tsx`
- `src/features/session-sidebar/session-sidebar.tsx`
- `src/features/session-sidebar/cwd-picker.tsx`
- 相关 API route、validator、现有测试

## 结论摘要

确认存在 3 个产品/逻辑问题：

1. 模型列表加载 effect 依赖 `modelKey`，导致每次切换模型都会重新 `GET /api/models`，并且初始化后通常会额外请求一次。
2. 没有 active session 且没有选中项目目录时，Chat Input 仍允许发送，最终抛出 `No active session`。这对空工作区是错误的第一步体验。
3. Sidebar 的 `New` 按钮当前只创建“草稿新会话状态”，不会立即创建 session item；如果用户期待点击后左侧出现 item，当前行为不符合预期，也没有足够 UI 反馈说明“发送第一条消息后才会创建真实 session”。

另外还有几个同源风险：

- `newSessionCwd` 被 `resetChat()` 间接清掉，`New` 按钮的草稿态可能在同一次状态批处理中丢失。
- 当前没有组件/Hook 测试覆盖这些 workflow。
- 模型加载失败会显示在 composer action error 上，即使用户只是想使用已有 session，错误展示位置和恢复路径偏弱。

## 现象 1：选择默认模型会调用 `GET /api/models`

### 证据

`ChatInput` 的模型下拉只调用上层的 `changeModel(value)`：

- `src/features/chat/chat-input.tsx` 中 `<Select onValueChange={(value) => void changeModel(value)} value={modelKey}>`

真正的 API 调用来自 `useChatController`：

- `src/features/chat/use-chat-controller.ts:330-350`

```ts
useEffect(() => {
  const timer = window.setTimeout(async () => {
    const modelData = await loadModels();
    setModels(modelData.models);
    if (!modelKey) {
      setModelKey(defaultKey);
    }
  }, 0);
  return () => window.clearTimeout(timer);
}, [modelKey]);
```

`changeModel` 会先 `setModelKey(value)`：

- `src/features/chat/use-chat-controller.ts:623-632`

```ts
async function changeModel(value: string) {
  setModelKey(value);
  const [provider, modelId] = value.split(":");
  const id = sessionIdRef.current;
  if (!isNew && id && provider && modelId) {
    await sendCommand(id, { type: "set_model", provider, modelId });
  }
}
```

因为加载模型的 effect 依赖 `modelKey`，所以选择任意模型都会再次执行 effect，并触发 `loadModels()`，也就是 `GET /api/models`。

### 判断

这是逻辑问题。

`/api/models` 的用途应是初始化可用模型列表和默认模型，不应该因为选择模型而重新加载列表。当前依赖会造成：

- 首次加载后 `setModelKey(defaultKey)` 引起第二次 `GET /api/models`。
- 用户每次切换模型都会 `GET /api/models`。
- 在已有 session 中，`loadSession()` 或 runtime 同步 `setModelKey()` 也可能触发模型列表重载。

### 建议

把“加载可用模型列表”与“当前选择的 modelKey”解耦：

- 模型列表只在 controller mount 时加载一次，或提供显式刷新入口。
- 用函数式状态判断是否需要设置默认值，避免 effect 依赖 `modelKey`。
- `changeModel` 只负责本地选择和对已存在 session 发送 `set_model` command。

建议补测试：

- mount controller 后只调用一次 `loadModels()`。
- `changeModel()` 不触发 `loadModels()`。
- 新 session 草稿态下切换模型不发送 `set_model`，但创建 session 时会带上 provider/modelId。

## 现象 2：没有 session 时直接输入，提示 `No active session`

### 证据

`useChatController` 判断是否是新 session 草稿态：

- `src/features/chat/use-chat-controller.ts:119`

```ts
const isNew = !session && Boolean(newSessionCwd);
```

发送逻辑只有在 `isNew && mode === "prompt" && newSessionCwd` 时才调用 `/api/agent/new`：

- `src/features/chat/use-chat-controller.ts:551-568`

否则会读取 `sessionIdRef.current`，没有 id 就抛出错误：

- `src/features/chat/use-chat-controller.ts:569-571`

```ts
const id = sessionIdRef.current;
if (!id) throw new Error("No active session");
```

`AgentWorkspace` 初始状态中：

- `selectedSession` 是 `null`
- `activeCwd` 是 `null`
- `newSessionCwd` 是 `null`

见 `src/layouts/agent-workspace/agent-workspace.tsx:65-70`。

当 sidebar 没有历史 session 时，`SessionSidebar` 不会自动选择 cwd：

- `src/features/session-sidebar/session-sidebar.tsx:136`

```ts
if (!selectedCwd && recentCwds[0]) onCwdChange(recentCwds[0]);
```

如果 `recentCwds` 为空，`selectedCwd` 仍为空。此时 Chat Input 仍可输入和发送，因为 `canSubmit` 只看 draft 或 images：

- `src/features/chat/use-chat-controller.ts` return 中 `canSubmit: Boolean(draft.trim() || images.length)`

### 判断

这是产品 workflow 问题，也会表现为逻辑错误。

对用户来说，空 session 列表下的欢迎页和 composer 都像是可以直接开始工作；但内部缺少 `cwd`，无法创建新 agent，所以最后才报 `No active session`。这个错误暴露了内部状态，而不是给用户一个可执行下一步。

### 建议

需要先明确产品期望：

方案 A：空工作区允许直接输入并自动创建 session。

- 初始化时读取 `/api/default-cwd`，把它设为 `activeCwd` 和 `newSessionCwd`。
- 用户提交第一条消息时走 `/api/agent/new`。
- Sidebar 可以同步展示默认 cwd。

方案 B：必须先选择项目。

- 当 `!session && !newSessionCwd` 时禁用发送按钮和 Enter 提交。
- composer placeholder 明确提示选择项目。
- action error 不再显示 `No active session`，而是显示面向用户的“请选择项目目录后开始新会话”。

从当前产品定位看，方案 A 更顺滑；如果担心默认 cwd 不符合用户预期，方案 B 更保守。

建议补测试：

- 没有 session 且没有 cwd 时，发送不会产生 pending message 后再失败。
- 选择 cwd 后输入第一条消息会调用 `/api/agent/new`。
- 空 session 列表但有默认 cwd 时，可以直接创建新 session。

## 现象 3：点击 Sidebar 的 `New` 后没有创建 session item

### 证据

Sidebar 的 `New` 按钮只在有 `selectedCwd` 时启用：

- `src/features/session-sidebar/session-sidebar.tsx:163-168`

```tsx
<Button
  disabled={!selectedCwd}
  onClick={() =>
    selectedCwd && onNewSession(crypto.randomUUID(), selectedCwd)
  }
>
```

`AgentWorkspace.handleNewSession` 没有调用后端创建 session，也没有把 temporary item 放进 sidebar 列表：

- `src/layouts/agent-workspace/agent-workspace.tsx:200-205`

```ts
const handleNewSession = useCallback((_temporaryId: string, cwd: string) => {
  setSelectedSession(null);
  setNewSessionCwd(cwd);
  updateSessionUrl(null);
  resetChat();
}, [resetChat, updateSessionUrl]);
```

真实 session 创建发生在第一条 prompt 发送时：

- `src/features/chat/use-chat-controller.ts:551-568`

创建成功后再通过 `onSessionCreated` 刷新并选择真实 session：

- `src/layouts/agent-workspace/agent-workspace.tsx:246-251`

```ts
const handleSessionCreated = useCallback(
  (sessionId: string) => {
    setNewSessionCwd(null);
    setSessionStarted(true);
    void selectSessionById(sessionId);
  },
  [selectSessionById],
);
```

### 判断

这是行为设计不清晰，并且可能有实现 bug。

如果当前设计是“lazy create”，那么点击 `New` 后不出现真实 session item 是预期的；但 UI 没有显示一个草稿 item，也没有说明 session 会在首条消息发送后创建，所以用户会认为按钮没生效。

更严重的是，`handleNewSession` 里先 `setNewSessionCwd(cwd)`，随后调用 `resetChat()`。而 `resetChat()` 会 `setChatInstanceKey()` 强制 remount `ChatCenter`，并且会 `setSessionStarted(false)` 等清理状态。虽然 `resetChat()` 当前不直接设置 `newSessionCwd`，但因为 React 批处理和 key remount，这段逻辑很难从 UI 上确认草稿态是否稳定。建议把“开启新 session 草稿态”设计成显式状态，而不是依赖 `newSessionCwd` 这个隐含标记。

### 建议

推荐二选一：

方案 A：保留 lazy create，但补齐草稿态。

- 点击 `New` 后 sidebar 插入一个 local-only draft item，例如 `Untitled session` 或 `New session`。
- Chat welcome/composer 明确进入新会话草稿。
- 发送第一条消息成功后，用真实 session 替换 draft item。
- 发送失败时保留 draft 和用户输入，避免用户感觉内容丢失。

方案 B：点击 `New` 立即创建后端 session。

- 需要新增或复用“空 session 创建”后端能力。
- Sidebar 立即出现真实 item。
- 第一条消息走普通 `prompt` command。
- 这会改变 API contract，需要同步 `docs/agent-api-reference.md`，并补 application/transport 测试。

当前后端 `parseCreateAgent` 要求 `message` 或 `images` 至少一个存在，所以方案 B 不是简单调用 `/api/agent/new` 空消息能完成的。

## 额外发现

### 1. `No active session` 前已经把用户消息加入列表并清空输入

`submit()` 在确认可用 session/cwd 前就：

- append pending user message
- clear composer
- 清空 action error

见 `src/features/chat/use-chat-controller.ts:536-548`。

当随后抛出 `No active session` 时，消息会变成 failed，但输入框已经被清空。这对缺少 cwd 的场景尤其糟糕，因为用户无法通过重试解决。

建议：在进入乐观 UI 前先验证目标状态。至少对 `!isNew && !sessionIdRef.current` 做前置返回。

### 2. 新 session 的模型默认值依赖 `/api/models` 是否先返回

新 session 创建时带上的模型来自 `currentModel`：

- `src/features/chat/use-chat-controller.ts:555-562`

如果用户在模型列表未加载完成前直接发送，`provider` 和 `modelId` 会是 `undefined`，由后端默认策略接管。这不一定错误，但 UI 显示“默认模型”和实际后端默认值可能存在瞬时不一致。

建议：模型列表加载中时不要显示成可明确选择的模型；或把“使用后端默认模型”作为显式状态。

### 3. 当前测试缺口

现有相关测试主要覆盖：

- `src/features/chat/agent-api.test.ts`：API adapter payload。
- `src/server/transport/http/validators.test.ts`：validator。
- models config 的 API/sidebar state。

缺少：

- `useChatController` 的模型加载、切换模型、新 session 创建、无 session 提交测试。
- `AgentWorkspace` 与 `SessionSidebar` 的 empty state/new-session workflow 测试。

## 建议修复优先级

P0：

- 修正模型加载 effect，避免 `modelKey` 变化触发 `GET /api/models`。
- 对没有 session 且没有 cwd 的提交做前置拦截，不再抛内部错误 `No active session`。

P1：

- 明确空工作区策略：自动使用 default cwd，或强制选择项目并禁用 composer。
- 明确 `New` 按钮语义：lazy draft item 或立即创建真实 session。

P2：

- 增加 `useChatController` workflow 测试。
- 增加 sidebar/workspace empty-state 测试。
- 优化模型加载失败和加载中状态的 UI 反馈。

## 推荐验收场景

1. 首次进入且没有任何 session：
   - 用户能清楚知道下一步是选择项目，或可以直接发送并创建默认项目 session。
   - 不出现 `No active session`。

2. 有 selected cwd 但没有 session：
   - 点击 `New` 后 UI 有明确反馈。
   - 输入第一条消息会调用 `/api/agent/new`，成功后 sidebar 出现真实 session。

3. 切换模型：
   - 不触发 `GET /api/models`。
   - 已有 session 发送一次 `set_model` command。
   - 新 session 草稿态不发送 `set_model`，但首条 `/api/agent/new` 带上选择的模型。

4. 初始化：
   - controller mount 只加载一次模型列表。
   - 默认模型设置不导致第二次模型列表请求。
