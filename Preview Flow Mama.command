#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if ! command -v node >/dev/null 2>&1; then
  print "Install Node.js, then reopen this launcher. See MAC_SETUP.md."
  read "?Press Return to close."
  exit 1
fi
if [[ ! -f node_modules/next/dist/bin/next ]]; then
  node scripts/setup.mjs || { read "?Setup failed. Press Return to close."; exit 1; }
fi
node scripts/preview.mjs
read "?Preview stopped. Press Return to close."
