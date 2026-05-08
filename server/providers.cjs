const fs = require('fs');
const path = require('path');

const DEFAULT_OPENCLAW_DIR = 'C:/Users/WIT_User/.openclaw';
const DEFAULT_TIMEOUT_MS = Number(process.env.INKWELL_MODEL_TIMEOUT_MS || 60000);
const FAILURE_COOLDOWN_MS = Number(process.env.INKWELL_PROVIDER_COOLDOWN_MS || 60000);
const FAILURE_COOLDOWN_THRESHOLD = Number(process.env.INKWELL_PROVIDER_COOLDOWN_THRESHOLD || 2);
const MAX_CALL_LOGS = Number(process.env.INKWELL_PROVIDER_LOG_LIMIT || 200);

const providerHealth = new Map();
const callLogs = [];

const PROVIDER_ROLES = {
  candidates: ['deepseek-v4-pro', 'minimax-m27-highspeed', 'yunwu-gpt55'],
  project: ['deepseek-v4-pro', 'yunwu-gpt55'],
  draft: ['deepseek-v4-pro', 'yunwu-gpt55', 'minimax-m27'],
  structureAudit: ['yunwu-opus47', 'deepseek-v4-pro'],
  styleAudit: ['minimax-m27-highspeed', 'minimax-m27', 'yunwu-gpt55'],
  judge: ['yunwu-opus47', 'deepseek-v4-pro'],
  rewrite: ['deepseek-v4-pro', 'yunwu-gpt55', 'minimax-m27'],
  memory: ['minimax-m27-highspeed', 'deepseek-v4-pro'],
};

function getProviderStatus() {
  const configured = loadProviderConfig();
  return {
    roles: PROVIDER_ROLES,
    providers: configured.clients.map((client) => ({
      id: client.id,
      provider: client.provider,
      model: client.model,
      api: client.api,
      configured: true,
      health: publicHealth(client.id),
    })),
    missing: configured.missing,
  };
}

function getProviderLogs(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, MAX_CALL_LOGS));
  return callLogs.slice(0, safeLimit);
}

async function runModelRole(role, messages, options = {}) {
  const configured = loadProviderConfig();
  const preferred = options.preferred || PROVIDER_ROLES[role] || [];
  const clients = preferred.map((id) => configured.byId.get(id)).filter(Boolean);
  const errors = [];
  const attempts = [];
  const startedAt = Date.now();

  for (const client of clients) {
    const health = getHealth(client.id);
    if (isCoolingDown(health)) {
      const cooldownError = `cooldown until ${new Date(health.cooldownUntil).toISOString()}`;
      const attempt = makeAttempt(client, {
        status: 'skipped',
        latencyMs: 0,
        error: cooldownError,
        cooldownUntil: health.cooldownUntil,
      });
      attempts.push(attempt);
      errors.push(`${client.id}: ${cooldownError}`);
      recordCall({ role, ...attempt });
      continue;
    }

    const attemptStartedAt = Date.now();
    health.status = 'running';
    health.lastUsedAt = attemptStartedAt;
    try {
      const text = await client.complete(messages, options);
      const latencyMs = Date.now() - attemptStartedAt;
      if (text && text.trim()) {
        markSuccess(client.id);
        const attempt = makeAttempt(client, { status: 'success', latencyMs });
        attempts.push(attempt);
        recordCall({ role, ...attempt });
        return {
          ok: true,
          text: text.trim(),
          provider: client.provider,
          providerId: client.id,
          model: client.model,
          latencyMs: Date.now() - startedAt,
          attempts,
        };
      }
      throw new Error('empty response');
    } catch (error) {
      const latencyMs = Date.now() - attemptStartedAt;
      const sanitized = sanitizeError(error);
      markFailure(client.id, sanitized);
      const attempt = makeAttempt(client, {
        status: 'failed',
        latencyMs,
        error: sanitized,
        cooldownUntil: getHealth(client.id).cooldownUntil,
      });
      attempts.push(attempt);
      recordCall({ role, ...attempt });
      errors.push(`${client.id}: ${sanitized}`);
    }
  }

  return {
    ok: false,
    text: '',
    provider: null,
    providerId: null,
    model: null,
    latencyMs: Date.now() - startedAt,
    attempts,
    errors,
  };
}

