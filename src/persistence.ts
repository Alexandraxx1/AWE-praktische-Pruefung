
import {
  buildOpponentFighter,
  buildPlayerFighter,
  simulateBattle,
} from "./battle";
import { isReplayDone } from "./game";
import { applyBattleResult, runOutcome, START_LIVES } from "./run";
import {
  isObject,
  isValidOpponent,
  isValidRun,
} from "./saveValidation";
import type { GameState } from "./types";

// Use a version so incompatible save files can be rejected.
export const SAVE_KEY = "backpack-brawl-save-v1";
const SAVE_VERSION = 1;

/** Save the information needed to continue a run after refreshing. */
export function saveGame(game: GameState | null): void {
  try {
    // Remove the old save when no run exists.
    if (!game) {
      localStorage.removeItem(SAVE_KEY);
      return;
    }

    // Save the run and its current phase.
    const saved = {
      version: SAVE_VERSION,
      phase: game.phase,
      run: game.run,

      // Remember the opponent and whether the battle result was applied.
      ...(game.phase === "battle" && game.battle
        ? {
            opponent: game.battle.opponent,
            resultApplied: isReplayDone(game.battle),
          }
        : {}),
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch {
    // The game remains playable if browser storage is unavailable.
  }
}

/** Load a valid save and safely restore the correct game phase. */
export function loadGame(): GameState | null {
  try {
    const savedText = localStorage.getItem(SAVE_KEY);

    // Without saved data, the player starts normally.
    if (!savedText) return null;

    const saved: unknown = JSON.parse(savedText);

    // Reject incompatible versions and invalid run data.
    if (
      !isObject(saved) ||
      saved.version !== SAVE_VERSION ||
      !isValidRun(saved.run)
    ) {
      return null;
    }

    const run = saved.run;

    // Count battles that have already changed wins or lives.
    const completedBattles = run.wins + START_LIVES - run.lives;

    // Restore the same shop, even if a search was interrupted.
    if (saved.phase === "shop" || saved.phase === "searching") {
      if (runOutcome(run) || run.round !== completedBattles + 1) {
        return null;
      }

      return {
        phase: "shop",
        run,
        battle: null,
        search: null,
        error:
          saved.phase === "searching"
            ? "Search interrupted by refresh. Please try again."
            : null,
      };
    }

    // Restore the result screen when the run has ended.
    if (saved.phase === "finished") {
      if (!runOutcome(run) || run.round !== completedBattles) {
        return null;
      }

      return {
        phase: "finished",
        run,
        battle: null,
        search: null,
        error: null,
      };
    }

    // An interrupted battle needs a valid opponent and result flag.
    if (
      saved.phase !== "battle" ||
      !isValidOpponent(saved.opponent) ||
      typeof saved.resultApplied !== "boolean"
    ) {
      return null;
    }

    const opponent = saved.opponent;
    const alreadyApplied = saved.resultApplied;

    if (!alreadyApplied) {
      // The current battle must belong to the unfinished round.
      if (
        runOutcome(run) ||
        run.round !== completedBattles + 1 ||
        opponent.round !== run.round
      ) {
        return null;
      }
    } else if (runOutcome(run)) {
      // A final battle keeps its original round number.
      if (
        opponent.round !== run.round ||
        run.round !== completedBattles
      ) {
        return null;
      }
    } else {
      // A completed battle normally advances the run to the next round.
      if (
        opponent.round + 1 !== run.round ||
        run.round !== completedBattles + 1
      ) {
        return null;
      }
    }

    // Rebuild the same deterministic battle from the saved items.
    const player = buildPlayerFighter(run.backpack);
    const enemy = buildOpponentFighter(opponent);
    const result = simulateBattle(player, enemy);

    // Check that an already applied result matches the run progress.
    if (alreadyApplied) {
      if (result.winner === "player" && run.wins === 0) return null;
      if (result.winner === "opponent" && run.lives === START_LIVES) {
        return null;
      }
    }

    // Apply the result only if it has not been applied before.
    const resumedRun = alreadyApplied
      ? run
      : applyBattleResult(run, result.winner);

    // Show the final battle frame instead of restarting the replay.
    return {
      phase: "battle",
      run: resumedRun,
      search: null,
      error: null,
      battle: {
        opponent,
        player,
        enemy,
        result,
        frame: result.frames.length - 1,
      },
    };
  } catch {
    // Invalid JSON or storage errors return to a playable start page.
    return null;
  }
}
