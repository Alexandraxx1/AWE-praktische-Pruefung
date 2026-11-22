
import { describe, expect, it } from "vitest";
import { buyBlocker, buyItem, newRun } from "./run";

// These tests verify that buying items follows the shop rules.
describe("B1 - Shop economy", () => {
  it("prevents buying when the backpack is full", () => {
    // Create a run with enough gold but all six backpack slots occupied.
    const run = {
      ...newRun(123),
      gold: 10,
      shop: ["chipped-dagger"],
      backpack: Array.from({ length: 6 }, (_, i) => ({
        uid: `item-${i + 1}`,
        itemId: "chipped-dagger",
      })),
    };

    // The purchase must be blocked without changing the run.
    expect(buyBlocker(run, 0)).toBe("Backpack is full");
    expect(buyItem(run, 0)).toBe(run);
  });

  it("does not buy an item without enough gold", () => {
    // Create a run where the player has no gold.
    const run = {
      ...newRun(123),
      gold: 0,
      shop: ["chipped-dagger"],
    };

    // Buying must fail because the player cannot afford the item.
    expect(buyBlocker(run, 0)).toBe("Not enough gold");
    expect(buyItem(run, 0)).toBe(run);
  });

  it("buys an item and updates gold and backpack", () => {
    // Create a run with a dagger available in the shop.
    const run = {
      ...newRun(123),
      shop: ["chipped-dagger"],
    };

    // Purchase the dagger from the first shop offer.
    const updated = buyItem(run, 0);

    // The dagger costs two gold, so the player has eight left.
    expect(updated.gold).toBe(8);

    // The purchased item must appear in the first backpack slot.
    expect(updated.backpack[0]?.itemId).toBe("chipped-dagger");

    // The purchased offer must be marked as sold.
    expect(updated.shop[0]).toBeNull();

    // The original run must remain unchanged.
    expect(run.gold).toBe(10);
  });
});
