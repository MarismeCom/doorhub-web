<script setup>
import { dashboardService } from '@/service/dashboard';
import { useLayout } from '@/layout/composables/layout';
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const { layoutConfig, isDarkTheme } = useLayout();

const loading = ref(false);
const summary = ref({
    users: { total: 0, active: 0, disabled: 0 },
    devices: { total: 0, active: 0, inactive: 0 },
    attendances: { total: 0, recent_7d: [] },
    sync_status: []
});

const userStatusChartData = ref(null);
const userStatusChartOptions = ref(null);
const deviceStatusChartData = ref(null);
const deviceStatusChartOptions = ref(null);
const attendanceTrendChartData = ref(null);
const attendanceTrendChartOptions = ref(null);
const syncStatusChartData = ref(null);
const syncStatusChartOptions = ref(null);

const statCards = computed(() => [
    {
        title: '门禁用户',
        value: summary.value.users.total,
        accent: 'bg-emerald-500',
        note: `在职 ${summary.value.users.active} / 离职 ${summary.value.users.disabled}`
    },
    {
        title: '设备总数',
        value: summary.value.devices.total,
        accent: 'bg-orange-500',
        note: `启用 ${summary.value.devices.active} / 停用 ${summary.value.devices.inactive}`
    },
    {
        title: '打卡记录',
        value: summary.value.attendances.total,
        accent: 'bg-cyan-500',
        note: `近 7 天 ${recent7dTotal.value} 条`
    },
    {
        title: '待处理同步',
        value: pendingSyncTotal.value,
        accent: 'bg-rose-500',
        note: '含待同步、待离职同步、失败'
    }
]);

const recent7dTotal = computed(() => summary.value.attendances.recent_7d.reduce((sum, item) => sum + item.count, 0));
const pendingSyncTotal = computed(() =>
    summary.value.sync_status
        .filter((item) => ['pending', 'pending_disable', 'failed'].includes(item.status))
        .reduce((sum, item) => sum + item.count, 0)
);

async function loadSummary() {
    loading.value = true;
    try {
        const response = await dashboardService.summary();
        summary.value = response.data;
        refreshCharts();
    } catch (error) {
        toast.add({ severity: 'error', summary: '工作台加载失败', detail: error.message, life: 3000 });
    } finally {
        loading.value = false;
    }
}

function chartPalette() {
    const documentStyle = getComputedStyle(document.documentElement);
    return {
        text: documentStyle.getPropertyValue('--text-color'),
        textMuted: documentStyle.getPropertyValue('--text-color-secondary'),
        border: documentStyle.getPropertyValue('--surface-border'),
        emerald: documentStyle.getPropertyValue('--p-emerald-500') || '#10b981',
        emeraldSoft: documentStyle.getPropertyValue('--p-emerald-300') || '#6ee7b7',
        rose: documentStyle.getPropertyValue('--p-rose-500') || '#f43f5e',
        amber: documentStyle.getPropertyValue('--p-amber-500') || '#f59e0b',
        cyan: documentStyle.getPropertyValue('--p-cyan-500') || '#06b6d4',
        orange: documentStyle.getPropertyValue('--p-orange-500') || '#f97316',
        slate: documentStyle.getPropertyValue('--p-surface-400') || '#94a3b8',
        indigo: documentStyle.getPropertyValue('--p-indigo-500') || '#6366f1'
    };
}

function refreshCharts() {
    const palette = chartPalette();

    userStatusChartData.value = {
        labels: ['在职', '离职'],
        datasets: [
            {
                data: [summary.value.users.active, summary.value.users.disabled],
                backgroundColor: [palette.emerald, palette.rose],
                hoverBackgroundColor: [palette.emeraldSoft, '#fb7185']
            }
        ]
    };
    userStatusChartOptions.value = createDoughnutOptions(palette);

    deviceStatusChartData.value = {
        labels: ['启用', '停用'],
        datasets: [
            {
                data: [summary.value.devices.active, summary.value.devices.inactive],
                backgroundColor: [palette.orange, palette.slate]
            }
        ]
    };
    deviceStatusChartOptions.value = createDoughnutOptions(palette);

    attendanceTrendChartData.value = {
        labels: summary.value.attendances.recent_7d.map((item) => item.date.slice(5)),
        datasets: [
            {
                label: '打卡记录',
                data: summary.value.attendances.recent_7d.map((item) => item.count),
                backgroundColor: palette.cyan,
                borderColor: palette.cyan,
                borderRadius: 10,
                barThickness: 28
            }
        ]
    };
    attendanceTrendChartOptions.value = createBarOptions(palette);

    syncStatusChartData.value = {
        labels: summary.value.sync_status.map((item) => syncStatusLabel(item.status)),
        datasets: [
            {
                label: '用户数',
                data: summary.value.sync_status.map((item) => item.count),
                backgroundColor: [palette.emerald, palette.amber, palette.orange, palette.rose, palette.slate, palette.indigo]
            }
        ]
    };
    syncStatusChartOptions.value = createBarOptions(palette, true);
}

