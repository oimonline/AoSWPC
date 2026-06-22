import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDataBundleFromCsvTexts,
  REQUIRED_DATA_FILES,
  SAMPLE_SOURCE_TYPE
} from "../src/data/importPipeline.js";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sampleDataDir = path.resolve(projectRoot, "sample-data", "aos4-export");
const outputDir = path.resolve(projectRoot, "public", "generated");
const outputPath = path.resolve(outputDir, "sample-aos4-warscroll-data.json");
const sampleGeneratedAt = "2026-06-20T00:00:00.000Z";

main().catch((error) => {
  console.error("");
  console.error("Synthetic sample data generation failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  ensureInside(projectRoot, sampleDataDir, "sample data directory");
  ensureInside(projectRoot, outputPath, "generated sample data output");

  const fileTexts = await readSampleFiles();
  const bundle = createDataBundleFromCsvTexts(fileTexts, {
    generatedAt: sampleGeneratedAt,
    sourceType: SAMPLE_SOURCE_TYPE
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  const parsed = JSON.parse(await readFile(outputPath, "utf8"));

  if (parsed.schemaVersion !== 1 || parsed.source?.type !== SAMPLE_SOURCE_TYPE) {
    throw new Error("Generated sample bundle parsed but has invalid metadata.");
  }

  const outputStats = await stat(outputPath);

  console.log("Generated synthetic sample AoS warscroll data.");
  console.log(`Source timestamp: ${bundle.source.version ?? "unknown"}`);
  console.log(`Warscrolls: ${Object.keys(bundle.warscrollsById).length.toLocaleString("en-US")}`);
  console.log(`Catalogue entries: ${bundle.catalogue.length.toLocaleString("en-US")}`);
  console.log(`Output: ${path.relative(projectRoot, outputPath)}`);
  console.log(`Output size: ${outputStats.size.toLocaleString("en-US")} B`);

  if (bundle.warnings.length > 0) {
    console.log("Warnings:");
    bundle.warnings.forEach((warning) => console.log(`- ${warning}`));
  } else {
    console.log("Warnings: none");
  }
}

async function readSampleFiles() {
  const fileTexts = {};

  for (const fileName of Object.values(REQUIRED_DATA_FILES)) {
    const filePath = path.resolve(sampleDataDir, fileName);
    ensureInside(sampleDataDir, filePath, fileName);
    fileTexts[fileName] = await readFile(filePath, "utf8");
  }

  return fileTexts;
}

function ensureInside(parentDir, childPath, label) {
  const relative = path.relative(parentDir, childPath);

  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }

  throw new Error(`${label} resolves outside ${parentDir}: ${childPath}`);
}
