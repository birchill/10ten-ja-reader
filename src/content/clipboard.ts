export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for non HTTPS pages
    const copy = function (event: ClipboardEvent) {
      event.clipboardData!.setData('Text', text);
      event.preventDefault();
    };
    document.addEventListener('copy', copy);
    document.execCommand('Copy');
    document.removeEventListener('copy', copy);
  }
}
