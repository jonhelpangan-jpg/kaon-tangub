# Kaon Tangub — food delivery app (iOS & Android)

Customer-side marketplace app built with Expo (SDK 58), React Native, TypeScript and Expo Router.

## Try it locally (web + server)

```bash
npm install
ALLOW_TEST_LOGIN=1 ADMIN_EMAILS=owner@test.com npm run serve
```

Open http://localhost:3000. `ALLOW_TEST_LOGIN=1` adds a password-less test login so you can
act as a customer, a rider (`/rider`) and the owner (`/admin`) without Google. Never set it on the live site.

## Share with friends

Deploy the repo to any Node host (a `render.yaml` for Render is included). The server
serves both the API and the web app, so the deploy URL is the link you share.
GPS in the browser needs HTTPS, which hosted URLs have.

## Run on phones with Expo Go

```bash
EXPO_PUBLIC_API_URL=https://your-deployed-url npx expo start
```

## How it works

- `server/index.js` – Node server: sign-in, orders, rider registration and approval, live rider GPS,
  and static hosting of the web build. `server/auth.js` verifies Google sign-in; `server/store.js`
  saves users and orders to Postgres (`DATABASE_URL`) or to a local file when it is not set.
- `src/api.ts` – client for the server. Order screens poll every few seconds.
- `src/store/AuthContext.tsx`, `src/app/sign-in.tsx` – Google sign-in (web).
- `src/app/rider.tsx` – riders' entry point (`/rider`): sign in, register, then accept / pick up / deliver;
  sends GPS every 3 s while open. `src/app/admin.tsx` – owner approves riders (`/admin`).
- `src/components/TangubMap.tsx` (native, react-native-maps) / `TangubMap.web.tsx` (Leaflet + OpenStreetMap).
- `shared/tangub-bounds.json` – the delivery area (approximate box around Tangub City), enforced by
  both app and server: delivery pins and rider GPS outside it are rejected.
- `shared/stores.json` – stores and menus. See `HOW-TO-UPDATE.md`.
- `SETUP-LOGIN.md` – one-time setup of the database and Google sign-in.

## Known limits

- Google sign-in works in the web version; the iOS/Android builds need their own Google client IDs.
- No real payments. Menus and store locations are sample data.
- Rider GPS is shared only while the rider screen is open (no background tracking).
- Android store builds need a Google Maps API key.
