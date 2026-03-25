# Skill/MCP 系统闭环整改计划

> 目标读者：按批次执行修改的开发者。本文把当前识别出的 10 处未闭环逻辑按优先级和依赖关系拆成可执行批次，避免并行改动互相打架。

**Goal:** 让系统的“资源发现、申请、审批、授权、消费、撤销”形成完整闭环，并让角色权限、OAuth、导航交互与真实后端能力一致。

**Current Gaps:** 当前已识别 10 处未闭环逻辑，其中 P0 级 4 组、P1 级 3 组、P2 级 3 组。

**Recommended Strategy:** 先修基础语义和数据模型，再修审批授权主链路，然后补角色权限与 OAuth，最后收尾页面交互和运营性问题。不要反过来做，否则前面的模型一变，后面的 UI 和接口要重做。

---

## 问题分类

### A. 授权与资源消费闭环缺失

1. 审批通过只改 `ResourceApplication.status`，没有形成独立授权关系。
2. 部门资源读取链路直接按 `organizationId` 返回，绕过审批结果。
3. `ResourceApplication` 同时承担“申请记录”和“是否已授权”的职责，语义混杂。

### B. 组织与角色模型不一致

4. `departmentId`、`organizationId`、部门资源归属、部门管理员审批范围之间没有统一语义。
5. 组织 `path` 生成逻辑错误，后代查询依赖这个字段，后续权限计算存在隐患。
6. 部门管理员在 UI 上可见的入口和后端真实允许的动作不一致。

### C. OAuth 与外部接入不完整

7. OAuth `prompt=consent` 已有入口，但没有真实同意/拒绝页面。
8. OAuth `scope`、refresh token、revoke 只有部分实现，没有形成完整约束。
9. `OAuthClient` 有数据库模型，但没有管理入口，客户端接入闭环缺失。

### D. 页面与交互尾巴未收

10. 搜索、设置页、首页快速操作存在空链路或半链路。

---

## 批次总览

| Batch | Priority | Theme | 解决问题 | 建议产出 |
| --- | --- | --- | --- | --- |
| Batch 1 | P0 | 基础语义收口 | A2, A3, B4, B5 | 数据模型和权限语义统一 |
| Batch 2 | P0 | 申请-审批-授权主链路 | A1, A2, A3 | 可真正授予/撤销资源的闭环 |
| Batch 3 | P1 | 角色与管理边界收口 | B4, B6 | 部门管理员与用户字段一致 |
| Batch 4 | P1 | OAuth 闭环补齐 | C7, C8, C9 | 外部接入可真正使用 |
| Batch 5 | P2 | 页面与运维收尾 | D10 | 可用性和执行效率提升 |

---

## 执行前统一决策

- [ ] **Decision 1: 明确“发现资源”和“真正可用资源”是两个概念**

推荐方案：

- 发现页可以展示公司级资源、同组织下可申请的部门资源、自己的个人资源。
- 真正供用户消费的资源列表必须以“公司级 + 自己的个人资源 + 已授权的部门资源”为准。
- `ResourceApplication` 只保留申请/审批流程语义，不再承担“已授权事实”的职责。

- [ ] **Decision 2: 统一组织语义**

推荐方案：

- `organizationId` 表示资源所属组织节点。
- `departmentId` 表示用户作为“部门管理员”的管理范围。
- 部门资源是否可被某用户使用，不由“同组织”直接决定，而由显式授权决定。

- [ ] **Decision 3: 保留部门管理员角色，但权限范围要真实可执行**

推荐方案：

- 部门管理员可审批本部门资源申请。
- 部门管理员可管理本部门资源。
- 用户创建、组织创建、跨部门资源管理继续保持 super admin 独占。

---

## Batch 1: 基础语义与组织模型收口

**Goal:** 修正后续所有权限判断所依赖的基础语义，避免先在错误模型上继续叠逻辑。

**Primary Files:**

- `prisma/schema.prisma`
- `src/lib/organizations.ts`
- `src/app/api/v1/organizations/route.ts`
- `src/app/api/v1/users/[id]/skills/route.ts`
- `src/app/api/v1/users/[id]/mcps/route.ts`
- `src/app/(client)/client/page.tsx`
- `src/app/api/client/skills/route.ts`
- `src/app/api/client/mcps/route.ts`

### Steps

- [ ] **Step 1: 新增独立授权模型**

推荐新增一个统一表，例如 `ResourceGrant`：

