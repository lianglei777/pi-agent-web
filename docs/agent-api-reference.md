# Po Agent Web API 文档

本文档描述当前项目已经实现的 HTTP API。内容以 `src/app/api`、
`src/server/transport` 和 `src/server/domain` 中的代码为准。

## 1. 基本信息

### 1.1 Base URL

本地开发环境默认地址：

```text
http://localhost:3000
```

本文档中的路径均以该地址为基准，例如：

```text
GET http://localhost:3000/api/sessions
```

### 1.2 运行模型

当前后端按以下边界设计：

- 单用户
- 单 Node.js 进程
- 本机文件系统
- 本机 Pi Session 和 Credential 存储
- 不提供多租户隔离
- 不提供面向公网部署的认证和授权保护

除 OAuth 流程和 API Key 配置外，API 本身没有登录校验。不要直接暴露到公网。

### 1.3 Content Type

普通 JSON 请求：

```http
Content-Type: application/json
```

普通 JSON 响应：

```http
Content-Type: application/json
```

实时事件响应：

```http
Content-Type: text/event-stream; charset=utf-8
```

文件二进制响应的 `Content-Type` 根据扩展名决定。

### 1.4 JSON 响应约定

成功响应直接返回业务数据，没有统一的 `data` 包装：

```json
{
  "sessionId": "019e..."
}
```

失败响应使用统一结构：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "message must be a non-empty string",
    "details": {}
  }
}
```

`details` 没有内容时可能不出现。

### 1.5 通用错误代码

| Code | 常见状态码 | 含义 |
| --- | ---: | --- |
| `VALIDATION_ERROR` | 400、403、416 | 请求体、路径或 Range 参数不合法 |
| `SESSION_NOT_FOUND` | 404 | Session 或指定 Session Entry 不存在 |
| `FILE_NOT_FOUND` | 404 | 文件或目录不存在 |
| `NOT_A_FILE` | 400 | 目标不是文件 |
| `NOT_A_DIRECTORY` | 400 | 目标不是目录 |
| `FILE_TOO_LARGE` | 413 | 文本或图片超过预览限制 |
| `MODEL_NOT_FOUND` | 404 | 模型不存在 |
| `UNSUPPORTED_COMMAND` | 400 | Agent Command 类型不受支持 |
| `COMPACTION_NOT_AVAILABLE` | 由调用场景决定 | 当前不能执行 Compaction |
| `OAUTH_PROVIDER_NOT_FOUND` | 404 | OAuth Provider 不存在 |
| `PENDING_INPUT_NOT_FOUND` | 404 | OAuth Pending Input Token 不存在或 Provider 不匹配 |
| `SKILL_INSTALL_FAILED` | 500 | Skill CLI 安装失败 |
| `INTERNAL_ERROR` | 500 | 未归类的服务端错误 |

## 2. API 总览

### 2.1 Utility

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/home` | 获取当前用户 Home 目录 |
| `GET` | `/api/default-cwd` | 获取服务端默认工作目录 |

### 2.2 Sessions

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/sessions` | 列出 Session |
| `GET` | `/api/sessions/:id` | 获取 Session Tree、Context 和可选 Runtime State |
| `PATCH` | `/api/sessions/:id` | 重命名 Session |
| `DELETE` | `/api/sessions/:id` | 删除 Session，并重挂直接子 Session |
| `GET` | `/api/sessions/:id/context` | 获取当前或指定 Leaf 的上下文 |

### 2.3 Agent

| Method | Path | 用途 |
| --- | --- | --- |
| `POST` | `/api/agent/new` | 创建 Agent Runtime 并发送首条 Prompt |
| `GET` | `/api/agent/:id` | 获取 Runtime Snapshot |
| `POST` | `/api/agent/:id` | 执行统一 Agent Command |
| `GET` | `/api/agent/:id/events` | 订阅 Agent SSE 事件 |

### 2.4 Models

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/models` | 获取当前可用模型和默认模型 |
| `GET` | `/api/models-config` | 读取原始模型配置 |
| `PUT` | `/api/models-config` | 覆盖原始模型配置 |
| `POST` | `/api/models-config/test` | 隔离测试模型配置 |

