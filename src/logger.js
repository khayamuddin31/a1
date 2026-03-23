function writeLog(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const hasMetadata = Object.keys(metadata).length > 0;
  const formattedMetadata = hasMetadata ? ` ${JSON.stringify(metadata)}` : "";

  console[level](`[${timestamp}] ${message}${formattedMetadata}`);
}

export function createLogger() {
  return {
    info(message, metadata) {
      writeLog("log", message, metadata);
    },
    warn(message, metadata) {
      writeLog("warn", message, metadata);
    },
    error(message, metadata) {
      writeLog("error", message, metadata);
    },
  };
}
