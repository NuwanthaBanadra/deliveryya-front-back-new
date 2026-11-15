import { Link } from 'react-router-dom';

function Forbidden() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <p className="text-sm font-semibold tracking-wide uppercase text-red-600">403</p>
        <h1 className="mt-2 text-2xl font-black text-gray-900">Access Forbidden</h1>
        <p className="mt-3 text-sm text-gray-600">
          You do not have permission to view this section.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/home"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors"
          >
            Go Home
          </Link>
          <Link
            to="/deliverYya-cloud-console"
            className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Forbidden;