### 2.5 Auth

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/auth/providers` | 获取 OAuth Provider |
| `GET` | `/api/auth/all-providers` | 获取 OAuth 和 API Key Provider |
| `GET` | `/api/auth/api-key/:provider` | 获取 API Key 配置状态 |
| `POST` | `/api/auth/api-key/:provider` | 保存 API Key |
| `DELETE` | `/api/auth/api-key/:provider` | 删除 API Key |
| `GET` | `/api/auth/login/:provider` | 启动 OAuth SSE 流程 |
| `POST` | `/api/auth/login/:provider` | 回传 OAuth 人工输入 |
| `POST` | `/api/auth/logout/:provider` | 退出 Provider 登录 |

### 2.6 Files

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/files/[...path]?type=list` | 列出目录 |
| `GET` | `/api/files/[...path]?type=read` | 读取文本 |
| `GET` | `/api/files/[...path]?type=raw` | 读取或流式传输二进制 |
| `GET` | `/api/files/[...path]?type=binary` | `raw` 的别名 |
| `GET` | `/api/files/[...path]?type=watch` | 订阅文件变化 SSE |

### 2.7 Skills

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/skills` | 加载当前工作区可用 Skills |
| `PATCH` | `/api/skills` | 修改 Skill 的模型调用开关 |
| `POST` | `/api/skills/search` | 搜索可安装 Skill |
| `POST` | `/api/skills/install` | 安装 Skill |

## 3. 通用数据结构

### 3.1 ThinkingLevel

```ts
type ThinkingLevel =
  | "auto"
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";
```

`auto` 在设置 Agent Runtime 时表示不强制调用 SDK 的 Thinking Level setter。

### 3.2 ImageInput

```ts
interface ImageInput {
  type: "image";
  data: string;
  mimeType: string;
}
```

`data` 是 Base64 内容，不包含 Data URL 前缀。

示例：

```json
{
  "type": "image",
  "data": "iVBORw0KGgoAAA...",
  "mimeType": "image/png"
}
```

### 3.3 AgentRuntimeState

```ts
interface AgentRuntimeState {
  sessionId: string;
  sessionFile: string;
  isStreaming: boolean;
  isCompacting: boolean;
  autoCompactionEnabled: boolean;
  autoRetryEnabled: boolean;
  model?: {
    id: string;
    provider: string;
  };
  contextUsage: {
    percent: number | null;
    contextWindow: number;
    tokens: number | null;
  } | null;
  systemPrompt: string;
  thinkingLevel: ThinkingLevel;
}
```

### 3.4 AgentMessage

消息通过 `role` 区分类型。

#### UserMessage

```ts
interface UserMessage {
  role: "user";
  content: string | Array<TextContent | ImageContent>;
  timestamp?: number;
}
```

#### AssistantMessage

```ts
interface AssistantMessage {
  role: "assistant";
  content: AssistantContent[];
  provider: string;
  model: string;
  stopReason?: string;
  errorMessage?: string;
  timestamp?: number;
  usage?: TokenUsage;
}
```

`AssistantContent` 支持：

```ts
type AssistantContent =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | {
      type: "image";
      source: {
        type: "base64" | "url";
        mediaType?: string;
        data?: string;
        url?: string;
      };
    }
  | {
      type: "toolCall";
      toolCallId: string;
      toolName: string;
      input: Record<string, unknown>;
    };
```

#### ToolResultMessage

```ts
interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName?: string;
  content: Array<TextContent | ImageContent>;
  isError?: boolean;
  timestamp?: number;
}
```

#### Summary 和扩展消息

```ts
interface CompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp?: number;
}

interface BranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string;
  timestamp?: number;
}

interface CustomMessage {
  role: "custom";
  customType: string;
  content: string | Array<TextContent | ImageContent>;
  display: boolean;
  details?: unknown;
  timestamp?: number;
}

