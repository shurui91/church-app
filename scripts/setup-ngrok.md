# ngrok 设置指南

## 快速开始

### 步骤 1: 注册 ngrok 账号（免费）

访问：https://dashboard.ngrok.com/signup

### 步骤 2: 获取 authtoken

登录后访问：https://dashboard.ngrok.com/get-started/your-authtoken

复制你的 authtoken（类似：`2abc123def456ghi789jkl_1mN2oP3qR4sT5uV6wX7yZ8aB9cD`）

### 步骤 3: 配置 authtoken

在终端运行：

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

将 `YOUR_AUTHTOKEN` 替换为你复制的实际 token。

### 步骤 4: 启动 ngrok

使用提供的脚本：

```bash
./scripts/start-ngrok.sh
```

或者直接运行：

```bash
ngrok http 3000
```

### 步骤 5: 获取 ngrok URL

ngrok 会显示类似这样的信息：

```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

或者访问 ngrok Web 界面：http://localhost:4040

复制 HTTPS URL（如：`https://abc123.ngrok.io`）

### 步骤 6: 配置前端

在 `app` 目录下创建或编辑 `.env` 文件：

```bash
cd app
echo "EXPO_PUBLIC_API_URL=https://你的ngrok-url.ngrok.io" > .env
```

### 步骤 7: 重启 Expo

```bash
# 停止当前的 Expo，然后重新启动
npx expo start --clear
```

### 步骤 8: 构建 iOS 测试版

```bash
# 使用 EAS Build
eas build --platform ios --profile preview
```

## 注意事项

1. **ngrok 免费版限制**：
   - 每次重启 URL 会变化
   - 如果需要固定 URL，需要购买 ngrok 计划

2. **后端服务器**：
   - 确保后端服务器一直在运行（`cd server && npm run dev`）
   - ngrok 只是转发请求，不会启动后端服务器

3. **HTTPS**：
   - ngrok 自动提供 HTTPS，适合 iOS 测试

4. **停止 ngrok**：
   - 在运行 ngrok 的终端按 `Ctrl+C`

## 常见问题

### Q: ngrok URL 每次都不一样？
A: 这是免费版的限制。每次重启 ngrok，URL 都会变化。如果需要固定 URL，需要：
- 购买 ngrok 计划（有固定域名选项）
- 或使用其他部署方案（Railway, Render 等）

### Q: 如何查看当前 ngrok URL？
A: 访问 http://localhost:4040 查看 ngrok Web 界面

### Q: 其他设备无法访问？
A: 确保：
1. 使用 HTTPS URL（不是 HTTP）
2. 后端服务器正在运行
3. 前端已配置正确的 API URL

