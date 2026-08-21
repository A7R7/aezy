/** Final, browser-safe projection of one authoritative ledger turn. */
export function summarizeTurn(ledger, turnNumber) {
  if (!Number.isSafeInteger(turnNumber) || turnNumber < 1) return null
  const turn = ledger?.turns?.find(candidate => candidate.turn === turnNumber)
  if (turn === undefined || !Array.isArray(turn.files) || turn.files.length === 0) return null
  return {
    turn: turn.turn,
    concurrent: turn.concurrent === true,
    additions: turn.additions ?? 0,
    deletions: turn.deletions ?? 0,
    statsComplete: turn.statsComplete === true,
    files: turn.files.map(file => ({
      path: file.path,
      openPath: file.openPath,
      change: file.change,
      afterFingerprint: file.afterFingerprint,
      revertable: file.revertable === true,
      additions: file.additions ?? null,
      deletions: file.deletions ?? null,
      binary: file.binary === true,
      truncated: file.truncated === true,
      status: file.status ?? (file.binary === true ? 'binary' : 'modified'),
      oldPath: file.oldPath ?? null,
    })),
  }
}

/** Trailing path segment for a compact Turn-tail chip. */
export function basename(path) {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at < 0 ? path : path.slice(at + 1)
}