function createDoughnutOptions(palette) {
    return {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: palette.text
                }
            }
        }
    };
}

function createBarOptions(palette, horizontal = false) {
    return {
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
            legend: {
                labels: {
                    color: palette.text
                }
            }
        },
        scales: {
            x: {
                ticks: { color: palette.textMuted },
                grid: {
                    color: horizontal ? palette.border : 'transparent',
                    borderColor: 'transparent'
                }
            },
            y: {
                ticks: { color: palette.textMuted },
                grid: {
                    color: horizontal ? 'transparent' : palette.border,
                    borderColor: 'transparent'
                }
            }
        }
    };
}

function syncStatusLabel(status) {
    switch (status) {
        case 'pending':
            return '待同步';
        case 'pending_disable':
            return '待离职同步';
        case 'synced':
            return '已同步';
        case 'synced_disabled':
            return '已离职同步';
        case 'failed':
            return '同步失败';
        default:
            return status;
    }
}

watch([() => layoutConfig.primary, () => layoutConfig.surface, isDarkTheme], refreshCharts);

onMounted(loadSummary);
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12">
            <div class="card overflow-hidden">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 class="text-3xl font-semibold m-0">工作台</h1>
                        <p class="text-color-secondary mt-2 mb-0">聚合门禁用户、设备状态与打卡趋势，帮助你快速判断今日门禁运行情况。</p>
                    </div>
                    <Button label="刷新数据" icon="pi pi-refresh" severity="secondary" :loading="loading" @click="loadSummary" />
                </div>
            </div>
        </div>

        <div v-for="card in statCards" :key="card.title" class="col-span-12 md:col-span-6 xl:col-span-3">
            <div class="card h-full">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <div class="text-sm text-color-secondary mb-3">{{ card.title }}</div>
                        <div class="text-4xl font-semibold mb-2">{{ card.value }}</div>
                        <div class="text-sm text-color-secondary">{{ card.note }}</div>
                    </div>
                    <span :class="['w-3rem h-3rem rounded-full opacity-80', card.accent]"></span>
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-4">
            <div class="card h-full">
                <div class="font-semibold text-xl mb-4">门禁用户结构</div>
                <div class="h-20rem">
                    <Chart type="doughnut" :data="userStatusChartData" :options="userStatusChartOptions" />
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-4">
            <div class="card h-full">
                <div class="font-semibold text-xl mb-4">设备状态分布</div>
                <div class="h-20rem">
                    <Chart type="doughnut" :data="deviceStatusChartData" :options="deviceStatusChartOptions" />
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-4">
            <div class="card h-full">
                <div class="font-semibold text-xl mb-4">用户同步状态</div>
                <div class="h-20rem">
                    <Chart type="bar" :data="syncStatusChartData" :options="syncStatusChartOptions" />
                </div>
            </div>
        </div>

        <div class="col-span-12">
            <div class="card">
                <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <div>
                        <div class="font-semibold text-xl">近 7 天打卡趋势</div>
                        <div class="text-sm text-color-secondary mt-1">按自然日统计，便于观察近期门禁使用峰值。</div>
                    </div>
                    <Tag severity="info" :value="`近 7 天共 ${recent7dTotal} 条`" />
                </div>
                <div class="h-24rem">
                    <Chart type="bar" :data="attendanceTrendChartData" :options="attendanceTrendChartOptions" />
                </div>
            </div>
        </div>
    </div>
</template>
