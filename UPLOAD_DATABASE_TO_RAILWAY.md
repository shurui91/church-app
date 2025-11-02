# 上传本地数据库到 Railway

## 方法 1: 使用 Railway Shell 上传（推荐）

### 步骤：

1. **登录 Railway Dashboard**：
   - 访问：https://railway.app
   - 进入你的项目 → 点击服务（Service）

2. **打开 Shell**：
   - 点击 **"Shell"** 标签页
   - 这会打开一个终端界面

3. **进入 server 目录**：
   ```bash
   cd server
   ```

4. **创建上传目录（如果需要）**：
   ```bash
   mkdir -p uploads
   cd uploads
   ```

5. **在本地准备数据库文件**：
   - 确保你的 `server/database.sqlite` 文件是完整的
   - 如果数据库文件很大，可能需要压缩

6. **使用 Base64 编码上传（适合小文件）**：

   在**本地终端**运行：
   ```bash
   # 读取数据库文件并编码
   cat server/database.sqlite | base64 | pbcopy
   ```
   
   然后在 **Railway Shell** 中运行：
   ```bash
   # 粘贴编码后的内容并解码
   # 方法1: 直接粘贴到终端（如果支持）
   # 方法2: 使用 echo 和 base64 解码
   echo "粘贴base64内容" | base64 -d > database.sqlite
   ```

### 更简单的方法：使用脚本重新创建数据库

由于数据库文件可能较大，更好的方法是在 Railway 上运行脚本重新创建数据库和用户。

## 方法 2: 使用脚本重新创建数据库和用户（最简单）

### 步骤：

1. **在 Railway Shell 中运行迁移脚本**：
   ```bash
   cd server
   node scripts/migrate-users-table.js
   ```

2. **添加所有测试用户**：
   ```bash
   node scripts/add-user.js "+15676983308" member
   node scripts/add-user.js "+16262274460" member
   node scripts/add-user.js "+15622919164" member
   node scripts/add-user.js "+16263999536" member
   node scripts/add-user.js "+19495161377" member
   ```

3. **验证用户已添加**：
   ```bash
   node scripts/list-users.js
   ```

## 方法 3: 使用 Railway Volume（持久化存储）

Railway 自动提供持久化存储，SQLite 数据库会自动保存。只需：

1. **确保数据库路径正确**：
   - Railway 会自动挂载持久化存储
   - 数据库文件会保存在 `/data` 或项目目录中

2. **在代码中确保使用相对路径**：
   - `./database.sqlite` 应该可以正常工作

## 方法 4: 导出 SQL 并导入（如果数据库很大）

如果数据库很大，可以：

1. **在本地导出 SQL**：
   ```bash
   sqlite3 server/database.sqlite .dump > database.sql
   ```

2. **在 Railway Shell 中创建新数据库并导入**：
   ```bash
   cd server
   sqlite3 database.sqlite < database.sql
   ```

## 推荐流程

由于你的数据库是新建的，最简单的方法是：

1. **在 Railway Shell 中直接运行脚本重新创建**：
   ```bash
   cd server
   
   # 确保数据库表已创建
   node scripts/migrate-users-table.js
   
   # 添加所有用户
   node scripts/add-user.js "+15676983308" member
   node scripts/add-user.js "+16262274460" member
   node scripts/add-user.js "+15622919164" member
   node scripts/add-user.js "+16263999536" member
   node scripts/add-user.js "+19495161377" member
   
   # 验证
   node scripts/list-users.js
   ```

2. **如果本地数据库有重要数据**，可以：
   - 导出用户数据
   - 在 Railway Shell 中逐个添加

## 从本地数据库导出用户数据

如果你想从本地数据库导出用户列表：

```bash
# 在本地运行
cd server
sqlite3 database.sqlite "SELECT phoneNumber, role FROM users;" > users.txt
cat users.txt
```

然后在 Railway Shell 中根据导出的列表添加用户。

