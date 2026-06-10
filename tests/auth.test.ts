import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, randomToken } from "@/lib/password";

describe("password hashing", () => {
  it("verifies a correct password", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const stored = hashPassword("hunter2hunter2");
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("produces a unique salt each time (no two hashes equal)", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("rejects malformed/empty stored hashes", () => {
    expect(verifyPassword("x", null)).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "no-colon-here")).toBe(false);
  });

  it("generates distinct hex tokens of expected length", () => {
    const a = randomToken(24);
    const b = randomToken(24);
    expect(a).toMatch(/^[0-9a-f]{48}$/);
    expect(a).not.toBe(b);
  });
});
