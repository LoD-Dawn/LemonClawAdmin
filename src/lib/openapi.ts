export function buildOpenApiDocument(origin?: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Skills MCP API',
      version: '1.0.0',
      description: '提供给外部系统和桌面端使用的认证与当前用户资源接口，包括 token 刷新、用户信息、模型配置、配额查询、Claw 会话配额结算、Skills、MCPs 以及用户有效性校验。',
    },
    ...(origin
      ? {
          servers: [
            {
              url: origin,
              description: 'Current environment',
            },
          ],
        }
      : {}),
    tags: [
      { name: 'Auth', description: '认证与 token 刷新接口。' },
      { name: 'Desktop', description: '桌面端公共配置接口。' },
      { name: 'External API', description: '面向第三方集成的当前用户接口。' },
    ],
    paths: {
      '/api/v1/desktop/version': {
        get: {
          tags: ['Desktop'],
          summary: '获取桌面端最新版本信息',
          description: '返回桌面客户端检查更新时使用的最新版本配置，包括发布日期、多语言更新说明和各平台下载地址。',
          responses: {
            '200': {
              description: '版本信息',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DesktopVersionResponse' },
                },
              },
            },
            '404': {
              description: '后台尚未完成桌面版本配置',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: '刷新 Access Token',
          description: '使用 refresh_token 换取新的 access_token 和 refresh_token，适用于桌面端或外部客户端在 access token 过期后续期。',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: '刷新成功',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TokenResponse' },
                },
              },
            },
            '400': {
              description: '缺少必要参数',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '401': {
              description: 'refresh_token 无效、已过期，或关联用户/客户端已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/me': {
        get: {
          tags: ['External API'],
          summary: '获取当前用户信息',
          description: '返回当前认证用户的基础资料、组织信息和角色信息。',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: '当前用户信息',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MeResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/me/validate': {
        get: {
          tags: ['External API'],
          summary: '校验当前用户是否有效',
          description: '用于第三方快速检查当前 Bearer Token 是否可用，并返回认证上下文和当前用户信息。',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: '当前认证有效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidateResponse' },
                },
              },
            },
            '401': {
              description: '认证失败或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/me/models': {
        get: {
          tags: ['External API'],
          summary: '获取当前用户模型列表与计费信息',
          description: '返回当前用户可选模型列表，以及每个模型对应的计费元数据、最大会话时长和工具策略。',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: '模型配置',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ModelCatalogResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '403': {
              description: '缺少 models:read scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/me/quota': {
        get: {
          tags: ['External API'],
          summary: '获取当前用户配额快照',
          description: '返回当前用户当前积分余额、剩余可用时长和计费版本。管理员角色会返回无限使用标记。',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: '当前用户配额',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/QuotaResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '403': {
              description: '缺少 quota:read scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/claw/sessions/prepare': {
        post: {
          tags: ['External API'],
          summary: '启动前申请 Claw 会话额度',
          description: '创建会话预占记录，并返回服务端判定后的模型计费信息、允许时长和当前余额。',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PrepareSessionRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: '申请成功',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PrepareSessionResponse' },
                },
              },
            },
            '400': {
              description: '请求参数错误',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '403': {
              description: '缺少 claw:sessions:write scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '409': {
              description: '模型不可用或额度不足',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/claw/sessions/heartbeat': {
        post: {
          tags: ['External API'],
          summary: '上报 Claw 会话活跃心跳',
          description: '上报本周期新增活跃时长，由服务端计算本次是否允许继续使用，并返回服务端认可的累计活跃秒数。',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HeartbeatRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: '心跳成功',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HeartbeatResponse' },
                },
              },
            },
            '400': {
              description: '请求参数错误',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '403': {
              description: '缺少 claw:sessions:write scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '404': {
              description: 'reservationId 不存在',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '409': {
              description: '会话已关闭或配额耗尽',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/claw/sessions/finish': {
        post: {
          tags: ['External API'],
          summary: '结束并结算 Claw 会话',
          description: '关闭会话预占记录，执行最终结算，并返回最新余额。',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FinishSessionRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: '结算成功',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/FinishSessionResponse' },
                },
              },
            },
            '400': {
              description: '请求参数错误',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '403': {
              description: '缺少 claw:sessions:write scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '404': {
              description: 'reservationId 不存在',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/claw/sessions/{reservationId}': {
        get: {
          tags: ['External API'],
          summary: '查询单个 Claw 会话状态',
          description: '用于异常恢复、断网恢复和避免重复结算。',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'reservationId',
              in: 'path',
              required: true,
              description: 'prepare 返回的 reservationId',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: '会话状态',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ClawSessionStateResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '403': {
              description: '缺少 claw:sessions:write scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '404': {
              description: 'reservationId 不存在',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/me/usage-summary': {
        get: {
          tags: ['External API'],
          summary: '获取当前用户使用汇总',
          description: '按时间范围返回当前用户的累计积分消耗、累计活跃时长和会话次数。',
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              name: 'range',
              in: 'query',
              description: '时间范围，当前支持类似 7d 的格式',
              required: false,
              schema: {
                type: 'string',
                default: '7d',
                example: '7d',
              },
            },
          ],
          responses: {
            '200': {
              description: '使用汇总',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UsageSummaryResponse' },
                },
              },
            },
            '400': {
              description: 'range 参数不合法',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
            '403': {
              description: '缺少 quota:read scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ExternalErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/me/skills': {
        get: {
          tags: ['External API'],
          summary: '获取当前用户 Skills',
          description: '返回当前用户可消费的 Skill 列表，包含权限状态和分页信息。',
          security: [{ BearerAuth: [] }],
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/PageSize' },
          ],
          responses: {
            '200': {
              description: 'Skill 列表',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SkillListResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '403': {
              description: '缺少 skills:read scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/external/v1/me/mcps': {
        get: {
          tags: ['External API'],
          summary: '获取当前用户 MCPs',
          description: '返回当前用户可消费的 MCP 列表，包含启动信息、环境变量要求和分页信息。',
          security: [{ BearerAuth: [] }],
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/PageSize' },
          ],
          responses: {
            '200': {
              description: 'MCP 列表',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/McpListResponse' },
                },
              },
            },
            '401': {
              description: '未认证或用户已失效',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '403': {
              description: '缺少 mcps:read scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'OAuth Access Token。浏览器已登录后台时，也可以直接用会话访问这些接口。',
        },
      },
      parameters: {
        Page: {
          name: 'page',
          in: 'query',
          description: '页码，从 1 开始。',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        PageSize: {
          name: 'pageSize',
          in: 'query',
          description: '每页数量，最大 100。',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Unauthorized' },
            code: { type: 'string', example: 'AUTH_MISSING_TOKEN' },
            details: {
              type: 'object',
              additionalProperties: true,
              nullable: true,
            },
          },
          required: ['error', 'code'],
        },
        ExternalErrorResponse: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'QUOTA_NOT_ENOUGH' },
            message: { type: 'string', example: '当前配额不足，无法启动 Claw' },
            data: {
              type: 'object',
              additionalProperties: true,
            },
          },
          required: ['code', 'message', 'data'],
        },
        RefreshTokenRequest: {
          type: 'object',
          properties: {
            refresh_token: { type: 'string', description: '登录或上次刷新后获得的 refresh token。' },
          },
          required: ['refresh_token'],
        },
        TokenResponse: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            token_type: { type: 'string', example: 'Bearer' },
            expires_in: { type: 'integer', example: 3600 },
          },
          required: ['access_token', 'refresh_token', 'token_type', 'expires_in'],
        },
        DesktopVersionChangeLogSection: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['title', 'content'],
        },
        DesktopVersionValue: {
          type: 'object',
          properties: {
            version: { type: 'string', example: '0.2.4' },
            date: { type: 'string', example: '2026-03-23' },
            changeLog: {
              type: 'object',
              properties: {
                ch: { $ref: '#/components/schemas/DesktopVersionChangeLogSection' },
                en: { $ref: '#/components/schemas/DesktopVersionChangeLogSection' },
              },
              required: ['ch', 'en'],
            },
            macIntel: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
              },
              required: ['url'],
            },
            macArm: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
              },
              required: ['url'],
            },
            windowsX64: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
              },
              required: ['url'],
            },
          },
          required: ['version', 'date', 'changeLog', 'macIntel', 'macArm', 'windowsX64'],
        },
        DesktopVersionResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 0 },
            data: {
              type: 'object',
              properties: {
                value: { $ref: '#/components/schemas/DesktopVersionValue' },
              },
              required: ['value'],
            },
          },
          required: ['code', 'data'],
        },
        OrganizationRef: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['company', 'department', 'team'] },
            path: { type: 'string', example: '/总公司/研发部' },
            level: { type: 'integer', minimum: 0 },
          },
          required: ['id', 'name', 'type', 'path', 'level'],
        },
        CurrentUserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            isActive: { type: 'boolean' },
            roles: {
              type: 'object',
              properties: {
                isSuperAdmin: { type: 'boolean' },
                isDepartmentAdmin: { type: 'boolean' },
              },
              required: ['isSuperAdmin', 'isDepartmentAdmin'],
            },
            organization: {
              anyOf: [
                { $ref: '#/components/schemas/OrganizationRef' },
                { type: 'null' },
              ],
            },
            department: {
              anyOf: [
                { $ref: '#/components/schemas/OrganizationRef' },
                { type: 'null' },
              ],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: [
            'id',
            'email',
            'name',
            'isActive',
            'roles',
            'organization',
            'department',
            'createdAt',
            'updatedAt',
          ],
        },
        MeResponse: {
          type: 'object',
          properties: {
            data: { $ref: '#/components/schemas/CurrentUserProfile' },
          },
          required: ['data'],
        },
        OAuthClientRef: {
          anyOf: [
            {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                clientId: { type: 'string' },
                name: { type: 'string' },
              },
              required: ['id', 'clientId', 'name'],
            },
            { type: 'null' },
          ],
        },
        ValidateResponse: {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: true },
            auth: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['bearer', 'session'] },
                scopes: {
                  type: 'array',
                  items: { type: 'string' },
                },
                client: { $ref: '#/components/schemas/OAuthClientRef' },
                accessTokenExpiresAt: {
                  anyOf: [
                    { type: 'string', format: 'date-time' },
                    { type: 'null' },
                  ],
                },
              },
              required: ['type', 'scopes', 'client', 'accessTokenExpiresAt'],
            },
            user: { $ref: '#/components/schemas/CurrentUserProfile' },
          },
          required: ['valid', 'auth', 'user'],
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1 },
            total: { type: 'integer', minimum: 0 },
            pageCount: { type: 'integer', minimum: 0 },
          },
          required: ['page', 'pageSize', 'total', 'pageCount'],
        },
        SkillPermission: {
          type: 'object',
          properties: {
            accessState: {
              type: 'string',
              enum: ['granted', 'pending', 'available', 'reapply'],
            },
            canUse: { type: 'boolean' },
            canApply: { type: 'boolean' },
            grantStatus: {
              type: 'string',
              enum: ['granted', 'not_granted'],
            },
            applicationStatus: {
              anyOf: [
                {
                  type: 'string',
                  enum: ['pending', 'approved', 'rejected', 'revoked'],
                },
                { type: 'null' },
              ],
            },
            sensitiveFieldsHidden: { type: 'boolean' },
          },
          required: [
            'accessState',
            'canUse',
            'canApply',
            'grantStatus',
            'applicationStatus',
            'sensitiveFieldsHidden',
          ],
        },
        SkillTag: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '标签 id' },
            en: { type: 'string', description: '英文标签名' },
            zh: { type: 'string', description: '中文标签名' },
          },
          required: ['id', 'en', 'zh'],
        },
        SkillItem: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Skill identifier' },
            resourceId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: {
              type: 'object',
              properties: {
                en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              },
              required: ['en', 'zh'],
            },
            tags: {
              type: 'array',
              items: { $ref: '#/components/schemas/SkillTag' },
            },
            tagIds: {
              type: 'array',
              items: { type: 'string' },
            },
            url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            version: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            source: {
              type: 'object',
              properties: {
                from: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                author: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              },
              required: ['from', 'url', 'author'],
            },
            permission: { $ref: '#/components/schemas/SkillPermission' },
          },
          required: ['id', 'resourceId', 'name', 'description', 'tags', 'tagIds', 'url', 'version', 'source', 'permission'],
        },
        SkillListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/SkillItem' },
            },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
          required: ['data', 'pagination'],
        },
        McpItem: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'MCP identifier' },
            resourceId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: {
              type: 'object',
              properties: {
                en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              },
              required: ['en', 'zh'],
            },
            category: { type: 'string' },
            transport: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                command: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                defaultArgs: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['type', 'command', 'defaultArgs'],
            },
            env: {
              type: 'object',
              properties: {
                requiredKeys: {
                  type: 'array',
                  items: { type: 'string' },
                },
                optionalKeys: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['requiredKeys', 'optionalKeys'],
            },
            permission: { $ref: '#/components/schemas/SkillPermission' },
          },
          required: ['id', 'resourceId', 'name', 'description', 'category', 'transport', 'env', 'permission'],
        },
        McpListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/McpItem' },
            },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
          required: ['data', 'pagination'],
        },
        ModelUsageMeta: {
          type: 'object',
          properties: {
            billingTier: { type: 'string', example: 'tier_2' },
            billingTierName: { type: 'string', example: '高级模型' },
            creditPerMinute: { type: 'integer', example: 2 },
            maxSessionSeconds: { type: 'integer', example: 1800 },
            toolPolicy: { type: 'string', example: 'full' },
            estimatedRemainingMinutes: { type: 'integer', example: 340 },
            isUnlimited: { type: 'boolean' },
          },
          required: [
            'billingTier',
            'billingTierName',
            'creditPerMinute',
            'maxSessionSeconds',
            'toolPolicy',
            'estimatedRemainingMinutes',
          ],
        },
        ModelCatalogItem: {
          type: 'object',
          properties: {
            model: { type: 'string', example: 'claude-sonnet-4' },
            displayName: { type: 'string', example: 'Claude Sonnet 4' },
            enabled: { type: 'boolean' },
            usageMeta: { $ref: '#/components/schemas/ModelUsageMeta' },
          },
          required: ['model', 'displayName', 'enabled', 'usageMeta'],
        },
        ModelCatalogProvider: {
          type: 'object',
          properties: {
            provider: { type: 'string', example: 'anthropic' },
            models: {
              type: 'array',
              items: { $ref: '#/components/schemas/ModelCatalogItem' },
            },
          },
          required: ['provider', 'models'],
        },
        ModelCatalogData: {
          type: 'object',
          properties: {
            providers: {
              type: 'array',
              items: { $ref: '#/components/schemas/ModelCatalogProvider' },
            },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['providers', 'updatedAt'],
        },
        ModelCatalogResponse: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'OK' },
            message: { type: 'string', example: '' },
            data: { $ref: '#/components/schemas/ModelCatalogData' },
          },
          required: ['code', 'message', 'data'],
        },
        QuotaSnapshotData: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            isUnlimited: { type: 'boolean' },
            creditBalance: {
              anyOf: [
                { type: 'integer', minimum: 0 },
                { type: 'null' },
              ],
            },
            remainingClawSeconds: {
              anyOf: [
                { type: 'integer', minimum: 0 },
                { type: 'null' },
              ],
            },
            pricingVersion: { type: 'string', example: '2026-03-v2' },
            expiresAt: {
              anyOf: [
                { type: 'string', format: 'date-time' },
                { type: 'null' },
              ],
            },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['userId', 'isUnlimited', 'creditBalance', 'remainingClawSeconds', 'pricingVersion', 'expiresAt', 'updatedAt'],
        },
        QuotaResponse: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'OK' },
            message: { type: 'string', example: '' },
            data: { $ref: '#/components/schemas/QuotaSnapshotData' },
          },
          required: ['code', 'message', 'data'],
        },
        PrepareSessionRequest: {
          type: 'object',
          properties: {
            clientSessionId: { type: 'string', example: 'cowork_abc123' },
            provider: { type: 'string', example: 'anthropic' },
            model: { type: 'string', example: 'claude-sonnet-4' },
            entry: { type: 'string', enum: ['cowork_start', 'cowork_continue'] },
            workspacePath: {
              anyOf: [
                { type: 'string', example: 'D:\\project\\demo' },
                { type: 'null' },
              ],
            },
            estimatedSeconds: {
              anyOf: [
                { type: 'integer', minimum: 1, example: 900 },
                { type: 'null' },
              ],
            },
            idempotencyKey: { type: 'string', example: 'prepare_cowork_abc123_1' },
          },
          required: ['clientSessionId', 'provider', 'model', 'entry', 'idempotencyKey'],
        },
        PrepareSessionData: {
          type: 'object',
          properties: {
            allowed: { type: 'boolean' },
            reservationId: { type: 'string', example: 'rsv_xxx' },
            clientSessionId: { type: 'string' },
            provider: { type: 'string' },
            model: { type: 'string' },
            billingTier: { type: 'string' },
            billingTierName: { type: 'string' },
            creditPerMinute: { type: 'integer' },
            maxSessionSeconds: { type: 'integer' },
            toolPolicy: { type: 'string' },
            grantedSeconds: { type: 'integer' },
            creditBalance: {
              anyOf: [
                { type: 'integer', minimum: 0 },
                { type: 'null' },
              ],
            },
            remainingClawSeconds: {
              anyOf: [
                { type: 'integer', minimum: 0 },
                { type: 'null' },
              ],
            },
            pricingVersion: { type: 'string' },
            isUnlimited: { type: 'boolean' },
          },
          required: [
            'allowed',
            'reservationId',
            'clientSessionId',
            'provider',
            'model',
            'billingTier',
            'billingTierName',
            'creditPerMinute',
            'maxSessionSeconds',
            'toolPolicy',
            'grantedSeconds',
            'creditBalance',
            'remainingClawSeconds',
            'pricingVersion',
          ],
        },
        PrepareSessionResponse: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'OK' },
            message: { type: 'string', example: '' },
            data: { $ref: '#/components/schemas/PrepareSessionData' },
          },
          required: ['code', 'message', 'data'],
        },
        HeartbeatRequest: {
          type: 'object',
          properties: {
            reservationId: { type: 'string' },
            clientSessionId: { type: 'string' },
            activeSecondsDelta: { type: 'integer', minimum: 0, example: 30 },
            totalActiveSeconds: { type: 'integer', minimum: 0, example: 150 },
            status: { type: 'string', enum: ['running', 'paused', 'waiting_user'] },
            sentAt: {
              anyOf: [
                { type: 'string', format: 'date-time' },
                { type: 'null' },
              ],
            },
            idempotencyKey: { type: 'string', example: 'heartbeat_rsv_xxx_5' },
          },
          required: ['reservationId', 'clientSessionId', 'activeSecondsDelta', 'totalActiveSeconds', 'status', 'idempotencyKey'],
        },
        HeartbeatData: {
          type: 'object',
          properties: {
            allowed: { type: 'boolean' },
            reservationId: { type: 'string' },
            serverAcceptedTotalActiveSeconds: { type: 'integer' },
            creditBalance: {
              anyOf: [
                { type: 'integer', minimum: 0 },
                { type: 'null' },
              ],
            },
            remainingClawSeconds: {
              anyOf: [
                { type: 'integer', minimum: 0 },
                { type: 'null' },
              ],
            },
            shouldStop: { type: 'boolean' },
            isUnlimited: { type: 'boolean' },
          },
          required: ['allowed', 'reservationId', 'creditBalance', 'remainingClawSeconds', 'shouldStop'],
        },
        HeartbeatResponse: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'OK' },
            message: { type: 'string', example: '' },
            data: { $ref: '#/components/schemas/HeartbeatData' },
          },
          required: ['code', 'message', 'data'],
        },
        FinishSessionRequest: {
          type: 'object',
          properties: {
            reservationId: { type: 'string' },
            clientSessionId: { type: 'string' },
            totalActiveSeconds: { type: 'integer', minimum: 0, example: 188 },
            finishReason: {
              type: 'string',
              enum: ['completed', 'stopped_by_user', 'error', 'quota_exhausted', 'auth_invalid', 'network_lost'],
            },
            lastErrorCode: {
              anyOf: [
                { type: 'string' },
                { type: 'null' },
              ],
            },
            idempotencyKey: { type: 'string', example: 'finish_rsv_xxx' },
          },
          required: ['reservationId', 'clientSessionId', 'totalActiveSeconds', 'finishReason', 'idempotencyKey'],
        },
        FinishSessionData: {
          type: 'object',
          properties: {
            reservationId: { type: 'string' },
            provider: { type: 'string' },
            model: { type: 'string' },
            billingTier: { type: 'string' },
            finalConsumedCredits: { type: 'integer', minimum: 0 },
            finalActiveSeconds: { type: 'integer', minimum: 0 },
            creditBalance: {
              anyOf: [
                { type: 'integer', minimum: 0 },
                { type: 'null' },
              ],
            },
            remainingClawSeconds: {
              anyOf: [
                { type: 'integer', minimum: 0 },
                { type: 'null' },
              ],
            },
            closed: { type: 'boolean' },
            isUnlimited: { type: 'boolean' },
          },
          required: [
            'reservationId',
            'provider',
            'model',
            'billingTier',
            'finalConsumedCredits',
            'finalActiveSeconds',
            'creditBalance',
            'remainingClawSeconds',
            'closed',
          ],
        },
        FinishSessionResponse: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'OK' },
            message: { type: 'string', example: '' },
            data: { $ref: '#/components/schemas/FinishSessionData' },
          },
          required: ['code', 'message', 'data'],
        },
        ClawSessionStateData: {
          type: 'object',
          properties: {
            reservationId: { type: 'string' },
            status: { type: 'string', example: 'running' },
            clientSessionId: { type: 'string' },
            provider: { type: 'string' },
            model: { type: 'string' },
            serverAcceptedTotalActiveSeconds: { type: 'integer', minimum: 0 },
            closed: { type: 'boolean' },
          },
          required: ['reservationId', 'status', 'clientSessionId', 'provider', 'model', 'serverAcceptedTotalActiveSeconds', 'closed'],
        },
        ClawSessionStateResponse: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'OK' },
            message: { type: 'string', example: '' },
            data: { $ref: '#/components/schemas/ClawSessionStateData' },
          },
          required: ['code', 'message', 'data'],
        },
        UsageSummaryData: {
          type: 'object',
          properties: {
            range: { type: 'string', example: '7d' },
            consumedCredits: { type: 'integer', minimum: 0 },
            usedClawSeconds: { type: 'integer', minimum: 0 },
            sessions: { type: 'integer', minimum: 0 },
          },
          required: ['range', 'consumedCredits', 'usedClawSeconds', 'sessions'],
        },
        UsageSummaryResponse: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'OK' },
            message: { type: 'string', example: '' },
            data: { $ref: '#/components/schemas/UsageSummaryData' },
          },
          required: ['code', 'message', 'data'],
        },
      },
    },
  }
}
