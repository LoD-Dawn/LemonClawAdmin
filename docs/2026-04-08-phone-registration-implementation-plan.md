# 2026-04-08 手机号注册与账号绑定实施计划

## 1. 背景

当前系统的账号体系以邮箱为核心标识：

- `prisma/schema.prisma` 中 `User.email` 为唯一字段，`User` 还没有 `phone` 字段。
- `src/lib/auth.ts` 的 `Credentials` 登录使用 `email + password`。
- `src/app/api/auth/register/route.ts` 的普通用户自助注册要求 `email + password + verificationCode`。
- `src/app/api/auth/register/email-code/route.ts` 和 `src/lib/email-verification.ts` 实现了邮箱验证码发送、校验、消费。
- `src/components/auth/login-form-client.tsx` 的注册表单和登录表单都围绕邮箱设计。
- `src/app/api/v1/admin/users/route.ts`、`src/app/api/v1/admin/users/[id]/route.ts`、`src/components/users/*` 的后台用户管理只维护邮箱，不维护手机号。

用户需求是：

- 新增账号手机号字段。
- 普通用户注册改成手机号注册。
- 去掉邮箱验证码。
- 保留邮箱字段。
- 让账号与手机号绑定。

## 2. 关键结论

### 2.0 先统一“绑定”的定义

为了避免后续开发和验收时出现歧义，建议把“手机号绑定”拆成两层：

- `数据绑定`：账号记录里保存了一个手机号，且该手机号在系统内唯一对应一个账号。
- `已验证绑定`：除了满足数据绑定外，系统还通过短信验证码等方式验证过当前用户实际控制该手机号。

因此：

- 仅新增 `phone` 字段并加唯一约束，只能达到“数据绑定”。
- 只有在注册或补绑时完成短信验证码校验，才能称为“已验证绑定”。

### 2.1 推荐方案

推荐把本需求按“已验证绑定”落地，而不是只做“数据绑定”。

推荐目标状态：

- 普通用户自助注册使用 `手机号 + 短信验证码 + 邮箱 + 密码 + 昵称`。
- 短信验证码发送固定使用阿里云短信服务。
- 邮箱保留为资料字段，不再参与注册校验，不再发送邮箱验证码。
- 普通用户登录改为 `手机号 + 密码`。
- 企业用户登录继续保留 `邮箱 + 密码`，避免影响现有企业管理员和后台账号。
- 后台创建/编辑用户时新增手机号字段，并做唯一性校验。

原因：

- 只把邮箱换成手机号输入框，但不做短信验证码，最多只能做到“数据库唯一约束”，不能做到真正的“绑定”。
- 既然需求里明确提到“绑定”，推荐同步引入手机号验证码，而不是简单去掉邮箱验证码后完全无校验。

### 2.2 低成本备选

如果本期明确不接短信平台，可以退而求其次，只做“数据绑定”：

- 普通用户注册使用 `手机号 + 邮箱 + 密码 + 昵称`。
- 去掉邮箱验证码，也不增加短信验证码。
- 数据库对手机号加唯一约束。

风险：

- 无法证明注册人真的持有该手机号。
- 只能说“手机号已登记并唯一关联账号”，不能说“手机号已验证绑定”。
- 后续如果再补短信验证码，还要再改一次注册链路。

下文实施计划按“推荐方案”展开，并在必要处标注低成本备选的裁剪点。

## 3. 默认假设

为避免计划无法落地，先按以下默认假设推进：

- 邮箱字段继续保留为必填。
- 邮箱继续保持唯一，避免影响现有后台管理、外部接口和用户识别逻辑。
- 手机号对所有新建用户必填且唯一。
- 现有老用户短期允许 `phone = null`，通过迁移期兼容策略逐步补齐。
- 普通用户入口使用手机号登录，企业用户入口继续使用邮箱登录。
- 开发环境允许使用 mock 短信实现；生产和联调环境统一接阿里云短信服务。

如果业务希望“邮箱可重复”或“企业账号也改手机号登录”，需要把计划范围额外扩大。

## 4. 范围界定

### 4.1 本期应完成

