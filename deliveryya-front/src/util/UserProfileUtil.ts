import JwtUtil from './JwtUtil';
import { baseURL } from './AxiosUtil';

export type LoggedInUserProfile = {
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
};

const normalizeAvatarUrl = (value: string): string => {
  const cleanedValue = value.replace(/\\/g, '/').trim();

  if (!cleanedValue || cleanedValue.startsWith('data:') || /^https?:\/\//i.test(cleanedValue)) {
    return cleanedValue;
  }

  const normalizedPath = cleanedValue.replace(/^\/+/, '');
  return normalizedPath.startsWith('uploads/')
    ? `${baseURL}/${normalizedPath}`
    : `${baseURL}/uploads/${normalizedPath}`;
};

export const buildUserProfileFromSession = (): LoggedInUserProfile | null => {
  const token = localStorage.getItem('jwtToken');
  if (!token || !JwtUtil.validateToken(token)) {
    return null;
  }

  const decoded = JwtUtil.decodeToken(token);
  const decodedWithAvatar = decoded as Record<string, unknown> | null;
  const firstName = decoded?.firstName?.trim() ?? '';
  const lastName = decoded?.lastName?.trim() ?? '';
  const email = decoded?.email?.trim() || localStorage.getItem('userEmail')?.trim() || '';
  const avatarFromToken =
    (decodedWithAvatar?.profileImg as string | undefined) ||
    (decodedWithAvatar?.profileImage as string | undefined) ||
    (decodedWithAvatar?.profilePic as string | undefined) ||
    (decodedWithAvatar?.avatar as string | undefined) ||
    (decodedWithAvatar?.imageUrl as string | undefined) ||
    (decodedWithAvatar?.photoUrl as string | undefined) ||
    (decodedWithAvatar?.p_img as string | undefined);
  const avatarValue = avatarFromToken?.trim() || localStorage.getItem('userProfileImage')?.trim() || '';
  const avatarUrl = avatarValue ? normalizeAvatarUrl(avatarValue) : undefined;

  if (!email) {
    return null;
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const displayName = fullName || email;
  const initials = fullName
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase()
    : email.charAt(0).toUpperCase();

  return {
    name: displayName,
    email,
    initials,
    avatarUrl,
  };
};