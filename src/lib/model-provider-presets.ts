type ModelProviderPreset = {
  label: string
  enabled: boolean
  apiKey: string
  baseUrl: string
  apiFormat: string
  codingPlanEnabled?: boolean
  models: Array<{
    id: string
    name: string
    supportsImage: boolean
  }>
}

export const MODEL_PROVIDER_PRESETS: Record<string, ModelProviderPreset> = {
  openai: {
    label: 'OpenAI',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://api.openai.com',
    apiFormat: 'openai',
    models: [
      { id: 'gpt-5.2-2025-12-11', name: 'GPT-5.2', supportsImage: true },
      { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', supportsImage: true },
    ],
  },
  gemini: {
    label: 'Gemini',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiFormat: 'openai',
    models: [
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', supportsImage: true },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', supportsImage: true },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', supportsImage: true },
    ],
  },
  anthropic: {
    label: 'Anthropic',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    apiFormat: 'anthropic',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', supportsImage: true },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', supportsImage: true },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', supportsImage: true },
    ],
  },
  deepseek: {
    label: 'DeepSeek',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/anthropic',
    apiFormat: 'anthropic',
    models: [
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', supportsImage: false },
      { id: 'deepseek-chat', name: 'DeepSeek Chat', supportsImage: false },
    ],
  },
  moonshot: {
    label: 'Moonshot',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://api.moonshot.cn/anthropic',
    apiFormat: 'anthropic',
    codingPlanEnabled: false,
    models: [
      { id: 'kimi-k2.5', name: 'Kimi K2.5', supportsImage: true },
    ],
  },
  zhipu: {
    label: 'Zhipu',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    apiFormat: 'anthropic',
    codingPlanEnabled: false,
    models: [
      { id: 'glm-5', name: 'GLM 5', supportsImage: false },
      { id: 'glm-4.7', name: 'GLM 4.7', supportsImage: false },
    ],
  },
  minimax: {
    label: 'MiniMax',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    apiFormat: 'anthropic',
    models: [
      { id: 'MiniMax-M2.5', name: 'MiniMax M2.5', supportsImage: false },
      { id: 'MiniMax-M2.1', name: 'MiniMax M2.1', supportsImage: false },
    ],
  },
  youdaozhiyun: {
    label: 'Youdao Zhiyun',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://openapi.youdao.com/llmgateway/api/v1/chat/completions',
    apiFormat: 'openai',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', supportsImage: false },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', supportsImage: false },
      { id: 'deepseek-inhouse-chat', name: 'DeepSeek Chat (安全)', supportsImage: false },
      { id: 'deepseek-inhouse-reasoner', name: 'DeepSeek Reasoner (安全)', supportsImage: false },
    ],
  },
  qwen: {
    label: 'Qwen',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/apps/anthropic',
    apiFormat: 'anthropic',
    codingPlanEnabled: false,
    models: [
      { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus', supportsImage: true },
      { id: 'qwen3-coder-plus', name: 'Qwen3 Coder Plus', supportsImage: false },
    ],
  },
  xiaomi: {
    label: 'Xiaomi',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://api.xiaomimimo.com/anthropic',
    apiFormat: 'anthropic',
    models: [
      { id: 'mimo-v2-flash', name: 'MiMo V2 Flash', supportsImage: false },
    ],
  },
  stepfun: {
    label: 'StepFun',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://api.stepfun.com/v1',
    apiFormat: 'openai',
    models: [
      { id: 'step-3.5-flash', name: 'Step 3.5 Flash', supportsImage: false },
    ],
  },
  volcengine: {
    label: 'Volcengine',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/compatible',
    apiFormat: 'anthropic',
    codingPlanEnabled: false,
    models: [
      { id: 'ark-code-latest', name: 'Auto', supportsImage: false },
      { id: 'doubao-seed-2-0-pro-260215', name: 'Doubao-Seed-2.0-pro', supportsImage: false },
      { id: 'doubao-seed-2-0-lite-260215', name: 'Doubao-Seed-2.0-lite', supportsImage: false },
      { id: 'doubao-seed-2-0-mini-260215', name: 'Doubao-Seed-2.0-mini', supportsImage: false },
    ],
  },
  openrouter: {
    label: 'OpenRouter',
    enabled: false,
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api',
    apiFormat: 'anthropic',
    models: [
      { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', supportsImage: true },
      { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', supportsImage: true },
      { id: 'openai/gpt-5.2-codex', name: 'GPT 5.2 Codex', supportsImage: true },
      { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', supportsImage: true },
    ],
  },
  ollama: {
    label: 'Ollama',
    enabled: false,
    apiKey: '',
    baseUrl: 'http://localhost:11434/v1',
    apiFormat: 'openai',
    models: [
      { id: 'qwen3-coder-next', name: 'Qwen3-Coder-Next', supportsImage: false },
      { id: 'glm-4.7-flash', name: 'GLM 4.7 Flash', supportsImage: false },
    ],
  },
  custom: {
    label: 'Custom',
    enabled: false,
    apiKey: '',
    baseUrl: '',
    apiFormat: 'openai',
    models: [],
  },
}

export const CHINA_PROVIDER_KEYS = [
  'deepseek',
  'moonshot',
  'qwen',
  'zhipu',
  'minimax',
  'volcengine',
  'youdaozhiyun',
  'stepfun',
  'xiaomi',
  'ollama',
  'custom',
] as const

export const GLOBAL_PROVIDER_KEYS = [
  'openai',
  'gemini',
  'anthropic',
  'openrouter',
] as const

export const EN_PRIORITY_PROVIDER_KEYS = [
  'openai',
  'anthropic',
  'gemini',
] as const

export const MODEL_PROVIDER_PRESET_OPTIONS = Object.entries(MODEL_PROVIDER_PRESETS).map(([key, preset]) => ({
  key,
  label: preset.label,
}))
