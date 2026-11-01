import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as SolidStarIcon } from '@heroicons/react/24/solid';
import { swalAlert } from '../../../util/SwalUtil';

export type FeedbackEntry = {
    rating: number;
    comment: string;
    submittedAt: string;
};

export interface OrderFeedbackModalProps {
    isOpen: boolean;
    orderCode: string;
    initialRating?: number;
    initialComment?: string;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void> | void;
}

export function OrderFeedbackModal({
    isOpen,
    orderCode,
    initialRating = 5,
    initialComment = '',
    onClose,
    onSubmit,
}: OrderFeedbackModalProps) {
    const [rating, setRating] = React.useState(initialRating);
    const [comment, setComment] = React.useState(initialComment);

    React.useEffect(() => {
        setRating(initialRating);
        setComment(initialComment);
    }, [initialRating, initialComment, isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async () => {
        if (!comment.trim()) {
            await swalAlert('Feedback required', 'Please add a short feedback note before submitting.', 'warning');
            return;
        }

        try {
            await onSubmit(rating, comment.trim());
            onClose();
        } catch (error) {
            console.error('Feedback submission failed:', error);
            await swalAlert('Submission failed', 'Failed to save feedback. Please try again.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/55 p-4">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Order feedback</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Capture feedback for <span className="font-bold text-gray-700">{orderCode}</span> and keep it attached to order history.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
                        title="Close modal"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="mt-6">
                    <p className="text-sm font-bold text-gray-700">Rating</p>
                    <div className="mt-3 flex items-center gap-2">
                        {Array.from({ length: 5 }).map((_, index) => {
                            const value = index + 1;

                            return (
                                <button
                                    key={`feedback-star-${value}`}
                                    type="button"
                                    onClick={() => setRating(value)}
                                    className="transition hover:scale-110"
                                    title={`Rate ${value} star${value !== 1 ? 's' : ''}`}
                                >
                                    <SolidStarIcon className={`h-8 w-8 ${value <= rating ? 'text-amber-400' : 'text-gray-200'}`} />
                                </button>
                            );
                        })}
                        <span className="ml-3 text-sm font-semibold text-gray-600">{rating}/5</span>
                    </div>
                </div>

                <div className="mt-6">
                    <label className="mb-2 block text-sm font-bold text-gray-700">Feedback note</label>
                    <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={5}
                        placeholder="Describe delivery quality, product condition, customer service, or any other observations for this order."
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#F59B0F] focus:bg-white"
                    />
                    <p className="mt-2 text-xs text-gray-500">{comment.length} characters</p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-300"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
                    >
                        Save feedback
                    </button>
                </div>
            </div>
        </div>
    );
}


export default OrderFeedbackModal;
