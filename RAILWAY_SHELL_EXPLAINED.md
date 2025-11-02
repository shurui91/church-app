# Railway Shell 说明

## 问题分析

你使用的 `railway shell` 命令：
- ✅ 在**本地**运行
- ✅ 连接到**本地数据库**（`server/database.sqlite`）
- ❌ **不是**在 Railway 服务器上运行

所以当你运行 `node scripts/add-user.js` 时，是在**本地数据库**中添加用户，而不是 Railway 服务器上的数据库。

## 两种 Shell 的区别

### 1. `railway shell`（本地 Shell）

```bash
railway shell
```

- 在**你的本地电脑**上运行
- 连接到**本地数据库**
- 只加载了 Railway 的环境变量
- **不会**连接到 Railway 服务器

### 2. Railway Dashboard Web Shell（服务器 Shell）⭐

- 在**Railway 服务器**上运行
- 连接到**Railway 服务器上的数据库**
- 这是你需要使用的！

## 正确的操作方法

### 方法 1: 使用 Railway Dashboard Web Shell（推荐）

1. **访问 Railway Dashboard**：
   - 打开：https://railway.app
   - 登录你的账号

2. **进入项目**：
   - 点击你的项目
   - 点击服务（Service）

3. **打开 Web Shell**：
   - 点击顶部的 **"Shell"** 标签页
   - 这会打开一个在**浏览器中**的终端
   - 这个终端运行在**Railway 服务器**上

4. **在 Web Shell 中运行命令**：
   ```bash
   cd server
   node scripts/add-user.js "+15676983308" member
   ```

### 方法 2: 使用 Railway CLI 远程执行（如果支持）

某些情况下，可以使用：
```bash
railway run node scripts/add-user.js "+15676983308" member
```

但最可靠的方法还是使用 Dashboard 的 Web Shell。

## 验证你使用的是正确的 Shell

### ❌ 本地 Shell（错误）：
```bash
$ railway shell
$ pwd
/Users/user/Downloads/church-in-cerritos/server
# 这显示本地路径
```

### ✅ Railway Web Shell（正确）：
```bash
$ pwd
/app/server
# 或者类似 Railway 服务器的路径
```

## 完整步骤（使用 Web Shell）

1. **打开 Railway Dashboard** → 项目 → 服务 → **Shell 标签页**

2. **在 Web Shell 中运行**：
   ```bash
   cd server
   
   # 查看当前用户（应该是空的）
   node scripts/list-users.js
   
   # 添加用户
   node scripts/add-user.js "+15676983308" member
   node scripts/add-user.js "+16262274460" member
   node scripts/add-user.js "+15622919164" member
   node scripts/add-user.js "+16263999536" member
   node scripts/add-user.js "+19495161377" member
   
   # 验证
   node scripts/list-users.js
   ```

3. **在本地终端测试 API**：
   ```bash
   curl -X POST https://church-app-production-68eb.up.railway.app/api/auth/check-phone \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+15676983308"}'
   ```

## 为什么本地显示用户已存在？

因为：
- 本地数据库中有用户（之前添加的）
- Railway 服务器上的数据库是空的（还没有添加）
- `railway shell` 只是加载环境变量，但仍在本地运行

## 总结

- ❌ **不要使用** `railway shell` 添加用户（它在本地运行）
- ✅ **使用** Railway Dashboard 的 Web Shell（在服务器上运行）
- ✅ 或者使用 `railway run` 命令（如果可用）

