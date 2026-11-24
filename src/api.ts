
import type { Opponent } from "./types";

// A search stops waiting after eight seconds.
export const SEARCH_TIMEOUT_MS = 8000;

/** Requests an opponent without allowing the search to wait forever. */
export async function fetchOpponent(round: number): Promise<Opponent> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    // This request also checks for errors returned by the API.
    const request = (async (): Promise<Opponent> => {
      const response = await fetch(
        `/api/opponents?round=${encodeURIComponent(round)}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(
          body?.error ?? `Opponent search failed (${response.status}).`,
        );
      }

      const opponent: unknown = await response.json();

      // A broken response must not start an invalid battle.
      if (
        !opponent ||
        typeof opponent !== "object" ||
        !("id" in opponent) ||
        typeof opponent.id !== "string" ||
        !("name" in opponent) ||
        typeof opponent.name !== "string" ||
        !("icon" in opponent) ||
        typeof opponent.icon !== "string" ||
        !("hp" in opponent) ||
        typeof opponent.hp !== "number" ||
        !Number.isFinite(opponent.hp) ||
        opponent.hp <= 0 ||
        !("round" in opponent) ||
        typeof opponent.round !== "number" ||
        !Number.isInteger(opponent.round) ||
        !("items" in opponent) ||
        !Array.isArray(opponent.items) ||
        !opponent.items.every((item) => typeof item === "string")
      ) {
        throw new Error(
          "The arena returned an invalid opponent. Please try again.",
        );
      }

      return opponent as Opponent;
    })();

    // The timeout also works if a request does not react to abort.
    const timeLimit = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error("Opponent search timed out."));
      }, SEARCH_TIMEOUT_MS);
    });

    return await Promise.race([request, timeLimit]);
  } catch (error) {

    // A network failure must produce a message the player understands.
    if (error instanceof TypeError) {
      // Keep the original error so developers can find the cause.
      throw new Error("Cannot reach the arena server.", { cause: error });
    }

    if (error instanceof Error && error.name === "AbortError") {
      // Keep the abort error while showing a readable timeout message.
      throw new Error("Opponent search timed out.", { cause: error });
    }

    throw error;
  } finally {
    // Clear the timer when the request finishes or fails.
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}
