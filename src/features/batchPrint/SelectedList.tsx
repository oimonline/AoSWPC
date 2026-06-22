import type { CatalogueEntry } from "../../data/catalogue";

interface SelectedListProps {
  entries: CatalogueEntry[];
  onRemove: (entryId: string) => void;
}

export function SelectedList({ entries, onRemove }: SelectedListProps) {
  return (
    <section className="selected-list" aria-label="Selected warscrolls">
      <strong>{entries.length} selected</strong>
      <ol className="batch-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <span>{entry.name}</span>
            <button
              className="batch-remove"
              type="button"
              onClick={() => onRemove(entry.id)}
              aria-label={`Remove ${entry.name} from batch print`}
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
