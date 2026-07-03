import * as Contacts from 'expo-contacts';

/**
 * Répertoire natif du téléphone : on lit les contacts une fois, on construit
 * un index "9 derniers chiffres -> nom" pour identifier les appelants, et on
 * expose la liste pour l'écran Clients. Aucune copie côté serveur (vie privée).
 */

let index: Record<string, string> | null = null;
let loadingPromise: Promise<void> | null = null;

/** Clé de rapprochement : 9 derniers chiffres (gère +33 / 0 / espaces). */
function key(num: string): string {
  return (num || '').replace(/\D/g, '').slice(-9);
}

export async function loadContacts(): Promise<void> {
  if (index) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        index = {};
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      const m: Record<string, string> = {};
      for (const c of data || []) {
        const name = c.name || '';
        if (!name) continue;
        for (const p of c.phoneNumbers || []) {
          const k = key(p.number || '');
          if (k.length >= 6 && !m[k]) m[k] = name;
        }
      }
      index = m;
    } catch {
      index = {};
    }
  })();
  return loadingPromise;
}

/** Nom du contact correspondant à un numéro, ou null. */
export function lookupContact(num: string): string | null {
  if (!index) return null;
  const k = key(num);
  return (k && index[k]) || null;
}

/** Force le rechargement (ex. après ajout d'un contact). */
export function resetContacts() {
  index = null;
  loadingPromise = null;
}

export type ContactDetail = {
  id: string;
  name: string;
  company?: string;
  phones: string[];
  emails: string[];
};

/** Répertoire détaillé (fiches contact) : tous les numéros, emails, société. */
export async function listContactsFull(search?: string): Promise<ContactDetail[]> {
  try {
    const perm = await Contacts.requestPermissionsAsync();
    if (perm.status !== 'granted') return [];
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Name, Contacts.Fields.Company],
    });
    let list: ContactDetail[] = (data || [])
      .filter((c) => c.phoneNumbers && c.phoneNumbers.length)
      .map((c, i) => ({
        id: c.id || String(i),
        name: c.name || c.phoneNumbers![0].number || '',
        company: (c as any).company || undefined,
        phones: Array.from(new Set((c.phoneNumbers || []).map((p) => (p.number || '').replace(/\s/g, '')).filter(Boolean))),
        emails: Array.from(new Set((c.emails || []).map((e) => (e.email || '').trim()).filter(Boolean))),
      }));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phones.some((p) => p.includes(q)),
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Fiche complète correspondant à un numéro (rapprochement 9 chiffres). */
export async function findContactByNumber(num: string): Promise<ContactDetail | null> {
  const k = key(num);
  if (!k) return null;
  const all = await listContactsFull();
  return all.find((c) => c.phones.some((p) => key(p) === k)) || null;
}

/** Crée un contact dans le répertoire du téléphone et renvoie sa fiche. */
export async function createContact(name: string, phone: string): Promise<ContactDetail | null> {
  try {
    const perm = await Contacts.requestPermissionsAsync();
    if (perm.status !== 'granted') return null;
    await Contacts.addContactAsync({
      [Contacts.Fields.FirstName]: name,
      [Contacts.Fields.PhoneNumbers]: [{ label: 'mobile', number: phone }],
    } as any);
    resetContacts();
    await loadContacts();
    return { id: phone, name, phones: [phone], emails: [] };
  } catch {
    return null;
  }
}

/** Liste du répertoire (pour l'écran Clients). */
export async function listContacts(search?: string): Promise<{ name: string; number: string }[]> {
  try {
    const perm = await Contacts.requestPermissionsAsync();
    if (perm.status !== 'granted') return [];
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });
    let list = (data || [])
      .filter((c) => c.phoneNumbers && c.phoneNumbers.length)
      .map((c) => ({
        name: c.name || c.phoneNumbers![0].number || '',
        number: (c.phoneNumbers![0].number || '').replace(/\s/g, ''),
      }));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.number.includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