interface BashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode?: number;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean;
  timestamp?: number;
}
```

## 4. Utility API

### 4.1 获取 Home 目录

```http
GET /api/home
```

响应：

```json
{
  "home": "C:\\Users\\example"
}
```

### 4.2 获取默认工作目录

```http
GET /api/default-cwd
```

响应：

```json
{
  "cwd": "C:\\workspace\\po-agent-web"
}
```

## 5. Session API

Session 数据来自 Pi SDK 默认 Session Storage。

### 5.1 列出 Session

```http
GET /api/sessions
```

响应类型：

```ts
interface SessionInfo {
  id: string;
  path: string;
  cwd: string;
  name?: string;
  created: string;
  modified: string;
  messageCount: number;
  firstMessage: string;
  parentSessionId?: string;
}
```

响应示例：

```json
[
  {
    "id": "019eaae0-98ee-7d69-80e2-d35189abd636",
    "path": "C:\\Users\\example\\.pi\\agent\\sessions\\...jsonl",
    "cwd": "C:\\workspace\\project",
    "name": "修复登录问题",
    "created": "2026-06-09T05:35:06.478Z",
    "modified": "2026-06-09T08:19:00.076Z",
    "messageCount": 26,
    "firstMessage": "检查登录失败的问题",
    "parentSessionId": "019e..."
  }
]
```

### 5.2 获取 Session Detail

```http
GET /api/sessions/:id
GET /api/sessions/:id?includeState=true
```

Query：

| 参数 | 必需 | 说明 |
| --- | --- | --- |
| `includeState` | 否 | 等于字符串 `true` 时附加 Runtime Snapshot |

响应：

```ts
interface SessionDetail {
  sessionId: string;
  filePath: string;
  info: SessionInfo | null;
  tree: SessionTreeNode[];
  leafId: string | null;
  context: SessionContext;
  agentState?: {
    running: boolean;
    state?: AgentRuntimeState;
  };
}
```

`tree` 节点：

```ts
interface SessionTreeNode {
  entry: {
    id: string;
    parentId: string | null;
    type: string;
    timestamp: string;
    message?: AgentMessage;
    [key: string]: unknown;
  };
  children: SessionTreeNode[];
  label?: string;
}
```

`includeState=true` 只检查当前进程内是否已经加载 Runtime，不会为了查询而恢复 Runtime。

错误：

- `404 SESSION_NOT_FOUND`

### 5.3 重命名 Session

```http
PATCH /api/sessions/:id
Content-Type: application/json
```

请求：

```json
{
  "name": "新的会话名称"
}
```

成功响应：

```json
{
  "success": true
}
```

错误：

- `400 VALIDATION_ERROR`
- `404 SESSION_NOT_FOUND`

### 5.4 删除 Session

```http
DELETE /api/sessions/:id
```

成功响应：

```json
{
  "success": true
}
```

删除行为：

1. 销毁当前进程中的同 ID Runtime。
2. 删除 Session JSONL 文件。
3. 将直接子 Session 重挂到被删除 Session 的父 Session。
4. 如果被删除 Session 没有父 Session，则清除直接子 Session 的父引用。

错误：

- `404 SESSION_NOT_FOUND`

### 5.5 获取 Session Context

```http
GET /api/sessions/:id/context
GET /api/sessions/:id/context?leafId=:entryId
```

Query：

| 参数 | 必需 | 说明 |
| --- | --- | --- |
| `leafId` | 否 | 指定 Session Tree Entry；省略时使用当前 Leaf |

响应：

```json
{
  "context": {
    "messages": [],
    "entryIds": [],
    "thinkingLevel": "off",
    "model": {
      "provider": "new-api",
      "modelId": "qwen3-coder-next"
    }
  }
}
```

约束：

- `messages.length` 始终等于 `entryIds.length`。
- 相同索引的 `entryIds[index]` 是 `messages[index]` 对应的 Session Entry。
- Compaction Summary 使用 Compaction Entry ID。
- 指定 `leafId` 时，Context 按该分支构建，不要求该 Entry 是当前 Leaf。

错误：

- `404 SESSION_NOT_FOUND`：Session 或 `leafId` 不存在。

## 6. Agent API

推荐调用流程：

1. 建立或准备 SSE 事件处理。
2. 调用 `POST /api/agent/new` 创建 Session。
3. 使用返回的 `sessionId` 订阅 `/api/agent/:id/events`。
4. 通过 `POST /api/agent/:id` 发送后续命令。
5. 页面恢复时先查询 `GET /api/agent/:id`。

### 6.1 创建 Agent 并发送首条 Prompt

```http
POST /api/agent/new
Content-Type: application/json
```

请求：

```ts
interface CreateAgentRequest {
  cwd: string;
  message: string;
  images?: ImageInput[];
  provider?: string;
  modelId?: string;
  thinkingLevel?: ThinkingLevel;
  toolNames?: string[];
}
```

示例：

```json
{
  "cwd": "C:\\workspace\\project",
  "message": "分析当前项目结构",
  "provider": "new-api",
  "modelId": "qwen3-coder-next",
  "thinkingLevel": "medium",
  "toolNames": ["read", "bash", "edit"]
}
```

规则：

- `cwd` 和 `message` 必需且不能为空。
- 只有同时提供 `provider` 和 `modelId` 才会设置模型。
- `toolNames: []` 表示禁用所有工具。
- Prompt 在后台运行，HTTP 请求不等待模型完成。

成功响应：

```json
{
  "sessionId": "019e..."
}
```

### 6.2 获取 Runtime Snapshot

```http
GET /api/agent/:id
```

Runtime 已加载：

```json
{
  "running": true,
  "state": {
    "sessionId": "019e...",
    "sessionFile": "C:\\Users\\example\\.pi\\agent\\sessions\\...jsonl",
    "isStreaming": false,
    "isCompacting": false,
    "autoCompactionEnabled": true,
    "autoRetryEnabled": true,
    "model": {
      "id": "qwen3-coder-next",
      "provider": "new-api"
    },
    "contextUsage": {
      "percent": 12.5,
      "contextWindow": 128000,
      "tokens": 16000
    },
    "systemPrompt": "...",
    "thinkingLevel": "medium"
  }
}
```

Runtime 未加载：

```json
{
  "running": false
}
```

注意：该接口不会从磁盘恢复 Runtime。订阅 SSE 或发送 Command 时才会按需恢复。

### 6.3 执行 Agent Command

```http
POST /api/agent/:id
Content-Type: application/json
```

所有命令都使用同一个 Endpoint，通过 `type` 区分。

#### prompt

```json
{
  "type": "prompt",
  "message": "继续检查测试",
  "images": []
}
```

响应：

```json
{
  "accepted": true
}
```

Prompt 在后台执行，结果通过 SSE 返回。

#### abort

```json
{
  "type": "abort"
}
```

终止当前 Agent 操作。

#### get_state

```json
{
  "type": "get_state"
}
```

响应为 `AgentRuntimeState`。

#### set_model

```json
{
  "type": "set_model",
  "provider": "new-api",
  "modelId": "qwen3-coder-next"
}
```

错误：

- `404 MODEL_NOT_FOUND`

#### fork

```json
{
  "type": "fork",
  "entryId": "a1b2c3d4"
}
```

响应：

```json
{
  "sessionId": "019e...",
  "sessionFile": "C:\\Users\\example\\.pi\\agent\\sessions\\...jsonl"
}
```

Fork 成功后，原 Session Runtime 会被销毁。新 Session 在需要时重新加载。

#### navigate_tree

```json
{
  "type": "navigate_tree",
  "targetId": "a1b2c3d4"
}
```

底层成功结果可能包含：

```json
{
  "editorText": "原用户消息",
  "cancelled": false
}
```

#### set_thinking_level

```json
{
  "type": "set_thinking_level",
  "level": "high"
}
```

允许值见 `ThinkingLevel`。

#### compact

```json
{
  "type": "compact",
  "customInstructions": "保留所有文件修改和待办事项"
}
```

响应可能包含：

```json
{
  "summary": "...",
  "firstKeptEntryId": "a1b2c3d4",
  "tokensBefore": 90000,
  "details": {}
}
```

#### set_auto_compaction

```json
{
  "type": "set_auto_compaction",
  "enabled": true
}
```

#### steer

```json
{
  "type": "steer",
  "message": "优先检查 API 层",
  "images": []
}
```

#### follow_up

```json
{
  "type": "follow_up",
  "message": "完成后运行测试",
  "images": []
}
```

#### get_tools

```json
{
  "type": "get_tools"
}
```

响应：

```json
{
  "active": ["read", "bash", "edit"],
  "available": [
    {
      "name": "read",
      "description": "Read a file",
      "parameters": {},
      "sourceInfo": {}
    }
  ]
}
```

`available` 的详细 Schema 由当前 Pi SDK Tool Registry 提供。

#### set_tools

```json
{
  "type": "set_tools",
  "toolNames": ["read", "bash"]
}
```

未知工具名由 Pi SDK 忽略。

#### abort_compaction

```json
{
  "type": "abort_compaction"
}
```

#### set_auto_retry

```json
{
  "type": "set_auto_retry",
  "enabled": false
}
```

#### 空响应命令

底层没有业务返回值的命令统一返回：

```json
{
  "success": true
}
```

### 6.4 订阅 Agent SSE

```http
GET /api/agent/:id/events
Accept: text/event-stream
```

事件格式：

```text
event: agent
data: {"type":"connected","sessionId":"019e..."}

