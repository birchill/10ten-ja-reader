export function classes(
  ...classNames: Array<string | undefined | boolean>
): string {
  return classNames.filter(Boolean).join(' ');
}
