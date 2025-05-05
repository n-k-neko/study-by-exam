'use client';

import { useState } from 'react';

const examTypes = [
  { id: 'FE', name: '基本情報技術者試験' },
  { id: 'AP', name: '応用情報技術者試験' },
  { id: 'DB', name: 'データベーススペシャリスト試験' },
  { id: 'NW', name: 'ネットワークスペシャリスト試験' },
  { id: 'SC', name: '情報セキュリティスペシャリスト試験' },
];

export function ExamFilter() {
  const [selectedExam, setSelectedExam] = useState('FE');

  return (
    <div className="mb-6">
      <label htmlFor="exam" className="block text-sm font-medium text-gray-700">
        試験種別
      </label>
      <select
        id="exam"
        name="exam"
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        value={selectedExam}
        onChange={(e) => setSelectedExam(e.target.value)}
      >
        {examTypes.map((exam) => (
          <option key={exam.id} value={exam.id}>
            {exam.name}
          </option>
        ))}
      </select>
    </div>
  );
} 