import React, { useState, useCallback, useEffect } from 'react';
import { logger } from './utils/logger';
import { loadCategoryState, saveCategoryState, loadExamBody, saveScoreSummary } from './utils/storage';
import { shuffleArray } from './utils/shuffle';
import useQuizData from './hooks/useQuizData';
import ExamBodySelector from './components/ExamBodySelector';
import CategorySelector from './components/CategorySelector';
import QuestionDisplay from './components/QuestionDisplay';
import ResultsScreen from './components/ResultsScreen';
import LoadingError from './components/LoadingError';

const App = () => {
	// --- STATE MANAGEMENT ---
	const [selectedExamBody, setSelectedExamBody] = useState(() => loadExamBody());
	const { data: QUIZ_DATA, isLoading, error } = useQuizData(selectedExamBody);

	const [selectedCategory, setSelectedCategory] = useState(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [score, setScore] = useState(0);
	const [showResults, setShowResults] = useState(false);
	const [shuffledQuestions, setShuffledQuestions] = useState([]);
	const [userAnswers, setUserAnswers] = useState([]);
	const [flaggedQuestions, setFlaggedQuestions] = useState([]);
	const [isFlaggedReviewMode, setIsFlaggedReviewMode] = useState(false);
	const [questionStartTime, setQuestionStartTime] = useState(Date.now());
	// Added state for multiple answer selections
	const [multipleSelections, setMultipleSelections] = useState({});

	// --- COMPUTED VALUES ---
	const currentQuestion = shuffledQuestions[currentQuestionIndex] || {};
	const totalQuestions = shuffledQuestions.length;
	const currentAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
	
	// Check if the current question has multiple correct answers
	const isMultipleAnswerQuestion = Array.isArray(currentQuestion.answer);
	
	// Get the current selections for multiple answer questions
	const currentMultipleSelections = multipleSelections[currentQuestionIndex] || [];

	// --- EXAM BODY HANDLER ---
	const handleSelectExamBody = useCallback((examBody) => {
		logger.info(`Exam body selected: ${examBody}`);
		setSelectedExamBody(examBody);
		setSelectedCategory(null);
		setShowResults(false);
	}, []);

	// --- QUIZ STATE MANAGERS ---
	const startNewQuiz = useCallback((category) => {
		logger.info(`Starting new quiz for category: ${category}`);
		const questionsForCategory = QUIZ_DATA.filter(q => q.category === category);
		const randomizedQuestions = shuffleArray(questionsForCategory.map(q => ({ ...q })));

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

		const restoredQuestions = savedState.shuffledQuestions.map(q => ({ ...q }));
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

		const randomizedFlaggedQuestions = shuffleArray(flaggedOnlyQuestions.map(q => ({ ...q })));

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

	// --- NAVIGATION HANDLERS ---
	const goToQuestion = useCallback((index) => {
		// Submit any pending multiple answers before navigating
		if (isMultipleAnswerQuestion && !currentAnswer && currentMultipleSelections.length > 0) {
			submitMultipleAnswer();
		}
		
		if (index >= 0 && index < totalQuestions) {
			logger.debug(`Navigating to question ${index + 1}`);
			setCurrentQuestionIndex(index);
		}
	}, [currentMultipleSelections, currentAnswer, isMultipleAnswerQuestion, submitMultipleAnswer, totalQuestions]);

	const handleNextClick = useCallback(() => {
		goToQuestion(currentQuestionIndex + 1);
	}, [currentQuestionIndex, goToQuestion]);

	const handleBackClick = useCallback(() => {
		goToQuestion(currentQuestionIndex - 1);
	}, [currentQuestionIndex, goToQuestion]);

	// --- ANSWER HANDLER ---
	const handleAnswerClick = useCallback((selectedKey) => {
		if (currentAnswer || !currentQuestion.answer) return;

		// Check if this is a multiple-answer question by seeing if the answer is an array
		const isMultipleAnswerQuestion = Array.isArray(currentQuestion.answer);

		if (isMultipleAnswerQuestion) {
			// For multiple answer questions, toggle the selection instead of submitting immediately
			setMultipleSelections(prev => {
				const currentSelections = prev[currentQuestionIndex] || [];
				const isSelected = currentSelections.includes(selectedKey);
				
				let newSelections;
				if (isSelected) {
					// Remove the selection
					newSelections = currentSelections.filter(key => key !== selectedKey);
				} else {
					// Add the selection
					newSelections = [...currentSelections, selectedKey];
				}
				
				return {
					...prev,
					[currentQuestionIndex]: newSelections
				};
			});
		} else {
			// Original single answer handling
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
		}
	}, [currentAnswer, currentQuestion, currentQuestionIndex, questionStartTime]);

	// --- FLAG HANDLER ---
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

	// --- SUBMIT MULTIPLE ANSWERS ---
	const submitMultipleAnswer = useCallback(() => {
		if (!isMultipleAnswerQuestion || currentAnswer || currentMultipleSelections.length === 0) return;

		// Check if all selected answers match the correct answers exactly
		// For multiple answer questions, the user must select ALL correct answers and ONLY the correct answers
		const correctAnswers = Array.from(new Set(currentQuestion.answer)); // Ensure unique answers
		const userSelections = Array.from(new Set(currentMultipleSelections)); // Ensure unique selections
		
		// Sort both arrays to compare them
		const sortedCorrect = [...correctAnswers].sort();
		const sortedUser = [...userSelections].sort();
		
		const isCorrect = sortedCorrect.length === sortedUser.length && 
			sortedCorrect.every((val, idx) => val === sortedUser[idx]);
			
		const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

		logger.info(`Submitted multiple answer Q${currentQuestionIndex + 1}: [${userSelections.join(',')}] - ${isCorrect ? 'Correct' : 'Incorrect'}`);

		if (isCorrect) {
			setScore(prevScore => prevScore + 1);
		}

		setUserAnswers(prevAnswers => [...prevAnswers, {
			questionIndex: currentQuestionIndex,
			selectedKey: userSelections, // Store as array
			isCorrect: isCorrect,
			explanation: currentQuestion.explanation,
			timeSpent: timeSpent
		}]);

		// Clear the multiple selections for this question
		setMultipleSelections(prev => {
			const newState = {...prev};
			delete newState[currentQuestionIndex];
			return newState;
		});

		setQuestionStartTime(Date.now());
	}, [currentAnswer, currentQuestion, currentQuestionIndex, currentMultipleSelections, isMultipleAnswerQuestion, questionStartTime]);

	// --- SUBMIT HANDLER ---
	const handleSubmitQuiz = useCallback(() => {
		// Submit any pending multiple answers before finishing the quiz
		if (isMultipleAnswerQuestion && !currentAnswer && currentMultipleSelections.length > 0) {
			submitMultipleAnswer();
		}
		
		const finalScore = userAnswers.filter(a => a.isCorrect).length;
		const totalTime = userAnswers.reduce((acc, a) => acc + (a.timeSpent || 0), 0);

		logger.info(`Quiz submitted: ${finalScore}/${totalQuestions} (${Math.round((finalScore / totalQuestions) * 100)}%) in ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);

		setScore(finalScore);
		saveScoreSummary(selectedCategory, finalScore, totalQuestions, totalTime);
		setShowResults(true);

		if (isFlaggedReviewMode) {
			setIsFlaggedReviewMode(false);
		}
	}, [userAnswers, totalQuestions, selectedCategory, isFlaggedReviewMode, isMultipleAnswerQuestion, currentAnswer, currentMultipleSelections, submitMultipleAnswer]);

	// --- RESET HANDLER ---
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

	// --- EXPORT HANDLER ---
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

	// --- PERSISTENCE EFFECT ---
	useEffect(() => {
		if (selectedCategory && !showResults && !isFlaggedReviewMode && shuffledQuestions.length > 0) {
			saveCategoryState(selectedCategory, {
				currentQuestionIndex,
				userAnswers,
				flaggedQuestions,
				shuffledQuestions: shuffledQuestions.map(q => ({ ...q })),
				lastScore: score,
				lastTotal: totalQuestions,
				lastAttempted: new Date().toISOString()
			});
		}
	}, [selectedCategory, currentQuestionIndex, userAnswers, flaggedQuestions, shuffledQuestions, score, totalQuestions, showResults, isFlaggedReviewMode]);

	// --- RENDER LOGIC ---
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

		if (error) {
			return <LoadingError error={error} apiUrl={selectedExamBody} onRetry={() => window.location.reload()} />;
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
                        isMultipleAnswerQuestion={isMultipleAnswerQuestion}
                        currentMultipleSelections={currentMultipleSelections}
                        submitMultipleAnswer={submitMultipleAnswer}
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
		<div className="bg-gray-100 min-h-screen flex p-1 sm:p-2 justify-center">
			<div className="w-full max-w-lg lg:max-w-5xl">

				{/* ADD THIS */}
				{selectedExamBody && (
					<button
						onClick={() => {
							localStorage.removeItem('selected_exam_body');
							window.location.reload();
						}}
						className="mb-4 w-full py-2 px-4 bg-red-600 text-white font-bold rounded-lg"
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
