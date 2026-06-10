# ModelsConfig 组件 — 完整复刻规范

> 本文档描述 `src/features/models-config` 的全部 UI 布局、交互行为、样式参数与数据流。供在另一个项目中通过 AI 按本文档精确复刻。
>
> **服务端合同说明：** 本文档中的 Server API 以当前项目
> `src/app/api`、`src/server/transport`、`src/server/application`、
> `src/server/ports` 和 `src/server/infrastructure` 的实现为准。
> UI 需要适配现有 API，不应为了复刻旧组件而绕过或改变当前分层架构。

---

## 1. 概述

`ModelsConfig` 是一个配置 AI 模型 Provider 的模态弹窗组件。功能包括：

- **自定义 Provider 管理**：增删改 Provider（Base URL、API Key、API 类型等）
- **模型管理**：在 Provider 下添加/删除/编辑模型（ID、名称、推理、图片输入、Token 限制、成本、Thinking Level 映射等）
- **模型连接测试**：发送 POST 请求测试模型连通性
- **OAuth 登录管理**：通过 SSE 流处理多阶段 OAuth 登录流程（标准 OAuth、Device Code、Prompt、Select）
- **API Key 管理**：为预定义 Provider 配置 API Key
- **Provider 选择器**：搜索筛选 + 分类展示（Custom / Subscriptions / API Key）

---

## 2. 整体布局架构

```
┌─ 固定遮罩层 (fixed inset-0, z-1000, rgba(0,0,0,0.35)) ─────────────┐
│                                                                      │
│   ┌─ 弹窗容器 (860px × 78vh, 居中, 圆角10, 阴影) ─────────────────┐  │
│   │                                                                │  │
│   │  ┌─ Header ───────────────────────────────────────────────┐   │  │
│   │  │ 标题 "Models"  +  文件路径  +  关闭按钮(×)              │   │  │
│   │  └──────────────────────────────────────────────────────────┘   │  │
│   │                                                                │  │
│   │  ┌─ Body (flex, overflow:hidden) ────────────────────────┐   │  │
│   │  │  ┌─ 左侧: 导航树 (210px)  │  右侧: 详情面板 (flex:1) │   │  │
│   │  │  │                         │                         │   │  │
│   │  │  │  OAuth Providers        │  ProviderDetail         │   │  │
│   │  │  │  API Key Providers      │  ModelDetail            │   │  │
│   │  │  │  ── 分隔线 ──           │  OAuthDetail            │   │  │
│   │  │  │  Custom Providers       │  ApiKeyDetail           │   │  │
│   │  │  │    ├─ Provider 行      │  (或空状态提示)          │   │  │
│   │  │  │    ├─ Model 行         │                         │   │  │
│   │  │  │    └─ + model          │                         │   │  │
│   │  │  │                         │                         │   │  │
│   │  │  │  + Add provider        │                         │   │  │
│   │  │  └─────────────────────────┴─────────────────────────┘   │  │
│   │  └──────────────────────────────────────────────────────────┘   │  │
│   │                                                                │  │
│   │  ┌─ Footer ───────────────────────────────────────────────┐   │  │
│   │  │ [错误信息]                    [Cancel] [Save]          │   │  │
│   │  └──────────────────────────────────────────────────────────┘   │  │
│   │                                                                │  │
│   └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 遮罩层交互
- 点击遮罩层（`e.target === e.currentTarget`）触发 `onClose()`
- 背景色：`rgba(0,0,0,0.35)`
- `z-index: 1000`

### 弹窗容器样式
- `width: 860px`, `height: 78vh`
- `background: var(--bg)`
- `border: 1px solid var(--border)`
- `border-radius: 10`
- `box-shadow: 0 8px 32px rgba(0,0,0,0.18)`
- `overflow: hidden`
- `display: flex`, `flex-direction: column`

---

## 3. 数据类型定义（TypeScript）

### 3.1 基础类型

```typescript
// Provider 图标组件类型
type IconComponent = React.ComponentType<{
  size?: number | string;
  style?: React.CSSProperties;
}>;

// 常量
const API_OPTIONS = [
  "openai-completions",
  "openai-responses",
  "anthropic-messages",
  "google-generative-ai",
] as const;

// Thinking Level 常量
const THINKING_LEVELS = [
  "off", "minimal", "low", "medium", "high", "xhigh"
] as const;
type ThinkingLevel = typeof THINKING_LEVELS[number];
```

### 3.2 实体类型

```typescript
interface OAuthProvider {
  id: string;
  name: string;
}

interface ApiKeyProvider {
  id: string;
  name: string;
}

interface ApiKeyStatus {
  configured: boolean;
  source?: string;
  label?: string;
}

// 前端组合视图，不是服务端单个接口的直接响应。
interface ApiKeyProviderView extends ApiKeyProvider, ApiKeyStatus {
  modelCount: number;
}

interface ModelEntry {
  id: string;
  name?: string;
  api?: string;         // API override，可选
  reasoning?: boolean;  // 是否支持推理/思考
  thinkingLevelMap?: Record<string, string | null>;
  input?: string[];     // 如 ["text", "image"]
  contextWindow?: number;
  maxTokens?: number;
  cost?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  compat?: Record<string, unknown>;
}

interface ProviderEntry {
  baseUrl?: string;
  api?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  compat?: Record<string, unknown>;
  models?: ModelEntry[];
  modelOverrides?: Record<string, unknown>;
}

interface ModelsJson {
  providers?: Record<string, ProviderEntry>;
}
```

### 3.3 状态类型

```typescript
// OAuth 登录多阶段状态机
type OAuthLoginState =
  | { phase: "idle" }
  | { phase: "connecting" }
  | { phase: "auth"; url: string; instructions?: string }
  | { phase: "device_code"; userCode: string; verificationUri: string;
      intervalSeconds?: number; expiresInSeconds?: number }
  | { phase: "prompt"; message: string; placeholder?: string;
      allowEmpty?: boolean; token: string }
  | { phase: "select"; message: string;
      options: { id: string; label: string }[]; token: string }
  | { phase: "progress"; message: string }
  | { phase: "success" }
  | { phase: "error"; message: string };

// 模型连接测试状态
type ModelTestState =
  | { phase: "idle" }
  | { phase: "testing" }
  | { phase: "success"; latencyMs?: number; responseText?: string }
  | { phase: "error"; message: string; latencyMs?: number };

// 当前选中项
type Selection =
  | { type: "provider"; name: string }
  | { type: "model"; providerName: string; index: number }
  | { type: "oauth"; providerId: string }
  | { type: "apikey"; providerId: string };
```

---

## 4. CSS 变量系统

本文档中所有 `var(--xxx)` 引用使用以下 CSS 自定义属性：

| 变量名 | 用途 |
|--------|------|
| `--bg` | 主背景色 |
| `--bg-panel` | 面板背景色 |
| `--bg-hover` | hover 时的背景色 |
| `--bg-selected` | 选中项背景色 |
| `--border` | 边框颜色 |
| `--text` | 主文本色 |
| `--text-muted` | 次要文本 |
| `--text-dim` | 更淡的文本 |
| `--accent` | 主题强调色（按钮、激活态） |
| `--font-mono` | 等宽字体 |

---

## 5. 全局工具组件

### 5.1 Field — 表单字段包装器

```
<div flex flex-col gap-4px>
  <label fontSize:11px color:var(--text-muted) fontWeight:500>
  {children}
