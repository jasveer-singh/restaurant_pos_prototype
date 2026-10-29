export const toPaise = (rupees: number): number => Math.round(rupees * 100)

export const formatRupees = (paise: number): string => {
  const sign = paise < 0 ? '-' : ''
  return `${sign}₹${(Math.abs(paise) / 100).toFixed(2)}`
}
