import { AppError, type CatalogueEntry, type LoadedData, type Warscroll } from "../types";

export type { CatalogueEntry } from "../types";

export interface CatalogueFilters {
  query: string;
  factionId: string;
  hideNoPoints: boolean;
  hideNoUnitSize: boolean;
}

export function buildCatalogue(data: LoadedData): CatalogueEntry[] {
  return data.catalogue;
}

export function filterCatalogue(
  entries: CatalogueEntry[],
  { query, factionId, hideNoPoints, hideNoUnitSize }: CatalogueFilters
): CatalogueEntry[] {
  const normalizedQuery = normalizeSearchValue(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return entries
    .filter((entry) => !factionId || entry.factionId === factionId)
    .filter((entry) => !hideNoPoints || entry.points !== null)
    .filter((entry) => !hideNoUnitSize || Boolean(entry.unitSize))
    .filter((entry) => tokens.every((token) => entry.searchText.includes(token)))
    .map((entry, index) => ({
      entry,
      index,
      rank: rankEntry(entry, normalizedQuery, tokens)
    }))
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      const byEntry = compareEntries(left.entry, right.entry);
      return byEntry === 0 ? left.index - right.index : byEntry;
    })
    .map(({ entry }) => entry);
}

export function resolveCatalogueWarscroll(entryId: string, data: LoadedData): Warscroll {
  const warscroll = data.warscrollsById[entryId];

  if (!warscroll) {
    throw new AppError(
      "WARSCROLL_NOT_FOUND",
      "That warscroll was not found in the generated data cache."
    );
  }

  return warscroll;
}

function rankEntry(
  entry: CatalogueEntry,
  normalizedQuery: string,
  tokens: string[]
): number {
  if (tokens.length === 0) {
    return 10;
  }

  const normalizedName = normalizeSearchValue(entry.name);

  if (normalizedName === normalizedQuery) {
    return 0;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }

  if (tokens.every((token) => normalizedName.includes(token))) {
    return 2;
  }

  if (normalizeSearchValue(entry.factionName).startsWith(normalizedQuery)) {
    return 3;
  }

  return 4;
}

function compareEntries(left: CatalogueEntry, right: CatalogueEntry): number {
  return (
    compareText(left.factionName, right.factionName) ||
    compareText(left.name, right.name) ||
    compareText(left.variantLabel ?? "", right.variantLabel ?? "") ||
    compareText(left.id, right.id)
  );
}

function compareText(left: string, right: string): number {
  const normalizedLeft = left.toLocaleLowerCase();
  const normalizedRight = right.toLocaleLowerCase();

  if (normalizedLeft < normalizedRight) {
    return -1;
  }

  if (normalizedLeft > normalizedRight) {
    return 1;
  }

  return 0;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
