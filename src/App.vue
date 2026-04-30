<script setup>
import { onMounted } from 'vue';
import { sessionState } from '@/service/session';
import { loadCurrentUser, logout } from '@/service/auth';

onMounted(async () => {
    if (!sessionState.accessToken.value) {
        return;
    }

    try {
        await loadCurrentUser();
    } catch {
        logout();
    }
});
</script>

<template>
    <router-view />
    <ConfirmDialog />
</template>

<style scoped></style>
