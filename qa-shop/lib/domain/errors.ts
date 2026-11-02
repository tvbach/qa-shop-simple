/**
 * Lỗi nghiệp vụ có mã ổn định — test nên khẳng định theo `code`, không theo `message`.
 */
export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PRODUCT_NOT_FOUND"
  | "EMAIL_TAKEN"
  | "OUT_OF_STOCK"
  | "QUANTITY_OUT_OF_RANGE"
  | "CART_EMPTY"
  | "COUPON_NOT_FOUND"
  | "COUPON_EXPIRED"
  | "COUPON_MIN_SUBTOTAL"
  | "COUPON_NOT_ELIGIBLE"
  | "COUPON_NO_LONGER_VALID"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_LOCKED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  OUT_OF_STOCK: 409,
  QUANTITY_OUT_OF_RANGE: 422,
  CART_EMPTY: 409,
  COUPON_NOT_FOUND: 404,
  COUPON_EXPIRED: 422,
  COUPON_MIN_SUBTOTAL: 422,
  COUPON_NOT_ELIGIBLE: 422,
  COUPON_NO_LONGER_VALID: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export interface FieldError {
  field: string;
  message: string;
}

export class ShopError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fields?: FieldError[],
  ) {
    super(message);
    this.name = "ShopError";
  }

  get status(): number {
    return STATUS_BY_CODE[this.code];
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...(this.fields ? { fields: this.fields } : {}) } };
  }
}
