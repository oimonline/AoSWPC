import { createServer } from "node:http";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const screenshotDir = join(root, "screenshots");
const profileDir = join(root, ".chrome-layout-check");
const chromePath = findChrome();
const sampleUploadFiles = [
  "Factions.csv",
  "Source.csv",
  "Warscrolls.csv",
  "Warscrolls_abilities.csv",
  "Warscrolls_bases.csv",
  "Warscrolls_keywords.csv",
  "Warscrolls_weapons.csv",
  "Last_update.csv"
].map((fileName) => join(root, "sample-data", "aos4-export", fileName));

if (!chromePath) {
  throw new Error("Chrome was not found. Set CHROME_PATH to run layout verification.");
}

mkdirSync(screenshotDir, { recursive: true });

if (!profileDir.startsWith(root)) {
  throw new Error("Refusing to clear a Chrome profile outside the project workspace.");
}

rmSync(profileDir, { recursive: true, force: true });

const staticServer = process.env.APP_URL ? null : await startStaticServer();
const appUrl = process.env.APP_URL ?? staticServer.url;

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  userDataDir: profileDir,
  defaultViewport: { width: 1280, height: 1100, deviceScaleFactor: 1 },
  args: [
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--remote-allow-origins=*"
  ]
});

try {
  const page = await browser.newPage();
  const requests = [];
  const consoleMessages = [];

  page.on("request", (request) => {
    requests.push(request.url());
  });
  page.on("console", (message) => {
    consoleMessages.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    consoleMessages.push(`pageerror: ${error.message}`);
  });

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#catalogue-search:not([disabled])", { timeout: 10000 });

  const initial = await inspectInitialState(page);
  const filters = await inspectFilters(page);

  const sentinelClean = await searchAndMeasure(page, {
    query: "Skyforge Sentinels",
    expectedTitle: "Skyforge Sentinels",
    styleId: "clean",
    screenshotName: "sample-sentinel-clean.png",
    consoleMessages
  });

  const fulcrumClean = await searchAndMeasure(page, {
    query: "Argent Fulcrum",
    expectedTitle: "Argent Fulcrum",
    styleId: "clean",
    screenshotName: "sample-fulcrum-clean.png",
    consoleMessages
  });

  const colossusSourceLike = await searchAndMeasure(page, {
    query: "Furnace Colossus",
    expectedTitle: "Furnace Colossus",
    styleId: "wahapedia-like",
    screenshotName: "sample-colossus-source-like.png",
    consoleMessages
  });

  const batch = await inspectBatchAndPrint(page);
  const thirdA4 = await inspectThirdA4(page);
  const narrow = await inspectNarrowViewport(page);
  const userImport = await inspectUserImport(page);

  const forbiddenRequests = requests.filter(
    (url) =>
      url.includes("wahapedia.ru") ||
      url.includes("/styles/wahapedia-like/source/") ||
      /\/data\/.*\.csv(?:[?#]|$)/.test(url) ||
      /\/generated\/aos4-warscroll-data\.json(?:[?#]|$)/.test(url)
  );

  const result = {
    appUrl,
    initial,
    filters,
    sentinelClean,
    fulcrumClean,
    colossusSourceLike,
    batch,
    thirdA4,
    narrow,
    userImport,
    forbiddenRequests,
    screenshots: [
      "screenshots/sample-sentinel-clean.png",
      "screenshots/sample-fulcrum-clean.png",
      "screenshots/sample-colossus-source-like.png"
    ]
  };

  console.log(JSON.stringify(result, null, 2));

  if (!initial.sampleBadge || !initial.sampleSourceVisible || initial.userBadge) {
    throw new Error(`Initial sample data status is wrong: ${JSON.stringify(initial)}`);
  }

  if (
    !filters.skyforgeOnly ||
    !filters.prismHiddenByDefaults ||
    !filters.prismVisibleAfterClearingFilters
  ) {
    throw new Error(`Catalogue filters failed: ${JSON.stringify(filters)}`);
  }

  for (const measurement of [sentinelClean, fulcrumClean, colossusSourceLike]) {
    if (measurement.overflow) {
      throw new Error(`Sample card overflowed: ${JSON.stringify(measurement)}`);
    }
  }

  if (sentinelClean.cardStyle !== "clean" || fulcrumClean.cardStyle !== "clean") {
    throw new Error("Clean card style was not represented in the DOM.");
  }

  if (colossusSourceLike.cardStyle !== "wahapedia-like") {
    throw new Error("Source-like card style was not represented in the DOM.");
  }

  if (
    !batch.twoCardsSelected ||
    !batch.printHidesCatalogue ||
    !batch.printShowsCards ||
    !batch.printPreservesStyle ||
    batch.printOverflow
  ) {
    throw new Error(`Batch print verification failed: ${JSON.stringify(batch)}`);
  }

  if (
    !thirdA4.optionAvailable ||
    !thirdA4.threeCardsSelected ||
    !thirdA4.threeCardsOnOnePage ||
    !thirdA4.printPreservesThirdSize ||
    thirdA4.printOverflow
  ) {
    throw new Error(`Third A4 verification failed: ${JSON.stringify(thirdA4)}`);
  }

  if (narrow.documentOverflowX || narrow.previewHasHorizontalScroll) {
    throw new Error(`Narrow viewport has unexpected horizontal overflow: ${JSON.stringify(narrow)}`);
  }

  if (!userImport.userBadge || !userImport.sampleBadgeAfterReset || !userImport.importedSearchWorks) {
    throw new Error(`User import verification failed: ${JSON.stringify(userImport)}`);
  }

  if (forbiddenRequests.length > 0) {
    throw new Error(`Runtime made forbidden data/style requests: ${forbiddenRequests.join(", ")}`);
  }
} finally {
  await browser.close();
  await staticServer?.close();
}

async function inspectInitialState(page) {
  return page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent ?? "",
    sampleBadge: document.querySelector(".data-badge")?.textContent?.includes("Sample data") ?? false,
    userBadge: document.querySelector(".data-badge")?.textContent?.includes("User-loaded") ?? false,
    sampleSourceVisible:
      document.querySelector(".toolbar__title p")?.textContent?.includes("Synthetic sample dataset") ?? false,
    resultCount: document.querySelectorAll(".result-button").length,
    loadButtonVisible: Array.from(document.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "Load data"
    )
  }));
}

async function inspectFilters(page) {
  await setFaction(page, "SKY");
  const skyforge = await page.evaluate(() => {
    const visible = Array.from(document.querySelectorAll(".result-button"));
    return {
      names: visible.map((item) => item.dataset.entryName),
      factions: visible.map((item) => item.dataset.entryFaction)
    };
  });

  await setFaction(page, "");
  await setSearch(page, "Prismbound Envoys");
  const prismHiddenByDefaults = !(await hasResult(page, "Prismbound Envoys"));
  await setCheckbox(page, "#hide-no-points", false);
  await setCheckbox(page, "#hide-no-unit-size", false);
  await waitForResult(page, "Prismbound Envoys");
  const prismVisibleAfterClearingFilters = await hasResult(page, "Prismbound Envoys");

  return {
    skyforge,
    skyforgeOnly:
      skyforge.names.includes("Skyforge Sentinels") &&
      skyforge.names.includes("Argent Fulcrum") &&
      skyforge.factions.length > 0 &&
      skyforge.factions.every((faction) => faction === "Skyforge Accord"),
    prismHiddenByDefaults,
    prismVisibleAfterClearingFilters
  };
}

async function searchAndMeasure(
  page,
  { query, expectedTitle, styleId, screenshotName, consoleMessages }
) {
  await clearSelected(page);
  await setSearch(page, "");
  await setFaction(page, "");
  await setCheckbox(page, "#hide-no-points", false);
  await setCheckbox(page, "#hide-no-unit-size", false);
  await setStyle(page, styleId);
  await setSize(page, "auto");
  await searchAndSelect(page, query, expectedTitle);
  await waitForCard(page, expectedTitle, consoleMessages);
  await waitForAutoFitToSettle(page, expectedTitle);

  const measurement = await readSelectedCardMeasurement(page);

  await page.screenshot({
    path: join(screenshotDir, screenshotName),
    fullPage: false
  });

  return measurement;
}

async function inspectBatchAndPrint(page) {
  await clearSelected(page);
  await setSearch(page, "");
  await setFaction(page, "");
  await setCheckbox(page, "#hide-no-points", false);
  await setCheckbox(page, "#hide-no-unit-size", false);
  await setStyle(page, "wahapedia-like");
  await setSize(page, "auto");

  await searchAndSelect(page, "Skyforge Sentinels", "Skyforge Sentinels");
  await searchAndSelect(page, "Lantern Bastion", "Lantern Bastion");
  await page.waitForFunction(
    () => document.querySelectorAll(".print-stage .batch-print-card").length === 2,
    { timeout: 5000 }
  );
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));

  await page.emulateMediaType("print");
  const print = await page.evaluate(() => {
    const catalogue = document.querySelector(".catalogue-panel");
    const results = document.querySelector(".results-panel");
    const cards = Array.from(document.querySelectorAll(".print-stage .batch-print-card"));
    const warscrollCards = Array.from(document.querySelectorAll(".print-stage .warscroll-card"));

    return {
      catalogueDisplay: catalogue ? getComputedStyle(catalogue).display : null,
      resultsDisplay: results ? getComputedStyle(results).display : null,
      names: cards.map((item) => item.dataset.batchCardName),
      styles: warscrollCards.map((item) => item.dataset.cardStyle),
      overflow: warscrollCards.some(
        (card) => card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1
      )
    };
  });
  await page.emulateMediaType("screen");

  return {
    print,
    twoCardsSelected:
      print.names.includes("Skyforge Sentinels") && print.names.includes("Lantern Bastion"),
    printHidesCatalogue: print.catalogueDisplay === "none" && print.resultsDisplay === "none",
    printShowsCards: print.names.length === 2,
    printPreservesStyle: print.styles.every((style) => style === "wahapedia-like"),
    printOverflow: print.overflow
  };
}

