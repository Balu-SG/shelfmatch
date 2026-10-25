import { describe, expect, it } from "vitest";
import { normalizeDomain, parseCsv, stripHtml } from "./catalog";

describe("catalog import helpers", () => {
  it("normalizes store URLs", () => {
    expect(normalizeDomain("glossier.com")).toBe("glossier.com");
    expect(normalizeDomain("https://shop.example.com/collections/all?x=1")).toBe("shop.example.com");
  });

  it("strips HTML", () => {
    expect(stripHtml("<p>Gentle&nbsp;<b>cleanser</b></p><script>x()</script>")).toBe("Gentle cleanser");
  });

  it("parses quoted CSV with flexible headers", () => {
    const csv = 'Name,Variant Price,Description\r\n"Gel, Cleanser",$12.50,"Says ""hi"""\n\nToner,9,\n';
    const products = parseCsv(csv);
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({ title: "Gel, Cleanser", price: 12.5, description: 'Says "hi"' });
    expect(products[1]).toMatchObject({ title: "Toner", price: 9 });
  });

  it("rejects CSV without required columns", () => {
    expect(() => parseCsv("foo,bar\n1,2")).toThrow(/title/);
  });
});
