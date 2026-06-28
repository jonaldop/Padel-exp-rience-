export function formatFr(e164?: string | null): string {
  if (!e164) return '';
  const d = e164.replace(/^\+33/, '0').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  return e164;
}

export function toE164Fr(raw: string): string {
  const d = (raw || '').replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) return d;
  if (d.startsWith('0033')) return '+' + d.slice(2);
  if (d.startsWith('33')) return '+' + d;
  if (d.startsWith('0')) return '+33' + d.slice(1);
  return '+33' + d;
}