```

连接建立时首先发送：

```json
{
  "type": "connected",
  "sessionId": "019e..."
}
```

后续事件：

```ts
type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end" }
  | { type: "message_start"; message: Partial<AssistantMessage> }
  | { type: "message_update"; message: Partial<AssistantMessage> }
  | { type: "message_end"; message: AgentMessage }
  | {
      type: "tool_execution_start";
      toolCallId: string;
      toolName: string;
    }
  | {
      type: "tool_execution_end";
      toolCallId: string;
      isError?: boolean;
    }
  | {
      type: "retry_start";
      attempt: number;
      maxAttempts: number;
      errorMessage?: string;
    }
  | { type: "retry_end" }
  | { type: "compaction_start" }
  | {
      type: "compaction_end";
      aborted?: boolean;
      errorMessage?: string;
    };
```

Transport 订阅失败时还可能发送：

```json
{
  "type": "error",
  "message": "..."
}
```

SSE 每 25 秒发送一次注释 Heartbeat：

```text
:

```

客户端断开时会自动取消订阅。若 Runtime 未加载，该接口会从 Session Storage 恢复。

浏览器示例：

```ts
const events = new EventSource(`/api/agent/${sessionId}/events`);

events.addEventListener("agent", (event) => {
  const payload = JSON.parse((event as MessageEvent).data);
  console.log(payload);
});
```

## 7. Model API

### 7.1 获取可用模型

```http
GET /api/models
```

响应：

```ts
interface ModelsResponse {
  models: Array<{
    id: string;
    name: string;
    provider: string;
    contextWindow?: number;
    maxTokens?: number;
    input?: Array<"text" | "image">;
    thinkingLevels: ThinkingLevel[];
    thinkingLevelMap?: Record<string, string | null>;
  }>;
  defaultModel: {
    provider: string;
    modelId: string;
  } | null;
}
```

当前默认模型是可用模型列表中的第一项，不是单独保存的用户偏好。

### 7.2 读取 Models Config

```http
GET /api/models-config
```

响应为 `~/.pi/agent/models.json` 中的原始 JSON Object。

文件不存在或读取失败时返回：

```json
{}
```

### 7.3 覆盖 Models Config

```http
PUT /api/models-config
Content-Type: application/json
```

请求体必须是 JSON Object，内容会作为完整配置覆盖写入。

```json
{
  "providers": {
    "custom": {
      "baseUrl": "https://example.com/v1",
      "models": []
    }
  }
}
```

成功响应：

```json
{
  "success": true
}
```

注意：

- 这是完整替换，不是 Merge。
- 写入采用临时文件加 Rename。
- 具体 Config Schema 由当前 Pi SDK 版本决定。

### 7.4 测试模型配置

```http
POST /api/models-config/test
Content-Type: application/json
```

请求：

```json
{
  "provider": "new-api",
  "modelId": "qwen3-coder-next",
  "config": {
    "providers": {}
  },
  "timeoutMs": 15000
}
```

字段：

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `provider` | 是 | Provider ID |
| `modelId` | 是 | Model ID |
| `config` | 否 | 临时测试配置；必须是 Object |
| `timeoutMs` | 否 | 超时毫秒数，默认 `15000` |

响应：

```json
{
  "ok": true,
  "latencyMs": 1234,
  "responseText": "OK"
}
```

失败也通常返回 HTTP 200，并通过 `ok: false` 表示：

```json
{
  "ok": false,
  "latencyMs": 15001,
  "error": "Model test timed out"
}
```

测试使用临时目录、临时 Model Registry、内存 Session、禁用自动重试，并在结束后销毁。
测试会发起一次真实模型请求，可能产生费用。

## 8. Auth API

Credential 默认存储在 Pi Agent 目录下的 `auth.json`。

### 8.1 获取 OAuth Provider

```http
GET /api/auth/providers
```

响应：

```json
[
  {
    "id": "openai-codex",
    "name": "OpenAI Codex"
  }
]
```

### 8.2 获取所有 Provider

```http
GET /api/auth/all-providers
```

响应：

```json
{
  "oauth": [
    {
      "id": "openai-codex",
      "name": "OpenAI Codex"
    }
  ],
  "apiKey": [
    {
      "id": "anthropic",
      "name": "Anthropic"
    }
  ]
}
```

### 8.3 获取 API Key 状态

```http
GET /api/auth/api-key/:provider
```

响应：

```json
{
  "configured": true,
  "source": "stored",
  "label": "Stored API key"
}
```

`source` 可能是：

```text
stored
runtime
environment
fallback
models_json_key
models_json_command
```

该接口不会返回真实 API Key。

### 8.4 保存 API Key

```http
POST /api/auth/api-key/:provider
Content-Type: application/json
```

请求：

```json
{
  "apiKey": "sk-..."
}
```

成功响应：

```json
{
  "success": true
}
```

### 8.5 删除 API Key

```http
DELETE /api/auth/api-key/:provider
```

成功响应：

```json
{
  "success": true
}
```

### 8.6 启动 OAuth

```http
GET /api/auth/login/:provider
Accept: text/event-stream
```

事件名：

```text
oauth
```

可能的事件：

#### auth

```json
{
  "type": "auth",
  "url": "https://provider.example/authorize",
  "instructions": "Open this URL in your browser"
}
```

#### device_code

```json
{
  "type": "device_code",
  "userCode": "ABCD-EFGH",
  "verificationUri": "https://provider.example/device",
  "intervalSeconds": 5,
  "expiresInSeconds": 900
}
```

#### progress

```json
{
  "type": "progress",
  "message": "Waiting for authorization"
}
```

#### prompt

```json
{
  "type": "prompt",
  "token": "pending-input-token",
  "message": "Enter the authorization code",
  "placeholder": "Code",
  "allowEmpty": false
}
```

#### select

```json
{
  "type": "select",
  "token": "pending-input-token",
  "message": "Select an account",
  "options": [
    {
      "id": "account-1",
      "label": "Account 1"
    }
  ]
}
```

#### error

```json
{
  "type": "error",
  "message": "OAuth provider was not found"
}
```

#### complete

```json
{
  "type": "complete"
}
```

OAuth 客户端断开时，关联的 Pending Input 会被 Reject 和清理。

### 8.7 回传 OAuth 输入

当 OAuth SSE 收到 `prompt` 或 `select` 时，使用相同 Provider 回传：

```http
POST /api/auth/login/:provider
Content-Type: application/json
```

请求：

```json
{
  "token": "pending-input-token",
  "value": "用户输入或 option id"
}
```

成功响应：

```json
{
  "success": true
}
```

错误：

- `404 PENDING_INPUT_NOT_FOUND`
- Token 不存在、已使用、已取消或属于其他 Provider 时均返回该错误。

### 8.8 Logout

```http
POST /api/auth/logout/:provider
```

响应：

```json
{
  "success": true
}
```

## 9. File API

### 9.1 路径规则

统一入口：

```http
GET /api/files/[...path]
```

目标路径有两种来源：

1. Catch-all URL Path。
2. `path` Query，存在时优先。

由于 `/api/files/[...path]` 至少需要一个 URL Segment，通过 Query 传绝对路径时可使用占位 Segment：

```text
/api/files/_?path=C%3A%5Cworkspace%5Cproject&type=list
```

目标路径必须位于已登记的 Workspace Root 中。

Workspace Root 来源：

- 服务启动时的 `process.cwd()`
- 新 Agent 的 `cwd`
- 从磁盘恢复 Runtime 时 Session 的 `cwd`

访问 Root 之外的路径返回：

```text
403 VALIDATION_ERROR
```

### 9.2 列出目录

```http
GET /api/files/[...path]?type=list
```

省略 `type` 时默认也是 `list`。

响应：

```json
[
  {
    "name": "src",
    "path": "C:\\workspace\\project\\src",
    "isDir": true,
    "size": 0,
    "modified": "2026-06-10T01:00:00.000Z"
  }
]
```

目录列表会过滤：

- `.git`
- `.next`
- `node_modules`

错误：

- `404 FILE_NOT_FOUND`
- `400 NOT_A_DIRECTORY`

### 9.3 读取文本

```http
GET /api/files/[...path]?type=read
```

响应：

```json
{
  "content": "export default function App() {}",
  "language": "typescript",
  "size": 32
}
```

支持的语言映射：

| 扩展名 | language |
| --- | --- |
| `.ts`, `.tsx` | `typescript` |
| `.js`, `.jsx` | `javascript` |
| `.json` | `json` |
| `.md` | `markdown` |
| `.css` | `css` |
| `.html` | `html` |
| `.py` | `python` |
| `.sh` | `shell` |
| `.ps1` | `powershell` |
| 其他 | `text` |

限制：

- 文本最大 `256 KiB`。
- 当前按 UTF-8 读取，不执行二进制内容检测。

错误：

- `404 FILE_NOT_FOUND`
- `400 NOT_A_FILE`
- `413 FILE_TOO_LARGE`

### 9.4 获取二进制

```http
GET /api/files/[...path]?type=raw
GET /api/files/[...path]?type=binary
```

支持 MIME：

| 扩展名 | Content-Type |
| --- | --- |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.gif` | `image/gif` |
| `.webp` | `image/webp` |
| `.svg` | `image/svg+xml` |
| `.mp3` | `audio/mpeg` |
| `.wav` | `audio/wav` |
| `.ogg` | `audio/ogg` |
| `.pdf` | `application/pdf` |
| 其他 | `application/octet-stream` |

