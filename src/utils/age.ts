const regularAgeRegex = /(\d{4})\.(\d{1,2})(?:\.(\d{1,2}))?-[;)]/;
const backwardsAgeRegex = /(\d{1,2})\.(\d{1,2})\.(\d{4})?-[;)]/;

export function getDob(text: string): { date: Date; approx: boolean } | null {
  let year: number;
  let month: number;
  let approx: boolean;
  let day: number;

  let matches = regularAgeRegex.exec(text);
  if (matches) {
    year = parseInt(matches[1], 10);
    month = parseInt(matches[2], 10) - 1;
    approx = typeof matches[3] === 'undefined';
    day = !approx ? parseInt(matches[3], 10) : 1;
  } else {
    matches = backwardsAgeRegex.exec(text);
    if (matches) {
      year = parseInt(matches[3], 10);
      month = parseInt(matches[1], 10) - 1;
      day = parseInt(matches[2], 10);
      approx = false;
    } else {
      return null;
    }
  }

  // Sanity check
  if (
    year > 2100 ||
    year < 100 ||
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return {
    // This will create a date in the current user's timezone but that's fine
    // since we're going to compare this to the user's local time anyway.
    date: new Date(year, month, day),
    approx,
  };
}
