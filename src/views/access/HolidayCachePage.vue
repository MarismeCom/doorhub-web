<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { attendanceRecordsService } from '@/service/attendanceRecords';

const toast = useToast();
const cacheLoading = ref(false);
const cacheSaving = ref(false);
const cacheRefreshing = ref(false);
const calendarLoading = ref(false);
const holidayCalendarDays = ref([]);
const calendarMonth = ref(new Date());
const holidayCacheStatus = ref({
    status: {
        running: false,
        stage: 'idle',
        message: '',
        source: null,
        year: null,
        started_at: null,
        finished_at: null,
        refreshed_count: 0
    },
    schedule: {
        enabled: false,
        frequency: 'daily',
        time: '03:00',
        weekday: 1,
        next_run_at: null,
        timezone: null
    }
});
const holidayCacheForm = reactive({
    enabled: false,
    frequency: 'daily',
    time: '03:00',
    weekday: 1,
    refreshYear: new Date().getFullYear()
});

const frequencyOptions = [
    { label: '每天刷新', value: 'daily' },
    { label: '每周刷新', value: 'weekly' }
];
const weekdayOptions = [
    { label: '周一', value: 1 },
    { label: '周二', value: 2 },
    { label: '周三', value: 3 },
    { label: '周四', value: 4 },
    { label: '周五', value: 5 },
    { label: '周六', value: 6 },
    { label: '周日', value: 7 }
];
const calendarWeekHeaders = ['一', '二', '三', '四', '五', '六', '日'];

const holidayCacheStateMeta = computed(() => {
    if (holidayCacheStatus.value.status.running) {
        return { label: '刷新中', severity: 'warn' };
    }
    if (holidayCacheStatus.value.status.stage === 'failed') {
        return { label: '失败', severity: 'danger' };
    }
    if (holidayCacheStatus.value.schedule.enabled) {
        return { label: '已启用', severity: 'success' };
    }
    return { label: '已停用', severity: 'secondary' };
});

const holidayCacheSummary = computed(() => {
    if (!holidayCacheStatus.value.schedule.enabled) {
        return '当前未启用节假日缓存定时刷新';
    }

    const { frequency, time, weekday, timezone, next_run_at } = holidayCacheStatus.value.schedule;
    const weekdayLabel = weekdayOptions.find((item) => item.value === weekday)?.label || `周${weekday}`;
    const frequencyText = frequency === 'weekly' ? `每周 ${weekdayLabel}` : '每天';
    const nextRunText = next_run_at ? `，下次执行：${formatDateTime(next_run_at)}` : '';
    return `${frequencyText} ${time} 自动刷新（${timezone || '本地时区'}）${nextRunText}`;
});

const holidayCalendarGrid = computed(() => {
    const base = calendarMonth.value ? new Date(calendarMonth.value) : new Date();
    const year = base.getFullYear();
    const month = base.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
    const firstWeekday = (monthStart.getDay() + 6) % 7;
    const totalDays = monthEnd.getDate();
    const dayMap = new Map(holidayCalendarDays.value.map((item) => [item.date, item]));
    const cells = [];

    for (let i = 0; i < firstWeekday; i += 1) {
        cells.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
        const current = new Date(year, month, day);
        const key = `${year}-${`${month + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
        const meta = dayMap.get(key);
        cells.push({
            key,
            day,
            type: meta?.type ?? null,
            isHoliday: meta?.is_holiday ?? (current.getDay() === 0 || current.getDay() === 6),
            name: meta?.name || '',
            source: meta?.source || (meta ? '' : 'fallback'),
            isToday: key === todayKey
        });
    }

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    return Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) => cells.slice(index * 7, index * 7 + 7));
});

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

function formatDateTime(value) {
    if (!value) {
        return '-';
    }
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date(value));
}

function formatNullableText(value) {
    return value || '-';
}

function holidayDayMeta(type, isHoliday) {
    if (type === 4) {
        return { label: '班', className: 'workday-shift' };
    }
    if (type === 2 || type === 3 || isHoliday) {
        return { label: '休', className: 'holiday-rest' };
    }
    if (type === 1) {
        return { label: '周末', className: 'weekend' };
    }
    return { label: '工', className: 'workday' };
}

async function loadHolidayCacheState() {
    cacheLoading.value = true;
    try {
        const [statusResponse, settingsResponse] = await Promise.all([
            attendanceRecordsService.holidayCacheStatus(),
            attendanceRecordsService.holidayCacheSettings()
        ]);
        holidayCacheStatus.value = {
            status: statusResponse.data.status || holidayCacheStatus.value.status,
            schedule: settingsResponse.data || statusResponse.data.schedule || holidayCacheStatus.value.schedule
        };
        holidayCacheForm.enabled = Boolean(holidayCacheStatus.value.schedule.enabled);
        holidayCacheForm.frequency = holidayCacheStatus.value.schedule.frequency || 'daily';
        holidayCacheForm.time = holidayCacheStatus.value.schedule.time || '03:00';
        holidayCacheForm.weekday = holidayCacheStatus.value.schedule.weekday || 1;
    } catch (error) {
        toast.add({ severity: 'warn', summary: '节假日缓存状态加载失败', detail: error.message, life: 3000 });
    } finally {
        cacheLoading.value = false;
    }
}

