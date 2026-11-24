
/**
 * Store finished runs in memory and validate submitted scores.
 * Entries are lost when the server restarts.
 */
const entries = new Map();

const RUN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Check that the score describes a valid finished run. */
export function validateScore(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "A score must be a JSON object." };
  }

  const { runId, name, wins, lives, round, outcome } = body;

  // Every run needs a unique ID to prevent duplicate submissions.
  if (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId)) {
    return { error: "runId must be a valid UUID." };
  }

  // The player must enter a name between 2 and 24 characters.
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 24 ||
    /[\u0000-\u001f\u007f]/.test(name)
  ) {
    return { error: "Name must contain 2 to 24 characters." };
  }

  // Check the limits defined by the game rules.
  if (
    !Number.isSafeInteger(wins) || wins < 0 || wins > 5 ||
    !Number.isSafeInteger(lives) || lives < 0 || lives > 3 ||
    !Number.isSafeInteger(round) || round < 3 || round > 7
  ) {
    return { error: "Wins, lives or round are outside the allowed range." };
  }

  // A run finishes with five wins or after losing all three lives.
  const expectedOutcome =
    wins === 5 && lives > 0
      ? "victory"
      : lives === 0 && wins < 5
        ? "defeat"
        : null;

  if (!expectedOutcome || outcome !== expectedOutcome) {
    return { error: "The result does not describe a finished run." };
  }

  // Each win or lost life represents one completed round.
  if (round !== wins + (3 - lives)) {
    return { error: "Round count does not match wins and lives." };
  }

  // Return only the validated values.
  return {
    score: {
      runId,
      name: name.trim(),
      wins,
      lives,
      round,
      outcome,
    },
  };
}

/** Store each finished run only once. */
export function submitScore(body) {
  const { score, error } = validateScore(body);

  if (error) {
    return { status: 400, error };
  }

  // Check if this run was already submitted.
  const previous = entries.get(score.runId);

  if (previous) {
    // A retry with identical data returns the existing entry.
    const same =
      previous.name === score.name &&
      previous.wins === score.wins &&
      previous.lives === score.lives &&
      previous.round === score.round &&
      previous.outcome === score.outcome;

    return same
      ? { status: 200, entry: previous }
      : {
          status: 409,
          error: "This runId was already submitted with different data.",
        };
  }

  // Save the validated score with the submission date.
  const entry = {
    ...score,
    submittedAt: new Date().toISOString(),
  };

  entries.set(score.runId, entry);

  return { status: 201, entry };
}

/** Return the leaderboard in the defined ranking order. */
export function listScores() {
  return [...entries.values()].sort((a, b) =>
    // Victories come before defeats.
    Number(b.outcome === "victory") -
      Number(a.outcome === "victory") ||

    // More wins rank higher.
    b.wins - a.wins ||

    // Fewer rounds rank higher.
    a.round - b.round ||

    // Earlier submissions win remaining ties.
    a.submittedAt.localeCompare(b.submittedAt) ||
    a.runId.localeCompare(b.runId)
  );
}
