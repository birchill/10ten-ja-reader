export function normalizeKey(key: string): string {
  const upperKey = key.toUpperCase();
  switch (upperKey) {
    case 'ESCAPE':
      return 'ESC';

    case 'CONTROL':
      return 'CTRL';

    case ' ':
      return 'SPACE';
  }

  return upperKey;
}

export function normalizeKeys(keys: ReadonlyArray<string>): Array<string> {
  return keys.map(normalizeKey);
}

export function hasModifiers(event: KeyboardEvent): boolean {
  const key = normalizeKey(event.key);

  return (
    (event.ctrlKey && key !== 'CTRL') ||
    ((event.altKey || event.getModifierState('AltGraph')) && key !== 'ALT') ||
    (event.shiftKey && key !== 'SHIFT') ||
    (event.metaKey && key !== 'META')
  );
}
