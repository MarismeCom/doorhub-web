<script setup>
import { ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: '总览',
        items: [
            {
                label: '工作台',
                icon: 'pi pi-home',
                to: '/'
            }
        ]
    },
    {
        label: '考勤服务',
        items: [
            {
                label: '打卡流水',
                icon: 'pi pi-calendar-clock',
                to: '/attendances'
            },
            {
                label: '考勤记录',
                icon: 'pi pi-calendar',
                to: '/attendance-records'
            }
        ]
    },
    {
        label: '门禁服务',
        items: [
            {
                label: '门禁用户',
                icon: 'pi pi-id-card',
                to: '/users'
            },
            {
                label: '门禁控制',
                icon: 'pi pi-lock-open',
                to: '/door'
            }
        ]
    },
    {
        label: '系统管理',
        items: [
            {
                label: '节假日',
                icon: 'pi pi-calendar-plus',
                to: '/holiday-cache'
            },
            {
                label: '设备管理',
                icon: 'pi pi-desktop',
                to: '/devices'
            },
            {
                label: '系统用户',
                icon: 'pi pi-users',
                to: '/system-users'
            }
        ]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>
