import { httpRequest } from './http';

export const attendancesService = {
    list(params) {
        return httpRequest('/attendances', { query: params });
    },
    sync(payload) {
        return httpRequest('/attendances/sync', { method: 'POST', body: payload });
    },
    syncStatus() {
        return httpRequest('/attendances/sync/status');
    },
    syncSettings() {
        return httpRequest('/attendances/sync/settings');
    },
    updateSyncSettings(payload) {
        return httpRequest('/attendances/sync/settings', { method: 'PUT', body: payload });
    }
};
