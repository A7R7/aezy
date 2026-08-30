import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { repoRoot } from './profile.mjs'

export const alphaMetadataPath = join(repoRoot, 'compatibility', 'dsh-alpha-runtime.json')
export const alphaMetadata = JSON.parse(readFileSync(alphaMetadataPath, 'utf8'))

function expandHome(value) {
  if (value === '~') return homedir()
  if (value.startsWith('~/')) return join(homedir(), value.slice(2))
  return value
}

export const alphaArtifactRoot = resolve(expandHome(
  process.env.AEZY_ALPHA_ARTIFACT_ROOT || alphaMetadata.artifacts.cacheRoot,
))
export const alphaDshHome = resolve(expandHome(
  process.env.AEZY_ALPHA_DSH_HOME || alphaMetadata.isolation.alphaDshHome,
))
export const alphaProfileName = alphaMetadata.isolation.alphaProfile
export const alphaProfileDir = join(alphaDshHome, 'profiles', alphaProfileName)
export const alphaSystemPresetRoot = join(alphaDshHome, '.system-agent-presets')
export const alphaNodeBin = resolve(expandHome(
  process.env.AEZY_ALPHA_NODE_BIN || '~/.cache/aezy/toolchains/node24/bin/node',
))
export const alphaCmakeRoot = resolve(expandHome(
  process.env.AEZY_ALPHA_CMAKE_ROOT || '~/.cache/aezy/toolchains/cmake/root',
))
export const alphaDshBin = join(alphaProfileDir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')

const alphaManifestPath = join(repoRoot, alphaMetadata.artifacts.sha256Manifest)
const aezyPackages = [
  ['@aezy/base', 'packages/aezy-base', false],
  ['@aezy/brand', 'packages/aezy-brand', true],
  ['@aezy/codex', 'packages/aezy-codex', true],
  ['@aezy/inspector', 'packages/aezy-inspector', true],
  ['@aezy/mode', 'packages/aezy-mode', true],
  ['@aezy/project', 'packages/aezy-project', true],
  ['@aezy/security', 'packages/aezy-security', true],
  ['@aezy/terminal', 'packages/aezy-terminal', true],
  ['@aezy/web', 'packages/aezy-web', false],
]
const alphaAllowedBuilds = {
  '@google/genai': false,
  esbuild: true,
  koffi: true,
  'node-addon-require-builtin': false,
  'node-pty': true,
  protobufjs: false,
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed with exit code ${String(result.status)}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'))
  }
  return result
}

export function parseSha256Manifest(text) {
  const entries = []
  let previous = ''
  for (const [index, line] of text.trimEnd().split('\n').entries()) {
    const match = /^([0-9a-f]{64})  ((?:dsh|vendor|landlock)\/[^/]+\.tgz)$/.exec(line)
    if (match === null) throw new Error(`Invalid alpha artifact manifest line ${String(index + 1)}`)
    const [, digest, relativePath] = match
    if (relativePath <= previous) throw new Error('Alpha artifact manifest paths must be unique and sorted')
    entries.push({ digest, relativePath })
    previous = relativePath
  }
  return entries
}

function tarballIdentity(path) {
  const result = run('tar', ['-xOf', path, 'package/package.json'])
  const manifest = JSON.parse(result.stdout)
  if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') {
    throw new Error(`${path} has no package name/version identity`)
  }
  return { name: manifest.name, version: manifest.version }
}

export function verifyAlphaArtifacts() {
  const manifestDigest = sha256(alphaManifestPath)
  if (manifestDigest !== alphaMetadata.artifacts.sha256ManifestDigest) {
    throw new Error(`Alpha SHA manifest digest mismatch: ${manifestDigest}`)
  }

  const entries = parseSha256Manifest(readFileSync(alphaManifestPath, 'utf8'))
  if (entries.length !== alphaMetadata.artifacts.totalTarballs) {
    throw new Error(`Expected ${String(alphaMetadata.artifacts.totalTarballs)} alpha tarballs, found ${String(entries.length)}`)
  }

  const packages = new Map()
  for (const entry of entries) {
    const path = join(alphaArtifactRoot, entry.relativePath)
    if (!existsSync(path)) throw new Error(`Missing alpha artifact: ${path}`)
    const digest = sha256(path)
    if (digest !== entry.digest) throw new Error(`Alpha artifact digest mismatch: ${entry.relativePath}`)
    const identity = tarballIdentity(path)
    if (packages.has(identity.name)) throw new Error(`Duplicate alpha package: ${identity.name}`)
    packages.set(identity.name, { ...identity, path, digest, relativePath: entry.relativePath })
  }

  const cli = packages.get('@deepseek-ai/dsh')
  if (cli?.version !== alphaMetadata.source.tag.replace('dsh-v', '')) {
    throw new Error(`Alpha CLI tarball has unexpected version ${cli?.version ?? 'missing'}`)
  }
  return { entries, packages, manifestDigest }
}

