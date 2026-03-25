# Skill/MCP 系统需求对齐剩余实施清单

> 产出日期：2026-03-21
> 对照基线：`docs/2026-03-21-requirements-alignment-implementation-plan.md`
> 目的：基于当前代码现状，整理尚未完全实现的事项，便于按清单继续执行。

## 1. 结论摘要

当前项目已经完成了大部分主链路：

- 发现接口 / 消费接口已分离
- 申请 / 审批 / 拒绝 / 撤销已形成基本闭环
- 用户端已区分“我的可用资源”和“资源发现”
- 未授权部门资源已隐藏敏感配置
- 运行时权限校验与 scope 校验已接入
- 通用资源导入器已具备 `dry-run` / `upsert` / `report`

但计划并未全部完成，当前更准确的状态是：

- Phase 1：部分完成
- Phase 2：基本完成
- Phase 3：部分完成
- Phase 4：基本完成
- Phase 5：部分完成
- Phase 6：部分完成

如果目标是“满足实施计划全部验收项”，仍需继续补齐以下几类能力：

1. 数据模型与组织语义彻底收口
2. 管理台的授权管理与统计能力
3. 运行时真实转发执行能力
4. 真实 CoPaw / OpenClaw 文件格式导入
5. 技术验收项中的 build / 测试补齐

---

## 2. 当前状态判定

### 2.1 可视为已完成的部分

- 发现接口与消费接口职责已拆分
- 消费权限已以 `ResourceGrant` 为主
- 审批通过时已创建或恢复授权
- 审批拒绝不再创建授权
- 撤销后消费接口会立即失效
- 用户端已支持申请、待审批、已拒绝、已撤销、已可用等状态展示
- 资源停用、用户停用时已有联动撤销
- Bearer token 已接入 scope 校验
- runtime invoke 入口已存在

### 2.2 仍未达到计划验收标准的部分

- `ResourceGrant` 还没有“有效授权唯一”约束
- “组织层级继承”与“部门管理员管理边界”还未完全统一
- 管理台缺少独立授权管理视图
- 管理页缺少授权人数 / 申请人数等指标
- 列表页缺少快速启用 / 禁用操作
- runtime 接口目前只做鉴权，不做真实转发执行
- 导入器目前只支持通用 JSON manifest，不是直接读取真实文件配置
- `npm run build` 当前未通过
- 仓库中尚无项目自身的关键回归测试

---

## 3. 分阶段剩余工作

## Phase 1：语义收口与数据模型补强

### 状态

部分完成。

### 已完成

- `Visibility`、`SourceType` 已枚举化
- 发现 / 消费接口已拆分
- 组织层级后代查询能力已存在

### 未完成项

#### P1-1 增加有效授权唯一约束

当前 `ResourceGrant` 只有索引，没有真正防止“同一用户对同一资源存在多条未撤销授权”的唯一约束。

建议改动：

- 在应用层先补强幂等保护
- 若 SQLite 约束表达受限，可通过事务内检查 + 统一写入口保证唯一
- 如后续迁移到支持 partial unique index 的数据库，再补数据库级约束

涉及文件：

- `prisma/schema.prisma`
- `src/app/api/admin/applications/[id]/approve/route.ts`
- 可选新增：`src/lib/resource-grants.ts`

验收标准：

- 同一用户 / 资源 / 类型在任意时刻最多只有一条有效授权
- 并发重复审批不会产生两条有效授权

#### P1-2 统一“公共资源”语义

当前枚举使用 `company`，UI 文案显示为“公共”，但部分创建 / 导入逻辑仍要求 `company` 资源携带 `organizationId`，这和“所有人默认可用”的目标语义还不完全一致。

建议改动：

- 明确 `company` 是否等价于“全局公共”
- 若是全局公共，则梳理是否还需要 `organizationId`
- 统一表单校验、导入校验、接口注释、文案

涉及文件：

- `prisma/schema.prisma`
- `src/components/skills/skill-form-dialog.tsx`
- `src/components/mcps/mcp-form-dialog.tsx`
- `src/app/api/v1/skills/route.ts`
- `src/app/api/v1/mcps/route.ts`
- `scripts/import-resources.ts`
- `docs/import-mapping.md`

验收标准：

- “公共 / 部门 / 个人”三类资源的语义在 UI、接口、导入器中完全一致

#### P1-3 统一组织继承与管理边界

资源发现使用了组织树后代范围，但部门管理员管理权限仍是精确 `departmentId` 匹配，尚未完全对齐计划中的“方案 A”。

建议改动：

- 决定部门管理员是否管理子部门
- 如果管理子部门，则把管理端过滤改为基于 `getOrganizationScopeIds`
- 同步调整审批页、资源管理页、资源创建权限判断

涉及文件：

