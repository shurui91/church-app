# 部署指南

## iOS 测试部署方案

### 方案 1: 使用 ngrok 快速测试（推荐先使用）

**优点**：快速、简单，几分钟就能开始测试  
**缺点**：每次重启 ngrok URL 会变化，需要重新配置

#### 步骤：

1. **安装 ngrok**：
   ```bash
   # macOS
   brew install ngrok
   
   # 或下载：https://ngrok.com/download
   ```

2. **启动本地后端服务器**：
   ```bash
   cd server
   npm run dev
   ```

3. **在另一个终端启动 ngrok**：
   ```bash
   ngrok http 3000
   ```

4. **获取 ngrok URL**：
   - ngrok 会显示类似：`https://abc123.ngrok.io`
   - 复制这个 HTTPS URL

5. **配置前端环境变量**：
   ```bash
   # 在 app 目录下创建 .env 文件
   cd app
   echo "EXPO_PUBLIC_API_URL=https://abc123.ngrok.io" > .env
   ```

6. **重新启动 Expo**：
   ```bash
   # 停止当前 Expo，然后重新启动
   npx expo start --clear
   ```

7. **构建 iOS 测试版本**：
   ```bash
   # 使用 EAS Build（推荐）
   eas build --platform ios --profile preview
   
   # 或使用 Expo Go（开发时）
   # 扫描二维码即可
   ```

**注意**：
- ngrok 免费版每次重启 URL 会变化
- 如果需要固定 URL，需要购买 ngrok 计划
- 确保后端服务器一直在运行

---

### 方案 2: 部署到线上服务器（正式测试）

**优点**：稳定的 URL，适合正式测试  
**缺点**：需要设置时间稍长

#### 推荐的部署平台：

##### A. Railway（推荐，简单易用）

1. **注册账号**：https://railway.app
2. **安装 Railway CLI**：
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **在 server 目录初始化项目**：
   ```bash
   cd server
   railway init
   ```

4. **配置环境变量**：
   - 在 Railway dashboard 中设置：
     - `NODE_ENV=production`
     - `PORT=3000` (Railway 会自动设置)
     - 其他需要的环境变量

5. **部署**：
   ```bash
   railway up
   ```

6. **获取部署 URL**：
   - Railway 会提供一个 URL，如：`https://your-app.up.railway.app`

7. **配置前端**：
   ```bash
   cd app
   echo "EXPO_PUBLIC_API_URL=https://your-app.up.railway.app" > .env
   ```

##### B. Render（免费方案）

1. **注册账号**：https://render.com
2. **创建新的 Web Service**
3. **连接 GitHub 仓库**（或直接部署）
4. **配置**：
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment: `Node`
5. **设置环境变量**
6. **获取 URL**

##### C. Heroku

1. **安装 Heroku CLI**
2. **登录并创建应用**：
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **配置环境变量**：
   ```bash
   heroku config:set NODE_ENV=production
   ```

4. **部署**：
   ```bash
   git subtree push --prefix server heroku main
   ```

---

## 环境变量配置

### 后端环境变量（生产环境）

在部署平台设置：
```env
NODE_ENV=production
PORT=3000
DB_PATH=/path/to/database.sqlite  # 或使用远程数据库
JWT_SECRET=your-secret-key-here  # 必须更改！
```

### 前端环境变量

在 `app/.env` 文件中（不要提交到 git）：
```env
EXPO_PUBLIC_API_URL=https://your-api-url.com
```

然后在代码中使用：
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
```

---

## 生产环境注意事项

1. **更改 JWT_SECRET**：必须使用强随机字符串
2. **数据库备份**：SQLite 需要定期备份
3. **HTTPS**：确保使用 HTTPS（ngrok 和大多数平台自动提供）
4. **CORS 配置**：确保后端 CORS 允许你的 iOS app 访问
5. **移除开发模式验证码**：生产环境不要使用 `123456` 固定验证码

---

## iOS Build 命令

### 使用 EAS Build（推荐）

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录
eas login

# 配置（首次）
eas build:configure

# 构建 iOS 测试版
eas build --platform ios --profile preview

# 构建 iOS 正式版（需要 Apple 开发者账号）
eas build --platform ios --profile production
```

### 使用本地构建

```bash
# iOS Simulator
npx expo run:ios

# 物理设备
npx expo run:ios --device
```

---

## 快速测试流程

1. ✅ 使用 ngrok 快速验证功能
2. ✅ 确认登录流程正常工作
3. ✅ 部署到线上服务器
4. ✅ 构建 iOS 测试版本
5. ✅ 分发给测试用户

