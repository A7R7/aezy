import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  compatibilityPath,
  dshBin,
  dshEnv,
  dshHome,
  legacyDshHome,
  prepareDshHome,
  profileName,
  repoRoot,
  runDsh,
} from './lib/profile.mjs'

const { migratedLegacyHome } = prepareDshHome()
const compatibility = JSON.parse(readFileSync(compatibilityPath, 'utf8'))
const version = runDsh(['--version']).stdout.trim()
if (version !== compatibility.packageVersion) {
  throw new Error(`Expected DSH ${compatibility.packageVersion}, found ${version} at ${dshBin}`)
}

mkdirSync(dshHome, { recursive: true })
const profileDir = join(dshHome, 'profiles', profileName)
const profileManifestPath = join(profileDir, 'package.json')
const baseBundle = join(repoRoot, 'packages', 'aezy-base')
const webBundle = join(repoRoot, 'packages', 'aezy-web')
const brandPlugin = join(repoRoot, 'packages', 'aezy-brand')
const securityPlugin = join(repoRoot, 'packages', 'aezy-security')
const projectPlugin = join(repoRoot, 'packages', 'aezy-project')
const terminalPlugin = join(repoRoot, 'packages', 'aezy-terminal')
const activityPlugin = join(repoRoot, 'packages', 'aezy-activity')
const localPlugins = [
  ['@aezy/base', baseBundle],
  ['@aezy/web', webBundle],
  ['@aezy/brand', brandPlugin],
  ['@aezy/security', securityPlugin],
  ['@aezy/project', projectPlugin],
  ['@aezy/terminal', terminalPlugin],
  ['@aezy/activity', activityPlugin],
]

let install = true
if (existsSync(profileManifestPath)) {
  const current = JSON.parse(readFileSync(profileManifestPath, 'utf8'))
  const dependencies = current.dependencies || {}
  install = localPlugins.some(([name, path]) => dependencies[name] !== `link:${path}`)
    || localPlugins.some(([name]) => !existsSync(join(
      profileDir,
      'node_modules',
      ...name.split('/'),
      'package.json',
    )))

  // A profile may outlive the checkout path that installed it. Update stale
  // link specs before invoking DSH so pnpm never follows the previous store or
  // silently keeps non-existent local plugin targets after a repository move.
  if (install) {
    current.dependencies = dependencies
    for (const [name, path] of localPlugins) dependencies[name] = `link:${path}`
    writeFileSync(profileManifestPath, `${JSON.stringify(current, null, 2)}\n`)
  }
}

if (install) {
  mkdirSync(dirname(profileManifestPath), { recursive: true })
  // pnpm binds node_modules to the store path recorded at install time. A
  // checkout move changes Aezy's repository-local store, so an otherwise
  // reusable profile directory must discard only this generated dependency
  // tree before DSH asks pnpm to install the current local plugins.
  rmSync(join(profileDir, 'node_modules'), { recursive: true, force: true })
  const result = runDsh([
    'plugin', '--profile', profileName, 'add',
    baseBundle,
    webBundle,
    brandPlugin,
    securityPlugin,
    projectPlugin,
    terminalPlugin,
    activityPlugin,
  ], { stdio: 'inherit', env: dshEnv() })
  void result
}

const manifest = JSON.parse(readFileSync(profileManifestPath, 'utf8'))
manifest.dsh = manifest.dsh || {}
manifest.dsh.profile = manifest.dsh.profile || {}
manifest.dsh.profile.bundles = [...compatibility.bundles]
writeFileSync(profileManifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

const presetSource = join(baseBundle, 'presets', 'aezy')
const presetTarget = join(dshHome, '.agent-presets', 'aezy')
mkdirSync(presetTarget, { recursive: true })
for (const file of ['agent.cordis.yml', 'preset.yml']) {
  cpSync(join(presetSource, file), join(presetTarget, file))
}

process.stdout.write([
  `Aezy profile synced with DSH ${version}.`,
  ...(migratedLegacyHome ? [`Migrated legacy DSH state from ${legacyDshHome}.`] : []),
  `DSH_HOME=${dshHome}`,
  `profile=${profileManifestPath}`,
  `preset=${presetTarget}`,
  '',
].join('\n'))
