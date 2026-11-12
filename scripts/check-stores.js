/**
 * Checks shared/stores.json for mistakes before the app is built.
 * If this fails, the deploy stops and the live app keeps its previous version.
 *
 * Run:  npm run check:stores
 */
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'shared', 'stores.json');
const bounds = require('../shared/tangub-bounds.json');
const problems = [];
const bad = (where, msg) => problems.push(`${where}: ${msg}`);

let data;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`\nstores.json is not valid JSON – usually a missing comma or quote.\n${e.message}\n`);
  process.exit(1);
}

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && isFinite(v) && v >= 0;

const categoryIds = new Set((data.categories || []).map((c) => c.id));
if (!Array.isArray(data.stores) || !data.stores.length) bad('stores', 'there must be at least one store');

const storeIds = new Set();
const itemIds = new Map();

for (const [i, s] of (data.stores || []).entries()) {
  const where = `store #${i + 1} (${s.name || s.id || 'no name'})`;
  if (!isText(s.id) || !/^[a-z0-9-]+$/.test(s.id)) bad(where, '"id" must use only small letters, numbers and dashes, e.g. "aling-nena"');
  else if (storeIds.has(s.id)) bad(where, `"id" "${s.id}" is already used by another store`);
  storeIds.add(s.id);
  for (const key of ['name', 'cuisine', 'emoji', 'tint']) if (!isText(s[key])) bad(where, `"${key}" is missing`);
  if (isText(s.tint) && !/^#[0-9a-fA-F]{6}$/.test(s.tint)) bad(where, '"tint" must be a colour like "#FFE8C7"');
  if (!Array.isArray(s.categories) || !s.categories.length) bad(where, '"categories" needs at least one category');
  for (const c of s.categories || []) if (!categoryIds.has(c)) bad(where, `category "${c}" is not in the categories list at the top of the file`);
  for (const key of ['etaMin', 'etaMax', 'deliveryFee', 'minOrder']) if (!isNum(s[key])) bad(where, `"${key}" must be a number (no quotes, no ₱ sign)`);
  if (isNum(s.etaMin) && isNum(s.etaMax) && s.etaMin > s.etaMax) bad(where, '"etaMin" is larger than "etaMax"');
  if (s.rating !== undefined && !(isNum(s.rating) && s.rating <= 5)) bad(where, '"rating" must be a number from 0 to 5');
  if (s.featured !== undefined && typeof s.featured !== 'boolean') bad(where, '"featured" must be true or false (no quotes)');

  const loc = s.location;
  if (!loc || !isNum(loc.latitude) || !isNum(loc.longitude)) bad(where, '"location" needs "latitude" and "longitude" numbers');
  else if (loc.latitude < bounds.south || loc.latitude > bounds.north || loc.longitude < bounds.west || loc.longitude > bounds.east) {
    bad(where, `location ${loc.latitude}, ${loc.longitude} is outside Tangub City (did you swap latitude and longitude?)`);
  }

  if (!Array.isArray(s.menu) || !s.menu.length) bad(where, '"menu" needs at least one section');
  for (const sec of s.menu || []) {
    if (!isText(sec.title)) bad(where, 'a menu section has no "title"');
    if (!Array.isArray(sec.items) || !sec.items.length) bad(where, `menu section "${sec.title}" has no items`);
    for (const item of sec.items || []) {
      const iw = `${where} › ${item.name || item.id || 'item'}`;
      if (!isText(item.id)) bad(iw, '"id" is missing');
      else if (itemIds.has(item.id)) bad(iw, `item "id" "${item.id}" is already used by "${itemIds.get(item.id)}" – every item in the whole file needs its own id`);
      else itemIds.set(item.id, item.name);
      if (!isText(item.name)) bad(iw, '"name" is missing');
      if (typeof item.description !== 'string') bad(iw, '"description" is missing (use "" for none)');
      if (!isNum(item.price) || item.price === 0) bad(iw, '"price" must be a number above 0 (no quotes, no ₱ sign)');
      if (!isText(item.emoji)) bad(iw, '"emoji" is missing');
    }
  }
}

if (problems.length) {
  console.error(`\nFound ${problems.length} problem(s) in shared/stores.json:\n`);
  for (const p of problems) console.error(' - ' + p);
  console.error('');
  process.exit(1);
}
console.log(`stores.json OK – ${data.stores.length} stores, ${itemIds.size} menu items.`);
