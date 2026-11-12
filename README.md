# Kaon Tangub — food delivery app (iOS & Android)

Customer-side marketplace app built with Expo (SDK 58), React Native, TypeScript and Expo Router.

## Try it (web + server, one command)

```bash
npm install
npm run serve
```

Open http://localhost:3000 on two browsers/phones: one orders food, the other opens
**Profile → Rider mode**, accepts the order and shares live GPS.

## Share with friends

Deploy the repo to any Node host (a `render.yaml` for Render is included). The server
serves both the API and the web app, so the deploy URL is the link you share.
GPS in the browser needs HTTPS, which hosted URLs have.

## Run on phones with Expo Go

```bash
EXPO_PUBLIC_API_URL=https://your-deployed-url npx expo start
```

## How it works

- `server/index.js` – dependency-free Node server: orders, rider assignment, live rider GPS,
  and static hosting of the web build. Orders are kept in `data/orders.json`.
- `src/api.ts` – client for the server. Order screens poll every few seconds.
- `src/app/rider.tsx` – rider mode: accept, picked up, delivered; sends GPS every 3 s while open.
- `src/components/TangubMap.tsx` (native, react-native-maps) / `TangubMap.web.tsx` (Leaflet + OpenStreetMap).
- `shared/tangub-bounds.json` – the delivery area (approximate box around Tangub City), enforced by
  both app and server: delivery pins and rider GPS outside it are rejected.
- `src/data/restaurants.ts` – sample restaurants and menus.

## Known limits (trial version)

- No logins: each device gets a random id; anyone can open rider mode.
- No real payments. Menus and restaurant locations are sample data.
- Rider GPS is shared only while the rider screen is open (no background tracking).
- Android store builds need a Google Maps API key.
