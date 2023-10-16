// Our special date formatting that is a simplified ISO 8601 in local time
// without seconds.
export function formatDate(date: Date): string {
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatSize(sizeInBytes: number): string {
  const kilobyte = 1024;
  const megabyte = kilobyte * 1024;
  const gigabyte = megabyte * 1024;
  const terabyte = gigabyte * 1024;

  // We don't bother localizing any of this. Anyone able to make sense of a
  // file size, can probably understand an English file size prefix.
  if (sizeInBytes >= terabyte) {
    return (sizeInBytes / terabyte).toFixed(3) + 'Tb';
  }
  if (sizeInBytes >= gigabyte) {
    return (sizeInBytes / gigabyte).toFixed(2) + 'Gb';
  }
  if (sizeInBytes >= megabyte) {
    return (sizeInBytes / megabyte).toFixed(1) + 'Mb';
  }
  if (sizeInBytes >= kilobyte) {
    return Math.round(sizeInBytes / kilobyte) + 'Kb';
  }

  return sizeInBytes + ' bytes';
}
