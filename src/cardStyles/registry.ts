import {
  CleanBlackWhiteWarscrollCard,
  CleanWarscrollCard
} from "./CleanWarscrollCard";
import { WahapediaLikeWarscrollCard } from "./WahapediaLikeWarscrollCard";
import type { CardStyleDefinition, CardStyleId } from "./types";

export const defaultCardStyleId: CardStyleId = "clean";

export const cardStyles: CardStyleDefinition[] = [
  {
    id: "clean",
    label: "Clean",
    description: "The original print-friendly warscroll card.",
    supportsThirdA4: true,
    supportsHalfA4: true,
    supportsFullA4: true,
    Card: CleanWarscrollCard
  },
  {
    id: "clean-bw",
    label: "Clean Black and White",
    description: "A high-contrast monochrome version of the clean print layout.",
    supportsThirdA4: true,
    supportsHalfA4: true,
    supportsFullA4: true,
    Card: CleanBlackWhiteWarscrollCard
  },
  {
    id: "wahapedia-like",
    label: "Wahapedia-like",
    description: "A source-like AoS 4 warscroll layout using CSS-only project assets.",
    supportsThirdA4: true,
    supportsHalfA4: true,
    supportsFullA4: true,
    Card: WahapediaLikeWarscrollCard
  }
];

export function getCardStyle(styleId: CardStyleId): CardStyleDefinition {
  return cardStyles.find((style) => style.id === styleId) ?? cardStyles[0];
}
