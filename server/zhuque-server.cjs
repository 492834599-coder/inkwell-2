const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { URL } = require('url');
const { routeOrchestrator } = require('./orchestrator.cjs');
const { deleteProjectState, getProjectStateStatus, loadProjectState, saveProjectState } = require('./project-state.cjs');

const PORT = Number(process.env.ZHUQUE_SERVER_PORT || 8788);
const ZHUQUE_URL = process.env.ZHUQUE_URL || 'https://matrix.tencent.com/ai-detect/';
const HEADLESS = process.env.ZHUQUE_HEADLESS !== 'false';
const MOCK = process.env.ZHUQUE_MOCK === 'true';
const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'zhuque');
const USER_DATA_DIR = path.join(ROOT, '.local', 'zhuque-browser');
const DEFAULT_THRESHOLD = Number(process.env.ZHUQUE_AI_THRESHOLD || 0.5);

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.mkdirSync(USER_DATA_DIR, { recursive: true });

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (projectError) {
    try {
      return require('C:/Users/WIT_User/.agents/skills/browser-automation/node_modules/playwright');
    } catch (skillError) {
      throw new Error(`Playwright 未安装：${projectError.message}; fallback: ${skillError.message}`);
    }
  }
}

const { chromium } = loadPlaywright();
let browserTaskInFlight = false;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin') || '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: res.getHeader('Vary') || 'Origin',
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin') || '*',
    Vary: res.getHeader('Vary') || 'Origin',
  });
  res.end(text);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '');
    if (req.method === 'POST' && !contentType.includes('application/json')) {
      const error = new Error('Content-Type must be application/json');
      error.statusCode = 415;
      reject(error);
      req.resume();
      return;
    }
    const chunks = [];
    let bodyBytes = 0;
    let tooLargeError = null;
    req.on('data', (chunk) => {
      bodyBytes += chunk.length;
      if (!tooLargeError) chunks.push(chunk);
      if (bodyBytes > 8 * 1024 * 1024) {
        const error = new Error('请求正文过大');
        error.statusCode = 413;
        tooLargeError = error;
        chunks.length = 0;
      }
    });
    req.on('end', () => {
      try {
        if (tooLargeError) {
          reject(tooLargeError);
          return;
        }
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error(`JSON 解析失败：${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return true;
  }
  if (!isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', 'null');
    res.setHeader('Vary', 'Origin');
    return false;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  return true;
}

function isAllowedOrigin(origin) {
  try {
    const parsed = new URL(origin);
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') return true;
    if (parsed.hostname === 'tauri.localhost') return true;
    return parsed.protocol === 'tauri:';
  } catch {
    return false;
  }
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function artifactUrl(filePath) {
  return `http://127.0.0.1:${PORT}/api/zhuque/artifacts/${encodeURIComponent(path.basename(filePath))}`;
}

async function withBrowserLock(taskName, task) {
  if (browserTaskInFlight) {
    const error = new Error(`Zhuque browser is busy with another ${taskName} task. Please retry after it finishes.`);
    error.statusCode = 409;
    throw error;
  }
  browserTaskInFlight = true;
  try {
    return await task();
  } finally {
    browserTaskInFlight = false;
  }
}

async function launchContext() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: HEADLESS,
    viewport: { width: 1365, height: 900 },
    acceptDownloads: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
    ],
  });
  await context.addInitScript(() => {
    window.print = () => {
      window.__zhuquePrintSuppressed = true;
    };
  });
  return context;
}

async function getPage(context) {
  const page = context.pages()[0] || (await context.newPage());
  page.setDefaultTimeout(15000);
  return page;
}

async function findInputElement(page) {
  for (const frame of page.frames()) {
    const handle = await frame.evaluateHandle(() => {
      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 8 && rect.height > 8 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const byArea = (items) =>
        items.sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return br.width * br.height - ar.width * ar.height;
        })[0];
      const textareas = Array.from(document.querySelectorAll('textarea')).filter(isVisible);
      if (textareas.length) return byArea(textareas);
      const editables = Array.from(document.querySelectorAll('[contenteditable="true"]')).filter(isVisible);
      if (editables.length) return byArea(editables);
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="file"])')).filter(isVisible);
      return inputs[0] || null;
    });
    const element = handle.asElement();
    if (element) return element;
  }
  return null;
}

