
import { RunHeader } from "../components/RunHeader";
import { RunOver } from "../components/RunOver";
import { ScoreSubmission } from "../components/ScoreSubmission";
import { runOutcome } from "../run";
import { useActiveGame } from "../state/GameContext";

export function ResultPage() {
  const { game, update, startNewRun } = useActiveGame();
  const outcome = runOutcome(game.run);

  // The result page only appears when the run is finished.
  if (!outcome) return null;

  function handleSubmitted() {
    // Mark only the current finished run as submitted.
    update((current) => {
      if (
        current.phase !== "finished" ||
        current.runId !== game.runId ||
        current.submitted
      ) {
        return current;
      }

      return {
        ...current,
        submitted: true,
      };
    });
  }

  return (
    <>
      <RunHeader run={game.run} />

      {/* Show the final result and the option to start a new run. */}
      <RunOver
        run={game.run}
        outcome={outcome}
        onNewRun={startNewRun}
      />

      {/* Allow the player to submit the completed run. */}
      <ScoreSubmission
        run={game.run}
        outcome={outcome}
        runId={game.runId}
        submitted={game.submitted === true}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}