</div>
```

### 5.2 inputStyle — 基础输入框样式对象

```typescript
const inputStyle = {
  padding: "6px 9px",
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  color: "var(--text)",
  fontSize: 12,
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};
```

### 5.3 TextInput

- 基于 `<input>`，受控组件
- 样式：`{ ...inputStyle, fontFamily: mono ? "var(--font-mono)" : "inherit" }`
- `mono` prop 为 true 时等宽字体

### 5.4 SecretTextInput — 密码显示切换输入框

**Props:** `value`, `onChange`, `placeholder`, `mono`, `onKeyDown`, `autoComplete="off"`, `spellCheck=false`, `style`

**结构：**
```
<div position:relative width:100%>
  <input type={visible ? "text" : "password"} />
  <button position:absolute right:5px top:50% transform:translateY(-50%)
          width:24 height:24 padding:0 border:none background:transparent
          color:var(--text-dim) cursor:pointer
          display:flex alignItems:center justifyContent:center>
    {visible ? 眼睛关闭图标 : 眼睛开启图标}
  </button>
</div>
```

**行为：**
- 内部 `useState` 控制 `visible` 状态
- `useEffect`: 当 `value` 为空字符串时，自动将 `visible` 设为 `false`
- 输入框右侧内边距 `paddingRight: 34` 为按钮留出空间

**眼睛图标 SVG：**
- 眼睛开启（显示密码）：
  ```svg
  width="15" height="15" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" strokeWidth="2"
  strokeLinecap="round" strokeLinejoin="round"
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
  <circle cx="12" cy="12" r="3" />
  ```
- 眼睛关闭（隐藏密码）：
  ```svg
  width="15" height="15" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" strokeWidth="2"
  strokeLinecap="round" strokeLinejoin="round"
  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12a18.45 18.45 0 0 1 5.06-6.94" />
  <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a18.5 18.5 0 0 1-2.16 3.19" />
  <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
  <path d="M1 1l22 22" />
  ```

### 5.5 NumInput

- `<input type="number">`
- 样式：`inputStyle`

### 5.6 Select

**Props:** `value`, `onChange`, `options: readonly string[]`, `required?: boolean`

**结构：**
- `<select>` 样式：`{ ...inputStyle, color: value ? "var(--text)" : "var(--text-dim)" }`
- 非 `required` 时第一个 option 为 `"— inherit / none —"`
- 其余 options 按数组渲染

### 5.7 Check — 复选框

**Props:** `label`, `checked`, `onChange`

**结构：**
```
<label display:flex alignItems:center gap:6px cursor:pointer
       fontSize:12px color:var(--text-muted)>
  <input type="checkbox" width:13 height:13 accentColor:var(--accent) />
  {label}
</label>
```

### 5.8 SectionTitle

```
<div fontSize:11px fontWeight:600 color:var(--text-dim)
     textTransform:uppercase letterSpacing:0.06em marginBottom:2px>
  {children}
</div>
```

---

## 6. 主组件 ModelsConfig

### 6.1 State

```typescript
const [config, setConfig] = useState<ModelsJson>({ providers: {} });
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);
const [savedOk, setSavedOk] = useState(false);
const [selection, setSelection] = useState<Selection | null>(null);
const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
const [apiKeyProviders, setApiKeyProviders] = useState<ApiKeyProviderView[]>([]);
const [pickerOpen, setPickerOpen] = useState(false);
```

### 6.2 初始化流程

1. `useEffect` 挂载时：
   - `GET /api/models-config` → 响应直接是配置对象，不带 `data` 包装
   - 将非对象或缺少 `providers` 的配置规范化为 `{ providers: {} }`
   - 如果 providers 非空，默认选中第一个 provider
   - 出错则 `setConfig({ providers: {} })`
   - `setLoading(false)`
   - 同时加载 Provider、API Key 状态和可用模型

2. `GET /api/auth/all-providers` 的响应为：

   ```ts
   {
     oauth: Array<{ id: string; name: string }>;
     apiKey: Array<{ id: string; name: string }>;
   }
   ```

   使用 `d.oauth` 更新 OAuth 列表，使用 `d.apiKey` 作为 API Key Provider
   基础列表。`GET /api/auth/providers` 也可单独取得 OAuth 数组，但响应本身
   就是数组，不是 `{ providers: ... }`。

3. 对每个 API Key Provider 调用
   `GET /api/auth/api-key/${encodeURIComponent(id)}` 获取
   `{ configured, source?, label? }`。

4. `GET /api/models` 返回 `{ models, defaultModel }`。按 `model.provider`
   统计 `modelCount`，再与 API Key Provider 和状态组合成
   `ApiKeyProviderView`。

5. 当前 OAuth Provider 响应不包含 `loggedIn` 或
   `usesCallbackServer`。UI 不得假定服务端提供登录状态。

### 6.3 Provider 管理函数

**addCustomProvider:**
- 自动生成唯一名称：`new-provider`, `new-provider-1`, `new-provider-2`...
- 新 Provider 默认 `api: "openai-completions"`
- 添加到 config，并选中该 provider

**renameProvider(oldName, newName):**
- 保持 providers 对象的键顺序不变，仅替换对应键名
- 同步更新 `selection` 中引用的名称

**deleteProvider(name):**
- 从 config 中删除
- 自动切换到剩余的第一个 provider，无剩余则 `setSelection(null)`

**updateProvider(name, p):**
- 直接替换对应 provider 数据

### 6.4 Model 管理函数

**addModel(providerName):**
- 向指定 provider 的 models 数组追加 `{ id: "" }`
- 自动选中新添加的 model

**updateModel(providerName, index, m):**
- 替换指定位置的 model

**removeModel(providerName, index):**
- 删除指定位置 model，models 数组为空时设为 `undefined`
- 删除后选中该 provider（`{ type: "provider", name }`）

### 6.5 Save 逻辑

- `PUT /api/models-config`
- body: `JSON.stringify(config)`
- 请求体必须是 JSON Object；数组、`null` 或非法 JSON 返回
  `400 VALIDATION_ERROR`
- 成功响应固定为 `{ success: true }`
- 成功：`setSavedOk(true)`，2秒后自动重置
- 失败：从标准错误结构
  `{ success: false, error: { code, message, details? } }`
  读取 `error.message`

### 6.6 选中项 → 详情面板映射

```
selection.type === "oauth"      → OAuthDetail
selection.type === "apikey"     → ApiKeyDetail
selection.type === "provider"   → ProviderDetail
selection.type === "model"      → ModelDetail
null / no match                 → 空状态: "Select a provider or model"
```

---

## 7. Header（弹窗顶部）

```
<div display:flex alignItems:center justifyContent:space-between
     padding:12px 18px borderBottom:1px solid var(--border) flexShrink:0>
  <div display:flex alignItems:baseline gap:10px>
    <span fontSize:15 fontWeight:700 color:var(--text)>Models</span>
    <code fontSize:11 color:var(--text-muted) fontFamily:var(--font-mono)>
      ~/.pi/agent/models.json
    </code>
  </div>
  <button onClick={onClose}
          background:none border:none color:var(--text-muted)
          cursor:pointer fontSize:20 lineHeight:1 padding:2px 6px>
    ×
  </button>
