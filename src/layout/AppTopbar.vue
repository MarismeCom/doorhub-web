<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useLayout } from '@/layout/composables/layout';
import AppConfigurator from './AppConfigurator.vue';
import { logout } from '@/service/auth';
import { sessionState } from '@/service/session';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const router = useRouter();
const mobileUserMenuOpen = ref(false);

const username = computed(() => sessionState.currentUser.value?.username || '未登录');
const role = computed(() => sessionState.currentUser.value?.role || '-');

watch(
    () => router.currentRoute.value.fullPath,
    () => {
        mobileUserMenuOpen.value = false;
    }
);

function handleLogout() {
    mobileUserMenuOpen.value = false;
    logout();
    router.push('/auth/login');
}
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo">
                <i class="pi pi-shield text-primary text-2xl"></i>
                <span>DoorHub</span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
                <div class="relative">
                    <button
                        v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'p-anchored-overlay-enter-active', leaveToClass: 'hidden', leaveActiveClass: 'p-anchored-overlay-leave-active', hideOnOutsideClick: true }"
                        type="button"
                        class="layout-topbar-action layout-topbar-action-highlight"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <AppConfigurator />
                </div>
            </div>

            <div class="layout-topbar-menu hidden min-[1280px]:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-user"></i>
                        <span>{{ username }}</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-verified"></i>
                        <span>{{ role }}</span>
                    </button>
                    <button type="button" class="layout-topbar-action" @click="handleLogout">
                        <i class="pi pi-sign-out"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            <div class="relative min-[1280px]:hidden">
                <button type="button" class="layout-topbar-action" @click="mobileUserMenuOpen = !mobileUserMenuOpen">
                    <i class="pi pi-user"></i>
                </button>

                <div v-if="mobileUserMenuOpen" class="layout-topbar-menu">
                    <div class="layout-topbar-menu-content">
                        <button type="button" class="layout-topbar-action">
                            <i class="pi pi-user"></i>
                            <span>{{ username }}</span>
                        </button>
                        <button type="button" class="layout-topbar-action">
                            <i class="pi pi-verified"></i>
                            <span>{{ role }}</span>
                        </button>
                        <button type="button" class="layout-topbar-action" @click="handleLogout">
                            <i class="pi pi-sign-out"></i>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
