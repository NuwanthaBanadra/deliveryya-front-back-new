import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  userId: number;
};

interface NotificationsPanelProps {
  isOpen: boolean;
  notificationCount: number;
  notifications: NotificationItem[];
  notificationsLoading: boolean;
  notificationsError: string;
  markingReadId: number | null;
  selectedNotification: NotificationItem | null;
  onToggle: () => void;
  onClose: () => void;
  onRetry: () => void;
  onOpenNotification: (notification: NotificationItem) => void;
  onCloseSelectedNotification: () => void;
}

function NotificationsPanel({
  isOpen,
  notificationCount,
  notifications,
  notificationsLoading,
  notificationsError,
  markingReadId,
  selectedNotification,
  onToggle,
  onClose,
  onRetry,
  onOpenNotification,
  onCloseSelectedNotification,
}: NotificationsPanelProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative p-2 rounded-lg hover:bg-orange-50 text-gray-600 hover:text-[#F59B0F] transition-all duration-300 group"
      >
        <BellIcon className="h-6 w-6" />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close notifications panel"
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
          />
          <div className="fixed top-18 left-2 right-2 z-50 max-h-[calc(100vh-5.5rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-3 sm:w-88 sm:max-h-none sm:max-w-[calc(100vw-1rem)]">
            <div className="bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-3 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] sm:text-sm font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-orange-50">
                    Notifications
                  </p>
                  <p className="text-base font-bold">Latest updates</p>
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">{notificationCount}</span>
              </div>
            </div>

            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto sm:max-h-96">
              {notificationsLoading ? (
                <div className="flex items-center justify-center gap-3 px-4 py-10 text-sm text-gray-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F59B0F] border-t-transparent"></span>
                  Loading notifications...
                </div>
              ) : notificationsError ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-gray-700">{notificationsError}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-orange-50 px-4 py-2 text-sm font-semibold text-[#AC6C2A] transition-colors hover:bg-orange-100"
                  >
                    Retry
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#F59B0F]">
                    <BellIcon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No notifications yet</p>
                  <p className="mt-1 text-xs text-gray-500">New updates will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        onOpenNotification(notification);
                      }}
                      className={`w-full text-left flex items-start gap-3 px-4 py-4 transition-colors hover:bg-orange-50/70 ${
                        notification.isRead ? 'bg-white' : 'bg-orange-50/60'
                      }`}
                    >
                      <div
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          notification.isRead ? 'bg-gray-300' : 'bg-[#F59B0F]'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                          {markingReadId === notification.id ? (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                              <span className="h-2.5 w-2.5 animate-spin rounded-full border border-gray-400 border-t-transparent"></span>
                              Updating
                            </span>
                          ) : !notification.isRead && (
                            <span className="shrink-0 rounded-full bg-[#F59B0F]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#AC6C2A]">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-5 text-gray-600">{notification.message}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">Notification</p>
                  <h3 className="mt-1 text-lg font-bold text-white">{selectedNotification.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={onCloseSelectedNotification}
                  className="rounded-lg bg-white/15 p-1.5 text-white transition-colors hover:bg-white/25"
                  aria-label="Close notification"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm leading-6 text-gray-700">{selectedNotification.message}</p>
            </div>
            <div className="flex justify-end border-t border-gray-100 px-5 py-3">
              <button
                type="button"
                onClick={onCloseSelectedNotification}
                className="rounded-lg bg-orange-50 px-4 py-2 text-sm font-semibold text-[#AC6C2A] transition-colors hover:bg-orange-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsPanel;