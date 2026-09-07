import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { alphaDshHome, alphaProfileName, runAlphaDsh } from './lib/alpha-runtime.mjs'

// Opt-in, zero paid Turns. Never start a proof Host on a working profile.
if (!alphaDshHome.includes('/.local/aezy-model-fixes-') && !alphaDshHome.startsWith('/tmp/aezy-model-fixes-')) {
  throw new Error('Use an isolated aezy-model-fixes-* DSH_HOME')
}
const { chromium } = await import(pathToFileURL(process.env.AEZY_PLAYWRIGHT_MODULE ?? '/tmp/aezy-playwright/node_modules/playwright/index.mjs').href)
const artifacts = join(alphaDshHome, 'aezy', 'model-picker-proof')
await mkdir(artifacts, { recursive: true })
const fixture = await mkdtemp('/tmp/aezy-model-picker-workspace-')
let launchUrl, logs = '', browser, sequence = 0
const browserErrors = []
const child = runAlphaDsh(['--profile', alphaProfileName, '--host', '127.0.0.1', '--port', '0', '--no-open'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { DEEPSEEK_API_KEY: 'ui-proof-no-model-calls', AEZY_OPENCODEX_PROOF_KEY: 'ui-proof-no-model-calls' },
})
const exited = new Promise(resolve => child.once('exit', resolve))
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {
  const text = data.toString()
  launchUrl ||= text.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s)]+)/)?.[1]
  logs = (logs + text.replace(/([?&]token=)[^\s)]+/g, '$1[redacted]')).slice(-6000)
})
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
  const deadline = Date.now() + 60000
  while (!launchUrl && Date.now() < deadline && child.exitCode === null) await pause(100)
  assert.ok(launchUrl, logs)
  const bootstrap = await fetch(launchUrl, { redirect: 'manual' })
  const cookie = bootstrap.headers.get('set-cookie').split(';', 1)[0]
  const base = new URL(launchUrl).origin
  async function rpc(method, args) {
    const response = await fetch(`${base}/api/${method}`, {
      method: 'POST', headers: { Cookie: cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: `picker-${++sequence}`, method, payload: { args } }),
    })
    const envelope = await response.json()
    assert.equal(envelope.result?.ok, true, `${method}: ${JSON.stringify(envelope.result?.error ?? envelope)}`)
    return envelope.result.value
  }
  const workspace = await rpc('workspace/create', { request: { path: fixture } })
  const sessions = ['standard', 'codex-app-server'].map(preset => ({
    preset, id: `picker-${preset}-${Date.now().toString(36)}`, title: `${preset} picker QA`,
  }))
  for (const session of sessions) {
    await rpc('session/create', { request: { workspaceId: workspace.workspace.workspaceId, sessionId: session.id, agentPreset: session.preset } })
    await rpc('session/rename', { request: { sessionId: session.id, title: session.title } })
  }
  browser = await chromium.launch({
    executablePath: process.env.AEZY_CHROMIUM_BIN ?? '/tmp/aezy-playwright-browsers/chromium-1187/chrome-linux/chrome',
    headless: true, args: ['--no-sandbox'],
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' })
  const errors = []
  const persistedSelections = []
  page.on('response', async response => {
    if (new URL(response.url()).pathname !== '/api/session/selectModel') return
    const result = (await response.json().catch(() => null))?.result
    if (result?.ok && result.value?.selected) persistedSelections.push(result.value.selected)
  })
  page.on('pageerror', error => errors.push(error.message))
  page.on('pageerror', error => browserErrors.push(error.stack ?? error.message))
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  await page.goto(launchUrl, { waitUntil: 'networkidle' })
  // Optional Linux QA font when a minimal runner cannot resolve the OS font
  // stack. This changes only the test browser, never the shipped application.
  if (process.env.AEZY_QA_FONT_PATH) {
    const font = (await readFile(process.env.AEZY_QA_FONT_PATH)).toString('base64')
    await page.evaluate(async data => {
      const face = new FontFace('Aezy QA Sans', `url(data:font/ttf;base64,${data})`)
      document.fonts.add(await face.load())
    }, font)
    await page.addStyleTag({ content: 'body,button,input,textarea { font-family: "Aezy QA Sans", sans-serif !important; }' })
  }
  const notice = page.getByRole('dialog', { name: 'Internal Testing Notice' })
  if (await notice.isVisible()) await notice.getByRole('button', { name: 'Continue', exact: true }).click()
  // DSH intentionally collapses blank Sessions to a single "New Session"
  // row, even after rename. Exercise the public blank-session preset menu.
  const preset = page.getByRole('button', { name: '运行方式', exact: true })
  await preset.click()
  await page.getByText('DSH 工作预设', { exact: true }).waitFor()
  await page.getByText('Codex 执行引擎', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '运行方式', exact: true }).count(), 1)
  await page.screenshot({ path: join(artifacts, 'run-methods.png') })
  await page.getByRole('menuitem', { name: /^(Standard|标准)/ }).click()
  const model = page.getByRole('button', { name: 'Model', exact: true })
  await model.click()
  await page.getByRole('menuitem', { name: 'GPT-6 Astra', exact: true }).waitFor()
  assert.equal(await page.locator('[data-aezy-mode-model] select').count(), 0)
  assert.equal(await model.locator('svg').count(), 1)
  assert.ok(!(await model.textContent()).includes('⌄'))
  const menu = page.getByRole('menu').filter({ hasText: 'GPT-6 Astra' })
  const style = await menu.evaluate(node => ({ radius: getComputedStyle(node).borderRadius, background: getComputedStyle(node).backgroundColor }))
  const typography = await model.evaluate(node => ({ font: getComputedStyle(node).font, color: getComputedStyle(node).color, text: node.textContent, width: node.getBoundingClientRect().width }))
  assert.ok(typography.width > 32, 'Test browser cannot render text; provide AEZY_QA_FONT_PATH to a local font')
  assert.notEqual(style.radius, '0px')
  assert.notEqual(style.background, 'rgba(0, 0, 0, 0)')
  await page.screenshot({ path: join(artifacts, 'standard-models.png') })
  await page.getByRole('menuitem', { name: 'GPT-6 Astra', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[aria-label="Model"]')?.textContent.includes('GPT-6 Astra'))
  await page.getByRole('button', { name: 'Reasoning effort', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Reasoning effort', exact: true }).locator('svg').count(), 1)
  const effortLabels = await page.getByRole('menuitem').allTextContents()
  assert.deepEqual(effortLabels.map(text => text.trim().toLowerCase()), ['low', 'medium', 'high', 'xhigh', 'max'])
  await page.screenshot({ path: join(artifacts, 'astra-reasoning.png') })
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('menu').count(), 0)
  await preset.click()
  await page.getByRole('menuitem', { name: /^Codex App Server/ }).click()
  await model.click()
  await page.getByRole('menuitem', { name: 'GPT-6 Astra', exact: true }).waitFor()
  const codexLabels = await page.getByRole('menuitem').allTextContents()
  assert.ok(codexLabels.some(text => /deepseek/i.test(text)))
  assert.ok(codexLabels.some(text => /GPT/i.test(text)))
  await page.screenshot({ path: join(artifacts, 'codex-models.png') })
  await page.getByRole('menuitem', { name: 'GPT-6 Astra', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[aria-label="Model"]')?.title.includes('Codex'))
  await page.getByRole('button', { name: 'Reasoning effort', exact: true }).click()
  await page.getByRole('menuitem', { name: 'high', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[aria-label="Reasoning effort"]')?.textContent.includes('high'))
  await model.click()
  await page.getByRole('menuitem', { name: 'Refresh models', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[aria-label="Model"]')?.textContent.includes('GPT-6 Astra'))
  // One model identity, two owned execution paths; DSH work presets do not
  // alter the choice. Verify the actual selector route, not just its label.
  await model.click()
  await page.getByRole('menuitem', { name: /DeepSeek.*Flash/i }).click()
  await page.waitForFunction(() => /flash/i.test(document.querySelector('[aria-label="Model"]')?.textContent ?? '')
    && document.querySelector('[aria-label="Model"]')?.title.includes('Codex') && !document.querySelector('[aria-label="Model"]')?.disabled)
  for (const name of [/^(Standard|标准)/, /^PTC/, /^(Minimal|极简)/]) {
    await preset.click()
    await page.getByRole('menuitem', { name }).click()
    await page.waitForFunction(() => /flash/i.test(document.querySelector('[aria-label="Model"]')?.textContent ?? '')
      && document.querySelector('[aria-label="Model"]')?.title.includes('DSH') && !document.querySelector('[aria-label="Model"]')?.disabled)
  }
  await preset.click()
  await page.getByRole('menuitem', { name: /^Codex App Server/ }).click()
  await page.waitForFunction(() => /flash/i.test(document.querySelector('[aria-label="Model"]')?.textContent ?? '')
    && document.querySelector('[aria-label="Model"]')?.title.includes('Codex') && !document.querySelector('[aria-label="Model"]')?.disabled)
  assert.ok(persistedSelections.some(row => row.provider === 'deepseek-official' && row.model === 'deepseek-v4-flash'))
  assert.ok(persistedSelections.some(row => row.provider === 'aezy-codex' && row.model === 'deepseek/deepseek-v4-flash'))
  assert.equal(await page.locator('[data-aezy-mode-model] [role="alert"]').count(), 0)
  await page.screenshot({ path: join(artifacts, 'deepseek-preserved.png') })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Codex', exact: true }).click()
  await page.getByRole('button', { name: 'Open browser login', exact: true }).waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Open browser login' && !button.disabled))
  assert.equal(await page.getByRole('button', { name: 'Open browser login', exact: true }).isEnabled(), true)
  await page.screenshot({ path: join(artifacts, 'codex-settings.png') })
  assert.deepEqual(errors, [])
  const receipt = { timestamp: new Date().toISOString(), profile: alphaProfileName,
    paidModelCalls: 0, nativeSelectCount: 0, svgChevrons: true, standardAstra: true, codexAstra: true, astraEfforts: effortLabels,
    codexModels: codexLabels, selectionAndRefresh: true, groupedRunMethod: true, deepseekPreservedAcrossPresets: true,
    persistedSelections, loginEntry: true, themedMenu: style, typography,
    testFontSubstitution: Boolean(process.env.AEZY_QA_FONT_PATH), pageErrors: errors, artifacts }
  await writeFile(join(artifacts, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify(receipt, null, 2))
} catch (error) {
  if (browser) {
    const page = browser.contexts()[0]?.pages()[0]
    await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
    await writeFile(join(artifacts, 'failure.html'), await page.content())
    console.error(JSON.stringify(browserErrors))
    console.error((await page?.locator('body').innerText().catch(() => '') ?? '').slice(-3500))
  }
  throw error
} finally {
  await browser?.close()
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    const timeout = setTimeout(() => child.kill('SIGKILL'), 10000)
    await exited
    clearTimeout(timeout)
  }
}