图片最大 `10 MiB`。音频和其他二进制没有额外业务大小限制，使用 Stream 返回。

完整响应：

```http
HTTP/1.1 200 OK
Accept-Ranges: bytes
Content-Length: 12345
Content-Type: image/png
```

### 9.5 HTTP Range

请求：

```http
GET /api/files/[...path]?type=raw
Range: bytes=0-1023
```

响应：

```http
HTTP/1.1 206 Partial Content
Accept-Ranges: bytes
Content-Length: 1024
Content-Range: bytes 0-1023/12345
```

当前接受单一 Range：

```text
bytes=start-end
```

不支持多个 Range。非法或越界 Range 返回：

```text
416 VALIDATION_ERROR
```

### 9.6 Watch 文件或目录

```http
GET /api/files/[...path]?type=watch
Accept: text/event-stream
```

事件名：

```text
file
```

初始事件：

```json
{
  "type": "connected",
  "path": "C:\\workspace\\project"
}
```

变化事件：

```json
{
  "type": "change",
  "path": "C:\\workspace\\project\\src\\app.ts"
}
```

或：

```json
{
  "type": "rename",
  "path": "C:\\workspace\\project\\src\\app.ts"
}
```

客户端断开时自动关闭 Node 文件 Watcher。

## 10. Skill API

