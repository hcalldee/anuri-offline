#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createPlayer, deletePlayer, loadPlayer, loadQuests, loadWorld, savePlayer, saveQuests } from "./db.js";
import { allocateStat, attack, getEncounter, getMap, monsterAttack, recalculateStats, reward, statNames, wikiHint } from "./game.js";
import { fetchLegacyQuestCatalog, fetchWikiPage } from "./wiki.js";

const world = await loadWorld();
let player = await loadPlayer();
if (player) recalculateStats(player);
const rl = createInterface({ input, output });
const canClearScreen = Boolean(process.stdout.isTTY);
let refreshMenu = true;

function clearScreen() {
  if (canClearScreen) output.write("\x1b[2J\x1b[H");
}

function divider() {
  console.log("─".repeat(58));
}

function renderMenu() {
  clearScreen();
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║                 IRUNA TURN-BASED CLI                  ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  if (player) {
    console.log(`${player.name} | Lv.${player.level} | HP ${player.hp}/${player.maxHp} | ${getMap(world, player).name}`);
  } else {
    console.log("Belum ada karakter aktif.");
  }
  divider();
  console.log("[PLAYER]  status, stat <nama> <jumlah>, new <nama>, delete");
  console.log("[WORLD]   map, move <map-id>, explore");
  console.log("[BATTLE]  battle");
  console.log("[DATA]    quests, scrape-quests, wiki <path>");
  console.log("[SYSTEM]  clear, help, quit");
  divider();
}

function printHelp() {
  console.log("PLAYER: status | stat <nama> <jumlah> | new <nama> | delete");
  console.log("WORLD : map | move <map-id> | explore");
  console.log("BATTLE: battle");
  console.log("DATA  : quests | scrape-quests | wiki <path>");
  console.log("SYSTEM: clear | help | quit");
}

function printStatus() {
  if (!player) return console.log("Belum ada player. Jalankan: new <nama>");
  console.log(`${player.name} Lv.${player.level} | HP ${player.hp}/${player.maxHp} | ATK ${player.attack} | DEF ${player.defense}`);
  console.log(`Stats: ${statNames.map((stat) => `${stat.toUpperCase()} ${player.stats[stat]}`).join(" | ")} | Point tersedia: ${player.statPoints}`);
  console.log(`Combat: ATK ${player.attack} | MATK ${player.matk} | DEF ${player.defense} | MDEF ${player.mdef}`);
  console.log(`Chance: Crit ${player.crit.toFixed(1)}% | Miss ${player.missChance.toFixed(1)}%`);
  console.log("Effect: STR +2 ATK | INT +2 MATK, +1 MDEF | VIT +4 Max HP, +1 DEF");
  console.log("Effect: AGI +1% Miss Chance | DEX +0.2% Crit | CRT +1% Crit");
  console.log(`EXP ${player.exp}/${player.nextExp} | Spina ${player.spina} | Wins ${player.wins}`);
  console.log(`Map: ${getMap(world, player).name}`);
}

async function battle() {
  if (!player) return console.log("Buat player dulu dengan: new <nama>");
  const monster = getEncounter(world, getMap(world, player));
  console.log(`Encounter: ${monster.name} Lv.${monster.level} (HP ${monster.currentHp})`);
  const hint = await wikiHint(monster);
  console.log(hint.error ? `Wiki: tidak tersedia (${hint.error})` : `Wiki: ${hint.title} — ${hint.url}`);
  while (monster.currentHp > 0 && player.hp > 0) {
    clearScreen();
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log(`║ BATTLE: ${monster.name.padEnd(45)}║`);
    console.log("╚════════════════════════════════════════════════════════╝");
    console.log(`Monster HP: ${monster.currentHp}/${monster.hp}`);
    console.log(`Player HP : ${player.hp}/${player.maxHp}`);
    divider();
    const action = (await rl.question("Aksi [attack/run] > ")).trim().toLowerCase();
    if (action === "run") return console.log("Kamu kabur.");
    if (action !== "attack") continue;
    const playerDamage = attack(player, monster);
    console.log(`Kamu memberi ${playerDamage} damage${player.lastAttackCritical ? " (CRITICAL!)" : ""}.`);
    if (monster.currentHp <= 0) break;
    const enemyAttack = monsterAttack(player, monster);
    console.log(enemyAttack.missed ? `${monster.name} menyerang, tetapi MISS!` : `${monster.name} memberi ${enemyAttack.damage} damage.`);
    console.log(`HP kamu: ${player.hp}/${player.maxHp}`);
  }
  if (player.hp <= 0) {
    player.hp = player.maxHp;
    await savePlayer(player);
    return console.log("Kamu kalah. HP dipulihkan untuk prototype.");
  }
  reward(player, monster);
  await savePlayer(player);
  console.log(`Menang! +${monster.exp} EXP, +${monster.spina} Spina.`);
  if (canClearScreen) await rl.question("\nTekan Enter untuk kembali ke menu...");
}

