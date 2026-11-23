import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircleIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../../util/AxiosUtil';
import RichTextEditor from '../my_market/products/RichTextEditor';

export interface CommunicationRecipient {
  id: number;
  name: string;
  email: string;
  mobile: string;
  whatsapp?: string;
}

interface UserCommunicationModalProps {
  isOpen: boolean;
  recipient: CommunicationRecipient | null;
  onClose: () => void;
  heading?: string;
  description?: string;
  defaults?: Partial<CommunicationDefaults>;
}

export interface CommunicationDefaults {
  emailSubject: string;
  emailBody: string;
  sms: string;
  notificationTitle: string;
  notificationMessage: string;
}

const normalizeSriLankaPhone = (value: string) => {
  const cleaned = value.trim().replace(/[\s()-]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) return `+94${cleaned.slice(1)}`;
  return `+${cleaned}`;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);

const getDefaults = (name: string) => ({
  emailSubject: 'Welcome to the DeliveryYa team',
  emailBody: `<h2>Welcome to DeliveryYa, ${escapeHtml(name)}!</h2><p>Your employee profile has been set up. We are glad to have you on the team.</p><p>Please contact your branch manager if you need help getting started.</p><p>Best regards,<br/>DeliveryYa Team</p>`,
  sms: `Hi ${name}, welcome to the DeliveryYa team! Your employee profile has been set up. Please contact your branch manager if you need help getting started.`,
  notificationTitle: 'Welcome to DeliveryYa',
  notificationMessage: `Hi ${name}, your employee profile has been set up. Welcome to the DeliveryYa team! Please contact your branch manager if you need help getting started.`,
});