</div>
```

---

## 8. 左侧面板 — 导航树

**容器样式：**
- `width: 210px`
- `border-right: 1px solid var(--border)`
- `display: flex`, `flex-direction: column`, `flex-shrink: 0`
- `background: var(--bg-panel)`

### 8.1 树内容区域

- `flex: 1`, `overflow-y: auto`, `padding: 8px 6px`

### 8.2 OAuth Provider 行

当前 API 不返回 OAuth 登录状态，因此显示全部 `oauthProviders`，不能使用
`p.loggedIn` 过滤。若需要表达状态，只能展示当前弹窗生命周期内的本地登录结果，
不能将其当作持久化服务端状态。

**每个行：**
```
<div onClick={() => setSelection({ type: "oauth", providerId: p.id })}
     display:flex alignItems:center gap:7px
     padding:5px 8px borderRadius:5 cursor:pointer
     background: isSelected ? "var(--bg-selected)" : "none">
  <ProviderIcon id={p.id} size={16} />
  <span fontSize:12 color:var(--text)
        flex:1 overflow:hidden textOverflow:ellipsis whiteSpace:nowrap>
    {p.name}
  </span>
</div>
```

**Hover 行为：**
- `onMouseEnter`: 如果未选中，`background = "var(--bg-hover)"`
- `onMouseLeave`: 如果未选中，`background = "none"`

### 8.3 API Key Provider 行

与 OAuth 行结构相同，使用 `p.name` 显示文本，`type: "apikey"` 选中。
`configured`、`source` 和 `label` 来自单独的 API Key 状态请求。

### 8.4 分隔线

当 `(oauthProviders.length > 0 || apiKeyProviders.length > 0) &&
providers.length > 0` 时显示：
```
<div margin:4px 8px borderTop:1px solid var(--border) />
```

### 8.5 Custom Provider 树

每个 Provider 块结构：
```
<div marginBottom:2px>
  <!-- Provider 行 -->
  <div onClick={() => setSelection({ type: "provider", name: pName })}
       padding:7px 8px borderRadius:5 cursor:pointer
       background: isProviderSelected ? "var(--bg-selected)" : "none">
    <svg>服务器图标</svg>
    <span fontSize:12 fontWeight:{isProviderSelected ? 600 : 400}
          color:var(--text) fontFamily:var(--font-mono)>
      {pName}
    </span>
  </div>

  <!-- Model 行（缩进 26px） -->
  {models.map((m, i) => (
    <div onClick={() => setSelection({ type: "model", providerName: pName, index: i })}
         padding:5px 8px 5px 26px borderRadius:5 cursor:pointer>
      <span fontSize:11 fontFamily:var(--font-mono)
            color: m.id ? "var(--text-muted)" : "var(--text-dim)">
        {m.id || "new model"}
      </span>
      {m.reasoning && <span>"T" badge</span>}
    </div>
  ))}

  <!-- + model 按钮 -->
  <div onClick={(e) => { e.stopPropagation(); addModel(pName); }}
       padding:4px 8px 4px 26px borderRadius:5 cursor:pointer
       color:var(--text-dim)>
    <span fontSize:11>+ model</span>
  </div>
</div>
```

**Provider 行图标（服务器）：**
```svg
width="11" height="11" viewBox="0 0 24 24"
fill="none" stroke="currentColor" strokeWidth="2"
strokeLinecap="round" strokeLinejoin="round"
style={{ color: "var(--text-dim)", flexShrink: 0 }}
<rect x="4" y="4" width="16" height="16" rx="2" />
<rect x="9" y="9" width="6" height="6" />
<line x1="9" y1="1" x2="9" y2="4" />
<line x1="15" y1="1" x2="15" y2="4" />
<line x1="9" y1="20" x2="9" y2="23" />
<line x1="15" y1="20" x2="15" y2="23" />
<line x1="20" y1="9" x2="23" y2="9" />
<line x1="20" y1="14" x2="23" y2="14" />
<line x1="1" y1="9" x2="4" y2="9" />
<line x1="1" y1="14" x2="4" y2="14" />
```

**Model 行 T Badge：**
```
<span fontSize:9 padding:1px 4px
      background:"rgba(99,102,241,0.12)" color:"rgba(99,102,241,0.8)"
      borderRadius:3 flexShrink:0>
  T
</span>
```

### 8.6 "+ Add provider" 按钮

```
<div borderTop:1px solid var(--border) padding:8px 6px>
  <button onClick={() => setPickerOpen(true)}
          display:flex alignItems:center justifyContent:center gap:5px
          width:100% padding:6px 0
          background:none border:1px dashed var(--border) borderRadius:5
          color:var(--text-muted) cursor:pointer fontSize:12>
    + Add provider
  </button>
</div>
```

**Hover：**
- `borderColor` → `var(--accent)`
- `color` → `var(--accent)`

---

## 9. 右侧详情面板

**容器：**
- `flex: 1`, `overflow-y: auto`, `padding: 20px`

**空状态（未选中任何项）：**
```
<div height:100% display:flex alignItems:center justifyContent:center
     color:var(--text-dim) fontSize:13>
  Select a provider or model
</div>
```

---

## 10. ProviderDetail 组件

**Props:** `{ name, provider, onChange, onRename, onDelete }`

**布局：** `flex-direction: column`, `gap: 16px`

### 10.1 头部

```
<div display:flex alignItems:center justifyContent:space-between>
  <SectionTitle>Provider</SectionTitle>
  <button onClick={onDelete}
          padding:3px 8px background:none
          border:1px solid rgba(239,68,68,0.3) borderRadius:4
          color:#ef4444 cursor:pointer fontSize:11>
    Delete
  </button>
</div>
```

### 10.2 字段

| 字段 | 组件 | 说明 |
|------|------|------|
| Provider name | TextInput (mono) | 本地编辑状态 `editingName`，值变化后出现 "Rename" 按钮 |
| Base URL | TextInput (mono) | placeholder: `"https://api.example.com/v1"` |
| API Key | SecretTextInput (mono) | placeholder: `"ENV_VAR_NAME, !shell-command, or literal key"` |
| API | Select (required) | 选项 `API_OPTIONS`，默认 `"openai-completions"` |

**API Key 下方提示文本：**
```
<span fontSize:10 color:var(--text-dim) marginTop:2>
  Prefix with <code>!</code> to run a shell command, or use an env var name
</span>
```

**Rename 按钮（仅在 `editingName !== name && editingName.trim()` 时显示）：**
```
<button marginTop:4 padding:3px 10px background:var(--accent) border:none
        borderRadius:4 color:#fff cursor:pointer fontSize:11
        alignSelf:flex-start>
  Rename
