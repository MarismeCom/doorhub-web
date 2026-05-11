<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { devicesService } from '@/service/devices';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const confirm = useConfirm();
const loading = ref(false);
const submitLoading = ref(false);
const devices = ref([]);
const deviceIp = ref('192.168.1.201');
const statusPayload = ref(null);
const deviceDialogVisible = ref(false);
const editingDeviceId = ref(null);
const form = reactive({
    name: '',
    ip: '',
    port: 4370,
    serial_number: '',
    location: '',
    is_active: true
});
const runtimeStatuses = reactive({});

const dialogTitle = computed(() => (editingDeviceId.value ? '编辑设备' : '新增设备'));

async function loadDevices() {
    loading.value = true;
    try {
        const response = await devicesService.list();
        devices.value = response.data.devices;
    } catch (error) {
        toast.add({ severity: 'error', summary: '加载失败', detail: error.message, life: 3000 });
    } finally {
        loading.value = false;
    }
}

function resetForm() {
    editingDeviceId.value = null;
    Object.assign(form, {
        name: '',
        ip: '',
        port: 4370,
        serial_number: '',
        location: '',
        is_active: true
    });
}

function openCreateDialog() {
    resetForm();
    deviceDialogVisible.value = true;
}

function openEditDialog(device) {
    editingDeviceId.value = device.id;
    Object.assign(form, {
        name: device.name || '',
        ip: device.ip || '',
        port: device.port || 4370,
        serial_number: device.serial_number || '',
        location: device.location || '',
        is_active: Boolean(device.is_active)
    });
    deviceDialogVisible.value = true;
}

async function submitDevice() {
    submitLoading.value = true;
    try {
        const payload = {
            ...form,
            port: Number(form.port || 4370),
            serial_number: form.serial_number || null,
            location: form.location || null
        };
        if (editingDeviceId.value) {
            await devicesService.update(editingDeviceId.value, payload);
            toast.add({ severity: 'success', summary: '更新成功', detail: '设备信息已更新', life: 2500 });
        } else {
            await devicesService.create(payload);
            toast.add({ severity: 'success', summary: '创建成功', detail: '设备已创建', life: 2500 });
        }
        deviceDialogVisible.value = false;
        resetForm();
        await loadDevices();
    } catch (error) {
        toast.add({ severity: 'error', summary: '保存失败', detail: error.message, life: 3000 });
    } finally {
        submitLoading.value = false;
    }
}

function removeDevice(device) {
    confirm.require({
        message: `确认删除设备 ${device.name} (${device.ip}) 吗？`,
        header: '删除确认',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: '取消', severity: 'secondary', outlined: true },
        acceptProps: { label: '删除', severity: 'danger' },
        accept: async () => {
            try {
                await devicesService.remove(device.id);
                delete runtimeStatuses[device.ip];
                toast.add({ severity: 'success', summary: '删除成功', detail: '设备已删除', life: 2500 });
                await loadDevices();
            } catch (error) {
                toast.add({ severity: 'error', summary: '删除失败', detail: error.message, life: 3000 });
            }
        }
    });
}

async function checkStatus() {
    try {
        const response = await devicesService.status(deviceIp.value);
        statusPayload.value = response.data;
        runtimeStatuses[deviceIp.value] = response.data.status;
        toast.add({ severity: response.data.status === 'ok' ? 'success' : 'warn', summary: '探测完成', detail: `设备 ${deviceIp.value} 状态已刷新`, life: 2500 });
        await loadDevices();
    } catch (error) {
        runtimeStatuses[deviceIp.value] = 'unreachable';
        toast.add({ severity: 'error', summary: '探测失败', detail: error.message, life: 3000 });
    }
}

function statusLabel(device) {
    const status = runtimeStatuses[device.ip] || device.status || (device.is_active ? 'active' : 'inactive');
    switch (status) {
        case 'ok':
            return '在线';
        case 'unreachable':
            return '离线';
        case 'active':
            return '已启用';
        case 'inactive':
            return '已停用';
        default:
            return status;
    }
}

