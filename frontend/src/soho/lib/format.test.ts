import { describe, expect, it } from "vitest";

import { formatValue } from "./format";

describe("formatValue currency", () => {
  it("formats business metrics with the currency returned by the business data", () => {
    expect(formatValue(1250, "currency", { currency: "INR" })).toBe("₹1,250");
  });
});
