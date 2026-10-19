# Flow Mama Northfields

Website, class bookings and admin tools built with Next.js, React and TypeScript, with Supabase, Stripe and Resend integrations.

## Start here

- [MacBook setup](MAC_SETUP.md): one-time installation and account checklist.
- [Amber’s editing guide](EDITING_GUIDE.md): describe a change, check it, publish it.

```bash
npm run setup
npm run preview
```

Open http://127.0.0.1:4173. Preview needs no secrets and disables integration credentials in its child process. Sample bookings and admin data are available; real sign-in, reservations, payments and emails are unavailable. Stop with Control-C.

`npm run dev` uses normal environment configuration and can connect to real services. Use `npm run preview` for everyday editing. Restart preview after editing `.env.example` or the launcher. External links on pages still lead to their destinations.

## Where things live

- `public/index.html`, `public/styles.css`, `public/script.js`: main homepage, styling and interactions. `/` rewrites to `/index.html`.
- `public/images/`: website photographs and logo.
- `app/`, `components/`: booking, personal training, Stay & Play and admin pages.
- `lib/`: database, payment, email and booking logic.
- `supabase/migrations/`: database changes; these need a separate database release step.
- `.env.example`: configuration names only; keep actual credentials out of Git.

## Checks and deployment

Run `npm run typecheck` and `npm run build` before preparing a release. Follow `AGENTS.md` and update `CHANGELOG.md` as required. Build validation is separate from the local demo server: stop preview before building because both use `.next`.

`vercel.json` contains hosting rules, but does not establish the connected Vercel project, production branch or account access. Confirm those in Vercel before enabling publishing. Do not assume a push is harmless: a configured production branch may deploy automatically.

A hosted booking preview needs a separate Supabase database, Stripe test credentials and restricted test email delivery. The local demo admin bypass applies only in development; a production-mode hosted preview will require configured authentication. Never copy production credentials to make a preview work.

See `STRIPE_SETUP.md` for existing payment setup notes.
