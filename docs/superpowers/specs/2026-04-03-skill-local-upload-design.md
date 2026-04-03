# Skill 本地上传设计

## 背景

当前 Skill 包通过腾讯 COS 上传，改为上传到本服务器本地文件系统。

## 目标

- 将 Skill 包存储到服务器本地文件系统
- 复用现有的 `/api/v1/skills/upload-package` 接口
- 新增带认证的文件访问接口
- 保持现有的权限校验逻辑

## 实现

### 1. 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SKILL_UPLOAD_DIR` | 本地存储目录 | `./uploads/skills` |

### 2. 本地上传

**修改文件：** `src/app/api/v1/skills/upload-package/route.ts`

- 移除 `uploadSkillPackageToTencentCos` 调用
- 新增 `uploadSkillPackageToLocal(input)` 函数：
  - 生成 objectKey（与原 COS 相同的路径规则）
  - 将文件 buffer 写入 `{SKILL_UPLOAD_DIR}/{objectKey}`
  - 返回 `{ objectKey, url, fileName, size }`
- `url` 为相对路径：`/api/v1/skills/files/{objectKey}`

### 3. 文件访问接口

**新增文件：** `src/app/api/v1/skills/files/[...filepath]/route.ts`

- `GET` 请求
- 校验 JWT（复用 `requireManagementAuth`）
- 拼接文件路径：`{SKILL_UPLOAD_DIR}/{filepath}`
- 验证路径安全（防止路径遍历）
- 返回文件流，设置 `Content-Type`、`Content-Disposition`

### 4. 路径安全

- 使用 `path.resolve` 和 `startsWith` 校验文件真实路径
- 禁止 `..` 路径遍历

## 文件结构

```
src/app/api/v1/skills/
├── upload-package/
│   └── route.ts              # 修改：本地存储
└── files/
    └── [..filepath]/
        └── route.ts          # 新增：文件访问
```

## 数据流

```
前端上传 → POST /api/v1/skills/upload-package
        → 保存到 {SKILL_UPLOAD_DIR}/skills/company/xxx/identifier/version/xxx.zip
        → 返回 { objectKey, url: "/api/v1/skills/files/skills/company/xxx/...", size }

前端访问 → GET /api/v1/skills/files/skills/company/xxx/...
        → 校验 JWT
        → 读取本地文件并返回
```
