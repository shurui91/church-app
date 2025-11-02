# API 端点文档

## 基础端点

### 1. 服务器信息
- **URL**: `http://localhost:3000/`
- **方法**: GET
- **说明**: 返回服务器基本信息
- **响应示例**:
```json
{
  "message": "Church in Cerritos API Server",
  "status": "running"
}
```

### 2. 健康检查
- **URL**: `http://localhost:3000/health`
- **方法**: GET
- **说明**: 检查服务器运行状态
- **响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-01T23:45:09.827Z"
}
```

## 认证端点

### 3. 发送验证码
- **URL**: `http://localhost:3000/api/auth/send-code`
- **方法**: POST
- **说明**: 向手机号发送验证码（需要手机号在白名单中）
- **请求体**:
```json
{
  "phoneNumber": "+1234567890"
}
```
- **响应示例**（成功）:
```json
{
  "success": true,
  "message": "验证码已发送"
}
```
- **响应示例**（失败）:
```json
{
  "success": false,
  "message": "该手机号未在邀请列表中"
}
```

### 4. 验证登录
- **URL**: `http://localhost:3000/api/auth/verify-code`
- **方法**: POST
- **说明**: 验证验证码并登录，返回 JWT token
- **请求体**:
```json
{
  "phoneNumber": "+1234567890",
  "code": "123456"
}
```
- **响应示例**（成功）:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "phoneNumber": "+1234567890",
      "name": "Test User",
      "role": "member"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 5. 获取当前用户信息
- **URL**: `http://localhost:3000/api/auth/me`
- **方法**: GET
- **认证**: 需要 Bearer Token
- **请求头**:
```
Authorization: Bearer <your-jwt-token>
```
- **响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "phoneNumber": "+1234567890",
      "name": "Test User",
      "role": "member",
      "createdAt": "2025-11-01T23:45:21.301Z",
      "updatedAt": "2025-11-01T23:45:21.301Z"
    }
  }
}
```

### 6. 登出
- **URL**: `http://localhost:3000/api/auth/logout`
- **方法**: POST
- **认证**: 需要 Bearer Token
- **响应示例**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

## 用户管理端点（需要管理员权限）

### 7. 获取用户列表
- **URL**: `http://localhost:3000/api/users`
- **方法**: GET
- **认证**: 需要 Bearer Token（admin 或 super_admin）
- **查询参数**: `?role=member` (可选，按角色筛选)
- **响应示例**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "phoneNumber": "+1234567890",
        "name": "Test User",
        "role": "member",
        "createdAt": "2025-11-01T23:45:21.301Z",
        "updatedAt": "2025-11-01T23:45:21.301Z"
      }
    ],
    "count": 1
  }
}
```

### 8. 获取单个用户信息
- **URL**: `http://localhost:3000/api/users/:id`
- **方法**: GET
- **认证**: 需要 Bearer Token（admin 或 super_admin）
- **响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "phoneNumber": "+1234567890",
      "name": "Test User",
      "role": "member",
      "createdAt": "2025-11-01T23:45:21.301Z",
      "updatedAt": "2025-11-01T23:45:21.301Z"
    }
  }
}
```

### 9. 更新用户角色
- **URL**: `http://localhost:3000/api/users/:id/role`
- **方法**: PUT
- **认证**: 需要 Bearer Token（admin 或 super_admin）
- **权限说明**: 
  - admin 可以修改 member/leader 角色
  - 只有 super_admin 可以修改 super_admin 角色
- **请求体**:
```json
{
  "role": "leader"
}
```
- **响应示例**:
```json
{
  "success": true,
  "message": "角色更新成功",
  "data": {
    "user": {
      "id": 1,
      "phoneNumber": "+1234567890",
      "name": "Test User",
      "role": "leader",
      "createdAt": "2025-11-01T23:45:21.301Z",
      "updatedAt": "2025-11-01T23:51:45.563Z"
    }
  }
}
```

### 10. 更新用户姓名
- **URL**: `http://localhost:3000/api/users/:id/name`
- **方法**: PUT
- **认证**: 需要 Bearer Token
- **权限说明**: 用户可以修改自己的姓名，管理员可以修改任何人的姓名
- **请求体**:
```json
{
  "name": "New Name"
}
```
- **响应示例**:
```json
{
  "success": true,
  "message": "姓名更新成功",
  "data": {
    "user": {
      "id": 1,
      "phoneNumber": "+1234567890",
      "name": "New Name",
      "role": "member",
      "createdAt": "2025-11-01T23:45:21.301Z",
      "updatedAt": "2025-11-01T23:52:10.123Z"
    }
  }
}
```

### 11. 删除用户
- **URL**: `http://localhost:3000/api/users/:id`
- **方法**: DELETE
- **认证**: 需要 Bearer Token（仅 super_admin）
- **响应示例**:
```json
{
  "success": true,
  "message": "用户删除成功"
}
```

## 测试步骤

### 使用 curl 命令测试：

1. **检查服务器状态**:
```bash
curl http://localhost:3000/health
```

2. **发送验证码**（需要先在数据库中添加用户）:
```bash
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

3. **验证登录**（从数据库获取验证码）:
```bash
curl -X POST http://localhost:3000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "code": "123456"}'
```

4. **获取用户信息**（需要先登录获取 token）:
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 使用浏览器测试：

- `http://localhost:3000/` - 查看服务器信息
- `http://localhost:3000/health` - 健康检查

注意：POST 端点需要在浏览器中使用开发者工具的网络面板，或使用 Postman/curl 等工具。
