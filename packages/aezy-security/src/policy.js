import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'

export const NETWORK_MODES = ['deny', 'ask', 'allow']
export const RULE_EFFECTS = ['deny', 'ask', 'allow']
export const RULE_SCOPES = ['global', 'repository']

const DIRECT_NETWORK_TOOL = /(?:^|[_.:/-])(web|http|https|fetch|search|browser|mcp|github|gitlab)(?:$|[_.:/-])/iu
const NETWORK_EXECUTABLE = /^(?:curl|wget|ssh|scp|sftp|ftp|telnet|ping|dig|nslookup|nc|ncat|netcat|gh|aws|az|gcloud|kubectl|helm)$/iu
const NETWORK_PACKAGE_ACTION = /^(?:add|install|update|upgrade|publish|deploy|login|logout|whoami|view|info|search|audit)$/iu
const SAFE_EXECUTABLE = /^(?:pwd|ls|dir|cat|head|tail|wc|stat|test|true|false|echo|printf|rg|grep|sed|awk|find|cmp|diff)$/u

function canonicalPath(path) {
  const absolute = resolve(path)
  try {
    return realpathSync(absolute)
  } catch {
    return absolute
  }
}

/** Parse one shell command only when it contains no composition or expansion. */
export function simpleShellTokens(command) {
  if (typeof command !== 'string' || command.trim() === '') return null
  const tokens = []
  let token = ''
  let quote = null
  let escaped = false
  const push = () => {
    if (token !== '') tokens.push(token)
    token = ''
  }
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index]
    if (escaped) {
      token += char
      escaped = false
      continue
    }
    if (char === '\\' && quote !== "'") {
      escaped = true
      continue
    }
    if (quote !== null) {
      if (char === quote) quote = null
      else token += char
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (/\s/u.test(char)) {
      push()
      continue
    }
    if (';&|<>`\n\r'.includes(char) || char === '$') return null
    token += char
  }
  if (escaped || quote !== null) return null
  push()
  return tokens.length === 0 ? null : tokens
}

function obviousShellNetwork(command, tokens) {
  const executable = tokens?.[0]?.split(/[\\/]/u).at(-1) ?? ''
  if (NETWORK_EXECUTABLE.test(executable)) return true
  if (/^(?:invoke-webrequest|invoke-restmethod|test-netconnection)$/iu.test(executable)) return true
  if (/^(?:npm|pnpm|yarn|bun|pip|pip3|cargo|go|docker|podman)$/iu.test(executable)
    && NETWORK_PACKAGE_ACTION.test(tokens?.[1] ?? '')) return true
  if (executable === 'git' && /^(?:clone|fetch|pull|push|ls-remote|submodule)$/u.test(tokens?.[1] ?? '')) return true
  return /(?:https?|ssh|git):\/\//iu.test(command)
}

function knownLocalShell(tokens) {
  const executable = tokens[0]?.split(/[\\/]/u).at(-1) ?? ''
  if (SAFE_EXECUTABLE.test(executable)) {
    if (executable === 'rg' && tokens.some(token => token === '--pre' || token.startsWith('--pre='))) return false
    return true
  }
  if (executable === 'git') {
    return /^(?:status|diff|log|show|rev-parse|describe|remote|tag)$/u.test(tokens[1] ?? '')
      || (tokens[1] === 'branch' && !tokens.some(token => /^-[dDmM]$/u.test(token)))
  }
  if (/^(?:node|npm|pnpm|yarn|bun|python|python3|pip|pip3|cargo|go|rustc|tsc)$/u.test(executable)) {
    return tokens.length === 2 && /^(?:--version|-v|version)$/u.test(tokens[1] ?? '')
  }
  return false
}

/** Classify network exposure without claiming to be a shell parser. */
export function classifyAction(toolName, args = {}, cwd = '.') {
  const repositoryRoot = canonicalPath(cwd)
  const command = (toolName === 'bash' || toolName === 'pwsh') && typeof args.command === 'string'
    ? args.command.trim()
    : null
  const commandTokens = command === null ? null : simpleShellTokens(command)
  let network = 'none'
  if (DIRECT_NETWORK_TOOL.test(toolName)) network = 'required'
  else if (command !== null && obviousShellNetwork(command, commandTokens)) network = 'required'
  else if (command !== null && (commandTokens === null || !knownLocalShell(commandTokens))) network = 'possible'
  return {
    tool: toolName,
    command,
    commandTokens,
    repositoryRoot,
    network,
  }
}