- `src/lib/admin-access.ts`
- `src/app/api/admin/applications/route.ts`
- `src/app/api/admin/applications/[id]/approve/route.ts`
- `src/app/api/admin/applications/[id]/reject/route.ts`
- `src/app/api/admin/applications/[id]/revoke/route.ts`
- `src/app/(dashboard)/dashboard/skills/page.tsx`
- `src/app/(dashboard)/dashboard/mcps/page.tsx`

验收标准：

- 发现、审批、资源管理三处的部门范围判断规则一致

---

## Phase 2：审批授权主链路

### 状态

基本完成。

### 建议补强项

#### P2-1 提炼统一授权写入口

当前 approve / revoke / 资源停用 / 用户停用中都有授权变更逻辑，建议抽成统一服务层，降低后续维护成本。

建议改动：

- 新增授权服务，如 `src/lib/resource-grant-service.ts`
- 统一封装 `grant` / `revoke` / `revokeByResource` / `revokeByUser`

这不是计划中的硬性缺口，但很适合作为 Phase 3 之前的代码收口动作。

---

## Phase 3：管理控制台能力补齐

### 状态

部分完成，是当前最值得继续推进的一阶段。

### 未完成项

#### P3-1 增加授权管理视图

当前有审核页，但没有真正的“授权管理”入口，无法直接从授权事实维度查看：

- 某个资源授权给了谁
- 某个用户拥有哪些授权
- 手工新增授权
- 手工撤销授权

建议改动：

- 新增 `/dashboard/grants` 页面，或在资源详情页增加授权面板
- 支持按资源、用户、资源类型筛选
- 支持直接撤销授权

涉及文件：

- 新增 `src/app/(dashboard)/dashboard/grants/page.tsx`
- 新增 `src/app/api/v1/admin/grants/route.ts`
- 可选新增 `src/app/api/v1/admin/grants/[id]/route.ts`

验收标准：

- 管理员无需绕过“申请单”也能直接管理有效授权

#### P3-2 管理页补齐统计指标

当前 Skill / MCP 管理页缺少：

- 授权人数
- 申请人数
- visibility 筛选显式入口
- 组织筛选显式入口

建议改动：

- 列表接口聚合返回 `grantCount`、`applicationCount`
- 前端增加筛选栏和指标列

涉及文件：

- `src/app/api/v1/skills/route.ts`
- `src/app/api/v1/mcps/route.ts`
- `src/components/skills/skills-table.tsx`
- `src/components/mcps/mcps-table.tsx`
- `src/app/(dashboard)/dashboard/skills/SkillsClient.tsx`
- `src/app/(dashboard)/dashboard/mcps/McpsClient.tsx`

验收标准：

- 管理员能在列表页快速判断资源使用情况和待处理情况

#### P3-3 增加快速启用 / 禁用操作

当前停用能力主要通过编辑或删除触发，列表页没有清晰的快速启停操作。

建议改动：

- 在操作菜单中增加“启用 / 禁用”
- 保留软删除，但弱化“删除”作为常规运维动作

涉及文件：

- `src/components/skills/skills-table.tsx`
- `src/components/mcps/mcps-table.tsx`
- `src/app/api/v1/skills/[id]/route.ts`
- `src/app/api/v1/mcps/[id]/route.ts`

验收标准：

- 资源启停可以在列表页一步完成

---

## Phase 4：用户端改造

### 状态

基本完成。

### 剩余优化项

#### P4-1 增加分类统计维度

当前前台已区分“我的可用资源”和“资源发现”，但还可以进一步补齐：

- 公共可用数
- 部门可申请数
- 个人资源数

这属于增强项，不影响主链路完成度。

#### P4-2 收敛按钮语义

目前“已拒绝 / 已撤销”走“重新申请”已实现，但还可以增加更明确的提示文案，比如：

- 已撤销，可重新申请
- 已拒绝，可重新申请

这属于文案增强项。

---

## Phase 5：运行时鉴权闭环

### 状态

部分完成。

### 未完成项

#### P5-1 接入真实执行转发

当前 runtime invoke 路由已经完成“认证 + scope + grant + 资源启用状态”校验，但还没有真正把请求转发给实际 Skill / MCP 执行器。

建议改动：

- 定义统一转发协议
- 按 `sourceType` 分别处理 URL / 本地路径资源
- 对接真实执行器或代理服务

涉及文件：

- `src/app/api/runtime/skills/[id]/invoke/route.ts`
- `src/app/api/runtime/mcps/[id]/invoke/route.ts`
- `src/lib/runtime-access.ts`
- 可选新增 `src/lib/runtime-dispatcher.ts`

验收标准：

- runtime 接口不只返回“verified”，而是真正完成执行或明确代理调用

#### P5-2 补充标准错误码

当前已有：

- `NOT_FOUND_RESOURCE`
- `FORBIDDEN_RESOURCE_DISABLED`
- `FORBIDDEN_RESOURCE_NOT_GRANTED`
- `FORBIDDEN_RESOURCE_SCOPE_REQUIRED`

