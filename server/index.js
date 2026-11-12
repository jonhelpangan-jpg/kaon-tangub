/**
 * Kaon Tangub server: sign-in, orders, rider registration/approval and live rider GPS.
 * Also serves the web build of the app (dist/) so one deploy gives a shareable link.
 *
 * Run with:  node server/index.js
 * Env: PORT, DATABASE_URL, GOOGLE_CLIENT_ID, SESSION_SECRET, ADMIN_EMAILS  (see SETUP-LOGIN.md)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BOUNDS = require('../shared/tangub-bounds.json');
const auth = require('./auth');
const { createStore } = require('./store');

const PORT = Number(process.env.PORT) || 3000;
const WEB_DIR = path.join(__dirname, '..', 'dist');

/** @type {Awaited<ReturnType<typeof createStore>>} */
let store;

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

const ACTIVE = ['accepted', 'picked_up'];
const isApprovedRider = (user) => !!user.rider && user.rider.status === 'approved';
const isAdmin = (user) => auth.isAdminEmail(user.email);

/** What the app is allowed to know about the signed-in user. */
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  picture: user.picture,
  isAdmin: isAdmin(user),
  rider: user.rider || null,
});

function signIn(profile) {
  let user = store.users.get(profile.sub);
  if (!user) {
    user = { id: profile.sub, email: profile.email, name: profile.name, picture: profile.picture, rider: null, createdAt: Date.now() };
    store.users.set(user.id, user);
  } else {
    Object.assign(user, { email: profile.email, name: profile.name, picture: profile.picture });
  }
  store.save('users', user);
  return { token: auth.createSession(user.id), user: publicUser(user) };
}

function getOrder(id) {
  const order = store.orders.get(id);
  if (!order) throw new HttpError(404, 'Order not found');
  return order;
}

function requireAssignedRider(order, user) {
  if (order.riderId !== user.id) throw new HttpError(403, 'This order is assigned to another rider');
}

function setStatus(order, status) {
  const now = Date.now();
  order.status = status;
  order.updatedAt = now;
  order.history.push({ status, at: now });
  store.save('orders', order);
  return order;
}

