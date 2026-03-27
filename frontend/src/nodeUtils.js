/**
 * nodeUtils.js
 * Shared normalization helpers for node names across the frontend.
 * data.json uses full names ("Kochi", "Coimbatore") in its graph/threats.
 * The frontend uses short codes ("COK", "CBE") in EDGE_DATA maps and filters.
 * This file bridges the gap.
 */

/* Full-name → code */
const NAME_TO_CODE = {
  Kochi:       'COK',
  kochi:       'COK',
  KOCHI:       'COK',
  Coimbatore:  'CBE',
  coimbatore:  'CBE',
  COIMBATORE:  'CBE',
  Bangalore:   'BLR',
  bangalore:   'BLR',
  BANGALORE:   'BLR',
  Trivandrum:  'TVM',
  trivandrum:  'TVM',
  TRIVANDRUM:  'TVM',
  // codes pass through
  BLR: 'BLR',
  COK: 'COK',
  CBE: 'CBE',
  TVM: 'TVM',
};

/* Code → display label */
export const NODE_LABELS = {
  BLR: 'Bangalore Hub',
  COK: 'Kochi Port',
  CBE: 'Coimbatore Node',
  TVM: 'Trivandrum Hub',
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
