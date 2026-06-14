# Adaptive Fit Coach

移动优先的自适应 AI 私人健身教练 MVP。未配置 Supabase 或 AI Key 时，应用使用本地缓存和规则引擎，核心流程仍可体验。

## 本地运行

要求 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开终端显示的地址。生产构建：

```bash
npm run build
npm run preview
```

## Supabase 配置

1. 在 [Supabase](https://supabase.com/) 创建项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 在 Authentication > Providers 启用 Email。
4. 复制 Project URL 和 anon public key。
5. 将 `.env.example` 复制为 `.env.local`，填写：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

数据库已启用 RLS，每张用户表均限制为 `auth.uid() = user_id`。

## AI 配置

进入右上角设置，在 AI 接入区域选择 DeepSeek 或 OpenAI，填写 API Key 和模型名。默认模型：

- DeepSeek：`deepseek-chat`
- OpenAI：`gpt-4.1-mini`

浏览器直连适合个人使用和原型验证。正式公开部署时，应将 AI 请求迁移到 Vercel Function 或 Supabase Edge Function，避免把用户 Key 暴露给前端运行环境。

AI 教练可以从自然语言中识别当天饮食并自动加入饮食记录；添加食物弹窗中的“AI 查找”可以估算整份餐食的热量、蛋白质、碳水和脂肪。餐厅菜品通常没有统一的官方公开营养数据，因此结果会标记为“AI估算”，保存前应根据实际份量确认。

## 本地用户名

首次打开应用需要注册本地用户名并完成个人信息问卷。不同用户名拥有独立的训练、饮食和设置数据。设置中的“切换本地用户”可以返回登录页。首个注册用户名会继承旧版本已保存在浏览器中的数据。

## 正式发布给朋友使用

正式版使用 Supabase 邮箱密码账号、RLS 用户隔离和 Vercel 服务端 AI 转发。不要把 AI Key 写进任何 `VITE_` 变量。

### 1. 创建 Supabase

1. 在 [Supabase](https://supabase.com/dashboard) 创建项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 在 Authentication > Providers > Email 中启用邮箱密码登录。
4. 测试阶段可关闭 Confirm email；正式使用建议保留邮件验证。
5. 在 Project Settings > API 复制 Project URL 和 anon public key。

### 2. 上传代码仓库

将 `adaptive-fit-coach` 上传到 GitHub。不要提交 `.env`、`.env.local` 或任何 API Key。

### 3. 导入 Vercel

1. 打开 [Vercel New Project](https://vercel.com/new)，导入 GitHub 仓库。
2. Framework Preset 选择 Vite。
3. Build Command 使用 `npm run build`。
4. Output Directory 使用 `dist`。
5. 添加以下 Environment Variables：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的-anon-key
VITE_PUBLIC_USER_MODE=true
VITE_SERVER_AI_ENABLED=true

SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_ANON_KEY=你的-anon-key
AI_PROVIDER=DeepSeek
AI_MODEL=deepseek-chat
AI_API_KEY=你的服务端-AI-Key
```

OpenAI 可改为：

```env
AI_PROVIDER=OpenAI
AI_MODEL=gpt-4.1-mini
AI_API_KEY=你的-OpenAI-Key
```

带 `VITE_` 的变量会进入浏览器，因此里面只能放 Supabase URL、anon key 和功能开关。`AI_API_KEY` 没有 `VITE_` 前缀，只能由 `api/ai.js` 服务端函数读取。

### 4. 配置登录回调

部署完成后，在 Supabase Authentication > URL Configuration：

- Site URL：填写 Vercel 正式域名，例如 `https://adaptive-fit-coach.vercel.app`
- Redirect URLs：加入正式域名和需要使用的预览域名

修改 Vercel 环境变量后执行一次 Redeploy。

### 5. 手机安装

朋友打开 Vercel HTTPS 地址，注册邮箱和密码即可获得独立数据空间：

- iPhone Safari：分享 > 添加到主屏幕
- Android Chrome：菜单 > 安装应用

公开用户模式下，设置页不会显示 AI Provider、模型名称或 API Key。

手机浏览器打开 Vercel 地址即可使用。iPhone 在 Safari 分享菜单选择“添加到主屏幕”；Android Chrome 菜单选择“安装应用”或“添加到主屏幕”。

## 数据导入导出

进入设置：

- “导出 JSON”下载完整用户数据。
- “导入 JSON”选择之前导出的文件。

离线状态下数据保存在浏览器本地；配置 Supabase 后，可在设置中通过邮箱登录链接登录。应用会把完整用户数据同步到受 RLS 保护的 `user_settings`，网络恢复后继续同步。

## 项目结构

- `src/services/ruleEngine.ts`：无 AI 时的自适应规则。
- `src/services/aiCoachService.ts`：初始计划、每日计划、饮食建议、训练调整、周报、动作替换。
- `src/services/storage.ts`：离线缓存和 JSON 导出。
- `supabase/schema.sql`：云端表、RLS 和新用户触发器。
