/**
 * Đặc tả OpenAPI 3.1 của QA Shop — nguồn sự thật cho API test và contract test.
 * Phục vụ tại GET /api/openapi.json.
 */
import { COUPONS, MAX_QUANTITY_PER_LINE } from "@/lib/domain/pricing";
import { SEED_ACCOUNTS } from "@/lib/domain/seed";
import { PAGE_SIZE_MAX, PRODUCT_SORTS } from "@/lib/domain/shop";
import { STATUS_BY_CODE } from "@/lib/domain/errors";
import { APP_VERSION } from "./version";

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema: object) => ({ content: { "application/json": { schema } } });
const ok = (description: string, schema: object) => ({ description, ...jsonBody(schema) });
const err = (description: string) => ({ description, ...jsonBody(ref("Error")) });

const auth = [{ bearerAuth: [] }, { cookieAuth: [] }];
const sessionParam = { $ref: "#/components/parameters/SessionId" };

const money = { type: "integer", minimum: 0, description: "VND" };

export function buildOpenApi() {
  return {
    openapi: "3.1.0",
    info: {
      title: "QA Shop API",
      version: APP_VERSION,
      description: [
        "API của ứng dụng e-commerce mẫu dùng để luyện kiểm thử.",
        "",
        "**Session:** mỗi session có dữ liệu riêng. Gửi header `X-Session-Id` (8–64 ký tự `[A-Za-z0-9_-]`) để cô lập dữ liệu cho từng test; nếu không gửi, server tạo session mới và trả về qua cookie `qa_session` + header `X-Session-Id`.",
        "**Reset:** `POST /api/reset` đưa session về dữ liệu seed cố định.",
        `**Tài khoản mẫu:** ${SEED_ACCOUNTS.customer.email} / ${SEED_ACCOUNTS.customer.password} · ${SEED_ACCOUNTS.admin.email} / ${SEED_ACCOUNTS.admin.password} · ${SEED_ACCOUNTS.locked.email} (bị khoá).`,
        `**Mã giảm giá:** ${COUPONS.map((c) => `\`${c.code}\` — ${c.description}`).join("; ")}.`,
      ].join("\n"),
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "System" },
      { name: "Auth" },
      { name: "Products" },
      { name: "Cart" },
      { name: "Orders" },
    ],
    paths: {
      "/api/health": {
        get: { tags: ["System"], summary: "Trạng thái dịch vụ", responses: { 200: ok("OK", ref("Health")) } },
      },
      "/api/reset": {
        post: {
          tags: ["System"],
          summary: "Đưa session về dữ liệu seed",
          parameters: [sessionParam],
          responses: {
            200: ok("Đã reset", { type: "object", required: ["ok", "sessionId"], properties: { ok: { const: true }, sessionId: { type: "string" } } }),
            400: err("X-Session-Id sai định dạng"),
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Đăng nhập",
          parameters: [sessionParam],
          requestBody: { required: true, ...jsonBody(ref("LoginRequest")) },
          responses: {
            200: ok("Đăng nhập thành công; đồng thời đặt cookie qa_token", ref("AuthResponse")),
            401: err("INVALID_CREDENTIALS"),
            403: err("ACCOUNT_LOCKED"),
            422: err("VALIDATION_FAILED"),
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Đăng ký tài khoản (tự đăng nhập)",
          parameters: [sessionParam],
          requestBody: { required: true, ...jsonBody(ref("RegisterRequest")) },
          responses: {
            201: ok("Đã tạo", ref("AuthResponse")),
            409: err("EMAIL_TAKEN"),
            422: err("VALIDATION_FAILED"),
          },
        },
      },
      "/api/auth/logout": {
        post: { tags: ["Auth"], summary: "Đăng xuất (idempotent)", parameters: [sessionParam], responses: { 204: { description: "Đã đăng xuất" } } },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Người dùng hiện tại",
          security: auth,
          parameters: [sessionParam],
          responses: { 200: ok("OK", { type: "object", required: ["user"], properties: { user: ref("User") } }), 401: err("UNAUTHORIZED") },
        },
      },
      "/api/categories": {
        get: {
          tags: ["Products"],
          summary: "Danh mục sản phẩm",
          responses: {
            200: ok("OK", {
              type: "object",
              required: ["items"],
              properties: { items: { type: "array", items: { type: "object", required: ["id", "label"], properties: { id: ref("Category"), label: { type: "string" } } } } },
            }),
          },
        },
      },
      "/api/products": {
        get: {
          tags: ["Products"],
          summary: "Danh sách sản phẩm (tìm kiếm, lọc, sắp xếp, phân trang)",
          parameters: [
            sessionParam,
            { name: "q", in: "query", schema: { type: "string" }, description: "Tìm theo tên, SKU, mô tả; không phân biệt dấu" },
            { name: "category", in: "query", schema: ref("Category") },
            { name: "sort", in: "query", schema: { type: "string", enum: PRODUCT_SORTS, default: "relevance" } },
            { name: "inStock", in: "query", schema: { type: "boolean" }, description: "true: chỉ sản phẩm còn hàng" },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: PAGE_SIZE_MAX, default: 12 } },
          ],
          responses: { 200: ok("OK", ref("ProductPage")), 422: err("VALIDATION_FAILED") },
        },
      },
      "/api/products/{id}": {
        get: {
          tags: ["Products"],
          summary: "Chi tiết sản phẩm",
          parameters: [sessionParam, { name: "id", in: "path", required: true, schema: { type: "string" }, example: "p-1" }],
          responses: { 200: ok("OK", ref("Product")), 404: err("PRODUCT_NOT_FOUND") },
        },
      },
      "/api/cart": {
        get: { tags: ["Cart"], summary: "Giỏ hàng", security: auth, parameters: [sessionParam], responses: { 200: ok("OK", ref("Cart")), 401: err("UNAUTHORIZED") } },
      },
      "/api/cart/items": {
        post: {
          tags: ["Cart"],
          summary: `Thêm sản phẩm (cộng dồn; mỗi dòng tối đa ${MAX_QUANTITY_PER_LINE} và không vượt tồn kho)`,
          security: auth,
          parameters: [sessionParam],
          requestBody: {
            required: true,
            ...jsonBody({
              type: "object",
              required: ["productId"],
              properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1, maximum: MAX_QUANTITY_PER_LINE, default: 1 } },
            }),
          },
          responses: {
            201: ok("Giỏ hàng sau khi thêm", ref("Cart")),
            401: err("UNAUTHORIZED"),
            404: err("PRODUCT_NOT_FOUND"),
            409: err("OUT_OF_STOCK"),
            422: err("QUANTITY_OUT_OF_RANGE / VALIDATION_FAILED"),
          },
        },
      },
      "/api/cart/items/{productId}": {
        patch: {
          tags: ["Cart"],
          summary: "Đặt lại số lượng",
          security: auth,
          parameters: [sessionParam, { name: "productId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            ...jsonBody({ type: "object", required: ["quantity"], properties: { quantity: { type: "integer", minimum: 1, maximum: MAX_QUANTITY_PER_LINE } } }),
          },
          responses: { 200: ok("OK", ref("Cart")), 401: err("UNAUTHORIZED"), 404: err("NOT_FOUND"), 409: err("OUT_OF_STOCK"), 422: err("QUANTITY_OUT_OF_RANGE") },
        },
        delete: {
          tags: ["Cart"],
          summary: "Xoá khỏi giỏ",
          security: auth,
          parameters: [sessionParam, { name: "productId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: ok("OK", ref("Cart")), 401: err("UNAUTHORIZED"), 404: err("NOT_FOUND") },
        },
      },
      "/api/cart/coupon": {
        post: {
          tags: ["Cart"],
          summary: "Áp mã giảm giá (thay mã đang có)",
          security: auth,
          parameters: [sessionParam],
          requestBody: { required: true, ...jsonBody({ type: "object", required: ["code"], properties: { code: { type: "string", example: "SAVE10" } } }) },
          responses: {
            200: ok("OK", ref("Cart")),
            401: err("UNAUTHORIZED"),
            404: err("COUPON_NOT_FOUND"),
            422: err("COUPON_EXPIRED / COUPON_MIN_SUBTOTAL / COUPON_NOT_ELIGIBLE / VALIDATION_FAILED"),
          },
        },
        delete: { tags: ["Cart"], summary: "Bỏ mã giảm giá", security: auth, parameters: [sessionParam], responses: { 200: ok("OK", ref("Cart")), 401: err("UNAUTHORIZED") } },
      },
      "/api/orders": {
        get: {
          tags: ["Orders"],
          summary: "Đơn hàng của tôi (mới nhất trước)",
          security: auth,
          parameters: [sessionParam],
          responses: { 200: ok("OK", { type: "object", required: ["items"], properties: { items: { type: "array", items: ref("Order") } } }), 401: err("UNAUTHORIZED") },
        },
        post: {
          tags: ["Orders"],
          summary: "Đặt hàng từ giỏ hiện tại (trừ tồn kho, xoá giỏ)",
          security: auth,
          parameters: [sessionParam],
          requestBody: { required: true, ...jsonBody(ref("CheckoutRequest")) },
          responses: {
            201: ok("Đã tạo đơn", ref("Order")),
            401: err("UNAUTHORIZED"),
            409: err("CART_EMPTY / OUT_OF_STOCK / COUPON_NO_LONGER_VALID"),
            422: err("VALIDATION_FAILED"),
          },
        },
      },
      "/api/orders/{id}": {
        get: {
          tags: ["Orders"],
          summary: "Chi tiết đơn hàng (đơn của người khác trả 404)",
          security: auth,
          parameters: [sessionParam, { name: "id", in: "path", required: true, schema: { type: "string" }, example: "ORD-0001" }],
          responses: { 200: ok("OK", ref("Order")), 401: err("UNAUTHORIZED"), 404: err("NOT_FOUND") },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "Token nhận từ /api/auth/login hoặc /api/auth/register" },
        cookieAuth: { type: "apiKey", in: "cookie", name: "qa_token" },
      },
      parameters: {
        SessionId: {
          name: "X-Session-Id",
          in: "header",
          required: false,
          schema: { type: "string", pattern: "^[A-Za-z0-9_-]{8,64}$" },
          description: "Cô lập dữ liệu theo session. Khuyến nghị: mỗi test một giá trị riêng.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", enum: Object.keys(STATUS_BY_CODE) },
                message: { type: "string" },
                fields: { type: "array", items: { type: "object", required: ["field", "message"], properties: { field: { type: "string" }, message: { type: "string" } } } },
              },
            },
          },
        },
        Health: {
          type: "object",
          required: ["status", "version", "apiVersion", "storage"],
          properties: {
            status: { const: "ok" },
            version: { type: "string" },
            apiVersion: { type: "string" },
            storage: { enum: ["memory", "redis"] },
            warning: { type: "string", description: "Chỉ có khi cấu hình lưu trữ không phù hợp với môi trường chạy" },
          },
        },
        Category: { type: "string", enum: ["books", "electronics", "accessories"] },
        User: {
          type: "object",
          required: ["id", "name", "email", "role"],
          additionalProperties: false,
          properties: { id: { type: "string" }, name: { type: "string" }, email: { type: "string", format: "email" }, role: { enum: ["customer", "admin"] } },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string", example: SEED_ACCOUNTS.customer.email }, password: { type: "string", example: SEED_ACCOUNTS.customer.password } },
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password", "confirmPassword"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 50 },
            email: { type: "string", format: "email", maxLength: 254 },
            password: { type: "string", minLength: 8, maxLength: 64, description: "Ít nhất 1 chữ cái và 1 chữ số" },
            confirmPassword: { type: "string" },
          },
        },
        AuthResponse: { type: "object", required: ["token", "user"], properties: { token: { type: "string" }, user: ref("User") } },
        Product: {
          type: "object",
          required: ["id", "sku", "name", "description", "category", "price", "stock", "image"],
          properties: {
            id: { type: "string" },
            sku: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            category: ref("Category"),
            price: money,
            stock: { type: "integer", minimum: 0 },
            image: { type: "string" },
          },
        },
        ProductPage: {
          type: "object",
          required: ["items", "page", "limit", "total", "totalPages"],
          properties: {
            items: { type: "array", items: ref("Product") },
            page: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1 },
            total: { type: "integer", minimum: 0 },
            totalPages: { type: "integer", minimum: 1 },
          },
        },
        CartLine: {
          type: "object",
          required: ["productId", "name", "unitPrice", "quantity", "lineTotal", "inStock"],
          properties: { productId: { type: "string" }, name: { type: "string" }, unitPrice: money, quantity: { type: "integer", minimum: 1 }, lineTotal: money, inStock: { type: "boolean" } },
        },
        Cart: {
          type: "object",
          required: ["lines", "itemCount", "subtotal", "discount", "shippingFee", "total", "coupon", "couponProblem"],
          properties: {
            lines: { type: "array", items: ref("CartLine") },
            itemCount: { type: "integer", minimum: 0 },
            subtotal: money,
            discount: money,
            shippingFee: money,
            total: money,
            coupon: { oneOf: [{ type: "null" }, { type: "object", required: ["code", "description"], properties: { code: { type: "string" }, description: { type: "string" } } }] },
            couponProblem: { type: ["string", "null"], description: "Mã đang gắn nhưng không còn hợp lệ (ví dụ giỏ giảm dưới mức tối thiểu)" },
          },
        },
        ShippingAddress: {
          type: "object",
          required: ["fullName", "phone", "address", "city"],
          properties: {
            fullName: { type: "string", minLength: 2, maxLength: 80 },
            phone: { type: "string", pattern: "^0\\d{9}$", description: "Cho phép nhập kèm khoảng trắng/dấu chấm; server chuẩn hoá" },
            address: { type: "string", minLength: 5, maxLength: 200 },
            city: { type: "string", minLength: 2, maxLength: 50 },
          },
        },
        CheckoutRequest: {
          type: "object",
          required: ["shippingAddress", "paymentMethod"],
          properties: { shippingAddress: ref("ShippingAddress"), paymentMethod: { enum: ["cod", "card"] } },
        },
        Order: {
          type: "object",
          required: ["id", "userId", "lines", "subtotal", "discount", "shippingFee", "total", "couponCode", "shippingAddress", "paymentMethod", "status", "createdAt"],
          properties: {
            id: { type: "string", pattern: "^ORD-\\d{4,}$" },
            userId: { type: "string" },
            lines: {
              type: "array",
              items: {
                type: "object",
                required: ["productId", "name", "unitPrice", "quantity", "lineTotal"],
                properties: { productId: { type: "string" }, name: { type: "string" }, unitPrice: money, quantity: { type: "integer" }, lineTotal: money },
              },
            },
            subtotal: money,
            discount: money,
            shippingFee: money,
            total: money,
            couponCode: { type: ["string", "null"] },
            shippingAddress: ref("ShippingAddress"),
            paymentMethod: { enum: ["cod", "card"] },
            status: { enum: ["confirmed"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  };
}
