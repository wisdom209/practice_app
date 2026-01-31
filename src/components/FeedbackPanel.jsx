import React from 'react';
import { logger } from '../utils/logger';

const FeedbackPanel = ({
  currentQuestionIndex,
  totalQuestions,
  currentFeedback,
  handleBackClick,
  handleNextClick,
  handleSubmitQuiz,
  handleFlagQuestion,
  isFlagged,
  currentAnswer,
  timeSpent
}) => {
  logger.debug('Rendering FeedbackPanel', { currentQuestionIndex, isFlagged, hasAnswer: !!currentAnswer });
  
  const showNavButtons = !currentAnswer || (currentFeedback && currentAnswer);
  const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="mt-6 lg:mt-0 lg:p-4 lg:bg-white lg:rounded-xl lg:shadow-md lg:h-fit lg:sticky lg:top-4">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        {timeSpent > 0 && (
          <p className="text-xs text-gray-500 mt-1">Time: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</p>
        )}
      </div>

      {currentFeedback && (
        <div className={`p-4 rounded-xl shadow-inner ${currentFeedback.isCorrect ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'} border-l-4 mb-4`}>
          <h3 className={`font-bold ${currentFeedback.isCorrect ? 'text-green-800' : 'text-red-800'} mb-2`}>
            {currentFeedback.isCorrect ? 'Correct! 🎉' : 'Incorrect. 😟'}
          </h3>
          <p className="text-gray-700 text-sm">{currentFeedback.explanation}</p>
        </div>
      )}
      
      {showNavButtons && (
        <>
          <button
            onClick={handleFlagQuestion}
            className={`w-full mb-3 py-2 px-4 rounded-xl transition duration-200 font-bold ${isFlagged ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            {isFlagged ? '🚩 Unflag Question' : '🏳️ Flag for Review'}
          </button>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleBackClick}
              disabled={currentQuestionIndex === 0}
              className={`py-2 px-4 font-bold rounded-xl transition duration-300 ${currentQuestionIndex === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
            >
              ← Back
            </button>
            <button
              onClick={handleNextClick}
              disabled={currentQuestionIndex === totalQuestions - 1}
              className={`py-2 px-4 font-bold rounded-xl transition duration-300 ${currentQuestionIndex === totalQuestions - 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
            >
              Next →
            </button>
            <button
              onClick={handleSubmitQuiz}
              className="py-2 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition duration-300 shadow-lg transform hover:scale-[1.01]"
            >
              Submit
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Use ←/→ to navigate. Use ↑/↓/Enter for options.
          </p>
        </>
      )}
    </div>
  );
};

export default React.memo(FeedbackPanel);
