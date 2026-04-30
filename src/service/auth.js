import { httpRequest } from './http';
import { clearSession, setSession, updateCurrentUser } from './session';

export async function login(username, password) {
    const payload = await httpRequest('/auth/login', {
        method: 'POST',
        auth: false,
        body: { username, password }
    });

    setSession({
        accessToken: payload.data.access_token,
        refreshToken: payload.data.refresh_token,
        user: null
    });

    const mePayload = await httpRequest('/system-users/me');

    setSession({
        accessToken: payload.data.access_token,
        refreshToken: payload.data.refresh_token,
        user: mePayload.data
    });

    return mePayload.data;
}

export async function refreshAccessToken(refreshToken) {
    const payload = await httpRequest('/auth/refresh', {
        method: 'POST',
        auth: false,
        body: { refresh_token: refreshToken }
    });

    setSession({
        accessToken: payload.data.access_token,
        refreshToken,
        user: JSON.parse(localStorage.getItem('door_access_current_user') || 'null')
    });

    return payload.data;
}

export async function loadCurrentUser() {
    const payload = await httpRequest('/system-users/me');
    updateCurrentUser(payload.data);
    return payload.data;
}

export function logout() {
    clearSession();
}
