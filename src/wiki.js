const defaultBaseUrl = "https://irunawiki.com";
const legacyBaseUrl = "https://v1.irunawiki.com";

function normalizePath(input) {
  return input.startsWith("/") ? input : `/${input}`;
}

function extractSummary(html, url) {
  const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]
    ?.replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const heading = html.match(/<h1[^>]*>(.*?)<\/h1>/is)?.[1]
    ?.replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { url, title: title || heading || "Unknown", heading: heading || null };
}

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchWikiPage(pagePath) {
  const baseUrl = process.env.IRUNA_WIKI_BASE_URL || defaultBaseUrl;
  const url = new URL(normalizePath(pagePath), baseUrl).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Wiki HTTP ${response.status}`);
  return extractSummary(await response.text(), url);
}

export async function fetchLegacyQuestCatalog(mapNames) {
  const base = process.env.IRUNA_WIKI_LEGACY_BASE_URL || legacyBaseUrl;
  const mapsResponse = await fetch(new URL("/api/mapsearch/all", base), { signal: AbortSignal.timeout(15000) });
  if (!mapsResponse.ok) throw new Error(`Legacy map API HTTP ${mapsResponse.status}`);
  const maps = await mapsResponse.json();
  const selectedMaps = mapNames?.length ? maps.filter((map) => mapNames.includes(map.name)) : maps;
  const quests = [];
  for (const map of selectedMaps) {
    const response = await fetch(new URL(`/api/quest?map=${map.id}`, base), { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Legacy quest API HTTP ${response.status} for ${map.name}`);
    const mapQuests = await response.json();
    quests.push(...mapQuests.map((quest) => ({ ...quest, sourceMapId: map.id })));
  }
  return {
    source: `${base}/api/quest?map=<map-id>`,
    fetchedAt: new Date().toISOString(),
    mapCount: selectedMaps.length,
    count: quests.length,
    quests
  };
}
