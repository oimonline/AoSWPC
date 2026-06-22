export type CsvCell = string | boolean | null;
export type CsvRow = Record<string, CsvCell>;

export type DataSourceType =
  | "wahapedia-csv-export"
  | "synthetic-sample-csv-export"
  | "user-supplied-wahapedia-csv-export";
export type DataOrigin = "sample" | "user";

export type DataErrorCode =
  | "DATA_LOAD_FAILED"
  | "CSV_PARSE_FAILED"
  | "WARSCROLL_NOT_FOUND"
  | "EMPTY_WARSCROLL";

export class AppError extends Error {
  code: DataErrorCode;

  constructor(code: DataErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
  }
}

export type SizeMode = "auto" | "half-a4" | "full-a4";
export type ResolvedSize = Exclude<SizeMode, "auto">;

export interface WarscrollStats {
  move: string | null;
  save: string | null;
  control: string | null;
  health: string | null;
  ward: string | null;
}

export interface WarscrollWeapon {
  name: string;
  type: "ranged" | "melee" | string;
  range: string | null;
  attacks: string | null;
  hit: string | null;
  wound: string | null;
  rend: string | null;
  damage: string | null;
  abilities: string[];
  hasBattleDamage: boolean;
}

export interface WarscrollAbility {
  name: string;
  type: string | null;
  kind: string;
  phase: string | null;
  timing: string | null;
  text: string;
  legend: string | null;
  tags: string[];
}

export interface BattleProfile {
  role: string | null;
  regimentOptions: string | null;
  notes: string | null;
}

export interface SourceMetadata {
  fetchedAt: null;
  sourceType: DataSourceType;
  sourceVersion: string | null;
  rawTitle: string;
  publication: string | null;
  publicationType: string | null;
  errataDate: string | null;
  errataLink: string | null;
}

export interface LayoutHints {
  recommendedSize: ResolvedSize;
  contentScore: number;
  hasOverflowRisk: boolean;
}

export interface Warscroll {
  id: string;
  sourceUrl: string;
  game: "aos4";
  faction: string;
  name: string;
  subtitle: string | null;
  flavorText: string | null;
  points: number | null;
  baseSize: string | null;
  unitSize: string | null;
  canReinforce: boolean;
  stats: WarscrollStats;
  weapons: WarscrollWeapon[];
  abilities: WarscrollAbility[];
  keywords: string[];
  battleProfile: BattleProfile;
  source: SourceMetadata;
  layoutHints: LayoutHints;
}

export interface CatalogueEntry {
  id: string;
  name: string;
  factionId: string;
  factionName: string;
  role: string | null;
  points: number | null;
  unitSize: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  sourceVersion: string | null;
  isVirtual: boolean;
  variantLabel: string | null;
  searchText: string;
}

export interface GeneratedDataBundle {
  schemaVersion: 1;
  game: "aos4";
  generatedAt: string;
  source: {
    type: DataSourceType;
    version: string | null;
  };
  catalogue: CatalogueEntry[];
  warscrollsById: Record<string, Warscroll>;
  warnings: string[];
}

export interface RawDataSet {
  factions: CsvRow[];
  sources: CsvRow[];
  warscrolls: CsvRow[];
  weapons: CsvRow[];
  abilities: CsvRow[];
  keywords: CsvRow[];
  bases: CsvRow[];
  lastUpdate: CsvRow[];
}

export interface DataIndexes {
  factionsById: Map<string, CsvRow>;
  sourcesById: Map<string, CsvRow>;
  warscrollsById: Map<string, CsvRow>;
  weaponsByWarscrollId: Map<string, CsvRow[]>;
  abilitiesByWarscrollId: Map<string, CsvRow[]>;
  keywordsByWarscrollId: Map<string, CsvRow[]>;
  basesByWarscrollId: Map<string, CsvRow[]>;
}

export interface CsvLoadedData {
  rows: RawDataSet;
  indexes: DataIndexes;
  sourceVersion: string | null;
}

export interface LoadedData {
  dataOrigin: DataOrigin;
  sourceVersion: string | null;
  sourceType: DataSourceType;
  generatedAt: string;
  catalogue: CatalogueEntry[];
  warscrollsById: Record<string, Warscroll>;
  warnings: string[];
}
