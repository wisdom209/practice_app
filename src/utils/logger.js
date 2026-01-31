// Logger utility with configurable levels
const LOG_LEVELS = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
	NONE: 4
  };
  
  const CURRENT_LEVEL = process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
  
  const createLogger = (prefix) => ({
	debug: (...args) => {
	  if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
		console.log(`[DEBUG] ${prefix}:`, ...args);
	  }
	},
	info: (...args) => {
	  if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
		console.log(`[INFO] ${prefix}:`, ...args);
	  }
	},
	warn: (...args) => {
	  if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
		console.warn(`[WARN] ${prefix}:`, ...args);
	  }
	},
	error: (...args) => {
	  if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
		console.error(`[ERROR] ${prefix}:`, ...args);
	  }
	}
  });
  
  export const logger = createLogger('QuizApp');
  export default logger;
