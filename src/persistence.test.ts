
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  newGame,
  skipReplay,
  startBattle,
  startSearch,
} from "./game";
import { loadGame, saveGame, SAVE_KEY } from "./persistence";
import { applyBattleResult, buyItem, rerollShop } from "./run";
import type { GameState, Opponent } from "./types";

// Store test data in memory instead of the real browser storage.
const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();

  // Replace localStorage with a controlled test version.
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  });
});

afterEach(() => {
  // Restore the original global functions after each test.
  vi.unstubAllGlobals();
});

const opponent: Opponent = {
  id: "test-opponent",
  name: "Test Opponent",
  icon: "⚔️",
  hp: 30,
  round: 1,
  items: ["chipped-dagger"],
};

// Create a run with an item so the player can start matchmaking.
function readyGame(): GameState {
  const game = newGame(123);

  return {
    ...game,
    run: buyItem(game.run, 0),
  };
}

// Create a battle using the normal game transitions.
function createBattle(opponentData = opponent): GameState {
  const searching = startSearch(readyGame(), "test-request");

  return startBattle(
    searching,
    opponentData,
    "test-request",
    1
  );
}

describe("B6 - Save and Resume", () => {
  it("restores the same shop after a refresh", () => {
    const game = readyGame();

    // Reroll before saving to check the current shop and RNG seed.
    const changed = {
      ...game,
      run: rerollShop(game.run),
    };

    saveGame(changed);
    const restored = loadGame();

    expect(restored?.phase).toBe("shop");
    expect(restored?.run).toEqual(changed.run);
  });

  it("returns to the same shop after an interrupted search", () => {
    const searching = startSearch(readyGame(), "request-1");

    saveGame(searching);
    const restored = loadGame();

    // Searching is cancelled, but no shop progress is lost.
    expect(restored?.phase).toBe("shop");
    expect(restored?.run).toEqual(searching.run);
    expect(restored?.search).toBeNull();
    expect(restored?.error).toContain("interrupted");
  });

  it("finishes an interrupted battle after a refresh", () => {
    const battle = createBattle();

    expect(battle.phase).toBe("battle");
    expect(battle.battle).not.toBeNull();

    saveGame(battle);
    const restored = loadGame();

    // Rebuild the battle and apply its result once.
    const expectedRun = applyBattleResult(
      battle.run,
      battle.battle!.result.winner
    );

    expect(restored?.phase).toBe("battle");
    expect(restored?.run).toEqual(expectedRun);

    // The restored replay must already be at its final frame.
    expect(restored?.battle?.frame).toBe(
      restored!.battle!.result.frames.length - 1
    );
  });

  it("does not apply a battle loss twice", () => {
    // Create an opponent that is strong enough to defeat the hero.
    const strongOpponent: Opponent = {
      ...opponent,
      hp: 10000,
      items: Array(6).fill("iron-cleaver"),
    };

    const battle = createBattle(strongOpponent);
    const completed = skipReplay(battle);

    expect(completed.battle?.result.winner).toBe("opponent");
    expect(completed.run.lives).toBe(battle.run.lives - 1);

    saveGame(completed);
    const restored = loadGame();

    // Refreshing must not remove another life.
    expect(restored?.run.lives).toBe(completed.run.lives);
    expect(restored?.run.round).toBe(completed.run.round);

    // Skipping the restored final frame changes nothing.
    expect(skipReplay(restored!)).toBe(restored);
  });

  it("restores a finished run", () => {
    const game = readyGame();
    let run = game.run;

    // Three lost battles lead to a finished run.
    for (let i = 0; i < 3; i++) {
      run = applyBattleResult(run, "opponent");
    }

    const finished: GameState = {
      ...game,
      phase: "finished",
      run,
    };

    saveGame(finished);
    const restored = loadGame();

    expect(restored?.phase).toBe("finished");
    expect(restored?.run.lives).toBe(0);
    expect(restored?.run).toEqual(run);
  });

  it("rejects malformed and incompatible saved data", () => {
    // Invalid JSON must not crash the application.
    storage.set(SAVE_KEY, "{invalid-json");
    expect(loadGame()).toBeNull();

    // A different save version must also be rejected.
    storage.set(
      SAVE_KEY,
      JSON.stringify({
        version: 999,
        phase: "shop",
        run: readyGame().run,
      })
    );

    expect(loadGame()).toBeNull();
  });

  it("rejects an impossible saved run", () => {
    const game = readyGame();

    // Negative gold is not a valid game state.
    storage.set(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        phase: "shop",
        run: {
          ...game.run,
          gold: -10,
        },
      })
    );

    expect(loadGame()).toBeNull();
  });

  it("rejects an invalid saved opponent", () => {
    const battle = createBattle();

    // Unknown items must not enter a restored battle.
    storage.set(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        phase: "battle",
        run: battle.run,
        opponent: {
          ...opponent,
          items: ["unknown-sword"],
        },
        resultApplied: false,
      })
    );

    expect(loadGame()).toBeNull();
  });

  it("removes the saved run when the game is cleared", () => {
    saveGame(readyGame());

    expect(storage.has(SAVE_KEY)).toBe(true);

    // A cleared game must not restore the previous run.
    saveGame(null);

    expect(storage.has(SAVE_KEY)).toBe(false);
    expect(loadGame()).toBeNull();
  });

  it("keeps working when browser storage is unavailable", () => {
    // Simulate a browser that blocks localStorage access.
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Storage unavailable");
      },
      setItem: () => {
        throw new Error("Storage unavailable");
      },
      removeItem: () => {
        throw new Error("Storage unavailable");
      },
    });

    // Storage errors must not crash the game.
    expect(loadGame()).toBeNull();
    expect(() => saveGame(readyGame())).not.toThrow();
  });
});