### 10.1 加载 Skills

```http
GET /api/skills
GET /api/skills?cwd=C%3A%5Cworkspace%5Cproject
```

`cwd` 必需，且必须是已注册的 Workspace Root。

响应：

```json
{
  "skills": [
    {
      "skillId": "d60c...",
      "name": "example-skill",
      "description": "Example skill",
      "filePath": "C:\\...\\SKILL.md",
      "displayPath": "~\\.pi\\agent\\skills\\example-skill\\SKILL.md",
      "baseDir": "C:\\...\\example-skill",
      "sourceInfo": {
        "path": "C:\\...\\skills",
        "source": "user",
        "scope": "user",
        "origin": "top-level"
      },
      "canModify": true,
      "disableModelInvocation": false,
      "version": "6f2d..."
    }
  ],
  "diagnostics": [
    {
      "severity": "warning",
      "message": "Invalid frontmatter",
      "path": "C:\\...\\SKILL.md"
    }
  ],
  "homeDir": "C:\\Users\\example"
}
```

该接口使用与 AgentSession 相同的 Pi SDK `DefaultResourceLoader`、
`SettingsManager`、`cwd` 和 `agentDir`，因此包含 project、global、显式 path
和 package/extension 提供的技能，并保留同名资源与 diagnostics。

### 10.2 修改模型调用开关

