import AppLayout from '@/layout/AppLayout.vue';
import { sessionState } from '@/service/session';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '',
                    name: 'dashboard',
                    component: () => import('@/views/access/Dashboard.vue')
                },
                {
                    path: '/system-users',
                    name: 'system-users',
                    component: () => import('@/views/access/SystemUsersPage.vue')
                },
                {
                    path: '/holiday-cache',
                    name: 'holiday-cache',
                    component: () => import('@/views/access/HolidayCachePage.vue')
                },
                {
                    path: '/users',
                    name: 'users',
                    component: () => import('@/views/access/UsersPage.vue')
                },
                {
                    path: '/devices',
                    name: 'devices',
                    component: () => import('@/views/access/DevicesPage.vue')
                },
                {
                    path: '/attendances',
                    name: 'attendances',
                    component: () => import('@/views/access/AttendancesPage.vue')
                },
                {
                    path: '/attendance-records',
                    name: 'attendance-records',
                    component: () => import('@/views/access/AttendanceRecordsPage.vue')
                },
                {
                    path: '/door',
                    name: 'door',
                    component: () => import('@/views/access/DoorPage.vue')
                }
            ]
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue'),
            meta: { guestOnly: true }
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/views/pages/auth/Access.vue')
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue')
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/'
        }
    ]
});

router.beforeEach((to) => {
    if (to.meta.requiresAuth && !sessionState.isAuthenticated.value) {
        return { name: 'login', query: { redirect: to.fullPath } };
    }

    if (to.meta.guestOnly && sessionState.isAuthenticated.value) {
        return { name: 'dashboard' };
    }

    return true;
});

export default router;
