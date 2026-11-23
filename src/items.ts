
import type { ItemDef, ItemEffects } from "./types";

export const CATALOG: ItemDef[] = [
  // Existing items with damage and block effects.
  { id: "chipped-dagger", name: "Chipped Dagger", icon: "🗡️", price: 2, cooldown: 4, effects: { damage: 3 } },
  { id: "hunting-bow", name: "Hunting Bow", icon: "🏹", price: 4, cooldown: 4, effects: { damage: 5 } },
  { id: "iron-cleaver", name: "Iron Cleaver", icon: "🪓", price: 5, cooldown: 8, effects: { damage: 12 } },
  { id: "oak-buckler", name: "Oak Buckler", icon: "🛡️", price: 3, cooldown: 5, effects: { block: 4 } },
  { id: "pot-lid", name: "Pot Lid", icon: "🍳", price: 2, cooldown: 3, effects: { block: 2 } },
  { id: "spiked-shield", name: "Spiked Shield", icon: "⚔️", price: 4, cooldown: 6, effects: { damage: 3, block: 3 } },

  // Poison items add different numbers of stacks to the enemy.
  { id: "poison-dagger", name: "Poison Dagger", icon: "🗡️", price: 3, cooldown: 4, effects: { poison: 1 } },
  { id: "venom-bow", name: "Venom Bow", icon: "🏹", price: 5, cooldown: 6, effects: { poison: 2 } },
  { id: "toxic-flask", name: "Toxic Flask", icon: "🧪", price: 6, cooldown: 8, effects: { poison: 3 } },

  // Healing items restore HP when their cooldown is reached.
  { id: "healing-herb", name: "Healing Herb", icon: "🌿", price: 2, cooldown: 5, effects: { heal: 3 } },
  { id: "healing-potion", name: "Healing Potion", icon: "🧪", price: 4, cooldown: 7, effects: { heal: 5 } },
  { id: "healing-staff", name: "Healing Staff", icon: "✨", price: 6, cooldown: 9, effects: { heal: 7 } },
];

const byId = new Map(CATALOG.map((item) => [item.id, item]));

export function getItem(id: string): ItemDef {
  const item = byId.get(id);
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

const EFFECT_LABELS: [keyof ItemEffects, (n: number) => string][] = [
  ["damage", (n) => `⚔️ ${n} dmg`],
  ["block", (n) => `🛡️ +${n} block`],
  ["poison", (n) => `☠️ +${n} poison`],
  ["heal", (n) => `💚 +${n} HP`],
];

/** Returns the visible labels for an item's effects. */
export function describeEffects(effects: ItemEffects): { effect: keyof ItemEffects; label: string }[] {
  return EFFECT_LABELS.flatMap(([effect, label]) => (effects[effect] ? [{ effect, label: label(effects[effect]) }] : []));
}