</button>
```

### 10.3 useEffect 自动设置默认 API

```typescript
useEffect(() => {
  if (!provider.api) onChange({ ...provider, api: "openai-completions" });
}, [provider.api]);
```

---

## 11. ThinkingLevelMapEditor 组件

**Props:** `{ value?: Record<string, string | null>, onChange }`

**颜色映射：**
```typescript
const LEVEL_COLORS: Record<ThinkingLevel, string> = {
  off:     "var(--text-dim)",
  minimal: "#6b7280",
  low:     "#60a5fa",
  medium:  "#a78bfa",
  high:    "#f472b6",
  xhigh:   "#fb923c",
};
```

### 11.1 布局

- `flex-direction: column`, `gap: 2px`
- 每个 level 一行：`display: flex`, `alignItems: center`, `gap: 8px`, `padding: 5px 4px`

### 11.2 每行结构

```
<div key={level}
     display:flex alignItems:center gap:8px
     padding:5px 4px borderRadius:6
     background:transparent border:1px solid transparent>

  <!-- 左侧: Level 标识 -->
  <div display:flex alignItems:center gap:5px width:68 flexShrink:0>
    <span width:6 height:6 borderRadius:50% background:{color}
          flexShrink:0 opacity: state === "null" ? 0.3 : 1 />
    <span fontSize:11 fontFamily:var(--font-mono)
          color: state === "null" ? "var(--text-dim)" : "var(--text-muted)"
          textDecoration: state === "null" ? "line-through" : "none">
      {level}
    </span>
  </div>

  <!-- 中间: Default + Disabled 按钮组 -->
  <div display:flex borderRadius:5 border:1px solid var(--border)
       overflow:hidden flexShrink:0>
    <button onClick={() => setLevel(level, "omit")}
            style={btnBase + (state === "omit" ? btnActive : {})}>
      Default
    </button>
    <button onClick={() => setLevel(level, null)}
            style={btnBase + borderLeft + (state === "null" ? btnActiveDisabled : {})}>
      Disabled
    </button>
  </div>

  <!-- 右侧: Custom 按钮 + 输入框 -->
  <div display:flex borderRadius:5
       border: `1px solid ${state === "string" ? "var(--accent)" : "var(--border)"}`
       overflow:hidden transition:border-color 0.1s>
    <button onClick={() => setLevel(level, strVal || level)}
            style={btnBase + (state === "string" ? btnActive : {}) + borderRight}>
      Custom
    </button>
    <input value={strVal}
           onChange={(e) => setLevel(level, e.target.value)}
           onFocus={() => { if (state !== "string") setLevel(level, strVal || level); }}
           placeholder={level} maxLength={10}
           style={{ width: "12ch", ... }} />
  </div>
</div>
```

### 11.3 按钮基础样式

```typescript
const btnBase: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 400,
  transition: "background 0.1s, color 0.1s",
  whiteSpace: "nowrap",
  background: "var(--bg-panel)",
  color: "var(--text-dim)",
};

const btnActive: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 600,
};

const btnActiveDisabled: React.CSSProperties = {
  background: "#ef4444", // 红色
  color: "#fff",
  fontWeight: 600,
};
```

### 11.4 输入框样式

```typescript
{
  width: "12ch",
  background: state === "string" ? "var(--bg)" : "var(--bg-panel)",
  border: "none",
  outline: "none",
  color: state === "string" ? "var(--text)" : "var(--text-dim)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "4px 7px",
  transition: "background 0.1s, color 0.1s",
}
```

### 11.5 三种状态

| 状态 | 条件 | 行为 |
|------|------|------|
| `omit` | `!(level in map)` | 从 map 中删除该 key，不传值 |
| `null` | `map[level] === null` | 显式设为 `null`，表示 disabled，圆点 opacity 0.3，文字删除线 |
| `string` | `typeof raw === "string"` | 自定义值，Custom 按钮激活，边框变 accent |

### 11.6 交互细节

- 点击 "Custom" 按钮：将当前值设为 `strVal || level`，激活 string 状态
- 聚焦输入框：如果当前不是 string 状态，自动激活 string 状态
- 当 map 为空对象时，`onChange(undefined)`

---

## 12. ModelDetail 组件

**Props:** `{ providerName, provider, model, config, onChange, onDelete }`

**布局：** `flex-direction: column`, `gap: 16px`

### 12.1 头部

```
<div display:flex alignItems:center justifyContent:space-between>
  <SectionTitle>Model</SectionTitle>
  <div display:flex alignItems:center gap:8px>
    <!-- 测试状态摘要 -->
    {testSummary && <span>...测试状态badge...</span>}
    <!-- Test 按钮 -->
    <button onClick={handleTest}
            disabled={!model.id.trim() || testState.phase === "testing"}
            title="Test model connection">
      {testState.phase === "success" && <Check SVG />}
      {testState.phase === "testing" ? "Testing…" :
       testState.phase === "success" ? "OK" : "Test"}
    </button>
    <!-- Remove 按钮 -->
    <button onClick={onDelete}>Remove</button>
  </div>
</div>
```

### 12.2 Test 按钮样式状态机

| 状态 | 背景 | 边框 | 文字色 | 说明 |
|------|------|------|--------|------|
| success | `#16a34a` | `1px solid #16a34a` | `#fff` | 带绿色对勾 SVG |
| disabled | `none` | `1px solid var(--border)` | `var(--text-dim)` | 无 model.id 或测试中 |
| default | `none` | `1px solid var(--border)` | `var(--text-muted)` | 可点击 |

**测试状态 Badge：**
```
<span title={testSummary}
      maxWidth:260 height:24 padding:0 8px
      border: 1px solid {color}
      borderRadius:4 background:{bgColor} color:#111827
      fontSize:11 display:inline-flex alignItems:center
      whiteSpace:nowrap overflow:hidden textOverflow:ellipsis
      boxSizing:border-box>
  {testSummary}
</span>
```

| testState.phase | 边框色 | 背景色 |
|-----------------|--------|--------|
| error | `#fecaca` | `#fee2e2` |
| success | `#bbf7d0` | `#dcfce7` |
| testing | `var(--border)` | `#e5e7eb` |

**测试状态摘要文本 `testSummary`：**
- `idle` → `null`（不显示）
- `testing` → `"Testing model connection..."`
- `success` → `"Connected · {latencyMs}ms · {responseText}"`
- `error` → `"Failed · {latencyMs}ms · {message}"`

当前模型测试实现不返回上游 HTTP 状态码。`status` 不应作为测试成功或失败
结果的一部分展示；仅当 `/api/models-config/test` 自身返回非 2xx 时，可显示该
Route Handler 的 HTTP 状态。

### 12.3 测试逻辑

```typescript
const handleTest = useCallback(async () => {
  if (!model.id.trim() || testState.phase === "testing") return;
  setTestState({ phase: "testing" });
  try {
    const res = await fetch("/api/models-config/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerName,
        modelId: model.id.trim(),
        config,
        timeoutMs: 15_000,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      setTestState({
        phase: "error",
        message: d.error?.message ?? `HTTP ${res.status}`,
      });
    } else if (!d.ok) {
      setTestState({
        phase: "error",
        message: d.error ?? "Model test failed",
        latencyMs: d.latencyMs,
      });
    } else {
      setTestState({
        phase: "success",
        latencyMs: d.latencyMs,
        responseText: d.responseText,
      });
    }
  } catch (e) {
    setTestState({ phase: "error", message: e.message });
  }
}, [...]);
```

