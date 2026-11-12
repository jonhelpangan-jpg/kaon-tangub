/**
 * Kaon Tangub server: orders, rider assignment and live rider GPS.
 * Also serves the web build of the app (dist/) so one deploy gives a shareable link.
 *
 * No dependencies – run with:  node server/index.js
 * Env: PORT (default 3000), DATA_DIR (default ./data)
 *
 * Trial-grade: no logins, orders stored in a JSON file.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BOUNDS = require('../shared/tangub-bounds.json');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'orders.json');
const WEB_DIR = path.join(__dirname, '..', 'dist');

// ---------- storage ----------
/** @type {Map<string, any>} */
const orders = new Map();
try {
  for (const o of JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))) orders.set(o.id, o);
  console.log(`Loaded ${orders.size} orders`);
} catch {
  /* first run */
}

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([...orders.values()]));
    } catch (e) {
      console.error('Could not save orders:', e.message);
    }
  }, 500);
}

// ---------- helpers ----------
const isCoords = (c) =>
  c && typeof c.latitude === 'number' && typeof c.longitude === 'number' && isFinite(c.latitude) && isFinite(c.longitude);

const inTangub = (c) =>
  c.latitude >= BOUNDS.south && c.latitude <= BOUNDS.north && c.longitude >= BOUNDS.west && c.longitude <= BOUNDS.east;

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getOrder(id) {
  const order = orders.get(id);
  if (!order) throw new HttpError(404, 'Order not found');
  return order;
}

function requireRider(order, riderId) {
  if (!riderId || order.riderId !== riderId) throw new HttpError(403, 'This order is assigned to another rider');
}

const ACTIVE = ['accepted', 'picked_up'];

