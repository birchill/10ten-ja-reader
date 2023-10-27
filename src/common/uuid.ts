// A very simple unique ID generator mostly used for assigning unique keys to
// child components where our uniqueness requirements are very loose.
export function cheapUuid(): string {
  const first = (Math.random() * 46656) | 0;
  const second = (Math.random() * 46656) | 0;
  const firstPart = ('000' + first.toString(36)).slice(-3);
  const secondPart = ('000' + second.toString(36)).slice(-3);
  return firstPart + secondPart;
}