`config` 应是弹窗当前完整配置快照，以便测试尚未保存的 Provider 或 Model。
测试接口会在临时目录写入该配置，不会覆盖真实的 `~/.pi/agent/models.json`。
测试会发起真实模型请求，可能产生费用。

**测试状态重置时机：** `useEffect` 监听 `[providerName, provider.baseUrl, provider.api, provider.apiKey, model.id, model.api]`，任一变化重置为 `idle`。

### 12.4 模型字段

| 区域 | 字段 | 组件 | 说明 |
|------|------|------|------|
| Row 1 (2列) | ID * | TextInput (mono) | 必填 |
| Row 1 (2列) | Name | TextInput | 显示名 |
| Row 2 | API override | Select | options = API_OPTIONS，非 required |
| Row 3 | Reasoning / thinking | Check | |
| Row 3 | Image input | Check | 选中时 `input: ["text", "image"]`，否则 undefined |
| **条件显示** | DeepSeek thinking compat | Check | 仅当 `model.reasoning === true` |
| **条件显示** | Thinking level map | ThinkingLevelMapEditor | 仅当 reasoning，带 clear all 按钮 |
| Row 4 (2列) | Context window | NumInput | placeholder: "128000" |
| Row 4 (2列) | Max output tokens | NumInput | placeholder: "16384" |
| Cost | input/output/cacheRead/cacheWrite | NumInput (4列) | SectionTitle: "Cost (per million tokens)" |

**两列布局：** `display: grid`, `gridTemplateColumns: "1fr 1fr"`, `gap: 10px`

**四列成本布局：** `display: grid`, `gridTemplateColumns: "1fr 1fr 1fr 1fr"`, `gap: 8px`, `marginTop: 8px`

### 12.5 DeepSeek 兼容模式

```typescript
const DEEPSEEK_COMPAT = {
  thinkingFormat: "deepseek",
  requiresReasoningContentOnAssistantMessages: true,
} as const;

// 勾选时：model.compat = { ...model.compat, ...DEEPSEEK_COMPAT }
// 取消时：删除 compat 中的 thinkingFormat 和 requiresReasoningContentOnAssistantMessages
```

---

## 13. OAuthDetail 组件

**Props:** `{ provider: OAuthProvider, onRefresh: () => void }`

当前服务端 Provider DTO 只有 `id` 和 `name`，不包含 `loggedIn`。组件可以在
本次登录成功后维护本地 `connected` 状态，但重新打开弹窗后不能从当前 API
恢复该状态。

### 13.1 State

```typescript
const [loginState, setLoginState] = useState<OAuthLoginState>({ phase: "idle" });
const [inputValue, setInputValue] = useState("");
const eventSourceRef = useRef<EventSource | null>(null);
const inputRef = useRef<HTMLInputElement>(null);
```

### 13.2 生命周期

- **Provider 切换时：** `setLoginState({ phase: "idle" })`, `setInputValue("")`, 关闭旧 EventSource
- **auth/prompt 阶段：** `setTimeout(() => inputRef.current?.focus(), 50)`
- **组件卸载：** 关闭 EventSource

### 13.3 登录流程（SSE 事件流）

**handleLogin():**
1. 关闭旧 EventSource
2. `setLoginState({ phase: "connecting" })`
3. 创建 `EventSource(\`/api/auth/login/\${encodeURIComponent(provider.id)}\`)`
4. 服务端发送的是命名 SSE 事件 `oauth`，必须使用
   `es.addEventListener("oauth", handler)` 监听；不能只使用 `onmessage`

| data.type | 行为 |
|-----------|------|
| `auth` | `setLoginState({ phase: "auth", url, instructions })`，自动 `window.open(url, "_blank", "noopener,noreferrer")` |
| `device_code` | `setLoginState({ phase: "device_code", userCode, verificationUri, ... })`，自动 `window.open(verificationUri, "_blank", ...)` |
| `prompt` | `setLoginState({ phase: "prompt", message, placeholder, token })` |
| `select` | `setLoginState({ phase: "select", message, options, token })` |
| `progress` | `setLoginState({ phase: "progress", message })` |
| `complete` | `es.close()`, `setLoginState({ phase: "success" })`, `onRefresh()` |
| `error` | `es.close()`, `setLoginState({ phase: "error", message })` |

**onerror:** `es.close()`, 如果之前不是 success 则设为 error("Connection lost")

**submitInput(token, value):**
- `POST /api/auth/login/${provider.id}`
- body: `{ token, value: value.trim() }`
- 发送后设 `progress("Verifying…")`

**submitSelection(token, value):**
- 使用相同的 `{ token, value }`，`value` 为选中的 option id

`auth` 事件本身没有 `token`，只包含 `url` 和可选的 `instructions`。如果底层
OAuth 流需要人工输入 callback URL 或授权码，服务端会随后发送独立的
`prompt` 事件。

### 13.4 各阶段 UI

**头部：**
```
<div display:flex alignItems:center justifyContent:space-between>
  <SectionTitle>Subscription</SectionTitle>
  <div display:flex alignItems:center gap:6px>
    <span width:7 height:7 borderRadius:50%
          background: locallyConnected ? "#4ade80" : "var(--border)" />
    <span fontSize:11
          color: locallyConnected ? "#4ade80" : "var(--text-dim)">
      {locallyConnected ? "connected in this dialog" : "status unavailable"}
    </span>
  </div>
</div>
```

**状态区域容器：** `minHeight: 48px`

| phase | UI |
|-------|-----|
| `idle` | 说明文本：`"Connect or reconnect your {name} account."` |
| `connecting` | "Opening browser…" |
| `select` | 消息文本 + 选项按钮列表，每项：`padding:6px 9px`, `background:var(--bg)`, `border:1px solid var(--border)`, `text-align:left` |
| `auth` | 说明文本 + 可点击的登录链接 + 输入框（placeholder: callback URL）+ Submit 按钮 |
| `prompt` | 消息文本 + 输入框（placeholder 来自 data）+ Submit 按钮 |
| `device_code` | "Open the verification page..." + 大字体代码显示框（fontSize:16, fontWeight:700, fontFamily:mono）+ verificationUri 链接 + 过期提示 |
| `progress` | 消息文本 |
| `success` | "Connected successfully."（绿色 `#4ade80`） |
| `error` | 错误消息（红色 `#f87171`） |

**输入框 + Submit 按钮布局：**
```
<div display:flex gap:6px>
  <input ref={inputRef} flex:1
         padding:6px 9px background:var(--bg) border:1px solid var(--border)
         borderRadius:5 color:var(--text) fontSize:12 fontFamily:var(--font-mono) />
  <button disabled={!inputValue.trim()}
          padding:6px 12px borderRadius:5 fontSize:12 fontWeight:600
          background: inputValue.trim() ? "var(--accent)" : "var(--bg-panel)"
          color: inputValue.trim() ? "#fff" : "var(--text-dim)"
          cursor: inputValue.trim() ? "pointer" : "not-allowed">
    Submit
  </button>
</div>
```

