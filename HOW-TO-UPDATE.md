# How to update Kaon Tangub

Everything about the stores – names, menus, prices, promos, who is featured – lives in **one file**:

```
shared/stores.json
```

You can edit it right on GitHub, no tools needed:

1. Open your repository on github.com and go to `shared/stores.json`.
2. Click the pencil icon (Edit).
3. Make your change (see below).
4. Click **Commit changes**.

The hosted app rebuilds itself and the change is live a few minutes later. If you made a
typing mistake, the rebuild stops and the live app simply stays on the previous version –
nothing breaks. The error message (in your host's deploy log) says which store and field is wrong.

## Add a store

Copy this block, paste it inside the `"stores": [ ... ]` list (stores are separated by commas),
and change the values:

```json
{
  "id": "aling-nena",
  "name": "Aling Nena's Carinderia",
  "featured": false,
  "cuisine": "Filipino · Home cooking",
  "categories": ["filipino"],
  "emoji": "🍲",
  "tint": "#FFE8C7",
  "promo": "Free rice with every meal",
  "etaMin": 15,
  "etaMax": 25,
  "deliveryFee": 29,
  "minOrder": 100,
  "location": { "latitude": 8.0650, "longitude": 123.7530 },
  "menu": [
    {
      "title": "Meals",
      "items": [
        { "id": "an1", "name": "Chicken Adobo", "description": "With rice", "price": 120, "emoji": "🍗", "popular": true },
        { "id": "an2", "name": "Pancit Canton", "description": "Good for two", "price": 150, "emoji": "🍜" }
      ]
    }
  ]
}
```

What each field means:

| Field | Meaning |
|---|---|
| `id` | Short unique name: small letters, numbers and dashes only. Never change it later. |
| `featured` | `true` puts the store at the top of the home screen with a "Featured" badge. |
| `cuisine` | The grey line under the store name. |
| `categories` | Which filter buttons show this store. Must match an `id` in the `categories` list at the top of the file. |
| `emoji`, `tint` | The store's picture and its background colour. |
| `promo` | Optional yellow badge text. Delete the line for no promo. |
| `rating`, `reviews` | Optional. Leave them out and the store shows "New". |
| `etaMin`, `etaMax` | Delivery time in minutes. |
| `deliveryFee`, `minOrder`, `price` | Pesos, as plain numbers – no quotes, no ₱ sign. `0` delivery fee shows "Free delivery". |
| `location` | Where the store is. In Google Maps, press and hold on the store, then copy the two numbers shown (latitude first). Must be inside Tangub City. |
| item `id` | Every menu item in the whole file needs its own id (e.g. `an1`, `an2`). |
| `popular` | Optional `true` adds a "Popular" tag to the item. |

## Promote (feature) a store

Change its `"featured": false` to `"featured": true`. Change it back to stop promoting it.

## Add a category button

Add a line to the `categories` list at the top of the file, for example:

```json
{ "id": "filipino", "label": "Filipino", "emoji": "🍲" }
```

## Remove a store

Delete its whole `{ ... }` block (and the comma before or after it).

## Other things you may want to change

| What | Where |
|---|---|
| App colours | `src/theme.ts` |
| App icon / logo | `assets/icon.png` (1024×1024) – then ask for the other icon sizes to be regenerated |
| Delivery area | `shared/tangub-bounds.json` |
| Service fee (5%) | `SERVICE_FEE_RATE` in `src/store/AppContext.tsx` |
| Tip buttons, payment options | top of `src/app/checkout.tsx` |
