import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../../../src/utils/retry";

describe("withRetry", () => {
  it("should return the result directly if fn succeeds", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const res = await withRetry(fn);
    expect(res).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry and resolve on subsequent attempt", async () => {
    let count = 0;
    const fn = vi.fn().mockImplementation(async () => {
      count++;
      if (count < 2) throw new Error("Fail");
      return "success";
    });

    const res = await withRetry(fn, { baseDelayMs: 1 });
    expect(res).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should fail after max attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Always fail"));
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow("Always fail");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
