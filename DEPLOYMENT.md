# GitHub Pages 部署指南

## 自动部署设置

本项目已配置自动部署到GitHub Pages。每当代码推送到`main`或`master`分支时，会自动触发构建和部署流程。

## 设置步骤

1. **启用GitHub Pages**
   - 进入GitHub仓库设置页面
   - 找到"Pages"选项
   - 在"Source"下选择"GitHub Actions"

2. **推送代码**
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

3. **查看部署状态**
   - 在GitHub仓库的"Actions"标签页查看工作流状态
   - 部署完成后，网站将在 `https://你的用户名.github.io/artist-generator/` 可用

## 本地开发

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 构建生产版本
npm run build-only

# 预览构建结果
npm run preview
```

## 构建配置

- 生产环境base路径设置为 `/artist-generator/`
- 开发环境base路径为 `/`
- 自动复制`public/data/artists.json`到构建输出

## 故障排除

如果部署失败，请检查：
1. GitHub Pages是否已启用
2. 仓库是否为公开仓库（或有GitHub Pro账户）
3. Actions工作流是否有足够的权限
4. 构建过程是否有错误

## 技术栈

- Vue 3 + TypeScript
- Vite 构建工具
- TailwindCSS 样式框架
- GitHub Actions 自动部署 