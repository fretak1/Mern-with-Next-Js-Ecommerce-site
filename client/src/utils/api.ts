const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiBaseUrl = rawApiUrl && rawApiUrl !== "undefined" ? rawApiUrl : "http://localhost:3001";

export const API_BASE_URL = apiBaseUrl.replace(/\/$/, "");

export const API_ROUTES = {
  AUTH: `${API_BASE_URL}/api/auth`,
  PRODUCTS: `${API_BASE_URL}/api/products`,
  COUPON: `${API_BASE_URL}/api/coupon`,
  SETTINGS: `${API_BASE_URL}/api/settings`,
  CART: `${API_BASE_URL}/api/cart`,
  ADDRESS: `${API_BASE_URL}/api/address`,
  ORDER: `${API_BASE_URL}/api/order`,
  COMMENTS: `${API_BASE_URL}/api/messages`,
  NEWSLETTER: `${API_BASE_URL}/api/newsletter`,
  PAYMENT: `${API_BASE_URL}/api/payment`,
};