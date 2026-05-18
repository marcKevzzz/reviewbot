import * as core from "@actions/core";

export const logger = {
  info: (msg: string) => core.info(msg),
  warning: (msg: string) => core.warning(msg),
  error: (msg: string, err?: Error) => {
    core.error(msg);
    if (err) core.debug(`Error detail: ${err.stack || err.message}`);
  },
  debug: (msg: string) => core.debug(msg),
};
