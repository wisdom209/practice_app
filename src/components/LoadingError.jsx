import React from 'react';
import { logger } from '../utils/logger';

const LoadingError = ({ error, apiUrl, onRetry }) => {
  logger.error('Rendering error screen:', error);
  console.log(error)
  
  return (
    <div className="text-center p-8 bg-red-100 rounded-xl shadow-lg border-l-4 border-red-500 space-y-4">
      <h2 className="text-2xl font-bold text-red-800">Connection Error 🚨</h2>
      <p className="text-red-700 text-sm">{error}</p>
      <p className="text-red-700 font-medium">Please verify your server is running on port 3001.</p>
      <button
        onClick={onRetry}
        className="py-2 px-6 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition duration-300"
      >
        Retry Connection
      </button>
    </div>
  );
};

export default LoadingError;
