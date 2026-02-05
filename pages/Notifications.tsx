
import React from 'react';
import { Bell } from 'lucide-react';

const Notifications: React.FC = () => {
  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Notifications</h1>
        <p className="text-gray-400 font-medium">Your personal hub to learn, grow, and achieve.</p>
      </div>

      <div className="bg-white rounded-[2rem] p-20 border border-gray-100 shadow-sm text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Bell size={32} className="text-gray-300" />
        </div>
        <p className="text-gray-400 font-medium text-lg italic">No more notifications</p>
      </div>
    </div>
  );
};

export default Notifications;
