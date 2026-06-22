export const SCHEMA_VERSION = 1;
export const GAME = "aos4";
export const LEGACY_SOURCE_TYPE = "wahapedia-csv-export";
export const SAMPLE_SOURCE_TYPE = "synthetic-sample-csv-export";
export const USER_SOURCE_TYPE = "user-supplied-wahapedia-csv-export";

export const REQUIRED_DATA_FILES = {
  factions: "Factions.csv",
  sources: "Source.csv",
  warscrolls: "Warscrolls.csv",
  weapons: "Warscrolls_weapons.csv",
  abilities: "Warscrolls_abilities.csv",
  keywords: "Warscrolls_keywords.csv",
  bases: "Warscrolls_bases.csv",
  lastUpdate: "Last_update.csv"
};

export const REQUIRED_HEADERS = {
  factions: ["id", "name"],
  sources: ["id", "name"],
  warscrolls: [
    "id",
    "name",
    "faction_id",
    "link",
    "Move",
    "Save",
    "Control",
    "Health",
    "UnitSize",
    "Cost"
  ],
  weapons: ["warscroll_id", "line", "name", "type", "Atk", "Hit", "Wnd", "Rnd", "Dmg"],
  abilities: ["warscroll_id", "line", "name", "description"],
  keywords: ["warscroll_id", "keyword"],
  bases: ["warscroll_id", "base"],
  lastUpdate: ["last_update"]
};

export class DataImportError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "DataImportError";
    this.code = code;
  }
}

export function createDataBundleFromCsvTexts(fileTextsByName, options = {}) {
  const rows = readRowsFromCsvTexts(fileTextsByName);
  return createDataBundleFromRows(rows, options);
}

export function createDataBundleFromRows(rows, options = {}) {
  const indexes = buildIndexes(rows);
  const sourceVersion = stringValue(rows.lastUpdate[0]?.last_update);
  const sourceType = options.sourceType ?? SAMPLE_SOURCE_TYPE;
  const source = { type: sourceType, version: sourceVersion };
  const warnings = [...(options.warnings ?? [])];
  const catalogue = buildCatalogue({ rows, indexes, sourceVersion });
  const warscrollsById = {};

  for (const row of rows.warscrolls) {
    const id = stringValue(row.id);
    const name = stringValue(row.name);

    if (!id || !name) {
      throw new DataImportError(
        "EMPTY_WARSCROLL",
        `Warscroll row is missing id or name: ${JSON.stringify(row)}`
      );
    }

    if (Object.hasOwn(warscrollsById, id)) {
      throw new DataImportError(
        "CSV_PARSE_FAILED",
        `Duplicate warscroll id would overwrite generated data: ${id}`
      );
    }

    warscrollsById[id] = normalizeWarscroll(row, {
      indexes,
      sourceType,
      sourceVersion
    });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    game: GAME,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source,
    catalogue,
    warscrollsById,
    warnings
  };
}

export function validateGeneratedBundle(value) {
  if (!isRecord(value)) {
    throw new DataImportError("DATA_LOAD_FAILED", "Generated data cache is not an object.");
  }

  if (value.schemaVersion !== SCHEMA_VERSION) {
    throw new DataImportError("DATA_LOAD_FAILED", "Generated data cache has an unsupported schema.");
  }

  if (value.game !== GAME) {
    throw new DataImportError("DATA_LOAD_FAILED", "Generated data cache is for the wrong game.");
  }

  if (!isRecord(value.source) || !isSupportedSourceType(value.source.type)) {
    throw new DataImportError("DATA_LOAD_FAILED", "Generated data cache has invalid source metadata.");
  }

  if (!Array.isArray(value.catalogue)) {
    throw new DataImportError("DATA_LOAD_FAILED", "Generated data cache has no catalogue.");
  }

  if (!isRecord(value.warscrollsById)) {
    throw new DataImportError("DATA_LOAD_FAILED", "Generated data cache has no warscroll map.");
  }

  if (!Array.isArray(value.warnings)) {
    throw new DataImportError("DATA_LOAD_FAILED", "Generated data cache has invalid warnings.");
  }

  return value;
}

