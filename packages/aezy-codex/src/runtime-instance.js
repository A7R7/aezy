import { createHash } from 'node:crypto'
import { lstat, mkdir, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'

// An explicit child environment, not a copy of the desktop/terminal environment.
// Provider credentials, personal CODEX_*/OPENAI_*/OPENCODEX_* and NODE_OPTIONS
// must never become ambient configuration of an Aezy-owned process.
const CHILD_ENV = [
  'PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TZ',
  'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'USERPROFILE',
  'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP', 'TMPDIR',
  'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy',
  'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NODE_EXTRA_CA_CERTS', 'CODEX_CA_CERTIFICATE',
]

export function isolatedChildEnv(source = process.env) {
  const env = Object.fromEntries(CHILD_ENV.filter(key => source[key] !== undefined)
    .map(key => [key, source[key]]))
  const proxy = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || 'http://127.0.0.1:7890'
  for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']) env[key] ||= proxy
  // Local gateway/control traffic must not leave the machine through a proxy.
  env.NO_PROXY = env.no_proxy = 'localhost,127.0.0.1,127.0.0.2,::1'
  return env
}

// Public App Server terminal facts also cancel owned transport. An early
// interrupt can finish the Turn before Codex closes its idle HTTP response.
// This keeps no Turn state and exposes no HTTP control/cancel endpoint.
export function bindGatewayLifecycle(client, gateway) {
  const notification = message => {
    if (message.method === 'turn/completed' && ['interrupted', 'failed'].includes(message.params?.turn?.status)) {
      gateway.cancelThread(message.params.threadId)
    }
  }
  const status = value => { if (value.state !== 'connected' && value.state !== 'starting') gateway.cancelAll() }
  client.on('notification', notification)
  client.on('status', status)
  return () => {
    client.off('notification', notification)
    client.off('status', status)
    gateway.cancelAll()
  }
}

export async function privateDirectory(path) {
  if (!isAbsolute(path) || resolve(path) !== path) throw new Error('Runtime state directory must be absolute and normalized')
  const missing = []
  let ancestor = path
  while (true) {
    try {
      if ((await lstat(ancestor)).isSymbolicLink() || await realpath(ancestor) !== ancestor) {
        throw new Error('Runtime state directory must not traverse symlinks')
      }
      break
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      missing.push(ancestor)
      ancestor = dirname(ancestor)
    }
  }
  for (const directory of missing.reverse()) await mkdir(directory, { mode: 0o700 })
  const entry = await lstat(path)
  if (!entry.isDirectory() || (entry.mode & 0o077) !== 0 || entry.uid !== process.getuid()) {
    throw new Error('Runtime state directory must be private to its owner (0700)')
  }
  return path
}

export function tomlValue(value) {
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(', ')}]`
  if (value && typeof value === 'object') {
    return `{ ${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)} = ${tomlValue(item)}`).join(', ')} }`
  }
  throw new Error('Unsupported managed Codex configuration value')
}

export async function prepareCodexRuntime({ dshHome, gateway, environment = process.env }) {
  // Preserve existing DeepSeek bindings and state. GPT never shares its auth,
  // model catalog or sqlite files with the gateway (or with personal Codex).
  const home = await privateDirectory(join(dshHome, 'aezy', gateway ? 'codex-runtime' : 'codex-openai-runtime'))
  const provider = gateway ? 'aezy-opencodex' : 'openai'
  const config = {
    model_provider: provider,
    cli_auth_credentials_store: 'file',
    sqlite_home: home,
    log_dir: join(home, 'logs'),
    web_search: 'disabled',
    'features.realtime_conversation': false,
    'features.image_generation': false,
    'analytics.enabled': false,
  }
  const env = { ...isolatedChildEnv(environment), CODEX_HOME: home, CODEX_SQLITE_HOME: home }
  if (gateway) {
    config.model_catalog_json = gateway.catalogPath
    config.model = gateway.models[0].id
    config.model_providers = {
      [provider]: {
        name: 'Aezy built-in model gateway', base_url: gateway.endpoint, wire_api: 'responses',
        env_key: 'AEZY_CODEX_GATEWAY_KEY', requires_openai_auth: false, supports_websockets: false,
        request_max_retries: 0, stream_max_retries: 0,
      },
    }
    env.AEZY_CODEX_GATEWAY_KEY = gateway.dataKey
  } else {
    config.openai_base_url = 'https://api.openai.com/v1'
    config.chatgpt_base_url = 'https://chatgpt.com/backend-api'
  }
  const id = createHash('sha256').update(JSON.stringify({ home, provider, route: gateway?.routeId ?? 'native' })).digest('hex')
  const file = join(home, 'config.toml')
  try {
    if ((await lstat(file)).isSymbolicLink()) throw new Error('Managed Codex configuration must not be a symlink')
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  // Overrides are repeated on the CLI so repository config cannot redirect a
  // thread. No personal config, authentication or history is imported.
  await writeFileAtomic(file, `${Object.entries(config).map(([key, value]) => `${key} = ${tomlValue(value)}`).join('\n')}\n`, { mode: 0o600 })
  return {
    id, home, provider, config, env,
    appServerArgs: ['app-server', ...Object.entries(config).flatMap(([key, value]) => ['-c', `${key}=${tomlValue(value)}`])],
    view: { id, owner: 'aezy', engine: 'codex', version: '0.149.0', provider, home,
      gateway: gateway ? { owner: 'aezy', version: gateway.version, endpoint: gateway.endpoint, credentialSource: gateway.credentialSource } : null },
  }
}
