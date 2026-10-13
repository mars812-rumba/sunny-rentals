export function openParkDatePicker(input: HTMLInputElement): boolean {
  try {
    if (typeof input.showPicker !== 'function') return false;
    input.showPicker();
    return true;
  } catch {
    // Older browsers and embedded WebViews retain their native input behavior.
    return false;
  }
}