- 字段建议：`id`, `resourceType`, `resourceId`, `userId`, `grantedBy`, `grantedAt`, `revokedAt`, `sourceApplicationId`
- 唯一约束建议：`resourceType + resourceId + userId + revokedAt(is null)` 的可用授权唯一

如果不想做统一表，也可拆成 `UserSkillGrant` 与 `UserMcpGrant` 两张表，但后续代码会更分散。

- [ ] **Step 2: 修正组织 path 生成逻辑**

当前 `buildOrganizationPath(parentId)` 使用的是 `parent.name` 生成 slug，这会让子节点 path 错误。需要改成类似：

- `buildOrganizationPath(parentId, currentName)`
- slug 基于新组织自己的名称生成
- 如需支持同级重名，需要加入唯一化策略

- [ ] **Step 3: 明确用户资源接口的返回语义**

`/api/v1/users/[id]/skills` 和 `/api/v1/users/[id]/mcps` 应定义为“用户当前可消费资源列表”，而不是“用户所在组织下可见资源列表”。

返回逻辑建议改为：

- 公司级资源：直接返回
- 个人资源：只有本人自己的返回
- 部门资源：只有已存在有效 `ResourceGrant` 的返回

- [ ] **Step 4: 明确客户端发现页的返回语义**

客户端页和 `/api/client/skills`、`/api/client/mcps` 应定义为“资源发现页”，允许返回：

- 公司级资源
- 同组织下的部门资源
- 本人个人资源
- 同时返回 `applicationStatus` 与 `grantStatus`

这样发现页和消费接口职责分离，后续逻辑会清晰很多。

- [ ] **Step 5: 补迁移方案**

需要为现有数据准备一次性迁移：

- 历史 `approved` 的申请记录如何转成 `ResourceGrant`
- 已失效资源或已离职用户如何处理
- 是否保留被拒绝、已审批申请作为历史记录

### Acceptance

- [ ] 新组织创建后，`path` 能正确反映自己的层级位置
- [ ] 用户资源 API 不再因为“同组织”直接拿到未授权部门资源
- [ ] 发现页与消费接口的职责边界清晰
- [ ] Prisma migration 和 seed 可以正常执行

---

## Batch 2: 申请-审批-授权主链路闭环

**Goal:** 让申请通过后真的获得资源，申请拒绝和撤销也有真实后果。

**Primary Files:**

- `src/app/api/client/skills/[id]/apply/route.ts`
- `src/app/api/client/mcps/[id]/apply/route.ts`
- `src/app/api/admin/applications/route.ts`
- `src/app/api/admin/applications/[id]/approve/route.ts`
- `src/app/api/admin/applications/[id]/reject/route.ts`
- `src/app/(client)/client/page.tsx`
- `src/components/client/apply-button.tsx`
- `src/app/api/v1/users/[id]/skills/route.ts`
- `src/app/api/v1/users/[id]/mcps/route.ts`

### Steps

- [ ] **Step 1: 规范申请状态机**

建议状态：

- `pending`
- `approved`
- `rejected`
- `revoked` 或保留为授权表中的 `revokedAt`

`ResourceApplication` 只表示流程，不直接等于“拥有权限”。

- [ ] **Step 2: 审批通过时创建授权**

审批通过动作应成为事务：

- 更新申请为 `approved`
- 创建或恢复对应 `ResourceGrant`
- 记录审批人

如果授权已存在，应幂等处理，而不是产生重复记录。

- [ ] **Step 3: 审批拒绝时只更新流程，不创建授权**

拒绝动作应：

- 更新申请状态为 `rejected`
- 不产生 `ResourceGrant`

- [ ] **Step 4: 补授权撤销链路**

至少要补一条后台可用的撤销路径，建议支持：

- 用户被删除或停用时撤销其所有有效授权
- 资源被停用或删除时撤销相关授权
- 后台手工撤销某个用户对某个资源的授权

- [ ] **Step 5: 修正客户端页面状态展示**

页面应区分：

- 可直接使用
- 待审批
- 被拒绝
- 可重新申请

不要再只有 `none/pending/approved` 三种过粗状态。

- [ ] **Step 6: 处理重复申请和重提申请**

建议规则：

- 已授权：不允许重复申请
- 待审批：提示正在审批中
- 已拒绝：允许重新发起申请，或者显式要求管理员重新打开申请

### Acceptance

- [ ] 申请通过后，用户消费接口能看到新增资源
- [ ] 申请被拒绝后，用户消费接口看不到资源
- [ ] 撤销授权后，用户消费接口立刻失效
- [ ] 同一资源重复审批、重复申请不会产生脏数据

