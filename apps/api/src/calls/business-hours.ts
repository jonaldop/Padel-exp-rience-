/**
 * Détermine si un numéro est "ouvert" à un instant donné, dans le fuseau
 * Europe/Paris (cf. doc 04 — BUSINESS_HOURS).
 *
 * Format des horaires : pour chaque jour, une liste de créneaux "HH:MM-HH:MM".
 * Exemple :
 *   { mon: ["09:00-12:00", "14:00-18:00"], sat: [], sun: [] }
 */
export type WeeklySchedule = Record<string, string[]>;

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Horaires par défaut : lun–ven 9h–12h / 14h–18h, fermé le week-end. */
export const DEFAULT_SCHEDULE: WeeklySchedule = {
  mon: ['09:00-12:00', '14:00-18:00'],
  tue: ['09:00-12:00', '14:00-18:00'],
  wed: ['09:00-12:00', '14:00-18:00'],
  thu: ['09:00-12:00', '14:00-18:00'],
  fri: ['09:00-12:00', '14:00-18:00'],
  sat: [],
  sun: [],
};

/** Retourne l'heure (HH:MM) et le jour (clé) courants à Paris. */
function nowInParis(date: Date): { day: string; minutes: number } {
  // Intl nous donne l'heure locale Paris sans dépendre du fuseau serveur.
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  // On recalcule le jour de façon fiable via une seconde formatteuse numérique.
  const dayIdx = new Date(
    date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }),
  ).getDay();
  return { day: DAYS[dayIdx], minutes: hour * 60 + minute };
}

function slotContains(slot: string, minutes: number): boolean {
  const [start, end] = slot.split('-');
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map((n) => parseInt(n, 10));
    return h * 60 + m;
  };
  return minutes >= toMin(start) && minutes < toMin(end);
}

export function isOpen(
  schedule: WeeklySchedule = DEFAULT_SCHEDULE,
  holidays: string[] = [],
  date: Date = new Date(),
): boolean {
  // Jour férié / date de fermeture (format YYYY-MM-DD en heure de Paris)
  const isoParis = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
  }).format(date); // ex "2026-06-27"
  if (holidays.includes(isoParis)) return false;

  const { day, minutes } = nowInParis(date);
  const slots = schedule[day] || [];
  return slots.some((slot) => slotContains(slot, minutes));
}
