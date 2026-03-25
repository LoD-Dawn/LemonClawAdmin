# LemonClaw 桌面端配额接口对接文档

本文档基于当前管理端实现整理，适用于桌面端接入以下接口：

- `GET /api/external/v1/me/models`
- `GET /api/external/v1/me/quota`
- `POST /api/external/v1/claw/sessions/prepare`
- `POST /api/external/v1/claw/sessions/heartbeat`
- `POST /api/external/v1/claw/sessions/finish`
- `GET /api/external/v1/claw/sessions/{reservationId}`
- `GET /api/external/v1/me/usage-summary`

## 1. 总体原则

- 管理端是唯一权威，负责模型可用性、积分结算、会话准入、剩余时长返回。
- 桌面端只负责选择具体模型、申请会话、定时上报活跃时长、结束时结算、展示服务端返回的余额和时长。
- 桌面端不再传 `mode`，只传 `provider` 和 `model`。
- 桌面端不得本地扣积分，不得本地推导最终余额。
- 超级管理员、部门管理员为“无限使用”用户：
  - 不受积分不足限制
  - 不扣积分
  - 返回中会带 `isUnlimited: true`，余额字段可能为 `null`

## 2. 认证与 Scope

请求前缀：

```text
/api/external/v1
```

认证方式：

```http
Authorization: Bearer <access_token>
```

桌面端默认建议申请以下 scope：

```text
models:read quota:read claw:sessions:write
```

推荐公共请求头：

```http
Authorization: Bearer <access_token>
Content-Type: application/json
X-Client-Version: 1.0.0
X-Platform: desktop-win32
X-Request-Id: <uuid>
```

## 3. 统一响应格式

成功：

```json
{
  "code": "OK",
  "message": "",
  "data": {}
}
```

失败：

```json
{
  "code": "QUOTA_NOT_ENOUGH",
  "message": "当前配额不足，无法启动 Claw",
  "data": {}
}
```

常见错误码：

- `OK`
- `UNAUTHORIZED`
- `AUTH_INVALID`
- `MODEL_DISABLED`
- `MODEL_NOT_FOUND`
- `QUOTA_NOT_ENOUGH`
- `QUOTA_EXHAUSTED`
- `RESERVATION_NOT_FOUND`
- `RESERVATION_CLOSED`
- `IDEMPOTENCY_CONFLICT`
- `INVALID_PARAMS`

## 4. 关键业务规则

### 4.1 模型选择

桌面端必须先调用 `GET /me/models` 获取模型列表，再让用户选择具体模型。

桌面端提交会话时只传：

- `provider`
- `model`

管理端内部按模型配置决定：

- `billingTier`
- `billingTierName`
- `creditPerMinute`
- `maxSessionSeconds`
- `toolPolicy`

### 4.2 普通用户与无限用户

普通用户：

- `GET /me/quota` 返回 `creditBalance`、`remainingClawSeconds`
- `prepare/heartbeat/finish` 会真正扣积分

无限用户：

- 当前实现中为 `超级管理员` 和 `部门管理员`
- `GET /me/quota` 返回 `isUnlimited: true`
- `remainingClawSeconds` 为 `null`
- `prepare/heartbeat/finish` 返回 `isUnlimited: true`
- `creditBalance` 可能为 `null`

桌面端展示建议：

- 如果 `isUnlimited === true`，直接展示“无限使用”
- 不再展示基于积分计算出来的剩余时长

### 4.3 幂等

以下接口必须传 `idempotencyKey`：

- `prepare`
- `heartbeat`
- `finish`

要求：

- 同一个 `idempotencyKey` 重试时，服务端返回相同结果
- 相同 `idempotencyKey` 但请求体不同，返回 `IDEMPOTENCY_CONFLICT`
- `finish` 必须幂等，避免重复扣费

### 4.4 心跳口径

服务端当前以 `activeSecondsDelta` 作为本次可新增时长的核心依据，`totalActiveSeconds` 主要用于交叉校验。

