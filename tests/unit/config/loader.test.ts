import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fs from "fs";
import * as core from "@actions/core";
import { loadConfig } from "../../../src/config/loader";
import { DEFAULT_CONFIG } from "../../../src/config/defaults";
import { AIProviderType, Severity } from "../../../src/types";

vi.mock("fs");

describe("loadConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(core.getInput).mockReturnValue("");
  });

  it("should return DEFAULT_CONFIG if no config file exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const config = loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("should override values from yml config", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
provider: "openai"
model: "gpt-4o-mini"
severityThreshold: "warning"
    `);

    const config = loadConfig();
    expect(config.provider).toBe(AIProviderType.OPENAI);
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.severityThreshold).toBe(Severity.WARNING);
  });

  it("should override with inputs over yml values", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
provider: "openai"
model: "gpt-4o-mini"
    `);
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === "provider") return "anthropic";
      if (name === "model") return "claude-3-5-sonnet-latest";
      return "";
    });

    const config = loadConfig();
    expect(config.provider).toBe(AIProviderType.ANTHROPIC);
    expect(config.model).toBe("claude-3-5-sonnet-latest");
  });
});
