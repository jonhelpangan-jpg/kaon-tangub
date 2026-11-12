/**
 * Storage for users and orders.
 *
 * - With DATABASE_URL set (e.g. a free Neon Postgres database): data is permanent.
 * - Without it: data goes to a JSON file, which hosts like Render's free plan
 *   wipe on every restart. Fine for local testing only.
 *
 * Everything is kept in memory for fast reads and written through on change.
 */
const fs = require('node:fs');
const path = require('node:path');

const KINDS = ['users', 'orders'];

async function createStore() {
  const data = { users: new Map(), orders: new Map() };

  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
    await pool.query(
      `CREATE TABLE IF NOT EXISTS kt_docs (
         kind text NOT NULL,
         id   text NOT NULL,
         data jsonb NOT NULL,
         PRIMARY KEY (kind, id)
       )`,
    );
    const { rows } = await pool.query('SELECT kind, data FROM kt_docs');
    for (const row of rows) if (data[row.kind]) data[row.kind].set(row.data.id, row.data);

    // Writes run one after another so a later save can never be overtaken by an earlier one.
    let queue = Promise.resolve();
    const save = (kind, doc) => {
      const snapshot = JSON.stringify(doc);
      queue = queue
        .then(() =>
          pool.query(
            `INSERT INTO kt_docs (kind, id, data) VALUES ($1, $2, $3)
             ON CONFLICT (kind, id) DO UPDATE SET data = EXCLUDED.data`,
            [kind, doc.id, snapshot],
          ),
        )
        .catch((e) => console.error(`Could not save ${kind}/${doc.id}:`, e.message));
      return queue;
    };
    return { ...data, save, flush: () => queue, persistent: true };
  }

  const dir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const file = path.join(dir, 'data.json');
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const kind of KINDS) for (const doc of saved[kind] || []) data[kind].set(doc.id, doc);
  } catch {
    /* first run */
  }
  let timer = null;
  const write = () => {
    timer = null;
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ users: [...data.users.values()], orders: [...data.orders.values()] }));
    } catch (e) {
      console.error('Could not save data:', e.message);
    }
  };
  const save = () => {
    if (!timer) timer = setTimeout(write, 300);
    return Promise.resolve();
  };
  return { ...data, save, flush: async () => write(), persistent: false };
}

module.exports = { createStore };