// ---------- API ----------
const routes = [
  ['GET', /^\/api\/health$/, () => ({ ok: true, orders: orders.size })],

  // Customer places an order
  ['POST', /^\/api\/orders$/, (_m, body) => {
    const customerId = str(body.customerId, 80);
    if (!customerId) throw new HttpError(400, 'Missing customer');
    if (!Array.isArray(body.lines) || !body.lines.length || body.lines.length > 100) {
      throw new HttpError(400, 'Your cart is empty');
    }
    if (!isCoords(body.deliveryCoords)) throw new HttpError(400, 'Missing delivery pin');
    if (!inTangub(body.deliveryCoords)) {
      throw new HttpError(422, 'That location is outside Tangub City. Kaon Tangub delivers within Tangub City only.');
    }
    if (!isCoords(body.restaurantCoords)) throw new HttpError(400, 'Missing restaurant location');
    if (!str(body.address)) throw new HttpError(400, 'Missing delivery address');

    const now = Date.now();
    const order = {
      id: crypto.randomBytes(4).toString('hex').toUpperCase(),
      status: 'placed',
      customerId,
      customerName: str(body.customerName, 60) || 'Guest',
      restaurantId: str(body.restaurantId, 80),
      restaurantName: str(body.restaurantName, 120),
      restaurantCoords: { latitude: body.restaurantCoords.latitude, longitude: body.restaurantCoords.longitude },
      lines: body.lines.map((l) => ({
        qty: Math.max(1, Math.min(99, Math.round(num(l.qty)) || 1)),
        item: {
          id: str(l.item && l.item.id, 40),
          name: str(l.item && l.item.name, 120),
          description: str(l.item && l.item.description, 300),
          price: num(l.item && l.item.price),
          emoji: str(l.item && l.item.emoji, 16),
        },
      })),
      subtotal: num(body.subtotal),
      deliveryFee: num(body.deliveryFee),
      serviceFee: num(body.serviceFee),
      tip: num(body.tip),
      total: num(body.total),
      address: str(body.address),
      deliveryCoords: { latitude: body.deliveryCoords.latitude, longitude: body.deliveryCoords.longitude },
      payment: str(body.payment, 60),
      note: str(body.note, 500),
      createdAt: now,
      updatedAt: now,
      riderId: null,
      riderName: null,
      courier: null, // { latitude, longitude, updatedAt }
      history: [{ status: 'placed', at: now }],
    };
    orders.set(order.id, order);
    save();
    return order;
  }],

  // Customer's order history
  ['GET', /^\/api\/orders$/, (_m, _b, query) => {
    const customerId = query.get('customerId');
    if (!customerId) throw new HttpError(400, 'Missing customer');
    return [...orders.values()].filter((o) => o.customerId === customerId).sort((a, b) => b.createdAt - a.createdAt);
  }],

  ['GET', /^\/api\/orders\/([A-Z0-9]+)$/, (m) => getOrder(m[1])],

  // Customer cancels before a rider accepts
  ['POST', /^\/api\/orders\/([A-Z0-9]+)\/cancel$/, (m, body) => {
    const order = getOrder(m[1]);
    if (order.customerId !== body.customerId) throw new HttpError(403, 'Not your order');
    if (order.status !== 'placed') throw new HttpError(409, 'A rider has already accepted this order');
    return setStatus(order, 'cancelled');
  }],

  // Rider: orders waiting for a rider + this rider's own orders
  ['GET', /^\/api\/rider\/orders$/, (_m, _b, query) => {
    const riderId = query.get('riderId');
    if (!riderId) throw new HttpError(400, 'Missing rider');
    const all = [...orders.values()];
    return {
      available: all.filter((o) => o.status === 'placed').sort((a, b) => a.createdAt - b.createdAt),
      active: all.filter((o) => o.riderId === riderId && ACTIVE.includes(o.status)),
      completed: all
        .filter((o) => o.riderId === riderId && o.status === 'delivered')
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 20),
    };
  }],

  ['POST', /^\/api\/orders\/([A-Z0-9]+)\/accept$/, (m, body) => {
    const order = getOrder(m[1]);
    const riderId = str(body.riderId, 80);
    if (!riderId) throw new HttpError(400, 'Missing rider');
    if (order.status !== 'placed') throw new HttpError(409, 'This order is no longer available');
    order.riderId = riderId;
    order.riderName = str(body.riderName, 60) || 'Rider';
    return setStatus(order, 'accepted');
  }],

  ['POST', /^\/api\/orders\/([A-Z0-9]+)\/status$/, (m, body) => {
    const order = getOrder(m[1]);
    requireRider(order, body.riderId);
    const next = { accepted: 'picked_up', picked_up: 'delivered' }[order.status];
    if (!next || body.status !== next) throw new HttpError(409, `Order is ${order.status}; cannot change to ${body.status}`);
    return setStatus(order, next);
  }],

  // Rider's phone reports its GPS position
  ['POST', /^\/api\/orders\/([A-Z0-9]+)\/location$/, (m, body) => {
    const order = getOrder(m[1]);
    requireRider(order, body.riderId);
    if (!ACTIVE.includes(order.status)) throw new HttpError(409, 'Order is not in progress');
    if (!isCoords(body)) throw new HttpError(400, 'Missing coordinates');
    if (!inTangub(body)) throw new HttpError(422, 'Rider is outside Tangub City; location not shared.');
    order.courier = { latitude: body.latitude, longitude: body.longitude, updatedAt: Date.now() };
    save();
    return { ok: true };
  }],
];

function setStatus(order, status) {
  const now = Date.now();
  order.status = status;
  order.updatedAt = now;
  order.history.push({ status, at: now });
  save();
  return order;
}

// ---------- HTTP plumbing ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 200_000) {
        reject(new HttpError(413, 'Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {
        reject(new HttpError(400, 'Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function serveStatic(pathname, res) {
  let file = path.normalize(path.join(WEB_DIR, decodeURIComponent(pathname)));
  if (!file.startsWith(WEB_DIR)) file = path.join(WEB_DIR, 'index.html');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(WEB_DIR, 'index.html'); // SPA fallback
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Web app not built. Run: npm run build:web');
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!url.pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    return serveStatic(url.pathname, res);
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }

  const send = (status, data) => {
    res.writeHead(status, { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };

  try {
    for (const [method, pattern, handler] of routes) {
      const match = req.method === method && url.pathname.match(pattern);
      if (match) {
        const body = method === 'POST' ? await readBody(req) : {};
        return send(200, await handler(match, body, url.searchParams));
      }
    }
    send(404, { error: 'Not found' });
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { error: e.message });
    console.error(e);
    send(500, { error: 'Server error' });
  }
});

server.listen(PORT, () => console.log(`Kaon Tangub server on http://localhost:${PORT}`));
