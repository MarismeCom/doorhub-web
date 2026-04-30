import { httpRequest } from './http';

export const systemUsersService = {
    getMe() {
        return httpRequest('/system-users/me');
    },
    list() {
        return httpRequest('/system-users');
    },
    get(username) {
        return httpRequest(`/system-users/${username}`);
    },
    create(payload) {
        return httpRequest('/system-users', { method: 'POST', body: payload });
    },
    update(username, payload) {
        return httpRequest(`/system-users/${username}`, { method: 'PATCH', body: payload });
    },
    resetPassword(username, payload) {
        return httpRequest(`/system-users/${username}/reset-password`, { method: 'POST', body: payload });
    },
    listApiSecrets(username) {
        return httpRequest(`/system-users/${username}/api-secrets`);
    },
    createApiSecret(username, payload) {
        return httpRequest(`/system-users/${username}/api-secrets`, { method: 'POST', body: payload });
    },
    revokeApiSecret(username, secretId) {
        return httpRequest(`/system-users/${username}/api-secrets/${secretId}`, { method: 'DELETE' });
    },
    changePassword(payload) {
        return httpRequest('/system-users/me/change-password', { method: 'POST', body: payload });
    }
};
