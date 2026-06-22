import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  defaultCardStyleId,
  getCardStyle
} from "./cardStyles/registry";
import type { CardStyleId } from "./cardStyles/types";
import {
  buildCatalogue,
  filterCatalogue,
  type CatalogueEntry
} from "./data/catalogue";
import {
  loadSampleData,
  loadUserDataFromFiles
} from "./data/loadData";
import {
  buildBatchPages,
  type AutoFitResult
} from "./domain/printLayout";
import { PrintSetupControls } from "./features/batchPrint/PrintSetupControls";
import { SelectedList } from "./features/batchPrint/SelectedList";
import { CatalogueResults } from "./features/catalogue/CatalogueResults";
import { PreviewZoomControls } from "./features/preview/PreviewZoomControls";
import { SelectedPreviewCard } from "./features/preview/SelectedPreviewCard";
import {
  AppError,
  type LoadedData,
  type ResolvedSize,
  type SizeMode,
  type Warscroll
} from "./types";

const DEFAULT_HIDE_NO_POINTS = true;
const DEFAULT_HIDE_NO_UNIT_SIZE = true;
const DEFAULT_PREVIEW_ZOOM = 50;
const MIN_PREVIEW_ZOOM = 40;
const MAX_PREVIEW_ZOOM = 120;
const PREVIEW_ZOOM_STEP = 10;