async function clickCandidate(page, words) {
  for (const frame of page.frames()) {
    const clickedText = await frame.evaluate((candidateWords) => {
      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 8 && rect.height > 8 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const candidates = Array.from(document.querySelectorAll('button,a')).filter((el) => {
        const text = (el.innerText || el.textContent || '').trim();
        const disabled = Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true';
        return isVisible(el) && !disabled && candidateWords.some((word) => text.includes(word));
      });
      const preferred = candidates.find((el) => (el.innerText || el.textContent || '').includes(candidateWords[0])) || candidates[0];
      if (!preferred) return null;
      const text = (preferred.innerText || preferred.textContent || '').trim();
      preferred.click();
      return text;
    }, words);
    if (clickedText) return clickedText;
  }
  return null;
}

function parseRemaining(text) {
  const match = text.match(/今日剩余\s*(\d+)\s*次/);
  return match ? Number(match[1]) : null;
}

function parseAigcScore(text) {
  const matches = Array.from(text.matchAll(/AIGC值\s*[:：]?\s*([01](?:\.\d+)?)/g));
  if (!matches.length) return null;
  const values = matches.map((match) => Number(match[1])).filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : null;
}

function classify(score, bodyText) {
  if (score !== null) {
    if (score >= DEFAULT_THRESHOLD) {
      return {
        status: 'ai_risk',
        verdict: '朱雀显示 AI 特征偏高',
        summary: `AIGC 值 ${score.toFixed(4)}，建议回流降痕改写。`,
      };
    }
    return {
      status: 'passed',
      verdict: '朱雀复测通过',
      summary: `AIGC 值 ${score.toFixed(4)}，低于阈值 ${DEFAULT_THRESHOLD}。`,
    };
  }

  if (/登录|扫码|微信/.test(bodyText) && /次数|额度|剩余/.test(bodyText)) {
    return {
      status: 'needs_login',
      verdict: '需要登录朱雀',
      summary: '匿名额度不足或登录态失效，需要扫码后继续检测。',
    };
  }

  if (/剩余\s*0\s*次|次数已用完|额度不足/.test(bodyText)) {
    return {
      status: 'quota_exhausted',
      verdict: '匿名额度已用完',
      summary: '今日匿名检测额度不足，需要登录朱雀。',
    };
  }

  return {
    status: 'failed',
    verdict: '未能解析朱雀结果',
    summary: '页面已返回，但没有找到 AIGC 值或明确检测结论。',
  };
}

async function captureReport(page) {
  await page.evaluate(() => {
    window.print = () => {
      window.__zhuquePrintSuppressed = true;
    };
    window.__zhuquePrintPatch = window.setInterval(() => {
      document.querySelectorAll('iframe').forEach((iframe) => {
        try {
          iframe.contentWindow.print = () => {
            iframe.contentWindow.__zhuquePrintSuppressed = true;
          };
        } catch (_) {
          // Ignore cross-origin frames.
        }
      });
    }, 50);
  });

  const clicked = await clickCandidate(page, ['下载报告', '报告', '下载']);
  if (!clicked) return null;

  await page.waitForSelector('#report-container .report-content', { timeout: 12000 }).catch(() => null);
  const report = await page.evaluate(async () => {
    const container = document.querySelector('#report-container');
    const content = document.querySelector('#report-container .report-content');
    if (!container || !content) return null;

    window.clearInterval(window.__zhuquePrintPatch);
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '2147483647';
    container.style.display = 'block';
    container.style.width = '900px';
    container.style.background = '#ffffff';
    content.style.background = '#ffffff';
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { text: content.innerText, html: content.outerHTML };
  });

  if (!report) return null;

  const id = stamp();
  const htmlPath = path.join(ARTIFACT_DIR, `zhuque-report-${id}.html`);
  const screenshotPath = path.join(ARTIFACT_DIR, `zhuque-report-${id}.png`);
  fs.writeFileSync(htmlPath, report.html, 'utf8');
  await page.locator('#report-container .report-content').screenshot({ path: screenshotPath, timeout: 30000 }).catch(() => null);

  return {
    text: report.text,
    htmlPath,
    screenshotPath,
    htmlUrl: artifactUrl(htmlPath),
    screenshotUrl: artifactUrl(screenshotPath),
  };
}

