const TOKEN_PREFIX = 'uj1.';

const toBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

export const encodeUrgentJobCodeForUrl = (jobCode: string): string => {
  return `${TOKEN_PREFIX}${toBase64Url(jobCode)}`;
};

export const decodeUrgentJobCodeFromUrl = (token: string): string => {
  if (!token) {
    return '';
  }

  if (!token.startsWith(TOKEN_PREFIX)) {
    return token;
  }

  try {
    return fromBase64Url(token.slice(TOKEN_PREFIX.length));
  } catch {
    return '';
  }
};

export const buildUrgentJobUpdateLink = (jobCode: string): string => {
  const encodedToken = encodeUrgentJobCodeForUrl(jobCode);
  return `${window.location.origin}/urgent-job-update?jobCode=${encodeURIComponent(encodedToken)}`;
};