async function loadHolidayCalendar() {
    calendarLoading.value = true;
    try {
        const response = await attendanceRecordsService.holidayCacheCalendar({
            year_month: formatYearMonth(calendarMonth.value)
        });
        holidayCalendarDays.value = response.data.days || [];
    } catch (error) {
        toast.add({ severity: 'warn', summary: '日历加载失败', detail: error.message, life: 3000 });
    } finally {
        calendarLoading.value = false;
    }
}

async function saveHolidayCacheSettings() {
    cacheSaving.value = true;
    try {
        await attendanceRecordsService.updateHolidayCacheSettings({
            enabled: holidayCacheForm.enabled,
            frequency: holidayCacheForm.frequency,
            time: holidayCacheForm.time,
            weekday: holidayCacheForm.weekday
        });
        toast.add({ severity: 'success', summary: '保存成功', detail: '节假日缓存刷新策略已更新', life: 3000 });
        await loadHolidayCacheState();
    } catch (error) {
        toast.add({ severity: 'error', summary: '保存失败', detail: error.message, life: 3000 });
    } finally {
        cacheSaving.value = false;
    }
}

async function refreshHolidayCache() {
    cacheRefreshing.value = true;
    try {
        await attendanceRecordsService.refreshHolidayCache({
            year: Number(holidayCacheForm.refreshYear)
        });
        toast.add({ severity: 'success', summary: '刷新任务已启动', detail: `开始刷新 ${holidayCacheForm.refreshYear} 年节假日缓存`, life: 3000 });
        await loadHolidayCacheState();
        if (Number(holidayCacheForm.refreshYear) === new Date(calendarMonth.value).getFullYear()) {
            await loadHolidayCalendar();
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: '刷新失败', detail: error.message, life: 3000 });
    } finally {
        cacheRefreshing.value = false;
    }
}

function backToToday() {
    calendarMonth.value = new Date();
}

onMounted(() => {
    loadHolidayCacheState();
    loadHolidayCalendar();
});