async function inspectThirdA4(page) {
  await clearSelected(page);
  await setSearch(page, "");
  await setFaction(page, "");
  await setCheckbox(page, "#hide-no-points", false);
  await setCheckbox(page, "#hide-no-unit-size", false);
  await setStyle(page, "clean");
  await setSize(page, "third-a4");

  await searchAndSelect(page, "Skyforge Sentinels", "Skyforge Sentinels");
  await searchAndSelect(page, "Lantern Bastion", "Lantern Bastion");
  await searchAndSelect(page, "Argent Fulcrum", "Argent Fulcrum");
  await page.waitForFunction(
    () => document.querySelectorAll(".print-stage .batch-print-card").length === 3,
    { timeout: 5000 }
  );
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));

  const screen = await page.evaluate(() => {
    const optionAvailable = Array.from(document.querySelectorAll("#size-mode option")).some(
      (option) => option.value === "third-a4" && option.textContent?.includes("3/page")
    );
    const pages = Array.from(document.querySelectorAll(".print-stage .batch-print-page"));
    const cards = Array.from(document.querySelectorAll(".print-stage .batch-print-card"));

    return {
      optionAvailable,
      pageCount: pages.length,
      pageTypes: pages.map((page) => page.dataset.batchPage),
      cardSizes: cards.map((card) => card.dataset.batchCardSize),
      cardHeights: cards.map((card) => Math.round(card.getBoundingClientRect().height))
    };
  });

  await page.emulateMediaType("print");
  const print = await page.evaluate(() => {
    const pages = Array.from(document.querySelectorAll(".print-stage .batch-print-page"));
    const cards = Array.from(document.querySelectorAll(".print-stage .batch-print-card"));
    const warscrollCards = Array.from(document.querySelectorAll(".print-stage .warscroll-card"));

    return {
      pageCount: pages.length,
      pageTypes: pages.map((page) => page.dataset.batchPage),
      names: cards.map((item) => item.dataset.batchCardName),
      sizes: cards.map((item) => item.dataset.batchCardSize),
      overflow: warscrollCards.some(
        (card) => card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1
      )
    };
  });
  await page.emulateMediaType("screen");

  return {
    ...screen,
    print,
    threeCardsSelected:
      print.names.includes("Skyforge Sentinels") &&
      print.names.includes("Lantern Bastion") &&
      print.names.includes("Argent Fulcrum"),
    threeCardsOnOnePage: print.pageCount === 1 && print.pageTypes[0] === "third",
    printPreservesThirdSize: print.sizes.length === 3 && print.sizes.every((size) => size === "third-a4"),
    printOverflow: print.overflow
  };
}

