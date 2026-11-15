import { jwtDecode } from "jwt-decode";
import type { DecodedUserData } from "../types/EntitiesTypes";

export const getTypeFromDay = (days: number): string => {
  if (days === 1) return "day";
  if (days < 7) return `per ${days} days`;
  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? "year" : `${years} years`;
  }
  if (days % 30 === 0) {
    const months = days / 30;
    return months === 1 ? "month" : `${months} months`;
  }
  if (days % 7 === 0) {
    const weeks = days / 7;
    return weeks === 1 ? "week" : `${weeks} weeks`;
  }
  return `per ${days} days`;
}

class JwtUtil {
  static decodeToken(token: string): DecodedUserData | null {
    try {
      const decoded = jwtDecode(token) as DecodedUserData;
      return decoded;
    } catch (error) {
      console.error("Token decode failed:", error);
      return null;
    }
  }

  static validateToken(token: string | null): boolean {
    if (!token) {
      console.warn("JWT Token is missing");
      return false;
    }

    const data = this.decodeToken(token);
    if (!data) return false;

    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (data.exp && data.exp < currentTimestamp) {
      console.warn("Token has expired");
      return false;
    }

    const requiredFields = [
      data.userId,
      data.email,
      data.firstName,
      data.lastName,
      data.roleId
    ];

    if (requiredFields.some(field => field === undefined || field === null)) {
      console.warn("Token is missing required claims");
      return false;
    }

    return true;
  }
}

export default JwtUtil;
