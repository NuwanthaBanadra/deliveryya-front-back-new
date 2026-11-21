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
  private static readonly branchStorageKey = "deliveryya_branch_id";
  private static readonly branchCipherKey = "DeliveryYaBranchContext";

  static encryptBranchId(branchId: number): string {
    if (!Number.isInteger(branchId) || branchId <= 0) {
      throw new Error("Invalid branch ID");
    }

    const value = `BID-${branchId}`;
    const encoded = Array.from(value)
      .map((character, index) => character.charCodeAt(0) ^ this.branchCipherKey.charCodeAt(index % this.branchCipherKey.length))
      .map((code) => code.toString(16).padStart(2, "0"))
      .join("");
    return btoa(encoded);
  }

  static decryptBranchId(value: string | null): number | null {
    if (!value) return null;

    try {
      const hex = atob(value);
      const decoded = Array.from({ length: hex.length / 2 }, (_, index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16))
        .map((code, index) => String.fromCharCode(code ^ this.branchCipherKey.charCodeAt(index % this.branchCipherKey.length)))
        .join("");
      if (!decoded.startsWith("BID-")) return null;

      const branchId = Number(decoded.slice(4));
      return Number.isInteger(branchId) && branchId > 0 ? branchId : null;
    } catch (error) {
      console.warn("Invalid branch context", error);
      return null;
    }
  }

  static setBranchId(branchId: number): void {
    localStorage.setItem(this.branchStorageKey, this.encryptBranchId(branchId));
  }

  static getBranchId(): number | null {
    return this.decryptBranchId(localStorage.getItem(this.branchStorageKey));
  }

  static clearBranchId(): void {
    localStorage.removeItem(this.branchStorageKey);
  }

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
