# 墨池 2.0

AI 小说生产线原型。旧版 `inkwell-html` 作为资料库保留，本项目从“轻真人、重 AI”的产品逻辑重新开始。

## 核心定位

用户不是打字作者，而是导演/总编：

- 用户提供类型、灵感和最终裁决。
- AI 负责企划、写作、审计、返工、验收和章节记忆。
- 工作流以循环节点表达，不再把功能平铺成大量后台页面。

## MVP 主线

```text
类型/灵感
→ AI 生成企划候选
→ 用户选择方案
→ 创建作品
→ A 模型写作
→ B 模型结构审计
→ A 模型定向修改
→ C 模型 AI 味审计
→ 验收通过
→ 用户读稿批注
→ 有批注则回流修改
→ 用户满意后定稿
→ 生成章节记忆包
```

## 前端原则

- 第一主界面是章节工作流，不是后台仪表盘。
- 读稿批注是独立关卡，人工批注优先级高于 AI 批注。
- 模型、Prompt、日志先附着在节点里，不提前扩散成一堆页面。
- 保证长文阅读舒适，再用图像和品牌资产增强氛围。

## 开发

```powershell
npm install
npm run dev
npm run build
```

## 本地后端

原型后端由 `server/zhuque-server.cjs` 统一承载，默认监听 `http://127.0.0.1:8788`。它现在包含三类能力：

- Orchestrator：候选生成、作品圣经、章节目标、初稿、结构审计、AI 味审计、最终验收、返工、记忆包。
- Zhuque：提交正文检测、获取登录二维码、归档检测报告截图/HTML。
- 配置探测：检查本机 MiniMax 配置线索，不返回 key/token。

启动：

```powershell
npm run backend:server
```

如果只想跑朱雀 mock：

```powershell
npm run backend:server:mock
```

后端启动后，可以跑契约检查：

```powershell
npm run backend:contract
```

前端默认请求 `http://127.0.0.1:8788`。如需改地址，设置：

```powershell
$env:VITE_INKWELL_API_BASE="http://127.0.0.1:8788"
```

当前 Orchestrator 是本地确定性 provider，接口已经按真实后端边界拆好。后续接 DeepSeek、MiniMax 或其他模型时，优先替换后端 provider，不需要重写前端工作流。

## 桌面壳

项目已按 Tauri 2 接入桌面应用壳：

```powershell
npm run desktop:dev
npm run desktop:build
```

当前前端可以继续用浏览器预览；当运行在 Tauri 中时，前端会通过 `src/lib/desktop.ts` 识别 `tauri-desktop` 运行环境。

本机还需要补齐桌面编译环境：

- Rust / Cargo / rustup
- Visual Studio Build Tools，包含 MSVC 和 Windows SDK

确认命令：

```powershell
npm run tauri -- info
```

## Live provider mode

默认后端仍使用 deterministic provider，适合本地开发和 contract 测试。需要启用真实模型时：

```powershell
npm run backend:server:live
```

Live provider 会从本机 OpenClaw 配置中读取已存在的模型配置，只检测 token/key 是否存在，不在接口中返回密钥内容。当前接入的模型池：

- `deepseek/deepseek-v4-pro`
- `minimax-portal/MiniMax-M2.7-highspeed`
- `minimax-portal/MiniMax-M2.7`
- `yunwu/claude-opus-4-7`
- `yunwu/gpt-5.5`

每个 Orchestrator 节点都有本地 fallback：真实模型调用失败、超时或返回格式不合规时，会自动退回 deterministic 结果，并在响应中带 `providerFallback` 说明。

Live end-to-end smoke:

```powershell
npm run backend:server:live
```

Then in another shell:

```powershell
$env:INKWELL_API_BASE="http://127.0.0.1:8788"
npm run backend:e2e:live
```

The live E2E script runs candidates, draft, structure audit, style audit, final judge, rewrite, and memory. By default it requires each live node to succeed without deterministic fallback.

To allow deterministic fallback while still checking that provider diagnostics are preserved:

```powershell
$env:INKWELL_E2E_ALLOW_FALLBACK="true"
npm run backend:e2e:live
```

Provider diagnostics are available at:

```text
GET /api/orchestrator/status
GET /api/orchestrator/logs?limit=50
```

The workflow page includes a Provider diagnostics panel that reads the sanitized recent-call log and provider health. It does not expose API keys or raw OpenClaw configuration.

The backend default model timeout is 60 seconds. Override it only when testing provider failure behavior:

```powershell
$env:INKWELL_MODEL_TIMEOUT_MS="60000"
```

## Project snapshots

The backend can persist the current project/workflow snapshot to local JSON:

```text
GET /api/project-state
POST /api/project-state
DELETE /api/project-state
```

Default file:

```text
.local/project-state.json
```

The frontend sidebar has manual save, restore, and delete snapshot controls. Snapshot writes are atomic and keep a `.bak` copy. Use an absolute path to override the storage location:

```powershell
$env:INKWELL_PROJECT_STATE_PATH="E:\inkwell-2\.local\project-state.json"
```

`npm run backend:contract` covers the snapshot API. If an existing snapshot is present, the contract skips destructive project-state checks unless `INKWELL_CONTRACT_PROJECT_STATE=true` is set.
