import axiosInstance from './AxiosUtil';
import type {
  ApiFeedback,
  FeedbackListRequest,
  FeedbackListResponse,
  FeedbackSaveRequest,
  FeedbackSaveResponse,
  ProductFeedbackReview,
} from '../types/EntitiesTypes';

type FeedbackListResult = {
  reviews: ProductFeedbackReview[];
  totalCount: number;
  totalPages: number;
  averageRating: number;
};

const toIsoDateText = (value: string | null | undefined): string => {
  if (!value) {
    return 'Recently';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Recently';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

const asValidFeedbackList = (data: FeedbackListResponse) => {
  return data.object ?? data.exData;
};

const asValidSavedFeedback = (data: FeedbackSaveResponse): ApiFeedback | null => {
  return data.object ?? data.exData ?? null;
};

const asImageValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toProfileImage = (feedback: ApiFeedback): string | null => {
  const directCandidates: unknown[] = [
    feedback.profileImg,
    feedback.profileImage,
    feedback.avatar,
    feedback.imageUrl,
  ];

  for (const candidate of directCandidates) {
    const image = asImageValue(candidate);
    if (image) {
      return image;
    }
  }

  const userRecord = (feedback.user ?? null) as Record<string, unknown> | null;
  if (!userRecord) {
    return null;
  }

  const nestedKeys = ['profileImg', 'profileImage', 'avatar', 'imageUrl', 'profilePic', 'profilePhoto'];
  for (const key of nestedKeys) {
    const image = asImageValue(userRecord[key]);
    if (image) {
      return image;
    }
  }

  return null;
};

const toReview = (feedback: ApiFeedback): ProductFeedbackReview => {
  const fallbackName = feedback.userId > 0 ? `Customer #${feedback.userId}` : 'Customer';
  const avatarSeed = feedback.userId > 0 ? ((feedback.userId % 70) + 1) : 68;
  const profileImage = toProfileImage(feedback);

  return {
    id: feedback.id,
    name: (feedback.userName || '').trim() || fallbackName,
    rating: Math.min(5, Math.max(1, Number(feedback.rating) || 1)),
    comment: (feedback.comment || '').trim() || 'No additional comment provided.',
    date: toIsoDateText(feedback.createdAt ?? feedback.updatedAt),
    verified: true,
    avatar: profileImage ?? `https://i.pravatar.cc/150?img=${avatarSeed}`,
  };
};

const toAverageRating = (feedbacks: ApiFeedback[]): number => {
  if (feedbacks.length === 0) {
    return 0;
  }

  const total = feedbacks.reduce((sum, feedback) => {
    const safeRating = Number(feedback.rating);
    return sum + (Number.isFinite(safeRating) ? safeRating : 0);
  }, 0);

  return Number((total / feedbacks.length).toFixed(1));
};

export const getProductFeedbacks = async (
  payload: FeedbackListRequest,
): Promise<FeedbackListResult> => {
  const response = await axiosInstance.post<FeedbackListResponse>('/feedback/get-feedbacks', payload);
  const object = asValidFeedbackList(response.data);

  if (!object) {
    return {
      reviews: [],
      totalCount: 0,
      totalPages: 0,
      averageRating: 0,
    };
  }

  const feedbacks = Array.isArray(object.feedbacks) ? object.feedbacks : [];

  return {
    reviews: feedbacks.map(toReview),
    totalCount: Number(object.totalCount) || feedbacks.length,
    totalPages: Number(object.totalPages) || 0,
    averageRating: toAverageRating(feedbacks),
  };
};

export const createProductFeedback = async (payload: FeedbackSaveRequest): Promise<ProductFeedbackReview> => {
  const comment = (payload.comment || '').trim();
  const rating = Number(payload.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }

  if (!Number.isInteger(payload.productId) || payload.productId < 1) {
    throw new Error('Product ID is invalid.');
  }

  if (comment.length > 100) {
    throw new Error('Feedback comment must be 100 characters or fewer.');
  }

  const response = await axiosInstance.post<FeedbackSaveResponse>('/feedback/set-feedback', {
    rating,
    productId: payload.productId,
    comment,
  });

  const saved = asValidSavedFeedback(response.data);
  if (!saved) {
    throw new Error('Feedback was saved but no feedback data was returned.');
  }

  return toReview(saved);
};

export type { FeedbackListResult };
