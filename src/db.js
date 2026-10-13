import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const savePath = path.join(dataDir, "player.json");
const worldPath = path.join(dataDir, "world.json");
const questsPath = path.join(dataDir, "quests.json");

export async function loadWorld() {
  return JSON.parse(await readFile(worldPath, "utf8"));
}

export async function loadPlayer() {
  try {
    return normalizePlayer(JSON.parse(await readFile(savePath, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function normalizePlayer(player) {
  const stats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, crt: 0, ...player.stats };
  return {
    ...player,
    stats,
    statPoints: player.statPoints ?? 0
  };
}

export async function savePlayer(player) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(savePath, `${JSON.stringify(player, null, 2)}\n`, "utf8");
}

export async function deletePlayer() {
  try {
    await unlink(savePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function saveQuests(quests) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(questsPath, `${JSON.stringify(quests, null, 2)}\n`, "utf8");
}

export async function loadQuests() {
  try {
    return JSON.parse(await readFile(questsPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function createPlayer(name, startMapId) {
  return {
    name,
    level: 1,
    exp: 0,
    nextExp: 20,
    stats: { str: 0, agi: 0, vit: 0, int: 0, dex: 0, crt: 0 },
    statPoints: 0,
    hp: 40,
    maxHp: 40,
    attack: 8,
    matk: 5,
    defense: 2,
    mdef: 2,
    crit: 5,
    missChance: 0,
    spina: 0,
    mapId: startMapId,
    wins: 0
  };
}
