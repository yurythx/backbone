import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const isServer = typeof window === 'undefined';
const API_URL = isServer
  ? (process.env.API_URL_INTERNAL || process.env.NEXT_PUBLIC_API_URL || 'http://backbone_backend:8005')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005');

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interface for the queue of failed requests
interface FailedRequest {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const companySlug = typeof window !== 'undefined' ? localStorage.getItem('companySlug') : null;
    const envCompany = process.env.NEXT_PUBLIC_COMPANY_SLUG;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const effectiveCompany = companySlug || envCompany || undefined;
    if (effectiveCompany) {
      config.headers['X-Company-Slug'] = effectiveCompany;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      if (!refreshToken) {
        // No refresh token, logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Redirect to login if needed
          window.location.href = '/';
        }
        return Promise.reject(error);
      }

      try {
        // Use a separate axios instance or manual headers to avoid interceptor recursion
        const companySlug = typeof window !== 'undefined' ? localStorage.getItem('companySlug') : null;

        const response = await axios.post(`${API_URL}/api/accounts/token/refresh/`, {
          refresh: refreshToken,
        }, {
          headers: companySlug ? { 'X-Company-Slug': companySlug } : {}
        });

        const { access } = response.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', access);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        processQueue(null, access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);

        // Logout on refresh fail - Only if it's REALLY a 401/403 (invalid refresh token)
        if (typeof window !== 'undefined') {
          const isAuthError = axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403);

          // Don't redirect if checking current user session (silent check)


          if (isAuthError) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/';
          }
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
