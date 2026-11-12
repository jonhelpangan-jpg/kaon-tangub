// Brand palette taken from the Kaon Tangub logo: red, golden yellow, white.
export const colors = {
  primary: '#E30613',
  primaryDark: '#B00410',
  primarySoft: '#FDE8E8',
  accent: '#FFD60A',
  accentSoft: '#FFF6CC',
  accentText: '#7A1500',
  bg: '#FFFBF2',
  card: '#FFFFFF',
  text: '#2A0A08',
  muted: '#7D6A64',
  border: '#F1E6D6',
  success: '#1E8E5A',
  successSoft: '#E3F5EC',
  star: '#FFB800',
};

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

/** Formats an amount in Philippine pesos, e.g. ₱1,234.50 */
export const money = (n: number) => `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
