/**
 * Runs after the web build. Makes the web app installable ("Add to Home Screen")
 * with the Kaon Tangub icon, opening full-screen like a normal app.
 */
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const assets = path.join(__dirname, '..', 'assets');

for (const f of ['pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png']) {
  fs.copyFileSync(path.join(assets, f), path.join(dist, f));
}

fs.writeFileSync(
  path.join(dist, 'manifest.json'),
  JSON.stringify({
    name: 'Kaon Tangub',
    short_name: 'Kaon Tangub',
    description: 'Food delivery in Tangub City',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFBF2',
    theme_color: '#E30613',
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }),
);

const tags = [
  '<link rel="manifest" href="/manifest.json"/>',
  '<meta name="theme-color" content="#E30613"/>',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>',
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-title" content="Kaon Tangub"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>',
].join('');

const indexFile = path.join(dist, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');
if (!html.includes('rel="manifest"')) {
  html = html
    .replace('</head>', `${tags}</head>`)
    .replace('content="width=device-width, initial-scale=1, shrink-to-fit=no"', 'content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"');
  fs.writeFileSync(indexFile, html);
}
console.log('Home-screen install files added to dist/');
