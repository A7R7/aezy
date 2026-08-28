import { alphaProfileName, runAlphaDsh, syncAlphaProfile } from './lib/alpha-runtime.mjs'

syncAlphaProfile()
const forwarded = process.argv.slice(2)
if (forwarded[0] === '--') forwarded.shift()
const child = runAlphaDsh(['--profile', alphaProfileName, ...forwarded])

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
