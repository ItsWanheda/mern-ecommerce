import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set(["node_modules", ".next", "coverage"]);
const sourceFiles = [];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) await collect(path.join(directory, entry.name));
      continue;
    }
    if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) sourceFiles.push(path.join(directory, entry.name));
  }
}

await collect(backendRoot);
sourceFiles.sort();
const failures = [];
for (const file of sourceFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) failures.push({ file: path.relative(backendRoot, file), output: result.stderr || result.stdout });
}

if (failures.length) {
  for (const failure of failures) console.error(`\n${failure.file}\n${failure.output}`);
  console.error(`\nSyntax validation failed for ${failures.length} of ${sourceFiles.length} files.`);
  process.exitCode = 1;
} else {
  console.info(`Syntax validation passed for ${sourceFiles.length} JavaScript and MJS files.`);
}
