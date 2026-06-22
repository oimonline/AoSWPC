import type { ResolvedSize, SizeMode, Warscroll } from "../types";

export interface BatchCard {
  warscroll: Warscroll;
  size: ResolvedSize;
}

export interface BatchPage {
  type: "third" | "half" | "full";
  cards: BatchCard[];
}

export interface AutoFitResult {
  compact: boolean;
  size: ResolvedSize;
}

export function buildBatchPages(
  warscrolls: Warscroll[],
  sizeMode: SizeMode,
  autoFitResults: Record<string, AutoFitResult>
): BatchPage[] {
  const pages: BatchPage[] = [];
  let pendingType: BatchPage["type"] | null = null;
  let pendingCards: BatchCard[] = [];

  function flushPendingPage() {
    if (pendingType && pendingCards.length > 0) {
      pages.push({ type: pendingType, cards: pendingCards });
      pendingType = null;
      pendingCards = [];
    }
  }

  for (const warscroll of warscrolls) {
    const size = resolveBatchSize(warscroll, sizeMode, autoFitResults);
    const card = { warscroll, size };

    if (size === "full-a4") {
      flushPendingPage();
      pages.push({ type: "full", cards: [card] });
      continue;
    }

    const nextType = pageTypeForSize(size);

    if (pendingType && pendingType !== nextType) {
      flushPendingPage();
    }

    pendingType = nextType;
    pendingCards.push(card);

    if (pendingCards.length === pageCapacityForSize(size)) {
      flushPendingPage();
    }
  }

  flushPendingPage();
  return pages;
}

function resolveBatchSize(
  warscroll: Warscroll,
  sizeMode: SizeMode,
  autoFitResults: Record<string, AutoFitResult>
): ResolvedSize {
  return sizeMode === "auto"
    ? autoFitResults[warscroll.id]?.size ?? "half-a4"
    : sizeMode;
}

function pageTypeForSize(size: ResolvedSize): BatchPage["type"] {
  if (size === "third-a4") {
    return "third";
  }

  return size === "half-a4" ? "half" : "full";
}

function pageCapacityForSize(size: ResolvedSize) {
  if (size === "third-a4") {
    return 3;
  }

  return size === "half-a4" ? 2 : 1;
}
