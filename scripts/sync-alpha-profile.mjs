import {
  alphaDshHome,
  alphaProfileName,
  syncAlphaProfile,
} from './lib/alpha-runtime.mjs'

const result = syncAlphaProfile()
process.stdout.write([
  `Aezy alpha profile synced with DSH ${result.version}.`,
  `installed=${String(result.install)}`,
  `DSH_HOME=${alphaDshHome}`,
  `profile=${alphaProfileName}`,
  `manifest=${result.manifestPath}`,
  `preset=${result.presetTarget}`,
  `signature=${result.signature}`,
  '',
].join('\n'))
