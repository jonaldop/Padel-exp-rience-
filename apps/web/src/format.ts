/** Formate un numéro E.164 français en style lisible : +33186000010 -> 01 86 00 00 10 */
export function formatFr(e164?: string | null): string {
  if (!e164) return '';
  const digits = e164.replace(/^\+33/, '0').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }
  // Numéro international ou format inattendu : on renvoie tel quel
  return e164;
}
