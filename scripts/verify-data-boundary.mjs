import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

const forbiddenPaths = [
  "public/generated/aos4-warscroll-data.json",
  "dist/generated/aos4-warscroll-data.json",
  "scripts/refresh-data.mjs",
  "public/styles/wahapedia-like/source"
];

const forbiddenContentPatterns = [
  /wahapedia\.ru/i,
  /Brute Ragerz/,
  /Tuskboss/,
  /Ironjawz/,
  /Kragnos/,
  /Weirdnob/,
  /Beastlord/,
  /Bestigors/,
  /Bullgors/,
  /Ungors/,
  /Great Bray/
];

for (const relativePath of forbiddenPaths) {
  if (existsSync(path.join(root, relativePath))) {
    failures.push(`Forbidden artifact exists: ${relativePath}`);
  }
}

await verifyDataScratch();
await verifySampleBundle();
await scanTextContent("sample-data");
await scanTextContent("public/generated");
await scanTextContent("dist");

if (failures.length > 0) {
  console.error("Data boundary verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Data boundary verification passed.");
}

async function verifyDataScratch() {
  const dataDir = path.join(root, "data");

  if (!existsSync(dataDir)) {
    return;
  }

  const entries = await readdir(dataDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "README.md") {
      continue;
    }

    failures.push(`data/ must stay local-only and empty in source control: data/${entry.name}`);
  }
}

async function verifySampleBundle() {
  const sampleBundlePath = path.join(root, "public/generated/sample-aos4-warscroll-data.json");

  if (!existsSync(sampleBundlePath)) {
    failures.push("Missing generated sample bundle: public/generated/sample-aos4-warscroll-data.json");
    return;
  }

  try {
    const bundle = JSON.parse(await readFile(sampleBundlePath, "utf8"));

    if (bundle.source?.type !== "synthetic-sample-csv-export") {
      failures.push("Generated sample bundle does not declare synthetic sample source metadata.");
    }

    if (bundle.catalogue?.length !== 9) {
      failures.push(`Generated sample bundle should contain 9 catalogue entries, found ${bundle.catalogue?.length ?? "unknown"}.`);
    }
  } catch (error) {
    failures.push(`Generated sample bundle is not valid JSON: ${formatError(error)}`);
  }
}

async function scanTextContent(relativeDir) {
  const startDir = path.join(root, relativeDir);

  if (!existsSync(startDir)) {
    return;
  }

  for await (const filePath of walk(startDir)) {
    if (!isTextLike(filePath)) {
      continue;
    }

    const text = await readFile(filePath, "utf8");
    const relativePath = path.relative(root, filePath);

    for (const pattern of forbiddenContentPatterns) {
      if (pattern.test(text)) {
        failures.push(`Forbidden official-data marker ${pattern} found in ${relativePath}`);
      }
    }
  }
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walk(filePath);
    } else if (entry.isFile()) {
      yield filePath;
    }
  }
}

function isTextLike(filePath) {
  return [".csv", ".css", ".html", ".js", ".json", ".md", ".svg", ".txt"].includes(
    path.extname(filePath).toLowerCase()
  );
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
