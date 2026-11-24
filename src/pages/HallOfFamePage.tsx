
import { useEffect, useState } from "react";
import {
  getHallOfFame,
  type HallOfFameEntry,
} from "../hallOfFameApi";

export const HALL_OF_FAME_ROUTE = "/hall-of-fame";

export function HallOfFamePage() {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    // Ignore an old response if the component is no longer active.
    let cancelled = false;

    // Load the leaderboard when the page opens or the user retries.
    getHallOfFame()
      .then((result) => {
        if (cancelled) return;

        setEntries(result);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        setError(
          err instanceof Error ? err.message : "Failed to load scores."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reload]);

  function handleRetry() {
    // Start another request without reloading the whole page.
    setLoading(true);
    setError(null);
    setReload((current) => current + 1);
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-gold">
          🏆 Hall of Fame
        </h2>

        <p className="mt-2 text-sm text-muted">
          Victories first, then more wins, then fewer rounds.
          Earlier submissions win remaining ties.
        </p>
      </div>

      {/* Show a loading message while waiting for the API. */}
      {loading && (
        <p className="rounded-lg bg-panel p-6 text-center">
          Loading Hall of Fame...
        </p>
      )}

      {/* Show the error and allow the user to retry. */}
      {!loading && error && (
        <div className="rounded-lg border border-life bg-panel p-6 text-center">
          <p className="mb-3">{error}</p>

          <button
            type="button"
            onClick={handleRetry}
            className="rounded bg-gold px-4 py-2 font-semibold text-ink"
          >
            Try again
          </button>
        </div>
      )}

      {/* Explain why the leaderboard is empty. */}
      {!loading && !error && entries.length === 0 && (
        <p className="rounded-lg bg-panel p-6 text-center text-muted">
          No runs have been submitted yet.
          Be the first to enter the Hall of Fame!
        </p>
      )}

      {/* Display the entries in the order returned by the server. */}
      {!loading && !error && entries.length > 0 && (
        <ol className="flex flex-col gap-3">
          {entries.map((entry, index) => (
            <li
              key={entry.runId}
              className="flex items-center justify-between gap-4 rounded-lg border border-panel-edge bg-panel p-4"
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-xl text-gold">
                  #{index + 1}
                </span>

                <div>
                  <p className="font-bold">{entry.name}</p>
                  <p className="text-xs text-muted">
                    {entry.outcome === "victory"
                      ? "👑 Victory"
                      : "🪦 Defeat"}
                  </p>
                </div>
              </div>

              <div className="text-right text-sm">
                <p>{entry.wins} wins</p>
                <p className="text-muted">
                  {entry.round} rounds
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
