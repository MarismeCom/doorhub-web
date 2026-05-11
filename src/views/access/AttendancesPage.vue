<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { devicesService } from '@/service/devices';
import { attendancesService } from '@/service/attendances';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const loading = ref(false);
const records = ref([]);
const total = ref(0);
const syncResult = ref(null);
const deviceOptions = ref([]);
const syncStatus = ref(null);
const syncStatusTimer = ref(null);
const syncStatusRequestSeq = ref(0);
const syncStatusPolling = ref(false);
const syncStatusLoading = ref(false);
const manualSyncPending = ref(false);
const handledSyncFinishedAt = ref(null);
const savingSchedule = ref(false);
const filters = reactive({
    keyword: '',
    start_date: null,
    end_date: null,
    page: 1,
    page_size: 20
});
const syncForm = reactive({
    device_ip: '192.168.1.201',
    incremental: true
});
const scheduleForm = reactive({
    enabled: false,
    time: '23:00',
    device_ips: []
});

const timeZone = 'Asia/Shanghai';
const statusMeaning = computed(() => '状态字段保留设备原始校验值，常见 0 表示普通记录；如设备型号不同，含义可能略有差异。');
const isSyncRunning = computed(() => manualSyncPending.value || Boolean(syncStatus.value?.status?.running));
const syncProgress = computed(() => {
    if (manualSyncPending.value) {
        return Math.max(syncStatus.value?.status?.progress || 0, 10);
    }
    return syncStatus.value?.status?.progress || 0;
});
const syncMessage = computed(() => {
    if (manualSyncPending.value) {
        return syncStatus.value?.status?.message || '正在同步打卡记录，请稍候';
    }
    if (syncResult.value?.no_new_data) {
        return '没有更多新数据';
    }
    return syncStatus.value?.status?.message || '暂无同步任务';
});
const syncStateLabel = computed(() => {
    if (isSyncRunning.value) {
        return '同步中';
    }
    if (syncProgress.value >= 100) {
        return '已完成';
    }
    return '空闲';
});
const syncStateSeverity = computed(() => {
    if (isSyncRunning.value) {
        return 'warn';
    }
    if (syncProgress.value >= 100) {
        return 'success';
    }
    return 'secondary';
});
const scheduleSummary = computed(() => {
    if (!syncStatus.value?.schedule) {
        return '尚未加载定时同步配置';
    }
    if (!syncStatus.value.schedule.enabled) {
        return '定时同步未启用';
    }
    return `每天 ${syncStatus.value.schedule.time} 执行`;
});
const syncMetricCards = computed(() => {
    const source = syncResult.value || syncStatus.value?.status;
    if (!source) {
        return [];
    }

    return [
        { label: '解析记录', value: source.fetched_count || 0, severity: 'info' },
        { label: '新增记录', value: source.synced_count || 0, severity: 'success' },
        { label: '重复跳过', value: source.duplicate_count || 0, severity: 'warn' },
        { label: '异常跳过', value: source.skipped_invalid_count || 0, severity: 'danger' }
    ];
});

const punchTypeMap = {
    0: { label: '生物识别', severity: 'success' },
    1: { label: '密码', severity: 'warn' },
    2: { label: 'ID 卡', severity: 'info' },
    3: { label: '组合验证', severity: 'help' }
};
const statusTypeMap = {
    1: { label: '指纹', severity: 'success' },
    3: { label: '密码', severity: 'warn' },
    4: { label: 'RF 卡', severity: 'info' },
    15: { label: '人脸', severity: 'help' },
    20: { label: '人脸+指纹', severity: 'contrast' },
    200: { label: '人脸识别', severity: 'secondary' }
};

async function loadDeviceOptions() {
    try {
        const response = await devicesService.list();
        deviceOptions.value = (response.data.devices || []).map((device) => ({
            label: `${device.name} (${device.ip})`,
            value: device.ip
        }));

        if (!syncForm.device_ip && deviceOptions.value.length > 0) {
            syncForm.device_ip = deviceOptions.value[0].value;
        }
    } catch (error) {
        toast.add({ severity: 'warn', summary: '设备列表加载失败', detail: error.message, life: 3000 });
    }
}