async function checkZhuque(payload) {
  if (!payload.text || payload.text.trim().length < 20) {
    throw new Error('正文太短，朱雀检测至少需要一段可分析文本。');
  }

  if (MOCK) {
    return createMockZhuqueResult(payload);
  }

  const context = await launchContext();
  const page = await getPage(context);
  try {
    await page.goto(ZHUQUE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);

    const input = await findInputElement(page);
    if (!input) {
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const classified = classify(null, bodyText);
      return {
        ...classified,
        aigcScore: null,
        aiPercent: null,
        remainingDaily: parseRemaining(bodyText),
      };
    }

    await input.click();
    const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === 'textarea' || tagName === 'input') {
      await input.fill(payload.text);
    } else {
      await input.evaluate((el, value) => {
        el.textContent = value;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      }, payload.text);
    }

    await page.waitForTimeout(700);
    const clicked = await clickCandidate(page, ['立即检测', '检测', '提交']);
    if (!clicked) {
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const classified = classify(null, bodyText);
      return {
        ...classified,
        aigcScore: null,
        aiPercent: null,
        remainingDaily: parseRemaining(bodyText),
      };
    }

    await page.waitForTimeout(18000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
    const bodyText = await page.locator('body').innerText({ timeout: 10000 });
    const report = await captureReport(page);
    const reportText = report?.text || '';
    const score = parseAigcScore(reportText) ?? parseAigcScore(bodyText);
    const classified = classify(score, bodyText + '\n' + reportText);
    const remainingDaily = parseRemaining(bodyText) ?? parseRemaining(clicked);

    return {
      ...classified,
      aigcScore: score,
      aiPercent: score === null ? null : score * 100,
      remainingDaily,
      reportText: reportText || undefined,
      reportHtmlPath: report?.htmlPath,
      reportScreenshotPath: report?.screenshotPath,
      reportHtmlUrl: report?.htmlUrl,
      reportScreenshotUrl: report?.screenshotUrl,
    };
  } finally {
    await context.close();
  }
}

function createMockZhuqueResult(payload) {
  const score = payload.text.length % 2 === 0 ? 0.2388 : 0.9988;
  const status = score >= DEFAULT_THRESHOLD ? 'ai_risk' : 'passed';
  const id = stamp();
  const htmlPath = path.join(ARTIFACT_DIR, `zhuque-mock-report-${id}.html`);
  const reportText = [
    '朱雀AI生成检测报告单',
    `检测时间：${new Date().toLocaleString()}`,
    `检测结果：${status === 'passed' ? '通过' : 'AI 特征偏高'}`,
    `AIGC值 ${score.toFixed(4)}`,
    `片段1：${payload.text.slice(0, 240)}`,
  ].join('\n');
  const html = `<!doctype html><meta charset="utf-8"><title>朱雀 Mock 报告</title><body style="font-family:sans-serif;line-height:1.8;padding:32px;"><h1>朱雀 Mock 报告</h1><pre>${escapeHtml(reportText)}</pre></body>`;
  fs.writeFileSync(htmlPath, html, 'utf8');
  return {
    status,
    aigcScore: score,
    aiPercent: score * 100,
    verdict: status === 'passed' ? '朱雀 Mock 复测通过' : '朱雀 Mock 显示 AI 特征偏高',
    summary: status === 'passed' ? `AIGC 值 ${score.toFixed(4)}，低于阈值。` : `AIGC 值 ${score.toFixed(4)}，建议回流降痕改写。`,
    remainingDaily: 5,
    reportText,
    reportHtmlPath: htmlPath,
    reportHtmlUrl: artifactUrl(htmlPath),
  };
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function captureLoginQr() {
  const context = await launchContext();
  const page = await getPage(context);
  try {
    await page.goto(ZHUQUE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2000);

    await clickCandidate(page, ['登录', '立即登录']);
    await page.evaluate(() => {
      const clickables = Array.from(document.querySelectorAll('button,a,[role="button"],.el-dropdown,.el-avatar'));
      const topRight = clickables
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter((item) => item.rect.width > 8 && item.rect.height > 8 && item.rect.x > window.innerWidth - 180 && item.rect.y < 120)
        .sort((a, b) => b.rect.x - a.rect.x)[0];
      topRight?.el.click();
    }).catch(() => null);

    await page.waitForTimeout(2500);
    const qr = await page.evaluateHandle(() => {
      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 80 && rect.height > 80 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const candidates = Array.from(document.querySelectorAll('canvas,img,.el-dialog,.el-popover'))
        .filter(isVisible)
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .sort((a, b) => {
          const as = Math.min(a.rect.width, a.rect.height);
          const bs = Math.min(b.rect.width, b.rect.height);
          return bs - as;
        });
      return candidates[0]?.el || null;
    });
    const qrElement = qr.asElement();
    if (!qrElement) {
      return { status: 'not_found', message: '没有找到微信登录二维码，可能已经登录或页面结构变化。' };
    }

    const imagePath = path.join(ARTIFACT_DIR, `zhuque-login-qr-${stamp()}.png`);
    await qrElement.screenshot({ path: imagePath, timeout: 30000 });
    return { status: 'qr_ready', qrImageUrl: artifactUrl(imagePath), qrImagePath: imagePath };
  } finally {
    await context.close();
  }
}

function inspectMiniMaxConfig() {
  const roots = [
    path.join(os.homedir(), '.openclaw'),
    path.join(os.homedir(), '.agents'),
    path.join(os.homedir(), '.codex'),
  ].filter((dir) => fs.existsSync(dir));

  const findings = [];
  const queue = [...roots];
  const ignored = new Set(['node_modules', 'cache', 'logs', 'dist', '.git']);
  while (queue.length && findings.length < 12) {
    const dir = queue.shift();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }
      if (!/\.(json|toml|ya?ml|env|ini|conf|txt|md)$/i.test(entry.name)) continue;
      let text = '';
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 512 * 1024) continue;
        text = fs.readFileSync(fullPath, 'utf8');
      } catch (_) {
        continue;
      }
      if (!/minimax/i.test(text + fullPath)) continue;
      const hasApiKey = /api[_-]?key|apikey|MINIMAX_API_KEY/i.test(text);
      const hasOAuth = /oauth|access[_-]?token|refresh[_-]?token/i.test(text);
      findings.push({
        path: fullPath,
        authType: hasOAuth ? 'oauth' : hasApiKey ? 'api_key' : 'mentioned',
        hasSecretLikeValue: /(api[_-]?key|apikey|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^"'\s]{12,}/i.test(text),
      });
    }
  }

  return {
    available: findings.some((item) => item.authType === 'api_key' || item.authType === 'oauth'),
    findings,
    note: '这里只返回配置位置和认证类型，不返回任何密钥或 token。',
  };
}

