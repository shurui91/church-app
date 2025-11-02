# 本地测试指南

## 快速测试登录/登出功能

### 方案 1: 使用 iOS Simulator（推荐，最简单）

iOS Simulator 可以直接访问 `localhost`，无需任何额外配置。

#### 步骤：

1. **确保后端服务器正在运行**：
   ```bash
   cd server
   npm run dev
   ```

2. **启动 Expo 并在 iOS Simulator 中运行**：
   ```bash
   # 在项目根目录
   npx expo start --ios
   ```

   或者：
   ```bash
   npx expo start
   # 然后按 'i' 键打开 iOS Simulator
   ```

3. **测试登录**：
   - 使用已知的手机号（已在数据库中的）
   - 验证码输入：`123456`（开发模式固定验证码）
   - 测试登录和登出功能

**优点**：
- ✅ 无需配置，直接可用
- ✅ 可以访问 localhost
- ✅ 开发体验好，支持热重载

---

### 方案 2: 使用局域网 IP（物理设备测试）

如果你想在真实的 iPhone 上测试，可以使用 Mac 的局域网 IP。

#### 步骤：

1. **获取 Mac 的局域网 IP**：
   ```bash
   # 在终端运行
   ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
   ```
   
   或者手动查看：
   - 系统设置 → 网络 → 查看你的 IP 地址
   - 通常是类似：`192.168.1.xxx` 或 `10.0.0.xxx`

2. **配置前端使用局域网 IP**：
   ```bash
   cd app
   # 替换为你的实际 IP
   echo "EXPO_PUBLIC_API_URL=http://192.168.1.xxx:3000" > .env
   ```

3. **确保 Mac 和 iPhone 在同一 WiFi 网络**

4. **重启 Expo**：
   ```bash
   npx expo start --clear
   ```

5. **在 iPhone 上扫描二维码或使用 Expo Go**

**注意**：
- ⚠️ 必须使用 HTTP（不是 HTTPS）
- ⚠️ iOS 可能需要在 `Info.plist` 中允许 HTTP 连接
- ⚠️ 确保防火墙允许端口 3000

---

### 方案 3: 使用 Expo Go（开发环境）

直接在开发环境使用 Expo Go 测试，最简单快速。

#### 步骤：

1. **确保后端服务器正在运行**：
   ```bash
   cd server
   npm run dev
   ```

2. **启动 Expo**：
   ```bash
   npx expo start
   ```

3. **在 iOS Simulator 中测试**：
   - 按 'i' 键打开 iOS Simulator
   - 或扫描二维码用 Expo Go（需要设备在同一网络）

4. **测试流程**：
   - 输入手机号（如：`5676983308`）
   - 验证码：`123456`
   - 测试登录/登出

---

## 当前可用的测试账号

以下是数据库中已有的测试账号：

| 手机号 | 验证码 | 角色 |
|--------|--------|------|
| 567-698-3308 | 123456 | member |
| 626-227-4460 | 123456 | member |
| 562-291-9164 | 123456 | member |
| 626-399-9536 | 123456 | member |
| 949-516-1377 | 123456 | member |

**注意**：开发模式下，所有用户都可以使用固定验证码 `123456` 登录。

---

## 测试检查清单

- [ ] 后端服务器运行在 `localhost:3000`
- [ ] 可以访问 http://localhost:3000/health
- [ ] Expo 应用已启动
- [ ] iOS Simulator 已打开（或使用 Expo Go）
- [ ] 可以输入手机号
- [ ] 验证码输入框显示（输入 `123456`）
- [ ] 登录成功
- [ ] 查看"我的"页面用户信息
- [ ] 测试登出功能
- [ ] 登出后重定向到登录页

---

## 常见问题

### Q: iOS Simulator 无法连接后端？
A: 确保：
- 后端服务器正在运行
- 访问 http://localhost:3000/health 确认服务器正常
- 重启 Expo：`npx expo start --clear`

### Q: 验证码 123456 不工作？
A: 确保：
- `NODE_ENV` 不是 `production`（开发模式）
- 检查后端日志确认请求到达

### Q: 想测试真实的短信功能？
A: 目前暂时使用固定验证码 `123456`。Twilio 集成可以放到最后实现。

---

## 下一步

完成登录/登出测试后：
1. ✅ 确认功能正常
2. ⏭️ 继续开发其他功能
3. ⏭️ 最后集成 Twilio 短信功能
4. ⏭️ 部署到生产环境

