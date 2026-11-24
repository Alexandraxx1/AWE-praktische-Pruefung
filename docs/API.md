# Backpack Brawl API

The local API is a small Express server in `server/index.js`. It listens on port 4200 (override with the `PORT` environment variable). During Vite development, `/api` is proxied to it, so the frontend uses relative URLs such as `/api/opponents?round=1`. All responses are JSON. The opponent API is deterministic. The Hall of Fame stores scores in server memory, so submitted entries are lost when the server restarts.

## `GET /api/health`

Always answers immediately with status 200:

```json
{ "ok": true, "service": "backpack-brawl" }
```

## `GET /api/opponents`

Returns the opponent for one round of a run. The opponent table lives in `server/opponents.js`.

### Query parameters

| Parameter | Required | Meaning |
|---|---|---|
| `round` | yes | The 1-based round number. Must be a positive whole number written in digits (`1`, `2`, …). |
| `latency` | no | Response delay in milliseconds, clamped to 0–5000. Defaults to 1200. A value that is not a number falls back to the default. |
| `fail` | no | `fail=true` forces a 503 response (see below). |

### Success — 200

```json
{
  "id": "mossback-hermit",
  "name": "Mossback Hermit",
  "icon": "🐢",
  "hp": 25,
  "items": ["chipped-dagger", "pot-lid"],
  "round": 1
}
```

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable identifier of the opponent |
| `name` | string | Display name |
| `icon` | string | Emoji shown in the battle view |
| `hp` | number | Maximum (and starting) HP |
| `items` | string[] | Item ids from the catalog in `src/items.ts`; the same id may appear several times |
| `round` | number | The round this opponent was requested for (echoes `round`) |

The response matches the `Opponent` type in `src/types.ts`.

The answer is deterministic: the same `round` always returns the same opponent. There is one hand-built opponent per round for rounds 1–7. Every round past the table returns the last opponent with +6 HP per additional round. The table never needs more than 7 rounds (5 wins + 3 lives − 1), and an opponent never carries more than 6 items, the size of the player's 2×3 backpack.

### Errors

Every error response has the shape:

```json
{ "error": "human-readable explanation" }
```

| Status | When | `error` |
|---|---|---|
| 400 | `round` is missing, not a whole number, or less than 1 | `round must be a positive whole number` |
| 503 | `fail=true`, or the server was started with `API_FAIL=true` | `The arena gates are shut. No challenger answered the call.` |

An invalid `round` is reported as 400 even when failure is forced. All responses from this endpoint, errors included, arrive after the configured delay.

## Environment variables

| Variable | Effect |
|---|---|
| `PORT` | Port to listen on (default 4200). The Vite proxy expects 4200. |
| `API_LATENCY` | Default delay in milliseconds when a request has no `latency` parameter. |
| `API_FAIL` | `true` makes every opponent request fail with 503. |

Example: `API_FAIL=true pnpm server`.

## Client

`fetchOpponent(round)` in `src/api.ts` performs the request. It resolves with the `Opponent` on success and throws an `Error` carrying the server's `error` text (or a generic message with the status code) for any non-2xx response. When the API is not running, the Vite proxy answers with an error status of its own, which is reported the same way; a network failure rejects as well.



## Hall of Fame (B7)

The Hall of Fame allows players to submit finished runs and
compare their results with other players.

Scores are stored in memory on the Express server.
They are lost when the server restarts.

### GET /api/hall-of-fame

Returns all submitted scores in ranking order.

**Success — 200**

```json
{
  "entries": [
    {
      "runId": "7b32e447-15a9-4733-8172-6d8c6ff257a1",
      "name": "Test Hero",
      "wins": 5,
      "lives": 3,
      "round": 5,
      "outcome": "victory",
      "submittedAt": "2026-11-24T13:00:00.000Z"
    }
  ]
}
```

If there are no scores, the API returns:

```json
{
  "entries": []
}
```

### POST /api/hall-of-fame

Validates and stores a finished run.

**Example request**

```json
{
  "runId": "7b32e447-15a9-4733-8172-6d8c6ff257a1",
  "name": "Test Hero",
  "wins": 5,
  "lives": 3,
  "round": 5,
  "outcome": "victory"
}
```

**Success — 201**

```json
{
  "entry": {
    "runId": "7b32e447-15a9-4733-8172-6d8c6ff257a1",
    "name": "Test Hero",
    "wins": 5,
    "lives": 3,
    "round": 5,
    "outcome": "victory",
    "submittedAt": "2026-11-24T13:00:00.000Z"
  }
}
```

The server generates `submittedAt` automatically.

### Validation rules

- `runId` must be a valid UUID.
- `name` must contain 2 to 24 characters after trimming.
- `wins` must be an integer between 0 and 5.
- `lives` must be an integer between 0 and 3.
- `round` must be an integer between 3 and 7.
- Victory requires 5 wins and at least 1 remaining life.
- Defeat requires 0 lives and fewer than 5 wins.
- The round number must equal `wins + (3 - lives)`.

### HTTP status codes

| Status | Meaning |
|---|---|
| 200 | Identical run was already submitted |
| 201 | New score successfully stored |
| 400 | Invalid or implausible score |
| 409 | Run ID already exists with different data |

Errors use the following JSON format:

```json
{
  "error": "human-readable explanation"
}
```

### Ranking rules

Scores are sorted using these rules:

1. Victories before defeats.
2. More wins rank higher.
3. Fewer rounds rank higher.
4. Earlier submissions rank higher when otherwise equal.

### Duplicate prevention

Each new game run receives a unique `runId`.

If the same run is submitted again with identical data,
the API returns the existing entry with HTTP 200.

If the same `runId` is submitted with different data,
the API rejects the request with HTTP 409.

The frontend stores the `runId` and submission status in
localStorage to keep them after refreshing the browser.

### Client implementation

`getHallOfFame()` and `submitHallOfFameScore()` are located
in `src/hallOfFameApi.ts`.

The Hall of Fame page displays loading, empty, error and
success states. Failed score submissions can be retried
without entering the player name again.

### Limitations

Entries are not stored permanently and disappear when the
API server restarts.

The server validates submitted scores but does not
independently verify the history of every battle.
