import pkg from "../../package.json";

export const APP_VERSION: string = pkg.version;
/** Phiên bản hợp đồng API — tăng khi đổi hình dạng response (dùng cho bài contract testing) */
export const API_VERSION = "1";