async function inspectNarrowViewport(page) {
  await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 1, isMobile: true });
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#catalogue-search:not([disabled])", { timeout: 10000 });
  await searchAndSelect(page, "Skyforge Sentinels", "Skyforge Sentinels");
  await waitForCard(page, "Skyforge Sentinels");

  return page.evaluate(() => {
    const doc = document.documentElement;
    const preview = document.querySelector(".preview-scroll");

    return {
      viewportWidth: window.innerWidth,
      documentOverflowX: doc.scrollWidth > doc.clientWidth + 1,
      previewHasHorizontalScroll: preview ? preview.scrollWidth > preview.clientWidth + 1 : false
    };
  });
}

async function inspectUserImport(page) {
  await page.setViewport({ width: 1280, height: 1100, deviceScaleFactor: 1 });
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#catalogue-search:not([disabled])", { timeout: 10000 });

  const input = await page.$("input[type='file']");

  if (!input) {
    throw new Error("Hidden data file input was not found.");
  }

  await input.uploadFile(...sampleUploadFiles);
  await page.waitForFunction(
    () => document.querySelector(".data-badge")?.textContent?.includes("User-loaded data"),
    { timeout: 5000 }
  );
  const userBadge = await page.evaluate(
    () => document.querySelector(".data-badge")?.textContent?.includes("User-loaded data") ?? false
  );

  await setSearch(page, "Lantern Bastion");
  await waitForResult(page, "Lantern Bastion");
  const importedSearchWorks = await hasResult(page, "Lantern Bastion");

  await clickButtonByText(page, ".data-source-actions button", "Reset sample");
  await page.waitForFunction(
    () => document.querySelector(".data-badge")?.textContent?.includes("Sample data"),
    { timeout: 5000 }
  );

  return page.evaluate(({ searchWorked, sawUserBadge }) => ({
    userBadge: sawUserBadge,
    sampleBadgeAfterReset: document.querySelector(".data-badge")?.textContent?.includes("Sample data") ?? false,
    importedSearchWorks: searchWorked,
    statusText: document.querySelector(".toolbar__title p")?.textContent ?? ""
  }), { searchWorked: importedSearchWorks, sawUserBadge: userBadge });
}

