

import React from 'react';
import { Horse, FormRating, PastRaceResult } from '../types';
import { AcademicCapIcon, CalendarDaysIcon, ChartBarIcon, CogIcon, CurrencyDollarIcon, InformationCircleIcon, SparklesIcon, TagIcon, UserIcon, TrophyIcon, ShieldCheckIcon, BoltIcon, ForwardIcon, ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';


interface HorseCardProps {
  horse: Horse;
  showFullStats?: boolean; // To control visibility of hidden attributes for player's own horses perhaps
}

const getFormColor = (form: FormRating): string => {
  switch (form) {
    case FormRating.Excellent: return 'text-green-500';
    case FormRating.Good: return 'text-emerald-500';
    case FormRating.Average: return 'text-yellow-500';
    case FormRating.Poor: return 'text-orange-500';
    case FormRating.Terrible: return 'text-red-500';
    default: return 'text-gray-500';
  }
};

const HorseCard: React.FC<HorseCardProps> = ({ horse, showFullStats = false }) => {
  const StatItem: React.FC<{icon: React.ElementType, label: string, value: string | number, color?: string}> = ({ icon: Icon, label, value, color }) => (
    <div className="grid grid-cols-[max-content_1fr] items-center gap-x-2 text-sm">
      <div className="flex items-center"> {/* Label part */}
        <Icon className={`h-4 w-4 ${color || 'text-text-secondary'} mr-1.5 shrink-0`} />
        <span className="font-medium text-text-secondary whitespace-nowrap">{label}:</span>
      </div>
      <span className="text-text-primary text-left break-words">{value}</span> {/* Value part */}
    </div>
  );

  return (
    <div className="bg-surface-card shadow-lg rounded-lg p-4 md:p-6 hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-2xl font-bold text-brand-secondary flex items-center">
            {horse.isLegendary && <StarIcon className="h-6 w-6 text-yellow-400 mr-2" title="Legendary Horse" />}
            {horse.name}
          </h3>
          <p className="text-sm text-text-secondary">{horse.age}yo {horse.gender} {horse.breed} - ({horse.color})</p>
          <p className="text-xs text-text-secondary mt-0.5">Grade: <span className="font-semibold">{horse.grade}</span></p>
        </div>
        <div className={`mt-2 sm:mt-0 px-3 py-1 rounded-full text-sm font-semibold ${getFormColor(horse.form)} bg-opacity-10 ${getFormColor(horse.form).replace('text-', 'bg-')}`}>
          Form: {horse.form}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mb-4 flex-grow">
        <div>
          <h4 className="text-md font-semibold text-text-primary mb-2">Info & Performance</h4>
          <div className="space-y-1.5">
            {/* Attributes like speed, stamina, etc. are now hidden from UI */}
            <StatItem icon={CalendarDaysIcon} label="Preferred Track" value={horse.preferredTrackCondition} />
            {(showFullStats || horse.best400mTimeSecs !== null) && horse.best400mTimeSecs !== null && (
                 <StatItem icon={BoltIcon} label="Best 400m" value={`${horse.best400mTimeSecs.toFixed(2)}s`} color="text-yellow-600" />
            )}
            {(showFullStats || horse.bestLast400mTimeSecs !== null) && horse.bestLast400mTimeSecs !== null && (
                 <StatItem icon={ForwardIcon} label="Best Last 400m" value={`${horse.bestLast400mTimeSecs.toFixed(2)}s`} color="text-orange-600" />
            )}
             <p className="text-xs text-gray-400 pt-1">Detailed attributes like speed and stamina are now abstracted.</p>
          </div>
        </div>
        <div>
          <h4 className="text-md font-semibold text-text-primary mb-2">Career Stats</h4>
          <div className="space-y-1.5">
            <StatItem icon={AcademicCapIcon} label="Races" value={horse.careerStats.races} />
            <StatItem icon={TrophyIcon} label="Wins" value={horse.careerStats.wins} color="text-amber-600" />
            <StatItem icon={UserIcon} label="Places (2nd)" value={horse.careerStats.places} color="text-slate-600"/>
            <StatItem icon={UserIcon} label="Shows (3rd)" value={horse.careerStats.shows} color="text-amber-700" />
            <StatItem icon={CurrencyDollarIcon} label="Earnings" value={`$${horse.careerStats.earnings.toLocaleString()}`} color="text-green-600" />
          </div>
        </div>
      </div>

      {showFullStats && horse.raceHistory.length > 0 && (
        <div className="mt-auto"> {/* Push history to bottom if card is taller due to flex-grow */}
          <h4 className="text-md font-semibold text-text-primary mb-2 mt-4">Recent Race History (Last 5)</h4>
          <div className="overflow-x-auto text-xs">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 tracking-wider">Race (Grade)</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 tracking-wider">Pos.</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 tracking-wider">Jockey</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 tracking-wider">Earnings</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {horse.raceHistory.slice(-5).reverse().map((result: PastRaceResult) => (
                  <tr key={result.raceId}>
                    <td className="px-2 py-2 whitespace-nowrap text-text-primary">
                      {result.raceName.substring(0,15)}... ({result.raceGrade})
                      {result.horseSpecificSummarySentence && (
                        <span title={result.horseSpecificSummarySentence} className="ml-1 inline-block cursor-help">
                          <ChatBubbleOvalLeftEllipsisIcon className="h-3.5 w-3.5 text-blue-500" />
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-text-primary">
                      {result.status ? <span className="text-red-500 font-semibold">DNF</span> : result.position}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-text-primary">{result.jockeyName}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-text-primary">${result.earnings.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HorseCard;