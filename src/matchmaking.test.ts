
import { describe, expect, it } from "vitest";
import {
  newGame,
  searchFailed,
  startBattle,
  startSearch,
  updateRun,
} from "./game";
import { buyItem } from "./run";
import type { Opponent } from "./types";

// Use a valid opponent from the current round.
const opponent: Opponent = {
  id: "test-opponent",
  name: "Test Opponent",
  icon: "⚔️",
  hp: 30,
  round: 1,
  items: ["chipped-dagger"],
};

// Create a game with one item so searching is allowed.
function readyGame() {
  return updateRun(newGame(123), (run) => buyItem(run, 0));
}

describe("B5 - Resilient matchmaking", () => {
  it("starts only one search", () => {
    const game = readyGame();
    const searching = startSearch(game, "request-1");

    // A second search must not replace the active request.
    expect(searching.phase).toBe("searching");
    expect(searching.search?.id).toBe("request-1");
    expect(startSearch(searching, "request-2")).toBe(searching);
  });

  it("returns to the shop after an API error", () => {
    const searching = startSearch(readyGame(), "request-1");
    const failed = searchFailed(
      searching,
      "The API is unavailable.",
      "request-1",
      1,
    );

    // The player must be able to search again after an error.
    expect(failed.phase).toBe("shop");
    expect(failed.search).toBeNull();
    expect(failed.error).toBe("The API is unavailable.");
    expect(startSearch(failed, "request-2").phase).toBe("searching");
  });

  it("ignores a response from an old search", () => {
    const first = startSearch(readyGame(), "request-1");

    const failed = searchFailed(
      first,
      "The API is unavailable.",
      "request-1",
      1,
    );
    const second = startSearch(failed, "request-2");

    // The first response must not start a battle for the second search.
    expect(startBattle(second, opponent, "request-1", 1)).toBe(second);
    expect(second.phase).toBe("searching");
  });

  it("rejects an opponent from another round", () => {
    const searching = startSearch(readyGame(), "request-1");
    const wrongOpponent = { ...opponent, round: 2 };

    // A wrong-round response must return the player to the shop.
    const result = startBattle(
      searching,
      wrongOpponent,
      "request-1",
      1,
    );

    expect(result.phase).toBe("shop");
    expect(result.battle).toBeNull();
    expect(result.error).toContain("another round");
  });

  it("does not apply the same response twice", () => {
    const searching = startSearch(readyGame(), "request-1");

    const battle = startBattle(
      searching,
      opponent,
      "request-1",
      1,
    );

    // A duplicate response must keep the existing battle unchanged.
    expect(battle.phase).toBe("battle");
    expect(battle.search).toBeNull();
    expect(startBattle(battle, opponent, "request-1", 1)).toBe(battle);
  });

  it("ignores late errors after a battle has started", () => {
    const searching = startSearch(readyGame(), "request-1");
    const battle = startBattle(searching, opponent, "request-1", 1);

    // A late API error must not interrupt an active battle.
    expect(
      searchFailed(battle, "Late error", "request-1", 1),
    ).toBe(battle);
  });
});
