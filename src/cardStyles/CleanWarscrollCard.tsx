import { forwardRef } from "react";
import type { CSSProperties, ForwardedRef } from "react";
import type { WarscrollAbility } from "../types";
import type { CardRendererProps } from "./types";

export const CleanWarscrollCard = forwardRef<HTMLElement, CardRendererProps>(
  CleanWarscrollCardInner
);

export const CleanBlackWhiteWarscrollCard = forwardRef<HTMLElement, CardRendererProps>(
  CleanBlackWhiteWarscrollCardInner
);

function CleanWarscrollCardInner(
  props: CardRendererProps,
  ref: ForwardedRef<HTMLElement>
) {
  return <CleanWarscrollCardLayout {...props} cardStyleId="clean" cardRef={ref} />;
}

function CleanBlackWhiteWarscrollCardInner(
  props: CardRendererProps,
  ref: ForwardedRef<HTMLElement>
) {
  return <CleanWarscrollCardLayout {...props} cardStyleId="clean-bw" cardRef={ref} />;
}

function CleanWarscrollCardLayout(
  {
    warscroll,
    size,
    compact,
    cardStyleId,
    cardRef
  }: CardRendererProps & {
    cardStyleId: "clean" | "clean-bw";
    cardRef: ForwardedRef<HTMLElement>;
  }
) {
  return (
    <article
      ref={cardRef}
      className={`warscroll-card warscroll-card--${size}${compact ? " is-compact" : ""}`}
      data-card-style={cardStyleId}
      data-card-size={size}
    >
      <header className="card-header">
        <div>
          <p>{warscroll.faction}</p>
          <h2 data-card-title>{warscroll.name}</h2>
          {warscroll.subtitle ? <span>{warscroll.subtitle}</span> : null}
        </div>
        <dl className="points-box">
          <div>
            <dt>Pts</dt>
            <dd>{warscroll.points ?? "-"}</dd>
          </div>
          <div>
            <dt>Models</dt>
            <dd>{warscroll.unitSize ?? "-"}</dd>
          </div>
        </dl>
      </header>

      <section className="stat-row" aria-label="Stats">
        <Stat label="Move" value={warscroll.stats.move} />
        <Stat label="Save" value={warscroll.stats.save} />
        <Stat label="Control" value={warscroll.stats.control} />
        <Stat label="Health" value={warscroll.stats.health} />
        <Stat label="Ward" value={warscroll.stats.ward} />
      </section>

      {warscroll.weapons.length > 0 ? (
        <section className="card-section">
          <table className="weapon-table">
            <thead>
              <tr>
                <th>Weapon</th>
                <th>Rng</th>
                <th>Atk</th>
                <th>Hit</th>
                <th>Wnd</th>
                <th>Rnd</th>
                <th>Dmg</th>
                <th>Ability</th>
              </tr>
            </thead>
            <tbody>
              {warscroll.weapons.map((weapon) => (
                <tr key={`${weapon.type}-${weapon.name}`}>
                  <td>
                    <span className={`weapon-type weapon-type--${weapon.type}`}>
                      {weapon.type}
                    </span>
                    {weapon.hasBattleDamage ? <em>Battle Damaged</em> : null}
                    {weapon.name}
                  </td>
                  <td className="weapon-table__stat">{weapon.range ?? "-"}</td>
                  <td className="weapon-table__stat">{weapon.attacks ?? "-"}</td>
                  <td className="weapon-table__stat">{weapon.hit ?? "-"}</td>
                  <td className="weapon-table__stat">{weapon.wound ?? "-"}</td>
                  <td className="weapon-table__stat">{weapon.rend ?? "-"}</td>
                  <td className="weapon-table__stat">{weapon.damage ?? "-"}</td>
                  <td>{weapon.abilities.join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="card-section abilities-section">
        <div className="abilities-list">
          {warscroll.abilities.map((ability) => (
            <article
              className="ability"
              key={`${ability.phase}-${ability.name}`}
              style={abilityPhaseStyle(ability)}
            >
              <p className="ability__body">
                <span className="ability__chip-list" aria-label="Ability timing and type">
                  {abilityChips(ability).map((chip) => (
                    <span
                      className={`ability__chip ability__chip--${chip.tone}`}
                      key={chip.label}
                    >
                      {chip.label}
                    </span>
                  ))}
                </span>
                <strong className="ability__name">{ability.name}:</strong>{" "}
                {ability.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="card-section keywords-section">
        <div className="keyword-list">
          {warscroll.keywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      </section>

    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value ?? "-"}</dd>
    </div>
  );
}

const CLEAN_ABILITY_PHASE_COLORS = {
  battle: "#000000",
  charge: "#a34d14",
  combat: "#802022",
  defensive: "#3d5b26",
  end: "#5e4a79",
  hero: "#76602b",
  movement: "#606362",
  shooting: "#28435c"
} as const;

type CleanAbilityPhaseTone = keyof typeof CLEAN_ABILITY_PHASE_COLORS;
type AbilityChip = { label: string; tone: "phase" | "meta" };

function abilityChips(ability: WarscrollAbility): AbilityChip[] {
  const chips: AbilityChip[] = [];
  const seen = new Set<string>();
  const addChip = (label: string | null, tone: AbilityChip["tone"]) => {
    const normalizedLabel = label?.trim();

    if (!normalizedLabel) {
      return;
    }

    const key = normalizedLabel.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    chips.push({ label: normalizedLabel, tone });
  };

  addChip(ability.phase, "phase");
  addChip(
    ability.timing,
    toneFromPhaseText(ability.timing) ? "phase" : "meta"
  );

  ability.tags.forEach((tag) => addChip(tag, "meta"));
  addChip(ability.kind, "meta");

  return chips;
}

function abilityPhaseStyle(ability: WarscrollAbility): CSSProperties {
  return {
    "--ability-phase-color":
      CLEAN_ABILITY_PHASE_COLORS[abilityPhaseTone(ability)]
  } as CSSProperties;
}

function abilityPhaseTone(ability: WarscrollAbility): CleanAbilityPhaseTone {
  const phaseTone =
    toneFromPhaseText(ability.phase) ?? toneFromPhaseText(ability.timing);

  if (phaseTone) {
    return phaseTone;
  }

  const typeText = (ability.type ?? ability.kind).toLowerCase();
  const searchText = [
    ability.type,
    ability.kind,
    ability.phase,
    ability.timing,
    ability.tags.join(" ")
  ]
    .join(" ")
    .toLowerCase();

  if (ability.name.toLowerCase().includes("battle damaged") || typeText.includes("damage")) {
    return "battle";
  }

  if (typeText.includes("defensive")) {
    return "defensive";
  }

  if (typeText.includes("control") || typeText.includes("rallying")) {
    return "end";
  }

  if (typeText.includes("movement") || searchText.includes("move")) {
    return "movement";
  }

  if (typeText.includes("shooting") || searchText.includes("shooting")) {
    return "shooting";
  }

  if (typeText.includes("special")) {
    return "hero";
  }

  return "combat";
}

function toneFromPhaseText(value: string | null): CleanAbilityPhaseTone | null {
  const phaseText = (value ?? "").toLowerCase();

  if (!phaseText) {
    return null;
  }

  if (phaseText.includes("defensive reaction")) {
    return "defensive";
  }

  if (phaseText.includes("deployment") || phaseText.includes("start")) {
    return "battle";
  }

  if (phaseText.includes("end")) {
    return "end";
  }

  if (phaseText.includes("hero")) {
    return "hero";
  }

  if (phaseText.includes("movement") || phaseText.includes("move")) {
    return "movement";
  }

  if (phaseText.includes("shooting")) {
    return "shooting";
  }

  if (phaseText.includes("charge")) {
    return "charge";
  }

  if (phaseText.includes("combat")) {
    return "combat";
  }

  return null;
}
