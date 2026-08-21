const MAX_STRUCTURED_LINES = 5_000
const MAX_LINE_CHARS = 20_000
const MAX_FALLBACK_CHARS = 64 * 1024

function fallback(raw, message) {
  const clipped = raw.length > MAX_FALLBACK_CHARS
    ? `${raw.slice(0, MAX_FALLBACK_CHARS)}\n\n[raw fallback clipped by Aezy]\n`
    : raw
  return { state: 'fallback', message, hunks: [], rawFallback: clipped }
}

function headerMetadata(lines) {
  let oldPath = null
  let newPath = null
  let status = 'modified'
  for (const line of lines) {
    if (line === 'GIT binary patch' || /^Binary files .* differ$/u.test(line)) status = 'binary'
    else if (line.startsWith('new file mode ')) status = 'added'
    else if (line.startsWith('deleted file mode ')) status = 'deleted'
    else if (line.startsWith('rename from ')) { oldPath = line.slice(12); status = 'renamed' }
    else if (line.startsWith('rename to ')) { newPath = line.slice(10); status = 'renamed' }
    else if (line.startsWith('--- ')) oldPath = line.slice(4) === '/dev/null' ? null : line.slice(4).replace(/^a\//u, '')
    else if (line.startsWith('+++ ')) newPath = line.slice(4) === '/dev/null' ? null : line.slice(4).replace(/^b\//u, '')
  }
  if (oldPath === null && newPath !== null && status === 'modified') status = 'added'
  if (oldPath !== null && newPath === null && status === 'modified') status = 'deleted'
  return { oldPath, newPath, status }
}

/** Strictly project a bounded unified diff into renderer-safe hunks. */
export function parseUnifiedDiff(raw, options = {}) {
  if (typeof raw !== 'string') return fallback('', 'Diff payload is not text.')
  if (raw === '') return { state: 'empty', message: 'No textual line changes.', hunks: [] }
  const normalized = raw.replace(/\r\n/gu, '\n')
  const lines = normalized.split('\n')
  if (lines.length > MAX_STRUCTURED_LINES) {
    return fallback(normalized, `Diff exceeds the ${MAX_STRUCTURED_LINES.toLocaleString('en-US')} line review limit.`)
  }
  if (lines.some(line => line.length > MAX_LINE_CHARS)) {
    return fallback(normalized, 'Diff contains a line that exceeds the structured review limit.')
  }
  if (lines.some(line => line.startsWith('@@@'))) {
    return fallback(normalized, 'Combined diffs are not supported by this review surface.')
  }

  const firstHunk = lines.findIndex(line => line.startsWith('@@'))
  const metadata = headerMetadata(firstHunk < 0 ? lines : lines.slice(0, firstHunk))
  if (metadata.status === 'binary') {
    return { state: 'empty', message: 'Binary file; textual review is unavailable.', hunks: [], metadata }
  }
  if (firstHunk < 0) {
    const recognized = lines.every(line => line === ''
      || line.startsWith('diff --git ')
      || line.startsWith('index ')
      || line.startsWith('old mode ')
      || line.startsWith('new mode ')
      || line.startsWith('new file mode ')
      || line.startsWith('deleted file mode ')
      || line.startsWith('similarity index ')
      || line.startsWith('rename from ')
      || line.startsWith('rename to ')
      || line.startsWith('--- ')
      || line.startsWith('+++ '))
    return recognized
      ? { state: 'empty', message: 'Metadata changed without textual hunks.', hunks: [], metadata }
      : fallback(normalized, 'Unified diff contains no valid hunk header.')
  }

  const hunks = []
  let index = firstHunk
  while (index < lines.length) {
    const header = lines[index]
    const matched = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/u.exec(header)
    if (matched === null) return fallback(normalized, `Malformed hunk header: ${header}`)
    const oldStart = Number(matched[1])
    const oldCount = matched[2] === undefined ? 1 : Number(matched[2])
    const newStart = Number(matched[3])
    const newCount = matched[4] === undefined ? 1 : Number(matched[4])
    if (![oldStart, oldCount, newStart, newCount].every(Number.isSafeInteger)) {
      return fallback(normalized, 'Hunk coordinates exceed the safe integer range.')
    }
    index += 1
    let oldLine = oldStart
    let newLine = newStart
    let observedOld = 0
    let observedNew = 0
    const projected = []
    while (index < lines.length && !lines[index].startsWith('@@')) {
      const line = lines[index]
      if (line === '' && index === lines.length - 1) { index += 1; break }
      if (line === '\\ No newline at end of file') {
        projected.push({ kind: 'meta', oldLine: null, newLine: null, text: line })
        index += 1
        continue
      }
      const prefix = line[0]
      const text = line.slice(1)
      if (prefix === ' ') {
        projected.push({ kind: 'context', oldLine, newLine, text })
        oldLine += 1; newLine += 1; observedOld += 1; observedNew += 1
      } else if (prefix === '-') {
        projected.push({ kind: 'deletion', oldLine, newLine: null, text })
        oldLine += 1; observedOld += 1
      } else if (prefix === '+') {
        projected.push({ kind: 'addition', oldLine: null, newLine, text })
        newLine += 1; observedNew += 1
      } else {
        return fallback(normalized, `Unexpected unified diff line inside hunk: ${line.slice(0, 80)}`)
      }
      index += 1
    }
    if (observedOld !== oldCount || observedNew !== newCount) {
      const message = options.truncated === true && index >= lines.length
        ? 'The diff was truncated inside a hunk; structured line numbers are unavailable.'
        : `Hunk line counts do not match ${header}`
      return fallback(normalized, message)
    }
    hunks.push({ header, oldStart, oldCount, newStart, newCount, lines: projected })
  }
  return { state: 'structured', hunks, metadata }
}

export function countStructuredLines(part) {
  if (part?.state === 'empty') return { additions: 0, deletions: 0 }
  if (part?.state !== 'structured') return { additions: null, deletions: null }
  let additions = 0
  let deletions = 0
  for (const hunk of part.hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'addition') additions += 1
      if (line.kind === 'deletion') deletions += 1
    }
  }
  return { additions, deletions }
}
