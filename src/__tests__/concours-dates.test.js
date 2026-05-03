import { describe, it, expect } from "vitest";

const MOIS_CREOLE = ["Janvye","Fevriye","Mas","Avril","Me","Jen","Jiyè","Out","Septanm","Oktòb","Novanm","Desanm"];

function utcDate(ts) {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  if (!d) return null;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function formatContestDate(date, isFr) {
  if (!date) return "";
  if (isFr) {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }
  return `${date.getDate()} ${MOIS_CREOLE[date.getMonth()]} ${date.getFullYear()}`;
}

describe("utcDate — pas de décalage timezone", () => {
  it("retourne le bon jour pour une date UTC noon", () => {
    const d = new Date(Date.UTC(2026, 4, 20, 12, 0, 0));
    const result = utcDate(d);
    expect(result.getDate()).toBe(20);
    expect(result.getMonth()).toBe(4);
    expect(result.getFullYear()).toBe(2026);
  });

  it("retourne null pour une valeur nulle", () => {
    expect(utcDate(null)).toBeNull();
    expect(utcDate(undefined)).toBeNull();
  });
});

describe("formatContestDate — traduction créole", () => {
  const date20mai = new Date(2026, 4, 20);
  const date26mai = new Date(2026, 4, 26);

  it("affiche 'Me' en créole pour le mois de mai", () => {
    expect(formatContestDate(date20mai, false)).toBe("20 Me 2026");
    expect(formatContestDate(date26mai, false)).toBe("26 Me 2026");
  });

  it("affiche en français pour isFr=true", () => {
    const result = formatContestDate(date20mai, true);
    expect(result).toContain("2026");
    expect(result).toContain("20");
  });

  it("retourne chaîne vide pour date nulle", () => {
    expect(formatContestDate(null, true)).toBe("");
    expect(formatContestDate(null, false)).toBe("");
  });
});

describe("MOIS_CREOLE — 12 mois présents", () => {
  it("contient exactement 12 mois", () => {
    expect(MOIS_CREOLE.length).toBe(12);
  });

  it("mai est au bon index", () => {
    expect(MOIS_CREOLE[4]).toBe("Me");
  });

  it("décembre est au bon index", () => {
    expect(MOIS_CREOLE[11]).toBe("Desanm");
  });
});
