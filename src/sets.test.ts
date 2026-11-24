
import { describe, expect, it } from "vitest";
import { buildFighter, simulateBattle } from "./battle";
import { CATALOG, getActiveSets } from "./items";

describe("B4 - Item Sets and Burn", () => {
  it("contains at least three items for each set", () => {
    // Both sets must have at least three different items.
    const fireItems = CATALOG.filter((item) => item.set === "fire");
    const guardianItems = CATALOG.filter((item) => item.set === "guardian");

    expect(fireItems.length).toBeGreaterThanOrEqual(3);
    expect(guardianItems.length).toBeGreaterThanOrEqual(3);
  });

  it("does not activate a set with only one item", () => {
    // One item is not enough to activate a set bonus.
    expect(getActiveSets(["ember-blade"])).toEqual([]);
    expect(getActiveSets(["pot-lid"])).toEqual([]);
  });

  it("activates sets with two items, including duplicates", () => {
    // Two matching items activate the corresponding set.
    expect(getActiveSets(["ember-blade", "flame-bow"])).toContain("fire");
    expect(getActiveSets(["pot-lid", "oak-buckler"])).toContain("guardian");

    // Two copies of the same item also count.
    expect(getActiveSets(["ember-blade", "ember-blade"])).toContain("fire");
  });

  it("applies normal burn without an active Fire set", () => {
    const hero = buildFighter(["ember-blade"], 40, "Hero");
    const enemy = buildFighter([], 40, "Enemy");

    const result = simulateBattle(hero, enemy);

    // Ember Blade applies two burn stacks without a set bonus.
    expect(result.frames[3].opponent.burn).toBe(2);
  });

  it("adds one extra burn stack with an active Fire set", () => {
    const hero = buildFighter(
      ["ember-blade", "flame-bow"],
      40,
      "Hero"
    );
    const enemy = buildFighter([], 40, "Enemy");

    const result = simulateBattle(hero, enemy);

    // Ember Blade applies two normal stacks and one bonus stack.
    expect(result.frames[3].opponent.burn).toBe(3);

    // The combat log must explain the active Fire bonus.
    expect(
      result.events.some(
        (event) =>
          event.kind === "burn" &&
          event.message.includes("Fire set bonus")
      )
    ).toBe(true);
  });

  it("adds one extra block with an active Guardian set", () => {
    const hero = buildFighter(
      ["pot-lid", "oak-buckler"],
      40,
      "Hero"
    );
    const enemy = buildFighter([], 40, "Enemy");

    const result = simulateBattle(hero, enemy);

    // Pot Lid grants two normal block and one bonus block.
    expect(result.frames[3].player.block).toBe(3);

    // Oak Buckler grants four normal block and one bonus block.
    expect(result.frames[5].player.block).toBe(8);
  });

    it("lets block absorb burn damage before HP is reduced", () => {
    const hero = buildFighter(["ember-blade"], 40, "Hero");
    const enemy = buildFighter(["pot-lid"], 40, "Enemy");

    const result = simulateBattle(hero, enemy);

    // At tick three, Ember Blade deals two normal damage.
    expect(result.frames[3].opponent.hp).toBe(38);

    // Pot Lid then gives the enemy two block.
    expect(result.frames[3].opponent.block).toBe(2);

    // At tick four, burn deals four damage.
    // Two damage is blocked and two HP is lost.
    expect(result.frames[4].opponent.hp).toBe(36);
    expect(result.frames[4].opponent.block).toBe(0);

    // Burn loses one stack after dealing damage.
    expect(result.frames[4].opponent.burn).toBe(1);
  });

  it("reduces burn stacks until they disappear", () => {
    const hero = buildFighter(["ember-blade"], 40, "Hero");
    const enemy = buildFighter([], 40, "Enemy");

    // Use a longer cooldown to observe burn wearing off.
    hero.items[0].cooldown = 9;

    const result = simulateBattle(hero, enemy);

    // Burn starts with two stacks at tick nine.
    expect(result.frames[9].opponent.burn).toBe(2);

    // The first burn tick removes one stack.
    expect(result.frames[10].opponent.burn).toBe(1);

    // The next burn tick removes the final stack.
    expect(result.frames[12].opponent.burn).toBe(0);
  });

  it("also applies set bonuses to opponents", () => {
    const hero = buildFighter([], 40, "Hero");

    const enemy = buildFighter(
      ["ember-blade", "flame-bow", "pot-lid", "oak-buckler"],
      40,
      "Enemy"
    );

    const result = simulateBattle(hero, enemy);

    // The opponent receives the Fire bonus.
    expect(result.frames[3].player.burn).toBe(3);

    // The opponent also receives the Guardian bonus.
    expect(result.frames[3].opponent.block).toBe(3);
  });

  it("produces identical results for identical fighters", () => {
    const hero = buildFighter(
      ["ember-blade", "flame-bow"],
      40,
      "Hero"
    );

    const enemy = buildFighter(
      ["pot-lid", "oak-buckler"],
      40,
      "Enemy"
    );

    // The simulation must remain deterministic.
    expect(simulateBattle(hero, enemy)).toEqual(
      simulateBattle(hero, enemy)
    );
  });
});