export function parsePipeDelimitedCsv(text, fileName = "CSV", requiredHeaderNames = []) {
  try {
    const parsedRows = parseDelimitedRows(text.replace(/^\uFEFF/, ""), "|");

    if (parsedRows.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = parsedRows[0].map((header) => header.trim());
    const minimumColumns = Math.max(
      1,
      ...requiredHeaderNames.map((headerName) => headers.indexOf(headerName) + 1)
    );
    const dataRows = coalescePhysicalRows(parsedRows.slice(1), minimumColumns);
    const mappedHeaders = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => header.length > 0);
    const rows = dataRows
      .filter((fields) => fields.some((field) => field.trim().length > 0))
      .map((fields) => {
        const row = {};

        for (const { header, index } of mappedHeaders) {
          row[header] = normalizeCell(fields[index] ?? "");
        }

        return row;
      });

    return { headers: mappedHeaders.map(({ header }) => header), rows };
  } catch (error) {
    throw new DataImportError("CSV_PARSE_FAILED", `Could not parse ${fileName}.`, {
      cause: error
    });
  }
}

function readRowsFromCsvTexts(fileTextsByName) {
  const loaded = {};
  const textEntries = new Map(
    Object.entries(fileTextsByName).map(([fileName, text]) => [fileName.toLowerCase(), text])
  );

  for (const [key, fileName] of Object.entries(REQUIRED_DATA_FILES)) {
    const text = textEntries.get(fileName.toLowerCase());

    if (typeof text !== "string") {
      throw new DataImportError("DATA_LOAD_FAILED", `Required CSV file ${fileName} was not selected.`);
    }

    const requiredHeaders = REQUIRED_HEADERS[key];
    const { headers, rows } = parsePipeDelimitedCsv(text, fileName, requiredHeaders);
    const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
      throw new DataImportError(
        "CSV_PARSE_FAILED",
        `${fileName} missing required headers: ${missingHeaders.join(", ")}`
      );
    }

    loaded[key] = rows;
  }

  return loaded;
}

function coalescePhysicalRows(rows, expectedColumns) {
  const coalesced = [];
  let pending = null;

  for (const row of rows) {
    if (!pending) {
      pending = [...row];
    } else {
      pending[pending.length - 1] = `${pending[pending.length - 1]}\n${row[0] ?? ""}`;
      pending.push(...row.slice(1));
    }

    if (pending.length >= expectedColumns) {
      coalesced.push(pending);
      pending = null;
    }
  }

  if (pending?.some((field) => field.trim().length > 0)) {
    throw new Error("CSV ended with an incomplete physical row.");
  }

  return coalesced;
}

