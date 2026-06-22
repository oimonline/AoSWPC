import {
  createDataBundleFromCsvTexts,
  DataImportError,
  USER_SOURCE_TYPE,
  validateGeneratedBundle
} from "./importPipeline.js";
import {
  AppError,
  type DataOrigin,
  type GeneratedDataBundle,
  type LoadedData
} from "../types";

const SAMPLE_DATA_URL = `${import.meta.env.BASE_URL}generated/sample-aos4-warscroll-data.json`;

export async function loadData(): Promise<LoadedData> {
  return loadSampleData();
}

export async function loadSampleData(): Promise<LoadedData> {
  try {
    const response = await fetch(SAMPLE_DATA_URL);

    if (!response.ok) {
      throw new AppError(
        "DATA_LOAD_FAILED",
        `Could not load sample data (${response.status}).`
      );
    }

    const bundle = validateGeneratedBundle(await response.json());
    return bundleToLoadedData(bundle, "sample");
  } catch (error) {
    throw toAppError(error, "Could not load synthetic sample data.");
  }
}

export async function loadUserDataFromFiles(files: File[] | FileList): Promise<LoadedData> {
  try {
    const fileTexts: Record<string, string> = {};

    for (const file of Array.from(files)) {
      fileTexts[file.name] = await file.text();
    }

    const bundle = createDataBundleFromCsvTexts(fileTexts, {
      sourceType: USER_SOURCE_TYPE
    });

    return bundleToLoadedData(bundle, "user");
  } catch (error) {
    throw toAppError(error, "Could not import the selected CSV files.");
  }
}

function bundleToLoadedData(
  bundle: GeneratedDataBundle,
  dataOrigin: DataOrigin
): LoadedData {
  return {
    dataOrigin,
    sourceVersion: bundle.source.version,
    sourceType: bundle.source.type,
    generatedAt: bundle.generatedAt,
    catalogue: bundle.catalogue,
    warscrollsById: bundle.warscrollsById,
    warnings: bundle.warnings
  };
}

function toAppError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof DataImportError) {
    return new AppError(error.code, error.message, { cause: error });
  }

  return new AppError("DATA_LOAD_FAILED", fallbackMessage, { cause: error });
}
