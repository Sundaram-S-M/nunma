import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { NorthStarMetrics } from '../components/ceo/NorthStarMetrics';
import { ProctoringTelemetry } from '../components/ceo/ProctoringTelemetry';
import { InfrastructureBurn } from '../components/ceo/InfrastructureBurn';
import { SystemAnomaliesFeed } from '../components/ceo/SystemAnomaliesFeed';
import { TutorKycControls } from '../components/ceo/TutorKycControls';
import { DisputeManagement } from '../components/ceo/DisputeManagement';

const CeoDashboard: React.FC = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="p-8 text-center">Loading Command Center...</div>;
    }

    // Access control: Only specific CEO email
    if (!user || user.email !== 'sundaramsm55@gmail.com') {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50">
            <div className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2 flex items-center gap-3">
                        <Activity className="text-indigo-600" size={36} />
                        Command Center
                    </h1>
                    <p className="text-gray-500 font-medium">Real-time platform telemetry and operational controls.</p>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</div>
                    <div className="flex items-center gap-2 text-green-600 font-black">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                        ALL SYSTEMS NOMINAL
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* 1. North Star Metrics */}
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">1. The Pulse (North Star)</h2>
                    <NorthStarMetrics />
                </section>

                {/* 2. Integrity & Proctoring */}
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">2. Integrity & Proctoring</h2>
                    <ProctoringTelemetry />
                </section>

                {/* 3. Infrastructure Burn */}
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">3. Infrastructure Burn</h2>
                    <InfrastructureBurn />
                </section>

                {/* Grid for Feeds and Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 4. Panic Feed */}
                    <section className="lg:col-span-1 h-full">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">4. Panic Feed</h2>
                        <SystemAnomaliesFeed />
                    </section>

                    {/* 5. KYC Controls */}
                    <section className="lg:col-span-1 h-full">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">5. KYC Controls</h2>
                        <TutorKycControls />
                    </section>

                    {/* 6. Dispute Management */}
                    <section className="lg:col-span-1 h-full">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">6. Escrow Management</h2>
                        <DisputeManagement />
                    </section>
                </div>
            </div>
        </div>
    );
};

export default CeoDashboard;