- 用户表增加手机号字段与索引。
- 普通用户注册从邮箱验证码注册切到手机号注册。
- 删除邮箱验证码注册链路。
- 普通用户登录入口改手机号登录。
- 后台用户管理支持手机号创建、编辑、展示、搜索。
- 个人资料与外部“当前用户”资料接口补充手机号字段。
- 初始化脚本、文档、环境变量说明同步更新。

### 4.2 本期建议一起做

- 引入短信验证码服务抽象。
- 增加老用户手机号补录/绑定策略。
- 将用户搜索从“姓名/邮箱”扩展到“姓名/邮箱/手机号”。

### 4.3 本期可暂缓

- 审批、授权、资源列表等所有用户展示位全面展示手机号。
- 全量历史操作日志补写手机号。
- 邮件能力的彻底删除，如果后续仍计划用于通知，可先仅删除注册验证码链路。

## 5. 当前代码影响面

### 5.1 数据库与初始化

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/ensure-schema.cjs`
- `prisma/seed.ts`

### 5.2 认证与注册

- `src/lib/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/register/email-code/route.ts`
- `src/lib/email-verification.ts`
- `src/lib/mailer.ts`
- `src/components/auth/login-form-client.tsx`

### 5.3 后台用户管理

- `src/app/api/v1/admin/users/route.ts`
- `src/app/api/v1/admin/users/[id]/route.ts`
- `src/lib/admin-user-quota.ts`
- `src/app/(dashboard)/dashboard/users/UsersClient.tsx`
- `src/components/users/user-form-dialog.tsx`
- `src/components/users/user-edit-dialog.tsx`
- `src/components/users/users-table.tsx`

### 5.4 用户资料与展示

- `src/app/(client)/profile/page.tsx`
- `src/lib/external-api.ts`
- `src/components/layout/header.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/client-sidebar.tsx`
- `src/components/layout/client-layout-shell.tsx`

### 5.5 文档与配置

- `README.md`
- `.env.local.example`
- `.env`
- `package.json`

## 6. 目标设计

### 6.1 用户模型

建议把 `User` 扩展为：

- `email: String @unique`
- `phone: String? @unique`
- 迁移期先允许 `phone` 为空。
- 新注册用户和新建后台用户必须写入 `phone`。

推荐新增一个统一规范化规则：

- 存储层统一保存标准化手机号。
- 推荐使用 `E.164` 格式，例如 `+8613812345678`。
- 如果当前业务只服务中国大陆，也至少要统一成 `+86` 前缀或纯 11 位手机号中的一种，不能前端一套、后端一套。

建议新增工具函数：

- `normalizePhone(input: string): string`
- `isPhoneFormatValid(input: string): boolean`
- `maskPhone(input: string): string`

建议新增文件：

- `src/lib/phone.ts`

### 6.2 注册链路

推荐普通用户注册字段变为：

- `name`
- `phone`
- `smsCode`
- `email`
- `password`

链路变更：

- 删除邮箱验证码接口调用。
- 增加手机号验证码发送接口，例如 `/api/auth/register/phone-code`。
- 注册事务里验证手机号验证码，并创建用户。
- 注册成功后，继续自动登录。

低成本备选裁剪：

- 不做 `/phone-code` 接口。
- 去掉 `smsCode` 字段。
- 保留 `phone` 唯一校验和格式校验。

### 6.3 登录链路

建议将 `Credentials` 的凭证字段从 `email` 改成更通用的 `identifier`。

推荐策略：

- `entryMode = consumer` 时，按手机号查用户。
- `entryMode = enterprise` 时，按邮箱查用户。
- 登录日志仍保留邮箱，同时补充手机号字段到 metadata。

迁移期兼容建议：

- 老的普通用户如果还没有手机号，短期允许使用邮箱继续登录。
- 一旦用户完成手机号绑定，普通用户入口只允许手机号登录。

如果不做迁移兼容，现有普通用户会直接失去登录能力。

### 6.4 后台用户管理

后台用户创建与编辑增加手机号：

- 新建用户表单增加 `phone` 输入框。
- 编辑用户表单增加 `phone` 输入框。
- 用户表增加手机号列。
- 搜索条件改为 `name OR email OR phone`。
- 冲突错误新增 `CONFLICT_PHONE_EXISTS`。

建议后台规则：

- 超级管理员、部门管理员、普通用户、企业成员都允许维护手机号。
- 新建用户强制手机号必填。
- 老用户编辑时如果手机号为空，提示尽快补齐。

### 6.5 资料展示与接口返回

建议以下读模型增加 `phone`：

- 管理端用户列表 DTO
- 管理端用户详情 DTO
- 当前用户资料 DTO
- 外部接口 `ExternalCurrentUserProfile`

接口变更原则：

- 尽量采用新增字段，不删除原字段。
- 对外接口保持向后兼容，避免客户端因字段结构变化崩溃。

### 6.6 验证码能力

推荐新增短信验证码能力，而不是复用邮箱验证码实现。

建议新增：

- `src/lib/sms.ts`：短信发送抽象，底层适配阿里云短信服务
- `src/lib/phone-verification.ts`：手机号验证码生成、发送、消费
- `src/app/api/auth/register/phone-code/route.ts`

阿里云短信实现建议固定如下：

- 供应商：阿里云短信服务 `Dysmsapi`
- 用途：仅发送“用户注册验证码”
- 服务接口：`SendSms`
- 发送目标：标准化后的手机号
- 模板变量：至少包含验证码和有效期，例如 `code`、`minutes`
- 失败处理：阿里云返回非成功状态时，不落库成功发送结果，并向上抛出统一业务错误

建议在 `src/lib/sms.ts` 中定义统一接口：

- `sendRegisterSmsCode(input: { phone: string; code: string; minutes: number }): Promise<void>`

建议把阿里云 SDK 细节封装在 `src/lib/sms.ts` 内部，不要把云厂商调用散落到 route 或 verification service。

建议环境变量：

- `ALIYUN_SMS_ACCESS_KEY_ID`
- `ALIYUN_SMS_ACCESS_KEY_SECRET`
- `ALIYUN_SMS_SIGN_NAME`
- `ALIYUN_SMS_REGISTER_TEMPLATE_CODE`
- `ALIYUN_SMS_REGION`
- `ALIYUN_SMS_ENDPOINT`

默认值建议：

- `ALIYUN_SMS_REGION=cn-hangzhou`
- `ALIYUN_SMS_ENDPOINT=dysmsapi.aliyuncs.com`

建议模板约定：

- 模板用途仅服务注册验证码，不复用营销或通知模板
- 模板文案包含品牌名、验证码、有效期
- 不在短信文案中暴露邮箱信息或密码信息

数据库建议：

- 可新增 `PhoneVerificationCode` 表。
- 也可一步到位抽象成通用 `VerificationCode` 表，字段如 `channel`, `target`, `purpose`, `codeHash`, `expiresAt`。

从当前仓库复杂度看，优先建议：

- 本期直接新增 `phone_verification_codes`。
- 待邮箱验证码完全下线后，再考虑是否统一抽象。

## 7. 分阶段实施计划

### Phase 0. 需求冻结

目标：

- 冻结手机号规则和绑定规则，避免开发中途反复返工。

需要确认的决策：

- 手机号是否只支持中国大陆手机号。
- 邮箱是否继续必填且唯一。
- 普通用户登录是否立即切手机号，还是提供迁移兼容期。
- 是否本期接入短信平台。
- 老用户没有手机号时，是“允许继续登录并补绑”，还是“强制补绑后才可继续”。

本计划已补充默认决策：

- 短信平台固定使用阿里云短信服务。
- 注册验证码模板固定为阿里云短信模板，不再保留“待选短信服务商”。

交付物：

- 一页需求确认结论，写入项目文档。

### Phase 1. 数据库与迁移

目标：

- 让数据库先具备手机号承载能力，不先破坏现网用户。

任务：

- 在 `prisma/schema.prisma` 的 `User` 模型增加 `phone` 字段。
- 增加唯一约束或唯一索引。
- 如果采用短信验证码方案，新增 `PhoneVerificationCode` 或通用验证码表。
- 生成 Prisma migration。
- 更新 `prisma/ensure-schema.cjs`，为 `users.phone` 与验证码表提供 SQLite/Turso 兼容补丁逻辑。
- 更新 `prisma/seed.ts`，为默认管理员补充手机号初始化能力。

建议迁移策略：

- 第 1 步先加 `phone nullable + unique`。
- 第 2 步应用层要求新用户必须有手机号。
- 第 3 步后台逐步补齐历史用户手机号。
- 第 4 步确认存量数据补齐后，再评估是否把 `phone` 改成非空。

不建议一开始就把 `phone` 做成非空：

- 当前数据库里已有用户数据。
- 管理员、企业用户、普通用户都可能没有手机号。
- SQLite 上直接做强制非空迁移的风险较高。

### Phase 2. 后端注册与登录改造

目标：

- 完成账号核心链路切换。

任务：

- 改造 `src/lib/auth.ts`
- 将凭证字段从 `email` 调整为 `identifier`
- 按 `entryMode` 分流查询 `phone` 或 `email`
- 登录日志 metadata 补充 `phone`
- 改造 `src/app/api/auth/register/route.ts`
- 输入参数改为 `phone`、`email`、`password`、`name`
- 推荐方案中再加 `smsCode`
- 在事务里校验手机号唯一、邮箱唯一、验证码合法性
- 删除对 `consumeRegisterVerificationCode()` 的依赖
- 新增短信验证码发送接口
- 新增阿里云短信发送封装
- 下线 `src/app/api/auth/register/email-code/route.ts`
- 下线 `src/lib/email-verification.ts`

错误码建议新增：

- `CONFLICT_PHONE_EXISTS`
- `VALIDATION_PHONE_INVALID`
- `PHONE_VERIFICATION_CODE_INVALID`
- `PHONE_VERIFICATION_CODE_EXPIRED`
- `PHONE_VERIFICATION_CODE_RESEND_COOLDOWN`

兼容策略建议：

- 普通用户入口后端临时支持“手机号优先，邮箱兜底”。
- 兼容窗口结束后再关闭邮箱兜底。

### Phase 3. 前端登录与注册改造

目标：

- 让前端表单与后端接口语义一致。

任务：

- 改造 `src/components/auth/login-form-client.tsx`
- 普通用户登录输入框从邮箱改为手机号
- 企业用户登录继续保留邮箱输入框
- 普通用户注册表单新增手机号输入框
- 去掉邮箱验证码输入框和“发送邮箱验证码”按钮
- 推荐方案里新增“发送短信验证码”按钮与倒计时
- 成功与错误提示文案同步改成手机号语义

建议的表单文案：

- 普通用户登录：`手机号`
- 企业用户登录：`邮箱`
- 普通用户注册：`手机号`、`邮箱（用于通知与资料展示）`

交互细节：

- 前端先做手机号格式校验，减少无效请求。
- 注册提交前先标准化手机号。
- 倒计时和重复发送限制与现有邮箱验证码交互保持一致。

### Phase 4. 后台用户管理改造

目标：

- 管理员可完整维护手机号，并能查到手机号冲突问题。

任务：

- 改造 `src/app/api/v1/admin/users/route.ts`
- 创建 schema 增加 `phone`
- 创建用户时校验手机号唯一
- 冲突时返回 `CONFLICT_PHONE_EXISTS`
- 改造 `src/app/api/v1/admin/users/[id]/route.ts`
- 更新 schema 增加 `phone`
- 更新时校验手机号唯一
- 审计日志 metadata 增加 `phone`
- 改造 `src/lib/admin-user-quota.ts`
- 查询 select 增加 `phone`
- 搜索 where 增加 `phone contains`
- 改造 `src/components/users/user-form-dialog.tsx`
- 改造 `src/components/users/user-edit-dialog.tsx`
- 改造 `src/components/users/users-table.tsx`
- 改造 `src/app/(dashboard)/dashboard/users/UsersClient.tsx`

界面建议：

- 列表里显示 `姓名 / 邮箱 / 手机号`
- 搜索提示改成“搜索姓名、邮箱或手机号”
- 编辑框对手机号为空的历史用户显示补录提醒

### Phase 5. 用户资料与外部接口改造

目标：

- 资料页和外部接口能反映手机号状态。

任务：

- 改造 `src/app/(client)/profile/page.tsx`
- 展示手机号
- 如果当前用户无手机号，展示补绑提示
- 改造 `src/lib/external-api.ts`
- `ExternalCurrentUserProfile` 增加 `phone`
- `fetchCurrentUserRecord()` 查询增加 `phone`
- `serializeCurrentUserProfile()` 返回增加 `phone`

建议：

- 对外接口先返回 `phone: string | null`
- 不改变已有 `email` 字段，避免外部调用方受影响

### Phase 6. 文档、配置与依赖清理

目标：

- 清掉邮箱验证码残留认知，补上手机号配置说明。

任务：

- 更新 `README.md`
- 把注册说明改成手机号注册
- 删除邮箱验证码相关环境变量说明
- 新增阿里云短信服务环境变量说明
- 更新 `.env.local.example`
- 根据方案决定是否保留 `src/lib/mailer.ts`
- 如果邮件服务仅用于注册验证码，可移除 `nodemailer` 与 `@types/nodemailer`
- 更新 `package.json`

建议 README / env 示例补充以下内容：

- 阿里云 AccessKey 配置方式
- 阿里云短信签名名称配置
- 注册验证码模板 Code 配置
- 本地开发 mock 短信开关或降级策略

如果后续仍需要邮件通知：

- 可以先保留 `mailer.ts` 和依赖
- 仅删除邮箱验证码相关文案与接口

### Phase 7. 存量用户迁移与发布

目标：

- 平滑切换，不让老用户批量失去登录能力。

建议发布步骤：

1. 先发数据库迁移和后台手机号支持。
2. 再发登录后端兼容逻辑。
3. 再发前端普通用户手机号注册与手机号登录界面。
4. 发布后观察老用户手机号补齐情况。
5. 存量补齐后，再关闭普通用户邮箱登录兜底。

存量用户补齐策略建议二选一：

- 方案 A：用户首次登录后强提醒补绑手机号，但暂不阻塞。
- 方案 B：用户首次登录后必须补绑手机号，否则不能继续进入普通用户工作台。

推荐先用方案 A：

- 风险更低。
- 便于观察真实缺口。
- 不会因为短信服务、号码格式或运营数据问题造成大面积阻塞。

## 8. 详细改动清单

### 8.1 数据模型

- `prisma/schema.prisma`
  - `User` 增加 `phone`
  - 可选新增 `PhoneVerificationCode`
- `prisma/migrations/...`
  - 新增 `users.phone`
  - 新增手机号唯一索引
  - 新增验证码表或索引
- `prisma/ensure-schema.cjs`
  - 增加 `users.phone` 的兼容补丁
  - 增加手机号验证码表创建逻辑
- `prisma/seed.ts`
  - 默认管理员增加手机号或读取 `ADMIN_PHONE`

### 8.2 认证与注册

- `src/lib/auth.ts`
  - `email` 改为通用 `identifier`
  - 查询逻辑按入口区分手机号/邮箱
- `src/app/api/auth/register/route.ts`
  - 请求体改造
  - 去掉邮箱验证码消费
- `src/app/api/auth/register/email-code/route.ts`
  - 删除或废弃
- `src/lib/email-verification.ts`
  - 删除或废弃
- `src/lib/mailer.ts`
  - 按是否还需要邮件能力决定保留或删除
- 推荐新增：
  - `src/lib/phone.ts`
  - `src/lib/sms.ts`
  - 内部固定封装阿里云短信 `SendSms` 调用
  - `src/lib/phone-verification.ts`
  - `src/app/api/auth/register/phone-code/route.ts`

### 8.3 用户管理

- `src/app/api/v1/admin/users/route.ts`
- `src/app/api/v1/admin/users/[id]/route.ts`
- `src/lib/admin-user-quota.ts`
- `src/components/users/user-form-dialog.tsx`
- `src/components/users/user-edit-dialog.tsx`
- `src/components/users/users-table.tsx`
- `src/app/(dashboard)/dashboard/users/UsersClient.tsx`

### 8.4 展示与对外接口

- `src/app/(client)/profile/page.tsx`
- `src/lib/external-api.ts`
- `src/components/layout/header.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/client-sidebar.tsx`
- `src/components/layout/client-layout-shell.tsx`

## 9. 风险与注意事项

### 9.1 最大风险

- 如果没有短信验证码，“绑定手机号”会缺少归属校验。
- 阿里云短信配置错误、签名未审核通过、模板未审核通过时，注册链路会直接失败。
- 如果没有迁移兼容，现有普通用户可能无法登录。
- 如果手机号格式标准不统一，唯一性判断会失真，例如 `13812345678` 和 `+8613812345678` 被当成两个号码。

### 9.1.1 阿里云短信专项风险

- `SignName` 或 `TemplateCode` 配错时，发送接口会稳定失败。
- AccessKey 没有短信发送权限时，联调环境会出现“配置看似存在但无法发送”的假成功预期。
- 阿里云短信有模板审核和签名审核周期，必须在开发完成前准备好。
- 如果开发环境默认不连阿里云，必须提供 mock 路径，否则前端无法自测注册流程。

### 9.2 当前代码中的隐含风险

- 多处界面和接口把邮箱当作主识别信息，手机号加入后要避免前端类型不一致。
- `src/app/api/v1/admin/users/[id]/route.ts` 和 `src/components/users/users-table.tsx` 当前通过 `admin@local.com` 保护默认管理员，后续若允许管理员修改邮箱，这种保护方式会越来越脆弱。
- `prisma/ensure-schema.cjs` 当前只确保 `account_type` 和 `email_verification_codes`，新增手机号后要补齐 schema 自愈逻辑，否则开发环境和 SQLite 环境容易出现“代码已改、表未变”的问题。

### 9.3 建议顺手修正

- 将“受保护管理员账号”的判断从硬编码邮箱改成更稳定的策略。
- 将用户搜索统一抽象为 `name/email/phone`。
- 登录操作日志补充手机号字段，方便排查问题。

## 10. 测试方案

### 10.1 单元测试

建议新增或补充：

- 手机号标准化与格式校验测试
- 手机号验证码生成/消费/过期/限流测试
- 阿里云短信发送参数映射测试
- 阿里云短信异常到业务错误码的映射测试
- 普通用户登录按手机号查询测试
- 企业用户登录按邮箱查询测试
- 用户创建与更新手机号冲突测试

### 10.2 接口测试

覆盖场景：

- 手机号验证码发送成功
- 手机号验证码限流
- 手机号验证码错误
- 手机号验证码过期
- 阿里云短信配置缺失
- 阿里云短信服务返回失败
- 普通用户注册成功
- 手机号重复注册失败
- 邮箱重复注册失败
- 普通用户手机号登录成功
- 普通用户邮箱兜底登录成功或被拒绝
- 企业用户邮箱登录成功
- 后台创建用户手机号冲突失败
- 后台编辑用户手机号冲突失败

### 10.3 UI 验证

需要人工走通：

- 普通用户注册
- 普通用户登录
- 企业用户登录
- 后台新建用户
- 后台编辑用户
- 个人资料页查看手机号
- 无手机号历史用户的补绑提示

## 11. 验收标准

- 普通用户可以通过手机号完成注册。
- 邮箱验证码相关入口从页面和接口中消失。
- 邮箱字段仍可保存并在资料中查看。
- 每个手机号只能绑定一个账号。
- 普通用户登录使用手机号。
- 企业用户现有邮箱登录能力不受影响。
- 后台可以维护手机号，并能搜索手机号。
- 当前用户资料与外部资料接口能返回手机号字段。
- 发布后老用户不会因为迁移问题批量无法登录。

## 12. 推荐实施顺序

建议拆成 4 个 PR：

- PR 1：数据库迁移、手机号工具、后台 DTO 增量支持
- PR 2：短信验证码能力与普通用户注册改造
- PR 3：普通用户手机号登录与前端登录页改造
- PR 4：后台用户管理、资料页、文档与清理

这样拆分的原因：

- 数据模型先落地，风险最小。
- 登录链路改动最大，单独审查更稳。
- 后台和资料页属于外围改造，适合后置。

## 13. 最终建议

如果目标真的是“账号和手机号绑定”，不要只做“去邮箱验证码 + 加手机号字段”。

推荐最低可接受方案应为“已验证绑定”：

- 普通用户注册改手机号。
- 普通用户登录改手机号。
- 邮箱仅保留为资料字段。
- 手机号唯一。
- 注册时用短信验证码校验手机号归属。
- 老用户提供迁移兼容期与补绑路径。

如果本期时间紧张，可以先按“手机号唯一 + 去邮箱验证码 + 普通用户手机号登录”落地，但需要在计划中明确写清楚：这只是“数据绑定”过渡方案，不是“已验证绑定”。
