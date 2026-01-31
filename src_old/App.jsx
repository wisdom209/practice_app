import React, { useState, useCallback, useMemo, useEffect } from 'react';
import localData from './data.json';

// --- PERSISTENCE UTILITIES ---
const loadCategoryState = (category) => {
    try {
        const storedData = localStorage.getItem(`quiz_data_${category}`);
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (e) {
        console.error("Error loading state from localStorage:", e);
    }
    return {
        currentQuestionIndex: 0,
        userAnswers: [],
        flaggedQuestions: [],
        shuffledQuestions: [],
        lastScore: null,
        lastTotal: null,
        lastAttempted: null,
    };
};

const saveCategoryState = (category, state) => {
    try {
        localStorage.setItem(`quiz_data_${category}`, JSON.stringify(state));
    } catch (e) {
        console.error("Error saving state to localStorage:", e);
    }
};

const resetCategoryState = (category) => {
    try {
        localStorage.removeItem(`quiz_data_${category}`);
        localStorage.removeItem(`quiz_score_${category}`);
    } catch (e) {
        console.error("Error resetting state in localStorage:", e);
    }
};

const loadScoreSummary = (category) => {
    try {
        const storedScore = localStorage.getItem(`quiz_score_${category}`);
        return storedScore ? JSON.parse(storedScore) : null;
    } catch (e) {
        console.error("Error loading score summary:", e);
        return null;
    }
};

const saveScoreSummary = (category, score, total) => {
    try {
        const summary = {
            score,
            total,
            attemptedDate: new Date().toLocaleString(),
        };
        localStorage.setItem(`quiz_score_${category}`, JSON.stringify(summary));
    } catch (e) {
        console.error("Error saving score summary:", e);
    }
};

// --- Feedback Panel Component ---
const FeedbackPanel = React.memo(({
    currentQuestionIndex,
    totalQuestions,
    currentFeedback,
    handleBackClick,
    handleNextClick,
    handleSubmitQuiz,
    handleFlagQuestion,
    isFlagged,
    currentAnswer
}) => {
    const showNavButtons = !currentAnswer || (currentFeedback && currentAnswer);
    return (
        <div className="mt-6 lg:mt-0 lg:p-4 lg:bg-white lg:rounded-xl lg:shadow-md lg:h-fit lg:sticky lg:top-4">
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
                            {'<- Back'}
                        </button>
                        <button
                            onClick={handleNextClick}
                            disabled={currentQuestionIndex === totalQuestions - 1}
                            className={`py-2 px-4 font-bold rounded-xl transition duration-300 ${currentQuestionIndex === totalQuestions - 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                        >
                            {'Next ->'}
                        </button>
                        <button
                            onClick={handleSubmitQuiz}
                            className="py-2 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition duration-300 shadow-lg transform hover:scale-[1.01]"
                        >
                            Submit
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Use $\leftarrow$/$\rightarrow$ to navigate. Use $\uparrow$/$\downarrow$/Enter for options.</p>
                </>
            )}
        </div>
    );
});

// --- MAIN COMPONENT ---
const App = () => {
    const API_URL = 'http://localhost:3001/api/quizzes';
    const [QUIZ_DATA, setQuizzes] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const [userAnswers, setUserAnswers] = useState([]);
    const [flaggedQuestions, setFlaggedQuestions] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFlaggedReviewMode, setIsFlaggedReviewMode] = useState(false);
    const [focusedOptionKey, setFocusedOptionKey] = useState(null);

    const categories = useMemo(() => {
        if (isLoading || error || QUIZ_DATA.length === 0) return [];
        const unique = new Set(QUIZ_DATA.map(q => q.category));
        return Array.from(unique);
    }, [QUIZ_DATA, isLoading, error]);

    const filteredQuizData = useMemo(() => {
        return shuffledQuestions;
    }, [shuffledQuestions]);

    const currentQuestion = filteredQuizData[currentQuestionIndex] || {};
    const totalQuestions = filteredQuizData.length;

    const optionKeys = useMemo(() => {
        if (currentQuestion.options) {
            return Object.keys(currentQuestion.options);
        }
        return [];
    }, [currentQuestion]);

    const currentAnswer = useMemo(() => {
        return userAnswers.find(a => a.questionIndex === currentQuestionIndex);
    }, [userAnswers, currentQuestionIndex]);

    // const currentFeedback = currentAnswer ? {
    //     isCorrect: currentAnswer.isCorrect,
    //     explanation: currentAnswer.isCorrect ? currentQuestion.explanation : currentAnswer.explanation,
    //     selectedKey: currentAnswer.selectedKey,
    // } : feedback;

	const currentFeedback = useMemo(() => {
		if (currentAnswer) {
			return {
				isCorrect: currentAnswer.isCorrect,
				explanation: currentAnswer.isCorrect ? currentQuestion.explanation : currentAnswer.explanation,
				selectedKey: currentAnswer.selectedKey,
			};
		}
		return feedback;
	}, [currentAnswer, currentQuestion.explanation, feedback]);

    const isFlagged = currentQuestion && currentQuestion.id
        ? flaggedQuestions.includes(currentQuestion.id)
        : false;

    // --- HANDLERS ---
    const startNewQuiz = useCallback((category) => {
        const questionsForCategory = QUIZ_DATA.filter(q => q.category === category);
        
        // Create a deep copy and shuffle
        const randomizedQuestions = [...questionsForCategory]
            .map(q => ({...q}))
            .sort(() => Math.random() - 0.5);
        
        const savedState = loadCategoryState(category);
        
        // Reset all state variables
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowResults(false);
        setUserAnswers([]);
        setFeedback(null);
        
        // Preserve flagged questions from history
        setFlaggedQuestions(savedState.flaggedQuestions || []);
        
        setSelectedCategory(category);
        setShuffledQuestions(randomizedQuestions);
        setIsFlaggedReviewMode(false);
        
        // Save initial state with the shuffled order
        saveCategoryState(category, {
            currentQuestionIndex: 0,
            userAnswers: [],
            flaggedQuestions: savedState.flaggedQuestions || [],
            shuffledQuestions: randomizedQuestions,
            lastScore: null,
            lastTotal: randomizedQuestions.length,
            lastAttempted: new Date().toISOString()
        });
    }, [QUIZ_DATA]);

    const continueQuiz = useCallback((category) => {
        const savedState = loadCategoryState(category);
        
        // Comprehensive validation - prioritize having questions and index
        const hasQuestions = savedState.shuffledQuestions && savedState.shuffledQuestions.length > 0;
        const hasIndex = typeof savedState.currentQuestionIndex === 'number';
        
        if (!hasQuestions || !hasIndex) {
            console.warn("Saved state is invalid or incomplete. Starting fresh quiz.");
            startNewQuiz(category);
            return;
        }
        
        // Create deep copies to avoid reference issues
        const restoredQuestions = savedState.shuffledQuestions.map(q => ({...q}));

        // Recalculate score from answers
        const calculatedScore = (savedState.userAnswers || []).filter(a => a.isCorrect).length;
        
        // Apply all state changes at once without intermediate reset
        setCurrentQuestionIndex(savedState.currentQuestionIndex);
        setUserAnswers(savedState.userAnswers || []);
        setFlaggedQuestions(savedState.flaggedQuestions || []);
        setShuffledQuestions(restoredQuestions);
        setScore(calculatedScore);
        setSelectedCategory(category);
        setIsFlaggedReviewMode(false);
        setShowResults(false);
        
        // Restore feedback for the current question if it was already answered
        const currentAnswer = (savedState.userAnswers || []).find(a => 
            a.questionIndex === savedState.currentQuestionIndex
        );
        
        if (currentAnswer) {
            const currentQ = restoredQuestions[savedState.currentQuestionIndex];
            if (currentQ) {
                setFeedback({
                    isCorrect: currentAnswer.isCorrect,
                    explanation: currentAnswer.isCorrect ? 
                        currentQ.explanation : 
                        currentAnswer.explanation,
                    selectedKey: currentAnswer.selectedKey
                });
            }
        } else {
            setFeedback(null);
        }
    }, [startNewQuiz]);

    const goToQuestion = useCallback((index) => {
        if (index >= 0 && index < totalQuestions) {
            setCurrentQuestionIndex(index);
            setFeedback(null);
        }
    }, [totalQuestions]);

    const handleNextClick = useCallback(() => {
        if (currentQuestionIndex < totalQuestions - 1) {
            goToQuestion(currentQuestionIndex + 1);
        }
    }, [currentQuestionIndex, goToQuestion, totalQuestions]);

    const handleBackClick = useCallback(() => {
        if (currentQuestionIndex > 0) {
            goToQuestion(currentQuestionIndex - 1);
        }
    }, [currentQuestionIndex, goToQuestion]);

    const handleAnswerClick = useCallback((selectedKey) => {
        if (currentAnswer || !currentQuestion.answer) return;
        
        const isCorrect = selectedKey === currentQuestion.answer;
        const explanation = currentQuestion.explanation;
        
        if (isCorrect) {
            setScore(prevScore => prevScore + 1);
        }
        
        setUserAnswers(prevAnswers => {
            const newAnswer = {
                questionIndex: currentQuestionIndex,
                selectedKey: selectedKey,
                isCorrect: isCorrect,
                explanation: explanation,
            };
            return [...prevAnswers, newAnswer];
        });
        
        setFeedback({ isCorrect, explanation, selectedKey });
        setFocusedOptionKey(null);
    }, [currentQuestion, currentQuestionIndex, currentAnswer]);

    const handleSubmitQuiz = useCallback(() => {
        const finalScore = userAnswers.filter(a => a.isCorrect).length;
        setScore(finalScore);
        saveScoreSummary(selectedCategory, finalScore, totalQuestions);
        setShowResults(true);
        
        if (isFlaggedReviewMode) {
            setIsFlaggedReviewMode(false);
        }
    }, [selectedCategory, userAnswers, totalQuestions, isFlaggedReviewMode]);

    // FIXED FLAG HANDLER - Simplified to avoid race conditions
    const handleFlagQuestion = useCallback(() => {
        if (!currentQuestion?.id) return;
        
        setFlaggedQuestions(prevFlags => {
            const questionId = currentQuestion.id;
            return prevFlags.includes(questionId)
                ? prevFlags.filter(id => id !== questionId)
                : [...prevFlags, questionId];
        });
    }, [currentQuestion]);

    const saveCurrentQuizState = useCallback(() => {
        if (selectedCategory && !showResults && !isFlaggedReviewMode && shuffledQuestions.length > 0) {
            const stateToSave = {
                currentQuestionIndex,
                userAnswers,
                flaggedQuestions,
                shuffledQuestions: shuffledQuestions.map(q => ({...q})),
                lastScore: score,
                lastTotal: totalQuestions,
                lastAttempted: new Date().toISOString()
            };
            
            saveCategoryState(selectedCategory, stateToSave);
        }
    }, [selectedCategory, currentQuestionIndex, userAnswers, flaggedQuestions, showResults, isFlaggedReviewMode, shuffledQuestions, score, totalQuestions]);

    const startFlaggedQuiz = useCallback((category) => {
        saveCurrentQuizState();
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
        
        // Create deep copies and shuffle
        const randomizedFlaggedQuestions = [...flaggedOnlyQuestions]
            .map(q => ({...q}))
            .sort(() => Math.random() - 0.5);
        
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowResults(false);
        setUserAnswers([]);
        setFlaggedQuestions(flaggedIds);
        setFeedback(null);
        setSelectedCategory(category);
        setShuffledQuestions(randomizedFlaggedQuestions);
        setIsFlaggedReviewMode(true);
    }, [QUIZ_DATA, saveCurrentQuizState]);

    const handleResetCategory = useCallback((category) => {
        if (window.confirm(`Are you sure you want to reset all saved progress and scores for the ${category} category?`)) {
            resetCategoryState(category);
            setSelectedCategory(null);
            setShuffledQuestions([]);
            setIsFlaggedReviewMode(false);
        }
    }, []);

    const restartQuiz = useCallback(() => {
        if (isFlaggedReviewMode && selectedCategory) {
            continueQuiz(selectedCategory);
            return;
        }
        
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowResults(false);
        setUserAnswers([]);
        setFlaggedQuestions([]);
        setFeedback(null);
        setSelectedCategory(null);
        setShuffledQuestions([]);
        setIsFlaggedReviewMode(false);
    }, [isFlaggedReviewMode, selectedCategory, continueQuiz]);

    // --- EFFECTS ---
    useEffect(() => {
        const fetchQuizzes = () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = localData;
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error("Data retrieved, but it is empty or not in the expected array format.");
                }
                setQuizzes(data);
                setError(null);
            } catch (e) {
                console.error("Failed to fetch quizzes:", e);
                setError(`Failed to connect to the backend at ${API_URL}. Please ensure your Node.js server is running and accessible. Error: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuizzes();
    }, [API_URL]);

    // Persistence effect - only save when not in flagged review mode
    useEffect(() => {
        if (selectedCategory && !showResults && !isFlaggedReviewMode && shuffledQuestions.length > 0) {
            const stateToSave = {
                currentQuestionIndex,
                userAnswers,
                flaggedQuestions,
                shuffledQuestions: shuffledQuestions.map(q => ({...q})),
                lastScore: score,
                lastTotal: totalQuestions,
                lastAttempted: new Date().toISOString()
            };
            
            saveCategoryState(selectedCategory, stateToSave);
        }
    }, [selectedCategory, currentQuestionIndex, JSON.stringify(userAnswers), 
       JSON.stringify(flaggedQuestions), showResults, isFlaggedReviewMode, 
       JSON.stringify(shuffledQuestions), score, totalQuestions]);

    // Reset state when category changes
    // useEffect(() => {
    //     if (selectedCategory) {
    //         setScore(0);
    //         setShowResults(false);
    //         setUserAnswers([]);
    //         setFeedback(null);
    //     }
    // }, [selectedCategory]);

    // Initialize focused option
    useEffect(() => {
        if (currentQuestion.options && optionKeys.length > 0) {
            setFocusedOptionKey(optionKeys[0]);
        } else {
            setFocusedOptionKey(null);
        }
    }, [currentQuestionIndex, optionKeys, currentQuestion.options]);

    // Keyboard navigation
    useEffect(() => {
        if (!selectedCategory || showResults) return;
        
        const handleKeyDown = (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                handleBackClick();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                handleNextClick();
            }
            
            if (!currentAnswer && optionKeys.length > 0) {
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
                    handleAnswerClick(focusedOptionKey);
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCategory, showResults, handleBackClick, handleNextClick, currentAnswer, focusedOptionKey, optionKeys, handleAnswerClick]);

    // --- RENDER FUNCTIONS ---
    const renderLoadingOrError = () => {
        if (isLoading) {
            return (
                <div className="text-center p-8 bg-indigo-100 rounded-xl shadow-lg border-l-4 border-indigo-500">
                    <div className="animate-spin inline-block w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full mr-3"></div>
                    <p className="text-indigo-800 font-semibold">Loading quiz data from {API_URL}...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="text-center p-8 bg-red-100 rounded-xl shadow-lg border-l-4 border-red-500 space-y-4">
                    <h2 className="text-2xl font-bold text-red-800">Connection Error 🚨</h2>
                    <p className="text-red-700 text-sm">{error}</p>
                    <p className="text-red-700 font-medium">Please verify your server is running on port 3001.</p>
                </div>
            );
        }
        return null;
    };

    const renderCategorySelector = () => (
        <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Choose Your Quiz Category 🚀
                </h2>
                <p className="text-gray-600">Select a topic to begin the challenge.</p>
            </div>
            <div className="grid gap-4">
                {categories.length > 0 ? (
                    categories.map((category) => {
                        const allCategoryQuestions = QUIZ_DATA.filter(q => q.category === category);
                        const totalQs = allCategoryQuestions.length;
                        const savedState = loadCategoryState(category);
                        const scoreSummary = loadScoreSummary(category);
                        const isProgress = savedState.shuffledQuestions.length > 0 && 
                                          (savedState.currentQuestionIndex > 0 || savedState.userAnswers.length > 0);
                        const progressText = isProgress ? ` - Stopped at Q${savedState.currentQuestionIndex + 1}` : '';
                        const isCurrentlyOnThisCategory = selectedCategory === category;
                        
                        const flaggedQIds = savedState.flaggedQuestions || [];
                        const flaggedCount = allCategoryQuestions.filter(q => flaggedQIds.includes(q.id)).length;
                        const hasFlagged = flaggedCount > 0;
                        
                        return (
                            <div key={category} className="p-4 rounded-xl border-2 border-indigo-300 bg-indigo-50 shadow-md">
                                <h3 className="text-xl font-bold text-indigo-800 mb-2">{category}</h3>
                                <p className="text-sm text-indigo-600 mb-3">{totalQs} questions{progressText}</p>
                                {scoreSummary && (
                                    <div className="text-xs p-2 mb-3 bg-white rounded border border-gray-200">
                                        <p className="font-semibold text-gray-700">Last Score: {scoreSummary.score} / {scoreSummary.total} ({Math.round((scoreSummary.score / scoreSummary.total) * 100)}%)</p>
                                        <p className="text-gray-500 mt-0.5">Attempted: {scoreSummary.attemptedDate}</p>
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => startNewQuiz(category)}
                                            className="py-2 px-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition duration-200"
                                        >
                                            Start New Quiz
                                        </button>
                                        <button
                                            onClick={() => continueQuiz(category)}
                                            disabled={!isProgress}
                                            className={`py-2 px-4 font-bold rounded-lg transition duration-200 ${isProgress ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                        >
                                            Continue
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => startFlaggedQuiz(category)}
                                        disabled={!hasFlagged}
                                        className={`w-full py-2 px-4 font-bold rounded-lg transition duration-200 ${hasFlagged ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                    >
                                        Review Flagged ({flaggedCount})
                                    </button>
                                    <button
                                        onClick={() => handleResetCategory(category)}
                                        className="mt-2 py-1 px-4 bg-red-100 text-red-600 border border-red-300 rounded-lg text-sm hover:bg-red-200 transition duration-200"
                                    >
                                        Reset Category History 🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center p-6 bg-yellow-100 border-yellow-400 border rounded-lg text-yellow-800">
                        No quiz categories loaded. Check API data structure.
                    </div>
                )}
            </div>
        </div>
    );

    const renderQuestion = () => {
        if (!currentQuestion.question) {
            return (
                <div className="text-center p-8 bg-red-100 border-red-400 border rounded-xl text-red-800 font-semibold">
                    Error: Question data is missing or corrupted.
                    <button
                        onClick={restartQuiz}
                        className="mt-4 w-full py-2 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition duration-300"
                    >
                        Go Back
                    </button>
                </div>
            );
        }
        
        const questionContent = (
            <div className="space-y-6 flex-1 lg:max-w-xl">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500">
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        {currentQuestion.category} (Question {currentQuestionIndex + 1} of {totalQuestions})
                    </p>
                    <h6 className="text-sm sm:text-sm font-bold text-gray-800">
                        {currentQuestion.question}
                    </h6>
                </div>
                <div className="grid gap-4">
                    {Object.entries(currentQuestion.options).map(([key, text]) => {
                        const isSelected = currentFeedback && currentFeedback.selectedKey === key;
                        const isCorrectAnswer = currentQuestion.answer === key;
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
                                onClick={() => handleAnswerClick(key)}
                                disabled={!!currentAnswer}
                            >
                                <span className="uppercase text-sm mr-2 text-indigo-500 font-bold">{key}:</span>
                                <span className="font-semibold">{text}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
        
        return (
            <div className="lg:flex lg:space-x-8">
                {questionContent}
                <div className="lg:w-80">
                    <FeedbackPanel
                        currentQuestionIndex={currentQuestionIndex}
                        totalQuestions={totalQuestions}
                        currentFeedback={currentFeedback}
                        handleBackClick={handleBackClick}
                        handleNextClick={handleNextClick}
                        handleSubmitQuiz={handleSubmitQuiz}
                        handleFlagQuestion={handleFlagQuestion}
                        isFlagged={isFlagged}
                        currentAnswer={currentAnswer}
                    />
                </div>
            </div>
        );
    };

    const renderResults = () => (
        <div className="text-center bg-white p-8 rounded-xl shadow-2xl border-t-4 border-indigo-600 space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-800">Quiz Complete! 🥳</h2>
            <p className="text-6xl font-black text-indigo-600">
                {score} / {totalQuestions}
            </p>
            <p className="text-lg text-gray-600 font-medium">
                You scored <span className="text-indigo-700 font-bold">{Math.round((score / totalQuestions) * 100)}%</span> on the <span className="font-bold">{selectedCategory}</span> quiz.
            </p>
            <button
                onClick={restartQuiz}
                className="w-full py-3 px-6 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition duration-300 shadow-lg transform hover:scale-[1.01]"
            >
                {isFlaggedReviewMode ? 'Resume Main Quiz 🔄' : 'Choose New Category 🔄'}
            </button>
            <div className="text-left pt-6 border-t mt-6 border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Review Your Answers</h3>
                <div className="space-y-4">
                    {userAnswers.map((answer, index) => {
                        const question = filteredQuizData[answer.questionIndex];
                        if (!question) return null;
                        const resultIcon = answer.isCorrect ? '✅' : '❌';
                        const resultColor = answer.isCorrect ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400';
                        const correctAnswerKey = question.answer;
                        const isQFlagged = flaggedQuestions.includes(question.id);
                        
                        return (
                            <div key={index} className={`p-4 rounded-lg border-l-4 ${resultColor} shadow-md relative`}>
                                <p className="font-bold text-gray-800 mb-2 flex items-center">
                                    {resultIcon} Question {answer.questionIndex + 1}: {question.question}
                                    {isQFlagged && <span className="ml-2 text-yellow-800 font-normal">🚩 (Flagged)</span>}
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
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        const loadingOrError = renderLoadingOrError();
        if (loadingOrError) return loadingOrError;
        
        if (showResults) return renderResults();
        
        if (selectedCategory && shuffledQuestions.length > 0) return renderQuestion();
        
        return renderCategorySelector();
    };

    return (
        <div className="bg-gray-100 flex p-1 sm:p-2 font-['Inter'] justify-center">
            <div className="w-full max-w-lg lg:max-w-5xl">
                {renderContent()}
            </div>
        </div>
    );
};

export default App;

