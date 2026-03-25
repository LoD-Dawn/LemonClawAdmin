# 模型 API Key 解密对接说明

这份文档说明当前项目里 `ModelProvider.apiKey` 的加密格式，方便其他端按同一规则解密。

适用场景：

- 其他服务直接读取数据库里的 `model_providers.api_key`
- 其他服务接收到的是加密后的 API Key 字符串
- 对接端可能是 Node.js 或 Python

也适用于以下场景：

- 对接端调用只读配置接口 `GET /api/client/models`
- 对接端调用只读配置接口 `GET /api/external/v1/me/models`

## 1. 加密规则

当前项目使用的规则如下：

- 算法：`AES-256-GCM`
- IV 长度：`12` 字节
- 密钥派生方式：对原始密钥字符串做 `SHA-256`，得到 32 字节结果，直接作为 AES Key
- 编码：`Base64`
- 存储格式：

```text
enc:v1:<iv_base64>:<auth_tag_base64>:<ciphertext_base64>
```

例如：

```text
enc:v1:IV_BASE64:AUTH_TAG_BASE64:CIPHERTEXT_BASE64
```

## 2. 原始密钥来源

服务端加解密时按下面顺序取密钥：

1. `MODEL_API_KEY_ENCRYPTION_SECRET`
2. `JWT_SECRET`
3. `NEXTAUTH_SECRET`

生产环境建议显式设置：

```env
MODEL_API_KEY_ENCRYPTION_SECRET="your-strong-random-secret"
```

## 3. 解密流程

拿到密文后，按下面步骤处理：

1. 用 `:` 分割字符串
2. 校验前两段必须是 `enc` 和 `v1`
3. 取出：
   - 第 3 段：`iv_base64`
   - 第 4 段：`auth_tag_base64`
   - 第 5 段：`ciphertext_base64`
4. 对原始 secret 做 `SHA-256`
5. 用派生后的 32 字节 key 执行 `AES-256-GCM` 解密
6. 把结果按 UTF-8 转成字符串

## 4. Node.js 示例

```js
const { createDecipheriv, createHash } = require('crypto')

function decryptModelApiKey(encryptedValue, secret) {
  if (!encryptedValue) return encryptedValue

  const parts = encryptedValue.split(':')
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Invalid encrypted API key format')
  }

  const iv = Buffer.from(parts[2], 'base64')
  const authTag = Buffer.from(parts[3], 'base64')
  const ciphertext = Buffer.from(parts[4], 'base64')

  const key = createHash('sha256').update(secret, 'utf8').digest()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

// 示例
const encryptedValue = process.env.ENCRYPTED_MODEL_API_KEY
const secret =
  process.env.MODEL_API_KEY_ENCRYPTION_SECRET ||
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET

const plaintext = decryptModelApiKey(encryptedValue, secret)
console.log(plaintext)
```

如果你使用 TypeScript，也可以直接复用同样逻辑。

## 5. Python 示例

Python 需要安装 `cryptography`：

```bash
pip install cryptography
```

解密示例：

```python
import os
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def decrypt_model_api_key(encrypted_value: str, secret: str) -> str:
    if not encrypted_value:
        return encrypted_value

    parts = encrypted_value.split(":")
    if len(parts) != 5 or parts[0] != "enc" or parts[1] != "v1":
        raise ValueError("Invalid encrypted API key format")

    iv = base64.b64decode(parts[2])
    auth_tag = base64.b64decode(parts[3])
    ciphertext = base64.b64decode(parts[4])

    key = hashlib.sha256(secret.encode("utf-8")).digest()
    aesgcm = AESGCM(key)

    # cryptography 的 AESGCM.decrypt 需要 ciphertext + auth_tag 拼接
    plaintext = aesgcm.decrypt(iv, ciphertext + auth_tag, None)
    return plaintext.decode("utf-8")


if __name__ == "__main__":
    encrypted_value = os.environ.get("ENCRYPTED_MODEL_API_KEY", "")
    secret = (
        os.environ.get("MODEL_API_KEY_ENCRYPTION_SECRET")
        or os.environ.get("JWT_SECRET")
        or os.environ.get("NEXTAUTH_SECRET")
    )

    if not secret:
        raise RuntimeError("Missing decryption secret")

    print(decrypt_model_api_key(encrypted_value, secret))
```

## 6. 常见问题

### 6.1 为什么不能直接用原始 secret 做 AES-256 Key？

因为 AES-256 需要固定 32 字节 key。当前项目里是先对 secret 做一次 `SHA-256`，再把结果当作最终 key。

### 6.2 为什么 Python 里要把 `ciphertext + auth_tag` 拼起来？

因为 Python `cryptography` 的 `AESGCM.decrypt()` 接口要求认证标签拼接在密文末尾；Node.js 则是单独 `setAuthTag()`。

### 6.3 如果拿到的字符串不是 `enc:v1:` 开头怎么办？

说明它不是当前项目加密后的值，或者是历史明文值。当前项目服务端对这种情况会直接按明文处理。

## 7. 与项目实现对应的源码

当前项目里的真实实现位置：

- 加解密实现：`src/lib/model-provider-secrets.ts`
- 创建时加密：`src/app/api/v1/models/route.ts`
- 更新时加密：`src/app/api/v1/models/[id]/route.ts`
- 只读模型配置接口返回加密密文：`src/app/api/client/models/route.ts`
- 外部模型配置接口返回加密密文：`src/app/api/external/v1/me/models/route.ts`

## 8. 安全建议

- 不要把解密后的 API Key 打到日志里
- `MODEL_API_KEY_ENCRYPTION_SECRET` 请单独管理，不要和公开配置混放
- 如果未来需要轮换密钥，建议新增 `enc:v2` 版本格式，不要直接覆盖协议
