# Artist Generator

面向 AI 绘画工作流的画师串生成、浏览、分享与审核工具。

项目当前已经整理成一套零成本的静态内容方案：

- 前端：Vue 3 + Vite + TailwindCSS + Pinia
- 分享内容：`public/data/*.json` 静态文件
- 投稿入口：GitHub Issues
- 审核与发布：GitHub OAuth + 仓库写入
- 自动化：GitHub Actions + 本地内容管线脚本

## 当前能力

### 生成工作流

- 工作区支持纯净、标准权重、创意括号、NAI 四种生成模式
- 支持按作品数过滤、预选画师、格式工具、结果复制
- 首屏会静默加载画师库，避免首次生成拿到假数据

### 浏览与管理

- 画师库支持搜索、排序、分页、卡片/列表切换、画师收藏
- 画师串分享页支持搜索、标签筛选、精选展示、详情弹窗、复制、加入收藏夹
- 设置页、分享页、审核页、首页、工作区、画师库已经统一到同一套全局样式系统

### 本地持久化

- 支持离线本地身份
- 支持多收藏夹、默认收藏夹、Prompt/画师双收藏
- 支持离线草稿、草稿副本、草稿搜索
- 支持本地数据导出/导入

### 审核与发布

- 投稿前有实时校验
- 审核台支持校验错误/提醒、疑似重复提示、精选设置
- 发布内容写入 `public/data/chunk_*.json`
- 自动生成 `featured.json`、`tags.json`、`prompts.json`、`index.json`

## 目录说明

### 前端

- `src/views/ConceptBlueprint.vue`：工作区
- `src/views/Library.vue`：画师库
- `src/views/SharedPrompts.vue`：画师串分享页
- `src/views/Moderation.vue`：审核台 / 本地收藏夹管理
- `src/views/Settings.vue`：设置与本地数据工作台

### 内容数据

- `public/data/chunk_*.json`：正式发布内容
- `public/data/index.json`：chunk 索引
- `public/data/prompts.json`：兼容与聚合输出
- `public/data/featured.json`：精选内容元数据
- `public/data/tags.json`：标签统计

### 自动化

- `.github/workflows/deploy.yml`：部署
- `.github/workflows/content-pipeline.yml`：静态内容检查与元数据刷新
- `.github/workflows/submission-guard.yml`：Issue 投稿守卫
- `scripts/content-pipeline.mjs`：本地/CI 共用的内容管线脚本

## 本地开发

### 环境要求

- Node.js 18+
- npm 9+

### 启动

```bash
npm install
npm run dev
```

Windows 也可以直接双击 `start.bat`。

### 常用命令

```bash
# 本地开发
npm run dev

# 类型检查
npm run type-check

# 构建
npm run build

# 仅构建静态站点
npm run build-only

# 内容管线检查
npm run content:check

# 重新生成 featured / tags / prompts / index
npm run content:write
```

## 零成本分享流程

### 1. 投稿

- 用户在前端填写分享表单
- 前端先做实时校验与重复提示
- 登录后通过 GitHub Issues 提交

### 2. 守卫

- `submission-guard.yml` 会自动检查 Issue 中的 JSON 数据块
- 自动补充 `needs-fix` 或 `ready-for-review`
- 自动更新机器人评论，提示投稿问题

### 3. 审核

- 管理员在审核台查看待审核内容
- 审核台会显示：
  - 校验错误
  - 内容提醒
  - 疑似重复稿
- 校验错误未修复时不能直接发布

### 4. 发布

- 审核通过后内容写入 `public/data/chunk_*.json`
- 精选内容写入 `public/data/featured.json`

### 5. 静态元数据刷新

- `content-pipeline.mjs` 负责：
  - 校验静态内容结构
  - 刷新 `index.json`
  - 聚合 `prompts.json`
  - 生成 `featured.json`
  - 生成 `tags.json`

## 提交内容的建议格式

建议至少包含：

- `title`
- `prompt`
- `model`
- `tags`
- `image`
- `description`

内容质量建议：

- 标题不要用“测试 / 无题 / untitled”
- Prompt 不要过短
- 标签控制在 1 到 6 个
- 图片尽量使用公开可访问的 `http(s)` 链接

## 本地收藏与草稿

### 本地身份

- 每个身份都有独立的收藏夹和离线草稿
- 适合在同一台设备上区分不同创作方向

### 收藏夹

- 默认收藏夹用于快速收藏
- 也可以继续新建主题收藏夹
- 支持 Prompt / 画师混合管理

### 草稿

- 未登录也可以新建离线草稿
- 支持自动保存、复制副本、搜索
- 登录后可继续整理并提交

## 提交前自检

建议在推送前至少运行：

```bash
npm run content:check
npm run type-check
npm run build
```

当前仓库里 `oxlint` 可正常运行。
如果要单独跑 ESLint，建议优先使用项目脚本配置而不是直接用默认命令行参数，避免 `.vue` / TypeScript 解析方式不匹配。

## 部署

查看 [DEPLOYMENT.md](./DEPLOYMENT.md)。

如果你用 GitHub Pages / Vercel 这类静态部署平台，这个项目当前的分享链路不需要额外数据库成本。
