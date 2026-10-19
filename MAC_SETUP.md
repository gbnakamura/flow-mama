# Set up Amber’s MacBook Air

## One-time setup together

1. Install the Codex desktop app and sign in with Amber’s own account. Check current account access at https://learn.chatgpt.com/docs/app.
2. Install a supported Node.js LTS release from https://nodejs.org (minimum 20.9). The standard Mac installer includes npm. Reopen Terminal after installation.
3. Run `git --version` in Terminal. If macOS offers Command Line Tools, install them and retry.
4. Give Amber’s GitHub account access to this repository. Clone it into a local folder such as `~/Projects/flowmama`; avoid a shared iCloud/Dropbox working folder. Use the actual repository URL from GitHub’s Code button.
5. Open that folder in Codex. Ask: “Set up this project using MAC_SETUP.md, then start the demo preview.” Codex should run `npm run setup`, then `npm run preview`. No `.env.local` or production credentials are needed.
6. Visit http://127.0.0.1:4173 and http://127.0.0.1:4173/admin. Check the homepage, booking sample data and admin sample data.
7. Optional: make the Finder launcher executable with `chmod +x "Preview Flow Mama.command"`. Double-click it to start preview in Terminal. If macOS blocks it, use Codex to run `npm run preview`; do not disable system security settings.

The launcher installs locked dependencies only if Next.js is missing. After pulling dependency changes, ask Codex to run setup again. The launcher prints the browser address; it does not open Safari automatically.

## Publishing setup to finish with the repository owner

- Confirm the GitHub repository is connected to the intended Vercel project and identify its production branch.
- Give Amber appropriate GitHub and Vercel access using her own accounts.
- Configure branch previews. Keep production service credentials out of preview environments. Without separate test services, use local demo preview for booking changes.
- Configure required build/type checks and a release workflow that Amber can use independently. Branch protection requiring another person's approval would prevent independent publishing.
- Walk through one small change: a working branch, preview, checks, explicit publish instruction, deployment confirmation and rollback.
- Record the actual production URL, project and rollback steps once verified. No account connection or deployment policy is established by these files alone.

For rollback, use the verified deployment platform’s previous working deployment to restore service; then revert the corresponding Git change so the next deployment does not reintroduce it. A site rollback does not reverse database migrations, payments or sent emails.

## Troubleshooting

- “node not found”: install Node.js and reopen Terminal/Codex.
- Installation error: give Codex the error and ask it to diagnose; avoid deleting the lockfile or upgrading packages as a first step.
- Port 4173 already in use: stop the previous preview with Control-C. Ask Codex to identify the process before stopping anything else.
- Blank or stale page after a build: stop preview, ask Codex to clear the generated `.next` folder, then restart preview.
- A real checkout or login fails in demo preview: expected; these require a separate test integration environment.