**底部操作按钮：**

```typescript
const isWorking = loginState.phase === "connecting" ||
  loginState.phase === "progress" ||
  loginState.phase === "auth" ||
  loginState.phase === "device_code" ||
  loginState.phase === "prompt" ||
  loginState.phase === "select";
```

- **isWorking 时：** 显示 "Cancel" 按钮 → `eventSourceRef.current?.close()`, `setLoginState({ phase: "idle" })`
- **!isWorking 时：**
  - 显示 "Login / Re-login" 按钮
  - 可显示 "Disconnect" 按钮，但当前 API 无法判断它是否已经登录

**Disconnect：** `POST /api/auth/logout/${provider.id}`，然后 `onRefresh()`

---

## 14. ApiKeyDetail 组件

**Props:** `{ provider: ApiKeyProviderView, onRefresh: () => void }`

### 14.1 State

```typescript
const [apiKey, setApiKey] = useState("");
const [saving, setSaving] = useState(false);
const [removing, setRemoving] = useState(false);
const [error, setError] = useState<string | null>(null);
const [savedOk, setSavedOk] = useState(false);
```

### 14.2 Provider 切换时

`setApiKey("")`, `setError(null)`, `setSavedOk(false)`

### 14.3 头部

```
<div display:flex alignItems:center justifyContent:space-between>
  <SectionTitle>API Key</SectionTitle>
  <div display:flex alignItems:center gap:6px>
    <span width:7 height:7 borderRadius:50%
          background: provider.configured ? "#4ade80" : "var(--border)" />
    <span fontSize:11
          color: provider.configured ? "#4ade80" : "var(--text-dim)">
      {provider.configured ? "configured" : "not configured"}
    </span>
  </div>
</div>
```

### 14.4 说明文本

- 已配置：`"API key is stored. Enter a new key below to replace it, or disconnect to remove it."`
- 未配置：`"Enter your {name} API key to enable {modelCount} model(s)."`（注意单复数处理）

### 14.5 API Key 输入区

```
<div display:flex gap:6px>
  <SecretTextInput
    value={apiKey} onChange={setApiKey}
    onKeyDown={(e) => { if (e.key === "Enter" && apiKey.trim()) handleSave(); }}
    placeholder={provider.configured ? "Enter new key to replace…" : "sk-…"}
    style={{ flex: 1 }}
    autoComplete="off" spellCheck={false} mono />
  <button onClick={handleSave}
          disabled={saving || !apiKey.trim() || savedOk}
          padding:6px 12px borderRadius:5 fontSize:12 fontWeight:600
          background: savedOk ? "#16a34a" : apiKey.trim() ? "var(--accent)" : "var(--bg-panel)"
          color: (apiKey.trim() || savedOk) ? "#fff" : "var(--text-dim)"
          cursor: disabled ? "not-allowed" : "pointer">
    {savedOk && <Check SVG />}
    {savedOk ? "Saved" : saving ? "Saving…" : "Save"}
  </button>
</div>
```

### 14.6 Save 逻辑

- `POST /api/auth/api-key/${provider.id}`
- body: `{ apiKey: apiKey.trim() }`
- 成功响应：`{ success: true }`
- 成功：`setApiKey("")`, `setSavedOk(true)`, 2秒后 `setSavedOk(false)`, `onRefresh()`
- 失败：读取标准错误结构中的 `error.message`

### 14.7 Remove 逻辑

- `DELETE /api/auth/api-key/${provider.id}`
- 成功响应：`{ success: true }`
- 成功：`onRefresh()`
- 条件：仅当 `provider.configured === true` 时显示 Remove 按钮

**Remove 按钮样式：**
```
<button alignSelf:flex-start padding:5px 12px
        background:none border:1px solid rgba(239,68,68,0.3)
        borderRadius:5 color:#ef4444
        cursor: removing ? "not-allowed" : "pointer" fontSize:12>
  {removing ? "Removing…" : "Disconnect"}
</button>
```

---

## 15. ProviderIcon 组件

**Props:** `{ id: string, size: number }`

### 15.1 Provider 图标映射表

```typescript
const PROVIDER_ICONS: Record<string, { Icon: IconComponent; hasColor: boolean }> = {
  "anthropic":              { Icon: AnthropicIcon,        hasColor: false },
  "openai":                 { Icon: OpenAIIcon,           hasColor: false },
  "openai-codex":           { Icon: OpenAIIcon,           hasColor: false },
  "google":                 { Icon: GoogleColorIcon,      hasColor: true },
  "google-vertex":          { Icon: GoogleColorIcon,      hasColor: true },
  "deepseek":               { Icon: DeepSeekColorIcon,    hasColor: true },
  "groq":                   { Icon: GroqIcon,             hasColor: false },
  "mistral":                { Icon: MistralColorIcon,     hasColor: true },
  "moonshotai":             { Icon: MoonshotIcon,         hasColor: false },
  "moonshotai-cn":          { Icon: MoonshotIcon,         hasColor: false },
  "moonshot":               { Icon: MoonshotIcon,         hasColor: false },
  "minimax":                { Icon: MinimaxColorIcon,     hasColor: true },
  "minimax-cn":             { Icon: MinimaxColorIcon,     hasColor: true },
  "fireworks":              { Icon: FireworksColorIcon,   hasColor: true },
  "huggingface":            { Icon: HuggingFaceColorIcon, hasColor: true },
  "cerebras":               { Icon: CerebrasColorIcon,    hasColor: true },
  "openrouter":             { Icon: OpenRouterIcon,       hasColor: false },
  "xai":                    { Icon: XAIIcon,              hasColor: false },
  "cloudflare-ai-gateway":  { Icon: CloudflareColorIcon,  hasColor: true },
  "cloudflare-workers-ai":  { Icon: CloudflareColorIcon,  hasColor: true },
  "vercel-ai-gateway":      { Icon: VercelIcon,           hasColor: false },
  "github-copilot":         { Icon: GithubCopilotIcon,    hasColor: false },
  "amazon-bedrock":         { Icon: AwsColorIcon,         hasColor: true },
  "azure-openai-responses": { Icon: AzureColorIcon,       hasColor: true },
  "kimi-coding":            { Icon: KimiColorIcon,        hasColor: true },
  "qwen":                   { Icon: QwenColorIcon,        hasColor: true },
  "zai":                    { Icon: ZhipuColorIcon,       hasColor: true },
  "cohere":                 { Icon: CohereColorIcon,      hasColor: true },
  "perplexity":             { Icon: PerplexityColorIcon,  hasColor: true },
  "together":               { Icon: TogetherColorIcon,    hasColor: true },
  "grok":                   { Icon: GrokIcon,             hasColor: false },
};
```

