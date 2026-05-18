import { ErrorCode } from "./types";

export class ReviewBotError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly retryable: boolean,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "ReviewBotError";
  }
}

export class ConfigError extends ReviewBotError {
  constructor(message: string, cause?: Error) {
    super(message, ErrorCode.CONFIG_INVALID, false, cause);
  }
}

export class DiffError extends ReviewBotError {
  constructor(message: string, code: ErrorCode, cause?: Error) {
    super(message, code, code === ErrorCode.DIFF_FETCH_FAILED, cause);
  }
}

export class AIError extends ReviewBotError {
  constructor(message: string, code: ErrorCode, cause?: Error) {
    super(message, code, code === ErrorCode.AI_RATE_LIMITED, cause);
  }
}

export class PublishError extends ReviewBotError {
  constructor(message: string, code: ErrorCode, cause?: Error) {
    super(message, code, code === ErrorCode.PUBLISH_RATE_LIMITED, cause);
  }
}
