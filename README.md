# Bloom360 Initiative

A multi-page Cloudflare Worker site with ChatGPT sign-in and Cloudflare D1 persistence.

`npm run build` produces `dist/server/index.js`. Apply the SQL migration from `drizzle/` to the database bound as `DB`. The Sites host supplies and authenticates the signed-in identity headers. Run the worker behind that identity integration.

Before opening member registration, configure a strong random secret named `ADMIN_SETUP_CODE` in Site settings and deploy a version with that configuration. Visit `/account`, sign in with ChatGPT, and submit the code. The first completed registration becomes the administrator. Subsequent registrations become members. The setup code can be removed after the administrator is created.

Visit `/admin` to publish or hide content, review submissions, export newsletter subscribers, or update homepage and founder details. An item must be published and carry the label `Open` to accept program applications or event registrations. Newsletter signup stores addresses. Delivery requires a mailing service.
