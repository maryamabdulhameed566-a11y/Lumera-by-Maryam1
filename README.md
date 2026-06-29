# Luméra by Maryam

A beauty / skincare / self-care affiliate storefront: shop page with Amazon links,
real login & registration, an admin panel to manage products, and an AI chat
assistant for customers. Built as plain HTML/CSS/JS so it can be hosted free on
GitHub Pages, backed by Firebase (accounts + database) and one small Cloud
Function (AI chat).

## What's in here

```
index.html        the storefront
login.html         customer log in
register.html       customer create account
admin-login.html     YOUR admin sign-in (username + password)
admin.html          product manager (only you can get in)
css/style.css       all styling
js/                 firebase-config, auth, products, chat-widget, admin
assets/logo.png      your brand mark
functions/           the Cloud Function that talks to the AI on your behalf
firestore.rules      who can read/write your database
storage.rules        who can upload product photos
firebase.json        deploy config for functions + rules
```

You don't need to know how to code to finish setup — just follow the steps below in order. It takes about 25–30 minutes the first time.

---

## 1. Set up Firebase (accounts + database)

1. Go to **console.firebase.google.com** and click **Add project**. Name it anything (e.g. "lumera-by-maryam"). You can skip Google Analytics.
2. In the left sidebar, open **Build → Authentication → Get started**. Under "Sign-in method," enable **Email/Password**.
3. Open **Build → Firestore Database → Create database**. Choose a region close to you, start in **production mode**.
4. Open **Build → Storage → Get started**. Same region, production mode. (This is where product photos live.)
5. Click the **gear icon → Project settings**, scroll to "Your apps," click the **`</>`  (web)** icon, give it a nickname, and register the app. Firebase will show you a `firebaseConfig` object.
6. Open `js/firebase-config.js` in this project and paste your values into the `firebaseConfig` object at the top.
7. In the same file, set `ADMIN_EMAIL` to the exact email address **you** will register with — this is the account that unlocks `/admin.html`. Also set `ADMIN_USERNAME` to any short username you'll remember — this is what you'll actually type in day-to-day on your private admin login page, instead of your email.
8. Open `firestore.rules` and `storage.rules` and replace `"you@example.com"` with that same admin email (lowercase) in both files.
9. Back in the Firebase console, go to **Firestore → Rules**, paste in the contents of `firestore.rules`, and click **Publish**. Do the same for **Storage → Rules** with `storage.rules`.

At this point login, registration, and the storefront will work. Products won't show yet because there aren't any — that's step 3.

## 2. Get an AI (Anthropic) API key

1. Go to **console.anthropic.com**, sign up, and create an API key under **API Keys**.
2. Keep this key private — never paste it into any HTML/JS file. It only goes into the Cloud Function setup below, which keeps it on the server, hidden from visitors.
3. Note that API usage is billed per request (typically fractions of a cent per chat message) — check Anthropic's current pricing page.

## 3. Deploy the chat function

This is the only part that uses a command line (Terminal on Mac, or Command Prompt/PowerShell on Windows).

1. Install Node.js from **nodejs.org** if you don't have it.
2. Install the Firebase CLI:
   ```
   npm install -g firebase-tools
   ```
3. Log in:
   ```
   firebase login
   ```
4. From inside this project folder, connect it to your Firebase project:
   ```
   firebase use --add
   ```
   Pick the project you created in Step 1.
5. Store your Anthropic key as a secret (the CLI will prompt you to paste it — it's encrypted, not stored in this repo):
   ```
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
6. Deploy:
   ```
   firebase deploy --only functions
   ```
7. When it finishes, copy the function URL it prints (looks like `https://us-central1-YOUR_PROJECT.cloudfunctions.net/chatWithAI`).
8. Paste that URL into `js/firebase-config.js` as `CHAT_FUNCTION_URL`.

The customer chat widget and the admin "✨ Generate with AI" button both use this same function.

## 4. Put it on GitHub

1. Create a new repository on GitHub (e.g. `lumera-by-maryam`).
2. Push this whole folder to it (drag-and-drop upload works fine too, since there's no build step).
3. In the repo, go to **Settings → Pages**. Under "Build and deployment," choose **Deploy from a branch**, pick your main branch and `/ (root)`, then **Save**.
4. GitHub gives you a live URL after a minute or two (something like `https://yourusername.github.io/lumera-by-maryam/`).

## 5. Go live

1. Visit your new site and click **Join** — register **once** with the exact admin email you set in Step 1. (This is the only time you'll use that email directly — it creates your account.)
2. From now on, go to `/admin-login.html` (not the regular login page) and sign in with your **username** + the same password — this is your private admin entrance. Bookmark this URL; it isn't linked anywhere on the public site.
3. You should land in the product manager instead of being turned away.
4. Add your first product: name, category, an Amazon affiliate link, and a photo. Try **✨ Generate with AI** to fill in the description and image alt text from the product name, then edit to taste.
5. Visit the homepage — your product should appear in the grid immediately.

## A few practical notes

- **Categories**: ships with your 3 beauty pillars (Beauty, Skincare, Self-Care) plus general ones (Electronics, Home, Fashion, Other) so any Amazon product can be sorted. Typing a product name auto-picks a category instantly from a keyword list, and the "✨ Generate with AI" button double-checks it with real AI. To add more categories later, update the `CATEGORIES` array and `CATEGORY_KEYWORDS` in `js/admin.js`, the matching `VALID` list in `functions/index.js`, and the filter chips in `index.html`.
- **About admin-login.html**: it's a separate, unlisted page so day-to-day admin sign-in feels distinct from the customer login — but the actual security boundary is still your password plus `firestore.rules`/`storage.rules`, same as before. Anyone who somehow knew your admin email and password could also sign in through the regular `login.html` — there's nothing wrong with that, it's just how Firebase sessions work; the password is what matters, not which page you typed it into.
- **Editing price/details later**: open `/admin.html`, click **Edit** on any product row, change whatever changed (price, link, photo, etc.), and click **Save product** — it updates live everywhere on the site, no need to delete and re-add.
- **Amazon affiliate links**: you'll need your own Amazon Associates account (affiliate-program.amazon.com) to generate the `amzn.to` links you paste into the admin form. Amazon requires the affiliate disclosure shown in this site's footer and chat — don't remove it.
- **Prices**: the price field here is just a reference for shoppers; Amazon's own page always shows the live, accurate price. Amazon's program terms don't allow displaying their exact price/availability data outside Amazon, which is why the product card says "Price set on Amazon."
- **This isn't legal advice** — for anything about taxes, disclosures, or your specific Associates agreement, check Amazon's official program terms or a professional.
- **Costs**: GitHub Pages is free. Firebase's free tier comfortably covers a small shop. The only ongoing cost is Anthropic API usage for the AI chat, which scales with how many messages visitors send.
