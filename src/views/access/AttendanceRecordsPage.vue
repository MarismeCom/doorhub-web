<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { attendanceRecordsService } from '@/service/attendanceRecords';

const toast = useToast();
const timeZone = 'Asia/Shanghai';
const loading = ref(false);
const exporting = ref(false);
const recalculating = ref(false);
const ruleSettingsDialog = ref(false);
const ruleSettingsSaving = ref(false);
const exportSettingsDialog = ref(false);
const exportSettingsLoading = ref(false);
const exportSettingsSaving = ref(false);
const records = ref([]);
const total = ref(0);
const holidayCalendarDays = ref([]);
const exportFieldGroups = ref({
    fixed_fields: [],
    available_fields: []
});
const selectedExportFields = ref([]);
const summary = ref({
    workday_count: 0,
    attendance_days: 0,
    overtime_days: 0,
    late_count: 0,
    early_count: 0,
    absence_count: 0,
    missing_count: 0,
    total_work_minutes: 0,
    total_overtime_minutes: 0
});
const filters = reactive({
    month: new Date(),
    keyword: '',
    status: null,
    page: 1,
    page_size: 20
});
const ruleSettings = reactive({
    plan_start: '10:00',
    plan_end: '18:00'
});

const statusOptions = [
    { label: '全部状态', value: null },
    { label: '正常', value: 1 },
    { label: '迟到', value: 2 },
    { label: '早退', value: 3 },
    { label: '缺勤', value: 4 },
    { label: '漏打卡', value: 5 },
    { label: '迟到+早退', value: 6 },
    { label: '加班', value: 7 }
];

const metricCards = computed(() => [
    { label: '应出勤天数', value: summary.value.workday_count, tone: 'neutral' },
    { label: '实际出勤天数', value: summary.value.attendance_days, tone: 'positive' },
    { label: '加班天数', value: summary.value.overtime_days, tone: 'overtime' },
    { label: '异常次数', value: summary.value.late_count + summary.value.early_count + summary.value.absence_count + summary.value.missing_count, tone: 'alert' },
    { label: '总工时', value: formatDuration(summary.value.total_work_minutes), tone: 'neutral' },
    { label: '加班总时长', value: formatDuration(summary.value.total_overtime_minutes), tone: 'overtime' }
]);
const holidayDayMap = computed(() => new Map(holidayCalendarDays.value.map((item) => [item.date, item])));

