import { Clock, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import type { SessionType } from '../types';

interface SessionStatsProps {
  stats: {
    activeSessions: number;
    completedToday: number;
    avgGramsPerHour?: number;
    totalFlowerToday?: number;
    avgUnitsPerHour?: number;
    totalUnitsToday?: number;
    avgKgPerHour?: number;
    totalSmallsToday?: number;
    totalWasteToday?: number;
  };
  type?: SessionType;
}

export function SessionStats({ stats, type = 'trim' }: SessionStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 font-medium">
              {type === 'trim' ? 'Active Bins' : type === 'bucking' ? 'Active Totes' : 'Active Sessions'}
            </p>
            <p className="text-2xl font-bold text-blue-900">{stats.activeSessions}</p>
          </div>
          <Clock className="w-8 h-8 text-blue-500" />
        </div>
      </div>
      <div className="bg-cult-near-black p-4 rounded-lg shadow border border-cult-medium-gray">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-cult-light-gray">Completed Today</p>
            <p className="text-2xl font-bold text-cult-white">{stats.completedToday}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
      </div>
      <div className="bg-cult-near-black p-4 rounded-lg shadow border border-cult-medium-gray">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-cult-light-gray">
              {type === 'trim' ? 'Avg g/hr' : type === 'bucking' ? 'Avg kg/hr' : 'Avg units/hr'}
            </p>
            <p className="text-2xl font-bold text-cult-white">
              {type === 'trim'
                ? (stats.avgGramsPerHour || 0).toFixed(1)
                : type === 'bucking'
                ? (stats.avgKgPerHour || 0).toFixed(2)
                : (stats.avgUnitsPerHour || 0).toFixed(1)}
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>
      </div>
      <div className="bg-cult-near-black p-4 rounded-lg shadow border border-cult-medium-gray">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-cult-light-gray">
              {type === 'trim' ? 'Flower Today (g)' : type === 'bucking' ? 'Flower Today (kg)' : 'Units Today'}
            </p>
            <p className="text-2xl font-bold text-cult-white">
              {type === 'trim'
                ? (stats.totalFlowerToday || 0).toFixed(0)
                : type === 'bucking'
                ? ((stats.totalFlowerToday || 0) / 1000).toFixed(2)
                : (stats.totalUnitsToday || 0).toFixed(0)}
            </p>
          </div>
          <Calendar className="w-8 h-8 text-green-500" />
        </div>
      </div>
    </div>
  );
}
