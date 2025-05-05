'use client';

import { useState } from 'react';
import Link from 'next/link';

// モックデータ（後でAPIから取得するように変更）
const mockQuestions = [
  {
    id: '1',
    title: 'データベース設計の基礎',
    category: 'データベース',
    difficulty: '基本',
    status: '未回答',
  },
  {
    id: '2',
    title: 'ネットワークプロトコル',
    category: 'ネットワーク',
    difficulty: '応用',
    status: '正解',
  },
  {
    id: '3',
    title: 'セキュリティ対策',
    category: 'セキュリティ',
    difficulty: '基本',
    status: '不正解',
  },
];

export function QuestionList() {
  const [questions] = useState(mockQuestions);

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
              タイトル
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              カテゴリ
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              難易度
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              ステータス
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">アクション</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {questions.map((question) => (
            <tr key={question.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {question.title}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {question.category}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {question.difficulty}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    question.status === '正解'
                      ? 'bg-green-100 text-green-800'
                      : question.status === '不正解'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {question.status}
                </span>
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <Link
                  href={`/questions/${question.id}`}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  解く<span className="sr-only">, {question.title}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 