function buildAezyClients() {
  for (const [name, , build] of aezyPackages) {
    if (build) run('pnpm', ['--filter', name, 'run', 'build'], { stdio: 'inherit' })
  }
}

export function packAezyAlphaArtifacts() {
  buildAezyClients()
  mkdirSync(alphaArtifactRoot, { recursive: true })
  const temporary = mkdtempSync(join(alphaArtifactRoot, '.aezy-pack-'))
  try {
    for (const [, directory] of aezyPackages) {
      run('pnpm', [
        '--dir', join(repoRoot, directory),
        'pack', '--pack-destination', temporary,
      ], { stdio: 'inherit' })
    }
    const destination = join(alphaArtifactRoot, 'aezy')
    rmSync(destination, { recursive: true, force: true })
    renameSync(temporary, destination)
    return readPackedDirectory(destination)
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true })
    throw error
  }
}

function readPackedDirectory(directory) {
  const packages = new Map()
  for (const [expectedName] of aezyPackages) {
    const filename = expectedName.replace('@', '').replace('/', '-') + '-0.0.0.tgz'
    const path = join(directory, filename)
    if (!existsSync(path)) throw new Error(`Missing packed Aezy plugin: ${path}`)
    const identity = tarballIdentity(path)
    if (identity.name !== expectedName) throw new Error(`Expected ${expectedName}, packed ${identity.name}`)
    packages.set(identity.name, { ...identity, path, digest: sha256(path) })
  }
  return packages
}

function prepareAlphaHome() {
  mkdirSync(dirname(alphaDshHome), { recursive: true, mode: 0o700 })
  mkdirSync(alphaDshHome, { recursive: true, mode: 0o700 })
  mkdirSync(alphaProfileDir, { recursive: true, mode: 0o700 })
  if (process.platform !== 'win32') {
    chmodSync(dirname(alphaDshHome), 0o700)
    chmodSync(alphaDshHome, 0o700)
    chmodSync(alphaProfileDir, 0o700)
  }
}

export function alphaRuntimeEnv(extra = {}) {
  const environment = { ...process.env }
  delete environment.NODE_OPTIONS
  delete environment.NODE_PATH
  const nodeDirectory = dirname(alphaNodeBin)
  const cmakeBin = join(alphaCmakeRoot, 'usr', 'bin')
  const cmakeLib = join(alphaCmakeRoot, 'usr', 'lib', 'x86_64-linux-gnu')
  return {
    ...environment,
    PATH: [nodeDirectory, cmakeBin, environment.PATH].filter(Boolean).join(':'),
    LD_LIBRARY_PATH: [cmakeLib, environment.LD_LIBRARY_PATH].filter(Boolean).join(':'),
    DSH_HOME: alphaDshHome,
    DSH_TELEMETRY_DISABLED: '1',
    TMPDIR: '/tmp',
    TMP: '/tmp',
    TEMP: '/tmp',
    npm_config_cache: join(homedir(), '.cache', 'aezy', 'npm-alpha'),
    AEZY_SYSTEM_PRESET_ROOT: alphaSystemPresetRoot,
    ...extra,
    // Node 24 fetch ignores HTTP(S)_PROXY unless this is explicitly enabled.
    // Keep every alpha DSH process on the repository-mandated proxy path,
    // including provider catalog discovery, OAuth refresh and model Turns.
    NODE_USE_ENV_PROXY: '1',
  }
}

