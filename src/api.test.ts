
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOpponent, SEARCH_TIMEOUT_MS } from "./api";

const opponent = {
  id: "test-opponent",
  name: "Test Opponent",
  icon: "⚔️",
  hp: 30,
  round: 1,
  items: ["chipped-dagger"],
};

afterEach(() => {
  // Restore the real timers and fetch function after every test.
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("B5 - Opponent API", () => {
  it("loads a valid opponent", async () => {
    // Simulate a successful response from the server.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(opponent), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOpponent(1);

    expect(result).toEqual(opponent);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the server error when the API is unavailable", async () => {
    // Simulate an HTTP 503 error with a readable server message.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "The arena gates are shut.",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(fetchOpponent(1)).rejects.toThrow(
      "The arena gates are shut.",
    );
  });

  it("shows a readable message when the network fails", async () => {
    // A network error should not leave the search running.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(fetchOpponent(1)).rejects.toThrow(
      "Cannot reach the arena server.",
    );
  });

  it("rejects an invalid opponent response", async () => {
    // The API must return a valid opponent before battle can start.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ name: "Missing opponent data" }),
          { status: 200 },
        ),
      ),
    );

    await expect(fetchOpponent(1)).rejects.toThrow(
      "The arena returned an invalid opponent.",
    );
  });

    it("rejects an opponent with an unknown item", async () => {
    // Simulate an opponent with an item that does not exist.
    const invalidOpponent = {
      ...opponent,
      items: ["chipped-dagger", "unknown-sword"],
    };

    // Return the invalid opponent from our mocked API.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(invalidOpponent), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    // An invalid item must not be accepted for a battle.
    await expect(fetchOpponent(1)).rejects.toThrow(
      "The arena returned an invalid opponent.",
    );
  });

  it("stops waiting when the API never responds", async () => {
    vi.useFakeTimers();


    // This request deliberately never finishes.
    const fetchMock = vi.fn(
      (_url: string, _options: RequestInit) => {
        // These arguments are kept so the test can inspect the abort signal.
        void _url;
        void _options;
        return new Promise<Response>(() => {});
      },
    );
    vi.stubGlobal("fetch", fetchMock);


    const request = fetchOpponent(1);
    const result = expect(request).rejects.toThrow(
      "Opponent search timed out.",
    );

    // Move the test clock forward instead of waiting eight real seconds.
    await vi.advanceTimersByTimeAsync(SEARCH_TIMEOUT_MS);

    await result;

    // The timeout must also signal that the request was aborted.
    const options = fetchMock.mock.calls[0][1];
    expect(options.signal?.aborted).toBe(true);
  });

  it("ignores a response that arrives after the timeout", async () => {
    vi.useFakeTimers();

    let sendLateResponse!: (response: Response) => void;

    // Keep the API response pending until after the timeout.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            sendLateResponse = resolve;
          }),
      ),
    );

    const request = fetchOpponent(1);
    const result = expect(request).rejects.toThrow(
      "Opponent search timed out.",
    );

    await vi.advanceTimersByTimeAsync(SEARCH_TIMEOUT_MS);
    await result;

    // A response after the timeout cannot change the rejected result.
    sendLateResponse(
      new Response(JSON.stringify(opponent), { status: 200 }),
    );

    await Promise.resolve();
  });
});
