
import type { ItemDef, ItemEffects, ItemSet } from "./types";

export const CATALOG: ItemDef[] = [
  // Existing items with damage effects.
  { id: "chipped-dagger", name: "Chipped Dagger", icon: "🗡️", price: 2, cooldown: 4, effects: { damage: 3 } },
  { id: "hunting-bow", name: "Hunting Bow", icon: "🏹", price: 4, cooldown: 4, effects: { damage: 5 } },
  { id: "iron-cleaver", name: "Iron Cleaver", icon: "🪓", price: 5, cooldown: 8, effects: { damage: 12 } },

  // These three existing items belong to the Guardian set.
  { id: "oak-buckler", name: "Oak Buckler", icon: "🛡️", price: 3, cooldown: 5, effects: { block: 4 }, set: "guardian" },
  { id: "pot-lid", name: "Pot Lid", icon: "🍳", price: 2, cooldown: 3, effects: { block: 2 }, set: "guardian" },
  { id: "spiked-shield", name: "Spiked Shield", icon: "⚔️", price: 4, cooldown: 6, effects: { damage: 3, block: 3 }, set: "guardian" },

  // Poison items add stacks to the enemy.
  { id: "poison-dagger", name: "Poison Dagger", icon: "🗡️", price: 3, cooldown: 4, effects: { poison: 1 } },
  { id: "venom-bow", name: "Venom Bow", icon: "🏹", price: 5, cooldown: 6, effects: { poison: 2 } },
  { id: "toxic-flask", name: "Toxic Flask", icon: "🧪", price: 6, cooldown: 8, effects: { poison: 3 } },

  // Healing items restore HP when their cooldown is reached.
  { id: "healing-herb", name: "Healing Herb", icon: "🌿", price: 2, cooldown: 5, effects: { heal: 3 } },
  { id: "healing-potion", name: "Healing Potion", icon: "🧪", price: 4, cooldown: 7, effects: { heal: 5 } },
  { id: "healing-staff", name: "Healing Staff", icon: "✨", price: 6, cooldown: 9, effects: { heal: 7 } },

  // These three new items belong to the Fire set.
  { id: "ember-blade", name: "Ember Blade", icon: "🔥", price: 4, cooldown: 3, effects: { damage: 2, burn: 2 }, set: "fire" },
  { id: "flame-bow", name: "Flame Bow", icon: "🏹", price: 5, cooldown: 4, effects: { damage: 3, burn: 3 }, set: "fire" },
  { id: "fire-shield", name: "Fire Shield", icon: "🛡️", price: 5, cooldown: 3, effects: { block: 2, burn: 2 }, set: "fire" },
];

const byId = new Map(CATALOG.map((item) => [item.id, item]));

export function getItem(id: string): ItemDef {
  const item = byId.get(id);

  if (!item) throw new Error(`Unknown item: ${id}`);

  return item;
}

// Store the names and bonuses of both sets in one place.
export const SET_INFO: Record<ItemSet, { name: string; bonus: string }> = {
  fire: {
    name: "Fire",
    bonus: "2+ Fire items: Fire items apply 1 extra burn stack when they fire.",
  },
  guardian: {
    name: "Guardian",
    bonus: "2+ Guardian items: Guardian items grant 1 extra block when they fire.",
  },
};

/** Return every set that has at least two items. */
export function getActiveSets(itemIds: string[]): ItemSet[] {
  const sets: ItemSet[] = ["fire", "guardian"];

  // Count all matching items, including duplicate copies.
  return sets.filter(
    (set) => itemIds.filter((id) => getItem(id).set === set).length >= 2
  );
}

const EFFECT_LABELS: [keyof ItemEffects, (n: number) => string][] = [
  ["damage", (n) => `⚔️ ${n} dmg`],
  ["block", (n) => `🛡️ +${n} block`],
  ["poison", (n) => `☠️ +${n} poison`],
  ["heal", (n) => `💚 +${n} HP`],
  ["burn", (n) => `🔥 +${n} burn`],
];

/** Return readable labels for all item effects. */
export function describeEffects(
  effects: ItemEffects
): { effect: keyof ItemEffects; label: string }[] {
  return EFFECT_LABELS.flatMap(([effect, label]) =>
    effects[effect] ? [{ effect, label: label(effects[effect]) }] : []
  );
}
