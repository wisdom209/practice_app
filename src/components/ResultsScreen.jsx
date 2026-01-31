import React from 'react';
import { logger } from '../utils/logger';
import { loadGlobalStats, saveGlobalStats } from '../utils/storage';

const ResultsScreen = ({
  score,
  totalQuestions,
  selectedCategory,
  userAnswers,
  filteredQuizData,
  flaggedQuestions,
  isFlaggedReviewMode,
  onRestart,
  onExportResults
}) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  const timeSpent = userAnswers.reduce((acc, answer) => acc + (answer.timeSpent || 0), 0);
  
  // Update global stats
  const globalStats = loadGlobalStats();
  const updatedStats = {
    totalQuestions: globalStats.totalQuestions + totalQuestions,
    totalCorrect: globalStats.totalCorrect + score,
    totalTime: globalStats.totalTime + timeSpent
  };
  saveGlobalStats(updatedStats);
  
  logger.info(`Quiz completed: ${score}/${totalQuestions} (${percentage}%) in ${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s`);

  const getPerformanceLevel = () => {
    if (percentage >= 80) return { label: 'Excellent! 🌟', color: 'text-green-600' };
    if (percentage >= 60) return { label: 'Good! 👍', color: 'text-blue-600' };
    if (percentage >= 40) return { label: 'Fair 😊', color: 'text-yellow-600' };
    return { label: 'Needs Improvement 📚', color: 'text-red-600' };
  };

  const performance = getPerformanceLevel();

  return (
    <div className="text-center bg-white p-8 rounded-xl shadow-2xl border-t-4 border-indigo-600 space-y-6">
      <h2 className="text-3xl font-extrabold text-gray-800">Quiz Complete! 🎉</h2>
      
      <div className="space-y-2">
        <p className="text-6xl font-black text-indigo-600">
          {score} / {totalQuestions}
        </p>
        <p className={`text-xl font-bold ${performance.color}`}>
          {performance.label}
        </p>
        <p className="text-lg text-gray-600 font-medium">
          You scored <span className="text-indigo-700 font-bold">{percentage}%</span> on the <span className="font-bold">{selectedCategory}</span> quiz
        </p>
        <p className="text-sm text-gray-500">
          Time: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onRestart}
          className="w-full py-3 px-6 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition duration-300 shadow-lg"
        >
          {isFlaggedReviewMode ? 'Resume Main Quiz 🔄' : 'Choose New Category 🔄'}
        </button>
        
        <button
          onClick={onExportResults}
          className="w-full py-3 px-6 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition duration-300 shadow-lg"
        >
          Export Results 📊
        </button>
      </div>

      <div className="text-left pt-6 border-t mt-6 border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Review Your Answers</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {userAnswers.map((answer, index) => {
            const question = filteredQuizData[answer.questionIndex];
            if (!question) return null;
            
            const resultIcon = answer.isCorrect ? '✅' : '❌';
            const resultColor = answer.isCorrect ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400';
            const correctAnswerKey = question.answer;
            const isQFlagged = flaggedQuestions.includes(question.id);
            
            return (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${resultColor} shadow-md relative`}>
                <p className="font-bold text-gray-800 mb-2 flex items-start">
                  <span className="mr-2">{resultIcon}</span>
                  <span>Question {answer.questionIndex + 1}: {question.question}</span>
                  {isQFlagged && <span className="ml-2 text-yellow-800 font-normal text-sm">🚩</span>}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Your Selection:</span> <span className={`${answer.isCorrect ? 'text-green-800' : 'text-red-800'}`}>{answer.selectedKey.toUpperCase()} - {question.options[answer.selectedKey]}</span>
                </p>
                {!answer.isCorrect && (
                  <p className="text-sm text-gray-700 mt-0.5">
                    <span className="font-semibold text-green-700">Correct Answer:</span> {correctAnswerKey.toUpperCase()} - {question.options[correctAnswerKey]}
                  </p>
                )}
                <p className="text-xs italic text-gray-500 mt-2">
                  Explanation: {question.explanation}
                </p>
                {answer.timeSpent > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Time spent: {answer.timeSpent}s
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
