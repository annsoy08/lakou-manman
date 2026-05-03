import { describe, it, expect } from "vitest";
import { getInitials, resolveUserDisplayName, appendCacheBuster, resolveProfilePhoto } from "@/lib/utils";

describe("getInitials", () => {
  it("returns initials from full name", () => {
    expect(getInitials("Ann Soraya")).toBe("AS");
  });

  it("returns single initial for single name", () => {
    expect(getInitials("Marie")).toBe("M");
  });

  it("returns ?? for empty/null input", () => {
    expect(getInitials("")).toBe("??");
    expect(getInitials(null)).toBe("??");
    expect(getInitials(undefined)).toBe("??");
  });

  it("truncates to 2 characters max", () => {
    expect(getInitials("Ann Marie Claire").length).toBeLessThanOrEqual(2);
  });
});

describe("resolveUserDisplayName", () => {
  it("prefers profile.name over other fields", () => {
    expect(resolveUserDisplayName({ name: "Marie" }, { displayName: "Other" })).toBe("Marie");
  });

  it("falls back to authUser.displayName when no profile.name", () => {
    expect(resolveUserDisplayName({}, { displayName: "Ann" })).toBe("Ann");
  });

  it("falls back to email prefix when no displayName", () => {
    expect(resolveUserDisplayName({}, { email: "ann@example.com" })).toBe("ann");
  });

  it("returns fallback when nothing is available", () => {
    expect(resolveUserDisplayName(null, null, "Utilisateur")).toBe("Utilisateur");
  });
});

describe("appendCacheBuster", () => {
  it("appends version as query param", () => {
    expect(appendCacheBuster("/avatar.png", "123")).toBe("/avatar.png?v=123");
  });

  it("uses & separator if URL already has query params", () => {
    expect(appendCacheBuster("/img.png?size=lg", "2")).toBe("/img.png?size=lg&v=2");
  });

  it("returns URL unchanged when no version", () => {
    expect(appendCacheBuster("/img.png", "")).toBe("/img.png");
  });

  it("returns empty string for empty URL", () => {
    expect(appendCacheBuster("", "123")).toBe("");
  });
});

describe("resolveProfilePhoto", () => {
  it("uses primary photo when available", () => {
    expect(resolveProfilePhoto("/primary.png", "/fallback.png")).toBe("/primary.png");
  });

  it("uses fallback when primary is empty", () => {
    expect(resolveProfilePhoto("", "/fallback.png")).toBe("/fallback.png");
  });

  it("returns empty string when both are empty", () => {
    expect(resolveProfilePhoto("", "")).toBe("");
  });
});
