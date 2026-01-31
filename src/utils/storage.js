import { logger } from './logger';

const STORAGE_KEYS = {
  CATEGORY_STATE: 'quiz_data_',
  SCORE_SUMMARY: 'quiz_score_',
  EXAM_BODY: 'selected_exam_body',
  GLOBAL_STATS: 'quiz_global_stats'
};

export const loadCategoryState = (category) => {
  try {
    const storedData = localStorage.getItem(`${STORAGE_KEYS.CATEGORY_STATE}${category}`);
    if (storedData) {
      logger.debug(`Loaded state for category: ${category}`);
      return JSON.parse(storedData);
    }
  } catch (e) {
    logger.error(`Error loading state for ${category}:`, e);
  }
  return {
    currentQuestionIndex: 0,
    userAnswers: [],
    flaggedQuestions: [],
    shuffledQuestions: [],
    lastScore: null,
    lastTotal: null,
    lastAttempted: null,
    timeSpent: 0
  };
};

export const saveCategoryState = (category, state) => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.CATEGORY_STATE}${category}`, JSON.stringify(state));
    logger.debug(`Saved state for category: ${category}`, { questionIndex: state.currentQuestionIndex });
  } catch (e) {
    logger.error(`Error saving state for ${category}:`, e);
  }
};

export const resetCategoryState = (category) => {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.CATEGORY_STATE}${category}`);
    localStorage.removeItem(`${STORAGE_KEYS.SCORE_SUMMARY}${category}`);
    logger.info(`Reset category: ${category}`);
  } catch (e) {
    logger.error(`Error resetting category ${category}:`, e);
  }
};

export const loadScoreSummary = (category) => {
  try {
    const storedScore = localStorage.getItem(`${STORAGE_KEYS.SCORE_SUMMARY}${category}`);
    return storedScore ? JSON.parse(storedScore) : null;
  } catch (e) {
    logger.error(`Error loading score summary for ${category}:`, e);
    return null;
  }
};

export const saveScoreSummary = (category, score, total, timeSpent = 0) => {
  try {
    const summary = {
      score,
      total,
      percentage: Math.round((score / total) * 100),
      attemptedDate: new Date().toISOString(),
      timeSpent
    };
    localStorage.setItem(`${STORAGE_KEYS.SCORE_SUMMARY}${category}`, JSON.stringify(summary));
    logger.info(`Saved score for ${category}: ${score}/${total} (${summary.percentage}%)`);
  } catch (e) {
    logger.error(`Error saving score summary:`, e);
  }
};

export const loadExamBody = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.EXAM_BODY);
  } catch (e) {
    logger.error('Error loading exam body:', e);
    return null;
  }
};

export const saveExamBody = (examBody) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXAM_BODY, examBody);
    logger.info(`Saved exam body: ${examBody}`);
  } catch (e) {
    logger.error('Error saving exam body:', e);
  }
};

export const loadGlobalStats = () => {
  try {
    const stats = localStorage.getItem(STORAGE_KEYS.GLOBAL_STATS);
    return stats ? JSON.parse(stats) : { totalQuestions: 0, totalCorrect: 0, totalTime: 0 };
  } catch (e) {
    logger.error('Error loading global stats:', e);
    return { totalQuestions: 0, totalCorrect: 0, totalTime: 0 };
  }
};

export const saveGlobalStats = (stats) => {
  try {
    localStorage.setItem(STORAGE_KEYS.GLOBAL_STATS, JSON.stringify(stats));
    logger.debug('Saved global stats:', stats);
  } catch (e) {
    logger.error('Error saving global stats:', e);
  }
};
