import { spawn, spawnSync } from 'node:child_process'
import { chmodSync, cpSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
export const compatibilityPath = join(repoRoot, 'compatibility', 'dsh.json')
export const legacyDshHome = join(repoRoot, '.local', 'dsh')
export const defaultDshHome = join(homedir(), '.aezy', 'dsh')
export const dshHome = resolve(process.env.DSH_HOME || defaultDshHome)
export const profileName = 'aezy'

const binName = process.platform === 'win32' ? 'dsh.cmd' : 'dsh'
export const dshBin = join(repoRoot, 'node_modules', '.bin', binName)

export function assertDshInstalled() {
  if (!existsSync(dshBin)) {
    throw new Error(`DSH is not installed at ${dshBin}; run pnpm install first`)
  }
}

export function prepareDshHome() {
  const useDefaultHome = !process.env.DSH_HOME
  const migrateLegacyHome = useDefaultHome
    && dshHome !== legacyDshHome
    && !existsSync(dshHome)
    && existsSync(legacyDshHome)

  if (migrateLegacyHome) {
    mkdirSync(dirname(dshHome), { recursive: true, mode: 0o700 })
    mkdirSync(dshHome, { recursive: true, mode: 0o700 })
    cpSync(legacyDshHome, dshHome, {
      recursive: true,
      // Profile dependency links are relative to their original directory and
      // must be recreated by `dsh plugin`, not copied across home roots.
      filter: source => basename(source) !== 'node_modules',
    })
  } else {
    mkdirSync(dshHome, { recursive: true, mode: 0o700 })
  }

  if (process.platform !== 'win32') {
    if (useDefaultHome) chmodSync(dirname(dshHome), 0o700)
    chmodSync(dshHome, 0o700)

    const credentialsPath = join(dshHome, '.credentials.yaml')
    if (existsSync(credentialsPath)) chmodSync(credentialsPath, 0o600)

    const permissions = statSync(dshHome).mode & 0o077
    if (permissions !== 0) {
      throw new Error([
        `Aezy cannot secure DSH_HOME at ${dshHome}.`,
        'Choose a native Linux filesystem path with DSH_HOME; Windows-mounted paths such as /mnt/c and /mnt/d may ignore chmod.',
      ].join(' '))
    }
  }

  return { migratedLegacyHome: migrateLegacyHome }
}

export function dshEnv(extra = {}) {
  return {
    ...process.env,
    DSH_HOME: dshHome,
    DSH_TELEMETRY_DISABLED: '1',
    TMPDIR: '/tmp',
    TMP: '/tmp',
    TEMP: '/tmp',
    pnpm_config_store_dir: join(repoRoot, '.local', 'pnpm-store'),
    pnpm_config_save_exact: 'true',
    ...extra,
  }
}

export function runDsh(args, options = {}) {
  assertDshInstalled()
  const result = spawnSync(dshBin, args, {
    cwd: repoRoot,
    env: dshEnv(options.env),
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error([
      `dsh ${args.join(' ')} failed with exit code ${result.status}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'))
  }
  return result
}

export function spawnDsh(args, options = {}) {
  assertDshInstalled()
  return spawn(dshBin, args, {
    cwd: repoRoot,
    env: dshEnv(options.env),
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
  })
}
