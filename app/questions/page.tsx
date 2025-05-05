import { Metadata } from 'next';
import { QuestionList } from './_components/QuestionList';
import { ExamFilter } from './_components/ExamFilter';

export const metadata: Metadata = {
  title: '問題一覧 - IPA試験学習アプリ',
  description: 'IPA試験の過去問題一覧です',
};

export default function QuestionsPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">問題一覧</h1>
            <ExamFilter />
            <QuestionList />
          </div>
        </div>
      </div>
    </div>
  );
} 