
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  listScores,
  submitScore,
  validateScore,
} from "./hallOfFame.js";

// Create a valid test score with a new run ID.
function makeScore(changes = {}) {
  return {
    runId: randomUUID(),
    name: "Test Player",
    wins: 5,
    lives: 3,
    round: 5,
    outcome: "victory",
    ...changes,
  };
}

describe("Hall of Fame validation", () => {
  it("accepts a valid finished run", () => {
    const result = validateScore(
      makeScore({ name: "  Test Player  " })
    );

    expect(result.error).toBeUndefined();
    expect(result.score.name).toBe("Test Player");
  });

  it("rejects an invalid run ID", () => {
    const result = validateScore(
      makeScore({ runId: "invalid-id" })
    );

    expect(result.error).toBeDefined();
  });

  it("rejects a name that is too short", () => {
    const result = validateScore(
      makeScore({ name: "A" })
    );

    expect(result.error).toBeDefined();
  });

  it("rejects impossible win counts", () => {
    const result = validateScore(
      makeScore({ wins: 10 })
    );

    expect(result.error).toBeDefined();
  });

  it("rejects an incorrect round count", () => {
    const result = validateScore(
      makeScore({ round: 7 })
    );

    expect(result.error).toBeDefined();
  });

  it("rejects unfinished runs", () => {
    const result = validateScore(
      makeScore({
        wins: 2,
        lives: 2,
        round: 3,
        outcome: "defeat",
      })
    );

    expect(result.error).toBeDefined();
  });
});

describe("Hall of Fame submissions", () => {
  it("stores a valid score", () => {
    const score = makeScore();
    const result = submitScore(score);

    expect(result.status).toBe(201);
    expect(result.entry.runId).toBe(score.runId);
    expect(result.entry.submittedAt).toBeDefined();
  });

  it("does not duplicate an identical submission", () => {
    const score = makeScore();

    const first = submitScore(score);
    const second = submitScore(score);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);

    const matches = listScores().filter(
      (entry) => entry.runId === score.runId
    );

    expect(matches).toHaveLength(1);
  });

  it("rejects conflicting data for the same run ID", () => {
    const score = makeScore();

    submitScore(score);

    const result = submitScore({
      ...score,
      name: "Different Player",
    });

    expect(result.status).toBe(409);
    expect(result.error).toBeDefined();
  });
});

describe("Hall of Fame ranking", () => {
  it("ranks victories before defeats", () => {
    const defeat = submitScore(
      makeScore({
        wins: 0,
        lives: 0,
        round: 3,
        outcome: "defeat",
      })
    ).entry;

    const victory = submitScore(makeScore()).entry;

    const entries = listScores();

    const victoryPosition = entries.findIndex(
      (entry) => entry.runId === victory.runId
    );

    const defeatPosition = entries.findIndex(
      (entry) => entry.runId === defeat.runId
    );

    expect(victoryPosition).toBeLessThan(defeatPosition);
  });

  it("ranks more wins higher among defeats", () => {
    const fewerWins = submitScore(
      makeScore({
        wins: 2,
        lives: 0,
        round: 5,
        outcome: "defeat",
      })
    ).entry;

    const moreWins = submitScore(
      makeScore({
        wins: 4,
        lives: 0,
        round: 7,
        outcome: "defeat",
      })
    ).entry;

    const entries = listScores();

    const fewerPosition = entries.findIndex(
      (entry) => entry.runId === fewerWins.runId
    );

    const morePosition = entries.findIndex(
      (entry) => entry.runId === moreWins.runId
    );

    expect(morePosition).toBeLessThan(fewerPosition);
  });

  it("ranks fewer rounds higher when wins are equal", () => {
    const slower = submitScore(
      makeScore({
        wins: 5,
        lives: 1,
        round: 7,
      })
    ).entry;

    const faster = submitScore(
      makeScore({
        wins: 5,
        lives: 3,
        round: 5,
      })
    ).entry;

    const entries = listScores();

    const slowerPosition = entries.findIndex(
      (entry) => entry.runId === slower.runId
    );

    const fasterPosition = entries.findIndex(
      (entry) => entry.runId === faster.runId
    );

    expect(fasterPosition).toBeLessThan(slowerPosition);
  });
});
