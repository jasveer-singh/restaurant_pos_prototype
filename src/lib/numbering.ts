// Bill numbering: one counter per local calendar day. Pure; callers persist the result.

export interface DayCounter {
  date: string // local YYYY-MM-DD
  last: number
}

export interface NextNumber {
  counter: DayCounter
  token: number // 1-999, wraps
  billNumber: string // DDMMYY + counter padded to 4 digits
}

const pad = (n: number, width: number) => String(n).padStart(width, '0')

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`
}

export function nextNumber(counter: DayCounter | null, now: Date): NextNumber {
  const date = localDateKey(now)
  const last = counter && counter.date === date ? counter.last + 1 : 1
  return {
    counter: { date, last },
    token: ((last - 1) % 999) + 1,
    billNumber: `${pad(now.getDate(), 2)}${pad(now.getMonth() + 1, 2)}${pad(now.getFullYear() % 100, 2)}${pad(last, 4)}`,
  }
}