function serveArtifact(res, pathname) {
  const name = decodeURIComponent(pathname.replace('/api/zhuque/artifacts/', ''));
  const filePath = path.join(ARTIFACT_DIR, path.basename(name));
  if (!filePath.startsWith(ARTIFACT_DIR) || !fs.existsSync(filePath)) {
    sendText(res, 404, 'artifact not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === '.png' ? 'image/png' : ext === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin') || '*',
    Vary: res.getHeader('Vary') || 'Origin',
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  if (!applyCors(req, res)) {
    sendText(res, 403, 'origin not allowed');
    return;
  }
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  try {
    if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'inkwell-backend',
        headless: HEADLESS,
        mock: MOCK,
        zhuqueUrl: ZHUQUE_URL,
        capabilities: ['orchestrator', 'zhuque', 'model-config', 'project-state'],
        projectState: getProjectStateStatus(),
      });
      return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/project-state') {
      sendJson(res, 200, loadProjectState());
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/project-state') {
      const payload = await readJson(req);
      sendJson(res, 200, saveProjectState(payload));
      return;
    }

    if (req.method === 'DELETE' && requestUrl.pathname === '/api/project-state') {
      sendJson(res, 200, deleteProjectState());
      return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/orchestrator/status') {
      sendJson(res, 200, await routeOrchestrator(requestUrl.pathname, {}));
      return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/orchestrator/logs') {
      const limit = Number(requestUrl.searchParams.get('limit') || 50);
      sendJson(res, 200, await routeOrchestrator(requestUrl.pathname, { limit }));
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/zhuque/check') {
      const payload = await readJson(req);
      const result = await withBrowserLock('check', () => checkZhuque(payload));
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/zhuque/login/qr') {
      const result = await withBrowserLock('login', () => captureLoginQr());
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname.startsWith('/api/orchestrator/')) {
      const payload = await readJson(req);
      const result = await routeOrchestrator(requestUrl.pathname, payload);
      if (!result) {
        sendText(res, 404, 'not found');
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/models/minimax/config') {
      sendJson(res, 200, inspectMiniMaxConfig());
      return;
    }

    if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/zhuque/artifacts/')) {
      serveArtifact(res, requestUrl.pathname);
      return;
    }

    sendText(res, 404, 'not found');
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Inkwell Zhuque server listening on http://127.0.0.1:${PORT}`);
  console.log(`Zhuque URL: ${ZHUQUE_URL}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log(`Mock: ${MOCK}`);
});
