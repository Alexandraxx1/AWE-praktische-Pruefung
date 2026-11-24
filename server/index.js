
import cors from "cors";
import express from "express";
import { opponentForRound, parseRound } from "./opponents.js";
import { listScores, submitScore } from "./hallOfFame.js";

const app = express();
const port = Number(process.env.PORT ?? 4200);

app.use(cors());
app.use(express.json());

// Check whether the API server is available.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "backpack-brawl" });
});

// Return the opponent for the requested round.
app.get("/api/opponents", (req, res) => {
  const requested = Number(
    req.query.latency ?? process.env.API_LATENCY ?? 1200
  );

  const latency = Number.isFinite(requested)
    ? Math.max(0, Math.min(5000, requested))
    : 1200;

  setTimeout(() => {
    const round = parseRound(req.query.round);

    if (round === null) {
      return res.status(400).json({
        error: "round must be a positive whole number",
      });
    }

    if (
      req.query.fail === "true" ||
      process.env.API_FAIL === "true"
    ) {
      return res.status(503).json({
        error: "The arena gates are shut. No challenger answered the call.",
      });
    }

    res.json(opponentForRound(round));
  }, latency);
});

// Return the leaderboard ordered by the ranking rules.
app.get("/api/hall-of-fame", (_req, res) => {
  res.json({ entries: listScores() });
});

// Validate and save a finished run.
app.post("/api/hall-of-fame", (req, res) => {
  const result = submitScore(req.body);

  // Return a readable error if the score is invalid.
  if (result.error) {
    return res.status(result.status).json({
      error: result.error,
    });
  }

  // Return the saved entry, including on an identical retry.
  res.status(result.status).json({
    entry: result.entry,
  });
});

app.listen(port, () => {
  console.log(
    `Backpack Brawl API listening on http://localhost:${port}`
  );
});