async function handle(command) {
  const [verb, ...args] = command.trim().split(/\s+/);
  if (verb === "new") {
    const name = args.join(" ").trim();
    if (!name) return console.log("Contoh: new Arjuna");
    player = createPlayer(name, world.startMapId);
    await savePlayer(player);
    return console.log(`Player ${name} dibuat.`);
  }
  if (verb === "delete") {
    if (!player) return console.log("Tidak ada character yang bisa dihapus.");
    const confirmation = (await rl.question(`Ketik nama character (${player.name}) untuk konfirmasi: `)).trim();
    if (confirmation !== player.name) return console.log("Konfirmasi tidak cocok. Character tidak dihapus.");
    await deletePlayer();
    player = null;
    refreshMenu = true;
    return console.log("Character berhasil dihapus.");
  }
  if (verb === "status") return printStatus();
  if (verb === "clear") {
    clearScreen();
    refreshMenu = true;
    return;
  }
  if (verb === "stat") {
    if (!player) return console.log("Buat player dulu dengan: new <nama>");
    try {
      allocateStat(player, args[0], Number(args[1]));
      await savePlayer(player);
      return console.log(`Stat ${args[0].toUpperCase()} berhasil ditambah ${args[1]}.`);
    } catch (error) {
      return console.log(`Gagal tambah stat: ${error.message}`);
    }
  }
  if (verb === "explore") {
    if (!player) return console.log("Buat player dulu dengan: new <nama>");
    const map = getMap(world, player);
    return console.log(`${map.name}: ${map.description}\nEncounter: ${map.encounters.map((id) => world.monsters[id].name).join(", ")}`);
  }
  if (verb === "map") {
    return Object.values(world.maps).forEach((map) => {
      const marker = player?.mapId === map.id ? "*" : " ";
      console.log(`${marker} ${map.id}: ${map.name}`);
    });
  }
  if (verb === "move") {
    if (!player) return console.log("Buat player dulu dengan: new <nama>");
    const map = getMap(world, player);
    const destination = args[0];
    if (!map.nextMaps.includes(destination)) return console.log(`Tujuan harus salah satu dari: ${map.nextMaps.join(", ") || "tidak ada"}`);
    player.mapId = destination;
    await savePlayer(player);
    return console.log(`Berpindah ke ${getMap(world, player).name}.`);
  }
  if (verb === "battle") {
    const result = await battle();
    refreshMenu = true;
    return result;
  }
  if (verb === "wiki") {
    if (!args[0]) return console.log("Contoh: wiki monster/green_slime");
    try {
      const page = await fetchWikiPage(args[0]);
      return console.log(`${page.title}\n${page.url}`);
    } catch (error) {
      return console.log(`Gagal mengambil wiki: ${error.message}`);
    }
  }
  if (verb === "quests") {
    const quests = await loadQuests();
    return console.log(quests ? `${quests.count} quest tersimpan dari ${quests.source}` : "Belum ada quest. Jalankan scrape-quests.");
  }
  if (verb === "scrape-quests") {
    try {
      const mapNames = Object.values(world.maps).map((map) => map.name);
      const quests = await fetchLegacyQuestCatalog(args[0] === "all" ? undefined : mapNames);
      await saveQuests(quests);
      return console.log(`${quests.count} quest dari ${quests.mapCount} map disimpan ke data/quests.json.`);
    } catch (error) {
      return console.log(`Gagal scrape quest: ${error.message}`);
    }
  }
  if (verb === "help") return printHelp();
  if (verb === "quit" || verb === "exit") return false;
  if (verb) console.log("Command tidak dikenal. Ketik help.");
  return true;
}

let running = true;
while (running) {
  if (refreshMenu) {
    renderMenu();
    refreshMenu = false;
  }
  const result = await handle(await rl.question("iruna> "));
  running = result !== false;
}
rl.close();