// ---------- API ----------
// [method, path pattern, who may call it, handler(match, body, user, query)]
// who: 'public' | 'user' (signed in) | 'rider' (approved rider) | 'admin'
const routes = [
  ['GET', /^\/api\/health$/, 'public', () => ({ ok: true, persistent: store.persistent })],

  ['GET', /^\/api\/config$/, 'public', () => ({
    googleClientId: auth.GOOGLE_CLIENT_ID,
    testLogin: auth.ALLOW_TEST_LOGIN,
  })],

  ['POST', /^\/api\/auth\/google$/, 'public', async (_m, body) => {
    let profile;
    try {
      profile = await auth.verifyGoogleToken(body.credential);
    } catch (e) {
      throw new HttpError(401, e.message);
    }
    return signIn(profile);
  }],

  // Password-less login for local testing only (ALLOW_TEST_LOGIN=1).
  ['POST', /^\/api\/auth\/test$/, 'public', (_m, body) => {
    if (!auth.ALLOW_TEST_LOGIN) throw new HttpError(404, 'Not found');
    const email = str(body.email, 120).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw new HttpError(400, 'Enter an email');
    return signIn({ sub: `test-${email}`, email, name: str(body.name, 60) || email.split('@')[0], picture: null });
  }],

  ['GET', /^\/api\/me$/, 'user', (_m, _b, user) => publicUser(user)],

  // ----- customer -----
  ['POST', /^\/api\/orders$/, 'user', (_m, body, user) => {
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
      customerId: user.id,
      customerName: str(body.customerName, 60) || user.name,
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
      riderPhone: null,
      courier: null, // { latitude, longitude, updatedAt } – live only, not saved to the database
      history: [{ status: 'placed', at: now }],
    };
    store.orders.set(order.id, order);
    store.save('orders', order);
    return order;
  }],

  ['GET', /^\/api\/orders$/, 'user', (_m, _b, user) =>
    [...store.orders.values()].filter((o) => o.customerId === user.id).sort((a, b) => b.createdAt - a.createdAt)],

  ['GET', /^\/api\/orders\/([A-Z0-9]+)$/, 'user', (m, _b, user) => {
    const order = getOrder(m[1]);
    const allowed =
      order.customerId === user.id ||
      order.riderId === user.id ||
      isAdmin(user) ||
      (order.status === 'placed' && isApprovedRider(user));
    if (!allowed) throw new HttpError(404, 'Order not found');
    return order;
  }],

  ['POST', /^\/api\/orders\/([A-Z0-9]+)\/cancel$/, 'user', (m, _b, user) => {
    const order = getOrder(m[1]);
    if (order.customerId !== user.id) throw new HttpError(404, 'Order not found');
    if (order.status !== 'placed') throw new HttpError(409, 'A rider has already accepted this order');
    return setStatus(order, 'cancelled');
  }],

  // ----- rider registration -----
  ['POST', /^\/api\/rider\/apply$/, 'user', (_m, body, user) => {
    if (user.rider && (user.rider.status === 'approved' || user.rider.status === 'suspended')) {
      throw new HttpError(409, 'You already have a rider account');
    }
    const fullName = str(body.fullName, 80);
    const phone = str(body.phone, 30);
    const vehicle = str(body.vehicle, 60);
    const plate = str(body.plate, 20);
    if (!fullName) throw new HttpError(400, 'Enter your full name');
    if (!/^[0-9+ ()-]{7,}$/.test(phone)) throw new HttpError(400, 'Enter a valid mobile number');
    if (!vehicle) throw new HttpError(400, 'Enter your vehicle (e.g. Honda Click 125)');
    user.rider = { status: 'pending', fullName, phone, vehicle, plate, appliedAt: Date.now(), decidedAt: null };
    store.save('users', user);
    return publicUser(user);
  }],

  // ----- rider (approved only) -----
  ['GET', /^\/api\/rider\/orders$/, 'rider', (_m, _b, user) => {
    const all = [...store.orders.values()];
    return {
      available: all.filter((o) => o.status === 'placed').sort((a, b) => a.createdAt - b.createdAt),
      active: all.filter((o) => o.riderId === user.id && ACTIVE.includes(o.status)),
      completed: all
        .filter((o) => o.riderId === user.id && o.status === 'delivered')
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 20),
    };
  }],

  ['POST', /^\/api\/orders\/([A-Z0-9]+)\/accept$/, 'rider', (m, _b, user) => {
    const order = getOrder(m[1]);
    if (order.status !== 'placed') throw new HttpError(409, 'This order is no longer available');
    if ([...store.orders.values()].some((o) => o.riderId === user.id && ACTIVE.includes(o.status))) {
      throw new HttpError(409, 'Finish your current delivery first');
    }
    order.riderId = user.id;
    order.riderName = user.rider.fullName;
    order.riderPhone = user.rider.phone;
    return setStatus(order, 'accepted');
  }],

  ['POST', /^\/api\/orders\/([A-Z0-9]+)\/status$/, 'rider', (m, body, user) => {
    const order = getOrder(m[1]);
    requireAssignedRider(order, user);
    const next = { accepted: 'picked_up', picked_up: 'delivered' }[order.status];
    if (!next || body.status !== next) throw new HttpError(409, `Order is ${order.status}; cannot change to ${body.status}`);
    return setStatus(order, next);
  }],

  // Rider's phone reports its GPS position
  ['POST', /^\/api\/orders\/([A-Z0-9]+)\/location$/, 'rider', (m, body, user) => {
    const order = getOrder(m[1]);
    requireAssignedRider(order, user);
    if (!ACTIVE.includes(order.status)) throw new HttpError(409, 'Order is not in progress');
    if (!isCoords(body)) throw new HttpError(400, 'Missing coordinates');
    if (!inTangub(body)) throw new HttpError(422, 'Rider is outside Tangub City; location not shared.');
    order.courier = { latitude: body.latitude, longitude: body.longitude, updatedAt: Date.now() };
    return { ok: true };
  }],

  // ----- admin: approve riders -----
  ['GET', /^\/api\/admin\/riders$/, 'admin', () =>
    [...store.users.values()]
      .filter((u) => u.rider)
      .sort((a, b) => b.rider.appliedAt - a.rider.appliedAt)
      .map((u) => ({ id: u.id, email: u.email, name: u.name, rider: u.rider }))],

  ['POST', /^\/api\/admin\/riders\/([^/]+)$/, 'admin', (m, body) => {
    const user = store.users.get(decodeURIComponent(m[1]));
    if (!user || !user.rider) throw new HttpError(404, 'Rider not found');
    const status = { approve: 'approved', reject: 'rejected', suspend: 'suspended' }[body.action];
    if (!status) throw new HttpError(400, 'Unknown action');
    user.rider.status = status;
    user.rider.decidedAt = Date.now();
    store.save('users', user);
    return { id: user.id, email: user.email, name: user.name, rider: user.rider };
  }],
];

function userFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const uid = auth.readSession(token);
  return uid ? store.users.get(uid) || null : null;
}

function authorize(who, user) {
  if (who === 'public') return;
  if (!user) throw new HttpError(401, 'Please sign in');
  if (who === 'rider' && !isApprovedRider(user)) throw new HttpError(403, 'Your rider account is not approved');
  if (who === 'admin' && !isAdmin(user)) throw new HttpError(403, 'Admins only');
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    for (const [method, pattern, who, handler] of routes) {
      const match = req.method === method && url.pathname.match(pattern);
      if (match) {
        const user = userFromRequest(req);
        authorize(who, user);
        const body = method === 'POST' ? await readBody(req) : {};
        return send(200, await handler(match, body, user, url.searchParams));
      }
    }
    send(404, { error: 'Not found' });
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { error: e.message });
    console.error(e);
    send(500, { error: 'Server error' });
  }
});

createStore()
  .then((s) => {
    store = s;
    console.log(
      s.persistent
        ? `Database connected: ${s.users.size} users, ${s.orders.size} orders`
        : 'No DATABASE_URL: using a local file. Data will NOT survive restarts on free hosting.',
    );
    if (!auth.GOOGLE_CLIENT_ID) console.warn('GOOGLE_CLIENT_ID is not set: Google sign-in is disabled.');
    if (auth.ALLOW_TEST_LOGIN) console.warn('ALLOW_TEST_LOGIN is on: anyone can sign in as anyone. Never use on the live site.');
    server.listen(PORT, () => console.log(`Kaon Tangub server on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('Could not start:', e.message);
    process.exit(1);
  });
