import { buildOpponentFighter, buildPlayerFighter, simulateBattle } from "./battle";
import { applyBattleResult, newRun, runOutcome } from "./run";
import { itemIdsOf } from "./shop";
import type { BattleReplay, GameState, Opponent, RunState } from "./types";

/**
 * Phase transitions of one run: shop → searching → battle → shop … → finished.
 * Every function is pure, so they can be passed straight to `setState`.
 */


export function newGame(seed: number): GameState {
  // A new run starts in the shop without an active opponent search.
  return {
    phase: "shop",
    run: newRun(seed),
    battle: null,
    error: null,
    search: null,
  };
}

/** Applies a shop/backpack action; only allowed while shopping. */
export function updateRun(game: GameState, action: (run: RunState) => RunState): GameState {
  if (game.phase !== "shop") return game;
  const run = action(game.run);
  return run === game.run ? game : { ...game, run };
}


/** Explains why the player cannot start an opponent search. */
export function fightBlocker(game: GameState): string | null {
  // Searching is only allowed while the player is in the shop.
  if (game.phase === "searching") return "Searching…";
  if (game.phase !== "shop") return "Only available in the shop";

  if (itemIdsOf(game.run.backpack).length === 0) {
    return "Buy at least one item first";
  }

  return null;
}

/** Starts exactly one search for the current round. */
export function startSearch(game: GameState, requestId: string): GameState {
  // A second search must not replace the current search.
  if (fightBlocker(game) !== null || game.search !== null || !requestId) {
    return game;
  }

  return {
    ...game,
    phase: "searching",
    error: null,
    search: {
      id: requestId,
      round: game.run.round,
    },
  };
}



/** Checks whether a response belongs to the active search. */
function isCurrentSearch(
  game: GameState,
  requestId: string,
  round: number,
): boolean {
  return (
    game.phase === "searching" &&
    game.search !== null &&
    game.search.id === requestId &&
    game.search.round === round &&
    game.run.round === round
  );
}

/** Returns to the shop after a failed search. */
export function searchFailed(
  game: GameState,
  error: string,
  requestId: string,
  round: number,
): GameState {
  // Ignore errors from searches that are no longer active.
  if (!isCurrentSearch(game, requestId, round)) return game;

  return {
    ...game,
    phase: "shop",
    search: null,
    error,
  };
}

/** Starts a battle only when the response belongs to the active search. */
export function startBattle(
  game: GameState,
  opponent: Opponent,
  requestId: string,
  round: number,
): GameState {
  // Late or duplicate responses must not change the game.
  if (!isCurrentSearch(game, requestId, round)) return game;

  // An opponent from another round must not start a battle.
  if (opponent.round !== round) {
    return searchFailed(
      game,
      "The opponent belongs to another round.",
      requestId,
      round,
    );
  }

  const player = buildPlayerFighter(game.run.backpack);
  const enemy = buildOpponentFighter(opponent);
  const result = simulateBattle(player, enemy);

  // Clear the search so its response cannot be applied again.
  return {
    ...game,
    phase: "battle",
    search: null,
    error: null,
    battle: {
      opponent,
      player,
      enemy,
      result,
      frame: 0,
    },
  };
}


export const isReplayDone = (battle: BattleReplay) => battle.frame >= battle.result.frames.length - 1;

/** Shows the given frame; reaching the last frame applies the battle result to the run (exactly once). */
export function showFrame(game: GameState, frame: number): GameState {
  const { battle } = game;
  if (game.phase !== "battle" || !battle || isReplayDone(battle)) return game;
  const last = battle.result.frames.length - 1;
  const next = { ...battle, frame: Math.min(Math.max(frame, battle.frame), last) };
  if (!isReplayDone(next)) return { ...game, battle: next };
  return { ...game, battle: next, run: applyBattleResult(game.run, battle.result.winner) };
}

export const advanceReplay = (game: GameState) => showFrame(game, (game.battle?.frame ?? 0) + 1);
export const skipReplay = (game: GameState) => showFrame(game, Infinity);

/** Leaves a finished replay: back to the shop, or to the end screen if the run is over. */
export function leaveBattle(game: GameState): GameState {
  if (game.phase !== "battle" || !game.battle || !isReplayDone(game.battle)) return game;
  return { ...game, phase: runOutcome(game.run) ? "finished" : "shop", battle: null };
}

/** URL paths of the app's screens. */
export const ROUTES = { start: "/", shop: "/shop", battle: "/battle", result: "/result" } as const;
export type GameRoute = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * The screen that matches the game's phase. Shop, battle and result pages
 * redirect here when they don't match, so the URL always follows the phase.
 */
export function routeForGame(game: GameState | null): GameRoute {
  if (!game) return ROUTES.start;
  switch (game.phase) {
    case "shop":
    case "searching":
      return ROUTES.shop;
    case "battle":
      return ROUTES.battle;
    case "finished":
      return ROUTES.result;
  }
}
