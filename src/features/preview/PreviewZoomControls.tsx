interface PreviewZoomControlsProps {
  defaultZoom: number;
  maxZoom: number;
  minZoom: number;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
}

export function PreviewZoomControls({
  defaultZoom,
  maxZoom,
  minZoom,
  onReset,
  onZoomIn,
  onZoomOut,
  zoom
}: PreviewZoomControlsProps) {
  return (
    <div className="preview-zoom-controls" aria-label="Preview zoom controls">
      <button
        className="button-secondary"
        id="preview-zoom-out"
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        aria-label="Zoom preview out"
      >
        -
      </button>
      <output htmlFor="preview-zoom-out preview-zoom-in" aria-live="polite">
        {zoom}%
      </output>
      <button
        className="button-secondary"
        id="preview-zoom-in"
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        aria-label="Zoom preview in"
      >
        +
      </button>
      <button
        className="button-secondary"
        id="preview-zoom-reset"
        type="button"
        onClick={onReset}
        disabled={zoom === defaultZoom}
      >
        Reset
      </button>
    </div>
  );
}
