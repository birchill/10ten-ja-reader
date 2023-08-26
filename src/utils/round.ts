export function round(number: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round((number + Number.EPSILON) * factor) / factor;
}