export function profileManifest(dshPackages, aezyPacked) {
  const all = [...dshPackages.values(), ...aezyPacked.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
  const dependencies = Object.fromEntries(all.map(entry => [entry.name, pathToFileURL(entry.path).href]))
  const aezyDigests = Object.fromEntries([...aezyPacked.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(entry => [entry.name, entry.digest]))
  const signature = createHash('sha256').update(JSON.stringify({
    dsh: alphaMetadata.artifacts.sha256ManifestDigest,
    aezy: aezyDigests,
    installer: {
      name: 'pnpm',
      optionalDependencies: true,
    },
    allowedBuilds: alphaAllowedBuilds,
  })).digest('hex')
  return {
    name: 'aezy-alpha-runtime-profile',
    version: '0.0.0',
    private: true,
    type: 'module',
    dependencies,
    dsh: {
      profile: {
        bundles: [
          '@deepseek-ai/dsh-base',
          '@aezy/base',
          '@deepseek-ai/dsh-web-app',
          '@aezy/web',
          '@aezy/mode',
        ],
      },
    },
    aezyAlpha: {
      sourceCommit: alphaMetadata.source.commit,
      artifactManifestDigest: alphaMetadata.artifacts.sha256ManifestDigest,
      aezyDigests,
      signature,
    },
  }
}

export function workspaceSettings(dependencies) {
  const allowBuilds = { ...alphaAllowedBuilds }
  const subprocessLocal = dependencies['@deepseek-ai/dsh-subprocess-local']
  if (subprocessLocal !== undefined) {
    const relativeTarball = relative(alphaProfileDir, fileURLToPath(subprocessLocal)).replaceAll('\\', '/')
    allowBuilds[`@deepseek-ai/dsh-subprocess-local@file:${relativeTarball}`] = true
  }
  return {
    packages: ['.'],
    overrides: dependencies,
    allowBuilds,
  }
}

function syncSystemPresets() {
  const staging = mkdtempSync(join(alphaDshHome, '.system-presets-'))
  try {
    cpSync(
      join(alphaProfileDir, 'node_modules', '@aezy', 'base', 'presets', 'aezy'),
      join(staging, 'aezy'),
      { recursive: true },
    )
    cpSync(
      join(alphaProfileDir, 'node_modules', '@aezy', 'mode', 'presets', 'codex-app-server'),
      join(staging, 'codex-app-server'),
      { recursive: true },
    )
    const shippedStandard = readFileSync(join(
      alphaProfileDir,
      'node_modules',
      '@deepseek-ai',
      'dsh-agent-presets',
      'presets',
      'standard',
      'agent.cordis.yml',
    ), 'utf8')
    const codexOverlay = readFileSync(join(staging, 'codex-app-server', 'overlay.cordis.yml'), 'utf8')
    if (!shippedStandard.includes("name: '@deepseek-ai/dsh-plan-mode'")
      || !shippedStandard.includes("name: '@deepseek-ai/dsh-tool-subagent'")) {
      throw new Error('Installed DSH standard preset is missing its authoritative plan/subagent surface')
    }
    writeFileSync(
      join(staging, 'codex-app-server', 'agent.cordis.yml'),
      composeCodexPreset(shippedStandard, codexOverlay),
    )
    rmSync(alphaSystemPresetRoot, { recursive: true, force: true })
    renameSync(staging, alphaSystemPresetRoot)
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }
  return alphaSystemPresetRoot
}

/**
 * Mount the fence after DSH's authoritative preset rows. Cordis waterfalls
 * enter later listeners first, so the fence's `await next()` observes the
 * Session controller's final model selection instead of the Agent seed route.
 */
export function composeCodexPreset(shippedStandard, codexOverlay) {
  return `${shippedStandard.trimEnd()}\n\n${codexOverlay.trim()}\n`
}

export function syncAlphaProfile() {
  if (!existsSync(alphaNodeBin)) throw new Error(`Alpha Node runtime is missing at ${alphaNodeBin}`)
  prepareAlphaHome()
  const { packages: dshPackages } = verifyAlphaArtifacts()
  const aezyPacked = packAezyAlphaArtifacts()
  const next = profileManifest(dshPackages, aezyPacked)
  const manifestPath = join(alphaProfileDir, 'package.json')
  const installMarkerPath = join(alphaProfileDir, '.aezy-alpha-install.json')
  const marker = existsSync(installMarkerPath)
    ? JSON.parse(readFileSync(installMarkerPath, 'utf8'))
    : null
  const install = marker?.signature !== next.aezyAlpha.signature || !existsSync(alphaDshBin)
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`)
  writeFileSync(
    join(alphaProfileDir, 'pnpm-workspace.yaml'),
    `${JSON.stringify(workspaceSettings(next.dependencies), null, 2)}\n`,
  )

  if (install) {
    rmSync(installMarkerPath, { force: true })
    rmSync(join(alphaProfileDir, 'node_modules'), { recursive: true, force: true })
    run('pnpm', [
      'install',
      '--no-frozen-lockfile',
      '--prefer-offline',
      '--store-dir', join(homedir(), '.cache', 'aezy', 'pnpm-alpha-store'),
    ], {
      cwd: alphaProfileDir,
      env: alphaRuntimeEnv(),
      stdio: 'inherit',
    })
  }

  const version = run(alphaNodeBin, [alphaDshBin, '--version'], { env: alphaRuntimeEnv() }).stdout.trim()
  if (version !== alphaMetadata.source.tag.replace('dsh-v', '')) {
    throw new Error(`Expected alpha DSH ${alphaMetadata.source.tag}, installed CLI reports ${version}`)
  }
  writeFileSync(installMarkerPath, `${JSON.stringify({
    signature: next.aezyAlpha.signature,
    version,
  }, null, 2)}\n`)

  const presetTarget = syncSystemPresets()

  return { install, version, manifestPath, presetTarget, signature: next.aezyAlpha.signature }
}

export function runAlphaDsh(args, options = {}) {
  if (!existsSync(alphaDshBin)) throw new Error(`Alpha DSH is not installed at ${alphaDshBin}; run pnpm alpha:profile:sync`)
  const child = spawn(alphaNodeBin, [alphaDshBin, ...args], {
    cwd: repoRoot,
    env: alphaRuntimeEnv(options.env),
    stdio: options.stdio || 'inherit',
  })
  return child
}