function prefixMatches(rule, action) {
  if (rule.commandPrefix === undefined) return true
  if (action.command === null) return false
  if (rule.effect !== 'allow') return action.command.startsWith(rule.commandPrefix)
  const prefix = simpleShellTokens(rule.commandPrefix)
  if (prefix === null || action.commandTokens === null || prefix.length > action.commandTokens.length) return false
  return prefix.every((token, index) => action.commandTokens[index] === token)
}

function ruleMatches(rule, action) {
  if (rule.tool !== '*' && rule.tool !== action.tool) return false
  if (rule.scope === 'repository' && rule.repositoryRoot !== action.repositoryRoot) return false
  return prefixMatches(rule, action)
}

export function effectiveNetworkMode(state, repositoryRoot) {
  return state.network.repositories[repositoryRoot] ?? state.network.default
}

/** Deny outranks ask, and Network deny cannot be bypassed by an allow rule. */
export function evaluatePolicy(state, action) {
  const matches = state.rules.filter(rule => ruleMatches(rule, action))
  const denied = matches.find(rule => rule.effect === 'deny')
  if (denied !== undefined) {
    return {
      decision: 'deny', source: 'rule', ruleId: denied.id,
      explanation: `Denied by ${denied.scope} rule ${denied.id}.`,
    }
  }
  const networkMode = effectiveNetworkMode(state, action.repositoryRoot)
  if (networkMode === 'deny' && action.network !== 'none') {
    return {
      decision: 'deny', source: 'network',
      explanation: `Network Policy is deny; ${action.tool} is classified as ${action.network} network access.`,
    }
  }
  const asked = matches.find(rule => rule.effect === 'ask')
  if (asked !== undefined) {
    return {
      decision: 'ask', source: 'rule', ruleId: asked.id,
      explanation: `Approval required by ${asked.scope} rule ${asked.id}.`,
    }
  }
  const allowed = matches.find(rule => rule.effect === 'allow')
  if (networkMode === 'ask' && action.network !== 'none') {
    if (allowed !== undefined) {
      return {
        decision: 'allow', source: 'rule', ruleId: allowed.id,
        explanation: `Allowed by ${allowed.scope} rule ${allowed.id} under Network Policy ask.`,
      }
    }
    return {
      decision: 'ask', source: 'network',
      explanation: `Network Policy is ask; ${action.tool} is classified as ${action.network} network access.`,
    }
  }
  if (allowed !== undefined) {
    return {
      decision: 'allow', source: 'rule', ruleId: allowed.id,
      explanation: `Allowed by ${allowed.scope} rule ${allowed.id}.`,
    }
  }
  return { decision: 'allow', source: 'default', explanation: 'No Aezy security rule restricts this local action.' }
}

export function normalizeRule(input, cwd = '.') {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new Error('rule must be an object')
  const effect = input.effect
  const scope = input.scope
  const tool = typeof input.tool === 'string' ? input.tool.trim() : ''
  if (!RULE_EFFECTS.includes(effect)) throw new Error('rule effect must be deny, ask, or allow')
  if (!RULE_SCOPES.includes(scope)) throw new Error('rule scope must be global or repository')
  if (tool !== '*' && !/^[a-zA-Z0-9_.:/-]{1,128}$/u.test(tool)) throw new Error('rule tool is invalid')
  let commandPrefix
  if (input.commandPrefix !== undefined && input.commandPrefix !== '') {
    if (typeof input.commandPrefix !== 'string' || input.commandPrefix.length > 512 || /[\0\r\n]/u.test(input.commandPrefix)) {
      throw new Error('commandPrefix must be a single-line string of at most 512 characters')
    }
    commandPrefix = input.commandPrefix.trim()
    if (commandPrefix === '') throw new Error('commandPrefix cannot be blank')
    if (effect === 'allow' && simpleShellTokens(commandPrefix) === null) {
      throw new Error('allow commandPrefix must be one simple command without shell composition or expansion')
    }
    if (tool !== 'bash' && tool !== 'pwsh' && tool !== '*') {
      throw new Error('commandPrefix is supported only for bash, pwsh, or wildcard tool rules')
    }
  }
  return {
    effect,
    scope,
    tool,
    ...commandPrefix === undefined ? {} : { commandPrefix },
    ...scope === 'repository' ? { repositoryRoot: canonicalPath(cwd) } : {},
  }
}

export function canonicalRepositoryRoot(cwd) {
  if (typeof cwd !== 'string' || cwd.trim() === '' || cwd.includes('\0')) throw new Error('cwd is invalid')
  return canonicalPath(cwd)
}
