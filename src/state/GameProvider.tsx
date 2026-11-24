
import { useEffect, useState, type ReactNode } from "react";
import { newGame } from "../game";
import { loadGame, saveGame } from "../persistence";
import type { GameState } from "../types";
import { GameContext, type GameContextValue } from "./GameContext";

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/** Holds the game state and restores saved progress on refresh. */
export function GameProvider({ children }: { children: ReactNode }) {
  // Load the saved game when the provider is first created.
  const [game, setGame] = useState<GameState | null>(loadGame);

  // Save the game whenever its state changes.
  useEffect(() => {
    saveGame(game);
  }, [game]);

  const value: GameContextValue = {
    game,

        // Create a new run with a unique ID for the Hall of Fame.
    startNewRun: () =>
      setGame({
        ...newGame(randomSeed()),
        runId: crypto.randomUUID(),
        submitted: false,
      }),

    // Apply game changes without modifying the previous state.
    update: (transition) =>
      setGame((current) => (current ? transition(current) : current)),
  };

  return <GameContext value={value}>{children}</GameContext>;
}
