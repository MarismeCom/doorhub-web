import { httpRequest } from './http';

export const devicesService = {
    list() {
        return httpRequest('/devices');
    },
    create(payload) {
        return httpRequest('/devices', { method: 'POST', body: payload });
    },
    update(deviceId, payload) {
        return httpRequest(`/devices/${deviceId}`, { method: 'PUT', body: payload });
    },
    remove(deviceId) {
        return httpRequest(`/devices/${deviceId}`, { method: 'DELETE' });
    },
    status(ip) {
        return httpRequest(`/devices/${ip}/status`);
    }
};
