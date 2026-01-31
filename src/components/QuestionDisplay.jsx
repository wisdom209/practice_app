import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import FeedbackPanel from './FeedbackPanel';

const QuestionDisplay = ({
  currentQuestion,
  currentQuestionIndex,
  totalQuestions,
  currentAnswer,
  userAnswers,
  flaggedQuestions,
  onAnswerClick,
  onBackClick,
  onNextClick,
  onSubmitQuiz,
  onFlagQuestion,
  isMultipleAnswerQuestion,
  currentMultipleSelections,
  submitMultipleAnswer
}) => {
  const [focusedOptionKey, setFocusedOptionKey] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    // Reset timer when question changes
    setQuestionStartTime(Date.now());
    setTimeSpent(0);
  }, [currentQuestionIndex]);

  useEffect(() => {
    // Update timer every second
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - questionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [questionStartTime]);

  useEffect(() => {
    // Initialize focused option
    if (currentQuestion?.options) {
      const keys = Object.keys(currentQuestion.options);
      setFocusedOptionKey(keys[0]);
    }
  }, [currentQuestionIndex, currentQuestion]);

  const handleKeyDown = useCallback((event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onBackClick();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onNextClick();
    }

    if (!currentAnswer && currentQuestion?.options) {
      const optionKeys = Object.keys(currentQuestion.options);
      const currentIndex = optionKeys.indexOf(focusedOptionKey);
      
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const newIndex = currentIndex > 0 ? currentIndex - 1 : optionKeys.length - 1;
        setFocusedOptionKey(optionKeys[newIndex]);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const newIndex = currentIndex < optionKeys.length - 1 ? currentIndex + 1 : 0;
        setFocusedOptionKey(optionKeys[newIndex]);
      } else if (event.key === 'Enter' && focusedOptionKey) {
        event.preventDefault();
        onAnswerClick(focusedOptionKey);
      }
    }
  }, [currentAnswer, focusedOptionKey, onAnswerClick, onBackClick, onNextClick, currentQuestion]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!currentQuestion?.question) {
    logger.error('Question data is missing or corrupted');
    return (
      <div className="text-center p-8 bg-red-100 border-red-400 border rounded-xl text-red-800 font-semibold">
        Error: Question data is missing or corrupted.
        <button
          onClick={() => window.location.reload()}
          className="mt-4 w-full py-2 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition duration-300"
        >
          Reload Page
        </button>
      </div>
    );
  }

  const optionKeys = Object.keys(currentQuestion.options);
  const isFlagged = currentQuestion.id ? flaggedQuestions.includes(currentQuestion.id) : false;
  
  // Determine the selected key based on whether it's a multiple answer question
  let selectedKeyForFeedback;
  if (isMultipleAnswerQuestion && currentMultipleSelections && Array.isArray(currentMultipleSelections[currentQuestionIndex])) {
    // For multiple answer questions, use the current selections
    selectedKeyForFeedback = currentMultipleSelections[currentQuestionIndex];
  } else {
    // For single answer questions, use the regular current answer
    selectedKeyForFeedback = currentAnswer ? currentAnswer.selectedKey : null;
  }
  
  const currentFeedback = currentAnswer ? {
    isCorrect: currentAnswer.isCorrect,
    explanation: currentAnswer.isCorrect ? currentQuestion.explanation : currentAnswer.explanation,
    selectedKey: Array.isArray(currentAnswer.selectedKey) ? currentAnswer.selectedKey : currentAnswer.selectedKey,
  } : null;

  return (
    <div className="lg:flex lg:space-x-8">
      <div className="space-y-6 flex-1 lg:max-w-xl">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500">
          <p className="text-sm font-medium text-indigo-600 mb-2">
            {currentQuestion.category} (Question {currentQuestionIndex + 1} of {totalQuestions})
          </p>
          <h6 className="text-sm sm:text-sm font-bold text-gray-800">
            {currentQuestion.question}
          </h6>
          {currentQuestion.originalQuestionNo && (
            <p className="text-xs text-gray-500 mt-2">Ref: {currentQuestion.originalQuestionNo}</p>
          )}
        </div>

        <div className="grid gap-4">
          {Object.entries(currentQuestion.options).map(([key, text]) => {
            // Check if the option is selected (for single or multiple answers)
            let isSelected = false;
            if (currentFeedback) {
              if (Array.isArray(currentFeedback.selectedKey)) {
                isSelected = currentFeedback.selectedKey.includes(key);
              } else {
                isSelected = currentFeedback.selectedKey === key;
              }
            } else if (isMultipleAnswerQuestion && selectedKeyForFeedback && Array.isArray(selectedKeyForFeedback)) {
              // During selection phase for multiple answer questions
              isSelected = selectedKeyForFeedback.includes(key);
            } else {
              isSelected = selectedKeyForFeedback === key;
            }
            
            // Check if the option is correct (for single or multiple correct answers)
            let isCorrectAnswer = false;
            if (Array.isArray(currentQuestion.answer)) {
              isCorrectAnswer = currentQuestion.answer.includes(key);
            } else {
              isCorrectAnswer = currentQuestion.answer === key;
            }
            
            const isFocused = !currentFeedback && key === focusedOptionKey;
            
            let buttonClasses = "p-4 rounded-xl text-left border-2 transition duration-200 shadow-md";
            
            if (isFocused) {
              buttonClasses += " ring-4 ring-indigo-300 transform scale-[1.01] border-indigo-600";
            }
            
            if (currentFeedback) {
              if (isSelected) {
                buttonClasses += currentFeedback.isCorrect
                  ? " bg-green-100 border-green-500 text-green-800 ring-2 ring-green-500"
                  : " bg-red-100 border-red-500 text-red-800 ring-2 ring-red-500";
              } else if (isCorrectAnswer) {
                buttonClasses += " bg-green-50 border-green-300 text-gray-700";
              } else {
                buttonClasses += " bg-gray-50 border-gray-200 text-gray-500 opacity-70 cursor-default";
              }
            } else {
              if (!isFocused) {
                buttonClasses += " bg-white border-gray-300 hover:bg-indigo-50 hover:border-indigo-500 text-gray-700 cursor-pointer";
              } else {
                buttonClasses += " bg-white text-gray-700 cursor-pointer";
              }
            }
            
            return (
              <button
                key={key}
                className={buttonClasses}
                onClick={() => onAnswerClick(key)}
                disabled={!!currentAnswer}
                aria-label={`Option ${key}`}
              >
                <span className="uppercase text-sm mr-2 text-indigo-500 font-bold">{key}:</span>
                <span className="font-semibold">{text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:w-80">
        <FeedbackPanel
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={totalQuestions}
          currentFeedback={currentFeedback}
          handleBackClick={onBackClick}
          handleNextClick={onNextClick}
          handleSubmitQuiz={onSubmitQuiz}
          handleFlagQuestion={onFlagQuestion}
          isFlagged={isFlagged}
          currentAnswer={currentAnswer}
          timeSpent={timeSpent}
        />
      </div>
    </div>
  );
};

export default QuestionDisplay;