---

## Batch 3: 角色与管理边界收口

**Goal:** 让“看到什么入口、能做什么动作、数据库里存了哪些角色字段”三者一致。

**Primary Files:**

- `src/app/api/v1/admin/users/route.ts`
- `src/app/api/v1/admin/users/[id]/route.ts`
- `src/components/users/user-form-dialog.tsx`
- `src/components/users/user-edit-dialog.tsx`
- `src/components/layout/sidebar.tsx`
- `src/app/api/v1/skills/route.ts`
- `src/app/api/v1/skills/[id]/route.ts`
- `src/app/api/v1/mcps/route.ts`
- `src/app/api/v1/mcps/[id]/route.ts`
- `src/app/(dashboard)/dashboard/skills/page.tsx`
- `src/app/(dashboard)/dashboard/mcps/page.tsx`

### Steps

- [ ] **Step 1: 在用户管理中补齐角色字段**

当前 schema 已有：

- `isDepartmentAdmin`
- `departmentId`

但用户管理 UI/API 没有形成完整编辑链路。需要补上创建、编辑、查询、展示。

- [ ] **Step 2: 定义部门管理员真实权限边界**

推荐边界：

- 可查看并审批自己 `departmentId` 范围内的申请
- 可管理自己部门下的部门级资源
- 不可创建公司级资源
- 不可跨部门编辑资源
- 不可管理全量用户和组织

- [ ] **Step 3: 让路由鉴权与侧边栏一致**

两种方案二选一，推荐方案 A：

- 方案 A：部门管理员真的拥有“本部门资源管理”能力
- 方案 B：隐藏 Skills/MCP 管理入口，只保留审批入口

推荐走方案 A，因为 schema 和当前页面已经明显朝这个方向设计。

- [ ] **Step 4: 给资源接口补“按部门范围限制”的服务端校验**

部门管理员访问资源列表、编辑、删除时，需要加服务端范围校验，不能只靠前端隐藏按钮。

- [ ] **Step 5: 自查个人用户入口**

普通用户在 `/dashboard/skills`、`/dashboard/mcps` 看到的页面标题和能力要与真实权限一致。如果这些页面仅用于管理，应考虑重定向到 `/client` 或降级成只读页面。

### Acceptance

- [ ] 用户管理页能完整创建和编辑部门管理员
- [ ] 部门管理员只看到自己真正有权限执行的功能
- [ ] 部门管理员越权访问其他部门资源会被后端拒绝
- [ ] 普通用户不会进入误导性的“管理”页面

---

## Batch 4: OAuth 与外部接入闭环

**Goal:** 让 OAuth 从“能发 code/token”升级为“真正可安全接入外部客户端”。

**Primary Files:**

- `src/components/auth/login-form-client.tsx`
- `src/app/api/v1/auth/authorize/route.ts`
- `src/app/api/v1/auth/authorize/consent/route.ts`
- `src/app/api/v1/auth/token/route.ts`
- `src/app/api/v1/auth/revoke/route.ts`
- `src/middleware/api-auth.ts`
- `src/lib/oauth.ts`
- `prisma/schema.prisma`
- 新增 OAuth client 管理页面与接口

### Steps

- [ ] **Step 1: 增加真实 consent 页面**

当前授权流程是登录后直接发 code。需要改成：

- 登录成功后进入 consent 页面
- 展示 client 名称、申请 scope、redirect URI
- 用户可“同意 / 拒绝”
- 拒绝时按 OAuth 规范回跳错误参数

- [ ] **Step 2: 让 scope 真正生效**

需要增加 scope 校验工具，例如：

- `requireScopes(['skills:read'])`
- `requireScopes(['mcps:read'])`

相关 API 在 Bearer token 模式下必须校验 scope，而不是只要 token 有效就放行。

- [ ] **Step 3: 收紧 token 生命周期**

建议至少完成以下任一方案：

- 方案 A：refresh token 仍使用 JWT，但刷新时必须校验 token 类型和有效期
- 方案 B：refresh token 改为数据库存储的随机 opaque token

推荐方案 B，更易做吊销和轮换。

- [ ] **Step 4: 完善 revoke 语义**

`/api/v1/auth/revoke` 需要明确：

- 谁可以 revoke
- 按 access token revoke，还是按 refresh token revoke，还是整组 token family revoke
- revoke 后旧 token 是否立即失效

- [ ] **Step 5: 增加 OAuthClient 管理入口**

至少要支持：

