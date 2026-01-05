# 体育馆预约 API 文档

## 基础信息

- 基础路径：`/api/gym`
- 所有接口需要认证（Bearer Token）

## 数据模型

### Reservation（预约）
```typescript
{
  id: number;
  userId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // 分钟
  status: 'pending' | 'checked_in' | 'completed' | 'cancelled';
  checkedInAt?: string; // ISO 8601
  checkedOutAt?: string; // ISO 8601
  notes?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### TimeSlot（时间段）
```typescript
{
  id: number;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // 分钟
  isAvailable: boolean; // 是否可用（由管理员配置）
  isReserved: boolean; // 是否已被预约
  reservedBy?: {
    id: number;
    name: string;
    phoneNumber: string;
  };
}
```

## API 接口

### 1. 获取可用时间段

**GET** `/api/gym/time-slots/:date`

获取指定日期的可用时间段列表。

**参数：**
- `date` (路径参数): 日期，格式 `YYYY-MM-DD`

**响应：**
```json
{
  "success": true,
  "data": {
    "timeSlots": [
      {
        "id": 1,
        "startTime": "09:00",
        "endTime": "10:00",
        "duration": 60,
        "isAvailable": true,
        "isReserved": false
      },
      {
        "id": 2,
        "startTime": "10:00",
        "endTime": "11:00",
        "duration": 60,
        "isAvailable": true,
        "isReserved": true,
        "reservedBy": {
          "id": 1,
          "name": "张三",
          "phoneNumber": "1234567890"
        }
      }
    ]
  }
}
```

**业务规则：**
- 只返回 7:00-22:00 范围内的时间段
- 时间段由管理员配置（见时间段配置接口）
- 如果时间段已被预约，显示预约人信息（仅显示姓名和手机号后4位）

---

### 2. 创建预约

**POST** `/api/gym/reservations`

创建新的预约。

**请求体：**
```json
{
  "date": "2024-01-15",
  "startTime": "09:00",
  "endTime": "10:00",
  "duration": 60,
  "notes": "篮球活动" // 可选
}
```

**响应：**
```json
{
  "success": true,
  "message": "预约创建成功",
  "data": {
    "reservation": {
      "id": 1,
      "userId": 1,
      "date": "2024-01-15",
      "startTime": "09:00",
      "endTime": "10:00",
      "duration": 60,
      "status": "pending",
      "notes": "篮球活动",
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-01-10T10:00:00Z"
    }
  }
}
```

**业务规则：**
- 只能提前14天预约
- 每天最多只能预约1个时间段
- 不能连续预约多个时间段
- 时间段必须在 7:00-22:00 范围内
- 时长最多2小时（120分钟）
- 如果时间段已被预约，返回错误

**错误响应：**
```json
{
  "success": false,
  "message": "该时间段已被预约"
}
```

---

### 3. 获取我的预约

**GET** `/api/gym/reservations/my`

获取当前用户的所有预约。

**查询参数：**
- `status` (可选): 过滤状态 (`pending`, `checked_in`, `completed`, `cancelled`)
- `limit` (可选): 返回数量限制
- `offset` (可选): 偏移量

**响应：**
```json
{
  "success": true,
  "data": {
    "reservations": [
      {
        "id": 1,
        "userId": 1,
        "date": "2024-01-15",
        "startTime": "09:00",
        "endTime": "10:00",
        "duration": 60,
        "status": "pending",
        "createdAt": "2024-01-10T10:00:00Z",
        "updatedAt": "2024-01-10T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

---

### 4. 获取预约详情

**GET** `/api/gym/reservations/:id`

获取指定预约的详细信息。

**参数：**
- `id` (路径参数): 预约ID

**响应：**
```json
{
  "success": true,
  "data": {
    "reservation": {
      "id": 1,
      "userId": 1,
      "date": "2024-01-15",
      "startTime": "09:00",
      "endTime": "10:00",
      "duration": 60,
      "status": "pending",
      "notes": "篮球活动",
      "checkedInAt": null,
      "checkedOutAt": null,
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-01-10T10:00:00Z"
    }
  }
}
```

---

### 5. 取消预约

**POST** `/api/gym/reservations/:id/cancel`

取消指定的预约。

**参数：**
- `id` (路径参数): 预约ID

**响应：**
```json
{
  "success": true,
  "message": "预约已取消"
}
```

**业务规则：**
- 只能取消自己的预约
- 只能取消状态为 `pending` 的预约
- 预约开始后不能取消

---

### 6. 签入

**POST** `/api/gym/reservations/:id/check-in`

签入到预约的场馆。

**参数：**
- `id` (路径参数): 预约ID

**响应：**
```json
{
  "success": true,
  "message": "签入成功",
  "data": {
    "reservation": {
      "id": 1,
      "status": "checked_in",
      "checkedInAt": "2024-01-15T08:45:00Z",
      "updatedAt": "2024-01-15T08:45:00Z"
    }
  }
}
```

**业务规则：**
- 只能签入自己的预约
- 只能在预约开始前15分钟到预约结束前签入
- 如果预约开始15分钟后仍未签入，自动取消预约
- 状态必须为 `pending`

**错误响应：**
```json
{
  "success": false,
  "message": "签入时间未到或已过期"
}
```

---

### 7. 签出

**POST** `/api/gym/reservations/:id/check-out`

签出离开场馆。

**参数：**
- `id` (路径参数): 预约ID

**响应：**
```json
{
  "success": true,
  "message": "签出成功",
  "data": {
    "reservation": {
      "id": 1,
      "status": "completed",
      "checkedOutAt": "2024-01-15T09:55:00Z",
      "updatedAt": "2024-01-15T09:55:00Z"
    }
  }
}
```

**业务规则：**
- 只能签出自己的预约
- 必须先签入才能签出
- 状态必须为 `checked_in`
- 签出后状态变为 `completed`

---

## 管理员接口（Phase 3）

### 8. 获取所有预约（管理员）

**GET** `/api/gym/reservations`

获取所有用户的预约（仅管理员）。

**查询参数：**
- `date` (可选): 过滤日期
- `status` (可选): 过滤状态
- `userId` (可选): 过滤用户ID
- `limit` (可选): 返回数量限制
- `offset` (可选): 偏移量

**响应：**
```json
{
  "success": true,
  "data": {
    "reservations": [...],
    "count": 10
  }
}
```

---

### 9. 配置时间段（管理员）

**GET** `/api/gym/time-slots/config`

获取时间段配置。

**响应：**
```json
{
  "success": true,
  "data": {
    "timeSlots": [
      {
        "id": 1,
        "startTime": "07:00",
        "endTime": "22:00",
        "isAvailable": true
      }
    ]
  }
}
```

**PUT** `/api/gym/time-slots/config`

更新时间段配置。

**请求体：**
```json
{
  "timeSlots": [
    {
      "startTime": "09:00",
      "endTime": "10:00",
      "isAvailable": true
    },
    {
      "startTime": "10:00",
      "endTime": "11:00",
      "isAvailable": false
    }
  ]
}
```

---

### 10. 获取预约统计（管理员）

**GET** `/api/gym/statistics`

获取预约统计数据。

**查询参数：**
- `startDate` (可选): 开始日期
- `endDate` (可选): 结束日期

**响应：**
```json
{
  "success": true,
  "data": {
    "totalReservations": 100,
    "completedReservations": 80,
    "cancelledReservations": 10,
    "pendingReservations": 10,
    "popularTimeSlots": [
      {
        "startTime": "09:00",
        "endTime": "10:00",
        "count": 20
      }
    ]
  }
}
```

---

## 业务规则总结

### 预约规则
1. **提前预约时间**：最多提前14天
2. **每日限制**：每天最多1个时间段
3. **连续预约**：不允许连续预约多个时间段
4. **时间段范围**：7:00-22:00
5. **时长限制**：最多2小时（120分钟）

### 签入/签出规则
1. **签入时间**：预约开始前15分钟可以签入
2. **签出要求**：必须手动签出
3. **超时取消**：预约开始15分钟后未签入，自动取消

### 权限规则
1. **所有注册用户**：可以预约、查看自己的预约、签入/签出、取消自己的预约
2. **管理员**：可以查看所有预约、配置时间段、查看统计

---

## 数据库表结构建议

### gym_reservations
```sql
CREATE TABLE gym_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT NOT NULL, -- HH:mm
  end_time TEXT NOT NULL, -- HH:mm
  duration INTEGER NOT NULL, -- minutes
  status TEXT NOT NULL DEFAULT 'pending', -- pending, checked_in, completed, cancelled
  checked_in_at TEXT, -- ISO 8601
  checked_out_at TEXT, -- ISO 8601
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_gym_reservations_date ON gym_reservations(date);
CREATE INDEX idx_gym_reservations_user_id ON gym_reservations(user_id);
CREATE INDEX idx_gym_reservations_status ON gym_reservations(status);
```

### gym_time_slots_config
```sql
CREATE TABLE gym_time_slots_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_time TEXT NOT NULL, -- HH:mm
  end_time TEXT NOT NULL, -- HH:mm
  is_available INTEGER NOT NULL DEFAULT 1, -- 0 or 1
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

