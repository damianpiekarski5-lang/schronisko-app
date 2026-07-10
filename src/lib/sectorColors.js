// Kolory sektorów — jedna paleta dla tabeli spacerów i mapy schroniska
// (spójność: wolontariusz widzi ten sam kolor sektora wszędzie).

export const SECTOR_COLORS = {
  A:  "#a8d5a2",
  B:  "#d4edd4",
  C:  "#fce584",
  D:  "#f9b4d0",
  E:  "#f2b8c0",
  F:  "#d5c3a0",
  G:  "#a8d8d8",
  H:  "#a8c4e8",
  ZE: "#b8c8dc",
  ZF: "#c8b8dc",
  ZH: "#fde0ec",
  ZG: "#f4b8c8",
  P:  "#fcd8c0",
  R:  "#f8c090",
  V:  "#fffde7",
  T:  "#fff9a0",
  U:  "#fff4c4",
  L:  "#f4a8c0",
  X:  "#e88898",
  Y:  "#80d0c8",
  I:  "#d4b080",
  O:  "#a0b8d8",
  S:  "#e08080",
  N:  "#c0d8a8",
};

export function getSectorColor(pavilion, fallback = "#ffffff") {
  if (!pavilion) return fallback;
  const pav = String(pavilion).toUpperCase();
  if (SECTOR_COLORS[pav]) return SECTOR_COLORS[pav];
  for (const key of Object.keys(SECTOR_COLORS)) {
    if (pav.startsWith(key)) return SECTOR_COLORS[key];
  }
  return fallback;
}
