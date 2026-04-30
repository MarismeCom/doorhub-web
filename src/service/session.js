import { computed, ref } from 'vue';

const ACCESS_TOKEN_KEY = 'door_access_access_token';
const REFRESH_TOKEN_KEY = 'door_access_refresh_token';
const USER_KEY = 'door_access_current_user';

const accessToken = ref(localStorage.getItem(ACCESS_TOKEN_KEY) || '');
const refreshToken = ref(localStorage.getItem(REFRESH_TOKEN_KEY) || '');
const currentUser = ref(readStoredUser());

function readStoredUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function setSession(payload) {
    accessToken.value = payload.accessToken || '';
    refreshToken.value = payload.refreshToken || '';
    currentUser.value = payload.user || null;

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken.value);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken.value);

    if (currentUser.value) {
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser.value));
    } else {
        localStorage.removeItem(USER_KEY);
    }
}

export function clearSession() {
    accessToken.value = '';
    refreshToken.value = '';
    currentUser.value = null;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function updateCurrentUser(user) {
    currentUser.value = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export const sessionState = {
    accessToken,
    refreshToken,
    currentUser,
    isAuthenticated: computed(() => Boolean(accessToken.value))
};
