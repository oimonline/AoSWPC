import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CardRendererComponent, CardStyleId } from "../../cardStyles/types";
import type { AutoFitResult } from "../../domain/printLayout";
import type { ResolvedSize, SizeMode, Warscroll } from "../../types";

interface SelectedPreviewCardProps {
  Card: CardRendererComponent;
  onAutoFitResult: (warscrollId: string, result: AutoFitResult) => void;
  resolvedSize: ResolvedSize;
  sizeMode: SizeMode;
  styleId: CardStyleId;
  warscroll: Warscroll;
}

export function SelectedPreviewCard({
  Card,
  onAutoFitResult,
  resolvedSize,
  sizeMode,
  styleId,
  warscroll
}: SelectedPreviewCardProps) {
  const [compact, setCompact] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const compactRef = useRef(false);

  // Reset compact when key inputs change
  // Reset compact before paint so the card re-renders without compact
  // styling before any rAF-scheduled measurement reads the DOM.
  useLayoutEffect(() => {
    setCompact(false);
    compactRef.current = false;
  }, [resolvedSize, sizeMode, styleId, warscroll.id]);

  // Stable measurement function that reads compact via ref to avoid
  // re-running the observer effect every time compact toggles.
  const measure = useCallback(() => {
    const frame = cardRef.current;
    if (!frame || sizeMode !== "auto") {
      return;
    }

    const isOverflowing = hasPrintableOverflow(frame);

    if (resolvedSize === "half-a4") {
      // At half-A4, never use compact — just promote to full if overflowing
      onAutoFitResult(warscroll.id, {
        compact: false,
        size: isOverflowing ? "full-a4" : "half-a4"
      });
      return;
    }

    // At full-A4, enable compact if overflowing and not already compact
    if (isOverflowing && !compactRef.current) {
      setCompact(true);
      compactRef.current = true;
      onAutoFitResult(warscroll.id, { compact: true, size: "full-a4" });
      return;
    }

    onAutoFitResult(warscroll.id, {
      compact: compactRef.current,
      size: "full-a4"
    });
  }, [onAutoFitResult, resolvedSize, sizeMode, warscroll.id]);

  useLayoutEffect(() => {
    if (sizeMode !== "auto" || !cardRef.current) {
      return;
    }

    const frame = cardRef.current;
    let cancelled = false;
    let rafId = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    // Debounced measurement — collapses rapid ResizeObserver callbacks
    // into a single rAF-aligned measurement.
    const scheduleMeasure = () => {
      if (cancelled) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (cancelled) return;
        rafId = requestAnimationFrame(() => {
          if (!cancelled) measure();
        });
      }, 50);
    };

    // Initial measurement after first layout
    rafId = requestAnimationFrame(() => {
      if (!cancelled) measure();
    });

    // Re-measure once fonts finish loading — text reflow may cause overflow
    document.fonts.ready.then(() => {
      if (!cancelled) {
        rafId = requestAnimationFrame(() => {
          if (!cancelled) measure();
        });
      }
    });

    // Observe only the card root for resize (e.g., viewport / zoom changes).
    // The previous implementation observed every child element (O(n) observers),
    // which caused layout thrashing with large batch selections.
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMeasure);

    resizeObserver?.observe(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      clearTimeout(debounceTimer);
      resizeObserver?.disconnect();
    };
  }, [measure, sizeMode, styleId, warscroll.id]);

  return (
    <div
      className="batch-print-card"
      data-batch-card-name={warscroll.name}
      data-batch-card-size={resolvedSize}
    >
      <Card
        compact={compact}
        ref={cardRef}
        size={resolvedSize}
        warscroll={warscroll}
      />
    </div>
  );
}

function hasPrintableOverflow(frame: HTMLElement) {
  const tolerance = 1;
  const frameRect = frame.getBoundingClientRect();
  const hasScrollOverflow =
    frame.scrollHeight > frame.clientHeight + tolerance ||
    frame.scrollWidth > frame.clientWidth + tolerance;

  if (hasScrollOverflow) {
    return true;
  }

  const overflowCandidates = frame.querySelectorAll<HTMLElement>(
    [
      "[data-card-title]",
      ".card-header",
      ".stat-row",
      ".card-section",
      ".wsCharLegend",
      ".wsBodyTop",
      ".wsBodyBottom",
      ".wah-source-ability",
      ".wah-keyword-table",
      ".wTable",
      ".Columns2_AoS"
    ].join(", ")
  );

  return Array.from(overflowCandidates).some((element) => {
    const rect = element.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return false;
    }

    return (
      rect.left < frameRect.left - tolerance ||
      rect.right > frameRect.right + tolerance ||
      rect.top < frameRect.top - tolerance ||
      rect.bottom > frameRect.bottom + tolerance
    );
  });
}
