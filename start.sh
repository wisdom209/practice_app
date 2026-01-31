# Stop server
pkill -f "npm\|node" || true

# Clear cache
rm -rf node_modules/.cache .vite

# Fix useQuizData to be static only
cat > src/hooks/useQuizData.js << 'EOF'
import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import msraData from '../data/msra.json';
import otherData from '../data/other.json';

const DATA_MAP = {
  msra: msraData,
  other: otherData
};

const useQuizData = (examBody) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!examBody) {
      setIsLoading(false);
      return;
    }

    logger.info(`Loading STATIC data for: ${examBody}`);
    setIsLoading(true);

    try {
      const localData = DATA_MAP[examBody];
      
      if (!localData) {
        throw new Error(`No data for: ${examBody}`);
      }
      
      if (!Array.isArray(localData)) {
        throw new Error(`Data not array for: ${examBody}`);
      }
      
      logger.info(`✅ Loaded ${localData.length} questions for ${examBody}`);
      setData(localData);
    } catch (error) {
      logger.error(`❌ Failed:`, error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [examBody]);

  return { data, isLoading, error: null };
};

export default useQuizData;
EOF

# Fix App.js - Add "Back to Selection" button
cat > src/App.js << 'EOF'
import React, { useState, useCallback, useEffect } from 'react';
import { logger } from './utils/logger';
import { loadCategoryState, saveCategoryState, loadExamBody, saveScoreSummary, saveExamBody } from './utils/storage';
import { shuffleArray } from './utils/shuffle';
import useQuizData from './hooks/useQuizData';
import ExamBodySelector from './components/ExamBodySelector';
import CategorySelector from './components/CategorySelector';
import QuestionDisplay from './components/QuestionDisplay';
import ResultsScreen from './components/ResultsScreen';