watch(
    () => formatYearMonth(calendarMonth.value),
    () => {
        loadHolidayCalendar();
    }
);
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12">
            <div class="card">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 class="text-2xl font-semibold m-0">节假日</h1>
                        <p class="text-color-secondary mt-2 mb-0">使用 ailcc + 本地缓存库，展示节假日月历，并管理刷新策略。</p>
                    </div>
                    <Tag :value="holidayCacheStateMeta.label" :severity="holidayCacheStateMeta.severity" />
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-7">
            <div class="card holiday-cache-card">
                <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <div>
                        <h3 class="m-0 text-lg">节假日日历</h3>
                        <p class="text-color-secondary mt-2 mb-0">类似万年历模块，只展示当前月份的工作日、休息日和调休信息。</p>
                    </div>
                    <div class="flex items-center gap-3 flex-wrap">
                        <Button label="返回今天" icon="pi pi-history" severity="secondary" outlined @click="backToToday" />
                        <DatePicker v-model="calendarMonth" view="month" dateFormat="yy-mm" showIcon placeholder="选择月份" />
                        <Tag severity="contrast" :value="calendarLoading ? '加载中' : `${holidayCalendarDays.length} 条缓存`" />
                    </div>
                </div>

                <div class="holiday-calendar-panel">
                    <div class="holiday-calendar-head">
                        <div v-for="item in calendarWeekHeaders" :key="item" class="holiday-calendar-head-cell">{{ item }}</div>
                    </div>
                    <div v-for="(row, rowIndex) in holidayCalendarGrid" :key="rowIndex" class="holiday-calendar-row">
                        <div
                            v-for="cell in row"
                            :key="cell?.key || `empty-${rowIndex}`"
                            class="holiday-calendar-cell"
                            :class="{ empty: !cell, today: cell?.isToday }"
                        >
                            <template v-if="cell">
                                <div class="holiday-calendar-cell-top">
                                    <span class="holiday-calendar-day">{{ cell.day }}</span>
                                    <span class="holiday-calendar-badge" :class="holidayDayMeta(cell.type, cell.isHoliday).className">
                                        {{ holidayDayMeta(cell.type, cell.isHoliday).label }}
                                    </span>
                                </div>
                                <div class="holiday-calendar-name">
                                    {{ cell.name || (cell.isHoliday ? '休息日' : '工作日') }}
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-5">
            <div class="card h-full">
                <div class="p-3 border-round bg-emphasis mb-4">
                    <div class="text-sm font-medium mb-2">当前状态</div>
                    <div class="text-sm text-color-secondary">{{ holidayCacheSummary }}</div>
                    <div class="text-sm text-color-secondary mt-2">执行信息：{{ formatNullableText(holidayCacheStatus.status.message) }}</div>
                    <div class="text-sm text-color-secondary mt-2">
                        最近执行年份：{{ formatNullableText(holidayCacheStatus.status.year) }}，刷新条数：{{ holidayCacheStatus.status.refreshed_count || 0 }}
                    </div>
                    <div class="text-sm text-color-secondary mt-2">
                        开始时间：{{ formatDateTime(holidayCacheStatus.status.started_at) }}，结束时间：{{ formatDateTime(holidayCacheStatus.status.finished_at) }}
                    </div>
                </div>

                <div class="grid grid-cols-12 gap-3">
                    <div class="col-span-12 flex items-center gap-2">
                        <Checkbox v-model="holidayCacheForm.enabled" binary inputId="holiday-cache-enabled" />
                        <label for="holiday-cache-enabled">启用节假日缓存自动刷新</label>
                    </div>
                    <div class="col-span-12 md:col-span-4">
                        <label class="block mb-2">刷新频率</label>
                        <Select v-model="holidayCacheForm.frequency" :options="frequencyOptions" optionLabel="label" optionValue="value" fluid />
                    </div>
                    <div class="col-span-12 md:col-span-4">
                        <label class="block mb-2">执行时间</label>
                        <InputMask v-model="holidayCacheForm.time" mask="99:99" placeholder="03:00" fluid />
                    </div>
                    <div class="col-span-12 md:col-span-4">
                        <label class="block mb-2">每周执行日</label>
                        <Select
                            v-model="holidayCacheForm.weekday"
                            :options="weekdayOptions"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                            :disabled="holidayCacheForm.frequency !== 'weekly'"
                        />
                    </div>
                    <div class="col-span-12 flex justify-end">
                        <Button label="保存刷新策略" icon="pi pi-save" :loading="cacheSaving" :disabled="cacheLoading" @click="saveHolidayCacheSettings" />
                    </div>
                </div>

                <Divider />

                <div class="grid grid-cols-12 gap-3 items-end">
                    <div class="col-span-12 md:col-span-6">
                        <label class="block mb-2">手动刷新年份</label>
                        <InputNumber v-model="holidayCacheForm.refreshYear" :min="2020" :max="2099" fluid />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex justify-end">
                        <Button
                            label="刷新指定年份缓存"
                            icon="pi pi-cloud-download"
                            severity="contrast"
                            :loading="cacheRefreshing"
                            :disabled="cacheLoading"
                            @click="refreshHolidayCache"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.holiday-cache-card {
    background:
        radial-gradient(circle at top right, rgba(230, 94, 94, 0.1), transparent 28%),
        linear-gradient(180deg, rgba(252, 246, 240, 0.9), rgba(255, 255, 255, 1));
}

.holiday-calendar-panel {
    border: 1px solid rgba(150, 90, 62, 0.16);
    border-radius: 1rem;
    padding: 1rem;
    background: rgba(255, 252, 248, 0.96);
}

.holiday-calendar-head,
.holiday-calendar-row {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.5rem;
}

.holiday-calendar-head {
    margin-bottom: 0.5rem;
}

.holiday-calendar-head-cell {
    text-align: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: #7a5a45;
}

.holiday-calendar-cell {
    min-height: 5.75rem;
    border-radius: 0.9rem;
    padding: 0.7rem;
    background: #fff;
    border: 1px solid rgba(163, 123, 98, 0.14);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.holiday-calendar-cell.today {
    border-color: #cc5a34;
    box-shadow: 0 0 0 2px rgba(204, 90, 52, 0.14);
    background: linear-gradient(180deg, #fff6f0, #ffffff);
}

.holiday-calendar-cell.empty {
    background: transparent;
    border-style: dashed;
    opacity: 0.35;
}

.holiday-calendar-cell-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.holiday-calendar-day {
    font-size: 1.15rem;
    font-weight: 700;
    color: #423127;
}

.holiday-calendar-badge {
    min-width: 2rem;
    padding: 0.2rem 0.45rem;
    border-radius: 999px;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 700;
}

.holiday-calendar-badge.workday {
    background: #edf4e5;
    color: #476229;
}

.holiday-calendar-badge.workday-shift {
    background: #e9f1fb;
    color: #24588f;
}

.holiday-calendar-badge.weekend,
.holiday-calendar-badge.holiday-rest {
    background: #fbe9e9;
    color: #9f3131;
}

.holiday-calendar-name {
    margin-top: 0.75rem;
    font-size: 0.82rem;
    line-height: 1.35;
    color: #7a5a45;
    word-break: break-word;
}
</style>
