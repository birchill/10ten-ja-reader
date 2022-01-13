export function padNum(num: number, length = 2): string {
  return String(num).padStart(length, '0');
}
