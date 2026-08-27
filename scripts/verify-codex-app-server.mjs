import assert from 'node:assert/strict'
import { CodexAppServerClient } from '../packages/aezy-codex/src/app-server-client.js'

const cwd = process.env.AEZY_CODEX_TEST_CWD ?? process.cwd()
const model = process.env.AEZY_CODEX_TEST_MODEL ?? 'gpt-5.6-sol'
const client = new CodexAppServerClient({ requestTimeoutMs: 60_000 })
const notifications = []
const serverRequests = []
let resolveCompleted
let rejectCompleted
const completed = new Promise((resolve, reject) => {
  resolveCompleted = resolve
  rejectCompleted = reject
})

client.on('notification', (message) => {
  notifications.push(message)
  if (message.method === 'turn/completed') resolveCompleted(message.params)
  if (message.method === 'error' && message.params?.willRetry === false) {
    rejectCompleted(new Error(message.params?.message ?? 'Codex turn failed'))
  }
})
client.on('serverRequest', (message) => {
  serverRequests.push(message)
  if (message.method.includes('approval')) client.respond(message.id, { decision: 'decline' })
  else client.respondError(message.id, -32601, `unsupported compatibility probe request ${message.method}`)
})

try {
  await client.start()
  const [account, models, rateLimits, usage] = await Promise.all([
    client.request('account/read', { refreshToken: false }),
    client.request('model/list', { cursor: null, limit: 100 }),
    client.request('account/rateLimits/read', {}),
    client.request('account/usage/read', {}),
  ])
  assert.equal(account.account?.type, 'chatgpt', 'real gate requires a managed ChatGPT login')
  assert.ok(models.data?.some((candidate) => candidate.id === model), `${model} is unavailable`)
  assert.ok(rateLimits.rateLimits)
  assert.ok(usage.summary)

  const thread = await client.request('thread/start', {
    cwd,
    model,
    approvalPolicy: 'on-request',
    sandbox: 'workspace-write',
    serviceName: 'aezy',
    threadSource: 'aezy',
    ephemeral: true,
  })
  const turn = await client.request('turn/start', {
    threadId: thread.thread.id,
    input: [{
      type: 'text',
      text: 'Aezy official App Server gate. Use the native shell tool exactly once to run `pwd`, then report the actual output. Do not modify files.',
    }],
    cwd,
    approvalPolicy: 'on-request',
    approvalsReviewer: 'user',
    sandboxPolicy: {
      type: 'workspaceWrite',
      writableRoots: [cwd],
      networkAccess: false,
    },
    model,
    effort: 'low',
    summary: 'none',
  })
  assert.ok(turn.turn?.id)
  let turnTimer
  const terminal = await Promise.race([
    completed,
    new Promise((_, reject) => {
      turnTimer = setTimeout(() => reject(new Error('Codex Turn timed out')), 120_000)
    }),
  ]).finally(() => clearTimeout(turnTimer))
  assert.equal(terminal.turn?.status, 'completed')
  const itemTypes = notifications
    .filter((message) => message.method === 'item/started' || message.method === 'item/completed')
    .map((message) => message.params?.item?.type)
  assert.ok(itemTypes.includes('commandExecution'), 'Codex did not emit a structured commandExecution item')

  process.stdout.write(`${JSON.stringify({
    account: {
      type: account.account.type,
      planType: account.account.planType,
    },
    model,
    structuredCommandExecution: true,
    rateLimitsReadable: true,
    usageReadable: true,
    approvalRequestsDeclined: serverRequests.filter((message) => message.method.includes('approval')).length,
  }, null, 2)}\n`)
} finally {
  await client.close()
}
