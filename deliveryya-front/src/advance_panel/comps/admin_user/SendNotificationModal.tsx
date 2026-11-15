import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { XMarkIcon, PaperAirplaneIcon, SignalIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../../util/AxiosUtil';
import { swalAlert, swalConfirm } from '../../../util/SwalUtil';
import type { NotificationTypes } from '../../../types/Notifications';

interface SendNotificationModalProps {
  isOpen: boolean;
  userIds: string[] | null;
  onClose: () => void;
}

const NOTIFICATION_TYPES: Array<{ value: NotificationTypes; label: string }> = [
  { value: 'MESSAGE', label: 'Message' },
  { value: 'CONFIG', label: 'Config' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'REQ_LOCATION', label: 'Request Location' },
  { value: 'RES_LOCATION', label: 'Response Location' },
];

export function SendNotificationModal({ isOpen, userIds, onClose }: SendNotificationModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<{ value: NotificationTypes; label: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType({ value: 'MESSAGE', label: 'Message' });
    } else {
      setTitle('');
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendStandard = async () => {
    if (!title || !message || !type || !userIds || userIds.length === 0) {
      swalAlert('Missing fields', 'Please fill all fields', 'warning');
      return;
    }

    try {
      setIsSending(true);
      const toUsers = userIds.map(userId => Number(userId));
      const notifyTo = userIds.map(userId => Number(userId));

      await axiosInstance.post('/notifications/send-notification', {
        title,
        message,
        notificationType: type.value,
        toUsers,
        notifyTo,
      });
      swalAlert('Success', 'Notification sent successfully!', 'success');
      onClose();
    } catch (err: any) {
      console.error('Error sending notification', err);
      swalAlert('Error', err?.response?.data?.desc || 'Failed to send notification', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendLive = async () => {
    if (!title || !message || !type || !userIds || userIds.length === 0) {
      swalAlert('Missing fields', 'Please fill all fields', 'warning');
      return;
    }

    try {
      setIsSending(true);
      const toUsers = userIds.map(userId => Number(userId));
      const notifyTo = userIds.map(userId => Number(userId));

      await axiosInstance.post('/notifications/send-notification-sse', {
        title,
        message,
        notificationType: type.value,
        toUsers,
        notifyTo,
      });
      swalAlert('Success', 'Live notification broadcasted successfully!', 'success');
      onClose();
    } catch (err: any) {
      console.error('Error sending live notification', err);
      swalAlert('Error', err?.response?.data?.desc || 'Failed to send live notification', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="relative bg-linear-to-r from-indigo-500 via-indigo-600 to-indigo-700 px-6 pb-6 pt-6 text-white text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center mt-2">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center shadow-inner mb-3">
              <PaperAirplaneIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold">Send Notification</h2>
            <p className="text-indigo-100 text-sm mt-1">Send a message to {userIds?.length || 0} user(s)</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Notification Type</label>
            <Select
              options={NOTIFICATION_TYPES}
              value={type}
              onChange={setType}
              placeholder="Select a type..."
              isDisabled={true}
              styles={{ control: (base, state) => ({ ...base, borderRadius: '0.75rem', borderColor: state.isFocused ? '#4f46e5' : '#e5e7eb', boxShadow: 'none' }) }}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Notification Title"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Message</label>
            <textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type the message..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors resize-none"
            />
          </div>
          
          <div className="pt-2 flex gap-3">
            <button
              onClick={handleSendStandard}
              disabled={isSending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50 border-2 border-indigo-100"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              Standard Send
            </button>
            <button
              onClick={handleSendLive}
              disabled={isSending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <SignalIcon className="h-5 w-5" />
              Live Notify (SSE)
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