async function searchAndSelect(page, query, expectedTitle) {
  await setSearch(page, query);
  await waitForResult(page, expectedTitle);

  await page.evaluate((seedLabel) => {
    const button = Array.from(document.querySelectorAll(".result-button")).find(
      (item) => item.dataset.entryName === seedLabel
    );

    if (!button) {
      throw new Error(`Catalogue result not found: ${seedLabel}`);
    }

    button.click();
  }, expectedTitle);
}

async function setSearch(page, query) {
  await page.evaluate((nextQuery) => {
    const input = document.querySelector("#catalogue-search");
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;

    if (!input || !valueSetter) {
      throw new Error("Catalogue search input not found.");
    }

    valueSetter.call(input, nextQuery);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, query);

  await page.waitForFunction(
    (expectedQuery) => document.querySelector("#catalogue-search")?.value === expectedQuery,
    { timeout: 5000 },
    query
  );
}

async function setFaction(page, factionId) {
  await page.select("#faction-filter", factionId);
  await page.waitForFunction(
    (expectedFactionId) => document.querySelector("#faction-filter")?.value === expectedFactionId,
    { timeout: 5000 },
    factionId
  );
}

async function setStyle(page, styleId) {
  await page.select("#card-style", styleId);
  await page.waitForFunction(
    (expectedStyleId) => document.querySelector("#card-style")?.value === expectedStyleId,
    { timeout: 5000 },
    styleId
  );
}

async function setSize(page, sizeMode) {
  await page.select("#size-mode", sizeMode);
  await page.waitForFunction(
    (expectedSizeMode) => document.querySelector("#size-mode")?.value === expectedSizeMode,
    { timeout: 5000 },
    sizeMode
  );
}

async function setCheckbox(page, selector, checked) {
  await page.evaluate(
    ({ checked: nextChecked, selector: inputSelector }) => {
      const input = document.querySelector(inputSelector);

      if (!input) {
        throw new Error(`Checkbox not found: ${inputSelector}`);
      }

      if (input.checked !== nextChecked) {
        input.click();
      }
    },
    { checked, selector }
  );
}

async function waitForResult(page, expectedTitle) {
  await page.waitForFunction(
    (title) =>
      Array.from(document.querySelectorAll(".result-button")).some(
        (item) => item.dataset.entryName === title
      ),
    { timeout: 5000 },
    expectedTitle
  );
}

async function hasResult(page, expectedTitle) {
  return page.evaluate((title) =>
    Array.from(document.querySelectorAll(".result-button")).some(
      (item) => item.dataset.entryName === title
    ),
  expectedTitle);
}

async function waitForCard(page, title, consoleMessages = []) {
  try {
    await page.waitForFunction(
      (expectedTitle) =>
        document.querySelector("[data-card-title]")?.textContent === expectedTitle,
      { timeout: 5000 },
      title
    );
  } catch (error) {
    const state = await page.evaluate(() => ({
      bodyText: document.body.innerText,
      statuses: Array.from(document.querySelectorAll(".status")).map((item) => item.textContent)
    }));

    throw new Error(
      `Timed out waiting for ${title}. State: ${JSON.stringify(state)}. Console: ${consoleMessages.join(" | ")}`,
      { cause: error }
    );
  }
}

async function clearSelected(page) {
  await clickButtonByText(page, ".print-setup__actions button", "Clear selected", {
    optional: true
  });
  await page.waitForFunction(
    () => document.querySelectorAll(".print-stage .batch-print-card").length === 0,
    { timeout: 5000 }
  );
}

async function clickButtonByText(page, selector, text, { optional = false } = {}) {
  const clicked = await page.evaluate(
    ({ selector: buttonSelector, text: buttonText }) => {
      const button = Array.from(document.querySelectorAll(buttonSelector)).find(
        (item) => item.textContent?.trim() === buttonText
      );

      if (!button || button.disabled) {
        return false;
      }

      button.click();
      return true;
    },
    { selector, text }
  );

  if (!clicked && !optional) {
    throw new Error(`Button not found or disabled: ${text}`);
  }
}

async function waitForAutoFitToSettle(page, expectedTitle) {
  let previous = "";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    const current = await page.evaluate((title) => {
      const batchCard = Array.from(document.querySelectorAll(".print-stage .batch-print-card"))
        .find((item) => item.dataset.batchCardName === title);
      const card = batchCard?.querySelector(".warscroll-card");

      return JSON.stringify({
        compact: card?.classList.contains("is-compact") ?? false,
        size: batchCard?.dataset.batchCardSize ?? null
      });
    }, expectedTitle);

    if (current === previous) {
      return;
    }

    previous = current;
  }
}

