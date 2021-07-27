export function getThemeClass(theme: string): string {
  if (theme !== 'default') {
    return `theme-${theme}`;
  }

  // It is up to the call site to register for media query updates if they
  // need to respond to dark mode changes. Generally, e.g. for popups etc.,
  // however, the usage of this value is short-lived enough that it's not
  // needed.
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'theme-black';
  }

  return 'theme-light';
}
