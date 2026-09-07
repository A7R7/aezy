// Official published USD/1M snapshot, checked 2026-09-08. Display estimates
// only: not a DSH billing owner and never a debit/credit/subscription receipt.
// https://api-docs.deepseek.com/quick_start/pricing/
export function publishedPrice(row) {
  if (!['deepseek', 'deepseek-official'].includes(row.provider)) return undefined
  const model = row.model.replace(/^deepseek\//, '')
  if (!['deepseek-v4-flash', 'deepseek-v4-pro'].includes(model)) return undefined
  const date = new Date(row.timestamp), day = date.getUTCDay(), hour = date.getUTCHours()
  const peak = day >= 1 && day <= 5 && ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10))
  const multiplier = peak ? 2 : 1, pro = model === 'deepseek-v4-pro'
  return { input: (pro ? .66 : .22) * multiplier, output: (pro ? 1.98 : .66) * multiplier,
    cacheRead: (pro ? .022 : .007) * multiplier, cacheWrite: 0, date: '2026-09-08', source: 'expected', status: 'verified',
    reference: `https://api-docs.deepseek.com/quick_start/pricing/ (${peak ? 'peak' : 'off-peak'} UTC; request-start estimate)` }
}