async function loadSyncSettings() {
    try {
        const response = await attendancesService.syncSettings();
        scheduleForm.enabled = Boolean(response.data.enabled);
        scheduleForm.time = response.data.time || '23:00';
        scheduleForm.device_ips = response.data.device_ips || [];
    } catch (error) {
        toast.add({ severity: 'warn', summary: '定时配置加载失败', detail: error.message, life: 3000 });
    }
}

async function loadSyncStatus() {
    if (syncStatusLoading.value) {
        return syncStatus.value;
    }

    syncStatusLoading.value = true;
    const requestSeq = ++syncStatusRequestSeq.value;

    try {
        const previousStatus = syncStatus.value?.status;
        const response = await attendancesService.syncStatus();
        if (requestSeq === syncStatusRequestSeq.value) {
            syncStatus.value = response.data;

            if (syncStatus.value?.status?.running) {
                startSyncStatusPolling();
            } else {
                stopSyncStatusPolling();
            }

            await handleSyncStatusTransition(previousStatus, syncStatus.value?.status);
        }

        return response.data;
    } catch (error) {
        toast.add({ severity: 'warn', summary: '同步状态加载失败', detail: error.message, life: 3000 });
        throw error;
    } finally {
        if (requestSeq === syncStatusRequestSeq.value) {
            syncStatusLoading.value = false;
        }
    }
}

function isNoNewDataError(error) {
    const message = [error?.message, error?.payload?.message, error?.payload?.detail?.message, error?.payload?.detail?.detail].filter(Boolean).join(' ').toLowerCase();

    return ['没有更多新数据', '没有新数据', '无新数据', 'no more new data', 'no new data', 'no attendance data', 'no data'].some((pattern) => message.includes(pattern));
}

async function handleSyncStatusTransition(previousStatus, currentStatus) {
    if (!currentStatus) {
        return;
    }

    if (currentStatus.running) {
        manualSyncPending.value = true;
        return;
    }

    const justFinished = previousStatus?.running && !currentStatus.running;
    const shouldHandleManualCompletion = manualSyncPending.value && currentStatus.source === 'manual' && currentStatus.finished_at && handledSyncFinishedAt.value !== currentStatus.finished_at;

    if (!justFinished && !shouldHandleManualCompletion) {
        if (!currentStatus.running) {
            manualSyncPending.value = false;
        }
        return;
    }

    handledSyncFinishedAt.value = currentStatus.finished_at;
    manualSyncPending.value = false;
    syncResult.value = {
        fetched_count: currentStatus.fetched_count || 0,
        synced_count: currentStatus.synced_count || 0,
        duplicate_count: currentStatus.duplicate_count || 0,
        skipped_invalid_count: currentStatus.skipped_invalid_count || 0,
        device_ip: currentStatus.device_ip,
        no_new_data: Boolean(currentStatus.incremental) && (currentStatus.synced_count || 0) === 0 && isNoNewDataError({ message: currentStatus.message })
    };

    if (currentStatus.stage === 'failed') {
        toast.add({ severity: 'error', summary: '同步失败', detail: currentStatus.message || '同步失败', life: 3000 });
        return;
    }

    toast.add({
        severity: syncResult.value.no_new_data ? 'info' : 'success',
        summary: '同步完成',
        detail: syncResult.value.no_new_data ? '没有更多新数据' : `解析 ${syncResult.value.fetched_count} 条，新增 ${syncResult.value.synced_count} 条，重复 ${syncResult.value.duplicate_count} 条`,
        life: 3500
    });
    await loadRecords();
}

function startSyncStatusPolling() {
    if (syncStatusPolling.value) {
        return;
    }

    syncStatusPolling.value = true;
    scheduleNextSyncStatusPolling();
}

