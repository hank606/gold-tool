# 黄金AI交易工具

## 功能
- 实时金价展示 + 价格预警
- 止损止盈计算器（做多/做空）
- 技术分析信号面板
- AI交易助手对话

## 部署步骤（10分钟上线）

### 第一步：上传到 GitHub
1. 打开 https://github.com，注册/登录账号
2. 点击右上角 "+" → "New repository"
3. 仓库名填：gold-tool，选 Public，点击 Create
4. 点击 "uploading an existing file"
5. 把这个文件夹里的所有文件拖入上传
6. 点击 "Commit changes"

### 第二步：部署到 Vercel
1. 打开 https://vercel.com，用 GitHub 账号登录
2. 点击 "Add New Project"
3. 选择 gold-tool 仓库，点击 Import
4. 点击 Deploy（等待约1分钟）
5. 完成！获得网址如：gold-tool.vercel.app

### 第三步：配置 API Key（AI助手功能）
1. 打开 https://console.anthropic.com，注册获取 API Key
2. 在 Vercel 项目设置 → Environment Variables
3. 添加：REACT_APP_ANTHROPIC_KEY = 你的key

## 本地运行
```
npm install
npm start
```
