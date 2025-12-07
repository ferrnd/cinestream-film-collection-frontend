// Feito trabalhar com o catálogo local (MOVIE_DATA), apra não ser desperdiçado. (IA)
import { MOVIE_DATA } from './data.js';


const LOCAL_KEYS_SORTED = Object.keys(MOVIE_DATA).sort();
const LOCAL_NUMERIC_START = 101; 

export function slugForNumericId(numericId) {
  const n = Number(numericId);
  if (!Number.isFinite(n)) return null;
  const idx = n - LOCAL_NUMERIC_START;
  if (idx < 0 || idx >= LOCAL_KEYS_SORTED.length) return null;
  return LOCAL_KEYS_SORTED[idx];
}

export function numericIdForSlug(slug) {
  const idx = LOCAL_KEYS_SORTED.indexOf(slug);
  if (idx === -1) return null;
  return String(LOCAL_NUMERIC_START + idx);
}

export function getLocalKeysSorted() {
  return LOCAL_KEYS_SORTED.slice();
}

export function getAllLocalMovies() {
  return MOVIE_DATA;
}

export const LOCAL_NUMERIC_BASE = LOCAL_NUMERIC_START;
