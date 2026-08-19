import './sync-profile.mjs'
import { spawnDsh, profileName } from './lib/profile.mjs'

const forwarded = process.argv.slice(2)
if (forwarded[0] === '--') forwarded.shift()
const args = ['--profile', profileName, ...forwarded]
const child = spawnDsh(args, { stdio: 'inherit' })

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => child.kill(signal))
}

child.once('error', error => {
  throw error
})

child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exitCode = code ?? 1
})
