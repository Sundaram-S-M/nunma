
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ConfusionHeatmapProps {
  data: { time: string; confusion: number }[];
}

const ConfusionHeatmap: React.FC<ConfusionHeatmapProps> = ({ data }) => {
  return (
    <div className="w-full h-48 bg-white/5 rounded-3xl p-4 border border-white/10">
      <h4 className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-[#c2f575] rounded-full animate-pulse" />
        Live Confusion Heatmap
      </h4>
      <div className="w-full h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorConfusion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c2f575" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#c2f575" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis
              dataKey="time"
              hide
            />
            <YAxis
              domain={[0, 100]}
              hide
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A4E', border: 'none', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
              itemStyle={{ color: '#c2f575' }}
              labelStyle={{ display: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="confusion"
              stroke="#c2f575"
              fillOpacity={1}
              fill="url(#colorConfusion)"
              strokeWidth={3}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ConfusionHeatmap;