仍缺计划中提到的：

- `FORBIDDEN_RESOURCE_SCOPE_REQUIRED` 的更系统化使用说明
- 如有需要，补充执行器层错误映射

这项可以和 P5-1 一起完成。

---

## Phase 6：文件配置迁移与导入能力

### 状态

部分完成。

### 未完成项

#### P6-1 接入真实文件格式解析

当前导入器只支持通用 JSON manifest，文档也明确说明“还没有纳入 CoPaw / OpenClaw 的真实文件样例”。

建议改动：

- 收集真实 Skill 文件样例
- 收集真实 MCP 文件样例
- 新增“真实文件格式 -> 通用 manifest”的转换层

涉及文件：

- `scripts/import-resources.ts`
- 可拆分新增：
  - `scripts/import-skills.ts`
  - `scripts/import-mcps.ts`
  - `scripts/lib/manifest-from-files.ts`
- `docs/import-mapping.md`

验收标准：

- 可以直接扫描真实文件目录并导入数据库

#### P6-2 补充冲突与映射策略

当前虽然已有 upsert 和 report，但还需要明确：

- identifier 冲突时如何处理
- organization / owner 如何从真实文件推断
- 无法推断 visibility 时如何兜底

建议输出一份更明确的导入策略文档。

---

## 4. 技术验收剩余工作

### T1 `npm run build` 修复

当前 `npm run build` 未通过，失败点在 `prisma generate` 阶段，错误为 Windows 下的 DLL rename `EPERM`。

建议排查方向：

- 是否有 Prisma query engine 文件被其他进程占用
- 是否有 dev 进程未关闭
- 是否需要在构建前清理 `.prisma/client` 临时文件

完成标准：

- `npm run build` 可稳定通过

### T2 lint warning 收口

当前 `npm run lint` 可执行完成，但仍有 17 条 warning。

建议优先处理：

- `no-explicit-any`
- `no-unused-vars`

完成标准：

- lint 至少达到 0 error
- 如团队要求严格，可进一步收口至 0 warning

### T3 增加关键回归测试

当前仓库中未发现项目自身的测试文件。

建议至少补以下场景：

- 发现接口与消费接口的语义分离
- 申请 -> 审批 -> 授权 -> 撤销主链路
- 资源停用联动撤销
- 用户停用联动撤销
- runtime scope / grant 校验
- 导入器 `dry-run` / `upsert` / `report`

建议目录：

- `src/lib/__tests__/`
- `src/app/api/__tests__/`
- 或独立 `tests/`

---

## 5. 推荐执行顺序

如果想以最小风险补齐计划，建议按下面顺序继续：

1. P1-3 统一组织继承与管理边界
2. P1-1 补有效授权唯一约束
3. P3-1 增加授权管理视图
4. P3-2 / P3-3 补管理台统计与快速启停
5. P5-1 接入 runtime 真实转发
6. P6-1 接入真实文件格式导入
7. T1 / T2 / T3 收口技术验收项

如果要先冲“题目可交付最小闭环”，建议改成：

1. P3-1 授权管理视图
2. P5-1 runtime 真实转发
3. P6-1 真实文件格式导入
4. T1 build 修复

---

## 6. 建议按 PR 拆分

### PR A：组织与授权语义收口

- 统一部门管理员是否管理子部门
- 补有效授权唯一保护
- 收口公共资源语义

### PR B：授权管理台

- 新增授权管理页
- 支持按用户 / 资源查看授权
- 支持手工撤销

### PR C：资源管理页增强

- 增加授权人数 / 申请人数
- 增加 visibility / organization 筛选
- 增加快速启用 / 禁用

### PR D：runtime 真正执行

- 接入执行器转发
- 统一错误映射

### PR E：真实文件导入

- 接入真实配置解析
- 补冲突策略与导入报告

### PR F：技术验收收口

- 修复 build
- 收口 lint
- 增加关键测试

---

## 7. 最终完成定义

当以下条件全部满足时，可以认为 `2026-03-21-requirements-alignment-implementation-plan` 已基本完成：

- 三级资源语义在模型、接口、UI、导入器中完全一致
- 部门管理员边界与组织继承规则统一
- 授权事实可独立管理，不依赖申请单绕行
- runtime 可真实执行，不只是鉴权演示
- 可直接导入真实 CoPaw / OpenClaw 文件配置
- `npm run build` 通过
- `npm run lint` 通过
- 关键链路具备基础回归测试

---

## 8. 建议的下一步

如果只做一件事，优先做：

- `P3-1 授权管理视图`

原因：

- 它最能补齐当前“审批有了，但授权事实不可管理”的缺口
- 对管理端体验提升最大
- 也能为后续 runtime、导入器、停用联动提供更清晰的运维入口
