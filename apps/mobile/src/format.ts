/**
 * Affichage FR international : +33 6 23 45 39 61
 * (indicatif +33, chiffre de tête, puis paires). Tombe sur l'entrée brute si
 * ce n'est pas un numéro français reconnaissable.
 */
export function formatFr(e164?: string | null): string {
  if (!e164) return '';
  const digits = e164.replace(/[^\d+]/g, '');
  let national: string | null = null;
  if (digits.startsWith('+33')) national = digits.slice(3);
  else if (digits.startsWith('0033')) national = digits.slice(4);
  else if (digits.startsWith('0') && digits.length === 10) national = digits.slice(1);
  if (national && /^\d{9}$/.test(national)) {
    const lead = national[0];
    const rest = national.slice(1).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    return `+33 ${lead} ${rest}`.trim();
  }
  // Autre indicatif international : espace par paires. Sinon tel quel.
  if (digits.startsWith('+')) return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
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
