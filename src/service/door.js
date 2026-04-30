import { httpRequest } from './http';

export const doorService = {
    open(payload) {
        return httpRequest('/door/open', { method: 'POST', body: payload });
    },
    close(payload) {
        return httpRequest('/door/close', { method: 'POST', body: payload });
    },
    logs(params) {
        return httpRequest('/door/logs', { query: params });
    }
};
