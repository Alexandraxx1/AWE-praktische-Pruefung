
import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { submitHallOfFameScore } from "../hallOfFameApi";
import type { RunOutcome } from "../run";
import type { RunState } from "../types";

interface ScoreSubmissionProps {
  run: RunState;
  outcome: RunOutcome;
  runId?: string;
  submitted: boolean;
  onSubmitted: () => void;
}

export function ScoreSubmission({
  run,
  outcome,
  runId,
  submitted,
  onSubmitted,
}: ScoreSubmissionProps) {
  // Remember the name, loading state and possible error.
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent two requests from starting at the same time.
  const requestRunning = useRef(false);

  const validName =
    name.trim().length >= 2 && name.trim().length <= 24;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Prevent the browser from reloading the page.
    event.preventDefault();

    // Do not submit an invalid or already submitted run.
    if (
      requestRunning.current ||
      submitted ||
      !runId ||
      !validName
    ) {
      return;
    }

    requestRunning.current = true;
    setSending(true);
    setError(null);

    try {
      // Send the player's finished run to the API.
      await submitHallOfFameScore({
        runId,
        name: name.trim(),
        wins: run.wins,
        lives: run.lives,
        round: run.round,
        outcome,
      });

      // Remember a successful submission in the game state.
      onSubmitted();
    } catch (err) {
      // Keep the entered name so the player can retry.
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit the score."
      );
    } finally {
      // Allow another attempt after a failed request.
      requestRunning.current = false;
      setSending(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-lg rounded-lg border border-panel-edge bg-panel p-6">
      <h3 className="mb-3 text-center font-display text-xl font-bold text-gold">
        🏆 Enter the Hall of Fame
      </h3>

      {submitted ? (
        // Hide the form when this run was already submitted.
        <div className="text-center">
          <p className="mb-3 text-green-400">
            Your score was submitted successfully!
          </p>

          <Link
            to="/hall-of-fame"
            className="font-semibold text-gold underline"
          >
            View Hall of Fame
          </Link>
        </div>
      ) : !runId ? (
        <p className="text-center text-life">
          This run has no valid ID. Start a new run to submit a score.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="player-name" className="text-sm font-semibold">
            Player name
          </label>

          <input
            id="player-name"
            type="text"
            value={name}
            maxLength={24}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            disabled={sending}
            className="rounded border border-panel-edge bg-ink p-3 text-white"
          />

          <p className="text-xs text-muted">
            Enter 2 to 24 characters.
          </p>

          {/* Show an error without clearing the player's name. */}
          {error && (
            <p role="alert" className="text-sm text-life">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!validName || sending}
            className="rounded bg-gold px-4 py-3 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Submitting..." : "Submit Score"}
          </button>
        </form>
      )}
    </section>
  );
}
