
import { useState } from "react";
import { TICK_SECONDS } from "../battle";
import { describeEffects, getActiveSets, getItem, SET_INFO } from "../items";
import { BACKPACK_COLS } from "../shop";
import type { Backpack as BackpackSlots, ItemDef } from "../types";

/** Show the item name, effects and cooldown on hover. */
const tooltip = (item: ItemDef) =>
  [item.name, ...describeEffects(item.effects).map(({ label }) => label), `⏱️ every ${item.cooldown * TICK_SECONDS}s`].join("\n");

export function Backpack({
  backpack,
  onSell,
  onMove,
}: {
  backpack: BackpackSlots;
  onSell?: (slotIndex: number) => void;
  onMove?: (fromIndex: number, toIndex: number) => void;
}) {
  // Remember the selected slot only for the user interface.
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

    // Find all items in the backpack and calculate active set bonuses.
  const itemIds = backpack.flatMap((slot) =>
    slot ? [slot.itemId] : []
  );

  const activeSets = getActiveSets(itemIds);

  function handleSlotClick(index: number) {
    if (!onMove) return;

    // Select the first item when no slot is selected.
    if (selectedSlot === null) {
      if (backpack[index]) {
        setSelectedSlot(index);
      }
      return;
    }

    // Clicking the same slot again cancels the selection.
    if (selectedSlot === index) {
      setSelectedSlot(null);
      return;
    }

    // Cancel if the selected item no longer exists.
    if (!backpack[selectedSlot]) {
      setSelectedSlot(null);
      return;
    }

    // Move or swap the items and clear the selection.
    onMove(selectedSlot, index);
    setSelectedSlot(null);
  }

  function handleSell(index: number) {
    // Clear the selection before selling an item.
    setSelectedSlot(null);
    onSell?.(index);
  }

  return (
    <section className="rounded-lg border border-panel-edge bg-panel p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">🎒 Backpack</h2>

        {selectedSlot !== null && (
          <button
            type="button"
            onClick={() => setSelectedSlot(null)}
            className="rounded border border-panel-edge px-2 py-1 text-xs hover:bg-ink"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="mb-3 text-sm text-muted">
        Click an item to select it, then click another slot to move or swap.
        Hover an item to see its stats.
      </p>

            {/* Show which set bonuses are currently active. */}
      <div className="mb-3 rounded border border-panel-edge p-2 text-sm">
        <p className="mb-1 font-semibold">Active Set Bonuses</p>

        {activeSets.length === 0 ? (
          <p className="text-muted">
            No active bonus. Collect 2 items from the same set.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {activeSets.map((set) => (
              <li key={set} title={SET_INFO[set].bonus} className="text-gold">
                {set === "fire" ? "🔥" : "🛡️"} {SET_INFO[set].name}: Active
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${BACKPACK_COLS}, minmax(0, 1fr))`,
        }}
      >
        {backpack.map((slot, index) => {
          const item = slot ? getItem(slot.itemId) : null;

          // Highlight the selected slot and all possible destinations.
          const isSelected = selectedSlot === index;
          const canMoveHere =
            selectedSlot !== null &&
            selectedSlot !== index &&
            backpack[selectedSlot] !== null &&
            Boolean(onMove);

          return (
            <li
              key={slot?.uid ?? `empty-${index}`}
              title={item ? tooltip(item) : undefined}
              className={[
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 p-1",
                isSelected
                  ? "border-gold bg-gold/20"
                  : canMoveHere
                    ? "border-green-400 bg-green-400/10"
                    : item
                      ? "border-gold/40 bg-ink/40"
                      : "border-dashed border-panel-edge",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => handleSlotClick(index)}
                disabled={!onMove || (selectedSlot === null && !item)}
                aria-pressed={isSelected}
                aria-label={
                  canMoveHere
                    ? `Move or swap item to slot ${index + 1}`
                    : item
                      ? `Select ${item.name} in slot ${index + 1}`
                      : `Empty slot ${index + 1}`
                }
                className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-1 rounded"
              >
                {item ? (
                  <>
                    <span className="text-3xl leading-none sm:text-4xl" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="text-center text-xs leading-tight">
                      {item.name}
                    </span>

                    {/* Show the item's set inside the backpack. */}
                    {item.set && (
                      <span
                        title={SET_INFO[item.set].bonus}
                        className="text-xs text-gold"
                      >
                        {item.set === "fire" ? "🔥 Fire" : "🛡️ Guardian"}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted">
                    {canMoveHere ? "Move here" : "Empty"}
                  </span>
                )}
              </button>

              {/* Keep the selling feature from B1. */}
              {item && onSell && (
                <button
                  type="button"
                  onClick={() => handleSell(index)}
                  aria-label={`Sell ${item.name} for ${Math.floor(item.price / 2)} gold`}
                  className="rounded bg-gold px-2 py-1 text-xs font-semibold text-ink hover:brightness-110"
                >
                  Sell for {Math.floor(item.price / 2)} 🪙
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
