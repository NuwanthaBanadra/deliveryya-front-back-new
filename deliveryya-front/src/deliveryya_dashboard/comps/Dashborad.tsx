import { useMemo } from 'react';
import { getDashboardAccessMode } from '../../util/AccessController';
import ClientMarketOwnerDashboard from './dashboard/ClientMarketOwnerDashboard';
import DeliveryCompanyDashboard from './dashboard/DeliveryCompanyDashboard';

function Dashboard() {
    const accessMode = useMemo(() => getDashboardAccessMode(), []);

    if (accessMode === 'client-market-owner') {
        return <ClientMarketOwnerDashboard />;
    }

    if (accessMode === 'delivery-company') {
        return <DeliveryCompanyDashboard />;
    }

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            You do not have permission to view Dashboard.
        </div>
    );
}

export default Dashboard;
