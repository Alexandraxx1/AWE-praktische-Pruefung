
import { describe, expect, it } from "vitest";
import { CATALOG, describeEffects, getItem } from "./items";

describe("B3 - Status effect items", () => {
  it("contains at least three poison items", () => {
    const poisonItems = CATALOG.filter((item) => item.effects.poison);

    // The catalog must offer at least three different poison items.
    expect(poisonItems.length).toBeGreaterThanOrEqual(3);
  });

  it("contains at least three healing items", () => {
    const healingItems = CATALOG.filter((item) => item.effects.heal);

    // The catalog must offer at least three different healing items.
    expect(healingItems.length).toBeGreaterThanOrEqual(3);
  });

  it("provides correct labels for poison and healing", () => {
    const poison = getItem("poison-dagger");
    const healing = getItem("healing-herb");

    // Both effects must have readable labels for the shop interface.
    expect(describeEffects(poison.effects)).toContainEqual({
      effect: "poison",
      label: "☠️ +1 poison",
    });

    expect(describeEffects(healing.effects)).toContainEqual({
      effect: "heal",
      label: "💚 +3 HP",
    });
  });
});
