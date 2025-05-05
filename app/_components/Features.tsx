import { 
  BookOpenIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

const features = [
  {
    name: '豊富な過去問',
    description: '実際の試験で出題された問題を多数収録。本番の試験と同じ形式で練習できます。',
    icon: BookOpenIcon,
  },
  {
    name: '進捗管理',
    description: '学習の進捗状況を可視化。苦手分野を把握し、効率的な学習計画を立てることができます。',
    icon: ChartBarIcon,
  },
  {
    name: '詳細な解説',
    description: '各問題に丁寧な解説付き。なぜその解答が正しいのかを理解することができます。',
    icon: AcademicCapIcon,
  },
  {
    name: '時間管理',
    description: '本番の試験を意識した時間管理機能。実際の試験と同じペースで問題を解くことができます。',
    icon: ClockIcon,
  },
];

export function Features() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">
            効率的な学習をサポート
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            充実した機能で合格までをサポート
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            IPA試験学習アプリは、あなたの学習をより効果的にするための機能を提供します。
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <feature.icon className="h-5 w-5 flex-none text-indigo-600" aria-hidden="true" />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
} 