function scheduleNextSyncStatusPolling() {
    if (!syncStatusPolling.value) {
        return;
    }

    syncStatusTimer.value = window.setTimeout(async () => {
        try {
            await loadSyncStatus();
        } catch {
            // Keep polling so transient network issues do not leave the page stale mid-sync.
        }

        if (syncStatusPolling.value && syncStatus.value?.status?.running) {
            scheduleNextSyncStatusPolling();
        } else {
            stopSyncStatusPolling();
        }
    }, 2000);
}

function stopSyncStatusPolling() {
    syncStatusPolling.value = false;
    if (syncStatusTimer.value) {
        window.clearTimeout(syncStatusTimer.value);
        syncStatusTimer.value = null;
    }
}

function formatDateForApi(value, endOfDay = false) {
    if (!value) {
        return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }

    if (endOfDay) {
        date.setHours(23, 59, 59, 999);
    } else {
        date.setHours(0, 0, 0, 0);
    }

    return date.toISOString();
}

function formatTimestamp(value) {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('zh-CN', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date(value));
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('zh-CN', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date(value));
}

function punchLabel(value) {
    return punchTypeMap[value]?.label || `未知(${value})`;
}

function punchSeverity(value) {
    return punchTypeMap[value]?.severity || 'contrast';
}

function statusLabel(value) {
    return statusTypeMap[value]?.label || `未知(${value})`;
}

function statusSeverity(value) {
    return statusTypeMap[value]?.severity || 'contrast';
}

async function loadRecords() {
    loading.value = true;
    try {
        const response = await attendancesService.list({
            keyword: filters.keyword || undefined,
            start_date: formatDateForApi(filters.start_date, false),
            end_date: formatDateForApi(filters.end_date, true),
            page: filters.page,
            page_size: filters.page_size
        });
        records.value = response.data.records;
        total.value = response.data.total;
    } catch (error) {
        toast.add({ severity: 'error', summary: '加载失败', detail: error.message, life: 3000 });
    } finally {
        loading.value = false;
    }
}

async function syncAttendances() {
    if (isSyncRunning.value) {
        toast.add({ severity: 'warn', summary: '同步中', detail: '当前已有同步任务正在执行，请等待完成后再试。', life: 3000 });
        return;
    }

    manualSyncPending.value = true;
    syncResult.value = null;
    handledSyncFinishedAt.value = null;
    startSyncStatusPolling();

    try {
        const response = await attendancesService.sync(syncForm);
        syncStatus.value = {
            ...syncStatus.value,
            status: {
                ...syncStatus.value?.status,
                ...response.data,
                running: true
            }
        };
        toast.add({ severity: 'info', summary: '同步已启动', detail: response.data?.message || response.message || '正在后台同步打卡记录', life: 2500 });
        await loadSyncStatus();
    } catch (error) {
        if (syncForm.incremental && isNoNewDataError(error)) {
            syncResult.value = {
                fetched_count: 0,
                synced_count: 0,
                duplicate_count: 0,
                skipped_invalid_count: 0,
                device_ip: syncForm.device_ip,
                no_new_data: true
            };
            toast.add({ severity: 'info', summary: '同步完成', detail: '没有更多新数据', life: 3000 });
            await loadSyncStatus();
        } else {
            manualSyncPending.value = false;
            toast.add({ severity: 'error', summary: '同步失败', detail: error.message, life: 3000 });
            await loadSyncStatus();
        }
    } finally {
        if (!syncStatus.value?.status?.running) {
            stopSyncStatusPolling();
        }
    }
}

async function saveSyncSettings() {
    savingSchedule.value = true;
    try {
        await attendancesService.updateSyncSettings({
            enabled: scheduleForm.enabled,
            time: scheduleForm.time,
            device_ips: scheduleForm.device_ips
        });
        const scopeText = scheduleForm.device_ips.length > 0 ? `指定 ${scheduleForm.device_ips.length} 台设备` : '全部启用设备';
        toast.add({ severity: 'success', summary: '保存成功', detail: `定时同步已更新为每天 ${scheduleForm.time}，范围：${scopeText}`, life: 3000 });
        await loadSyncStatus();
    } catch (error) {
        toast.add({ severity: 'error', summary: '保存失败', detail: error.message, life: 3000 });
    } finally {
        savingSchedule.value = false;
    }
}