async function readSelectedCardMeasurement(page) {
  return page.evaluate(() => {
    const batchCard = document.querySelector(".print-stage .batch-print-card");
    const card = batchCard?.querySelector(".warscroll-card");
    const rect = card?.getBoundingClientRect();
    const size = batchCard?.dataset.batchCardSize;
    const resolvedSize =
      size === "third-a4" ? "Third A4" : size === "full-a4" ? "Full A4" : "Half A4";

    return {
      title: card?.querySelector("[data-card-title]")?.textContent ?? "",
      resolvedSize,
      cardStyle: card?.dataset.cardStyle ?? null,
      compact: card?.classList.contains("is-compact") ?? false,
      overflow: card
        ? card.scrollHeight > card.clientHeight + 1 ||
          card.scrollWidth > card.clientWidth + 1
        : true,
      width: rect ? Math.round(rect.width) : 0,
      height: rect ? Math.round(rect.height) : 0
    };
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

async function startStaticServer() {
  if (!existsSync(join(distDir, "index.html"))) {
    throw new Error("Built app not found. Run npm.cmd run build before npm.cmd run verify:layout.");
  }

  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const requestPath = decodeURIComponent(requestUrl.pathname);
      const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
      const filePath = resolve(distDir, relativePath);
      const distPrefix = `${resolve(distDir)}${sep}`;

      if (filePath !== resolve(distDir, "index.html") && !filePath.startsWith(distPrefix)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const content = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": contentType(filePath),
        "Cache-Control": "no-store"
      });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  await new Promise((resolveListen) => {
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not start static verification server.");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) {
            rejectClose(error);
          } else {
            resolveClose();
          }
        });
      })
  };
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".csv":
      return "text/csv; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
