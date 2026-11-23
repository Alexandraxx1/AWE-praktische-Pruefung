
import { describe, expect, it } from "vitest";
import { newRun, moveBlocker, moveItem } from "./run";
import { newGame, updateRun } from "./game";

// Create a backpack with two items for testing.
function createTestRun() {
  const run = newRun(123);

  return {
    ...run,
    backpack: [
      { uid: "item-1", itemId: "chipped-dagger" },
      { uid: "item-2", itemId: "hunting-bow" },
      null,
      null,
      null,
      null,
    ],
  };
}

describe("B2 - Backpack Arrangement", () => {

  it("moves an item to an empty slot", () => {
    const before = createTestRun();

    // Move the dagger from slot 0 to slot 2.
    const after = moveItem(before, 0, 2);

    expect(after.backpack[0]).toBeNull();
    expect(after.backpack[2]?.itemId).toBe("chipped-dagger");
  });

  it("swaps two occupied slots", () => {
    const before = createTestRun();

    // Swap the dagger and the bow.
    const after = moveItem(before, 0, 1);

    expect(after.backpack[0]?.itemId).toBe("hunting-bow");
    expect(after.backpack[1]?.itemId).toBe("chipped-dagger");
  });

  it("does not change the original state", () => {
    const before = createTestRun();

    // Moving an item must not modify the original backpack.
    const after = moveItem(before, 0, 2);

    expect(before.backpack[0]?.itemId).toBe("chipped-dagger");
    expect(before.backpack[2]).toBeNull();
    expect(after.backpack).not.toBe(before.backpack);
  });

  it("rejects moving from an empty slot", () => {
    const before = createTestRun();

    // An empty slot cannot be the source of a move.
    expect(moveBlocker(before, 2, 3)).toBe("Source slot is empty");
    expect(moveItem(before, 2, 3)).toBe(before);
  });

  it("rejects invalid slot numbers", () => {
    const before = createTestRun();

    // Only valid integer indexes within the backpack are allowed.
    expect(moveItem(before, -1, 2)).toBe(before);
    expect(moveItem(before, 0, 6)).toBe(before);
    expect(moveItem(before, 0, 1.5)).toBe(before);
  });

  it("rejects moving an item to the same slot", () => {
    const before = createTestRun();

    // Clicking the same slot must not change the run.
    expect(moveBlocker(before, 0, 0)).toBe("Item is already in this slot");
    expect(moveItem(before, 0, 0)).toBe(before);
  });

  it("keeps gold and item identities unchanged", () => {
    const before = createTestRun();
    const after = moveItem(before, 0, 1);

    // Moving items must not change gold or create new items.
    expect(after.gold).toBe(before.gold);
    expect(after.nextUid).toBe(before.nextUid);
    expect(after.backpack[0]?.uid).toBe("item-2");
    expect(after.backpack[1]?.uid).toBe("item-1");
  });

  it("only allows movement during the shopping phase", () => {
    const shop = {
      ...newGame(123),
      run: createTestRun(),
    };

    // The shop phase allows backpack changes.
    const updated = updateRun(shop, (run) => moveItem(run, 0, 2));
    expect(updated.run.backpack[2]?.itemId).toBe("chipped-dagger");

    // Other phases must reject backpack changes.
    for (const phase of ["searching", "battle", "finished"] as const) {
      const game = { ...shop, phase };

      expect(updateRun(game, (run) => moveItem(run, 0, 2))).toBe(game);
    }
  });
});
