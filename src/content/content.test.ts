import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { articles, FAQS, HELP_TOPICS, LEGAL_DOCS, PAGE_PATH, pageDoc, type Block, type PageKey } from "@/content";
import { LANGS } from "@/i18n/config";

const KEYS = Object.keys(PAGE_PATH) as PageKey[];
const ARABIC_SCRIPT = /[؀-ۿ]/;

/** Every page this site really has. A link in the content or the footer must point at one of these. */
const KNOWN = new Set<string>(["/", "/help", "/journal", "/orders", "/l/phones", ...Object.values(PAGE_PATH), ...articles("en").map((a) => `/journal/${a.slug}`)]);

const shape = (b: Block) => ({ heading: Boolean(b.heading), paragraphs: b.paragraphs?.length ?? 0, list: b.list?.length ?? 0, steps: b.steps?.length ?? 0, links: (b.links ?? []).map((l) => l.href) });

describe("pages", () => {
  it("exist in both languages with the same structure", () => {
    for (const key of KEYS) {
      const en = pageDoc("en", key);
      const ur = pageDoc("ur", key);
      expect(en.blocks.map(shape), key).toEqual(ur.blocks.map(shape));
      for (const doc of [en, ur]) for (const text of [doc.title, doc.description, doc.intro]) expect(text.trim().length, key).toBeGreaterThan(10);
      expect(ARABIC_SCRIPT.test(ur.title) && ARABIC_SCRIPT.test(ur.intro), key).toBe(true);
      expect(ARABIC_SCRIPT.test(en.title), key).toBe(false);
    }
  });

  it("have no empty text and no leftover placeholders", () => {
    for (const lang of LANGS) {
      for (const key of KEYS) {
        const doc = pageDoc(lang, key);
        const texts = [doc.title, doc.description, doc.intro, ...doc.blocks.flatMap((b) => [b.heading ?? "x", ...(b.paragraphs ?? []), ...(b.list ?? []), ...(b.steps ?? []), ...(b.links ?? []).map((l) => l.label)])];
        for (const text of texts) {
          expect(text.trim(), `${lang}/${key}`).not.toBe("");
          expect(text, `${lang}/${key}`).not.toMatch(/TODO|lorem|undefined|NaN|\[object/i);
        }
      }
    }
  });

  it("link only to pages that exist", () => {
    for (const lang of LANGS) {
      const links = [
        ...KEYS.flatMap((k) => pageDoc(lang, k).blocks.flatMap((b) => b.links ?? [])),
        ...articles(lang).flatMap((a) => a.blocks.flatMap((b) => b.links ?? [])),
        ...FAQS[lang].flatMap((f) => (f.link ? [f.link] : [])),
      ];
      expect(links.length).toBeGreaterThan(10);
      for (const link of links) expect(KNOWN.has(link.href), `${lang}: ${link.href}`).toBe(true);
    }
  });

  it("are routed: every help and legal page has its URL segment", () => {
    for (const [segment, key] of Object.entries(HELP_TOPICS)) expect(PAGE_PATH[key]).toBe(`/help/${segment}`);
    for (const [segment, key] of Object.entries(LEGAL_DOCS)) expect(PAGE_PATH[key]).toBe(`/legal/${segment}`);
  });

  it("state the contact details in the terms and the privacy policy", () => {
    for (const lang of LANGS) for (const key of ["terms", "privacy"] as const) expect(JSON.stringify(pageDoc(lang, key))).toMatch(/@/);
  });
});

describe("FAQ", () => {
  it("has the same questions in both languages, each answered", () => {
    expect(FAQS.en.length).toBe(FAQS.ur.length);
    FAQS.en.forEach((f, i) => expect(f.link?.href).toBe(FAQS.ur[i].link?.href));
    for (const lang of LANGS) for (const f of FAQS[lang]) expect(f.question.length > 5 && f.answer.length > 20).toBe(true);
  });
});

describe("journal", () => {
  it("has the same articles in both languages with unique slugs", () => {
    const en = articles("en");
    const ur = articles("ur");
    expect(en.map((a) => a.slug)).toEqual(ur.map((a) => a.slug));
    expect(new Set(en.map((a) => a.slug)).size).toBe(en.length);
    en.forEach((a, i) => {
      expect(a.blocks.map(shape)).toEqual(ur[i].blocks.map(shape));
      expect(ARABIC_SCRIPT.test(ur[i].title)).toBe(true);
      expect(a.minutes).toBe(ur[i].minutes);
    });
  });
});

describe("footer", () => {
  it("links only to pages that exist", () => {
    const source = readFileSync("src/components/layout/footer.tsx", "utf8");
    const hrefs = [...source.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThanOrEqual(10);
    for (const href of hrefs) expect(KNOWN.has(href), href).toBe(true);
  });
});
