import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { ResolvedSize, Warscroll } from "../types";

export type CardStyleId = "clean" | "clean-bw" | "wahapedia-like";

export interface CardRendererProps {
  warscroll: Warscroll;
  size: ResolvedSize;
  compact: boolean;
}

export type CardRendererComponent = ForwardRefExoticComponent<
  CardRendererProps & RefAttributes<HTMLElement>
>;

export interface CardStyleDefinition {
  id: CardStyleId;
  label: string;
  description: string;
  supportsThirdA4: boolean;
  supportsHalfA4: boolean;
  supportsFullA4: boolean;
  Card: CardRendererComponent;
}
