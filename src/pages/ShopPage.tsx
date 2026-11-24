
import { useRef } from "react";
import { fetchOpponent } from "../api";
import { Backpack } from "../components/Backpack";
import { FightBar } from "../components/FightBar";
import { RulesPanel } from "../components/RulesPanel";
import { RunHeader } from "../components/RunHeader";
import { Shop } from "../components/Shop";
import {
  fightBlocker,
  searchFailed,
  startBattle,
  startSearch,
  updateRun,
} from "../game";
import { buyItem, moveItem, rerollShop, sellItem } from "../run";
import { useActiveGame } from "../state/GameContext";

export function ShopPage() {
  const { game, update } = useActiveGame();
  const { run, phase } = game;

  // This lock prevents two quick clicks from starting two API requests.
  const searchLock = useRef(false);

  function handleBuy(offerIndex: number) {
    update((current) =>
      updateRun(current, (currentRun) => buyItem(currentRun, offerIndex))
    );
  }

  function handleSell(slotIndex: number) {
    // Selling is only allowed while the player is shopping.
    update((current) =>
      updateRun(current, (currentRun) => sellItem(currentRun, slotIndex))
    );
  }

  function handleReroll() {
    // The shop cannot be rerolled while searching or fighting.
    update((current) => updateRun(current, rerollShop));
  }

  function handleMove(fromIndex: number, toIndex: number) {
    // Moving and swapping items are only allowed during shopping.
    update((current) =>
      updateRun(current, (currentRun) =>
        moveItem(currentRun, fromIndex, toIndex)
      )
    );
  }

  async function handleFindOpponent() {
    // Ignore repeated clicks and searches outside the shop.
    if (searchLock.current || fightBlocker(game) !== null) return;

    searchLock.current = true;

    // Each request gets its own ID and remembers the current round.
    const requestId = crypto.randomUUID();
    const round = run.round;

    update((current) => startSearch(current, requestId));

    try {
      const opponent = await fetchOpponent(round);

      // Only the matching search may start a battle.
      update((current) =>
        startBattle(current, opponent, requestId, round)
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Opponent search failed.";

      // A failed request returns the player to a usable shop.
      update((current) =>
        searchFailed(current, message, requestId, round)
      );
    } finally {
      // Unlock the button after the request has finished.
      searchLock.current = false;
    }
  }

  return (
    <>
      <RunHeader run={run} />

      <FightBar
        phase={phase}
        blocker={fightBlocker(game)}
        error={game.error}
        onFight={handleFindOpponent}
      />

      {/* Shop actions are disabled during the opponent search. */}
      <fieldset
        disabled={phase !== "shop"}
        className="grid min-w-0 gap-4 disabled:opacity-60 lg:grid-cols-[1fr_16rem_18rem]"
      >
        <Shop
          run={run}
          onBuy={handleBuy}
          onReroll={handleReroll}
        />

        <Backpack
          backpack={run.backpack}
          onSell={handleSell}
          onMove={handleMove}
        />

        <aside className="flex flex-col gap-4">
          <RulesPanel open={run.round === 1} />
        </aside>
      </fieldset>
    </>
  );
}
