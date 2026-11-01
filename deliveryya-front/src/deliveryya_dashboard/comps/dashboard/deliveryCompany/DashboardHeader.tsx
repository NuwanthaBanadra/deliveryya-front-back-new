import { useState } from 'react';
import RequestOrderCodeModal from '../RequestOrderCodeModal';

type SelectedPeriod = 'today' | 'week' | 'month';

type DashboardHeaderProps = {
    selectedPeriod: SelectedPeriod;
    onPeriodChange: (period: SelectedPeriod) => void;
};

function DashboardHeader({ selectedPeriod, onPeriodChange }: DashboardHeaderProps) {
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    const periodOptions: Array<{ value: SelectedPeriod; label: string }> = [
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'Week' },
        { value: 'month', label: 'Month' },
    ];

    return (
        <div className="bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] rounded-2xl p-8 shadow-xl mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32"></div>

            <div className="relative z-10">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-3">Delivery Operations Dashboard</h1>
                        <p className="text-white/90 text-lg">Monitor and manage all your delivery operations in real-time</p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center rounded-2xl bg-white/10 p-1 backdrop-blur-sm">
                            {periodOptions.map((option) => {
                                const isActive = selectedPeriod === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => onPeriodChange(option.value)}
                                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${isActive
                                            ? 'bg-white text-[#AC6C2A] shadow-md'
                                            : 'text-white/90 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsRequestModalOpen(true)}
                            className="rounded-xl border-2 border-white/30 bg-white/10 px-4 py-2 font-semibold text-white transition-colors hover:bg-white/20"
                        >
                            Request Order Code
                        </button>
                    </div>
                </div>
            </div>
            <RequestOrderCodeModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                onSuccess={() => setIsRequestModalOpen(false)}
            />
        </div>
    );
}

export default DashboardHeader;
