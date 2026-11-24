
import { getItem } from "./items";
import { itemIdsOf } from "./shop";
import {getActiveSets} from "./items";

import type {
  Backpack,
  BattleEvent,
  BattleResult,
  Fighter,
  FighterItem,
  FighterSnapshot,
  ItemSet,
  Opponent,
  Side,
} from "./types";

/** Seconds per battle tick. */
export const TICK_SECONDS = 0.5;

/** Battles that last longer are decided by the timeout rule. */
export const MAX_TICKS = 60;
export const HERO_BASE_HP = 40;

/** Poison deals one HP damage per stack every four ticks (two seconds). */
export const POISON_INTERVAL = 4;
export const BURN_INTERVAL = 2;
export const BURN_DAMAGE_PER_STACK = 2;

/** Turns item ids into a fighter with the catalog values of each item. */
export function buildFighter(
  itemIds: string[],
  baseHp: number,
  name = "Fighter",
): Fighter {
  const items: FighterItem[] = itemIds.map((id) => {
    const def = getItem(id);
    return {
      itemId: def.id,
      name: def.name,
      icon: def.icon,
      cooldown: def.cooldown,
      effects: { ...def.effects },
    };
  });

  return { name, maxHp: baseHp, items };
}

/** The player's fighter has every backpack item and the hero's base HP. */
export function buildPlayerFighter(backpack: Backpack): Fighter {
  return buildFighter(itemIdsOf(backpack), HERO_BASE_HP, "Hero");
}

export function buildOpponentFighter(opponent: Opponent): Fighter {
  return buildFighter(opponent.items, opponent.hp, opponent.name);
}

interface FighterState {
  fighter: Fighter;
  hp: number;
  block: number;
  poison: number;
  burn: number;

  // Remember which items caused the status effects.
  poisonSource: string | null;
  burnSource: string | null;

  //Store the active sets for this fighter during the battle.
  activeSets: ItemSet[];

  /** Ticks each item has charged towards its cooldown. */
  charge: number[];
}

const other = (side: Side): Side =>
  side === "player" ? "opponent" : "player";

const snapshot = (s: FighterState): FighterSnapshot => ({
  hp: Math.max(0, s.hp),
  maxHp: s.fighter.maxHp,
  block: s.block,
  poison: s.poison,
  burn: s.burn,
});

const isDown = (s: FighterState) => s.hp <= 0;

/**
 * Runs a deterministic battle. Both sides choose their fired items before
 * effects are resolved. Poison then deals damage every fourth tick.
 * If both fighters are knocked out in one tick, the hero loses.
 */
export function simulateBattle(
  player: Fighter,
  opponent: Fighter,
): BattleResult {
  const state: Record<Side, FighterState> = {
    player: initState(player),
    opponent: initState(opponent),
  };

  const frames: BattleResult["frames"] = [
    {
      tick: 0,
      player: snapshot(state.player),
      opponent: snapshot(state.opponent),
      events: [],
    },
  ];

  const events: BattleEvent[] = [];

  const knockoutWinner = (): Side | null => {
    if (isDown(state.player)) return "opponent";
    if (isDown(state.opponent)) return "player";
    return null;
  };

  let winner: Side | null = null;
  let tick = 0;

  while (winner === null && tick < MAX_TICKS) {
    tick += 1;

    const tickEvents: BattleEvent[] = [];
    const emit = (event: Omit<BattleEvent, "tick">) =>
      tickEvents.push({ tick, ...event });

    const fired: Record<Side, FighterItem[]> = {
      player: chargeItems(state.player),
      opponent: chargeItems(state.opponent),
    };

    for (const side of ["player", "opponent"] as const) {
      for (const item of fired[side]) {
        resolveItem(
          item,
          state[side],
          state[other(side)],
          side,
          emit,
        );
      }
    }

    // Poison ticks after both sides use their items, ignoring any block.
    if (tick % POISON_INTERVAL === 0) {
      for (const side of ["player", "opponent"] as const) {
        applyPoison(state[side], side, emit);
      }
    }

        // Burn deals damage every two ticks and decreases by one stack.
    if (tick % BURN_INTERVAL === 0) {
      for (const side of ["player", "opponent"] as const) {
        applyBurn(state[side], side, emit);
      }
    }

    winner = knockoutWinner();

    frames.push({
      tick,
      player: snapshot(state.player),
      opponent: snapshot(state.opponent),
      events: tickEvents,
    });

    events.push(...tickEvents);
  }

  if (winner !== null) {
    return { winner, reason: "knockout", frames, events };
  }

  return {
    winner: timeoutWinner(state.player, state.opponent),
    reason: "timeout",
    frames,
    events,
  };
}

function initState(fighter: Fighter): FighterState {
  return {
    fighter,
    hp: fighter.maxHp,
    block: 0,
    poison: 0,
    poisonSource: null,
    burn: 0,
    burnSource: null,

    //Calculate the active sets once ecause items cannot change during the battle
    activeSets: getActiveSets(fighter.items.map((item) => item.itemId)),
    charge: fighter.items.map(() => 0),
  };
}

