# Railway 持久化存储配置指南

## 问题：每次部署后数据库丢失

**原因**：Railway 每次部署时会重新创建容器，如果数据库文件不在持久化存储中，就会丢失。

## 解决方案：使用 Railway Volume（持久化存储）

### 方法 1: 在 Railway Dashboard 中配置 Volume（推荐）

#### 步骤：

1. **打开 Railway Dashboard**：
   - 访问：https://railway.app
   - 进入你的项目 → 选择服务（Service）

2. **添加 Volume**：
   - 点击 **"Variables"** 标签页旁边的 **"Volumes"** 标签
   - 点击 **"+ New Volume"**
   - 设置：
     - **Name**: `database-storage`（或任意名称）
     - **Mount Path**: `/data`（或 `/persistent`，这是持久化目录）

3. **配置环境变量**：
   - 在 **"Variables"** 标签页添加：
     ```
     DB_PATH=/data/database.sqlite
     ```
   - 这样数据库文件会存储在持久化的 Volume 中

4. **重新部署**：
   - Railway 会自动重新部署
   - 或者在 **"Deployments"** 标签页点击 **"Redeploy"**

### 方法 2: 使用 Railway CLI 配置

如果你安装了 Railway CLI：

```bash
# 登录
railway login

# 链接到项目
railway link

# 创建 Volume
railway volume create --name database-storage --mount-path /data

# 设置数据库路径环境变量
railway variables set DB_PATH=/data/database.sqlite
```

### 方法 3: 修改代码使用 Railway 的持久化目录

如果你不想使用环境变量，可以修改代码自动检测 Railway 的持久化目录。

**修改 `server/database/db.js`**：

```javascript
// Database path
// On Railway, use persistent storage directory if available
const RAILWAY_VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/data';
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.RAILWAY_ENVIRONMENT === 'development';

const DB_PATH = process.env.DB_PATH || 
  (isRailway 
    ? path.join(RAILWAY_VOLUME, 'database.sqlite')
    : path.join(__dirname, '../database.sqlite'));
```

但这需要你先创建 Volume。

## 验证配置

### 1. 检查环境变量

在 Railway Shell 中：
```bash
echo $DB_PATH
```

应该显示：`/data/database.sqlite`

### 2. 检查 Volume 是否挂载

在 Railway Shell 中：
```bash
ls -la /data
```

应该能看到挂载的目录。

### 3. 初始化数据库

在 Railway Shell 中：
```bash
cd server
node scripts/migrate-add-user-fields.js
node scripts/add-user.js "+15676983308" member
node scripts/list-users.js
```

### 4. 重新部署后验证

```bash
# 部署后，再次检查
cd server
node scripts/list-users.js
```

如果用户还在，说明持久化存储配置成功！

## 重要提示

1. **Volume 目录是持久化的**：
   - 文件会保存在 `/data` 目录中
   - 即使重新部署，数据也不会丢失

2. **首次配置后需要重新初始化**：
   - 配置 Volume 后，数据库文件位置改变了
   - 需要运行迁移脚本重新创建数据库
   - 或使用导入脚本导入现有数据

3. **备份建议**：
   - 定期在 Railway Shell 中备份：
   ```bash
   cp /data/database.sqlite /data/backup-$(date +%Y%m%d).sqlite
   ```

## 快速配置步骤总结

1. ✅ Railway Dashboard → 你的服务 → **Volumes** → **+ New Volume**
2. ✅ Mount Path: `/data`
3. ✅ Variables → 添加 `DB_PATH=/data/database.sqlite`
4. ✅ 重新部署
5. ✅ Railway Shell → 运行迁移和添加用户脚本
6. ✅ 验证数据在重新部署后仍然存在

## 如果还是有问题

如果配置 Volume 后仍然丢失数据，检查：

1. **Volume 是否正确挂载**：
   ```bash
   df -h
   # 应该能看到 /data 的挂载信息
   ```

2. **环境变量是否正确**：
   ```bash
   env | grep DB_PATH
   ```

3. **数据库文件位置**：
   ```bash
   ls -la /data/database.sqlite
   # 应该能看到数据库文件
   ```

4. **查看日志**：
   - Railway Dashboard → Logs
   - 查看数据库初始化相关的日志