> **复刻说明：** 图标全部来自 `@lobehub/icons` 包。如果目标项目不使用此包，需要：
> 1. 安装 `@lobehub/icons`
> 2. 或替换为自行准备的 SVG 图标组件
> 3. 保持 `hasColor` 逻辑：`hasColor=true` → 直接渲染（自着色 SVG）；`hasColor=false` → 传递 `style={{ color: "var(--text-muted)" }}`

### 15.2 渲染逻辑

```typescript
function ProviderIcon({ id, size }: { id: string; size: number }) {
  const pi = PROVIDER_ICONS[id];
  if (!pi) return null;
  if (pi.hasColor) return <pi.Icon size={size} />;
  return <pi.Icon size={size} style={{ color: "var(--text-muted)" }} />;
}
```

---

## 16. AddProviderPicker 组件（模态弹窗）

**Props:**
```typescript
interface AddProviderPickerProps {
  oauthProviders: OAuthProvider[];
  apiKeyProviders: ApiKeyProviderView[];
  onSelectOAuth: (id: string) => void;
  onSelectApiKey: (id: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}
```

### 16.1 容器

- 固定遮罩层：`position: fixed, inset: 0, zIndex: 1100`
- 背景：`rgba(0,0,0,0.4)`
- 点击遮罩关闭（`e.target === e.currentTarget`）
- 内容卡片：
  - `width: 820px`, `maxWidth: calc(100vw - 32px)`
  - `maxHeight: min(72vh, calc(100vh - 32px))`
  - `background: var(--bg)`, `border: 1px solid var(--border)`
  - `borderRadius: 10`, `boxShadow: 0 8px 32px rgba(0,0,0,0.22)`
  - `display: flex`, `flex-direction: column`, `overflow: hidden`

### 16.2 搜索栏

```
<div padding:10px 14px borderBottom:1px solid var(--border)
     flexShrink:0 display:flex alignItems:center gap:8px>
  <!-- 搜索图标 -->
  <svg width:13 height:13 viewBox="0 0 24 24"
       fill:none stroke:currentColor strokeWidth:2
       style={{ color: "var(--text-dim)", flexShrink: 0 }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
  <input ref={inputRef} value={search} onChange={...}
         onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
         placeholder="Search providers…"
         style={{ flex:1, background:none, border:none, outline:none,
                  color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
</div>
```

- 挂载后 30ms 自动 focus 输入框

### 16.3 搜索过滤逻辑

```typescript
const q = search.trim().toLowerCase();

const availableOAuth = oauthProviders.filter(
  p => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
);

const availableApiKey = apiKeyProviders.filter(
  p => !p.configured &&
    (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
);

const showCustom = !q || "custom".includes(q) || "openai-compatible".includes(q) || "anthropic-compatible".includes(q);
```

### 16.4 卡片网格

- `flex: 1`, `overflow-y: auto`, `padding: 14px`
- 无结果：居中显示 `"No providers match"`（fontSize:12, color:var(--text-dim)）
- 网格：`display: grid`, `gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))"`, `gap: 8px`

### 16.5 分类标题

```
<div gridColumn:"1 / -1"
     fontSize:10 fontWeight:600 color:var(--text-dim)
     textTransform:uppercase letterSpacing:0.07em>
  {categoryName}
</div>
```

分类顺序：**Custom** → **Subscriptions** → **API Key**

每个分类标题有 `paddingTop: 6px`（除了第一个）

### 16.6 卡片样式

```typescript
const cardStyle: React.CSSProperties = {
  display: "flex", flexDirection: "row", alignItems: "center", gap: 8,
  padding: "10px 12px",
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 7,
  boxSizing: "border-box",
  cursor: "pointer",
  minWidth: 0,
  textAlign: "left",
  transition: "border-color 0.12s, background 0.12s",
  width: "100%",
};
```

**Hover：**
- `borderColor` → `var(--accent)`
- `background` → `var(--bg-hover)`

### 16.7 Custom 卡片

```
<div flex:1 minWidth:0>
  <div fontSize:12 fontWeight:600 color:var(--text)
       lineHeight:1.3 overflow:hidden textOverflow:ellipsis whiteSpace:nowrap>
    OpenAI / Anthropic compatible
  </div>
  <div fontSize:10 color:var(--text-dim) marginTop:2px>
    Custom endpoint format
  </div>
</div>
<span width:26 height:26 borderRadius:5
      background:var(--bg-hover) border:1px dashed var(--border)
      display:flex alignItems:center justifyContent:center flexShrink:0>
  <!-- Plus 图标 -->
  <svg width:13 height:13 viewBox="0 0 24 24"
       fill:none stroke:currentColor strokeWidth:2>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
</span>
```

### 16.8 OAuth 卡片

```
<div flex:1 minWidth:0>
  <div fontSize:12 fontWeight:600 color:var(--text)
       lineHeight:1.3 overflow:hidden textOverflow:ellipsis whiteSpace:nowrap>
    {p.name}
  </div>
  <div fontSize:10 color:var(--text-dim) marginTop:2px>OAuth</div>
</div>
<ProviderIcon id={p.id} size={28} />
```

### 16.9 API Key 卡片

```
<div flex:1 minWidth:0>
  <div fontSize:12 fontWeight:600 color:var(--text)
       lineHeight:1.3 overflow:hidden textOverflow:ellipsis whiteSpace:nowrap>
    {p.name}
  </div>
  <div fontSize:10 color:var(--text-dim) marginTop:2px>{p.modelCount} models</div>
</div>
<ProviderIcon id={p.id} size={28} />
```

---

## 17. Footer（弹窗底部）

```
<div display:flex alignItems:center justifyContent:flex-end gap:10px
     padding:10px 18px borderTop:1px solid var(--border) flexShrink:0>
  {saveError && <span fontSize:12 color:#f87171 flex:1>{saveError}</span>}

  <button onClick={onClose}
          padding:6px 14px background:none
          border:1px solid var(--border) borderRadius:6
          color:var(--text-muted) cursor:pointer fontSize:13>
    Cancel
  </button>

  <button onClick={handleSave} disabled={saving || savedOk}
          position:relative padding:6px 16px minWidth:92
          background: savedOk ? "#16a34a" : saving ? "var(--bg-panel)" : "var(--accent)"
          border:none borderRadius:6
          color: savedOk ? "#fff" : saving ? "var(--text-muted)" : "#fff"
          cursor: (saving || savedOk) ? "default" : "pointer"
          fontSize:13 fontWeight:600
          display:inline-flex alignItems:center justifyContent:center gap:6
          transition: "background-color 0.2s ease, color 0.2s ease"
          animation: savedOk ? "saved-pop 0.45s ease" : undefined>
    {savedOk && (
      <svg width:14 height:14 viewBox="0 0 24 24"
           fill:none stroke:currentColor strokeWidth:3
           style={{ strokeDasharray: 18, animation: "saved-check-draw 0.35s ease forwards" }}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )}
    <span>{savedOk ? "Saved" : saving ? "Saving…" : "Save"}</span>
  </button>
</div>
```

### 17.1 Save 按钮动画

需要定义两个 CSS 动画：