/** Advances cooldowns and returns the items that fire this tick. */
function chargeItems(s: FighterState): FighterItem[] {
  const fired: FighterItem[] = [];

  s.fighter.items.forEach((item, i) => {
    s.charge[i] += 1;

    if (s.charge[i] >= item.cooldown) {
      s.charge[i] = 0;
      fired.push(item);
    }
  });

  return fired;
}

function resolveItem(
  item: FighterItem,
  self: FighterState,
  enemy: FighterState,
  side: Side,
  emit: (event: Omit<BattleEvent, "tick">) => void,
) {
  const { damage, block, poison, heal, burn } = item.effects;
  const base = { source: side, itemId: item.itemId };
  const enemySide = other(side);

    // Find the set of the item that is currently firing.
  const itemSet = getItem(item.itemId).set;

  // Apply the Fire bonus only when the Fire set is active.
  const fireBonus =
    itemSet === "fire" && self.activeSets.includes("fire") ? 1 : 0;

  // Apply the Guardian bonus only when the Guardian set is active.
  const guardianBonus =
    itemSet === "guardian" && self.activeSets.includes("guardian") ? 1 : 0;

  if (damage) {
    const absorbed = Math.min(enemy.block, damage);
    enemy.block -= absorbed;
    enemy.hp -= damage - absorbed;

    const note = absorbed > 0 ? ` (${absorbed} blocked)` : "";

    emit({
      ...base,
      target: enemySide,
      kind: "damage",
      amount: damage,
      message: `${item.name} hits ${enemy.fighter.name} for ${damage}${note}`,
    });
  }

   if (block || guardianBonus) {
    // Add the Guardian set bonus to the item's normal block.
    const totalBlock = (block ?? 0) + guardianBonus;

    self.block += totalBlock;

    // Explain the active set bonus in the combat log.
    const bonusText = guardianBonus
      ? " (Guardian set bonus: +1)"
      : "";

    emit({
      ...base,
      target: side,
      kind: "block",
      amount: totalBlock,
      message: `${item.name} grants ${self.fighter.name} ${totalBlock} block${bonusText}`,
    });
  }

  if (poison) {
    // Every new application adds stacks; previous stacks are kept.
    enemy.poison += poison;
    enemy.poisonSource = item.itemId;

    emit({
      ...base,
      target: enemySide,
      kind: "poison",
      amount: poison,
      message: `${item.name} adds ${poison} poison to ${enemy.fighter.name}`,
    });
  }

  if (heal) {
    // Healing only restores missing HP and cannot exceed maximum HP.
    const restored = Math.min(
      heal,
      Math.max(0, self.fighter.maxHp - self.hp),
    );

    self.hp += restored;

    emit({
      ...base,
      target: side,
      kind: "heal",
      amount: restored,
      message: `${item.name} heals ${self.fighter.name} for ${restored} HP`,
    });
  }

    if (burn || fireBonus) {
    // Add one extra burn stack when the Fire set is active.
    const totalBurn = (burn ?? 0) + fireBonus;

    enemy.burn += totalBurn;
    enemy.burnSource = item.itemId;

    // Explain the active set bonus in the combat log.
    const bonusText = fireBonus
      ? " (Fire set bonus: +1)"
      : "";

    emit({
      ...base,
      target: enemySide,
      kind: "burn",
      amount: totalBurn,
      message: `${item.name} adds ${totalBurn} burn to ${enemy.fighter.name}${bonusText}`,
    });
  }
}

function applyPoison(
  target: FighterState,
  side: Side,
  emit: (event: Omit<BattleEvent, "tick">) => void,
) {
  if (target.poison === 0 || target.poisonSource === null) {
    return;
  }

  // Poison bypasses block; one stack deals one direct HP damage.
  target.hp -= target.poison;

  emit({
    source: other(side),
    target: side,
    itemId: target.poisonSource,
    kind: "poison-tick",
    amount: target.poison,
    message: `${target.fighter.name} takes ${target.poison} poison damage (ignores block)`,
  });
}


/** Apply burn damage and remove one stack afterwards. */
function applyBurn(
  target: FighterState,
  side: Side,
  emit: (event: Omit<BattleEvent, "tick">) => void,
) {
  // Burn does nothing if the fighter has no stacks.
  if (target.burn === 0 || target.burnSource === null) {
    return;
  }

  // Each burn stack deals two damage.
  const damage = target.burn * BURN_DAMAGE_PER_STACK;

  // Unlike poison, burn damage is absorbed by block first.
  const absorbed = Math.min(target.block, damage);
  target.block -= absorbed;
  target.hp -= damage - absorbed;

  // Burn loses one stack after every damage tick.
  target.burn = Math.max(0, target.burn - 1);

  emit({
    source: other(side),
    target: side,
    itemId: target.burnSource,
    kind: "burn-tick",
    amount: damage,
    message: `${target.fighter.name} takes ${damage - absorbed} burn damage (${absorbed} blocked). ${target.burn} stacks remain.`,
  });
}

function timeoutWinner(
  player: FighterState,
  opponent: FighterState,
): Side {
  const ratio = (s: FighterState) => s.hp / s.fighter.maxHp;
  return ratio(player) > ratio(opponent) ? "player" : "opponent";
}