桌面端建议：

- 按固定周期上报，例如每 30 秒一次
- `activeSecondsDelta` 填本周期新增活跃秒数
- `totalActiveSeconds` 填本地累计活跃秒数
- 但真正是否被服务端接受，以响应中的 `serverAcceptedTotalActiveSeconds` 为准

如果本次上报：

- `activeSecondsDelta=30`
- `totalActiveSeconds=150`

服务端最多只会接受当前累计值再增加 30 秒，不会直接跳到 150 秒。

因此桌面端应始终以服务端回包为最终口径。

## 5. 接口详情

## 5.1 获取模型列表

```http
GET /api/external/v1/me/models
```

用途：

- 渲染模型选择器
- 获取模型计费元信息

响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "providers": [
      {
        "provider": "anthropic",
        "models": [
          {
            "model": "claude-sonnet-4",
            "displayName": "Claude Sonnet 4",
            "enabled": true,
            "usageMeta": {
              "billingTier": "tier_2",
              "billingTierName": "高级模型",
              "creditPerMinute": 2,
              "maxSessionSeconds": 1800,
              "toolPolicy": "full",
              "estimatedRemainingMinutes": 340,
              "isUnlimited": false
            }
          }
        ]
      }
    ],
    "updatedAt": "2026-03-25T10:50:27.872Z"
  }
}
```

字段说明：

- `enabled`: 是否允许选择
- `estimatedRemainingMinutes`: 普通用户为估算值；无限用户会返回一个很大的占位值，桌面端应优先看 `isUnlimited`
- `usageMeta.isUnlimited`: 可选，管理员角色为 `true`

## 5.2 获取当前配额

```http
GET /api/external/v1/me/quota
```

普通用户响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "userId": "u_123",
    "isUnlimited": false,
    "creditBalance": 680,
    "remainingClawSeconds": 40800,
    "pricingVersion": "2026-03-v2",
    "expiresAt": null,
    "updatedAt": "2026-03-25T10:00:00Z"
  }
}
```

无限用户响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "userId": "u_admin",
    "isUnlimited": true,
    "creditBalance": 0,
    "remainingClawSeconds": null,
    "pricingVersion": "2026-03-v2",
    "expiresAt": null,
    "updatedAt": "2026-03-25T10:00:00Z"
  }
}
```

桌面端建议：

- `isUnlimited=true` 时直接展示“无限使用”
- `remainingClawSeconds=null` 不要再换算时长

## 5.3 启动前申请会话

```http
POST /api/external/v1/claw/sessions/prepare
```

请求体：

```json
{
  "clientSessionId": "cowork_abc123",
  "provider": "anthropic",
  "model": "claude-sonnet-4",
  "entry": "cowork_start",
  "workspacePath": "D:\\project\\demo",
  "estimatedSeconds": 900,
  "idempotencyKey": "prepare_cowork_abc123_1"
}
```

字段说明：

- `clientSessionId`: 桌面端本地会话 ID，建议单次 Claw 会话全局唯一
- `entry`: 当前实现支持 `cowork_start | cowork_continue`
- `workspacePath`: 可选，仅审计用途
- `estimatedSeconds`: 可选，客户端预估时长

普通用户成功响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "allowed": true,
    "reservationId": "rsv_xxx",
    "clientSessionId": "cowork_abc123",
    "provider": "anthropic",
    "model": "claude-sonnet-4",
    "billingTier": "tier_2",
    "billingTierName": "高级模型",
    "creditPerMinute": 2,
    "maxSessionSeconds": 1800,
    "toolPolicy": "full",
    "grantedSeconds": 1200,
    "creditBalance": 680,
    "remainingClawSeconds": 40800,
    "pricingVersion": "2026-03-v2"
  }
}
```