```css
@keyframes saved-pop {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.08); }
  60%  { transform: scale(0.96); }
  100% { transform: scale(1); }
}

@keyframes saved-check-draw {
  from { stroke-dashoffset: 18; }
  to   { stroke-dashoffset: 0; }
}
```

---

## 18. API 接口汇总

| 方法 | 路径 | 用途 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/models-config` | 加载原始配置 | - | `Record<string, unknown>`；读取或解析失败时为 `{}` |
| PUT | `/api/models-config` | 完整覆盖配置 | JSON Object | `{ success: true }` |
| POST | `/api/models-config/test` | 测试模型连接 | `{ provider, modelId, config?, timeoutMs? }` | `TestModelResult` |
| GET | `/api/models` | 获取可用模型并统计 Provider 模型数 | - | `{ models: ModelInfo[], defaultModel }` |
| GET | `/api/auth/providers` | 获取 OAuth Providers | - | `Array<{ id, name }>` |
| GET | `/api/auth/all-providers` | 获取全部 Provider 基础列表 | - | `{ oauth: Array<{ id, name }>, apiKey: Array<{ id, name }> }` |
| GET | `/api/auth/api-key/:providerId` | 获取 API Key 状态 | - | `{ configured, source?, label? }` |
| GET (SSE) | `/api/auth/login/:providerId` | OAuth 登录流 | - | SSE events (见 §13.3) |
| POST | `/api/auth/login/:providerId` | 提交 prompt/select 输入 | `{ token, value }` | `{ success: true }` |
| POST | `/api/auth/logout/:providerId` | OAuth 登出 | - | `{ success: true }` |
| POST | `/api/auth/api-key/:providerId` | 保存 API Key | `{ apiKey: string }` | `{ success: true }` |
| DELETE | `/api/auth/api-key/:providerId` | 删除 API Key | - | `{ success: true }` |

### 18.1 通用错误响应

除模型连通性本身失败返回 HTTP 200 + `{ ok: false, ... }` 外，Route Handler
验证错误和服务端错误统一为：

```ts
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

- 非法 JSON、非对象配置、缺少必填字符串：`400 VALIDATION_ERROR`
- OAuth Provider 不存在：`404 OAUTH_PROVIDER_NOT_FOUND`
- Pending Input 不存在、已消费或 Provider 不匹配：
  `404 PENDING_INPUT_NOT_FOUND`
- 未分类错误：`500 INTERNAL_ERROR`

### 18.2 Models Config 服务端行为

- `GET /api/models-config` 直接读取 `~/.pi/agent/models.json`。
- 文件不存在、JSON 无法解析或读取失败时，当前实现统一返回 `{}`。
- `PUT /api/models-config` 是完整替换，不是 merge。
- 写入使用同目录临时文件，再通过 rename 替换目标文件。
- `/api/models-config/test` 使用临时目录、临时配置、内存 Session、禁用工具和
  自动重试；结束后销毁 Session 并删除临时目录。
- `timeoutMs` 当前仅在 JSON 值为 number 时采用，否则按未提供处理并使用
  `15000`。当前 validator 没有限制正数或最大值，前端必须传入合理的正数。
- 测试接口返回的 `{ ok: false }` 表示模型查找、调用或超时失败，不代表
  Route Handler 本身发生 HTTP 错误。

---

## 19. 完整交互清单

### 19.1 打开/关闭
- 外部调用 `<ModelsConfig onClose={...} />`
- 点击遮罩层关闭
- 点击 Header 的 × 关闭
- Footer Cancel 关闭
- **注意：** Provider Picker（zIndex 1100）打开时，ModelsConfig（zIndex 1000）的遮罩在其下方，Picker 也有独立遮罩

### 19.2 左侧面板
- 点击任意行 → 选中该项，右侧显示对应详情
- 选中项背景色：`var(--bg-selected)`
- 未选中 hover 背景：`var(--bg-hover)`
- 自定义 Provider 名称使用等宽字体 `var(--font-mono)`
- 未命名 model 显示 `"new model"`（灰色 `#var(--text-dim)`）
- reasoning model 显示蓝色 T badge
- 点击 `+ model` → 在该 provider 下添加空 model，自动选中
- 点击 `+ Add provider` → 打开 Picker

### 19.3 ProviderDetail
- Provider name 输入框编辑时，值变化后出现绿色 Rename 按钮
- Base URL、API Key 输入使用等宽字体
- API Select 默认 `"openai-completions"`，未设置时自动补全

### 19.4 ModelDetail
- ID 为空时 Test 按钮禁用
- 任何配置变化（provider/api/model）自动重置测试状态为 idle
- reasoning checkbox 控制 thinking 相关字段显示/隐藏
- DeepSeek compat checkbox 控制 `model.compat` 对象

### 19.5 OAuthDetail
- Login 按钮启动 SSE 连接
- 多阶段状态自动推进（connecting → auth/device_code/prompt/select → progress → success/error）
- 每个阶段有对应的 UI 显示
- Cancel 可随时中断流程
- 本次弹窗内登录成功后显示绿色指示点；重新打开后状态显示为 unavailable

### 19.6 ApiKeyDetail
- API Key 输入支持 Enter 提交
- Save 按钮在保存成功后变绿色并显示对勾，2秒后恢复
- 已配置状态显示绿色指示点

### 19.7 AddProviderPicker
- 实时搜索过滤，支持 Escape 关闭
- OAuth 登录状态不可查询，因此 OAuth Provider 始终可搜索，用于登录或重新登录
- 已配置的 API Key Provider 不显示
- Custom 卡片始终在最上方
- 分类标题区分 Subscriptions 和 API Key
- 卡片 hover 边框变 accent 色

---

## 20. 复刻依赖建议

### 20.1 必须依赖
- React 18+（hooks: `useState`, `useEffect`, `useCallback`, `useRef`）
- 图标库：`@lobehub/icons`（或自行准备替代 SVG）

### 20.2 CSS 变量（需在项目根或全局定义）
确保以下 CSS 变量已定义：
```css
:root {
  --bg: #ffffff;
  --bg-panel: #f9fafb;
  --bg-hover: #f3f4f6;
  --bg-selected: #e5e7eb;
  --border: #e5e7eb;
  --text: #111827;
  --text-muted: #6b7280;
  --text-dim: #9ca3af;
  --accent: #6366f1;  /* 或项目主题色 */
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
```

### 20.3 暗色模式适配
本文档所有样式使用 CSS 变量，只要变量定义包含暗色值，组件即可自动适配。Mono 图标通过 `style={{ color: "var(--text-muted)" }}` 继承当前文字色。

---

## 21. 文件结构建议

复刻时可按以下方式拆分（可选，单文件亦可）：

```
src/features/models-config/
├── models-config-dialog.tsx # ModelsConfig 主组件 + AddProviderPicker
├── ProviderDetail.tsx
├── ModelDetail.tsx
├── ThinkingLevelMapEditor.tsx
├── OAuthDetail.tsx
├── ApiKeyDetail.tsx
├── ProviderIcon.tsx
└── types.ts           # 所有 TypeScript 类型 + constants
```

---

*文档已按当前 `src/features/models-config` 实现和服务端合同修订。*