const App = () => {
  const [selectedExamBody, setSelectedExamBody] = useState(() => loadExamBody());
  const { data: QUIZ_DATA, isLoading } = useQuizData(selectedExamBody);
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [isFlaggedReviewMode, setIsFlaggedReviewMode] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // RESET FUNCTION
  const resetToExamSelector = useCallback(() => {
    logger.info('Resetting to exam selector');
    saveExamBody(null); // Clear stored exam body
    setSelectedExamBody(null);
    setSelectedCategory(null);
    setShowResults(false);
    setShuffledQuestions([]);
    setUserAnswers([]);
    setFlaggedQuestions([]);
  }, []);

  const currentQuestion = shuffledQuestions[currentQuestionIndex] || {};
  const totalQuestions = shuffledQuestions.length;
  const currentAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);

  const handleSelectExamBody = useCallback((examBody) => {
    logger.info(`Exam body selected: ${examBody}`);
    saveExamBody(examBody);
    setSelectedExamBody(examBody);
    setSelectedCategory(null);
    setShowResults(false);
  }, []);

  const startNewQuiz = useCallback((category) => {
    logger.info(`Starting new quiz for category: ${category}`);
    const questionsForCategory = QUIZ_DATA.filter(q => q.category === category);
    const randomizedQuestions = shuffleArray(questionsForCategory.map(q => ({...q})));
    
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowResults(false);
    setUserAnswers([]);
    setFlaggedQuestions([]);
    setSelectedCategory(category);
    setShuffledQuestions(randomizedQuestions);
    setIsFlaggedReviewMode(false);
    setQuestionStartTime(Date.now());
    
    saveCategoryState(category, {
      currentQuestionIndex: 0,
      userAnswers: [],
      flaggedQuestions: [],
      shuffledQuestions: randomizedQuestions,
      lastScore: null,
      lastTotal: randomizedQuestions.length,
      lastAttempted: new Date().toISOString(),
      timeSpent: 0
    });
  }, [QUIZ_DATA]);

  const continueQuiz = useCallback((category) => {
    logger.info(`Continuing quiz for category: ${category}`);
    const savedState = loadCategoryState(category);
    
    if (!savedState.shuffledQuestions?.length || typeof savedState.currentQuestionIndex !== 'number') {
      logger.warn('Invalid saved state, starting fresh quiz');
      startNewQuiz(category);
      return;
    }
    
    const restoredQuestions = savedState.shuffledQuestions.map(q => ({...q}));
    const calculatedScore = (savedState.userAnswers || []).filter(a => a.isCorrect).length;
    
    setCurrentQuestionIndex(savedState.currentQuestionIndex);
    setUserAnswers(savedState.userAnswers || []);
    setFlaggedQuestions(savedState.flaggedQuestions || []);
    setShuffledQuestions(restoredQuestions);
    setScore(calculatedScore);
    setSelectedCategory(category);
    setIsFlaggedReviewMode(false);
    setShowResults(false);
    setQuestionStartTime(Date.now());
  }, [startNewQuiz]);

  const startFlaggedQuiz = useCallback((category) => {
    logger.info(`Starting flagged review for category: ${category}`);
    const savedState = loadCategoryState(category);
    const flaggedIds = savedState.flaggedQuestions || [];
    
    if (flaggedIds.length === 0) {
      alert("No flagged questions found for this category.");
      return;
    }
    
    const questionsForCategory = QUIZ_DATA.filter(q => q.category === category);
    const flaggedOnlyQuestions = questionsForCategory.filter(q => flaggedIds.includes(q.id));
    
    if (flaggedOnlyQuestions.length === 0) {
      alert("Your flagged questions appear to be outdated. Please flag questions again.");
      return;
    }
    
    const randomizedFlaggedQuestions = shuffleArray(flaggedOnlyQuestions.map(q => ({...q})));
    
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowResults(false);
    setUserAnswers([]);
    setFlaggedQuestions(flaggedIds);
    setSelectedCategory(category);
    setShuffledQuestions(randomizedFlaggedQuestions);
    setIsFlaggedReviewMode(true);
    setQuestionStartTime(Date.now());
  }, [QUIZ_DATA]);

  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < totalQuestions) {
      logger.debug(`Navigating to question ${index + 1}`);
      setCurrentQuestionIndex(index);
    }
  }, [totalQuestions]);

  const handleNextClick = useCallback(() => {
    goToQuestion(currentQuestionIndex + 1);
  }, [currentQuestionIndex, goToQuestion]);

  const handleBackClick = useCallback(() => {
    goToQuestion(currentQuestionIndex - 1);
  }, [currentQuestionIndex, goToQuestion]);

  const handleAnswerClick = useCallback((selectedKey) => {
    if (currentAnswer || !currentQuestion.answer) return;
    
    const isCorrect = selectedKey === currentQuestion.answer;
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    
    logger.info(`Answered Q${currentQuestionIndex + 1}: ${selectedKey} - ${isCorrect ? 'Correct' : 'Incorrect'}`);
    
    if (isCorrect) {
      setScore(prevScore => prevScore + 1);
    }
    
    setUserAnswers(prevAnswers => [...prevAnswers, {
      questionIndex: currentQuestionIndex,
      selectedKey: selectedKey,
      isCorrect: isCorrect,
      explanation: currentQuestion.explanation,
      timeSpent: timeSpent
    }]);
    
    setQuestionStartTime(Date.now());
  }, [currentAnswer, currentQuestion, currentQuestionIndex, questionStartTime]);

  const handleFlagQuestion = useCallback(() => {
    if (!currentQuestion?.id) return;
    
    setFlaggedQuestions(prevFlags => {
      const isCurrentlyFlagged = prevFlags.includes(currentQuestion.id);
      const newFlags = isCurrentlyFlagged
        ? prevFlags.filter(id => id !== currentQuestion.id)
        : [...prevFlags, currentQuestion.id];
      
      logger.info(`${isCurrentlyFlagged ? 'Unflagged' : 'Flagged'} question: ${currentQuestion.id}`);
      return newFlags;
    });
  }, [currentQuestion]);

  const handleSubmitQuiz = useCallback(() => {
    const finalScore = userAnswers.filter(a => a.isCorrect).length;
    const totalTime = userAnswers.reduce((acc, a) => acc + (a.timeSpent || 0), 0);
    
    logger.info(`Quiz submitted: ${finalScore}/${totalQuestions} (${Math.round((finalScore/totalQuestions)*100)}%) in ${Math.floor(totalTime/60)}m ${totalTime%60}s`);
    
    setScore(finalScore);
    saveScoreSummary(selectedCategory, finalScore, totalQuestions, totalTime);
    setShowResults(true);
    
    if (isFlaggedReviewMode) {
      setIsFlaggedReviewMode(false);
    }
  }, [userAnswers, totalQuestions, selectedCategory, isFlaggedReviewMode]);

  const restartQuiz = useCallback(() => {
    logger.info('Restarting quiz app');
    if (isFlaggedReviewMode && selectedCategory) {
      continueQuiz(selectedCategory);
      return;
    }
    
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowResults(false);
    setUserAnswers([]);
    setFlaggedQuestions([]);
    setSelectedCategory(null);
    setShuffledQuestions([]);
    setIsFlaggedReviewMode(false);
  }, [isFlaggedReviewMode, selectedCategory, continueQuiz]);

  const handleExportResults = useCallback(() => {
    const results = {
      category: selectedCategory,
      examBody: selectedExamBody,
      score: score,
      total: totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      date: new Date().toISOString(),
      answers: userAnswers.map(a => {
        const q = shuffledQuestions[a.questionIndex];
        return {
          question: q.question,
          category: q.category,
          yourAnswer: `${a.selectedKey.toUpperCase()} - ${q.options[a.selectedKey]}`,
          correctAnswer: `${q.answer.toUpperCase()} - ${q.options[q.answer]}`,
          isCorrect: a.isCorrect,
          explanation: q.explanation,
          timeSpent: a.timeSpent
        };
      })
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-results-${selectedCategory}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    logger.info('Exported quiz results');
  }, [selectedCategory, selectedExamBody, score, totalQuestions, userAnswers, shuffledQuestions]);

  useEffect(() => {
    if (selectedCategory && !showResults && !isFlaggedReviewMode && shuffledQuestions.length > 0) {
      saveCategoryState(selectedCategory, {
        currentQuestionIndex,
        userAnswers,
        flaggedQuestions,
        shuffledQuestions: shuffledQuestions.map(q => ({...q})),
        lastScore: score,
        lastTotal: totalQuestions,
        lastAttempted: new Date().toISOString()
      });
    }
  }, [selectedCategory, currentQuestionIndex, userAnswers, flaggedQuestions, shuffledQuestions, score, totalQuestions, showResults, isFlaggedReviewMode]);

  // BACK BUTTON LOGIC
  const showBackButton = selectedExamBody || selectedCategory;

  const renderContent = () => {
    if (!selectedExamBody) {
      return <ExamBodySelector onSelectExamBody={handleSelectExamBody} />;
    }

    if (isLoading) {
      return (
        <div className="text-center p-8 bg-indigo-100 rounded-xl shadow-lg border-l-4 border-indigo-500">
          <div className="animate-spin inline-block w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full mr-3"></div>
          <p className="text-indigo-800 font-semibold">Loading quiz data...</p>
        </div>
      );
    }

    if (showResults) {
      return (
        <ResultsScreen
          score={score}
          totalQuestions={totalQuestions}
          selectedCategory={selectedCategory}
          userAnswers={userAnswers}
          filteredQuizData={shuffledQuestions}
          flaggedQuestions={flaggedQuestions}
          isFlaggedReviewMode={isFlaggedReviewMode}
          onRestart={restartQuiz}
          onExportResults={handleExportResults}
        />
      );
    }

    if (selectedCategory && shuffledQuestions.length > 0) {
      return (
        <QuestionDisplay
          currentQuestion={currentQuestion}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={totalQuestions}
          currentAnswer={currentAnswer}
          userAnswers={userAnswers}
          flaggedQuestions={flaggedQuestions}
          onAnswerClick={handleAnswerClick}
          onBackClick={handleBackClick}
          onNextClick={handleNextClick}
          onSubmitQuiz={handleSubmitQuiz}
          onFlagQuestion={handleFlagQuestion}
        />
      );
    }

    return (
      <CategorySelector
        quizData={QUIZ_DATA}
        onStartNewQuiz={startNewQuiz}
        onContinueQuiz={continueQuiz}
        onStartFlaggedQuiz={startFlaggedQuiz}
      />
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen flex p-1 sm:p-2 font-['Inter'] justify-center">
      <div className="w-full max-w-lg lg:max-w-5xl">
        {/* BACK BUTTON */}
        {showBackButton && (
          <button
            onClick={resetToExamSelector}
            className="mb-4 w-full py-2 px-4 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition duration-200 shadow-md"
          >
            ← Back to Exam Selection
          </button>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
EOF

# Clear localStorage and cache
echo "=== CLEARING LOCALSTORAGE ==="
node -e "
const fs = require('fs');
const path = require('path');

// Find all quiz storage keys
const storageKeys = Object.keys(localStorage).filter(key => 
  key.startsWith('quiz_') || key === 'selected_exam_body'
);

console.log('Found these storage keys to clear:');
storageKeys.forEach(key => {
  console.log(' - ' + key);
  localStorage.removeItem(key);
});

console.log('\\n✅ Cleared ' + storageKeys.length + ' storage keys');
"

# Clear browser instructions
cat > README_RESET.md << 'EOF'
# RESET INSTRUCTIONS

## 1. Clear Browser Data
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage" button (bottom right)
4. Refresh the page

## 2. Hard Refresh
Press: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

## 3. Alternative
Open in Incognito/Private mode
EOF

echo "=== DONE! ==="
echo "Now run: npm start"
echo "Then hard refresh your browser: Ctrl+Shift+R"