function statusSeverity(device) {
    const status = runtimeStatuses[device.ip] || device.status || (device.is_active ? 'active' : 'inactive');
    switch (status) {
        case 'ok':
        case 'active':
            return 'success';
        case 'unreachable':
            return 'danger';
        case 'inactive':
            return 'secondary';
        default:
            return 'contrast';
    }
}

onMounted(loadDevices);
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12">
            <div class="card">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 class="text-2xl font-semibold m-0">设备管理</h1>
                        <p class="text-color-secondary mt-2 mb-0">查看设备列表、运行状态，并支持编辑与删除。</p>
                    </div>
                    <Button label="新增设备" icon="pi pi-plus" @click="openCreateDialog" />
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-4">
            <div class="card h-full">
                <h2 class="text-xl mt-0">查询设备状态</h2>
                <div class="flex flex-col gap-3">
                    <InputText v-model="deviceIp" placeholder="设备 IP" />
                    <Button label="探测设备" icon="pi pi-search" @click="checkStatus" />
                </div>
                <div v-if="statusPayload" class="mt-4 p-3 bg-surface-100 border-round text-sm">
                    <div class="font-medium mb-2">最近探测结果</div>
                    <div>状态：{{ statusPayload.status === 'ok' ? '在线' : '离线' }}</div>
                    <div v-if="statusPayload.device?.serial_number">序列号：{{ statusPayload.device.serial_number }}</div>
                    <div v-if="statusPayload.error" class="text-red-500 mt-2">{{ statusPayload.error }}</div>
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-8">
            <div class="card">
                <DataTable :value="devices" :loading="loading" stripedRows scrollable>
                    <template #header>
                        <div class="flex items-center justify-between gap-3 flex-wrap">
                            <span class="font-semibold">设备列表</span>
                            <Tag severity="contrast" :value="`共 ${devices.length} 台`" />
                        </div>
                    </template>
                    <Column field="name" header="名称" style="min-width: 10rem"></Column>
                    <Column field="ip" header="IP" style="min-width: 10rem"></Column>
                    <Column field="port" header="端口" style="min-width: 7rem"></Column>
                    <Column field="serial_number" header="序列号" style="min-width: 12rem"></Column>
                    <Column field="location" header="位置" style="min-width: 10rem"></Column>
                    <Column header="状态" style="min-width: 8rem">
                        <template #body="{ data }">
                            <Tag :value="statusLabel(data)" :severity="statusSeverity(data)" />
                        </template>
                    </Column>
                    <Column header="操作" style="min-width: 12rem">
                        <template #body="{ data }">
                            <div class="flex gap-2 flex-wrap">
                                <Button label="编辑" text size="small" icon="pi pi-pencil" @click="openEditDialog(data)" />
                                <Button label="删除" text size="small" severity="danger" icon="pi pi-trash" @click="removeDevice(data)" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>

        <Dialog v-model:visible="deviceDialogVisible" modal :header="dialogTitle" :style="{ width: '32rem' }">
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>设备名称</label>
                    <InputText v-model="form.name" />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>设备 IP</label>
                    <InputText v-model="form.ip" />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>端口</label>
                    <InputNumber v-model="form.port" :min="1" :max="65535" :useGrouping="false" fluid />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>序列号</label>
                    <InputText v-model="form.serial_number" />
                </div>
                <div class="col-span-12 flex flex-col gap-2">
                    <label>位置</label>
                    <InputText v-model="form.location" />
                </div>
                <div class="col-span-12">
                    <div class="flex items-center gap-2">
                        <Checkbox v-model="form.is_active" binary inputId="device-active" />
                        <label for="device-active">启用设备</label>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="取消" text @click="deviceDialogVisible = false" />
                    <Button label="保存" :loading="submitLoading" @click="submitDevice" />
                </div>
            </template>
        </Dialog>
    </div>
</template>
