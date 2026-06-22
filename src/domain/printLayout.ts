import type { ResolvedSize, SizeMode, Warscroll } from "../types";

export interface BatchCard {
  warscroll: Warscroll;
  size: ResolvedSize;
}

export interface BatchPage {
  type: "half" | "full";
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
  let halfPage: BatchCard[] = [];

  function flushHalfPage() {
    if (halfPage.length > 0) {
      pages.push({ type: "half", cards: halfPage });
      halfPage = [];
    }
  }

  for (const warscroll of warscrolls) {
    const size = resolveBatchSize(warscroll, sizeMode, autoFitResults);
    const card = { warscroll, size };

    if (size === "full-a4") {
      flushHalfPage();
      pages.push({ type: "full", cards: [card] });
      continue;
    }

    halfPage.push(card);

    if (halfPage.length === 2) {
      flushHalfPage();
    }
  }

  flushHalfPage();
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
