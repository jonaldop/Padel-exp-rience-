import { isOpen, WeeklySchedule } from './business-hours';

// Horaires de test : lundi 9h–18h uniquement.
const schedule: WeeklySchedule = {
  mon: ['09:00-18:00'],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

// Helper : un lundi à HHh (heure de Paris). 2024-01-01 est un lundi.
// On vise midi UTC pour rester dans la même journée quel que soit l'offset.
function parisMondayAt(hourParis: number): Date {
  // En janvier Paris = UTC+1, donc heure UTC = hourParis - 1.
  return new Date(Date.UTC(2024, 0, 1, hourParis - 1, 0, 0));
}

describe('isOpen', () => {
  it('ouvert un lundi à 10h', () => {
    expect(isOpen(schedule, [], parisMondayAt(10))).toBe(true);
  });

  it('fermé un lundi à 20h', () => {
    expect(isOpen(schedule, [], parisMondayAt(20))).toBe(false);
  });

  it('fermé un lundi à 8h (avant ouverture)', () => {
    expect(isOpen(schedule, [], parisMondayAt(8))).toBe(false);
  });

  it('fermé un mardi (2024-01-02) toute la journée', () => {
    const tuesday = new Date(Date.UTC(2024, 0, 2, 11, 0, 0));
    expect(isOpen(schedule, [], tuesday)).toBe(false);
  });

  it('fermé si jour férié même pendant les horaires', () => {
    expect(isOpen(schedule, ['2024-01-01'], parisMondayAt(10))).toBe(false);
  });
});
