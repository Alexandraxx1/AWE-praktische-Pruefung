
import { describe, expect, it } from "vitest";
import {
  buyBlocker,
  buyItem,
  newRun,
  rerollBlocker,
  rerollShop,
  sellBlocker,
  sellItem,
} from "./run";
import { rollShop } from "./shop";

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

  it("sells an item for half its price rounded down", () => {
    // Create a backpack with an Iron Cleaver worth five gold.
    const run = {
      ...newRun(123),
      gold: 3,
      backpack: [
        { uid: "item-1", itemId: "iron-cleaver" },
        null, null, null, null, null,
      ],
    };

    // Sell the Iron Cleaver from the first backpack slot.
    const updated = sellItem(run, 0);

    // Selling an item worth five gold gives two gold.
    expect(updated.gold).toBe(5);

    // The sold item is removed from its backpack slot.
    expect(updated.backpack[0]).toBeNull();

    // The original run remains unchanged.
    expect(run.gold).toBe(3);
    expect(run.backpack[0]?.itemId).toBe("iron-cleaver");
  });

  it("does not sell an empty backpack slot", () => {
    const run = newRun(123);

    // Selling an empty slot must not change the run.
    expect(sellBlocker(run, 0)).toBe("Empty slot");
    expect(sellItem(run, 0)).toBe(run);
  });

  it("does not sell an invalid backpack slot", () => {
    const run = newRun(123);

    // An invalid slot must not change the run.
    expect(sellBlocker(run, -1)).toBe("Invalid backpack slot");
    expect(sellItem(run, -1)).toBe(run);
  });


  it("rerolls the shop and costs one gold", () => {
    // Calculate the expected offers using the same saved seed.
    const run = newRun(123);
    const expected = rollShop(run.seed);

    const updated = rerollShop(run);

    // The reroll costs one gold and creates four new offers.
    expect(updated.gold).toBe(9);
    expect(updated.shop).toEqual(expected.offers);
    expect(updated.shop).toHaveLength(4);

    // Save the next seed so future shop rolls stay deterministic.
    expect(updated.seed).toBe(expected.seed);

    // The original run remains unchanged.
    expect(run.gold).toBe(10);
  });

  it("does not reroll the shop without enough gold", () => {
    // Create a run with no gold.
    const run = {
      ...newRun(123),
      gold: 0,
    };

    // A blocked reroll must leave the entire run unchanged.
    expect(rerollBlocker(run)).toBe("Not enough gold");
    expect(rerollShop(run)).toBe(run);
  });

  it("keeps backpack items when rerolling the shop", () => {
    // Buy an item before rerolling the shop.
    const run = newRun(123);
    const purchased = buyItem(run, 0);

    const updated = rerollShop(purchased);

    // Rerolling changes shop offers but keeps owned items.
    expect(updated.backpack).toEqual(purchased.backpack);
    expect(updated.gold).toBe(purchased.gold - 1);
    expect(updated.nextUid).toBe(purchased.nextUid);
  });


  it("does not buy an offer that has already been sold", () => {
    const run = newRun(123);
    const purchased = buyItem(run, 0);

    // Buying the same offer twice must not duplicate the item.
    expect(buyBlocker(purchased, 0)).toBe("Already sold");
    expect(buyItem(purchased, 0)).toBe(purchased);
  });

  it("only removes the selected item when selling", () => {
    const run = newRun(123);
    const firstPurchase = buyItem(run, 0);
    const secondPurchase = buyItem(firstPurchase, 1);

    const updated = sellItem(secondPurchase, 0);

    // Selling one item must keep all other backpack items unchanged.
    expect(updated.backpack[0]).toBeNull();
    expect(updated.backpack[1]).toEqual(secondPurchase.backpack[1]);

    // The number of owned items must decrease by exactly one.
    const before = secondPurchase.backpack.filter(Boolean).length;
    const after = updated.backpack.filter(Boolean).length;

    expect(after).toBe(before - 1);
  });


});
