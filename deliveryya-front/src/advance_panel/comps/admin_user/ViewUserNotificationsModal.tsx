import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, BellIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../../util/AxiosUtil';
import { swalAlert } from '../../../util/SwalUtil';

interface ViewUserNotificationsModalProps {
  isOpen: boolean;
  userId: string | null;
  userEmail?: string;
  onClose: () => void;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  notificationType?: string;
}

export function ViewUserNotificationsModal({ isOpen, userId, userEmail, onClose }: ViewUserNotificationsModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0); // Backend expects 0-indexed page bounds based on AdminUserStatusTable
  const [totalPages, setTotalPages] = useState(1);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post(`/notifications/get-all-notifications?userId=${userId}`, {
        pageNumber: page,
        countPerPage: 10,
        userId: Number(userId),
        id: Number(userId),
      });

      const resObj = response.data?.object || response.data;
      setNotifications(resObj?.items || resObj?.content || []);
      setTotalPages(resObj?.totalPages || 1);
    } catch (err: any) {
      console.error('Error loading notifications', err);
      swalAlert('Error', err?.response?.data?.desc || 'Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications();
    } else {
        setNotifications([]);
        setPage(0);
        setTotalPages(1);
    }
  }, [isOpen, userId, page, loadNotifications]);

  if (!isOpen || !userId) return null;

  const handleNextPage = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="relative bg-linear-to-r from-indigo-500 via-indigo-600 to-indigo-700 px-6 pb-6 pt-6 text-white text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center mt-2">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center shadow-inner mb-3">
              <BellIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold">User Notifications</h2>
            <p className="text-indigo-100 text-sm mt-1">{userEmail ? userEmail : `User ID: ${userId}`}</p>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
             <div className="flex justify-center p-10">
               <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
             </div>
          ) : notifications.length === 0 ? (
             <div className="text-center py-12">
               <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
               <p className="text-gray-500 font-semibold">No notifications found</p>
             </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-2 border-gray-200 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 truncate">{notification.title}</h3>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${notification.isRead ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {notification.isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(notification.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Pagination */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-4 shrink-0 bg-white">
          <button
            onClick={handlePrevPage}
            disabled={page === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            Previous
          </button>

          <span className="text-sm font-semibold text-gray-700">
            Page {page + 1} of {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={page >= totalPages - 1}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
