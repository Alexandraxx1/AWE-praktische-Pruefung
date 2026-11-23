
import { describe, expect, it } from "vitest";
import { buildFighter, simulateBattle } from "./battle";

describe("B3 - Poison and healing", () => {
  it("adds poison stacks and deals damage every four ticks", () => {
    const hero = buildFighter(
      ["poison-dagger", "poison-dagger"],
      40,
      "Hero",
    );
    const enemy = buildFighter([], 40, "Enemy");
    const result = simulateBattle(hero, enemy);

    // Both daggers add one stack at tick four, dealing two HP.
    expect(result.frames[3].opponent.poison).toBe(0);
    expect(result.frames[4].opponent.poison).toBe(2);
    expect(result.frames[4].opponent.hp).toBe(38);

    // The stacks increase again at tick eight.
    expect(result.frames[8].opponent.poison).toBe(4);
    expect(result.frames[8].opponent.hp).toBe(34);
  });

  it("ignores block when poison deals damage", () => {
    const hero = buildFighter(
      ["poison-dagger"],
      40,
      "Hero",
    );
    const enemy = buildFighter(
      ["pot-lid"],
      40,
      "Enemy",
    );
    const result = simulateBattle(hero, enemy);

    // Poison reduces HP without consuming the enemy's block.
    expect(result.frames[4].opponent.hp).toBe(39);
    expect(result.frames[4].opponent.block).toBe(2);
  });

  it("heals missing HP but never exceeds maximum HP", () => {
    const hero = buildFighter(
      ["healing-herb"],
      40,
      "Hero",
    );
    const enemy = buildFighter(
      ["chipped-dagger"],
      40,
      "Enemy",
    );
    const result = simulateBattle(hero, enemy);

    // The enemy deals three damage, and the herb restores it.
    expect(result.frames[4].player.hp).toBe(37);
    expect(result.frames[5].player.hp).toBe(40);

    // Healing must never increase HP above the maximum.
    expect(
      result.frames.every((frame) => frame.player.hp <= 40),
    ).toBe(true);
  });

  it("also lets opponents apply poison and heal", () => {
    const hero = buildFighter([], 40, "Hero");
    const enemy = buildFighter(
      ["poison-dagger", "healing-herb"],
      40,
      "Enemy",
    );
    const result = simulateBattle(hero, enemy);

    // The opponent can poison the hero.
    expect(result.frames[4].player.poison).toBe(1);
    expect(result.frames[4].player.hp).toBe(39);

    // The opponent can also activate a healing item.
    expect(
      result.events.some(
        (event) =>
          event.kind === "heal" &&
          event.source === "opponent",
      ),
    ).toBe(true);
  });

  it("produces the same result for identical fighters", () => {
    const hero = buildFighter(
      ["toxic-flask", "healing-potion"],
      40,
      "Hero",
    );
    const enemy = buildFighter(
      ["venom-bow", "chipped-dagger"],
      35,
      "Enemy",
    );

    // Identical inputs must produce identical frames and events.
    expect(simulateBattle(hero, enemy)).toEqual(
      simulateBattle(hero, enemy),
    );
  });
});
