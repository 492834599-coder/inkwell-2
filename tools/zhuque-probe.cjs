const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('C:/Users/WIT_User/.agents/skills/browser-automation/node_modules/playwright');

const ZHUQUE_URL = process.env.ZHUQUE_URL;
const ARTIFACT_DIR = path.resolve('E:/inkwell-2/artifacts/zhuque');
const MODE = process.env.ZHUQUE_MODE || 'full';

const SAMPLE_TEXT = `《潮声里的旧灯塔》

第一章 归潮

林照回到雾港时，傍晚的潮水正从防波堤下退走，像有人把一整匹灰蓝色的绸缎慢慢抽离城市。海风里混着盐、柴油和雨后石板路的味道，她拖着行李箱站在码头尽头，看见那座废弃灯塔仍旧立在礁石上，白漆剥落，窗洞漆黑，仿佛多年以前没有人真正离开过。

母亲去世后留下的只有一串钥匙、一只旧收音机和一封没有署名的信。信纸被海潮泡过，边缘皱得像鱼鳞，只剩下一句话还能读清：“如果你想知道你父亲为什么消失，去听灯塔午夜十二点的潮声。”

林照本来不信这些。她在省城做了七年档案修复师，见过太多被人添油加醋的传说，知道秘密往往不在鬼魅里，而在账本、病历、船舶登记册这些沉默的纸页中。可当她把钥匙插进母亲旧屋的门锁时，屋内那台早已断电的收音机忽然自己响了起来。

沙沙的电流声里，一个男人低声念着她的名字。

“林照，别上灯塔。”

她的手停在门把上，冷意顺着指尖爬上手臂。那声音和她童年记忆里模糊的父亲重合，又比记忆更疲惫，像从很深的海底传来。窗外，远处灯塔顶端忽然亮了一下。不是灯光，更像一只在雾中睁开的眼睛。

这一夜，雾港所有渔船都提前归港，老人们闭门不出，只有林照拿着母亲留下的钥匙，沿着潮湿的石阶走向海边。她不知道自己将打开的是一座灯塔，还是十五年前那场失踪案真正被封住的入口。`;

const ACTION_WORDS = ['检测', '开始', '提交', '立即', 'AI'];
const REPORT_WORDS = ['下载', '报告', '导出', '详情', '详细'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

async function collectVisibleControls(frame) {
  return frame.evaluate(() => {
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 8 && rect.height > 8 && style.visibility !== 'hidden' && style.display !== 'none';
    };

    return Array.from(document.querySelectorAll('textarea,input,[contenteditable="true"],button,a'))
      .map((el, index) => {
        const rect = el.getBoundingClientRect();
        return {
          index,
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || '',
          id: el.id || '',
          className: String(el.className || '').slice(0, 120),
          text: (el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '')
            .trim()
            .slice(0, 160),
          placeholder: el.getAttribute('placeholder') || '',
          disabled: Boolean(el.disabled),
          visible: isVisible(el),
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          },
        };
      })
      .filter((item) => item.visible);
  });
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
    if (element) {
      return { frame, element };
    }
  }

  return null;
}

async function clickTextCandidate(page, words) {
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

      const preferred = candidates.find((el) => (el.innerText || el.textContent || '').includes('检测')) || candidates[0];
      if (!preferred) return null;

      const text = (preferred.innerText || preferred.textContent || '').trim();
      preferred.click();
      return text;
    }, words);

    if (clickedText) {
      return clickedText;
    }
  }

  return null;
}

