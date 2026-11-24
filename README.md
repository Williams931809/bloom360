# Bloom360 Initiative

Vercel renders the public website on `thebloom360initiative.com`. It sends account, admin and form requests to the Cloudflare Worker without changing the browser URL. The Worker handles authentication and application writes. Cloudflare D1 stores published content, site settings, submissions, accounts and sessions.

- Vercel builds with `node scripts/build-vercel.mjs`. The artifacts go to `.vercel/output`.
- Build the Cloudflare Worker with `node scripts/build-cloudflare.mjs`. Deploy `dist/server/cloudflare.js` as an ES module.
- Apply the SQL migrations under `drizzle/` in order. Bind the database as `DB`. Set the Worker's `AUTH_MODE` to `standalone` and `SITE_ORIGIN` to the production site origin. The Worker uses that origin to validate form submissions.
- Add a strong random Worker secret named `ADMIN_SETUP_CODE`. The first completed signup at `/signup` uses this code and becomes the administrator. Later signups become members. The code can be removed after admin registration.
- Use `/admin` to manage content, review submissions, export subscribers and update site settings. A published program or event with the label `Open` accepts submissions. Newsletter signup stores addresses for export.

The original ChatGPT Sites build is available through `npm run build` and uses the separate Sites database and identity integration.

Homepage photography by [Christina Morillo on Pexels](https://www.pexels.com/photo/woman-using-macbook-pro-1181474/).
