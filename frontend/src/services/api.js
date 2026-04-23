import axios from "axios";

export const TOKEN_KEY = "sgms_auth_token";
export const USER_KEY = "sgms_user_profile";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:7000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getMessageFromError = (error) => {
  if (error?.code === "ERR_NETWORK") {
    return `Cannot connect to backend at ${API_BASE_URL}. Make sure backend is running and reachable.`;
  }
  return error?.response?.data?.message || "Something went wrong. Please try again.";
};

const request = async (method, url, data, params) => {
  try {
    const response = await api({ method, url, data, params });
    return response.data;
  } catch (error) {
    const wrappedError = new Error(getMessageFromError(error));
    wrappedError.status = error?.response?.status;
    throw wrappedError;
  }
};

export const registerUser = (payload) => request("post", "/api/register", payload);
export const loginUser = (payload) => request("post", "/api/login", payload);
export const logoutUser = () => request("post", "/api/logout");

export const createGrievance = (payload) => request("post", "/api/grievances", payload);
export const fetchGrievances = () => request("get", "/api/grievances");
export const fetchGrievanceById = (id) => request("get", `/api/grievances/${id}`);
export const updateGrievance = (id, payload) => request("put", `/api/grievances/${id}`, payload);
export const removeGrievance = (id) => request("delete", `/api/grievances/${id}`);
export const searchGrievances = (title) =>
  request("get", "/api/grievances/search", undefined, { title });

export const saveSession = ({ token, user }) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => Boolean(localStorage.getItem(TOKEN_KEY));

export const getStoredUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const storeUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
