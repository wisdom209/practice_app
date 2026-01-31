import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import msraData from '../data/data.json';

const API_URL = 'http://localhost:3001/api/quizzes';
const DATA_MAP = {
  msra: msraData,
};

const useQuizData = (examBody) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!examBody) {
        setIsLoading(false);
        return;
      }

      logger.info(`Fetching quiz data for exam body: ${examBody}`);
      setIsLoading(true);
      setError(null);

      // Try API first
      try {
        const response = await fetch(`${API_URL}/${examBody}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const apiData = await response.json();
        
        if (!Array.isArray(apiData) || apiData.length === 0) {
          throw new Error("API returned empty or invalid data");
        }
        
        logger.info(`Loaded ${apiData.length} questions from API for ${examBody}`);
        setData(apiData);
        setError(null);
      } catch (apiError) {
        logger.warn(`API failed: ${apiError.message}. Falling back to local data`);
        
        // Fallback to static imports
        try {
          const localData = DATA_MAP[examBody];
          
          if (!localData) {
            throw new Error(`No local data found for exam body: ${examBody}`);
          }
          
          if (!Array.isArray(localData) || localData.length === 0) {
            throw new Error(`Local data for ${examBody} is empty or invalid`);
          }
          
          logger.info(`Loaded ${localData.length} questions from local file for ${examBody}`);
          setData(localData);
          setError(null);
        } catch (localError) {
		
          logger.error(`Failed to load data for ${examBody}:`, localError);
          setError(`Failed to load quiz data for ${examBody}. Please ensure the data file exists and is valid JSON.`);
          setData([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, [examBody]);

  return { data, isLoading, error };
};

export default useQuizData;
