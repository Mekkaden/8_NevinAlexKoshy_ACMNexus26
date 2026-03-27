/**
 * nodeUtils.js
 * Shared normalization helpers for node names across the frontend.
 * data.json uses full names ("Kochi", "Coimbatore") in its graph/threats.
 * The frontend uses short codes (COK, CBE, MAA, etc.) in maps and filters.
 */

/* Full-name → code */
const NAME_TO_CODE = {
  // Bangalore
  Bangalore:   'BLR', bangalore:   'BLR', BANGALORE:   'BLR', BLR: 'BLR',
  // Kochi
  Kochi:       'COK', kochi:       'COK', KOCHI:       'COK', COK: 'COK',
  // Coimbatore
  Coimbatore:  'CBE', coimbatore:  'CBE', COIMBATORE:  'CBE', CBE: 'CBE',
  // Trivandrum
  Trivandrum:  'TVM', trivandrum:  'TVM', TRIVANDRUM:  'TVM', TVM: 'TVM',
  // Chennai
  Chennai:     'MAA', chennai:     'MAA', CHENNAI:     'MAA', MAA: 'MAA',
  // Madurai
  Madurai:     'MDU', madurai:     'MDU', MADURAI:     'MDU', MDU: 'MDU',
  // Mangalore
  Mangalore:   'IXE', mangalore:   'IXE', MANGALORE:   'IXE', IXE: 'IXE',
  // Mysore
  Mysore:      'MYS', mysore:      'MYS', MYSORE:      'MYS', MYS: 'MYS',
  // Salem
  Salem:       'SLM', salem:       'SLM', SALEM:       'SLM', SLM: 'SLM',
  // Hubli
  Hubli:       'HBL', hubli:       'HBL', HUBLI:       'HBL', HBL: 'HBL',
  // Hyderabad
  Hyderabad:   'HYD', hyderabad:   'HYD', HYDERABAD:   'HYD', HYD: 'HYD',
  // Calicut
  Calicut:     'CCJ', calicut:     'CCJ', CALICUT:     'CCJ', CCJ: 'CCJ',
};

/* Code → display label */
export const NODE_LABELS = {
  BLR: 'Bangalore Hub',
  COK: 'Kochi Port',
  CBE: 'Coimbatore Node',
  TVM: 'Trivandrum Hub',
  MAA: 'Chennai Port Hub',
  MDU: 'Madurai Transit',
  IXE: 'Mangalore Depot',
  MYS: 'Mysore Dist. Centre',
  SLM: 'Salem Relay Node',
  HBL: 'Hubli Freight Station',
  HYD: 'Hyderabad Logistics',
  CCJ: 'Calicut Gateway',
};

/**
 * Normalize any node name (full or code) to its short code.
 * Returns the original string untouched if unknown.
 */
export function normalizeNode(name) {
  if (!name) return name;
  return NAME_TO_CODE[name] || name;
}

/**
 * Normalize an entire path array to codes.
 */
export function normalizePath(path) {
  return (path || []).map(normalizeNode);
}
