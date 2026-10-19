<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Changelog policy

Before every push that changes the Flow Mama site, booking flow, admin tools, customer communications, integrations, or deployment configuration, update `CHANGELOG.md` with a concise, user-facing summary under `Unreleased`. When changes are deployed to the live website, move the relevant entries into a dated release section. Never include secrets or private configuration values in the changelog.

## Everyday editing and releases

- The site owner may use plain English and may not know Git or terminal commands. Perform routine setup, start preview, explain results simply, and provide the address to inspect.
- Read README.md, MAC_SETUP.md and EDITING_GUIDE.md for this workflow. Use `npm run setup` for locked dependency installation and `npm run preview` for everyday local preview. Do not copy production credentials onto an editing laptop or switch to credentialed `npm run dev` to fix demo limitations.
- Homepage content lives in public/index.html, public/styles.css and public/script.js; booking/admin code lives in app/, components/ and lib/.
- Inspect existing changes before editing. Preserve unrelated work. Sync with the remote when authenticated and appropriate; do not discard work or force-push to resolve divergence. Prepare edits on a working branch, away from any automatically deployed production branch.
- Check edited pages at laptop and phone widths when browser tools are available. Run `npm run typecheck` and `npm run build` before release; stop demo preview before the build because they share .next. State any checks that could not run.
- Routine edit requests authorize local edits and previews. Publishing requires an explicit user instruction to publish this change. Before that instruction, do not push to a production-deploying branch, merge a release, deploy to production, or run database migrations. Instructions persist for the authorized change.
- Before publishing, verify the actual GitHub/Vercel connection, production branch and release procedure. Do not infer these from vercel.json. If publishing is not configured, explain what is missing. Never claim a release succeeded without deployment evidence.
- Report the changed behavior, checks, preview or live URL, and any remaining limitations. Follow the changelog policy above. Never claim that a site rollback reverses database changes, payments or emails.
