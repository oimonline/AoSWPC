import type { CatalogueEntry } from "../../data/catalogue";
import type { LoadedData } from "../../types";

interface CatalogueResultsProps {
  batchIds: string[];
  data: LoadedData | null;
  dataError: string | null;
  entries: CatalogueEntry[];
  onBatchToggle: (entryId: string, checked: boolean) => void;
  onClear: () => void;
}

export function CatalogueResults({
  batchIds,
  data,
  dataError,
  entries,
  onBatchToggle,
  onClear
}: CatalogueResultsProps) {
  if (dataError) {
    return (
      <div className="empty-state empty-state--error">
        <h2>CSV data unavailable</h2>
        <p>{dataError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading-list" aria-label="Loading catalogue">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <h2>No results</h2>
        <p>Try another search or faction.</p>
        <button className="button-secondary" type="button" onClick={onClear}>
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="results-list">
      {entries.map((entry) => {
        const isBatchSelected = batchIds.includes(entry.id);

        return (
          <div
            className={`result-tile${isBatchSelected ? " is-batch-selected" : ""}`}
            key={entry.id}
          >
            <label className="result-select" htmlFor={`batch-select-${entry.id}`}>
              <input
                id={`batch-select-${entry.id}`}
                type="checkbox"
                checked={isBatchSelected}
                onChange={(event) => onBatchToggle(entry.id, event.target.checked)}
                aria-label={`Select ${entry.name} for batch print`}
              />
            </label>
            <button
              className="result-button"
              type="button"
              onClick={() => onBatchToggle(entry.id, !isBatchSelected)}
              aria-pressed={isBatchSelected}
              data-entry-id={entry.id}
              data-entry-name={entry.name}
              data-entry-faction={entry.factionName}
            >
              <span className="result-title">{entry.name}</span>
              <span className="result-meta">
                <span>{entry.factionName}</span>
                <span>{entry.role ?? "Warscroll"}</span>
                <span>{formatPoints(entry.points)}</span>
                <span>{formatUnitSize(entry.unitSize)}</span>
              </span>
              {entry.variantLabel ? (
                <span className={entry.isVirtual ? "variant-pill" : "variant-pill variant-pill--source"}>
                  {entry.variantLabel}
                </span>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function formatPoints(points: number | null) {
  if (points === null) {
    return "No points";
  }

  return `${points} pts`;
}

function formatUnitSize(unitSize: string | null) {
  if (!unitSize) {
    return "Unit size -";
  }

  return unitSize === "1" ? "1 model" : `${unitSize} models`;
}
