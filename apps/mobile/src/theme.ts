// Palette "Joe — Ta ligne pro" (Liquid Glass, dégradé violet/bleu).
export const colors = {
  // Marque
  primary: '#6C5CE7', // violet Joe
  primaryBlue: '#4F8CFF',
  indigo: '#3B3A86',
  // États
  green: '#16A34A',
  red: '#FF3B30',
  amber: '#FF9500',
  // Surfaces
  bg: '#ECEAFB', // fond clair lavande (fallback hors dégradé)
  card: '#FFFFFF',
  border: '#E5E5EA',
  text: '#1B1A2E',
  muted: '#7A7A8C',
};

// Dégradés réutilisables
export const gradients = {
  // Fond d'écran : lavande -> bleu très clair
  screen: ['#E7ECFF', '#ECE7FF', '#F4F1FF'] as const,
  // Accent Joe (FAB, boutons) : bleu -> violet
  brand: ['#5B8CFF', '#7C5CF0', '#9B5BE0'] as const,
};

// Verre dépoli (cartes)
export const glass = {
  fill: 'rgba(255,255,255,0.55)',
  fillStrong: 'rgba(255,255,255,0.72)',
  border: 'rgba(255,255,255,0.7)',
  innerBorder: 'rgba(255,255,255,0.5)',
  shadow: 'rgba(60,50,120,0.18)',
};
