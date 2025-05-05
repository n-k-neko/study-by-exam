import { Metadata } from 'next';
import { QuestionDetail } from '../_components/QuestionDetail';

export const metadata: Metadata = {
  title: '問題詳細 - IPA試験学習アプリ',
  description: 'IPA試験の問題と解答・解説',
};

export default function QuestionPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <QuestionDetail questionId={params.id} />
          </div>
        </div>
      </div>
    </div>
  );
} 