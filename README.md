# AoS Warscroll Print Composer

AoS Warscroll Print Composer is a static React/Vite app for composing printable
warscroll cards from user-supplied AoS 4 export CSV files.

The app ships with fictional sample data so the interface works immediately. It
does not bundle official warscroll export data, generated official data, or a
runtime downloader.

## Install

```powershell
npm install
```

## Dev

```powershell
npm run generate:data
npm run dev
```

Open the Vite URL. The catalogue initially uses synthetic sample data. Use
`Load data` in the app to select locally downloaded CSV files for the current
browser session.

Useful sample searches:

- `Skyforge Sentinels`
- `Furnace Colossus`
- `Lantern Bastion`

## Build

```powershell
npm run build
```

The build is frontend-only. It generates the synthetic sample bundle, verifies
that official/export-derived data artifacts are absent, runs TypeScript, builds
with Vite, then verifies the built output again.

## Data Workflow

Bundled demo data lives in:

```text
sample-data/aos4-export/
```

Generated sample runtime data is written to:

```text
public/generated/sample-aos4-warscroll-data.json
```

Do not commit official export CSV files, workbooks, downloaded pages, refresh
reports, or generated official runtime bundles. Keep any downloaded source
files outside the repository or in local ignored scratch space.

Required user-selected CSV files:

- `Factions.csv`
- `Source.csv`
- `Warscrolls.csv`
- `Warscrolls_abilities.csv`
- `Warscrolls_bases.csv`
- `Warscrolls_keywords.csv`
- `Warscrolls_weapons.csv`
- `Last_update.csv`

Selected files are parsed locally in the browser and kept in memory for the
current session. They are not uploaded or persisted.

## Verification

```powershell
npm run typecheck
npm run verify:data-boundary
npm run build
npm run verify:layout
```

`verify:layout` expects a built `dist/` folder and uses the synthetic sample
catalogue.
