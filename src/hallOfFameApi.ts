
export interface HallOfFameEntry {
  runId: string;
  name: string;
  wins: number;
  lives: number;
  round: number;
  outcome: "victory" | "defeat";
  submittedAt: string;
}

// A submission contains the score without the server timestamp.
export type ScoreSubmission = Omit<HallOfFameEntry, "submittedAt">;

/** Send a finished run to the Hall of Fame API. */
export async function submitHallOfFameScore(
  score: ScoreSubmission
): Promise<HallOfFameEntry> {
  // Send the score as JSON to our Express server.
  const response = await fetch("/api/hall-of-fame", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(score),
  });

  // Read the server response, including possible errors.
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // Show the error message returned by the server.
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      throw new Error(data.error);
    }

    throw new Error("Could not submit the score. Please try again.");
  }

  // Make sure the server returned a saved entry.
  if (
    !data ||
    typeof data !== "object" ||
    !("entry" in data) ||
    !data.entry ||
    typeof data.entry !== "object"
  ) {
    throw new Error("The server returned an invalid response.");
  }

  return data.entry as HallOfFameEntry;
}

/** Fetch all saved runs from the Hall of Fame API. */
export async function getHallOfFame(): Promise<HallOfFameEntry[]> {
  // Request the leaderboard from our local Express server.
  const response = await fetch("/api/hall-of-fame");

  // Show an understandable message if the API fails.
  if (!response.ok) {
    throw new Error("Could not load the Hall of Fame.");
  }

  const data: unknown = await response.json();

  // Check that the API response contains a list of entries.
  if (
    !data ||
    typeof data !== "object" ||
    !("entries" in data) ||
    !Array.isArray(data.entries)
  ) {
    throw new Error("The Hall of Fame returned invalid data.");
  }

  return data.entries as HallOfFameEntry[];
}