function formatYearMonth(value) {
    if (!value) {
        return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
}

function formatDate(value) {
    if (!value) {
        return '-';
    }
    return new Intl.DateTimeFormat('zh-CN', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
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

function formatDuration(minutes) {
    const totalMinutes = Number(minutes || 0);
    const hours = Math.floor(totalMinutes / 60);
    const remain = totalMinutes % 60;
    return `${hours}h ${remain}m`;
}

function statusMeta(value) {
    const map = {
        1: { label: '正常', severity: 'success' },
        2: { label: '迟到', severity: 'warn' },
        3: { label: '早退', severity: 'contrast' },
        4: { label: '缺勤', severity: 'danger' },
        5: { label: '漏打卡', severity: 'help' },
        6: { label: '迟到+早退', severity: 'danger' },
        7: { label: '加班', severity: 'info' }
    };
    return map[value] || { label: `未知(${value})`, severity: 'secondary' };
}

function dayTypeMeta(attendDate) {
    const meta = holidayDayMap.value.get(attendDate);
    if (!meta) {
        return { label: '工作日', severity: 'success' };
    }
    if (meta.type === 4) {
        return { label: '调休班', severity: 'info' };
    }
    if (meta.type === 2 || meta.type === 3 || meta.is_holiday) {
        return { label: meta.name || '节假日', severity: 'danger' };
    }
    if (meta.type === 1) {
        return { label: '周末', severity: 'contrast' };
    }
    return { label: '工作日', severity: 'success' };
}

async function loadRecords() {
    loading.value = true;
    try {
        const response = await attendanceRecordsService.list({
            year_month: formatYearMonth(filters.month),
            keyword: filters.keyword || undefined,
            status: filters.status,
            page: filters.page,
            page_size: filters.page_size
        });
        records.value = response.data.records || [];
        total.value = response.data.total || 0;
        summary.value = response.data.summary || summary.value;
    } catch (error) {
        toast.add({ severity: 'error', summary: '加载失败', detail: error.message, life: 3000 });
    } finally {
        loading.value = false;
    }
}

async function loadHolidayCalendar() {
    try {
        const response = await attendanceRecordsService.holidayCacheCalendar({
            year_month: formatYearMonth(filters.month)
        });
        holidayCalendarDays.value = response.data.days || [];
    } catch (error) {
        toast.add({ severity: 'warn', summary: '日类型加载失败', detail: error.message, life: 3000 });
        holidayCalendarDays.value = [];
    }
}

async function loadRuleSettings() {
    try {
        const response = await attendanceRecordsService.ruleSettings();
        ruleSettings.plan_start = response.data.plan_start || '10:00';
        ruleSettings.plan_end = response.data.plan_end || '18:00';
    } catch (error) {
        toast.add({ severity: 'warn', summary: '考勤规则加载失败', detail: error.message, life: 3000 });
    }
}

async function loadExportSettings() {
    exportSettingsLoading.value = true;
    try {
        const response = await attendanceRecordsService.exportMonthlySettings();
        exportFieldGroups.value = {
            fixed_fields: response.data.fixed_fields || [],
            available_fields: response.data.available_fields || []
        };
        selectedExportFields.value = [...(response.data.selected_fields || [])];
    } catch (error) {
        toast.add({ severity: 'warn', summary: '导出设置加载失败', detail: error.message, life: 3000 });
    } finally {
        exportSettingsLoading.value = false;
    }
}

async function saveRuleSettings() {
    ruleSettingsSaving.value = true;
    try {
        const response = await attendanceRecordsService.updateRuleSettings({
            plan_start: ruleSettings.plan_start,
            plan_end: ruleSettings.plan_end
        });
        ruleSettings.plan_start = response.data.plan_start;
        ruleSettings.plan_end = response.data.plan_end;
        ruleSettingsDialog.value = false;
        toast.add({ severity: 'success', summary: '保存成功', detail: '考勤规则已更新', life: 3000 });
        await loadRecords();
    } catch (error) {
        toast.add({ severity: 'error', summary: '保存失败', detail: error.message, life: 3000 });
    } finally {
        ruleSettingsSaving.value = false;
    }
}

async function openExportSettings() {
    exportSettingsDialog.value = true;
    if (!exportFieldGroups.value.available_fields.length && !exportFieldGroups.value.fixed_fields.length) {
        await loadExportSettings();
    }
}

async function saveExportSettings() {
    exportSettingsSaving.value = true;
    try {
        const response = await attendanceRecordsService.updateExportMonthlySettings({
            selected_fields: selectedExportFields.value
        });
        exportFieldGroups.value = {
            fixed_fields: response.data.fixed_fields || [],
            available_fields: response.data.available_fields || []
        };
        selectedExportFields.value = [...(response.data.selected_fields || [])];
        toast.add({ severity: 'success', summary: '保存成功', detail: '月报导出字段已保存', life: 3000 });
        return true;
    } catch (error) {
        toast.add({ severity: 'error', summary: '保存失败', detail: error.message, life: 3000 });
        return false;
    } finally {
        exportSettingsSaving.value = false;
    }
}

async function saveExportSettingsAndExport() {
    const saved = await saveExportSettings();
    if (saved) {
        exportSettingsDialog.value = false;
        await exportMonthly();
    }
}

async function recalculateRecords() {
    recalculating.value = true;
    try {
        await attendanceRecordsService.recalculate({
            year_month: formatYearMonth(filters.month)
        });
        toast.add({ severity: 'success', summary: '重算完成', detail: '当月考勤记录已重新生成', life: 3000 });
        await Promise.all([loadRecords(), loadHolidayCalendar()]);
    } catch (error) {
        toast.add({ severity: 'error', summary: '重算失败', detail: error.message, life: 3000 });
    } finally {
        recalculating.value = false;
    }
}

async function exportMonthly() {
    exporting.value = true;
    try {
        const { blob, filename } = await attendanceRecordsService.exportMonthly({
            year_month: formatYearMonth(filters.month),
            keyword: filters.keyword || undefined,
            status: filters.status
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.add({ severity: 'success', summary: '导出完成', detail: `已生成 ${filename}`, life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: '导出失败', detail: error.message, life: 3000 });
    } finally {
        exporting.value = false;
    }
}

function handlePage(event) {
    filters.page = event.page + 1;
    filters.page_size = event.rows;
    loadRecords();
}

function handleSearch() {
    filters.page = 1;
    Promise.all([loadRecords(), loadHolidayCalendar()]);
}

function resetFilters() {
    filters.month = new Date();
    filters.keyword = '';
    filters.status = null;
    filters.page = 1;
    filters.page_size = 20;
    Promise.all([loadRecords(), loadHolidayCalendar()]);
}

onMounted(() => {
    Promise.all([loadRecords(), loadHolidayCalendar(), loadRuleSettings()]);
    loadExportSettings();
});
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12">
            <div class="card">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 class="text-2xl font-semibold m-0">考勤记录</h1>
                        <p class="text-color-secondary mt-2 mb-0">展示按月生成的日考勤结果，支持月统计、重算与导出。</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <Button label="考勤规则" icon="pi pi-cog" severity="secondary" outlined @click="ruleSettingsDialog = true" />
                        <Button label="重算当月" icon="pi pi-refresh" severity="contrast" :loading="recalculating" @click="recalculateRecords" />
                        <Button label="导出设置" icon="pi pi-sliders-h" severity="secondary" outlined @click="openExportSettings" />
                        <Button label="导出月报" icon="pi pi-download" :loading="exporting" @click="exportMonthly" />
                    </div>
                </div>
            </div>
        </div>

        <div v-for="item in metricCards" :key="item.label" class="col-span-12 md:col-span-6 xl:col-span-2">
            <div class="card attendance-metric-card" :class="`tone-${item.tone}`">
                <div class="text-sm attendance-metric-label mb-2">{{ item.label }}</div>
                <div class="text-xl xl:text-2xl font-semibold attendance-metric-value">{{ item.value }}</div>
            </div>
        </div>

        <div class="col-span-12">
            <div class="card">
                <DataTable :value="records" :loading="loading" stripedRows scrollable>
                    <template #header>
                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between gap-3 flex-wrap">
                                <h3 class="m-0 text-lg">月度日汇总</h3>
                                <Tag severity="contrast" :value="`共 ${total} 条`" />
                            </div>
                            <div class="grid grid-cols-12 gap-3">
                                <div class="col-span-12 md:col-span-3">
                                    <DatePicker v-model="filters.month" view="month" dateFormat="yy-mm" showIcon fluid placeholder="选择月份" />
                                </div>
                                <div class="col-span-12 md:col-span-3">
                                    <InputText v-model.trim="filters.keyword" fluid placeholder="搜索工号或姓名" @keyup.enter="handleSearch" />
                                </div>
                                <div class="col-span-12 md:col-span-3">
                                    <Select v-model="filters.status" :options="statusOptions" optionLabel="label" optionValue="value" fluid placeholder="状态筛选" />
                                </div>
                                <div class="col-span-12 md:col-span-3 flex gap-2">
                                    <Button label="查询" icon="pi pi-search" class="flex-1" @click="handleSearch" />
                                    <Button label="重置" icon="pi pi-filter-slash" severity="secondary" outlined class="flex-1" @click="resetFilters" />
                                </div>
                            </div>
                        </div>
                    </template>
                    <Column field="attend_date" header="日期" style="min-width: 8rem">
                        <template #body="{ data }">{{ formatDate(data.attend_date) }}</template>
                    </Column>
                    <Column header="日类型" style="min-width: 8rem">
                        <template #body="{ data }">
                            <Tag :value="dayTypeMeta(data.attend_date).label" :severity="dayTypeMeta(data.attend_date).severity" />
                        </template>
                    </Column>
                    <Column field="user_id" header="工号" style="min-width: 7rem" />
                    <Column field="user_name" header="姓名" style="min-width: 8rem" />
                    <Column field="actual_checkin" header="签到时间" style="min-width: 11rem">
                        <template #body="{ data }">{{ formatDateTime(data.actual_checkin) }}</template>
                    </Column>
                    <Column field="actual_checkout" header="签退时间" style="min-width: 11rem">
                        <template #body="{ data }">{{ formatDateTime(data.actual_checkout) }}</template>
                    </Column>
                    <Column field="late_minutes" header="迟到(分)" style="min-width: 7rem" />
                    <Column field="early_minutes" header="早退(分)" style="min-width: 7rem" />
                    <Column field="work_minutes" header="工时" style="min-width: 8rem">
                        <template #body="{ data }">{{ formatDuration(data.work_minutes) }}</template>
                    </Column>
                    <Column field="overtime_minutes" header="加班" style="min-width: 8rem">
                        <template #body="{ data }">{{ formatDuration(data.overtime_minutes) }}</template>
                    </Column>
                    <Column field="status" header="状态" style="min-width: 8rem">
                        <template #body="{ data }">
                            <Tag :value="statusMeta(data.status).label" :severity="statusMeta(data.status).severity" />
                        </template>
                    </Column>
                    <template #footer>
                        <Paginator :rows="filters.page_size" :totalRecords="total" :first="(filters.page - 1) * filters.page_size" :rowsPerPageOptions="[20, 50, 100]" @page="handlePage" />
                    </template>
                </DataTable>
            </div>
        </div>

        <Dialog v-model:visible="ruleSettingsDialog" modal header="考勤规则" :style="{ width: 'min(28rem, 92vw)' }">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                    <label for="attendance-plan-start" class="font-medium">上班打卡时间</label>
                    <InputMask id="attendance-plan-start" v-model="ruleSettings.plan_start" mask="99:99" placeholder="10:00" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="attendance-plan-end" class="font-medium">下班打卡时间</label>
                    <InputMask id="attendance-plan-end" v-model="ruleSettings.plan_end" mask="99:99" placeholder="18:00" fluid />
                </div>
            </div>
            <template #footer>
                <Button label="取消" text @click="ruleSettingsDialog = false" />
                <Button label="保存" icon="pi pi-check" :loading="ruleSettingsSaving" @click="saveRuleSettings" />
            </template>
        </Dialog>

        <Dialog v-model:visible="exportSettingsDialog" modal header="月报导出设置" :style="{ width: 'min(42rem, 94vw)' }">
            <div v-if="exportSettingsLoading" class="py-4">
                <Skeleton height="10rem" />
            </div>
            <div v-else class="flex flex-col gap-5">
                <Message severity="info" :closable="false"> 日期列固定导出，签到时间和签退时间只输出时分秒。其余字段可按需勾选并保存。 </Message>
                <div class="flex flex-col gap-3">
                    <div class="font-medium">固定字段</div>
                    <div class="flex flex-wrap gap-2">
                        <Tag v-for="item in exportFieldGroups.fixed_fields" :key="item.key" :value="item.label" severity="secondary" />
                    </div>
                </div>
                <div class="flex flex-col gap-3">
                    <div class="font-medium">可选字段</div>
                    <div class="grid grid-cols-12 gap-3">
                        <div v-for="item in exportFieldGroups.available_fields" :key="item.key" class="col-span-12 md:col-span-6">
                            <div class="flex items-center gap-2 rounded-lg border border-surface-200 px-3 py-2">
                                <Checkbox v-model="selectedExportFields" :value="item.key" :inputId="`export-field-${item.key}`" />
                                <label :for="`export-field-${item.key}`" class="cursor-pointer select-none">{{ item.label }}</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="取消" text @click="exportSettingsDialog = false" />
                <Button label="保存设置" icon="pi pi-save" severity="secondary" :loading="exportSettingsSaving" @click="saveExportSettings" />
                <Button label="保存并导出" icon="pi pi-download" :loading="exportSettingsSaving || exporting" @click="saveExportSettingsAndExport" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.attendance-metric-card {
    min-height: 7.5rem;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: linear-gradient(180deg, #ffffff, #fbfcfe);
}

.attendance-metric-card.tone-neutral {
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.attendance-metric-card.tone-positive {
    background: linear-gradient(180deg, #f3fbf4, #ffffff);
    border-color: rgba(34, 197, 94, 0.18);
}

.attendance-metric-card.tone-alert {
    background: linear-gradient(180deg, #fff7f2, #ffffff);
    border-color: rgba(249, 115, 22, 0.22);
}

.attendance-metric-card.tone-overtime {
    background: linear-gradient(180deg, #fff4ec, #ffffff);
    border-color: rgba(234, 88, 12, 0.22);
}

.attendance-metric-label {
    color: #64748b;
}

.attendance-metric-card.tone-overtime .attendance-metric-label,
.attendance-metric-card.tone-overtime .attendance-metric-value {
    color: #c2410c;
}

.attendance-metric-card.tone-alert .attendance-metric-value {
    color: #b45309;
}

.attendance-metric-card.tone-positive .attendance-metric-value {
    color: #15803d;
}
</style>