function parseDelimitedRows(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"") {
      if (!inQuotes && cell.length === 0) {
        inQuotes = true;
      } else if (inQuotes && nextChar === "\"") {
        cell += "\"";
        index += 1;
      } else if (inQuotes) {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeCell(value) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  return trimmed;
}

function buildIndexes(rows) {
  return {
    factionsById: indexBy(rows.factions, "id"),
    sourcesById: indexBy(rows.sources, "id"),
    warscrollsById: indexBy(rows.warscrolls, "id"),
    weaponsByWarscrollId: groupBy(rows.weapons, "warscroll_id"),
    abilitiesByWarscrollId: groupBy(rows.abilities, "warscroll_id"),
    keywordsByWarscrollId: groupBy(rows.keywords, "warscroll_id"),
    basesByWarscrollId: groupBy(rows.bases, "warscroll_id")
  };
}

function indexBy(rows, field) {
  const map = new Map();

  for (const row of rows) {
    const value = stringValue(row[field]);

    if (!value) {
      continue;
    }

    if (map.has(value) && field === "id") {
      throw new DataImportError("CSV_PARSE_FAILED", `Duplicate id "${value}" found.`);
    }

    map.set(value, row);
  }

  return map;
}

function groupBy(rows, field) {
  const map = new Map();

  for (const row of rows) {
    const value = stringValue(row[field]);

    if (!value) {
      continue;
    }

    const group = map.get(value);

    if (group) {
      group.push(row);
    } else {
      map.set(value, [row]);
    }
  }

  for (const group of map.values()) {
    group.sort((left, right) => numberValue(left.line) - numberValue(right.line));
  }

  return map;
}

function buildCatalogue(data) {
  const entries = data.rows.warscrolls
    .map((row) => buildCatalogueEntry(row, data))
    .filter(Boolean);

  entries.sort(compareEntries);
  return entries;
}

function buildCatalogueEntry(row, data) {
  const id = stringValue(row.id);
  const name = stringValue(row.name);

  if (!id || !name) {
    return null;
  }

  const factionId = stringValue(row.faction_id) ?? "";
  const sourceId = stringValue(row.source_id) ?? "";
  const faction = data.indexes.factionsById.get(factionId);
  const source = data.indexes.sourcesById.get(sourceId);
  const factionName = stringValue(faction?.name) ?? "Unknown faction";
  const sourceName = stringValue(source?.name);
  const role = plainText(row.role);
  const unitSize = stringValue(row.UnitSize);
  const points = numberOrNull(row.Cost);
  const sourceUrl = stringValue(row.link);
  const isVirtual = row.virtual === true;
  const variantLabel = deriveVariantLabel(row, sourceName, isVirtual);
  const keywords = (data.indexes.keywordsByWarscrollId.get(id) ?? [])
    .map((keywordRow) =>
      [keywordRow.keyword, keywordRow.parameter].map(plainText).filter(Boolean).join(" ")
    )
    .filter(Boolean);
  const searchText = normalizeSearchValue(
    [
      name,
      factionName,
      role,
      unitSize,
      sourceName,
      variantLabel,
      plainText(row.legend),
      plainText(row.regiment_options),
      plainText(row.notes),
      ...keywords
    ].join(" ")
  );

  return {
    id,
    name,
    factionId,
    factionName,
    role,
    points,
    unitSize,
    sourceUrl,
    sourceName,
    sourceVersion: data.sourceVersion,
    isVirtual,
    variantLabel,
    searchText
  };
}

function normalizeWarscroll(row, data) {
  const id = requiredString(row.id);
  const name = requiredString(row.name);
  const sourceUrl = stringValue(row.link) ?? "";
  const faction = data.indexes.factionsById.get(stringValue(row.faction_id) ?? "");
  const source = data.indexes.sourcesById.get(stringValue(row.source_id) ?? "");
  const weapons = (data.indexes.weaponsByWarscrollId.get(id) ?? []).map(normalizeWeapon);
  const abilities = (data.indexes.abilitiesByWarscrollId.get(id) ?? []).map(normalizeAbility);
  const baseSize = normalizeBaseSize(data.indexes.basesByWarscrollId.get(id) ?? []);
  const keywords = (data.indexes.keywordsByWarscrollId.get(id) ?? [])
    .map(normalizeKeyword)
    .filter(Boolean);
  const points = numberOrNull(row.Cost);

  if (!name) {
    throw new DataImportError("EMPTY_WARSCROLL", `Warscroll row ${id || "(missing id)"} is incomplete.`);
  }

  const contentScore = calculateContentScore(row, weapons, abilities, keywords);
  const recommendedSize = contentScore > 9 ? "full-a4" : "half-a4";

  return {
    id,
    sourceUrl,
    game: GAME,
    faction: stringValue(faction?.name) ?? "Unknown faction",
    name,
    subtitle: null,
    flavorText: htmlToPlainText(row.legend),
    points,
    baseSize,
    unitSize: stringValue(row.UnitSize),
    canReinforce: row.no_reinforced !== true,
    stats: {
      move: stringValue(row.Move),
      save: stringValue(row.Save),
      control: stringValue(row.Control),
      health: stringValue(row.Health),
      ward: stringValue(row.Ward)
    },
    weapons,
    abilities,
    keywords,
    battleProfile: {
      role: htmlToPlainText(row.role),
      regimentOptions: htmlToPlainText(row.regiment_options),
      notes: htmlToPlainText(row.notes)
    },
    source: {
      fetchedAt: null,
      sourceType: data.sourceType,
      sourceVersion: data.sourceVersion,
      rawTitle: name,
      publication: stringValue(source?.name),
      publicationType: stringValue(source?.type),
      errataDate: stringValue(source?.errata_date),
      errataLink: stringValue(source?.errata_link)
    },
    layoutHints: {
      recommendedSize,
      contentScore,
      hasOverflowRisk: contentScore > 12
    }
  };
}

function normalizeWeapon(row) {
  return {
    name: requiredString(row.name),
    type: (stringValue(row.type) ?? "").toLowerCase(),
    range: stringValue(row.Rng),
    attacks: stringValue(row.Atk),
    hit: stringValue(row.Hit),
    wound: stringValue(row.Wnd),
    rend: stringValue(row.Rnd),
    damage: stringValue(row.Dmg),
    abilities: splitLabels(row.abilities),
    hasBattleDamage: row.has_battle_damage === true
  };
}

function normalizeAbility(row) {
  const isReaction = row.is_reaction === true;
  const timing = htmlToPlainText(row.condition);
  const abilityType = stringValue(row.ability_type);
  const kind = deriveAbilityKind(abilityType, timing, isReaction);

  return {
    name: requiredString(row.name),
    type: abilityType,
    kind,
    phase: htmlToPlainText(row.ability_phase),
    timing,
    text: htmlToPlainText(row.description) ?? "",
    legend: htmlToPlainText(row.legend),
    tags: splitLabels(row.keywords)
  };
}

function normalizeKeyword(row) {
  const keyword = htmlToPlainText(row.keyword);
  const parameter = htmlToPlainText(row.parameter);

  if (!keyword) {
    return "";
  }

  return parameter ? `${keyword} (${parameter})` : keyword;
}

function normalizeBaseSize(rows) {
  const bases = rows
    .map((row) => htmlToPlainText(row.base))
    .filter(Boolean);

  if (bases.length === 0) {
    return null;
  }

  return Array.from(new Set(bases)).join(", ");
}

function deriveAbilityKind(abilityType, timing, isReaction) {
  if (isReaction) {
    return "reaction";
  }

  if (timing?.toLowerCase().includes("passive")) {
    return "passive";
  }

  return abilityType?.toLowerCase() ?? "ability";
}

function deriveVariantLabel(row, sourceName, isVirtual) {
  const variantText = normalizeSearchValue(
    [row.notes, row.regiment_options, sourceName].map(plainText).join(" ")
  );

  if (variantText.includes("spearhead")) {
    return "Spearhead";
  }

  if (isVirtual) {
    return "Virtual profile";
  }

  return null;
}

function splitLabels(value) {
  const text = htmlToPlainText(value);

  if (!text) {
    return [];
  }

  return text
    .split(/[,;]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function calculateContentScore(row, weapons, abilities, keywords) {
  const rulesLength = abilities.reduce((total, ability) => total + ability.text.length, 0);
  const profileLength = [row.legend, row.regiment_options, row.notes, row.description]
    .map((value) => htmlToPlainText(value)?.length ?? 0)
    .reduce((total, length) => total + length, 0);
  const health = numberOrNull(row.Health) ?? 0;

  return (
    weapons.length * 1.3 +
    abilities.length * 1.8 +
    keywords.length * 0.2 +
    Math.ceil(rulesLength / 220) +
    Math.ceil(profileLength / 260) +
    (health >= 10 ? 1.5 : 0)
  );
}

function htmlToPlainText(value) {
  const raw = stringValue(value);

  if (!raw) {
    return null;
  }

  const withInternalLinks = raw.replace(/%\d+([^%]+)%/g, "$1");
  const withLineBreaks = withInternalLinks
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n")
    .replace(/<\s*\/\s*div\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n- ")
    .replace(/<\s*\/\s*li\s*>/gi, "");

  return withLineBreaks
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function plainText(value) {
  const text = htmlToPlainText(value);
  return text ? cleanText(text) : null;
}

function cleanText(value) {
  const text = value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return text.length > 0 ? text : null;
}

function normalizeSearchValue(value) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compareEntries(left, right) {
  return (
    compareText(left.factionName, right.factionName) ||
    compareText(left.name, right.name) ||
    compareText(left.variantLabel ?? "", right.variantLabel ?? "") ||
    compareText(left.id, right.id)
  );
}

function compareText(left, right) {
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

function requiredString(value) {
  return stringValue(value) ?? "";
}

function stringValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function numberOrNull(value) {
  const text = stringValue(value);

  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value) {
  const parsed = Number(stringValue(value) ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function isSupportedSourceType(value) {
  return (
    value === LEGACY_SOURCE_TYPE ||
    value === SAMPLE_SOURCE_TYPE ||
    value === USER_SOURCE_TYPE
  );
}