```http
PATCH /api/skills
Content-Type: application/json
```

请求：

```json
{
  "cwd": "C:\\workspace\\project",
  "skillId": "d60c...",
  "disabled": true,
  "expectedVersion": "6f2d..."
}
```

行为：

- `disabled: true`：写入 `disable-model-invocation: true`。
- `disabled: false`：删除该 Frontmatter 字段。
- 保留其他 Frontmatter 内容。
- 保留 BOM、换行风格、注释和其他字段。
- 文件没有 Frontmatter 且需要禁用时，会创建 Frontmatter。
- `disabled: true` 只从模型 prompt 中移除技能，显式 `/skill:name` 仍可调用。
- 服务端通过 `cwd + skillId` 重新执行资源发现，不接受客户端文件路径。
- 写入前校验 realpath、symlink 和 `expectedVersion`，并使用同目录临时文件替换。

成功响应是刷新后的完整 Skill 加载结果。`409 SKILL_CONFLICT` 表示文件已被
其他进程修改，客户端应刷新后重试。

### 10.3 搜索 Skill

```http
POST /api/skills/search
Content-Type: application/json
```

请求：

```json
{
  "query": "react testing",
  "limit": 20
}
```

规则：

- `query` 必需且不能为空。
- `limit` 必须是正数，否则使用默认值 `20`。
- 先请求 `https://skills.sh/api/search`。
- 远程 API 失败时回退 `npx --yes skills find`。
- CLI 回退使用 Node 执行 npm 自带的 `npx-cli.js`，所有参数独立传递，不使用 shell。
- CLI 有超时、输出上限、ANSI 清理。
- API 和 CLI 都失败时返回 `502 SKILL_SEARCH_FAILED`。

响应：

```json
{
  "results": [
    {
      "id": "owner/repository@react-testing",
      "name": "react-testing",
      "description": "",
      "source": "owner/repository",
      "packageSpec": "owner/repository@react-testing",
      "installs": 1200
    }
  ]
}
```

### 10.4 安装 Skill

```http
POST /api/skills/install
Content-Type: application/json
```

请求：

```json
{
  "package": "owner/repository@react-testing",
  "scope": "project",
  "cwd": "C:\\workspace\\project"
}
```

