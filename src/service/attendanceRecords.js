import { clearSession, sessionState } from './session';
import { httpRequest } from './http';

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

export const attendanceRecordsService = {
    list(params) {
        return httpRequest('/attendance-records', { query: params });
    },
    recalculate(payload) {
        return httpRequest('/attendance-records/recalculate', { method: 'POST', body: payload });
    },
    ruleSettings() {
        return httpRequest('/attendance-records/rule-settings');
    },
    updateRuleSettings(payload) {
        return httpRequest('/attendance-records/rule-settings', { method: 'PUT', body: payload });
    },
    holidayCacheStatus() {
        return httpRequest('/attendance-records/holiday-cache/status');
    },
    holidayCacheCalendar(params) {
        return httpRequest('/attendance-records/holiday-cache/calendar', { query: params });
    },
    holidayCacheSettings() {
        return httpRequest('/attendance-records/holiday-cache/settings');
    },
    updateHolidayCacheSettings(payload) {
        return httpRequest('/attendance-records/holiday-cache/settings', { method: 'PUT', body: payload });
    },
    refreshHolidayCache(payload) {
        return httpRequest('/attendance-records/holiday-cache/refresh', { method: 'POST', body: payload });
    },
    exportMonthlySettings() {
        return httpRequest('/attendance-records/export/monthly/settings');
    },
    updateExportMonthlySettings(payload) {
        return httpRequest('/attendance-records/export/monthly/settings', { method: 'PUT', body: payload });
    },
    async exportMonthly(params) {
        const response = await fetch(buildUrl('/attendance-records/export/monthly', params), {
            headers: sessionState.accessToken.value
                ? {
                      Authorization: `Bearer ${sessionState.accessToken.value}`
                  }
                : {}
        });

        if (!response.ok) {
            if (response.status === 401) {
                clearSession();
            }

            const text = await response.text();
            throw new Error(text || '导出失败');
        }

        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="([^"]+)"/);
        return {
            blob,
            filename: match?.[1] || 'attendance.csv'
        };
    }
};
