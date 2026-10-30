import { describe, expect, it } from "vitest";
import { getDict, optionValueLabel, variantLabelFor } from "@/i18n";

describe("variantLabelFor", () => {
  it("translates condition and PTA parts and keeps sizes and colors", () => {
    const label = variantLabelFor(getDict("ur"), "Good · 128 GB · PTA approved · Blue");
    const [condition, storage, pta, color] = label.split(" · ");
    expect(condition).toBe(getDict("ur").conditions.good.label);
    expect(storage).toBe("128 GB");
    expect(pta).toBe(getDict("ur").options.values["PTA approved"]);
    expect(color).toBe("Blue");
  });

  it("leaves English labels unchanged", () => {
    expect(variantLabelFor(getDict("en"), "Excellent · 256 GB · Non-PTA")).toBe("Excellent · 256 GB · Non-PTA");
  });
});

describe("optionValueLabel", () => {
  it("uses the condition key, not the label, for grades", () => {
    expect(optionValueLabel(getDict("ur"), "CONDITION", { value: "premium", label: "Premium" })).toBe(
      getDict("ur").conditions.premium.label,
    );
  });

  it("falls back to the stored label", () => {
    expect(optionValueLabel(getDict("ur"), "STORAGE", { value: "128gb", label: "128 GB" })).toBe("128 GB");
  });
});
