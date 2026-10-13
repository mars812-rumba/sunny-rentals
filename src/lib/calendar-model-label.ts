/** Compact calendar label only; never changes the stored vehicle name. */
export function calendarModelLabel(name: string, model = '', brand = ''): string {
  const prefix = brand.trim();
  let label = model.trim() || name.trim();
  if (prefix && label.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) label = label.slice(prefix.length).trim();
  // Historical bookings may outlive fleet metadata. Recognize only the
  // unambiguous prefixes used here; do not drop arbitrary first words.
  if (!model.trim() && !prefix) label = label.replace(/^(Toyota|MG)\s+/i, '');
  label = label.replace(/\s+(?:19|20)\d{2}$/, '').trim();
  if (/^\d+$/.test(label) && (prefix.toUpperCase() === 'MG' || /^MG\s*\d/i.test(name))) return `MG${label}`;
  return label || name.trim();
}
