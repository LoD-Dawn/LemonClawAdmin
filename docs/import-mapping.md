# 资源导入映射说明

当前仓库还没有纳入 CoPaw / OpenClaw 的真实文件样例，因此导入器先收口为一个通用 JSON manifest 入口，满足以下目标：

- 支持 `dry-run`
- 支持可重复执行的 `upsert`
- 支持导入报告输出
- 保持数据库字段语义与当前系统一致

## 1. 支持的输入格式

导入文件必须是以下两种形式之一：

```json
[
  {
    "identifier": "github-skill",
    "name": "GitHub Skill",
    "description": "Repository helper",
    "descriptionEn": "Repository helper",
    "descriptionZh": "仓库助手",
    "tags": ["devtools", "git"],
    "packageUrl": "https://example.com/skills/github.zip",
    "version": "1.0.0",
    "sourceFrom": "GitHub",
    "sourceUrl": "https://github.com/example/github-skill",
    "sourceAuthor": "platform-team",
    "visibility": "department",
    "organizationId": "00000000-0000-0000-0000-000000000001",
    "category": "developer",
    "transportType": "stdio",
    "command": "npx",
    "defaultArgs": ["-y", "@modelcontextprotocol/server-github"],
    "requiredEnvKeys": ["GITHUB_TOKEN"],
    "optionalEnvKeys": [],
    "isActive": true
  }
]
```

或：

```json
{
  "items": [
    {
      "id": "filesystem",
      "name": "Filesystem MCP",
      "description_zh": "访问本地文件系统",
      "description_en": "Access local filesystem",
      "category": "developer",
      "visibility": "personal",
      "ownerId": "11111111-1111-1111-1111-111111111111",
      "transportType": "stdio",
      "command": "npx",
      "defaultArgs": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "requiredEnvKeys": [],
      "optionalEnvKeys": []
    }
  ]
}
```

也支持面向客户端的嵌套格式：

```json
[
  {
    "id": "imap-smtp-email",
    "name": "Email Assistant",
    "description_en": "Read and send email",
    "description_zh": "收发邮件",
    "category": "productivity",
    "tags": ["productivity", "office"],
    "url": "https://example.com/skills/imap-smtp-email.zip",
    "version": "1.2.0",
    "source": {
      "from": "Github",
      "url": "https://github.com/org/imap-smtp-email",
      "author": "someone"
    },
    "visibility": "department",
    "organizationId": "00000000-0000-0000-0000-000000000001",
    "transportType": "stdio",
    "command": "npx",
    "defaultArgs": ["-y", "@example/imap-smtp-email"],
    "requiredEnvKeys": ["IMAP_USER", "IMAP_PASSWORD"],
    "optionalEnvKeys": ["SMTP_HOST"]
  }
]
```

## 2. 字段映射

| 输入字段 | 数据库字段 | 说明 |
| --- | --- | --- |
| `identifier` / `id` | `identifier` | 同范围内唯一，MCP 推荐直接使用 `id` |
| `name` | `name` | 资源名称 |
| `description` | `description` | 可选 |
| `descriptionEn` / `description.en` | `descriptionEn` | 英文描述，可选 |
| `descriptionZh` / `description.zh` | `descriptionZh` | 中文描述，可选 |
| `tags` | `tagsJson` | 标签数组，入库为 JSON 字符串 |
| `packageUrl` / `url` | `packageUrl` | 客户端下载或安装地址 |
| `version` | `version` | 版本号 |
| `sourceFrom` / `source.from` | `sourceFrom` | 来源平台 |
| `sourceUrl` / `source.url` | `sourceUrl` | 来源地址 |
| `sourceAuthor` / `source.author` | `sourceAuthor` | 来源作者 |
| `visibility` | `visibility` | `company` / `department` / `personal` |
| `organizationId` | `organizationId` | `company` / `department` 必填 |
| `ownerId` | `ownerId` | `personal` 必填 |
| `category` | `category` | MCP 分类，如 `developer` |
| `transportType` | `source_type` | MCP 传输类型，如 `stdio` |
| `command` | `source_value` | MCP 启动命令 |
| `defaultArgs` | `default_args_json` | 默认参数数组 |
| `requiredEnvKeys` | `required_env_keys_json` | 必需环境变量名数组 |
| `optionalEnvKeys` | `optional_env_keys_json` | 可选环境变量名数组 |
| `isActive` | `isActive` | 默认 `true` |

## 3. 执行方式

仅预演：

```bash
npm run import:resources -- --type skill --file ./data/skills.json --mode dry-run
```

执行 upsert：

```bash
npm run import:resources -- --type mcp --file ./data/mcps.json --mode upsert --report ./tmp/mcp-import-report.json
```

## 4. 当前假设

- 数据库是唯一真源，导入器只负责一次或多次幂等导入，不负责双向同步。
- `identifier + organizationId + ownerId` 共同决定导入匹配范围。
- 真实 CoPaw / OpenClaw 文件格式落地后，只需要新增一层“文件格式 -> manifest”转换，不需要重写导入核心逻辑。