async function runJsonRole(role, messages, options = {}) {
  const configured = loadProviderConfig();
  const preferred = options.preferred || PROVIDER_ROLES[role] || [];
  const clients = preferred.map((id) => configured.byId.get(id)).filter(Boolean);
  const errors = [];
  const attempts = [];
  const startedAt = Date.now();

  for (const client of clients) {
    const health = getHealth(client.id);
    if (isCoolingDown(health)) {
      const cooldownError = `cooldown until ${new Date(health.cooldownUntil).toISOString()}`;
      const attempt = makeAttempt(client, {
        status: 'skipped',
        latencyMs: 0,
        error: cooldownError,
        cooldownUntil: health.cooldownUntil,
      });
      attempts.push(attempt);
      errors.push(`${client.id}: ${cooldownError}`);
      recordCall({ role, ...attempt });
      continue;
    }

    const attemptStartedAt = Date.now();
    health.status = 'running';
    health.lastUsedAt = attemptStartedAt;
    try {
      const text = await client.complete(messages, options);
      if (!text || !text.trim()) throw new Error('empty response');
      const value = parseJsonObject(text);
      const validationError = validateJsonValue(value, options.validate);
      if (validationError) throw new Error(`schema validation: ${validationError}`);
      const latencyMs = Date.now() - attemptStartedAt;
      markSuccess(client.id);
      const attempt = makeAttempt(client, { status: 'success', latencyMs });
      attempts.push(attempt);
      recordCall({ role, ...attempt });
      return {
        ok: true,
        text: text.trim(),
        value,
        provider: client.provider,
        providerId: client.id,
        model: client.model,
        latencyMs: Date.now() - startedAt,
        attempts,
      };
    } catch (error) {
      const latencyMs = Date.now() - attemptStartedAt;
      const message = error instanceof SyntaxError ? `json parse: ${sanitizeError(error)}` : sanitizeError(error);
      markFailure(client.id, message);
      const attempt = makeAttempt(client, {
        status: 'failed',
        latencyMs,
        error: message,
        cooldownUntil: getHealth(client.id).cooldownUntil,
      });
      attempts.push(attempt);
      recordCall({ role, ...attempt });
      errors.push(`${client.id}: ${message}`);
    }
  }

  return {
    ok: false,
    text: '',
    value: null,
    provider: null,
    providerId: null,
    model: null,
    latencyMs: Date.now() - startedAt,
    attempts,
    errors,
  };
}

function validateJsonValue(value, validate) {
  if (typeof validate !== 'function') return '';
  const result = validate(value);
  if (result === true || result === undefined || result === null || result === '') return '';
  if (result === false) return 'validator returned false';
  return String(result);
}

