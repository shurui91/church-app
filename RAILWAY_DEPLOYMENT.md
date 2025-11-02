# Railway 部署指南

## 部署步骤

### 方法 1: 使用 Railway Web Dashboard（推荐，最简单）

#### 步骤 1: 注册 Railway 账号

1. 访问：https://railway.app
2. 点击 "Start a New Project"
3. 使用 GitHub 账号登录（推荐）或邮箱注册

#### 步骤 2: 创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 授权 Railway 访问你的 GitHub 仓库
4. 选择 `church-in-cerritos` 仓库
5. **重要**：在 "Root Directory" 中设置为 `server`（因为代码在 server 目录下）

或者选择 "Empty Project"，然后手动配置。

#### 步骤 3: 配置项目

1. Railway 会自动检测到 Node.js 项目
2. 确保以下设置：
   - **Root Directory**: `server`
   - **Build Command**: `npm install`（自动检测）
   - **Start Command**: `npm start`（自动检测）

#### 步骤 4: 设置环境变量

在 Railway 项目的 "Variables" 标签页中添加：

```env
JWT_SECRET=your-very-secret-jwt-key-change-this-to-random-string
```

**注意**：
- ⚠️ **不要设置 `NODE_ENV=production`**（测试阶段），这样开发模式验证码 `123456` 才能工作
- ⚠️ `PORT` 由 Railway 自动设置，无需手动配置
- ✅ **必须设置 `JWT_SECRET`**：用于签名 JWT token，必须是一个强随机字符串

**重要**：
- `JWT_SECRET` 必须是一个强随机字符串，用于签名 JWT token
- 可以生成一个随机密钥：`openssl rand -base64 32`

#### 步骤 5: 部署数据库

Railway 支持持久化存储，SQLite 数据库会自动保存。

**首次部署后**，你需要运行迁移脚本或手动添加用户：

1. 在 Railway 项目的 "Settings" → "Deployments" 中，点击最新的部署
2. 点击 "View Logs" 或使用 "Shell" 功能
3. 运行迁移和添加用户：

```bash
# 进入 server 目录
cd server

# 运行迁移（如果需要）
node scripts/migrate-users-table.js

# 添加测试用户
node scripts/add-user.js "+15676983308" member
node scripts/add-user.js "+16262274460" member
node scripts/add-user.js "+15622919164" member
node scripts/add-user.js "+16263999536" member
node scripts/add-user.js "+19495161377" member
```

#### 步骤 6: 获取部署 URL

部署完成后，Railway 会提供一个 URL，类似：
- `https://your-app-name.up.railway.app`

点击 "Settings" → "Domains" 可以看到或设置自定义域名。

#### 步骤 7: 配置前端

1. 在项目根目录创建 `app/.env` 文件：
   ```bash
   cd app
   echo "EXPO_PUBLIC_API_URL=https://your-app-name.up.railway.app" > .env
   ```

2. 或者直接在 Expo 配置中使用环境变量。

---

### 方法 2: 使用 Railway CLI

#### 安装 Railway CLI

```bash
npm install -g @railway/cli
```

#### 登录

```bash
railway login
```

#### 初始化项目

```bash
cd server
railway init
```

#### 链接到现有项目或创建新项目

```bash
railway link  # 如果已有项目
# 或
railway new   # 创建新项目
```

#### 设置环境变量

```bash
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
```

#### 部署

```bash
railway up
```

---

## 环境变量配置

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 环境模式 | `production` |
| `PORT` | 端口（Railway 会自动设置） | `3000` |
| `JWT_SECRET` | JWT 签名密钥（**必须更改**） | 随机字符串 |

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_PATH` | SQLite 数据库路径 | `./database.sqlite` |

---

## 生成 JWT_SECRET

在终端运行：

```bash
openssl rand -base64 32
```

复制输出的字符串，设置为 `JWT_SECRET` 环境变量。

---

## 部署后验证

1. **检查健康状态**：
   ```
   https://your-app.up.railway.app/health
   ```

2. **检查 API 根路径**：
   ```
   https://your-app.up.railway.app/
   ```

3. **测试登录**（使用开发模式验证码 123456）：
   ```bash
   curl -X POST https://your-app.up.railway.app/api/auth/verify-code \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+15676983308", "code": "123456"}'
   ```

---

## 数据库管理

### 添加用户

在 Railway 的 Shell 中运行：

```bash
cd server
node scripts/add-user.js "+15676983308" member
```

### 查看用户列表

```bash
node scripts/list-users.js
```

### 数据库备份

Railway 的持久化存储会自动保存数据库。如果需要手动备份：

1. 在 Railway Shell 中：
   ```bash
   cp database.sqlite /tmp/database-backup.sqlite
   ```

2. 使用 Railway 的 "Download" 功能下载文件

---

## 更新部署

### 方法 1: 自动部署（推荐）

如果使用 GitHub 集成，每次 push 到 main 分支会自动部署。

### 方法 2: 手动部署

```bash
cd server
railway up
```

---

## 查看日志

在 Railway Dashboard：
- 点击项目
- 点击 "Deployments"
- 点击最新的部署
- 查看 "Logs"

或使用 CLI：
```bash
railway logs
```

---

## 费用说明

Railway 提供：
- **免费额度**：$5/月免费额度
- **按使用付费**：超出免费额度后按实际使用付费
- SQLite + Node.js 应用通常不会超出免费额度

---

## 故障排除

### 问题：部署失败

1. 检查日志：Railway Dashboard → Deployments → Logs
2. 确保 Root Directory 设置为 `server`
3. 检查 `package.json` 中的 `start` 脚本

### 问题：数据库文件丢失

确保在 Railway 中启用了持久化存储。

### 问题：环境变量未生效

1. 在 Railway Dashboard → Variables 中检查
2. 重新部署以应用新的环境变量

### 问题：CORS 错误

确保 `server/index.js` 中的 CORS 配置允许所有来源（开发阶段）：

```javascript
app.use(cors());
```

生产环境可以限制为特定域名。

---

## 下一步

1. ✅ 部署到 Railway
2. ✅ 配置前端 API URL
3. ✅ 测试登录功能
4. ✅ 构建 iOS 测试版本
5. ✅ 通过 TestFlight 分发给测试用户

---

## 生产环境注意事项

部署到生产环境前，建议：

1. **移除开发模式验证码**：修改 `server/routes/auth.js`，移除 `123456` 固定验证码
2. **配置真实的短信服务**：集成 Twilio（最后做）
3. **限制 CORS**：只允许你的 app 域名
4. **启用 HTTPS**：Railway 自动提供
5. **设置强 JWT_SECRET**：使用随机生成的密钥
6. **数据库备份**：定期备份 SQLite 数据库

