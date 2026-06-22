import type {
  CsvRow,
  DataErrorCode,
  DataSourceType,
  GeneratedDataBundle,
  RawDataSet
} from "../types";

export const SCHEMA_VERSION: 1;
export const GAME: "aos4";
export const LEGACY_SOURCE_TYPE: "wahapedia-csv-export";
export const SAMPLE_SOURCE_TYPE: "synthetic-sample-csv-export";
export const USER_SOURCE_TYPE: "user-supplied-wahapedia-csv-export";

export const REQUIRED_DATA_FILES: {
  factions: "Factions.csv";
  sources: "Source.csv";
  warscrolls: "Warscrolls.csv";
  weapons: "Warscrolls_weapons.csv";
  abilities: "Warscrolls_abilities.csv";
  keywords: "Warscrolls_keywords.csv";
  bases: "Warscrolls_bases.csv";
  lastUpdate: "Last_update.csv";
};

export const REQUIRED_HEADERS: Record<keyof typeof REQUIRED_DATA_FILES, string[]>;

export class DataImportError extends Error {
  code: DataErrorCode;
  constructor(code: DataErrorCode, message: string, options?: ErrorOptions);
}

export interface CreateBundleOptions {
  generatedAt?: string;
  sourceType?: DataSourceType;
  warnings?: string[];
}

export function createDataBundleFromCsvTexts(
  fileTextsByName: Record<string, string>,
  options?: CreateBundleOptions
): GeneratedDataBundle;

export function createDataBundleFromRows(
  rows: RawDataSet,
  options?: CreateBundleOptions
): GeneratedDataBundle;

export function validateGeneratedBundle(value: unknown): GeneratedDataBundle;

export function parsePipeDelimitedCsv(
  text: string,
  fileName?: string,
  requiredHeaderNames?: string[]
): { headers: string[]; rows: CsvRow[] };
