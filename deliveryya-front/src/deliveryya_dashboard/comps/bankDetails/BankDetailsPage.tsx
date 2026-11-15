import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import JwtUtil from '../../../util/JwtUtil';
import BankDetailsManager from './BankDetailsManager';

const getLoggedInUserId = (): number | null => {
  const token = localStorage.getItem('jwtToken');

  if (token) {
    const decoded = JwtUtil.decodeToken(token);
    const tokenUserId = Number(decoded?.userId);

    if (Number.isInteger(tokenUserId) && tokenUserId > 0) {
      return tokenUserId;
    }
  }

  const localUserId = Number(localStorage.getItem('userId'));
  return Number.isInteger(localUserId) && localUserId > 0 ? localUserId : null;
};

function BankDetailsPage() {
  const navigate = useNavigate();
  const userId = useMemo(() => getLoggedInUserId(), []);

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-amber-100 px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <button
          type="button"
          onClick={() => navigate('/deliverYya-cloud-console/dashboard')}
          className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-[#AC6C2A] shadow-sm transition hover:bg-orange-50"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Dashboard
        </button>

        <BankDetailsManager
          userId={userId}
          ownerLabel="your account"
          variant="page"
          title="Bank Details"
          subtitle="Add and maintain the bank accounts connected to your DeliveryYa profile."
        />
      </div>
    </div>
  );
}

export default BankDetailsPage;
