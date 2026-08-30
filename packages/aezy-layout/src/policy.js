export const CHAT_MIN_RATIO = 0.25
export const DETAILS_MAX_RATIO = 1 - CHAT_MIN_RATIO
export const DETAILS_MIN_PX = 300
export const DETAILS_LAYOUT_MIN_PX = 760

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

/** Resolve proportional limits inside the conversation+details region, excluding the navigation sidebar. */
export function columnLimits(frameWidth, sidebarWidth) {
  const frame = finite(frameWidth)
  const sidebar = Math.min(frame, finite(sidebarWidth))
  const content = Math.max(0, frame - sidebar)
  const chatMin = Math.round(content * CHAT_MIN_RATIO)
  const detailsMax = Math.max(0, content - chatMin)
  return Object.freeze({
    frame,
    sidebar,
    content,
    chatMin,
    detailsMin: Math.min(DETAILS_MIN_PX, detailsMax),
    detailsMax,
  })
}

export function clampDetailsWidth(requestedWidth, frameWidth, sidebarWidth) {
  const limits = columnLimits(frameWidth, sidebarWidth)
  const requested = Math.round(finite(requestedWidth))
  return Math.min(limits.detailsMax, Math.max(limits.detailsMin, requested))
}

/** Read the three pixel tracks emitted by DSH's public AppFrame DOM. */
export function parsePixelTracks(value) {
  if (typeof value !== 'string') return null
  const matches = [...value.matchAll(/(-?\d+(?:\.\d+)?)px/gu)].map(match => Number(match[1]))
  if (matches.length !== 3 || matches.some(item => !Number.isFinite(item))) return null
  return Object.freeze({ sidebar: matches[0], center: matches[1], details: matches[2] })
}
