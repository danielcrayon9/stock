import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const content = readFileSync(".env.local", "utf8");
const vars = {};
for (const line of content.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  if (key && val) vars[key] = val;
}

const targets = ["production", "preview", "development"];
const keys = Object.keys(vars);
console.log(`Pushing ${keys.length} keys to Vercel: ${keys.join(", ")}`);

for (const key of keys) {
  for (const env of targets) {
    // Remove existing value first (ignore errors), then add fresh.
    spawnSync("vercel", ["env", "rm", key, env, "-y"], { shell: true, stdio: "ignore" });
    const res = spawnSync("vercel", ["env", "add", key, env], {
      shell: true,
      input: vars[key],
      stdio: ["pipe", "ignore", "inherit"],
    });
    console.log(`${res.status === 0 ? "OK " : "ERR"} ${key} [${env}]`);
  }
}

console.log("done");
