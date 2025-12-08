# 📦 部署指南 (GitHub Pages)

本项目采用与 **Prompt-Hub** 相同的 **IssueOps** 方案，无需后端数据库，直接利用 GitHub Issues 投稿、JSON 文件存储数据、GitHub Pages 托管页面。

## ⚠️ 重要说明

GitHub Actions 部署分为两个阶段：

### 阶段 1：手动启用 Pages (必需)

1.  **Fork 本仓库** 到你的 GitHub 账号。
2.  进入仓库 **Settings** -> **Pages**。
3.  在 **Build and deployment** 下：
    *   **Source**: 选择 `GitHub Actions` (这一步至关重要，否则自动部署会失败)。

### 阶段 2：配置权限 (如果失败)

如果 Action 运行失败报错 "Resource not accessible by integration"：

1.  进入 **Settings** -> **Actions** -> **General**。
2.  滚动到 **Workflow permissions**。
3.  勾选 `Read and write permissions`。
4.  勾选 `Allow GitHub Actions to create and approve pull requests`。
5.  点击 **Save**。

---

## 🚀 触发部署

### 自动部署
每次推送到 `main` 分支都会自动触发部署。

### 手动触发
1.  进入 **Actions** 标签页。
2.  选择 **Deploy to GitHub Pages** 工作流。
3.  点击 **Run workflow** 按钮。

部署完成后，你的网站将可通过 `https://你的用户名.github.io/artist-generator/` 访问。

---

## 🛡️ 审核机制 (IssueOps)

本项目利用 GitHub API 进行内容管理，这也是 "Tera-Dark/Prompt-Hub" 的核心逻辑。

1.  **用户投稿**：
    *   在网站点击 "提交"，会自动打开一个 **GitHub Issue** 草稿。
    *   用户点击 "Submit new issue" 即完成投稿。
    *   此时投稿进入 `pending` 状态（在网站后台可见，需管理员配置 Token）。

2.  **管理员审核**：
    *   在网站 `/moderation` 页面登录管理员（需要填入你的 GitHub PAT 和 Repo 信息）。
    *   **通过 (Approve)**：系统会自动更新 `public/data/prompts.json` 文件（通过 GitHub API Commit），并关闭 Issue。
    *   **拒绝 (Reject)**：系统会评论并关闭 Issue。

3.  **数据更新**：
    *   `prompts.json` 更新后，GitHub Actions 会自动重新构建并部署网站，新的 Prompt 即刻上线。

---

## 🔧 本地开发与环境变量

如果需要本地测试管理员功能，请在 `.env.local` 中配置：

```ini
VITE_REPO_OWNER=你的用户名
VITE_REPO_NAME=artist-generator
```

(注意：勿将 PAT token 提交到仓库)