function App() {
  const [data, setData] = useState<LoadedData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [factionFilter, setFactionFilter] = useState("");
  const [hideNoPoints, setHideNoPoints] = useState(DEFAULT_HIDE_NO_POINTS);
  const [hideNoUnitSize, setHideNoUnitSize] = useState(DEFAULT_HIDE_NO_UNIT_SIZE);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [sizeMode, setSizeMode] = useState<SizeMode>("auto");
  const [previewZoom, setPreviewZoom] = useState(DEFAULT_PREVIEW_ZOOM);
  const [selectedStyleId, setSelectedStyleId] =
    useState<CardStyleId>(defaultCardStyleId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoFitContext = `${sizeMode}:${selectedStyleId}:${batchIds.join("|")}`;
  const [autoFitState, setAutoFitState] = useState<AutoFitState>({
    context: autoFitContext,
    results: {}
  });

  useEffect(() => {
    let cancelled = false;

    loadSampleData()
      .then((loadedData) => {
        if (cancelled) {
          return;
        }

        setData(loadedData);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setDataError(formatError(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function importSelectedFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";

    if (files.length === 0) {
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const loadedData = await loadUserDataFromFiles(files);
      replaceActiveData(loadedData);
    } catch (error) {
      setImportError(formatError(error));
    } finally {
      setIsImporting(false);
    }
  }

  async function resetToSampleData() {
    setIsImporting(true);
    setImportError(null);

    try {
      const loadedData = await loadSampleData();
      replaceActiveData(loadedData);
    } catch (error) {
      if (data) {
        setImportError(formatError(error));
      } else {
        setDataError(formatError(error));
      }
    } finally {
      setIsImporting(false);
    }
  }

  function replaceActiveData(loadedData: LoadedData) {
    setData(loadedData);
    setDataError(null);
    setBatchIds([]);
    setQuery("");
    setFactionFilter("");
  }

  const catalogue = useMemo(() => (data ? buildCatalogue(data) : []), [data]);
  const filteredEntries = useMemo(
    () =>
      filterCatalogue(catalogue, {
        query,
        factionId: factionFilter,
        hideNoPoints,
        hideNoUnitSize
      }),
    [catalogue, factionFilter, hideNoPoints, hideNoUnitSize, query]
  );
  const factionOptions = useMemo(() => buildFactionOptions(catalogue), [catalogue]);
  const catalogueById = useMemo(
    () => new Map(catalogue.map((entry) => [entry.id, entry])),
    [catalogue]
  );
  const batchEntries = useMemo(
    () => batchIds.map((id) => catalogueById.get(id)).filter(isCatalogueEntry),
    [batchIds, catalogueById]
  );
  const batchCards = useMemo(
    () =>
      batchIds
        .map((id) => (data ? data.warscrollsById[id] : null))
        .filter((item): item is Warscroll => Boolean(item)),
    [batchIds, data]
  );
  const autoFitResults =
    autoFitState.context === autoFitContext ? autoFitState.results : {};
  const selectedStyle = getCardStyle(selectedStyleId);
  const SelectedCard = selectedStyle.Card;
  const sizeLabel =
    sizeMode === "auto" ? "Auto" : formatSize(sizeMode);
  const previewLabel = `${sizeLabel} - ${selectedStyle.label}`;
  const hasActiveFilters = Boolean(
    query ||
      factionFilter ||
      hideNoPoints !== DEFAULT_HIDE_NO_POINTS ||
      hideNoUnitSize !== DEFAULT_HIDE_NO_UNIT_SIZE
  );
  const batchPages = useMemo(
    () => buildBatchPages(batchCards, sizeMode, autoFitResults),
    [autoFitResults, batchCards, sizeMode]
  );
  const previewStageStyle = {
    "--preview-user-zoom": previewZoom / 100
  } as CSSProperties;

  function toggleBatchEntry(entryId: string, checked: boolean) {
    setBatchIds((current) => {
      if (checked) {
        return current.includes(entryId) ? current : [...current, entryId];
      }

      return current.filter((id) => id !== entryId);
    });
  }

  function removeBatchEntry(entryId: string) {
    setBatchIds((current) => current.filter((id) => id !== entryId));
  }

  function clearBatch() {
    setBatchIds([]);
  }

  function printBatch() {
    if (batchCards.length === 0) {
      return;
    }

    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  function clearFilters() {
    setQuery("");
    setFactionFilter("");
    setHideNoPoints(DEFAULT_HIDE_NO_POINTS);
    setHideNoUnitSize(DEFAULT_HIDE_NO_UNIT_SIZE);
  }

  function zoomPreviewBy(delta: number) {
    setPreviewZoom((current) =>
      clamp(current + delta, MIN_PREVIEW_ZOOM, MAX_PREVIEW_ZOOM)
    );
  }

  const reportAutoFitResult = useCallback(
    (warscrollId: string, result: AutoFitResult) => {
      setAutoFitState((current) => {
        const currentResults =
          current.context === autoFitContext ? current.results : {};
        const existing = currentResults[warscrollId];

        if (
          existing?.size === result.size &&
          existing.compact === result.compact
        ) {
          return current.context === autoFitContext
            ? current
            : { context: autoFitContext, results: currentResults };
        }

        return {
          context: autoFitContext,
          results: {
            ...currentResults,
            [warscrollId]: result
          }
        };
      });
    },
    [autoFitContext]
  );

  return (
    <main className="app-shell">
      <section className="catalogue-panel" aria-label="Warscroll catalogue controls">
        <div className="toolbar__title">
          <h1>AOS War Scroll Print Composer</h1>
          <p>{formatDataStatus(data)}</p>
          <div className="data-source-actions">
            <span className={`data-badge data-badge--${data?.dataOrigin ?? "loading"}`}>
              {data ? (data.dataOrigin === "user" ? "User-loaded data" : "Sample data") : "Loading data"}
            </span>
            <button
              className="button-secondary data-action-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              Load data
            </button>
            <button
              className="button-secondary data-action-button"
              type="button"
              onClick={resetToSampleData}
              disabled={isImporting || !data || data.dataOrigin === "sample"}
            >
              Reset sample
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              hidden
              onChange={importSelectedFiles}
            />
          </div>
        </div>

        <div className="catalogue-controls">
          <div className="field catalogue-search">
            <label htmlFor="catalogue-search">Search</label>
            <input
              id="catalogue-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Skyforge Sentinels"
              autoComplete="off"
              disabled={!data || Boolean(dataError)}
            />
          </div>

          <div className="field faction-filter">
            <label htmlFor="faction-filter">Faction</label>
            <select
              id="faction-filter"
              value={factionFilter}
              onChange={(event) => setFactionFilter(event.target.value)}
              disabled={!data || Boolean(dataError)}
            >
              <option value="">All factions</option>
              {factionOptions.map((faction) => (
                <option key={faction.id} value={faction.id}>
                  {faction.name} ({faction.count})
                </option>
              ))}
            </select>
          </div>

          <div className="catalogue-filter-toggles" aria-label="Catalogue filters">
            <label className="checkbox-filter" htmlFor="hide-no-points">
              <input
                id="hide-no-points"
                type="checkbox"
                checked={hideNoPoints}
                onChange={(event) => setHideNoPoints(event.target.checked)}
                disabled={!data || Boolean(dataError)}
              />
              <span>Hide no points</span>
            </label>
            <label className="checkbox-filter" htmlFor="hide-no-unit-size">
              <input
                id="hide-no-unit-size"
                type="checkbox"
                checked={hideNoUnitSize}
                onChange={(event) => setHideNoUnitSize(event.target.checked)}
                disabled={!data || Boolean(dataError)}
              />
              <span>Hide no unit size</span>
            </label>
          </div>

          <button
            className="button-secondary filter-clear-button"
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear filters
          </button>

        </div>

        {dataError ? <p className="status status--error">{dataError}</p> : null}
        {isImporting ? <p className="status">Importing data...</p> : null}
        {importError ? <p className="status status--error">{importError}</p> : null}
        {data?.warnings.length ? (
          <p className="status">Warnings: {data.warnings.join("; ")}</p>
        ) : null}
      </section>

      <div className="workspace">
        <section className="results-panel" aria-label="Catalogue results">
          <PrintSetupControls
            disabled={batchCards.length === 0}
            onClear={clearBatch}
            onPrint={printBatch}
            selectedStyleId={selectedStyleId}
            setSelectedStyleId={setSelectedStyleId}
            setSizeMode={setSizeMode}
            sizeMode={sizeMode}
          />

          {batchEntries.length > 0 ? (
            <SelectedList
              entries={batchEntries}
              onRemove={removeBatchEntry}
            />
          ) : null}

          <CatalogueResults
            batchIds={batchIds}
            data={data}
            dataError={dataError}
            entries={filteredEntries}
            onBatchToggle={toggleBatchEntry}
            onClear={clearFilters}
          />
        </section>

        <section
          className="print-stage"
          style={previewStageStyle}
          aria-label="Selected warscroll preview"
        >
          <div className="preview-topline">
            <PreviewZoomControls
              defaultZoom={DEFAULT_PREVIEW_ZOOM}
              maxZoom={MAX_PREVIEW_ZOOM}
              minZoom={MIN_PREVIEW_ZOOM}
              onReset={() => setPreviewZoom(DEFAULT_PREVIEW_ZOOM)}
              onZoomIn={() => zoomPreviewBy(PREVIEW_ZOOM_STEP)}
              onZoomOut={() => zoomPreviewBy(-PREVIEW_ZOOM_STEP)}
              zoom={previewZoom}
            />
            <span className="preview-label">
              {batchCards.length > 0 ? previewLabel : "No warscrolls selected"}
            </span>
          </div>
          <div className="preview-scroll">
            {batchPages.length > 0 ? (
              <div className="selected-preview-pages">
                {batchPages.map((page, pageIndex) => (
                  <div
                    className={`batch-print-page batch-print-page--${page.type}`}
                    key={`batch-page-${pageIndex}`}
                    data-batch-page={page.type}
                  >
                    {page.cards.map(({ warscroll: batchWarscroll, size }) => (
                      <SelectedPreviewCard
                        Card={SelectedCard}
                        key={batchWarscroll.id}
                        onAutoFitResult={reportAutoFitResult}
                        resolvedSize={size}
                        sizeMode={sizeMode}
                        styleId={selectedStyleId}
                        warscroll={batchWarscroll}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-preview">
                <p>No warscrolls selected.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

interface AutoFitState {
  context: string;
  results: Record<string, AutoFitResult>;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isCatalogueEntry(entry: CatalogueEntry | undefined): entry is CatalogueEntry {
  return Boolean(entry);
}

function buildFactionOptions(entries: CatalogueEntry[]) {
  const factions = new Map<string, { id: string; name: string; count: number }>();

  for (const entry of entries) {
    const existing = factions.get(entry.factionId);

    if (existing) {
      existing.count += 1;
    } else {
      factions.set(entry.factionId, {
        id: entry.factionId,
        name: entry.factionName,
        count: 1
      });
    }
  }

  return Array.from(factions.values()).sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  );
}

function formatSize(size: ResolvedSize) {
  return size === "half-a4" ? "Half A4" : "Full A4";
}

function formatDataStatus(data: LoadedData | null) {
  if (!data) {
    return "Loading sample data...";
  }

  const label = data.dataOrigin === "user" ? "User data" : "Sample data";
  return `${label}: ${data.sourceVersion ?? "unknown source date"}`;
}

function formatError(error: unknown): string {
  if (error instanceof AppError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export default App;