无限用户成功响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "allowed": true,
    "reservationId": "rsv_xxx",
    "clientSessionId": "cowork_abc123",
    "provider": "anthropic",
    "model": "claude-sonnet-4",
    "billingTier": "tier_2",
    "billingTierName": "高级模型",
    "creditPerMinute": 2,
    "maxSessionSeconds": 1800,
    "toolPolicy": "full",
    "grantedSeconds": 1800,
    "creditBalance": null,
    "remainingClawSeconds": null,
    "pricingVersion": "2026-03-v2",
    "isUnlimited": true
  }
}
```

额度不足：

```json
{
  "code": "QUOTA_NOT_ENOUGH",
  "message": "当前配额不足，无法启动 Claw",
  "data": {
    "allowed": false,
    "provider": "anthropic",
    "model": "claude-sonnet-4",
    "creditBalance": 1,
    "remainingClawSeconds": 60
  }
}
```

模型不可用：

```json
{
  "code": "MODEL_DISABLED",
  "message": "当前模型暂不可用",
  "data": {
    "allowed": false,
    "provider": "anthropic",
    "model": "claude-sonnet-4"
  }
}
```

## 5.4 运行中心跳

```http
POST /api/external/v1/claw/sessions/heartbeat
```

请求体：

```json
{
  "reservationId": "rsv_xxx",
  "clientSessionId": "cowork_abc123",
  "activeSecondsDelta": 30,
  "totalActiveSeconds": 150,
  "status": "running",
  "sentAt": "2026-03-25T10:05:30Z",
  "idempotencyKey": "heartbeat_rsv_xxx_5"
}
```

字段说明：

- `status`: 当前实现支持 `running | paused | waiting_user`
- `serverAcceptedTotalActiveSeconds`: 以这个字段作为最终服务端累计口径

普通用户成功响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "allowed": true,
    "reservationId": "rsv_xxx",
    "serverAcceptedTotalActiveSeconds": 150,
    "creditBalance": 678,
    "remainingClawSeconds": 40680,
    "shouldStop": false
  }
}
```

无限用户成功响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "allowed": true,
    "reservationId": "rsv_xxx",
    "serverAcceptedTotalActiveSeconds": 150,
    "creditBalance": null,
    "remainingClawSeconds": null,
    "shouldStop": false,
    "isUnlimited": true
  }
}
```

配额耗尽：

```json
{
  "code": "QUOTA_EXHAUSTED",
  "message": "配额已用尽，请结束当前会话",
  "data": {
    "allowed": false,
    "reservationId": "rsv_xxx",
    "creditBalance": 0,
    "remainingClawSeconds": 0,
    "shouldStop": true
  }
}
```

已关闭会话继续发心跳：

```json
{
  "code": "RESERVATION_CLOSED",
  "message": "当前会话已关闭",
  "data": {
    "reservationId": "rsv_xxx"
  }
}
```

桌面端建议：

- 只要 `shouldStop=true`，立即停止继续使用并进入 `finish`
- 将本地累计值对齐到 `serverAcceptedTotalActiveSeconds`

## 5.5 会话结束结算

```http
POST /api/external/v1/claw/sessions/finish
```

请求体：

```json
{
  "reservationId": "rsv_xxx",
  "clientSessionId": "cowork_abc123",
  "totalActiveSeconds": 188,
  "finishReason": "completed",
  "lastErrorCode": null,
  "idempotencyKey": "finish_rsv_xxx"
}
```

`finishReason` 当前支持：

- `completed`
- `stopped_by_user`
- `error`
- `quota_exhausted`
- `auth_invalid`
- `network_lost`

普通用户成功响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "reservationId": "rsv_xxx",
    "provider": "anthropic",
    "model": "claude-sonnet-4",
    "billingTier": "tier_2",
    "finalConsumedCredits": 8,
    "finalActiveSeconds": 188,
    "creditBalance": 672,
    "remainingClawSeconds": 40320,
    "closed": true
  }
}
```

