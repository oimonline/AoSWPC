import { cardStyles } from "../../cardStyles/registry";
import type { CardStyleId } from "../../cardStyles/types";
import type { SizeMode } from "../../types";

interface PrintSetupControlsProps {
  disabled: boolean;
  onClear: () => void;
  onPrint: () => void;
  selectedStyleId: CardStyleId;
  setSelectedStyleId: (styleId: CardStyleId) => void;
  setSizeMode: (sizeMode: SizeMode) => void;
  sizeMode: SizeMode;
}

export function PrintSetupControls({
  disabled,
  onClear,
  onPrint,
  selectedStyleId,
  setSelectedStyleId,
  setSizeMode,
  sizeMode
}: PrintSetupControlsProps) {
  return (
    <section className="print-setup" aria-label="Print setup actions">
      <div className="print-setup__actions">
        <div className="batch-field batch-field--style">
          <label htmlFor="card-style">Style</label>
          <select
            id="card-style"
            value={selectedStyleId}
            onChange={(event) => setSelectedStyleId(event.target.value as CardStyleId)}
          >
            {cardStyles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
        </div>
        <div className="batch-field batch-field--size">
          <label htmlFor="size-mode">Size</label>
          <select
            id="size-mode"
            value={sizeMode}
            onChange={(event) => setSizeMode(event.target.value as SizeMode)}
          >
            <option value="auto">Auto</option>
            <option value="half-a4">Half A4</option>
            <option value="full-a4">Full A4</option>
          </select>
        </div>
        <button type="button" onClick={onPrint} disabled={disabled}>
          Print selected
        </button>
        <button className="button-secondary" type="button" onClick={onClear} disabled={disabled}>
          Clear selected
        </button>
      </div>
    </section>
  );
}
