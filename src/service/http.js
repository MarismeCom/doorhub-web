import { clearSession, sessionState } from './session';

const RUNTIME_API_BASE_URL = window.__APP_CONFIG__?.API_BASE_URL;
const API_BASE_URL = RUNTIME_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

function buildUrl(path, query) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${API_BASE_URL}${normalizedPath}`, window.location.origin);

    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });
    }

    return url.toString();
}

export async function httpRequest(path, options = {}) {
    const {
        method = 'GET',
        body,
        query,
        auth = true,
        headers = {}
    } = options;

    const requestHeaders = {
        Accept: 'application/json',
        ...headers
    };

    if (body !== undefined) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    if (auth && sessionState.accessToken.value) {
        requestHeaders.Authorization = `Bearer ${sessionState.accessToken.value}`;
    }

    const response = await fetch(buildUrl(path, query), {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401) {
            clearSession();
        }

        const detail = payload.detail || {};
        const message = detail.message || payload.message || '请求失败';
        const error = new Error(message);
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    if (payload.code && payload.code !== 0) {
        const error = new Error(payload.message || '请求失败');
        error.payload = payload;
        throw error;
    }

    return payload;
}