无限用户成功响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "reservationId": "rsv_xxx",
    "provider": "anthropic",
    "model": "claude-sonnet-4",
    "billingTier": "tier_2",
    "finalConsumedCredits": 0,
    "finalActiveSeconds": 188,
    "creditBalance": null,
    "remainingClawSeconds": null,
    "closed": true,
    "isUnlimited": true
  }
}
```

## 5.6 查询单个会话状态

```http
GET /api/external/v1/claw/sessions/{reservationId}
```

用途：

- 崩溃恢复
- 网络恢复后同步状态
- 避免重复结算

响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "reservationId": "rsv_xxx",
    "status": "running",
    "clientSessionId": "cowork_abc123",
    "provider": "anthropic",
    "model": "claude-sonnet-4",
    "serverAcceptedTotalActiveSeconds": 150,
    "closed": false
  }
}
```

## 5.7 查询使用汇总

```http
GET /api/external/v1/me/usage-summary?range=7d
```

当前只支持类似 `7d` 的天数范围。

响应示例：

```json
{
  "code": "OK",
  "message": "",
  "data": {
    "range": "7d",
    "consumedCredits": 124,
    "usedClawSeconds": 7260,
    "sessions": 18
  }
}
```

## 6. 推荐接入顺序

### 6.1 启动桌面端

1. 获取 token
2. 调用 `GET /me/models`
3. 调用 `GET /me/quota`
4. 渲染模型列表和当前余额

### 6.2 用户点击开始 Claw

1. 调用 `POST /claw/sessions/prepare`
2. 若 `allowed=false` 或错误码非 `OK`，直接提示用户
3. 若成功，保存：
   - `reservationId`
   - `grantedSeconds`
   - `creditPerMinute`
   - `maxSessionSeconds`
   - `toolPolicy`

### 6.3 运行中

1. 每个固定周期调用 `POST /claw/sessions/heartbeat`
2. 用响应中的 `serverAcceptedTotalActiveSeconds` 覆盖本地显示口径
3. 用响应中的余额/时长刷新 UI
4. 若 `shouldStop=true`，立即进入结束流程

### 6.4 结束时

1. 调用 `POST /claw/sessions/finish`
2. 用响应中的 `finalConsumedCredits`、`creditBalance`、`remainingClawSeconds` 更新 UI
3. 清除本地 `reservationId`

### 6.5 异常恢复

场景：

- 客户端崩溃重启
- 心跳超时
- 用户网络切换

恢复建议：

1. 本地如果还持有 `reservationId`
2. 先调 `GET /claw/sessions/{reservationId}`
3. 如果 `closed=false`，继续发送心跳或直接 finish
4. 如果 `closed=true`，以服务端状态为准，不再重复扣费

## 7. 桌面端展示建议

普通用户：

- 显示积分余额
- 显示剩余可用时长
- 显示当前模型每分钟积分消耗

无限用户：

- 直接显示“无限使用”
- 隐藏积分倒计时
- 可继续显示模型 `creditPerMinute` 作为参考，但不要用它限制使用

## 8. 实现注意事项

- `clientSessionId` 应稳定且唯一，建议一轮实际会话只生成一次
- `idempotencyKey` 不要复用到不同请求体
- `finish` 即使在本地认为已经结束，也建议重试到成功，直到服务端确认 `closed=true`
- 如果服务端返回 `AUTH_INVALID` 或 `UNAUTHORIZED`，桌面端应重新走登录/刷新 token
- 如果服务端返回 `MODEL_DISABLED`，应要求用户重新选择模型
- 如果服务端返回 `QUOTA_NOT_ENOUGH` 或 `QUOTA_EXHAUSTED`，应停止会话并刷新配额展示

## 9. 当前实现与原始草案的差异

当前代码实现相对原始草案，新增了以下兼容字段：

- `isUnlimited`
  - 出现在 `GET /me/quota`
  - 也可能出现在 `models.prepare.heartbeat.finish` 的响应 `data` 中

当前代码实现中，管理员无限使用为真实后端规则，不只是前端展示策略。