function loadProviderConfig() {
  const openclawDir = process.env.INKWELL_OPENCLAW_DIR || DEFAULT_OPENCLAW_DIR;
  const modelsPath = path.join(openclawDir, 'agents', 'main', 'agent', 'models.json');
  const authPath = path.join(openclawDir, 'agents', 'main', 'agent', 'auth-profiles.json');
  const clients = [];
  const missing = [];

  let models = {};
  let auth = {};
  try {
    models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
  } catch (error) {
    missing.push(`models.json: ${error.message}`);
  }
  try {
    auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  } catch (error) {
    missing.push(`auth-profiles.json: ${error.message}`);
  }

  const providers = models.providers || {};
  const profiles = auth.profiles || {};
  const deepseekToken = profiles['deepseek:default']?.token || providers.deepseek?.apiKey;
  const minimaxToken = profiles['minimax-portal:default']?.access || providers['minimax-portal']?.apiKey;
  const yunwuKey = providers.yunwu?.apiKey;

  if (deepseekToken) {
    clients.push(
      createOpenAiChatClient({
        id: 'deepseek-v4-pro',
        provider: 'deepseek',
        model: 'deepseek-v4-pro',
        baseUrl: providers.deepseek?.baseUrl || 'https://api.deepseek.com',
        apiKey: deepseekToken,
      })
    );
  } else {
    missing.push('deepseek-v4-pro');
  }

  if (minimaxToken) {
    const baseUrl = providers['minimax-portal']?.baseUrl || 'https://api.minimaxi.com/anthropic';
    clients.push(
      createAnthropicClient({
        id: 'minimax-m27-highspeed',
        provider: 'minimax-portal',
        model: 'MiniMax-M2.7-highspeed',
        baseUrl,
        apiKey: minimaxToken,
        authHeader: 'bearer',
      }),
      createAnthropicClient({
        id: 'minimax-m27',
        provider: 'minimax-portal',
        model: 'MiniMax-M2.7',
        baseUrl,
        apiKey: minimaxToken,
        authHeader: 'bearer',
      })
    );
  } else {
    missing.push('MiniMax-M2.7');
  }

  if (yunwuKey) {
    const baseUrl = providers.yunwu?.baseUrl || 'https://yunwu.ai/v1';
    clients.push(
      createAnthropicClient({
        id: 'yunwu-opus47',
        provider: 'yunwu',
        model: 'claude-opus-4-7',
        baseUrl,
        apiKey: yunwuKey,
        authHeader: 'bearer',
      }),
      createAnthropicClient({
        id: 'yunwu-gpt55',
        provider: 'yunwu',
        model: 'gpt-5.5',
        baseUrl,
        apiKey: yunwuKey,
        authHeader: 'bearer',
      })
    );
  } else {
    missing.push('yunwu');
  }

  return {
    clients,
    byId: new Map(clients.map((client) => [client.id, client])),
    missing,
  };
}

function createOpenAiChatClient({ id, provider, model, baseUrl, apiKey }) {
  return {
    id,
    provider,
    model,
    api: 'openai-chat',
    async complete(messages, options = {}) {
      const json = await postJson(`${trimSlash(baseUrl)}/chat/completions`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 2048,
          stream: false,
          thinking: { type: 'disabled' },
        },
      });
      const text = json.choices?.[0]?.message?.content;
      if (!text) throw new Error(json.error?.message || 'OpenAI-compatible response did not contain text.');
      return text;
    },
  };
}

function createAnthropicClient({ id, provider, model, baseUrl, apiKey, authHeader }) {
  return {
    id,
    provider,
    model,
    api: 'anthropic-messages',
    async complete(messages, options = {}) {
      const headers = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      };
      if (authHeader === 'x-api-key') {
        headers['x-api-key'] = apiKey;
      } else {
        headers.Authorization = `Bearer ${apiKey}`;
      }
      const anthropicMessages = messages
        .filter((message) => message.role !== 'system')
        .map((message) => ({ role: message.role, content: message.content }));
      const system = messages
        .filter((message) => message.role === 'system')
        .map((message) => message.content)
        .join('\n\n');
      const endpoint = trimSlash(baseUrl).endsWith('/v1') ? `${trimSlash(baseUrl)}/messages` : `${trimSlash(baseUrl)}/v1/messages`;
      const json = await postJson(endpoint, {
        headers,
        body: {
          model,
          system: system || undefined,
          messages: anthropicMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: Math.max(options.maxTokens || 2048, 512),
        },
      });
      if (json.base_resp && json.base_resp.status_code !== 0) {
        throw new Error(json.base_resp.status_msg || `MiniMax status ${json.base_resp.status_code}`);
      }
      const text = extractAnthropicText(json);
      if (!text) throw new Error(json.error?.message || 'Anthropic-compatible response did not contain text.');
      return text;
    },
  };
}

