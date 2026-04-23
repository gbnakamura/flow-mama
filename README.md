# Flow Mama Northfields — Website

A single-page static site for Flow Mama Northfields.

## What's here

```
flow-mama/
├── index.html       # the whole page
├── styles.css       # all styling
├── script.js        # scroll reveals, mobile menu, parallax
├── vercel.json      # Vercel deployment config
└── images/          # optimised photos + logo
```

## Before you deploy — placeholders to fill in

Open `index.html` and replace these bracketed placeholders:

- `[ABOUT_BLURB]` — the About section paragraph (About Amber / Flow Mama's story)
- `[PHONE_NUMBER]` — appears twice (in the `tel:` link and the display text)
- `[TESTIMONIAL_1]` through `[TESTIMONIAL_4]` — the four quote blocks
- `[Name], mum to [Baby]` — attribution under each testimonial

Everything else (pricing, booking URL, times, email, Instagram) is already plugged in.

## Deploying to Vercel

### Option 1 — Drag & drop (easiest)
1. Go to https://vercel.com/new
2. Drag the entire `flow-mama` folder onto the page
3. Click **Deploy**. Done.

### Option 2 — Vercel CLI
```bash
npm i -g vercel
cd flow-mama
vercel
```
Follow the prompts. First run sets up the project; subsequent `vercel --prod` pushes updates.

### Option 3 — Git-connected (recommended for ongoing edits)
1. Push this folder to a GitHub repo
2. Import the repo on Vercel
3. Every push to `main` auto-deploys

## Custom domain

Once deployed, add your custom domain in **Project Settings → Domains** on Vercel. If you own e.g. `flowmamanorthfields.com`, point its DNS at Vercel's nameservers (they give you the exact records).

## Editing the site later

All content is in plain HTML — open `index.html` in any text editor and edit directly. Colours live at the top of `styles.css` as CSS variables (`--coral`, `--sage`, `--cream` etc.) so you can rebrand in seconds.

## Tech notes

- Pure HTML/CSS/JS — no build step, no framework
- Fonts: Nunito (display, Uni Neue substitute) + Jost (body, Avenir substitute) via Google Fonts
- Images pre-optimised to ~150–360 KB each
- Respects `prefers-reduced-motion`
- Mobile nav, smooth scrolling, scroll-triggered reveals built in
