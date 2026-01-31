import React from 'react';
import { logger } from '../utils/logger';
import { saveExamBody } from '../utils/storage';

const EXAM_BODIES = [
  {
    id: 'nationals_ong',
    name: 'NPMCN Obstetrics and Gynaeccology',
    description: 'Questions for O n G training',
    color: 'indigo'
  }
];

const ExamBodySelector = ({ onSelectExamBody }) => {
  logger.info('Rendering ExamBodySelector');
  
  const handleSelect = (examBody) => {
    logger.info(`Selected exam body: ${examBody}`);
    saveExamBody(examBody);
    onSelectExamBody(examBody);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border-t-4 border-indigo-500 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Select Your Exam Body 🎓
        </h2>
        <p className="text-gray-600">
          Choose the examination you are preparing for
        </p>
      </div>
      
      <div className="grid gap-4">
        {EXAM_BODIES.map((exam) => (
          <div 
            key={exam.id} 
            className={`p-6 rounded-xl border-2 border-${exam.color}-300 bg-${exam.color}-50 shadow-md hover:shadow-lg transition-shadow duration-200`}
          >
            <h3 className={`text-xl font-bold text-${exam.color}-800 mb-2`}>
              {exam.name}
            </h3>
            <p className={`text-sm text-${exam.color}-600 mb-4`}>
              {exam.description}
            </p>
            <button
              onClick={() => handleSelect(exam.id)}
              className={`w-full py-3 px-4 bg-${exam.color}-600 text-white font-bold rounded-lg hover:bg-${exam.color}-700 transition duration-200 transform hover:scale-[1.01]`}
            >
              Select {exam.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamBodySelector;
