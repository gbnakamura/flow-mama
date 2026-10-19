# Making changes to Flow Mama

For everyday session and customer management, use the live admin pages. For wording, photos or layout changes, open the Flow Mama project in Codex.

## Make a change

Tell Codex what you want, for example:

> Start the demo preview. Change the About section to this text: […]. Show me where to check it. Don’t publish yet.

> Replace the main photo with the image I’ve attached. Check it on a narrow phone screen and a laptop screen.

> Add this testimonial: […]. Keep the existing style and show me a preview.

Open http://127.0.0.1:4173 to check the result. Ask for adjustments until you’re happy. The preview uses sample data; making a demo booking does not reserve a real place.

## Publish when ready

> I’m happy with the preview. Run the checks and explain what will go live. Publish this change using the configured release process.

Publishing requires the account setup in MAC_SETUP.md to be completed first. Codex should tell you the live address and whether deployment succeeded. If publishing is not configured, it should explain what is missing.

## Undo or get help

Before publishing: “Undo the changes from this task, keeping any earlier work.”

After publishing: “Restore the previous working website and prepare a Git revert for this release. Tell me what will change before doing it.”

If something looks wrong, describe what you expected and what happened. A screenshot helps. Never paste passwords, API keys or customer lists into a prompt.

Stop the local preview with Control-C in its Terminal window, or ask Codex to stop the preview it started.
