import { describe, it, expect } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("formats whole numbers with 2 decimal places", () => {
    expect(formatCurrency(1000)).toBe("£1,000.00");
  });
  it("formats decimal amounts", () => {
    expect(formatCurrency(7590.5)).toBe("£7,590.50");
  });
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("£0.00");
  });
});
