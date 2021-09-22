// JS % operator is a _remainder_ operator
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
