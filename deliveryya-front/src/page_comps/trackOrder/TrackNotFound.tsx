import { TbTruckDelivery } from 'react-icons/tb';
import { MdSearch, MdQrCode } from 'react-icons/md';
import { IoRocketSharp } from 'react-icons/io5';

function TrackNotFound({ orderCode }: { orderCode: string }) {
    return (
        <section className="bg-white py-20 px-4">
            <div className="max-w-lg mx-auto text-center space-y-6">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] rounded-3xl shadow-xl mx-auto">
                    <TbTruckDelivery className="w-12 h-12 text-white" />
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                    Order Not Found
                </h2>

                <p className="text-gray-500 text-base leading-relaxed">
                    We couldn't find an order with the code{' '}
                    <span className="font-bold text-[#F59B0F]">"{orderCode}"</span>. Please check
                    the code and try again.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-orange-50 border border-orange-200 px-4 py-2.5 rounded-xl">
                        <MdQrCode className="w-5 h-5 text-[#F59B0F]" />
                        <span>Check your confirmation email for the code</span>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                    {[
                        { icon: <IoRocketSharp className="w-4 h-4" />, label: 'Verify the code format: DYA-YYYY-XXXXXX' },
                        { icon: <MdSearch className="w-4 h-4" />, label: 'Orders are trackable within 24h' },
                    ].map((tip, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2 rounded-full text-xs font-medium"
                        >
                            <span className="text-[#AC6C2A]">{tip.icon}</span>
                            {tip.label}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default TrackNotFound;