async function postJson(url, { headers, body }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new Error(`HTTP ${response.status}: non-JSON response`);
    }
    if (!response.ok) {
      throw new Error(json.error?.message || json.message || `HTTP ${response.status}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function extractAnthropicText(json) {
  if (!Array.isArray(json.content)) return '';
  return json.content
    .filter((item) => item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

function parseJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1] : text;
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found.');
  }
  return JSON.parse(source.slice(start, end + 1));
}

function sanitizeError(error) {
  return String(error?.message || error || 'unknown error').replace(/[A-Za-z0-9_\-.=]{24,}/g, '[redacted]');
}

function trimSlash(value) {
  return String(value || '').replace(/\/$/, '');
}

function getHealth(id) {
  if (!providerHealth.has(id)) {
    providerHealth.set(id, {
      status: 'idle',
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      lastUsedAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      cooldownUntil: null,
      lastError: null,
    });
  }
  return providerHealth.get(id);
}

function publicHealth(id) {
  const health = getHealth(id);
  const status = currentStatus(health);
  return {
    status,
    successCount: health.successCount,
    failureCount: health.failureCount,
    consecutiveFailures: health.consecutiveFailures,
    lastUsedAt: toIso(health.lastUsedAt),
    lastSuccessAt: toIso(health.lastSuccessAt),
    lastFailureAt: toIso(health.lastFailureAt),
    cooldownUntil: toIso(health.cooldownUntil),
    lastError: health.lastError,
  };
}

function currentStatus(health) {
  if (isCoolingDown(health)) return 'cooldown';
  if (health.status === 'running') return 'running';
  if (health.consecutiveFailures > 0) return 'degraded';
  if (health.lastSuccessAt) return 'healthy';
  return 'idle';
}

function isCoolingDown(health) {
  return Number.isFinite(health.cooldownUntil) && health.cooldownUntil > Date.now();
}

function markSuccess(id) {
  const health = getHealth(id);
  const now = Date.now();
  health.status = 'healthy';
  health.successCount += 1;
  health.consecutiveFailures = 0;
  health.lastSuccessAt = now;
  health.lastError = null;
  health.cooldownUntil = null;
}

function markFailure(id, error) {
  const health = getHealth(id);
  const now = Date.now();
  health.status = 'degraded';
  health.failureCount += 1;
  health.consecutiveFailures += 1;
  health.lastFailureAt = now;
  health.lastError = error;
  if (health.consecutiveFailures >= FAILURE_COOLDOWN_THRESHOLD) {
    health.status = 'cooldown';
    health.cooldownUntil = now + FAILURE_COOLDOWN_MS;
  }
}

function makeAttempt(client, details) {
  return {
    at: new Date().toISOString(),
    providerId: client.id,
    provider: client.provider,
    model: client.model,
    api: client.api,
    status: details.status,
    latencyMs: details.latencyMs,
    error: details.error || null,
    cooldownUntil: toIso(details.cooldownUntil),
  };
}

function recordCall(entry) {
  callLogs.unshift({
    id: `${Date.now()}:${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    role: entry.role,
    providerId: entry.providerId,
    provider: entry.provider,
    model: entry.model,
    api: entry.api,
    status: entry.status,
    latencyMs: entry.latencyMs,
    error: entry.error || null,
    cooldownUntil: entry.cooldownUntil || null,
  });
  if (callLogs.length > MAX_CALL_LOGS) {
    callLogs.length = MAX_CALL_LOGS;
  }
}

function toIso(value) {
  return Number.isFinite(value) && value > 0 ? new Date(value).toISOString() : null;
}

module.exports = {
  getProviderLogs,
  getProviderStatus,
  runJsonRole,
  runModelRole,
};
