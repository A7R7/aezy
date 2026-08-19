import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const projectPlugin = join(repoRoot, 'packages', 'aezy-project')

let install = true
if (existsSync(profileManifestPath)) {
  const current = JSON.parse(readFileSync(profileManifestPath, 'utf8'))
  const dependencies = current.dependencies || {}
  install = !('@aezy/base' in dependencies)
    || !('@aezy/web' in dependencies)
    || !('@aezy/project' in dependencies)
    || !existsSync(join(profileDir, 'node_modules', '@aezy', 'base', 'package.json'))
    || !existsSync(join(profileDir, 'node_modules', '@aezy', 'web', 'package.json'))
    || !existsSync(join(profileDir, 'node_modules', '@aezy', 'project', 'package.json'))
}

if (install) {
  mkdirSync(dirname(profileManifestPath), { recursive: true })
  const result = runDsh([
    'plugin', '--profile', profileName, 'add',
    baseBundle,
    webBundle,
    projectPlugin,
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
