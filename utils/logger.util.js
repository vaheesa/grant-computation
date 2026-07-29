const LOG_LEVELS = {
  error: 0,
  info: 1,
  debug: 2
};

class Logger {
  constructor(level = process.env.LOG_LEVEL || "info") {
    const normalized = String(level || "info").toLowerCase();
    this.level = LOG_LEVELS[normalized] !== undefined ? normalized : "info";
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  format(level, message, meta) {
    const timestamp = new Date().toISOString();
    if (meta === undefined) {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`;
  }

  error(message, meta) {
    if (!this.shouldLog("error")) {
      return;
    }

    console.error(this.format("error", message, meta));
  }

  info(message, meta) {
    if (!this.shouldLog("info")) {
      return;
    }

    console.info(this.format("info", message, meta));
  }

  debug(message, meta) {
    if (!this.shouldLog("debug")) {
      return;
    }

    console.debug(this.format("debug", message, meta));
  }
}

module.exports = new Logger();
