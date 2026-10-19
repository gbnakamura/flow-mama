import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error("Please install Node.js 20.9 or newer, then try again.");
  process.exit(1);
}
console.log("Installing the project's locked dependencies. No credentials are needed.");
const result = spawnSync("npm", ["ci"], { stdio: "inherit" });
if (result.error) console.error(result.error.message);
if (result.error || result.status !== 0) process.exit(result.status || 1);
console.log("Ready. Run npm run preview or double-click Preview Flow Mama.command.");
