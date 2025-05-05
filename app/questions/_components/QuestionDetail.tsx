'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// モックデータ（後でAPIから取得するように変更）
const mockQuestion = {
  id: '1',
  title: 'データベース設計の基礎',
  category: 'データベース',
  difficulty: '基本',
  content: `以下のデータベース設計に関する記述のうち、正しいものはどれか。

1. 第1正規形は、テーブル内の全ての属性が原子値であることを要求する。
2. 第2正規形は、非キー属性が主キーに完全関数従属していることを要求する。
3. 第3正規形は、非キー属性間に推移的関数従属がないことを要求する。
4. ボイス・コッド正規形は、主キーが単一の属性で構成されていることを要求する。`,
  choices: [
    '1と2が正しい',
    '1と3が正しい',
    '2と3が正しい',
    '3と4が正しい',
  ],
  correctAnswer: 2,
  explanation: `正規化の各段階について：

1. 第1正規形（1NF）：全ての属性が原子値であること。
2. 第2正規形（2NF）：1NFを満たし、非キー属性が主キーに完全関数従属していること。
3. 第3正規形（3NF）：2NFを満たし、非キー属性間に推移的関数従属がないこと。
4. ボイス・コッド正規形（BCNF）：主キーの単一性は要求しない。

したがって、1と3が正しい記述となります。`,
};

interface QuestionDetailProps {
  questionId: string;
}

export function QuestionDetail({ questionId }: QuestionDetailProps) {
  const router = useRouter();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    setIsAnswered(true);
  };

  const handleNext = () => {
    // 次の問題へ遷移（仮の実装）
    const nextId = String(Number(questionId) + 1);
    router.push(`/questions/${nextId}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{mockQuestion.title}</h1>
        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
          <span>{mockQuestion.category}</span>
          <span>•</span>
          <span>{mockQuestion.difficulty}</span>
        </div>
      </div>

      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap text-base">{mockQuestion.content}</pre>
      </div>

      <div className="space-y-4">
        {mockQuestion.choices.map((choice, index) => (
          <div key={index} className="flex items-center">
            <input
              type="radio"
              id={`choice-${index}`}
              name="answer"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              disabled={isAnswered}
              checked={selectedAnswer === index}
              onChange={() => setSelectedAnswer(index)}
            />
            <label
              htmlFor={`choice-${index}`}
              className={`ml-3 block text-sm font-medium ${
                isAnswered && index === mockQuestion.correctAnswer
                  ? 'text-green-700'
                  : isAnswered && index === selectedAnswer
                  ? 'text-red-700'
                  : 'text-gray-700'
              }`}
            >
              {choice}
            </label>
          </div>
        ))}
      </div>

      {isAnswered ? (
        <div className="space-y-4">
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">解説</h3>
                <div className="mt-2 text-sm text-blue-700 whitespace-pre-line">
                  {mockQuestion.explanation}
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            次の問題へ
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selectedAnswer === null}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          回答する
        </button>
      )}
    </div>
  );
} 