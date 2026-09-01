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
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { repoRoot } from './profile.mjs'
import {
  CODEX_INSPIRED_LOOP,
  CODEX_INSPIRED_PRESET_ID,
} from '../../packages/aezy-workflow/src/system.js'

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
  process.env.AEZY_ALPHA_DSH_HOME || alphaMetadata.isolation.developmentDshHome,
))
export const alphaProfileName = process.env.AEZY_ALPHA_PROFILE || alphaMetadata.isolation.developmentProfile
export const alphaProfileDir = join(alphaDshHome, 'profiles', alphaProfileName)
export const alphaSystemPresetRoot = join(alphaDshHome, '.system-agent-presets')
export const alphaNodeBin = resolve(expandHome(
  process.env.AEZY_ALPHA_NODE_BIN || '~/.cache/aezy/toolchains/node24/bin/node',
))
export const alphaCmakeRoot = resolve(expandHome(
  process.env.AEZY_ALPHA_CMAKE_ROOT || '~/.cache/aezy/toolchains/cmake/root',
))
export const alphaPnpmStore = resolve(expandHome(
  process.env.AEZY_ALPHA_PNPM_STORE || '~/.cache/aezy/pnpm-alpha3-store',
))
export const alphaNpmCache = resolve(expandHome(
  process.env.AEZY_ALPHA_NPM_CACHE || '~/.cache/aezy/npm-alpha3',
))
export const alphaDshBin = join(alphaProfileDir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')

const alphaFamilyManifestPath = join(repoRoot, alphaMetadata.publication.familyManifest)
const alphaVersion = alphaMetadata.source.tag.replace('dsh-v', '')
const aezyPackages = [
  ['@aezy/base', 'packages/aezy-base', false],
  ['@aezy/brand', 'packages/aezy-brand', true],
  ['@aezy/codex', 'packages/aezy-codex', true],
  ['@aezy/inspector', 'packages/aezy-inspector', true],
  ['@aezy/layout', 'packages/aezy-layout', true],
  ['@aezy/mode', 'packages/aezy-mode', true],
  ['@aezy/project', 'packages/aezy-project', true],
  ['@aezy/security', 'packages/aezy-security', true],
  ['@aezy/terminal', 'packages/aezy-terminal', true],
  ['@aezy/workflow', 'packages/aezy-workflow', false],
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
const pinnedRuntimePeers = {
  react: '18.3.1',
  'react-dom': '18.3.1',
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

function tarballIdentity(path) {
  const result = run('tar', ['-xOf', path, 'package/package.json'])
  const manifest = JSON.parse(result.stdout)
  if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') {
    throw new Error(`${path} has no package name/version identity`)
  }
  return { name: manifest.name, version: manifest.version }
}

export function validateOfficialFamilyManifest(manifest, manifestDigest) {
  if (manifestDigest !== alphaMetadata.publication.familyManifestDigest) {
    throw new Error(`Alpha npm family manifest digest mismatch: ${manifestDigest}`)
  }
  if (manifest.source?.tag !== alphaMetadata.source.tag
    || manifest.source?.commit !== alphaMetadata.source.commit
    || manifest.source?.tree !== alphaMetadata.source.tree
    || manifest.registry !== alphaMetadata.publication.registry
    || manifest.version !== alphaVersion) {
    throw new Error('Alpha npm family manifest does not match the pinned official release')
  }
  if (!Array.isArray(manifest.packages)
    || manifest.packageCount !== alphaMetadata.publication.familyPackages
    || manifest.packages.length !== manifest.packageCount) {
    throw new Error('Alpha npm family manifest has an unexpected package count')
  }
  let previous = ''
  const packages = new Map()
  for (const entry of manifest.packages) {
    if (typeof entry.name !== 'string' || !entry.name.startsWith('@deepseek-ai/dsh')
      || typeof entry.integrity !== 'string' || !entry.integrity.startsWith('sha512-')
      || entry.name <= previous) {
      throw new Error('Alpha npm family packages must be unique, sorted DSH names with SHA-512 integrity')
    }
    packages.set(entry.name, { ...entry, version: alphaVersion })
    previous = entry.name
  }
  if (packages.get('@deepseek-ai/dsh')?.integrity !== alphaMetadata.publication.rootIntegrity) {
    throw new Error('Alpha npm family root integrity does not match the release pin')
  }
  return packages
}

export function verifyOfficialFamilyManifest() {
  const manifestDigest = sha256(alphaFamilyManifestPath)
  const manifest = JSON.parse(readFileSync(alphaFamilyManifestPath, 'utf8'))
  return {
    manifest,
    manifestDigest,
    packages: validateOfficialFamilyManifest(manifest, manifestDigest),
  }
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
  const proxy = environment.HTTPS_PROXY
    || environment.https_proxy
    || environment.HTTP_PROXY
    || environment.http_proxy
    || 'http://127.0.0.1:7890'
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
    npm_config_cache: alphaNpmCache,
    HTTP_PROXY: environment.HTTP_PROXY || proxy,
    HTTPS_PROXY: environment.HTTPS_PROXY || proxy,
    ALL_PROXY: environment.ALL_PROXY || proxy,
    http_proxy: environment.http_proxy || proxy,
    https_proxy: environment.https_proxy || proxy,
    all_proxy: environment.all_proxy || proxy,
    AEZY_SYSTEM_PRESET_ROOT: alphaSystemPresetRoot,
    ...extra,
    // Node 24 fetch ignores HTTP(S)_PROXY unless this is explicitly enabled.
    // Keep every alpha DSH process on the repository-mandated proxy path,
    // including provider catalog discovery, OAuth refresh and model Turns.
    NODE_USE_ENV_PROXY: '1',
  }
}

export function profileManifest(dshPackages, aezyPacked) {
  const dshDependencies = Object.fromEntries([...dshPackages.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(entry => [entry.name, entry.version]))
  const aezyDependencies = Object.fromEntries([...aezyPacked.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(entry => [entry.name, pathToFileURL(entry.path).href]))
  const dependencies = {
    ...dshDependencies,
    ...aezyDependencies,
    ...pinnedRuntimePeers,
  }
  const aezyDigests = Object.fromEntries([...aezyPacked.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(entry => [entry.name, entry.digest]))
  const signature = createHash('sha256').update(JSON.stringify({
    dsh: alphaMetadata.publication.familyManifestDigest,
    aezy: aezyDigests,
    peers: pinnedRuntimePeers,
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
      npmFamilyManifestDigest: alphaMetadata.publication.familyManifestDigest,
      aezyDigests,
      signature,
    },
  }
}

export function workspaceSettings(dshPackages, aezyPacked = new Map()) {
  const exactDsh = Object.fromEntries([...dshPackages.keys()].map(name => [name, alphaVersion]))
  const localAezy = Object.fromEntries([...aezyPacked.values()].map(entry => [
    entry.name,
    pathToFileURL(entry.path).href,
  ]))
  return {
    packages: ['.'],
    overrides: {
      ...exactDsh,
      ...localAezy,
      ...pinnedRuntimePeers,
    },
    allowBuilds: {
      ...alphaAllowedBuilds,
      [`@deepseek-ai/dsh-subprocess-local@${alphaVersion}`]: true,
    },
    minimumReleaseAgeExclude: [...dshPackages.keys()].map(name => `${name}@${alphaVersion}`),
  }
}

export function codexInspiredDogfoodEnabled(environment = process.env) {
  return environment.AEZY_CODEX_INSPIRED_DOGFOOD === '1'
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
    if (codexInspiredDogfoodEnabled()) {
      const source = join(
        alphaProfileDir,
        'node_modules',
        '@aezy',
        'workflow',
        'presets',
        'codex-inspired',
      )
      const target = join(staging, CODEX_INSPIRED_PRESET_ID)
      cpSync(source, target, { recursive: true })
      const inspiredOverlay = readFileSync(join(target, 'overlay.cordis.yml'), 'utf8')
      if (!inspiredOverlay.includes(`digest: ${CODEX_INSPIRED_LOOP.digest}`)
        || !inspiredOverlay.includes(`presetId: ${CODEX_INSPIRED_PRESET_ID}`)) {
        throw new Error('Codex-inspired preset template does not bind the exact system definition')
      }
      writeFileSync(
        join(target, 'agent.cordis.yml'),
        composeCodexPreset(shippedStandard, inspiredOverlay),
      )
    }
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

export function verifyInstalledRegistryFamily(dshPackages, profileDirectory = alphaProfileDir) {
  const lockPath = join(profileDirectory, 'pnpm-lock.yaml')
  if (!existsSync(lockPath)) throw new Error(`Alpha profile lockfile is missing: ${lockPath}`)
  const lock = readFileSync(lockPath, 'utf8')
  if (/(@deepseek-ai\/dsh[^\s]*:|@deepseek-ai%2Fdsh).*?(?:file:|\.tgz)/i.test(lock)) {
    throw new Error('Alpha profile lockfile contains a local DSH package source')
  }
  for (const entry of dshPackages.values()) {
    const installedManifest = join(profileDirectory, 'node_modules', ...entry.name.split('/'), 'package.json')
    if (!existsSync(installedManifest)) throw new Error(`Missing installed alpha package: ${entry.name}`)
    const installed = JSON.parse(readFileSync(installedManifest, 'utf8'))
    if (installed.name !== entry.name || installed.version !== entry.version) {
      throw new Error(`Mixed alpha family version: ${entry.name}@${installed.version ?? 'missing'}`)
    }
    if (!lock.includes(entry.integrity)) {
      throw new Error(`Alpha profile lockfile is missing pinned integrity for ${entry.name}`)
    }
  }
  return { packageCount: dshPackages.size, version: alphaVersion }
}

export function syncAlphaProfile() {
  if (!existsSync(alphaNodeBin)) throw new Error(`Alpha Node runtime is missing at ${alphaNodeBin}`)
  prepareAlphaHome()
  const { packages: dshPackages } = verifyOfficialFamilyManifest()
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
    `${JSON.stringify(workspaceSettings(dshPackages, aezyPacked), null, 2)}\n`,
  )

  if (install) {
    rmSync(installMarkerPath, { force: true })
    rmSync(join(alphaProfileDir, 'node_modules'), { recursive: true, force: true })
    run('pnpm', [
      'install',
      '--no-frozen-lockfile',
      '--prefer-offline',
      '--store-dir', alphaPnpmStore,
    ], {
      cwd: alphaProfileDir,
      env: alphaRuntimeEnv(),
      stdio: 'inherit',
    })
  }

  const family = verifyInstalledRegistryFamily(dshPackages)
  const version = run(alphaNodeBin, [alphaDshBin, '--version'], { env: alphaRuntimeEnv() }).stdout.trim()
  if (version !== alphaVersion) {
    throw new Error(`Expected alpha DSH ${alphaMetadata.source.tag}, installed CLI reports ${version}`)
  }
  writeFileSync(installMarkerPath, `${JSON.stringify({
    signature: next.aezyAlpha.signature,
    version,
    family,
    npmFamilyManifestDigest: alphaMetadata.publication.familyManifestDigest,
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