export default function UserCommunicationModal({ isOpen, recipient, onClose, heading = 'Notify user', description = 'Edit the default messages and send them through the available channels.', defaults: providedDefaults }: UserCommunicationModalProps) {
  const defaults = useMemo(() => ({
    ...getDefaults(recipient?.name || 'team member'),
    ...providedDefaults,
  }), [recipient?.name, providedDefaults]);
  const [emailSubject, setEmailSubject] = useState(defaults.emailSubject);
  const [emailBody, setEmailBody] = useState(defaults.emailBody);
  const [smsMessage, setSmsMessage] = useState(defaults.sms);
  const [notificationTitle, setNotificationTitle] = useState(defaults.notificationTitle);
  const [notificationMessage, setNotificationMessage] = useState(defaults.notificationMessage);
  const [sending, setSending] = useState<'email' | 'sms' | 'notification' | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setEmailSubject(defaults.emailSubject);
    setEmailBody(defaults.emailBody);
    setSmsMessage(defaults.sms);
    setNotificationTitle(defaults.notificationTitle);
    setNotificationMessage(defaults.notificationMessage);
    setSent({});
    setErrors({});
  }, [defaults, isOpen]);

  if (!isOpen || !recipient) return null;

  const sendChannel = async (channel: 'email' | 'sms' | 'notification') => {
    setSending(channel);
    setErrors(current => ({ ...current, [channel]: '' }));
    try {
      if (channel === 'email') {
        if (!recipient.email) throw new Error('This user does not have an email address.');
        if (!emailSubject.trim() || !emailBody.trim()) throw new Error('Email subject and message are required.');
        await axiosInstance.post('/email/send-emails', {
          email: recipient.email,
          subject: emailSubject.trim(),
          design: emailBody,
          route: '/deliverYya-cloud-console/career',
        });
      } else if (channel === 'sms') {
        const phone = recipient.mobile || recipient.whatsapp || '';
        if (!phone) throw new Error('This user does not have a mobile number.');
        if (!smsMessage.trim()) throw new Error('SMS message is required.');
        await axiosInstance.post('/sms/send-single', {
          contact: normalizeSriLankaPhone(phone),
          message: smsMessage.trim(),
        });
      } else {
        if (!notificationTitle.trim() || !notificationMessage.trim()) throw new Error('Notification title and message are required.');
        if (new TextEncoder().encode(notificationMessage).length > 65535) {
          throw new Error('Notification message exceeds the database TEXT limit of 65,535 bytes.');
        }
        await axiosInstance.post('/notifications/send-notification', {
          title: notificationTitle.trim(),
          message: notificationMessage.trim(),
          notificationType: 'MESSAGE',
          toUsers: [recipient.id],
        });
      }
      setSent(current => ({ ...current, [channel]: true }));
    } catch (error: any) {
      setErrors(current => ({
        ...current,
        [channel]: error?.response?.data?.desc || error?.message || `Could not send ${channel}.`,
      }));
    } finally {
      setSending(null);
    }
  };

  const channelCard = (key: 'email' | 'sms' | 'notification', label: string, address: string, icon: ReactNode, disabled: boolean) => (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" key={key}>
      <div className="mb-3 flex items-start gap-3">
        <span className="rounded-xl bg-amber-50 p-2 text-amber-700">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900">{label}</h3>
          <p className="truncate text-xs text-gray-500">{address || 'No contact detail available'}</p>
        </div>
        {sent[key] && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
      </div>

      {key === 'email' && <>
        <label className="mb-1 block text-xs font-bold text-gray-600">Subject <span className="font-normal">({emailSubject.length}/200)</span></label>
        <input value={emailSubject} maxLength={200} onChange={event => setEmailSubject(event.target.value)} className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <label className="mb-1 block text-xs font-bold text-gray-600">Email message</label>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200"><RichTextEditor content={emailBody} onChange={setEmailBody} /></div>
        <p className="mt-1 text-xs text-gray-500">HTML email body has no character cap in the current email API.</p>
      </>}

      {key === 'sms' && <>
        <label className="mb-1 block text-xs font-bold text-gray-600">SMS message <span className="font-normal">({smsMessage.length}/1500)</span></label>
        <textarea value={smsMessage} maxLength={1500} rows={4} onChange={event => setSmsMessage(event.target.value)} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </>}

      {key === 'notification' && <>
        <label className="mb-1 block text-xs font-bold text-gray-600">Title <span className="font-normal">({notificationTitle.length}/100)</span></label>
        <input value={notificationTitle} maxLength={100} onChange={event => setNotificationTitle(event.target.value)} className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <label className="mb-1 block text-xs font-bold text-gray-600">Notification message</label>
        <textarea value={notificationMessage} rows={3} onChange={event => setNotificationMessage(event.target.value)} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <p className="mt-1 text-xs text-gray-500">{new TextEncoder().encode(notificationMessage).length}/65,535 UTF-8 bytes (database TEXT limit).</p>
      </>}

      {errors[key] && <p className="mt-2 text-sm font-medium text-red-600">{errors[key]}</p>}
      <button type="button" disabled={disabled || sending !== null || sent[key]} onClick={() => void sendChannel(key)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">
        {sent[key] ? 'Sent' : sending === key ? 'Sending...' : `Send ${label}`}
      </button>
    </section>
  );

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Notify employee">
    <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
      <header className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-5 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">{description}</p>
          <h2 className="mt-1 text-xl font-black">{heading}: {recipient.name}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Close"><XMarkIcon className="h-5 w-5" /></button>
      </header>
      <div className="grid gap-4 overflow-y-auto p-4 lg:grid-cols-3 lg:p-6">
        {channelCard('email', 'Email', recipient.email, <EnvelopeIcon className="h-5 w-5" />, !recipient.email)}
        {channelCard('sms', 'Message (SMS)', recipient.mobile || recipient.whatsapp || '', <ChatBubbleLeftRightIcon className="h-5 w-5" />, !(recipient.mobile || recipient.whatsapp))}
        {channelCard('notification', 'App notification', 'DeliveryYa app inbox', <BellIcon className="h-5 w-5" />, false)}
      </div>
      <footer className="flex justify-end border-t border-gray-200 bg-white px-6 py-4">
        <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">Done</button>
      </footer>
    </div>
  </div>;
}
