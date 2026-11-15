import { FaStar } from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import { useMemo, useState } from "react";

interface Review {
    id: number;
    name: string;
    rating: number;
    comment: string;
    date: string;
    verified: boolean;
    avatar: string;
}

interface ProductReviewsProps {
    rating: number;
    reviews: Review[];
    totalReviews: number;
    isLoading?: boolean;
    isSubmitting?: boolean;
    canSubmitFeedback?: boolean;
    onSubmitFeedback?: (rating: number, comment: string) => Promise<void>;
}

function ProductReviews({
    rating,
    reviews,
    totalReviews,
    isLoading = false,
    isSubmitting = false,
    canSubmitFeedback = false,
    onSubmitFeedback,
}: ProductReviewsProps) {
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    const ratingBreakdown = useMemo(() => {
        const total = reviews.length;

        return [5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((review) => Math.round(review.rating) === star).length;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

            return {
                star,
                count,
                percentage,
            };
        });
    }, [reviews]);

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <FaStar
                key={i}
                className={`${i < Math.floor(rating) ? "text-[#FFB84D]" : "text-gray-300"}`}
            />
        ));
    };

    const resetForm = () => {
        setReviewRating(5);
        setReviewComment("");
        setFormError(null);
    };

    const handleSubmit = async () => {
        if (!onSubmitFeedback || isSubmitting) {
            return;
        }

        const trimmedComment = reviewComment.trim();

        if (!Number.isInteger(reviewRating) || reviewRating < 1 || reviewRating > 5) {
            setFormError("Please select a valid rating between 1 and 5.");
            return;
        }

        if (trimmedComment.length > 100) {
            setFormError("Your feedback must be 100 characters or fewer.");
            return;
        }

        setFormError(null);
        await onSubmitFeedback(reviewRating, trimmedComment);
        resetForm();
        setIsFormVisible(false);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 mb-12 lg:mb-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-8 bg-linear-to-b from-[#EA580C] via-[#F59B0F] to-[#FBBF24] rounded-full shadow-lg shadow-[#F59B0F]/50"></span>
                    Customer Reviews
                </h2>
                {canSubmitFeedback && (
                    <button
                        onClick={() => {
                            setIsFormVisible((prev) => !prev);
                            setFormError(null);
                        }}
                        className="w-full sm:w-auto bg-linear-to-r from-[#C2410C] via-[#F59B0F] to-[#FBBF24] text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#F59B0F]/50 transition-all hover:scale-105"
                    >
                        {isFormVisible ? "Hide Form" : "Write a Review"}
                    </button>
                )}
            </div>

            {isFormVisible && canSubmitFeedback && (
                <div className="mb-8 rounded-2xl border border-[#F59B0F]/20 bg-amber-50/50 p-4 sm:p-6">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Your rating</p>
                    <div className="flex items-center gap-2 mb-4">
                        {Array.from({ length: 5 }).map((_, index) => {
                            const value = index + 1;

                            return (
                                <button
                                    key={`new-review-star-${value}`}
                                    type="button"
                                    onClick={() => setReviewRating(value)}
                                    className="transition hover:scale-110"
                                    title={`Rate ${value} star${value !== 1 ? "s" : ""}`}
                                >
                                    <FaStar className={`${value <= reviewRating ? "text-[#FFB84D]" : "text-gray-300"} text-2xl`} />
                                </button>
                            );
                        })}
                        <span className="ml-2 text-sm font-semibold text-gray-600">{reviewRating}/5</span>
                    </div>

                    <label className="text-sm font-semibold text-gray-700">Your feedback (optional, max 100 chars)</label>
                    <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        rows={4}
                        maxLength={100}
                        placeholder="Share your product experience"
                        className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#F59B0F]"
                    />
                    <p className="mt-2 text-xs text-gray-500">{reviewComment.length}/100 characters</p>

                    {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}

                    <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setIsFormVisible(false);
                            }}
                            className="rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={isSubmitting}
                            className="rounded-xl bg-linear-to-r from-[#C2410C] via-[#F59B0F] to-[#FBBF24] px-4 py-2.5 font-semibold text-white disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Submitting..." : "Submit Feedback"}
                        </button>
                    </div>
                </div>
            )}

            {/* Overall Rating */}
            <div className="flex flex-col md:flex-row gap-8 mb-8 pb-8 border-b border-gray-200">
                <div className="text-center md:text-left">
                    <div className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-linear-to-r from-[#C2410C] via-[#F59B0F] to-[#FBBF24] mb-2">{Number(rating || 0).toFixed(1)}</div>
                    <div className="flex gap-1 mb-2 justify-center md:justify-start">
                        {renderStars(rating)}
                    </div>
                    <p className="text-gray-600">Based on {totalReviews.toLocaleString()} reviews</p>
                </div>
                
                <div className="flex-1 space-y-2">
                    {ratingBreakdown.map(({ star, percentage }) => (
                        <div key={star} className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 w-8">{star} ★</span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-linear-to-r from-[#EA580C] via-[#F59B0F] to-[#FBBF24] shadow-sm transition-all"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">
                                {percentage}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Review List */}
            {isLoading ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-6 text-center text-gray-600">
                    Loading customer feedback...
                </div>
            ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-6 text-center text-gray-600">
                    No feedback yet. Be the first customer to leave a review.
                </div>
            ) : (
                <div className="space-y-6">
                    {reviews.map((review) => (
                    <div key={review.id} className="p-4 sm:p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                            <img
                                src={review.avatar}
                                alt={review.name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-bold text-gray-900">{review.name}</h4>
                                        {review.verified && (
                                            <span className="flex items-center gap-1 bg-[#E0F7F4] text-[#00BFA5] px-2 py-1 rounded-full text-xs font-semibold">
                                                <MdVerified /> Verified
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm text-gray-500">{review.date}</span>
                                </div>
                                <div className="flex gap-1 mb-3">
                                    {renderStars(review.rating)}
                                </div>
                                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            )}

            {!isLoading && reviews.length > 0 && (
                <p className="mt-8 text-center text-sm text-gray-500">Showing the latest customer feedback for this product.</p>
            )}
        </div>
    );
}

export default ProductReviews;
