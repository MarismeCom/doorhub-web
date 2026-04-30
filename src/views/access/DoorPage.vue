<script setup>
import { onMounted, reactive, ref } from 'vue';
import { devicesService } from '@/service/devices';
import { doorService } from '@/service/door';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const logs = ref([]);
const total = ref(0);
const openResult = ref(null);
const closeResult = ref(null);
const loading = ref(false);
const deviceOptions = ref([]);

const doorForm = reactive({
    device_ip: '',
    unlock_seconds: 3,
    remark: ''
});

const logFilters = reactive({
    device_ip: '',
    start_date: '',
    end_date: '',
    page: 1,
    page_size: 20
});

async function loadDeviceOptions() {
    try {
        const response = await devicesService.list();
        deviceOptions.value = (response.data.devices || []).map((device) => ({
            label: `${device.name} (${device.ip})`,
            value: device.ip
        }));

        if (!doorForm.device_ip && deviceOptions.value.length > 0) {
            doorForm.device_ip = deviceOptions.value[0].value;
        }
    } catch (error) {
        toast.add({ severity: 'warn', summary: '设备列表加载失败', detail: error.message, life: 3000 });
    }
}

async function loadLogs() {
    loading.value = true;
    try {
        const response = await doorService.logs(logFilters);
        logs.value = response.data.logs;
        total.value = response.data.total;
    } catch (error) {
        toast.add({ severity: 'error', summary: '加载失败', detail: error.message, life: 3000 });
    } finally {
        loading.value = false;
    }
}

async function openDoor() {
    try {
        const response = await doorService.open({
            device_ip: doorForm.device_ip,
            unlock_seconds: Number(doorForm.unlock_seconds || 3),
            remark: doorForm.remark
        });
        openResult.value = response.data;
        toast.add({ severity: 'success', summary: '开门成功', detail: `设备 ${doorForm.device_ip} 已执行开门`, life: 2500 });
        await loadLogs();
    } catch (error) {
        toast.add({ severity: 'error', summary: '开门失败', detail: error.message, life: 3000 });
    }
}

async function closeDoor() {
    try {
        const response = await doorService.close({
            device_ip: doorForm.device_ip,
            unlock_seconds: Number(doorForm.unlock_seconds || 3),
            remark: doorForm.remark
        });
        closeResult.value = response.data;
        toast.add({ severity: 'info', summary: '关门说明', detail: response.message || '设备将按控制器策略自动闭合', life: 3500 });
    } catch (error) {
        toast.add({ severity: 'error', summary: '操作失败', detail: error.message, life: 3000 });
    }
}

function handlePage(event) {
    logFilters.page = event.page + 1;
    logFilters.page_size = event.rows;
    loadLogs();
}

onMounted(async () => {
    await loadDeviceOptions();
    await loadLogs();
});
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12">
            <div class="card">
                <h1 class="text-2xl font-semibold m-0">门禁控制</h1>
                <p class="text-color-secondary mt-2 mb-0">覆盖开门、关门说明接口与开门日志查询。</p>
            </div>
        </div>

        <div class="col-span-12">
            <div class="card">
                <h2 class="text-xl mt-0">控制台</h2>
                <div class="flex flex-col gap-3">
                    <Select v-model="doorForm.device_ip" :options="deviceOptions" optionLabel="label" optionValue="value" placeholder="选择设备" fluid />
                    <InputNumber v-model="doorForm.unlock_seconds" :min="1" :max="10" fluid />
                    <Textarea v-model="doorForm.remark" rows="3" placeholder="备注" />
                    <div class="flex gap-2 flex-wrap">
                        <Button label="开门" icon="pi pi-lock-open" @click="openDoor" />
                        <Button label="关门说明" icon="pi pi-lock" severity="secondary" @click="closeDoor" />
                    </div>
                </div>
            </div>
        </div>

        <div class="col-span-12">
            <div class="card">
                <div class="flex gap-2 flex-wrap mb-3">
                    <Select v-model="logFilters.device_ip" :options="deviceOptions" optionLabel="label" optionValue="value" placeholder="筛选设备" class="min-w-64" showClear />
                    <Button label="刷新日志" severity="contrast" @click="loadLogs" />
                </div>
                <DataTable :value="logs" :loading="loading" stripedRows scrollable>
                    <template #header>
                        <div class="flex items-center justify-between gap-3 flex-wrap">
                            <span class="font-semibold">开门日志</span>
                            <Tag severity="contrast" :value="`共 ${total} 条`" />
                        </div>
                    </template>
                    <Column field="id" header="ID"></Column>
                    <Column field="operator" header="操作人"></Column>
                    <Column field="device_ip" header="设备 IP"></Column>
                    <Column field="action" header="动作"></Column>
                    <Column field="result" header="结果"></Column>
                    <Column field="remark" header="备注"></Column>
                    <Column field="operated_at" header="操作时间"></Column>
                </DataTable>
                <Paginator
                    :rows="logFilters.page_size"
                    :totalRecords="total"
                    :first="(logFilters.page - 1) * logFilters.page_size"
                    :rowsPerPageOptions="[10, 20, 50]"
                    class="mt-4"
                    @page="handlePage"
                />
            </div>
        </div>

        <div class="col-span-12" v-if="openResult || closeResult">
            <div class="card">
                <h2 class="text-xl mt-0">最近响应</h2>
                <pre class="bg-surface-100 p-3 border-round text-sm overflow-auto">{{ JSON.stringify(openResult || closeResult, null, 2) }}</pre>
            </div>
        </div>
    </div>
</template>