- 创建 client
- 生成/重置 `client_secret`
- 生成/重置 API key
- 维护 `allowedRedirectUris`
- 启停 client

- [ ] **Step 6: 修正 redirect URI 的存储和校验方式**

当前是字符串 `includes` 风格校验，建议改为结构化存储并精确匹配，避免误匹配。

### Acceptance

- [ ] OAuth 登录后会先展示 consent 页面，而不是直接授权
- [ ] 无 scope 的 token 调用受限 API 会被正确拒绝
- [ ] refresh token 可轮换、可吊销、可失效
- [ ] 管理员可以在后台创建并维护 OAuth client

---

## Batch 5: 页面与执行效率收尾

**Goal:** 清理空入口和半链路，让系统对使用者和维护者都更友好。

**Primary Files:**

- `src/components/ui/data-table.tsx`
- `src/app/(dashboard)/dashboard/users/UsersClient.tsx`
- `src/app/(dashboard)/dashboard/skills/SkillsClient.tsx`
- `src/app/(dashboard)/dashboard/mcps/McpsClient.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/client-sidebar.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- 新增或移除 settings 页面
- 增加 ESLint 配置

### Steps

- [ ] **Step 1: 让搜索真正走服务端**

当前表格搜索只改了本地 filter，没有驱动 URL 和服务端请求。需要做到：

- 输入搜索词后同步到 query string
- Client 组件根据 URL 重新发请求
- 后端分页、搜索保持一致

- [ ] **Step 2: 处理 settings 死链**

二选一即可：

- 真正实现 `/dashboard/settings` 与 `/client/settings`
- 在未实现前移除入口

- [ ] **Step 3: 让首页快速操作真正可用**

首页“添加用户 / 添加 Skill / 添加 MCP / 系统设置”应至少做到其一：

- 跳转到对应页面
- 打开对应弹窗
- 暂时隐藏未实现项

- [ ] **Step 4: 初始化 ESLint 非交互配置**

当前 `npm run lint` 会进入交互式向导，不利于持续检查。需要补：

- ESLint 配置文件
- CI 或本地可直接执行的 `lint` 命令

### Acceptance

- [ ] 搜索能真正影响后端结果
- [ ] 所有导航入口要么可用，要么被移除
- [ ] 首页按钮不存在“点击没效果”
- [ ] `npm run lint` 可以非交互执行

---

## 推荐执行顺序

- [ ] **PR 1 / Batch 1:** 先完成基础语义、授权模型、组织 path 修正
- [ ] **PR 2 / Batch 2:** 再打通申请、审批、授权、撤销主链路
- [ ] **PR 3 / Batch 3:** 收部门管理员和用户角色边界
- [ ] **PR 4 / Batch 4:** 完成 OAuth 真闭环
- [ ] **PR 5 / Batch 5:** 最后收页面尾巴和 lint

---

## 每批完成后的回归清单

- [ ] 管理员登录与普通用户登录都能正常访问各自首页
- [ ] 普通用户能看到发现页，但不会消费到未授权部门资源
- [ ] 部门管理员只在自己的管理范围内审批与管理资源
- [ ] OAuth code、token、revoke 流程按预期工作
- [ ] 删除用户、停用资源、撤销授权后，消费接口结果同步更新
- [ ] `npm run build` 与 `npm run lint` 可执行

---

## 不建议现在就做的事

- [ ] 不要先改首页和设置页，再回头重做权限模型
- [ ] 不要继续把 `ResourceApplication` 当作最终授权事实来源
- [ ] 不要只在前端隐藏按钮而不补服务端范围校验
- [ ] 不要在 OAuth scope 还未生效时直接对外开放更多接口

---

## 本计划对应的当前问题编号

| 编号 | 问题 | 归属批次 |
| --- | --- | --- |
| 1 | 审批结果未落成授权关系 | Batch 2 |
| 2 | 部门资源读取绕过审批 | Batch 1, Batch 2 |
| 3 | 申请记录与授权事实混用 | Batch 1, Batch 2 |
| 4 | `departmentId` / `organizationId` 语义不统一 | Batch 1, Batch 3 |
| 5 | 组织 path 生成错误 | Batch 1 |
| 6 | 部门管理员 UI 与后端能力不一致 | Batch 3 |
| 7 | OAuth consent 缺失 | Batch 4 |
| 8 | OAuth scope / refresh / revoke 不完整 | Batch 4 |
| 9 | OAuthClient 无管理入口 | Batch 4 |
| 10 | 搜索、设置、快速操作空链路 | Batch 5 |
