/** Final, browser-safe projection of one authoritative ledger turn. */
export function summarizeTurn(ledger, turnNumber) {
  if (!Number.isSafeInteger(turnNumber) || turnNumber < 1) return null
  const turn = ledger?.turns?.find(candidate => candidate.turn === turnNumber)
  if (turn === undefined || !Array.isArray(turn.files) || turn.files.length === 0) return null
  return {
    turn: turn.turn,
    concurrent: turn.concurrent === true,
    files: turn.files.map(file => ({
      path: file.path,
      openPath: file.openPath,
      change: file.change,
      afterFingerprint: file.afterFingerprint,
    })),
  }
}

/** Trailing path segment for a compact Turn-tail chip. */
export function basename(path) {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at < 0 ? path : path.slice(at + 1)
}
