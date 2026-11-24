
import { CATALOG } from "./items";
import {
  GOLD_PER_ROUND,
  START_GOLD,
  START_LIVES,
  WINS_TO_VICTORY,
} from "./run";
import { BACKPACK_SIZE, SHOP_SIZE } from "./shop";
import type { Opponent, RunState } from "./types";

// Store all valid item IDs for checking saved data.
const knownItems = new Set(CATALOG.map((item) => item.id));

// Check if a value is an object and not an array or null.
export const isObject = (
  value: unknown
): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Check if a value is a safe integer.
const isInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value);

/** Check that a saved run contains valid values and known items. */
export function isValidRun(value: unknown): value is RunState {
  if (!isObject(value)) return false;

  const {
    round,
    gold,
    lives,
    wins,
    seed,
    shop,
    backpack,
    nextUid,
  } = value;

  // Check the game progress and the allowed number of rounds.
  if (!isInteger(round) || round < 1 ||
      round > START_LIVES + WINS_TO_VICTORY - 1) return false;

  if (!isInteger(wins) || wins < 0 ||
      wins > WINS_TO_VICTORY) return false;

  if (!isInteger(lives) || lives < 0 ||
      lives > START_LIVES) return false;

  // A run cannot end with both five wins and zero lives.
  if (wins === WINS_TO_VICTORY && lives === 0) return false;

  // Gold cannot be negative or higher than all earned gold.
  if (!isInteger(gold) || gold < 0 ||
      gold > START_GOLD + GOLD_PER_ROUND * (round - 1)) return false;

  // The random seed and item counter must be valid.
  if (!isInteger(seed) || seed < 0 || seed > 0xffffffff) return false;
  if (!isInteger(nextUid) || nextUid < 1) return false;

  // Check that the shop has four valid offers.
  if (
    !Array.isArray(shop) ||
    shop.length !== SHOP_SIZE ||
    !shop.every(
      (id) =>
        id === null ||
        (typeof id === "string" && knownItems.has(id))
    )
  ) return false;

  // Check that the backpack contains exactly six slots.
  if (!Array.isArray(backpack) ||
      backpack.length !== BACKPACK_SIZE) return false;

  const usedUids = new Set<string>();

  for (const slot of backpack) {
    if (slot === null) continue;

    // Every stored item must exist in the catalog.
    if (
      !isObject(slot) ||
      typeof slot.uid !== "string" ||
      typeof slot.itemId !== "string" ||
      !knownItems.has(slot.itemId)
    ) return false;

    // Item IDs must be unique and smaller than the next counter.
    const match = /^item-([1-9]\d*)$/.exec(slot.uid);

    if (
      !match ||
      !Number.isSafeInteger(Number(match[1])) ||
      Number(match[1]) >= nextUid ||
      usedUids.has(slot.uid)
    ) return false;

    usedUids.add(slot.uid);
  }

  // Each win or lost life represents one completed battle.
  const played = wins + START_LIVES - lives;

  return round === played || round === played + 1;
}

/** Check an opponent before rebuilding a saved battle. */
export function isValidOpponent(value: unknown): value is Opponent {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.icon === "string" &&
    isInteger(value.round) &&
    value.round >= 1 &&
    typeof value.hp === "number" &&
    Number.isFinite(value.hp) &&
    value.hp > 0 &&
    Array.isArray(value.items) &&
    value.items.length <= BACKPACK_SIZE &&
    value.items.every(
      (id) => typeof id === "string" && knownItems.has(id)
    )
  );
}
