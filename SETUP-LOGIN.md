# Turning on sign-in and the permanent database

The app needs three things that only the owner can create. All are free.
Do them in this order, then add the four settings to Render (step 4).

Button and menu names on these websites change now and then – if a label is slightly
different from what is written here, look for the closest match.

## 1. Database (Neon) – keeps accounts and orders permanently

1. Go to **neon.tech** and sign up (you can use your Google account).
2. Create a project. Any name, e.g. `kaon-tangub`. Pick the region closest to the Philippines (Singapore).
3. On the project page, find **Connection string** and copy it.
   It starts with `postgresql://` and is one long line.
4. Keep it private – it is the password to your data. This is your `DATABASE_URL`.

## 2. Google sign-in – a "Client ID" from Google

1. Go to **console.cloud.google.com** and sign in with the Google account that should own the app.
2. Create a new project, e.g. `Kaon Tangub`.
3. Open **APIs & Services → OAuth consent screen** (may be called **Google Auth Platform**).
   - User type: **External**.
   - App name: `Kaon Tangub`. Support email and developer email: yours.
   - Save. Then **publish** the app (move it from "Testing" to "In production"),
     otherwise only test users you list by hand can sign in.
4. Open **Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: add `https://kaon-tangub.onrender.com`
     (exactly – no slash at the end).
   - Leave "Authorized redirect URIs" empty.
5. Copy the **Client ID**. It ends with `.apps.googleusercontent.com`.
   This is your `GOOGLE_CLIENT_ID`. (The "client secret" is not needed.)

## 3. Decide who the owner is

The owner approves riders. Write down the Google email(s) that should have that power,
separated by commas. This is your `ADMIN_EMAILS`, e.g. `you@gmail.com`.

## 4. Put the settings into Render

Render dashboard → **kaon-tangub** service → **Environment** → add these variables, then save:

| Key | Value |
|---|---|
| `DATABASE_URL` | the Neon connection string from step 1 |
| `GOOGLE_CLIENT_ID` | the Client ID from step 2 |
| `ADMIN_EMAILS` | your Google email(s) from step 3 |
| `SESSION_SECRET` | any long random text (40+ letters and numbers). Keep it private and never change it – changing it signs everyone out. |

Never add `ALLOW_TEST_LOGIN` on Render. It is for testing on a developer's computer only
and would let anyone sign in as anyone.

## How it works once it is on

- **Customers** browse freely and tap **Sign in with Google** when they check out.
- **Riders** do not use the customer screens. Give them this link:
  `https://kaon-tangub.onrender.com/rider`
  They sign in with Google, fill in name, mobile number and vehicle, and wait.
- **You** open `https://kaon-tangub.onrender.com/admin` (or Profile → Rider approvals),
  signed in with an `ADMIN_EMAILS` account, and tap **Approve**. The rider's screen unlocks by itself.
  You can **Suspend** a rider at any time.
- Customers never see rider mode. Approved riders get a "Rider mode" shortcut in their own Profile.