字段：

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `package` | 是 | `skills add` 接受的 Skill Package |
| `scope` | 是 | `global` 或 `project` |
| `cwd` | Project 必需 | 已注册的 Workspace Root；Global 下用于安装后验证 |

CLI：

```text
node <npm>/bin/npx-cli.js --yes skills add <package> -y --agent pi
```

Global Scope 会追加：

```text
-g
```

成功响应：

```json
{
  "installed": true,
  "skills": [
    {
      "skillId": "d60c...",
      "name": "react-testing",
      "displayPath": ".agents\\skills\\react-testing\\SKILL.md"
    }
  ],
  "output": "..."
}
```

命令成功后会重新运行 `DefaultResourceLoader`，只有发现新增或内容发生变化且 scope
正确的技能才算安装成功；返回路径来自真实发现结果。新安装技能默认关闭模型自动
调用，但仍可显式调用。正在运行的 AgentSession 不会被静默重启，新会话、恢复会话
或显式资源 reload 后生效。

错误：

- `400 VALIDATION_ERROR`
- `409 SKILL_INSTALL_BUSY`
- `500 SKILL_INSTALL_FAILED`

## 11. SSE 通用行为

Agent、OAuth 和 File Watch 使用相同的 SSE Transport。

响应 Header：

```http
Cache-Control: no-cache, no-transform
Connection: keep-alive
Content-Type: text/event-stream; charset=utf-8
X-Accel-Buffering: no
```

每个事件格式：

```text
event: <eventName>
data: <JSON>

```

事件名：

| API | eventName |
| --- | --- |
| Agent Events | `agent` |
| OAuth Login | `oauth` |
| File Watch | `file` |

每 25 秒发送 Heartbeat 注释。客户端关闭连接后，服务端会：

1. 清除 Heartbeat。
2. 调用订阅 Cleanup。
3. Abort 内部 Signal。
4. 关闭 Stream。

## 12. 完整 Agent 调用示例

### 12.1 创建 Session

```bash
curl -X POST http://localhost:3000/api/agent/new \
  -H "Content-Type: application/json" \
  -d '{
    "cwd": "C:\\workspace\\project",
    "message": "分析这个项目",
    "provider": "new-api",
    "modelId": "qwen3-coder-next"
  }'
```

返回：

```json
{
  "sessionId": "019e..."
}
```

### 12.2 订阅事件

```bash
curl -N http://localhost:3000/api/agent/019e.../events
```

### 12.3 发送后续 Prompt

```bash
curl -X POST http://localhost:3000/api/agent/019e... \
  -H "Content-Type: application/json" \
  -d '{
    "type": "prompt",
    "message": "继续，并运行测试"
  }'
```

### 12.4 页面恢复

先获取磁盘 Session：

```http
GET /api/sessions/019e...?includeState=true
```

再订阅：

```http
GET /api/agent/019e.../events
```

订阅会在 Runtime 不存在时从 Session 文件恢复。

## 13. 当前已知限制

1. API 没有面向公网的身份认证和访问控制。
2. Runtime Registry、Workspace Roots 和 OAuth Pending Input 都保存在单进程内存中。
3. 服务重启后 Runtime Snapshot 变为未加载，但 Session 仍可从磁盘恢复。
4. 普通成功响应没有统一 `{ success, data }` 包装，只有错误响应统一包装。
5. 无业务返回值的 Agent Command 统一返回 `{ "success": true }`。
6. Model Test 会执行真实模型请求，可能产生费用。
7. Models Config PUT 是完整覆盖，不是增量更新。
8. 当前 Agent Runtime 没有公开资源热重载命令，Skill 设置在新建、恢复或已有
   reload 能力的 Session 中生效。
9. File API 仅过滤 `.git`、`.next`、`node_modules`，没有读取 `.gitignore`。
10. 文本读取固定使用 UTF-8，没有编码探测。
11. Range 只支持一个显式区间，不支持多 Range 和标准后缀区间语义。
12. 当前默认模型是可用模型列表第一项，不是持久化的用户默认选择。

## 14. 实现位置

| 内容 | 目录 |
| --- | --- |
| Next.js Route Handler | `src/app/api` |
| HTTP JSON 和错误转换 | `src/server/transport/http` |
| SSE Transport | `src/server/transport/sse` |
| Application Service | `src/server/application` |
| Domain Contracts | `src/server/domain` |
| Port Interfaces | `src/server/ports` |
| Pi SDK、文件系统和进程适配器 | `src/server/infrastructure` |
| 依赖组装 | `src/server/composition/container.ts` |
