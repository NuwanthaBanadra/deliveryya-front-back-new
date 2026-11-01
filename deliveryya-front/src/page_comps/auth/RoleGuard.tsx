import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { swalAlert } from '../../util/SwalUtil';
import { ensureAccessDetails, hasAnyAccess } from '../../util/AccessController';

type RoleGuardProps = {
  allowedAccessIds?: readonly number[];
  children: ReactNode;
  redirectTo?: string;
  unauthorizedMessage?: string;
};

function RoleGuard({
  allowedAccessIds,
  children,
  redirectTo = '/home',
  unauthorizedMessage = 'You do not have permission to access this page.',
}: RoleGuardProps) {
  const hasShownMessageRef = useRef(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const resolveAccess = async () => {
      if (!allowedAccessIds || allowedAccessIds.length === 0) {
        if (isMounted) {
          setIsAuthorized(true);
          setIsCheckingAccess(false);
        }
        return;
      }

      setIsCheckingAccess(true);
      await ensureAccessDetails();

      if (isMounted) {
        setIsAuthorized(hasAnyAccess(allowedAccessIds));
        setIsCheckingAccess(false);
      }
    };

    void resolveAccess();

    return () => {
      isMounted = false;
    };
  }, [allowedAccessIds]);

  useEffect(() => {
    if (isCheckingAccess) {
      return;
    }

    if (!isAuthorized && !hasShownMessageRef.current && unauthorizedMessage) {
      hasShownMessageRef.current = true;
      void swalAlert('Unauthorized', unauthorizedMessage, 'warning');
    }
  }, [isAuthorized, isCheckingAccess, unauthorizedMessage]);

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-700">
        Loading access permissions...
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

export default RoleGuard;
