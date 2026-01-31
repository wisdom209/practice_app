import React, { useMemo } from 'react';
import { logger } from '../utils/logger';
import { loadCategoryState, loadScoreSummary, resetCategoryState } from '../utils/storage';

const CategorySelector = ({ quizData, onStartNewQuiz, onContinueQuiz, onStartFlaggedQuiz }) => {
  logger.info('Rendering CategorySelector', { totalQuestions: quizData.length });
  
  const categories = useMemo(() => {
    const unique = [...new Set(quizData.map(q => q.category))];
    return unique.sort();
  }, [quizData]);

  if (categories.length === 0) {
    return (
      <div className="text-center p-6 bg-yellow-100 border-yellow-400 border rounded-lg text-yellow-800">
        No quiz categories available. Please check your data source.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Choose Your Quiz Category 🚀
        </h2>
        <p className="text-gray-600">
          Select a topic to begin your practice session
        </p>
      </div>
      
      <div className="grid gap-4">
        {categories.map((category) => {
          const allCategoryQuestions = quizData.filter(q => q.category === category);
          const totalQs = allCategoryQuestions.length;
          const savedState = loadCategoryState(category);
          const scoreSummary = loadScoreSummary(category);
          
          const isProgress = savedState.shuffledQuestions.length > 0 && 
                            (savedState.currentQuestionIndex > 0 || savedState.userAnswers.length > 0);
          const progressText = isProgress ? ` - Stopped at Q${savedState.currentQuestionIndex + 1}` : '';
          
          const flaggedQIds = savedState.flaggedQuestions || [];
          const flaggedCount = allCategoryQuestions.filter(q => flaggedQIds.includes(q.id)).length;
          const hasFlagged = flaggedCount > 0;

          return (
            <div key={category} className="p-4 rounded-xl border-2 border-indigo-300 bg-indigo-50 shadow-md">
              <h3 className="text-xl font-bold text-indigo-800 mb-2">{category}</h3>
              <p className="text-sm text-indigo-600 mb-3">{totalQs} questions{progressText}</p>
              
              {scoreSummary && (
                <div className="text-xs p-2 mb-3 bg-white rounded border border-gray-200">
                  <p className="font-semibold text-gray-700">
                    Last Score: {scoreSummary.score} / {scoreSummary.total} ({scoreSummary.percentage}%)
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    Attempted: {new Date(scoreSummary.attemptedDate).toLocaleString()}
                  </p>
                  {scoreSummary.timeSpent > 0 && (
                    <p className="text-gray-500">
                      Time: {Math.floor(scoreSummary.timeSpent / 60)}m {scoreSummary.timeSpent % 60}s
                    </p>
                  )}
                </div>
              )}
              
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onStartNewQuiz(category)}
                    className="py-2 px-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition duration-200"
                  >
                    Start New Quiz
                  </button>
                  <button
                    onClick={() => onContinueQuiz(category)}
                    disabled={!isProgress}
                    className={`py-2 px-4 font-bold rounded-lg transition duration-200 ${
                      isProgress ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Continue
                  </button>
                </div>
                
                <button
                  onClick={() => onStartFlaggedQuiz(category)}
                  disabled={!hasFlagged}
                  className={`w-full py-2 px-4 font-bold rounded-lg transition duration-200 ${
                    hasFlagged ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Review Flagged ({flaggedCount})
                </button>
                
                <button
                  onClick={() => {
                    if (window.confirm(`Reset all progress for ${category}?`)) {
                      resetCategoryState(category);
                      onStartNewQuiz(category);
                    }
                  }}
                  className="mt-1 py-1 px-4 bg-red-100 text-red-600 border border-red-300 rounded-lg text-sm hover:bg-red-200 transition duration-200"
                >
                  Reset Category History 🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategorySelector;
