import { forwardRef } from "react";
import type { ForwardedRef, ReactNode } from "react";
import type { WarscrollAbility, WarscrollWeapon } from "../types";
import type { CardRendererProps } from "./types";

export const WahapediaLikeWarscrollCard = forwardRef<
  HTMLElement,
  CardRendererProps
>(WahapediaLikeWarscrollCardInner);

function WahapediaLikeWarscrollCardInner(
  { warscroll, size, compact }: CardRendererProps,
  ref: ForwardedRef<HTMLElement>
) {
  const rangedWeapons = warscroll.weapons.filter((weapon) => weapon.type === "ranged");
  const meleeWeapons = warscroll.weapons.filter((weapon) => weapon.type !== "ranged");
  const sortedAbilities = sortAbilitiesByPhase(warscroll.abilities);
  const abilityColumns = splitAbilitiesIntoColumns(sortedAbilities);
  const [primaryKeyword, secondaryKeywords] = splitKeywordRows(warscroll.keywords);

  return (
    <article
      ref={ref}
      className={`warscroll-card warscroll-card--${size} wahapedia-card wahapedia-card--${size} datasheet${
        compact ? " is-compact" : ""
      }`}
      data-card-style="wahapedia-like"
      data-card-size={size}
    >
      <div className="wsCharLegend">
        <CornerFrame>
          <div
            className={warscroll.stats.ward ? "AoS_profile_Ward wah-source-profile" : "AoS_profile wah-source-profile"}
            aria-label="Stats"
          >
            <div className={statClass(warscroll.stats.move)}>{warscroll.stats.move ?? "-"}</div>
            <div className="wsWounds">{warscroll.stats.health ?? "-"}</div>
            <div className="wsSave">{warscroll.stats.save ?? "-"}</div>
            <div className="wsBravery">{warscroll.stats.control ?? "-"}</div>
            {warscroll.stats.ward ? <div className="wsWard">{warscroll.stats.ward}</div> : null}
          </div>
          {warscroll.flavorText ? (
            <div className="ShowFluff wsLegend">{warscroll.flavorText}</div>
          ) : null}
        </CornerFrame>
      </div>

      <div className="wsBody">
        <div className="wsBodyTop">
          <div className="wsHeader_long">
            <SourceHeader faction={warscroll.faction} name={warscroll.name} />
          </div>

          <div className="wsTable">
            <WeaponGroup type="ranged" weapons={rangedWeapons} />
            <WeaponGroup type="melee" weapons={meleeWeapons} />
          </div>

          <div className="Columns2_AoS wah-source-rules">
            {abilityColumns.map((column, columnIndex) => (
              <div className="wah-ability-column" key={`ability-column-${columnIndex}`}>
                {column.map((ability, index) => (
                  <AbilityBlock ability={ability} key={`${ability.name}-${columnIndex}-${index}`} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="wsBodyBottom">
          <table className="wah-keyword-table" width="100%" border={0} cellSpacing={0} cellPadding={6}>
            <tbody>
              <tr>
                <td rowSpan={2} className="wsKeywordHeader dsColorBgIJ dsColorFrIJ">
                  <div className="wah-keyword-cell-content">KEYWORDS</div>
                </td>
                <td className="wsKeywordLine1 dsColorFrIJ">
                  <div className="wah-keyword-cell-content">
                    {primaryKeyword ? <Keyword keyword={primaryKeyword} /> : null}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="wsKeywordLine2 dsColorFrIJ">
                  <div className="wah-keyword-cell-content">
                    {secondaryKeywords.map((keyword, index) => (
                      <Keyword
                        keyword={keyword}
                        key={keyword}
                        suffix={index < secondaryKeywords.length - 1 ? "," : ""}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}

function SourceHeader({ faction, name }: { faction: string; name: string }) {
  return (
    <>
      <div className="nails-header">
        <span className="nails">•</span>
        {faction} Warscroll
        <span className="nails">•</span>
      </div>
      <div className="wsHeaderWrap_c">
        <div className="wsHeader">
          <div className="wsHeaderIn" data-card-title>
            {name}
          </div>
        </div>
      </div>
    </>
  );
}

function CornerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="BreakInsideAvoid Corner22f stretchTable">
      <table className="stretchTable collapse" border={0} cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td className="Corner22f_1 dsColorCSSIJ" />
            <td className="Corner22f_2 dsColorCSSIJ" />
            <td className="Corner22f_3 dsColorCSSIJ" />
          </tr>
          <tr>
            <td className="Corner22f_8 dsColorCSSIJ" />
            <td className="Corner22f_9 dsColorBanIJ">{children}</td>
            <td className="Corner22f_4 dsColorCSSIJ" />
          </tr>
          <tr>
            <td className="Corner22f_7 dsColorCSSIJ" />
            <td className="Corner22f_6 dsColorCSSIJ" />
            <td className="Corner22f_5 dsColorCSSIJ" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function WeaponGroup({
  type,
  weapons
}: {
  type: "ranged" | "melee";
  weapons: WarscrollWeapon[];
}) {
  if (weapons.length === 0) {
    return null;
  }

  const hasRange = type === "ranged";
  const title = type === "ranged" ? "Ranged Weapons" : "Melee Weapons";
  const iconClass =
    type === "ranged" ? "wsHeaderCellName_RangedWeapons" : "wsHeaderCellName_MeleeWeapons";
  const firstColumnClass = hasRange ? "wsHeaderCellName" : "wsHeaderCellName_NoRng";

  return (
    <table className="wTable collapse wah-source-weapon-table" border={1} cellSpacing={0} cellPadding={2}>
      <tbody>
        <tr className="dsColorBgIJ wsHeaderRow">
          <td className={`${iconClass} wsDataCell_long`} />
          <td className={firstColumnClass}>
            <div className={`${iconClass} wsDataCell_short`} />
            <span className="wsDataCell_long">{title}</span>
          </td>
          {hasRange ? <td className="wsHeaderCell">Rng</td> : null}
          <td className="wsHeaderCell">Atk</td>
          <td className="wsHeaderCell">Hit</td>
          <td className="wsHeaderCell">Wnd</td>
          <td className="wsHeaderCell">Rnd</td>
          <td className="wsHeaderCell">Dmg</td>
        </tr>
        {weapons.map((weapon) => (
          <tr className="wsDataRow dsColorFrIJ" key={`${weapon.type}-${weapon.name}`}>
            <td className="wsDataCell_long wsBorderN_" />
            <td className="wsDataCell_long wsBorderN_ dsColorFrIJ">
              {weapon.name}
              {weapon.abilities.length > 0 ? (
                <>
                  <br />
                  <span className="wsWeaponAbility">[{weapon.abilities.join(", ")}]</span>
                </>
              ) : null}
              {weapon.hasBattleDamage ? (
                <>
                  <br />
                  <span className="wsDamageText">Battle Damaged</span>
                </>
              ) : null}
            </td>
            {hasRange ? <td className="wsBorderM_ wsCell dsColorFrIJ">{weapon.range ?? "-"}</td> : null}
            <td className="wsBorderM_ wsCell dsColorFrIJ">{weapon.attacks ?? "-"}</td>
            <td className="wsBorderM_ wsCell dsColorFrIJ">{weapon.hit ?? "-"}</td>
            <td className="wsBorderM_ wsCell dsColorFrIJ">{weapon.wound ?? "-"}</td>
            <td className="wsBorderM_ wsCell dsColorFrIJ">{weapon.rend ?? "-"}</td>
            <td className="wsBorderR_ wsCell dsColorFrIJ">{weapon.damage ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AbilityBlock({ ability }: { ability: WarscrollAbility }) {
  const tone = abilityTone(ability);
  const icon = abilityIcon(ability);
  const phase = ability.phase || ability.kind || "Ability";

  return (
    <div className="BreakInsideAvoid wah-source-ability">
      <table width="100%" border={0} cellSpacing={0} cellPadding={0}>
        <tbody>
          <tr>
            <td
              className="wah-ab-cut wah-ab-cut-left"
              style={{ backgroundColor: tone.color }}
            />
            <td className="abHeader" style={{ backgroundColor: tone.color }}>
              <span className={`abLogo abLogo--${icon}`} aria-hidden="true" />
              {phase}
            </td>
            <td
              className="wah-ab-cut wah-ab-cut-right"
              style={{ backgroundColor: tone.color }}
            />
          </tr>
        </tbody>
      </table>
      <div style={{ borderColor: tone.color }} className="abBody abNoReaction">
        <b>
          {ability.name.toUpperCase()}
          {ability.legend ? ":" : ""}
        </b>{" "}
        {ability.legend ? (
          <span className="ShowFluff legend4">
            {ability.legend}
            <br />
            <div className="spc" />
          </span>
        ) : null}
        <div className="wah-ability-text">{ability.text}</div>
        {ability.tags.length > 0 ? (
          <div className="abKeywords" style={{ borderColor: tone.color }}>
            <div className="abHeader abKeywordsBody" style={{ backgroundColor: tone.color }}>
              <span className="kwb">KEYWORDS</span>
            </div>
            <div className="abKeywordsBodyText abNoReaction" style={{ borderColor: tone.color }}>
              {ability.tags.map((tag, index) => (
                <Keyword
                  keyword={tag}
                  key={tag}
                  suffix={index < ability.tags.length - 1 ? "," : ""}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Keyword({ keyword, suffix = "" }: { keyword: string; suffix?: string }) {
  return (
    <span className="wah-keyword-token">
      <span className="kwb kwbu">{keyword}</span>
      {suffix ? `${suffix} ` : " "}
    </span>
  );
}

function splitKeywordRows(keywords: string[]): [string | null, string[]] {
  if (keywords.length === 0) {
    return [null, []];
  }

  const primaryIndex = keywords.findIndex((keyword) =>
    /infantry|cavalry|monster|hero|war machine|beast|manifestation/i.test(keyword)
  );

  if (primaryIndex < 0) {
    return [keywords[0], keywords.slice(1)];
  }

  const primary = keywords[primaryIndex];
  return [primary, keywords.filter((_, index) => index !== primaryIndex)];
}

function statClass(move: string | null) {
  return move && move.length > 3 ? "wsMove wsMoveSmallFontSize" : "wsMove";
}

function sortAbilitiesByPhase(abilities: WarscrollAbility[]): WarscrollAbility[] {
  return abilities
    .map((ability, index) => ({ ability, index }))
    .sort(
      (left, right) =>
        abilityPhaseSortValue(left.ability) - abilityPhaseSortValue(right.ability) ||
        left.index - right.index
    )
    .map(({ ability }) => ability);
}

function splitAbilitiesIntoColumns(abilities: WarscrollAbility[]): WarscrollAbility[][] {
  const columns: WarscrollAbility[][] = [[], []];
  const columnScores = [0, 0];

  abilities.forEach((ability, index) => {
    const columnIndex =
      index < columns.length
        ? index
        : columnScores[0] <= columnScores[1]
          ? 0
          : 1;

    columns[columnIndex].push(ability);
    columnScores[columnIndex] += estimateAbilityHeight(ability);
  });

  return columns;
}

function estimateAbilityHeight(ability: WarscrollAbility): number {
  return (
    80 +
    ability.name.length * 1.3 +
    ability.text.length * 0.33 +
    (ability.legend?.length ?? 0) * 0.28 +
    ability.tags.length * 32
  );
}

function abilityPhaseSortValue(ability: WarscrollAbility): number {
  const phaseText = (ability.phase ?? "").toLowerCase();
  const timingText = (ability.timing ?? "").toLowerCase();
  const kindText = ability.kind.toLowerCase();
  const typeText = abilityTypeText(ability);

  if (
    ability.name.toLowerCase().includes("battle damaged") ||
    typeText.includes("damage") ||
    phaseText.includes("deployment") ||
    phaseText.includes("start")
  ) {
    return 0;
  }

  const phaseValue = phaseSortValueFromText(phaseText);
  if (phaseValue !== null) {
    return phaseValue;
  }

  if (
    kindText.includes("reaction") ||
    phaseText.includes("reaction") ||
    timingText.includes("reaction") ||
    typeText.includes("reaction")
  ) {
    return 70;
  }

  const timingValue = phaseSortValueFromText(timingText);
  if (timingValue !== null) {
    return timingValue;
  }

  return phaseSortValueFromText(abilitySearchText(ability)) ?? 80;
}

function phaseSortValueFromText(text: string): number | null {
  if (!text) {
    return null;
  }

  if (text.includes("deployment") || text.includes("start")) {
    return 0;
  }

  if (text.includes("hero")) {
    return 10;
  }

  if (text.includes("movement") || text.includes("move")) {
    return 20;
  }

  if (text.includes("shooting")) {
    return 30;
  }

  if (text.includes("charge")) {
    return 40;
  }

  if (text.includes("combat")) {
    return 50;
  }

  if (text.includes("end")) {
    return 60;
  }

  return null;
}

function abilityIcon(ability: WarscrollAbility) {
  const abilityType = abilityTypeText(ability);
  const haystack = abilitySearchText(ability);

  if (abilityType.includes("damage") || ability.name.toLowerCase().includes("battle damaged")) {
    return "damage";
  }

  if (abilityType.includes("control")) {
    return "control";
  }

  if (abilityType.includes("rallying")) {
    return "rally";
  }

  if (abilityType.includes("shooting") || haystack.includes("shooting")) {
    return "shooting";
  }

  if (abilityType.includes("defensive") || haystack.includes("defensive")) {
    return "defensive";
  }

  if (abilityType.includes("movement") || haystack.includes("movement") || haystack.includes("move")) {
    return "movement";
  }

  if (abilityType.includes("special")) {
    return "special";
  }

  return "offensive";
}

type AbilityTone = { color: string };

const ABILITY_TONES = {
  battle: {
    color: "#000000"
  },
  charge: {
    color: "#a34d14"
  },
  combat: {
    color: "#802022"
  },
  defensive: {
    color: "#3d5b26"
  },
  end: {
    color: "#5e4a79"
  },
  hero: {
    color: "#76602b"
  },
  movement: {
    color: "#606362"
  },
  shooting: {
    color: "#28435c"
  }
} satisfies Record<string, AbilityTone>;

function abilityTone(ability: WarscrollAbility): AbilityTone {
  const phaseText = (ability.phase ?? "").toLowerCase();
  const timingText = (ability.timing ?? "").toLowerCase();
  const fallbackText = abilitySearchText(ability);
  const typeText = abilityTypeText(ability);
  const phaseTone = toneFromPhase(phaseText) ?? toneFromPhase(timingText);

  if (ability.name.toLowerCase().includes("battle damaged") || typeText.includes("damage")) {
    return ABILITY_TONES.battle;
  }

  if (phaseTone) {
    return phaseTone;
  }

  if (phaseText.includes("defensive reaction") || typeText.includes("defensive")) {
    return ABILITY_TONES.defensive;
  }

  if (typeText.includes("control") || typeText.includes("rallying")) {
    return ABILITY_TONES.end;
  }

  if (typeText.includes("movement") || fallbackText.includes("move")) {
    return ABILITY_TONES.movement;
  }

  if (typeText.includes("shooting") || fallbackText.includes("shooting")) {
    return ABILITY_TONES.shooting;
  }

  if (typeText.includes("special")) {
    return ABILITY_TONES.hero;
  }

  return ABILITY_TONES.combat;
}

function toneFromPhase(phaseText: string): AbilityTone | null {
  if (!phaseText) {
    return null;
  }

  if (phaseText.includes("deployment") || phaseText.includes("start")) {
    return ABILITY_TONES.battle;
  }

  if (phaseText.includes("end")) {
    return ABILITY_TONES.end;
  }

  if (phaseText.includes("hero")) {
    return ABILITY_TONES.hero;
  }

  if (phaseText.includes("movement")) {
    return ABILITY_TONES.movement;
  }

  if (phaseText.includes("shooting")) {
    return ABILITY_TONES.shooting;
  }

  if (phaseText.includes("charge")) {
    return ABILITY_TONES.charge;
  }

  if (phaseText.includes("combat")) {
    return ABILITY_TONES.combat;
  }

  if (phaseText.includes("defensive reaction")) {
    return ABILITY_TONES.defensive;
  }

  return null;
}

function abilitySearchText(ability: WarscrollAbility): string {
  return [ability.type, ability.kind, ability.phase, ability.timing, ability.tags.join(" ")]
    .join(" ")
    .toLowerCase();
}

function abilityTypeText(ability: WarscrollAbility): string {
  return (ability.type ?? ability.kind).toLowerCase();
}
