import { httpRequest } from './http';

export const usersService = {
    list(params) {
        return httpRequest('/users', { query: params });
    },
    create(payload) {
        return httpRequest('/users', { method: 'POST', body: payload });
    },
    nextUserId() {
        return httpRequest('/users/next-user-id');
    },
    update(userId, payload) {
        return httpRequest(`/users/${userId}`, { method: 'PUT', body: payload });
    },
    remove(userId) {
        return httpRequest(`/users/${userId}`, { method: 'DELETE' });
    },
    syncOne(userId, deviceIp) {
        return httpRequest(`/users/${userId}/sync`, { method: 'POST', query: { device_ip: deviceIp } });
    },
    syncBatch(deviceIp) {
        return httpRequest('/users/sync/batch', { method: 'POST', query: { device_ip: deviceIp } });
    },
    syncFromDevice(payload) {
        return httpRequest('/users/sync/from-device', { method: 'POST', body: payload });
    },
    syncStatus(userId) {
        return httpRequest('/users/sync/status', { query: userId ? { user_id: userId } : undefined });
    }
};
