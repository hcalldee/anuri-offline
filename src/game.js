import { fetchWikiPage } from "./wiki.js";

export const statNames = ["str", "agi", "vit", "int", "dex", "crt"];

export function getMap(world, player) {
  return world.maps[player.mapId];
}

export function getEncounter(world, map) {
  const candidates = map.encounters.filter((id) => world.monsters[id]);
  if (!candidates.length) throw new Error(`Map ${map.id} tidak memiliki monster valid`);
  const id = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...world.monsters[id], currentHp: world.monsters[id].hp };
}

export function recalculateStats(player) {
  player.maxHp = 40 + player.stats.vit * 4;
  player.attack = 8 + player.stats.str * 2;
  player.matk = 5 + player.stats.int * 2;
  player.defense = 2 + player.stats.vit;
  player.mdef = 2 + player.stats.int;
  player.crit = 5 + player.stats.crt + player.stats.dex * 0.2;
  player.missChance = Math.min(50, player.stats.agi);
  player.hp = Math.min(player.hp, player.maxHp);
  return player;
}

export function allocateStat(player, stat, amount) {
  if (!statNames.includes(stat)) throw new Error(`Stat harus salah satu: ${statNames.join(", ")}`);
  if (!Number.isInteger(amount) || amount < 1) throw new Error("Jumlah point harus bilangan positif");
  if (amount > player.statPoints) throw new Error(`Point tidak cukup. Tersedia: ${player.statPoints}`);
  player.stats[stat] += amount;
  player.statPoints -= amount;
  recalculateStats(player);
  return player;
}

export function attack(player, monster) {
  const baseDamage = Math.max(1, player.attack - monster.defense + Math.floor(Math.random() * 3));
  const critical = Math.random() * 100 < player.crit;
  const damage = critical ? baseDamage * 2 : baseDamage;
  player.lastAttackCritical = critical;
  monster.currentHp = Math.max(0, monster.currentHp - damage);
  return damage;
}

export function monsterAttack(player, monster) {
  if (Math.random() * 100 < player.missChance) {
    return { damage: 0, missed: true };
  }
  const damage = Math.max(1, monster.attack - player.defense + Math.floor(Math.random() * 2));
  player.hp = Math.max(0, player.hp - damage);
  return { damage, missed: false };
}

export function reward(player, monster) {
  player.exp += monster.exp;
  player.spina += monster.spina;
  player.wins += 1;
  while (player.exp >= player.nextExp) {
    player.exp -= player.nextExp;
    player.nextExp = Math.floor(player.nextExp * 1.5);
    player.level += 1;
    player.statPoints += 5;
    recalculateStats(player);
    player.hp = player.maxHp;
  }
}

export async function wikiHint(monster) {
  try {
    return await fetchWikiPage(monster.wikiPath);
  } catch (error) {
    return { error: error.message, url: monster.wikiPath };
  }
}
