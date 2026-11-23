
import { describe, expect, it } from "vitest";
import { newGame, updateRun } from "./game";
import { buyItem, rerollShop, sellItem } from "./run";

// These tests verify that shop actions are only allowed while shopping.
describe("B1 - Shopping phase protection", () => {
  it("allows shop actions during the shopping phase", () => {
    const game = newGame(123);

    // Buying is allowed while the player is shopping.
    const updated = updateRun(game, (run) => buyItem(run, 0));

    expect(updated.run.gold).toBeLessThan(game.run.gold);
    expect(updated.run.backpack[0]).not.toBeNull();
  });

  it("blocks shop actions outside the shopping phase", () => {
    const game = newGame(123);
    const purchased = updateRun(game, (run) => buyItem(run, 0));

    // Check every phase in which the shop must be locked.
    for (const phase of ["searching", "battle", "finished"] as const) {
      const lockedGame = { ...purchased, phase };

      const actions = [
        (run: typeof purchased.run) => buyItem(run, 1),
        (run: typeof purchased.run) => sellItem(run, 0),
        (run: typeof purchased.run) => rerollShop(run),
      ];

      for (const action of actions) {
        // Blocked actions must preserve the complete game state.
        expect(updateRun(lockedGame, action)).toBe(lockedGame);
      }
    }
  });
});
