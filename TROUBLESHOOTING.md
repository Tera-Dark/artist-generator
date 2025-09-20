# 🛠️ 故障排除指南

## PowerShell执行策略错误

### 问题描述
运行 `Quick-Start.bat` 时出现类似以下错误：
```
Start-Process : 无法完全运行此命令，因为系统找不到所需的全部信息。
所在位置 C:\Users\...\start-dev.ps1:87 字符: 12
+ $process = Start-Process -FilePath "npm" -ArgumentList "run", "dev", ...
```

### 解决方案

#### 方案1：使用启动脚本（推荐）
双击运行 `start.bat`，这是最可靠的启动方式。

#### 方案2：修改PowerShell执行策略
1. 以管理员身份打开PowerShell
2. 运行以下命令：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
3. 输入 `Y` 确认
4. 重新运行 `start.bat`

#### 方案3：直接使用npm命令
1. 打开命令行（cmd或PowerShell）
2. 导航到项目目录
3. 运行：
```bash
npm install  # 首次运行需要安装依赖
npm run dev
```

#### 方案4：使用VSCode终端
1. 用VSCode打开项目
2. 打开终端（Ctrl + `）
3. 运行：`npm run dev`

## Node.js相关问题

### 问题：Node.js未安装或版本过低
**解决方案**：
1. 访问 https://nodejs.org/
2. 下载并安装最新的LTS版本
3. 重启命令行窗口

### 问题：npm命令不可用
**解决方案**：
1. 确认Node.js已正确安装
2. 重启命令行窗口
3. 检查环境变量PATH是否包含Node.js路径

## 端口占用问题

### 问题：端口5173被占用
**解决方案**：
1. 脚本会自动寻找可用端口（5173-5200）
2. 手动指定端口：`npm run dev -- --port 3000`
3. 查找并结束占用端口的进程：
```bash
netstat -ano | findstr :5173
taskkill /PID <进程ID> /F
```

## 依赖安装问题

### 问题：npm install失败
**解决方案**：
1. 清除npm缓存：`npm cache clean --force`
2. 删除node_modules文件夹和package-lock.json
3. 重新安装：`npm install`
4. 如果仍有问题，尝试使用yarn：`yarn install`

### 问题：网络连接问题
**解决方案**：
1. 使用国内镜像：
```bash
npm config set registry https://registry.npmmirror.com/
npm install
```
2. 或使用cnpm：
```bash
npm install -g cnpm --registry=https://registry.npmmirror.com/
cnpm install
```

## 浏览器访问问题

### 问题：localhost无法访问
**解决方案**：
1. 检查服务器是否正确启动
2. 确认端口号是否正确
3. 尝试使用 `127.0.0.1` 替代 `localhost`
4. 检查防火墙设置

### 问题：页面显示空白
**解决方案**：
1. 检查浏览器控制台是否有错误
2. 清除浏览器缓存
3. 尝试无痕模式访问
4. 检查网络连接

## 数据加载问题

### 问题：画师数据加载失败
**解决方案**：
1. 确认 `public/data/artists.json` 文件存在
2. 检查文件格式是否正确（JSON格式）
3. 查看浏览器控制台的网络请求状态
4. 如果文件过大，可能需要等待更长时间加载

## 开发环境问题

### 问题：热重载不工作
**解决方案**：
1. 确认Vite服务器正常运行
2. 检查文件监听是否正常
3. 重启开发服务器
4. 检查文件路径是否正确

### 问题：TypeScript错误
**解决方案**：
1. 检查类型定义是否正确
2. 运行 `npm run type-check` 查看详细错误
3. 更新TypeScript版本
4. 检查tsconfig.json配置

## 获取帮助

如果以上解决方案都无法解决问题：

1. **查看控制台输出**：仔细阅读错误信息
2. **检查系统要求**：确认Node.js版本 >= 16
3. **重新克隆项目**：从GitHub重新下载项目
4. **创建Issue**：在GitHub仓库中创建问题报告

## 系统要求

- Node.js >= 16.0.0
- npm >= 7.0.0
- 现代浏览器（Chrome, Firefox, Safari, Edge）
- Windows 10+ / macOS 10.15+ / Linux Ubuntu 18.04+
