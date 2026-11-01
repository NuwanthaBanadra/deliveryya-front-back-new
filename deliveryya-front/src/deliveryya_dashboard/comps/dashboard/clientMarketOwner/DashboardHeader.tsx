import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JobRequestModal from '../deliveryCompany/JobRequestModal';
import RequestOrderCodeModal from '../RequestOrderCodeModal';

function DashboardHeader() {
    const navigate = useNavigate();
    const [isRequestOrderCodeModalOpen, setIsRequestOrderCodeModalOpen] = useState(false);
    const [isPickupRequestModalOpen, setIsPickupRequestModalOpen] = useState(false);

    return (
        <>
            <div className="bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] rounded-2xl p-8 shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32"></div>

                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-3">Dashboard</h1>
                            <p className="text-white/90 text-lg">Track orders, financials, and requests from your business side</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-8 rounded-2xl border border-orange-100 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#AC6C2A]">Quick Actions</p>
                        <p className="mt-1 text-sm text-gray-600">Manage bank details, request order codes, and create pickup requests from one place.</p>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-3 md:w-auto md:grid-cols-3">
                        <button
                            type="button"
                            onClick={() => navigate('/deliverYya-cloud-console/bank-details')}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-[#F59B0F] px-5 py-3 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#E38F0E]"
                        >
                            View Bank Details
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsRequestOrderCodeModalOpen(true)}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-[#F59B0F] px-5 py-3 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#E38F0E]"
                        >
                            Request Order Code
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsPickupRequestModalOpen(true)}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-[#F59B0F] px-5 py-3 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#E38F0E]"
                        >
                            Pickup Request
                        </button>
                    </div>
                </div>
            </div>

            <RequestOrderCodeModal
                isOpen={isRequestOrderCodeModalOpen}
                onClose={() => setIsRequestOrderCodeModalOpen(false)}
            />

            <JobRequestModal
                isOpen={isPickupRequestModalOpen}
                onClose={() => setIsPickupRequestModalOpen(false)}
            />
        </>
    );
}

export default DashboardHeader;
