import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import * as yaml from "js-yaml";
import { ConfigSchema, ReviewBotConfig } from "./schema";
import { DEFAULT_CONFIG } from "./defaults";
import { ConfigError } from "../errors";

export function loadConfig(configPath?: string): ReviewBotConfig {
  try {
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
    const resolvedPath = configPath 
      ? path.resolve(workspace, configPath)
      : path.resolve(workspace, ".reviewbot.yml");

    let fileConfig: Record<string, any> = {};

    if (fs.existsSync(resolvedPath)) {
      core.info(`Loading config file: ${resolvedPath}`);
      const content = fs.readFileSync(resolvedPath, "utf8");
      const parsed = yaml.load(content);
      if (parsed && typeof parsed === "object") {
        fileConfig = parsed;
      } else {
        throw new ConfigError(`Config file is not a valid YAML object: ${resolvedPath}`);
      }
    } else {
      if (configPath) {
        throw new ConfigError(`Config file specified but not found: ${resolvedPath}`);
      }
      core.info(".reviewbot.yml not found, using Action inputs and defaults.");
    }

    // Merge inputs: action input -> yml file -> defaults
    const merged: Record<string, any> = { ...DEFAULT_CONFIG, ...fileConfig };

    // Override with action inputs if explicitly provided
    const inputProvider = core.getInput("provider");
    if (inputProvider) merged.provider = inputProvider;

    const inputModel = core.getInput("model");
    if (inputModel) merged.model = inputModel;

    const inputSeverity = core.getInput("severity-threshold");
    if (inputSeverity) merged.severityThreshold = inputSeverity;

    const inputMaxFindings = core.getInput("max-findings");
    if (inputMaxFindings) merged.maxFindings = parseInt(inputMaxFindings, 10);

    const inputEnableNitpick = core.getInput("enable-nitpick-filter");
    if (inputEnableNitpick) merged.enableNitpickFilter = inputEnableNitpick === "true";

    // Validate merged object
    const validationResult = ConfigSchema.safeParse(merged);
    if (!validationResult.success) {
      throw new ConfigError(
        `Configuration validation failed: ${validationResult.error.message}`
      );
    }

    return validationResult.data;
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
  }
}
