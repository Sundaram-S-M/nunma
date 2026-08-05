import React from 'react';
import { BarChart, Activity, AlertCircle } from 'lucide-react';

const ConfusionHeatmap: React.FC = () => {
  return (
    <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
          <Activity size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-indigo-900 tracking-tight">Confusion Heatmap</h3>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Student Drop-off Points</p>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <AlertCircle size={48} className="text-gray-300 mx-auto" />
          <p className="text-gray-400 font-medium max-w-sm">
            Not enough data collected yet. Once students begin taking exams and watching videos, the AI will generate heatmaps of where they struggle most.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfusionHeatmap;
