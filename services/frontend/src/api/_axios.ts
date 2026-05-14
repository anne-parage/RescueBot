import axios from 'axios';
import { useDebugLogStore } from '@/store/useDebugLogStore';

let installed = false;

export function installAxiosLogger(): void {
  if (installed) return;
  installed = true;

  axios.interceptors.request.use((config) => {
    const url = config.url ?? '';
    if (url.startsWith('/api/')) {
      const method = (config.method ?? 'get').toUpperCase();
      useDebugLogStore.getState().push({
        kind: 'cmd',
        label: `${method} ${url}`,
        payload: config.data,
      });
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const url = error?.config?.url ?? '';
      if (typeof url === 'string' && url.startsWith('/api/')) {
        useDebugLogStore.getState().push({
          kind: 'err',
          label: `${url} → ${error?.response?.status ?? 'network error'}`,
          payload: error?.response?.data ?? error?.message,
        });
      }
      return Promise.reject(error);
    },
  );
}