async function tryDownloadReport(page, artifactDir) {
  const candidates = [];
  for (const frame of page.frames()) {
    candidates.push(
      ...(await frame.evaluate((reportWords) => {
        const isVisible = (el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return rect.width > 8 && rect.height > 8 && style.visibility !== 'hidden' && style.display !== 'none';
        };

        return Array.from(document.querySelectorAll('button,a'))
          .map((el) => ({
            text: (el.innerText || el.textContent || '').trim(),
            href: el.href || '',
            disabled: Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true',
            visible: isVisible(el),
          }))
          .filter((item) => item.visible && !item.disabled && reportWords.some((word) => item.text.includes(word)));
      }, REPORT_WORDS)),
    );
  }

  if (!candidates.length) {
    return { candidates, path: null };
  }

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
        } catch (error) {
          // Cross-origin iframes are ignored; the report iframe is same-origin.
        }
      });
    }, 50);
  });

  const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  const popupPromise = page.waitForEvent('popup', { timeout: 15000 }).catch(() => null);
  let clicked = null;

  const reportLink = page.getByText('下载报告', { exact: false }).first();
  if ((await reportLink.count().catch(() => 0)) > 0) {
    clicked = '下载报告';
    await reportLink.click({ timeout: 8000 });
  } else {
    clicked = await clickTextCandidate(page, REPORT_WORDS);
  }

  const download = await downloadPromise;
  await page.waitForSelector('#report-container .report-content', { timeout: 10000 }).catch(() => null);

  const reportCapture = await page.evaluate(async () => {
    const container = document.querySelector('#report-container');
    const report = document.querySelector('#report-container .report-content');
    if (!container || !report) return null;

    window.clearInterval(window.__zhuquePrintPatch);
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '2147483647';
    container.style.display = 'block';
    container.style.width = '900px';
    container.style.background = '#ffffff';
    report.style.background = '#ffffff';
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      text: report.innerText,
      html: report.outerHTML,
    };
  });

  if (reportCapture) {
    const reportPath = path.join(artifactDir, `zhuque-report-${nowStamp()}.png`);
    const htmlPath = path.join(artifactDir, `zhuque-report-${nowStamp()}.html`);
    let downloadedPath = null;
    if (download) {
      downloadedPath = path.join(artifactDir, await download.suggestedFilename());
      await download.saveAs(downloadedPath);
    }
    fs.writeFileSync(htmlPath, reportCapture.html, 'utf8');
    await page.locator('#report-container .report-content').screenshot({ path: reportPath, timeout: 30000 });
    return { candidates, clicked, path: downloadedPath, reportScreenshot: reportPath, reportHtml: htmlPath, reportText: reportCapture.text.slice(0, 2000) };
  }

  if (!download) {
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => null);
      const popupPath = path.join(artifactDir, `report-popup-${nowStamp()}.png`);
      await popup.screenshot({ path: popupPath, fullPage: true, timeout: 30000 }).catch(() => null);
      return { candidates, clicked, path: null, popupUrl: popup.url(), popupScreenshot: popupPath };
    }

    return { candidates, clicked, path: null };
  }

  const savePath = path.join(artifactDir, await download.suggestedFilename());
  await download.saveAs(savePath);
  return { candidates, clicked, path: savePath };
}

async function run() {
  if (!ZHUQUE_URL) {
    throw new Error('Missing ZHUQUE_URL env var.');
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const stamp = nowStamp();
  const log = [];
  const userDataDir = path.join(os.homedir(), '.openclaw', 'browser-data-zhuque');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
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

  const page = context.pages()[0] || (await context.newPage());
  page.setDefaultTimeout(15000);

  try {
    await page.goto(ZHUQUE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(3000);

    log.push({ step: 'loaded', title: await page.title(), url: page.url() });
    log.push({ step: 'controls', controls: await collectVisibleControls(page.mainFrame()) });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `01-loaded-${stamp}.png`), fullPage: true });

    if (MODE === 'download-only') {
      const download = await tryDownloadReport(page, ARTIFACT_DIR);
      log.push({ step: 'download', download });
      return { ok: Boolean(download.path || download.popupUrl), stamp, artifactDir: ARTIFACT_DIR, steps: log.map((entry) => entry.step), last: log.at(-1) };
    }

    const input = await findInputElement(page);
    if (!input) {
      throw new Error('No visible text input found.');
    }

    await input.element.click();
    const tagName = await input.element.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === 'textarea' || tagName === 'input') {
      await input.element.fill(SAMPLE_TEXT);
    } else {
      await input.element.evaluate((el, value) => {
        el.textContent = value;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      }, SAMPLE_TEXT);
    }

    log.push({ step: 'filled', tagName, sampleChars: SAMPLE_TEXT.length });
    await sleep(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `02-filled-${stamp}.png`), fullPage: true });

    const clicked = await clickTextCandidate(page, ACTION_WORDS);
    if (!clicked) {
      throw new Error('No visible submit/detect button found after filling text.');
    }

    log.push({ step: 'clicked', clicked });
    await sleep(18000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);

    const bodyText = await page.locator('body').innerText({ timeout: 10000 });
    log.push({ step: 'result-text', text: bodyText.slice(0, 6000) });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `03-result-${stamp}.png`), fullPage: true });

    const download = await tryDownloadReport(page, ARTIFACT_DIR);
    log.push({ step: 'download', download });
    await sleep(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `04-after-download-${stamp}.png`), fullPage: false, timeout: 30000 }).catch(() => null);

    return { ok: true, stamp, artifactDir: ARTIFACT_DIR, steps: log.map((entry) => entry.step), last: log.at(-1) };
  } catch (error) {
    log.push({ step: 'error', message: error.message, stack: error.stack });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `error-${stamp}.png`), fullPage: true }).catch(() => null);
    return { ok: false, stamp, artifactDir: ARTIFACT_DIR, steps: log.map((entry) => entry.step), error: error.message };
  } finally {
    fs.writeFileSync(path.join(ARTIFACT_DIR, `probe-${stamp}.json`), JSON.stringify({ log }, null, 2), 'utf8');
    await context.close();
  }
}

run()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