function handlePage(event) {
    filters.page = event.page + 1;
    filters.page_size = event.rows;
    loadRecords();
}

function resetFilters() {
    filters.keyword = '';
    filters.start_date = null;
    filters.end_date = null;
    filters.page = 1;
    filters.page_size = 20;
    loadRecords();
}

onMounted(async () => {
    syncForm.device_ip = '';
    await loadDeviceOptions();
    await loadSyncSettings();
    await loadSyncStatus();
    await loadRecords();
});

onBeforeUnmount(() => {
    stopSyncStatusPolling();
});
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12">
            <div class="card">
                <h1 class="text-2xl font-semibold m-0">打卡记录</h1>
                <p class="text-color-secondary mt-2 mb-0">支持按日期与用户模糊查询，并联动展示门禁用户名。</p>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-6">
            <div class="card h-full">
                <h3 class="text-lg mt-0">手动同步</h3>
                <div class="flex flex-col gap-3">
                    <Select v-model="syncForm.device_ip" :options="deviceOptions" optionLabel="label" optionValue="value" placeholder="选择设备" fluid />
                    <div class="flex items-center gap-2">
                        <Checkbox v-model="syncForm.incremental" binary inputId="incremental-sync" />
                        <label for="incremental-sync">增量同步</label>
                    </div>
                    <Button label="同步打卡记录" icon="pi pi-refresh" :disabled="isSyncRunning" :loading="manualSyncPending" @click="syncAttendances" />
                </div>
                <div class="mt-4">
                    <div class="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <span class="font-medium">同步状态</span>
                        <Tag :value="syncStateLabel" :severity="syncStateSeverity" />
                    </div>
                    <ProgressBar :value="syncProgress" :showValue="false" class="mb-2" />
                    <div class="text-sm text-color-secondary">{{ syncMessage }}</div>
                    <div v-if="syncStatus?.status" class="text-xs text-color-secondary mt-2">
                        解析 {{ syncStatus.status.fetched_count || 0 }} 条，新增 {{ syncStatus.status.synced_count || 0 }} 条，重复 {{ syncStatus.status.duplicate_count || 0 }} 条，跳过 {{ syncStatus.status.skipped_invalid_count || 0 }} 条
                    </div>
                    <div v-if="syncStatus?.status" class="text-xs text-color-secondary mt-2">上次开始：{{ formatDateTime(syncStatus.status.started_at) }}，上次完成：{{ formatDateTime(syncStatus.status.finished_at) }}</div>
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-6">
            <div class="card h-full">
                <h3 class="text-lg mt-0">定时同步</h3>
                <div class="flex flex-col gap-3">
                    <div class="flex items-center gap-2">
                        <Checkbox v-model="scheduleForm.enabled" binary inputId="schedule-enabled" />
                        <label for="schedule-enabled">启用每日自动同步</label>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label>执行时间</label>
                        <InputMask v-model="scheduleForm.time" mask="99:99" placeholder="23:00" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label>同步设备范围</label>
                        <MultiSelect v-model="scheduleForm.device_ips" :options="deviceOptions" optionLabel="label" optionValue="value" placeholder="未选择时默认同步全部启用设备" display="chip" fluid />
                    </div>
                    <Button label="保存定时配置" icon="pi pi-clock" :loading="savingSchedule" @click="saveSyncSettings" />
                </div>
                <div class="mt-4 text-sm text-color-secondary leading-6">
                    <div>当前计划：{{ scheduleSummary }}</div>
                    <div>下次执行：{{ formatDateTime(syncStatus?.schedule?.next_run_at) }}</div>
                </div>
                <Message severity="info" :closable="false" class="mt-4">
                    <div class="leading-6">
                        <div>打卡时间按 {{ timeZone }} 展示。</div>
                        <div>手动同步只新增新记录；勾选“增量同步”时，已存在记录会自动跳过。</div>
                        <div>定时同步未选择设备时，会同步设备管理中全部启用设备。</div>
                        <div>{{ statusMeaning }}</div>
                    </div>
                </Message>
            </div>
        </div>

        <div class="col-span-12">
            <div class="card">
                <DataTable :value="records" :loading="loading" stripedRows scrollable>
                    <template #header>
                        <div class="flex flex-col gap-4">
                            <div class="flex items-center justify-between gap-3 flex-wrap">
                                <span class="font-semibold">打卡记录</span>
                                <Tag severity="contrast" :value="`共 ${total} 条`" />
                            </div>
                            <div class="grid grid-cols-12 gap-3">
                                <div class="col-span-12 xl:col-span-4">
                                    <IconField class="w-full">
                                        <InputIcon class="pi pi-search" />
                                        <InputText v-model="filters.keyword" placeholder="搜索用户 ID 或用户名称" class="w-full" @keyup.enter="loadRecords" />
                                    </IconField>
                                </div>
                                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                                    <DatePicker v-model="filters.start_date" showIcon fluid dateFormat="yy-mm-dd" placeholder="开始日期" />
                                </div>
                                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                                    <DatePicker v-model="filters.end_date" showIcon fluid dateFormat="yy-mm-dd" placeholder="结束日期" />
                                </div>
                                <div class="col-span-12 xl:col-span-2 flex gap-2">
                                    <Button label="查询" icon="pi pi-filter" class="flex-1" @click="loadRecords" />
                                    <Button label="重置" severity="secondary" outlined class="flex-1" @click="resetFilters" />
                                </div>
                            </div>
                        </div>
                    </template>
                    <Column field="id" header="ID" sortable style="min-width: 6rem"></Column>
                    <Column field="user_id" header="用户 ID" sortable style="min-width: 9rem"></Column>
                    <Column field="user_name" header="用户名称" sortable style="min-width: 9rem">
                        <template #body="{ data }">
                            {{ data.user_name || '-' }}
                        </template>
                    </Column>
                    <Column field="uid" header="UID" sortable style="min-width: 8rem"></Column>
                    <Column field="timestamp" header="打卡时间" sortable style="min-width: 14rem">
                        <template #body="{ data }">
                            {{ formatTimestamp(data.timestamp) }}
                        </template>
                    </Column>
                    <Column field="status" header="状态" sortable style="min-width: 8rem">
                        <template #body="{ data }">
                            <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
                        </template>
                    </Column>
                    <Column field="punch" header="打开类型" sortable style="min-width: 9rem">
                        <template #body="{ data }">
                            <Tag :value="punchLabel(data.punch)" :severity="punchSeverity(data.punch)" />
                        </template>
                    </Column>
                    <Column field="device_sn" header="设备 SN" sortable style="min-width: 12rem"></Column>
                </DataTable>
                <Paginator :rows="filters.page_size" :totalRecords="total" :first="(filters.page - 1) * filters.page_size" :rowsPerPageOptions="[10, 20, 50]" class="mt-4" @page="handlePage" />
            </div>
        </div>

        <div class="col-span-12" v-if="syncResult">
            <div class="card">
                <h2 class="text-xl mt-0">同步结果</h2>
                <div class="grid grid-cols-12 gap-4 mb-4">
                    <div v-for="item in syncMetricCards" :key="item.label" class="col-span-6 md:col-span-3">
                        <div class="p-4 bg-surface-100 border-round">
                            <div class="text-sm text-color-secondary mb-2">{{ item.label }}</div>
                            <Tag :value="item.value" :severity="item.severity" />
                        </div>
                    </div>
                </div>
                <div class="text-sm text-color-secondary leading-6">
                    <div>同步设备：{{ syncResult.device_ip }}</div>
                    <div v-if="syncResult.no_new_data">本次增量同步没有更多新数据。</div>
                    <div v-else>本次新增 {{ syncResult.synced_count }} 条，重复 {{ syncResult.duplicate_count }} 条，异常跳过 {{ syncResult.skipped_invalid_count }} 条。</div>
                </div>
            </div>
        </div>
    </div>
</template>
