<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { devicesService } from '@/service/devices';
import { usersService } from '@/service/users';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const confirm = useConfirm();
const toast = useToast();
const loading = ref(false);
const users = ref([]);
const total = ref(0);
const syncStatus = ref(null);
const syncPreview = ref(null);
const deviceOptions = ref([]);
const selectedUser = ref(null);
const editDialogVisible = ref(false);
const sortField = ref(null);
const sortOrder = ref(-1);

const listParams = reactive({ keyword: '', page: 1, page_size: 20, sort_field: null, sort_order: 'desc' });
const createForm = reactive({
    name: '',
    user_id: '',
    privilege: 0,
    password: '',
    group_id: '',
    card: 0,
    device_ip: '192.168.1.201'
});
const editForm = reactive({
    name: '',
    user_id: '',
    privilege: 0,
    password: '',
    group_id: '',
    card: 0
});
const syncForm = reactive({
    device_ip: '192.168.1.201',
    mode: 'preview',
    user_id: ''
});
const privilegeOptions = [
    { label: '普通用户', value: 0 },
    { label: '超级管理员', value: 14 }
];
const currentSyncDeviceLabel = computed(() => {
    if (!syncForm.device_ip) {
        return '未选择设备';
    }
    return deviceOptions.value.find((item) => item.value === syncForm.device_ip)?.label || syncForm.device_ip;
});

const syncStatusMeta = computed(() => {
    if (!syncStatus.value?.users) {
        return [];
    }

    return syncStatus.value.users.map((item) => ({
        ...item,
        severity: syncStatusSeverity(item.sync_status)
    }));
});

async function loadDeviceOptions() {
    try {
        const response = await devicesService.list();
        deviceOptions.value = (response.data.devices || []).map((device) => ({
            label: `${device.name} (${device.ip})`,
            value: device.ip
        }));

        if (!createForm.device_ip && deviceOptions.value.length > 0) {
            createForm.device_ip = deviceOptions.value[0].value;
        }
        if (!syncForm.device_ip && deviceOptions.value.length > 0) {
            syncForm.device_ip = deviceOptions.value[0].value;
        }
    } catch (error) {
        toast.add({ severity: 'warn', summary: '设备列表加载失败', detail: error.message, life: 3000 });
    }
}

async function loadUsers() {
    loading.value = true;
    try {
        const response = await usersService.list(listParams);
        users.value = response.data.users;
        total.value = response.data.total;
    } catch (error) {
        toast.add({ severity: 'error', summary: '加载失败', detail: error.message, life: 3000 });
    } finally {
        loading.value = false;
    }
}

async function loadSuggestedUserId(force = false) {
    if (!force && createForm.user_id) {
        return;
    }

    try {
        const response = await usersService.nextUserId();
        createForm.user_id = response.data?.user_id || '';
    } catch (error) {
        toast.add({ severity: 'warn', summary: '推荐用户ID加载失败', detail: error.message, life: 3000 });
    }
}

function duplicateFieldMessage(error) {
    const duplicateFields = error?.payload?.detail?.duplicate_fields;
    if (!Array.isArray(duplicateFields) || duplicateFields.length === 0) {
        return error.message;
    }

    return duplicateFields.map((item) => `${item.label}“${item.value}”已存在`).join('；');
}

async function submitCreate() {
    try {
        await usersService.create({ ...createForm, card: Number(createForm.card || 0) });
        Object.assign(createForm, { name: '', user_id: '', privilege: 0, password: '', group_id: '', card: 0, device_ip: createForm.device_ip });
        toast.add({ severity: 'success', summary: '创建成功', detail: '门禁用户已创建', life: 2500 });
        listParams.page = 1;
        await loadUsers();
        await loadSuggestedUserId(true);
    } catch (error) {
        toast.add({ severity: 'error', summary: '创建失败', detail: duplicateFieldMessage(error), life: 3000 });
    }
}

function prepareEdit(user) {
    selectedUser.value = user;
    Object.assign(editForm, {
        name: user.name || '',
        user_id: user.user_id || '',
        privilege: Number(user.privilege || 0),
        password: user.password || '',
        group_id: user.group_id || '',
        card: Number(user.card || 0)
    });
    editDialogVisible.value = true;
}

async function submitEdit() {
    if (!selectedUser.value) {
        return;
    }

    try {
        await usersService.update(selectedUser.value.user_id, {
            name: editForm.name,
            privilege: Number(editForm.privilege || 0),
            password: editForm.password,
            group_id: editForm.group_id,
            card: Number(editForm.card || 0)
        });
        editDialogVisible.value = false;
        toast.add({ severity: 'success', summary: '更新成功', detail: '用户信息已更新，请继续同步到设备', life: 2500 });
        await loadUsers();
        await refreshSyncStatus();
    } catch (error) {
        toast.add({ severity: 'error', summary: '更新失败', detail: duplicateFieldMessage(error), life: 3000 });
    }
}

function deleteUser(userId) {
    confirm.require({
        message: `确认将门禁用户 ${userId} 设为离职吗？离职后会保留本地资料，并在同步时清空设备上的密码和卡号。`,
        header: '离职确认',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: { label: '取消', severity: 'secondary', outlined: true },
        acceptProps: { label: '设为离职', severity: 'warn' },
        accept: async () => {
            try {
                await usersService.remove(userId);
                toast.add({ severity: 'success', summary: '设置成功', detail: `用户 ${userId} 已标记为离职，等待同步到设备`, life: 2500 });
                await loadUsers();
            } catch (error) {
                toast.add({ severity: 'error', summary: '设置失败', detail: error.message, life: 3000 });
            }
        }
    });
}

async function syncOne(userId) {
    try {
        const response = await usersService.syncOne(userId, syncForm.device_ip);
        toast.add({
            severity: 'success',
            summary: '同步成功',
            detail: response.message || `用户 ${userId} 已同步到设备并完成回读校验`,
            life: 3000
        });
        await refreshSyncStatus();
        await loadUsers();
    } catch (error) {
        toast.add({ severity: 'error', summary: '同步失败', detail: error.message, life: 3000 });
    }
}

async function syncBatch() {
    try {
        await usersService.syncBatch(syncForm.device_ip);
        toast.add({ severity: 'success', summary: '批量同步完成', detail: '待处理用户已执行批量同步', life: 2500 });
        await refreshSyncStatus();
        await loadUsers();
    } catch (error) {
        toast.add({ severity: 'error', summary: '批量同步失败', detail: error.message, life: 3000 });
    }
}

async function previewFromDevice(mode = 'preview') {
    try {
        const response = await usersService.syncFromDevice({ device_ip: syncForm.device_ip, mode });
        syncPreview.value = response.data;
        toast.add({
            severity: 'success',
            summary: '设备同步完成',
            detail: mode === 'preview' ? '已刷新设备用户预览' : `已执行 ${mode}`,
            life: 2500
        });
        await loadUsers();
    } catch (error) {
        toast.add({ severity: 'error', summary: '设备同步失败', detail: error.message, life: 3000 });
    }
}

async function refreshSyncStatus() {
    try {
        const response = await usersService.syncStatus(syncForm.user_id || undefined);
        syncStatus.value = response.data;
    } catch (error) {
        toast.add({ severity: 'error', summary: '状态查询失败', detail: error.message, life: 3000 });
    }
}

function handlePage(event) {
    listParams.page = event.page + 1;
    listParams.page_size = event.rows;
    loadUsers();
}

function handleSort(event) {
    sortField.value = event.sortField || null;
    sortOrder.value = event.sortOrder ?? -1;
    listParams.sort_field = event.sortField || null;
    listParams.sort_order = event.sortOrder === 1 ? 'asc' : 'desc';
    listParams.page = 1;
    loadUsers();
}

function resetSearch() {
    listParams.keyword = '';
    listParams.page = 1;
    listParams.page_size = 20;
    listParams.sort_field = null;
    listParams.sort_order = 'desc';
    sortField.value = null;
    sortOrder.value = -1;
    loadUsers();
}

function previewSummaryItems() {
    if (!syncPreview.value) {
        return [];
    }

    return [
        { label: '设备用户', value: syncPreview.value.device_total, severity: 'info' },
        { label: '本地用户', value: syncPreview.value.local_total, severity: 'contrast' },
        { label: '匹配', value: syncPreview.value.matched_count, severity: 'success' },
        { label: '缺失', value: syncPreview.value.missing_in_local_count, severity: 'warn' },
        { label: '差异', value: syncPreview.value.different_in_local_count, severity: 'danger' },
        { label: '冲突', value: syncPreview.value.uid_conflict_count, severity: 'secondary' }
    ];
}

function diffFieldNames(item) {
    const snapshot = item.local_snapshot || {};
    const fields = ['name', 'privilege', 'password', 'card', 'group_id'];
    return fields.filter((field) => {
        const localValue = snapshot[field] ?? '';
        const deviceValue = item[field] ?? '';
        return String(localValue) !== String(deviceValue);
    });
}

function syncStatusLabel(status) {
    switch (status) {
        case 'pending':
            return '待同步';
        case 'pending_disable':
            return '待离职同步';
        case 'pending_delete':
            return '待删除同步';
        case 'synced':
            return '已同步';
        case 'synced_disabled':
            return '已离职同步';
        case 'synced_deleted':
            return '已同步删除';
        case 'failed':
            return '同步失败';
        default:
            return status;
    }
}

function syncStatusSeverity(status) {
    switch (status) {
        case 'pending':
            return 'warn';
        case 'pending_disable':
            return 'warn';
        case 'pending_delete':
            return 'danger';
        case 'synced':
        case 'synced_disabled':
        case 'synced_deleted':
            return 'success';
        case 'failed':
            return 'danger';
        default:
            return 'contrast';
    }
}

function employmentStatusLabel(status) {
    return status === 'disabled' ? '离职' : '在职';
}

function employmentStatusSeverity(status) {
    return status === 'disabled' ? 'contrast' : 'success';
}

function privilegeLabel(value) {
    return privilegeOptions.find((item) => item.value === value)?.label || `未知权限(${value})`;
}

onMounted(async () => {
    createForm.device_ip = '';
    syncForm.device_ip = '';
    await loadDeviceOptions();
    await loadSuggestedUserId(true);
    await loadUsers();
    await refreshSyncStatus();
});
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12">
            <div class="card">
                <h1 class="text-2xl font-semibold m-0">门禁用户管理</h1>
                <p class="text-color-secondary mt-2 mb-0">覆盖本地用户查询、创建、离职、同步与设备回写预览。</p>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-5">
            <div class="card h-full">
                <h2 class="text-xl mt-0">创建门禁用户</h2>
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                        <label>姓名</label>
                        <InputText v-model="createForm.name" fluid />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                        <label>用户 ID</label>
                        <div class="flex items-start gap-2">
                            <InputText v-model="createForm.user_id" class="flex-1" fluid />
                            <Button label="刷新" severity="secondary" outlined @click="loadSuggestedUserId(true)" />
                        </div>
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                        <label>权限</label>
                        <Select v-model="createForm.privilege" :options="privilegeOptions" optionLabel="label" optionValue="value" placeholder="选择权限" fluid />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                        <label>卡号</label>
                        <InputNumber v-model="createForm.card" :useGrouping="false" fluid />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                        <label>密码</label>
                        <InputText v-model="createForm.password" fluid />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                        <label>组 ID</label>
                        <InputText v-model="createForm.group_id" fluid />
                    </div>
                    <div class="col-span-12 flex flex-col gap-2">
                        <label>设备 IP</label>
                        <Select v-model="createForm.device_ip" :options="deviceOptions" optionLabel="label" optionValue="value" placeholder="选择设备" fluid />
                    </div>
                </div>
                <div class="mt-4">
                    <Button label="创建用户" icon="pi pi-plus" @click="submitCreate" />
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-7">
            <div class="card h-full">
                <h2 class="text-xl mt-0">同步控制台</h2>
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                        <label>设备 IP</label>
                        <Select v-model="syncForm.device_ip" :options="deviceOptions" optionLabel="label" optionValue="value" placeholder="选择设备" fluid />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                        <label>按用户查询同步状态</label>
                        <InputText v-model="syncForm.user_id" fluid />
                    </div>
                </div>
                <div class="sync-console-actions mt-4">
                    <Button class="sync-console-action" label="刷新同步状态" severity="secondary" @click="refreshSyncStatus" />
                    <Button class="sync-console-action" label="批量同步待处理用户" @click="syncBatch" />
                    <Button class="sync-console-action" label="设备用户预览" severity="contrast" @click="previewFromDevice('preview')" />
                    <Button class="sync-console-action" label="写入缺失用户" severity="help" @click="previewFromDevice('write_missing')" />
                    <Button class="sync-console-action" label="覆盖本地数据库" severity="warn" @click="previewFromDevice('overwrite_local')" />
                </div>
                <div class="mt-4 flex items-center gap-2 flex-wrap">
                    <span class="text-sm text-color-secondary">当前同步目标设备</span>
                    <Tag severity="info" :value="currentSyncDeviceLabel" />
                </div>
                <p class="text-sm text-color-secondary mt-3 mb-0">单个“同步设备”只会下发当前用户；若用户已离职，则会把设备上的密码和卡号清空，并立即回读校验。</p>
                <Divider />
                <div v-if="syncStatus?.users?.length" class="flex gap-2 flex-wrap">
                    <Tag v-for="item in syncStatusMeta" :key="`${item.user_id}-${item.sync_status}`" :severity="item.severity" :value="`${item.user_id} ${syncStatusLabel(item.sync_status)}`" />
                </div>
                <pre class="bg-surface-100 p-3 border-round text-sm overflow-auto mt-4">{{ JSON.stringify(syncStatus, null, 2) }}</pre>
            </div>
        </div>

        <div class="col-span-12">
            <div class="card">
                <DataTable :value="users" :loading="loading" :sort-field="sortField" :sort-order="sortOrder" dataKey="user_id" lazy stripedRows scrollable @sort="handleSort">
                    <template #header>
                        <div class="flex items-center justify-between gap-3 flex-wrap">
                            <div class="flex flex-col gap-1">
                                <span class="font-semibold">本地门禁用户</span>
                                <span class="text-sm text-color-secondary">点击列表头按全量数据排序，排序后再分页显示。</span>
                            </div>
                            <div class="flex items-center gap-3 flex-wrap">
                                <IconField>
                                    <InputIcon class="pi pi-search" />
                                    <InputText v-model="listParams.keyword" placeholder="搜索用户 ID 或姓名" class="w-16rem" @keyup.enter="loadUsers" />
                                </IconField>
                                <Button label="查询" icon="pi pi-filter" size="small" class="min-w-5rem justify-center" @click="loadUsers" />
                                <Button label="重置" icon="pi pi-refresh" severity="secondary" size="small" class="min-w-5rem justify-center" @click="resetSearch" />
                                <Tag severity="contrast" :value="`共 ${total} 条`" class="text-sm" />
                            </div>
                        </div>
                    </template>
                    <Column field="uid" header="UID" sortable style="min-width: 6rem"></Column>
                    <Column field="user_id" header="用户 ID" sortable style="min-width: 9rem"></Column>
                    <Column field="name" header="姓名" sortable style="min-width: 8rem"></Column>
                    <Column field="status" header="状态" sortable style="min-width: 7rem">
                        <template #body="{ data }">
                            <Tag :value="employmentStatusLabel(data.status)" :severity="employmentStatusSeverity(data.status)" />
                        </template>
                    </Column>
                    <Column field="privilege" header="权限" sortable style="min-width: 7rem">
                        <template #body="{ data }">
                            <Tag :value="privilegeLabel(data.privilege)" severity="info" />
                        </template>
                    </Column>
                    <Column field="password" header="密码" sortable style="min-width: 8rem"></Column>
                    <Column field="card" header="卡号" sortable style="min-width: 8rem"></Column>
                    <Column field="sync_status" header="同步状态" sortable style="min-width: 9rem">
                        <template #body="{ data }">
                            <Tag :value="syncStatusLabel(data.sync_status)" :severity="syncStatusSeverity(data.sync_status)" />
                        </template>
                    </Column>
                    <Column header="操作" style="min-width: 19rem">
                        <template #body="{ data }">
                            <div class="user-row-actions">
                                <Button label="编辑" text size="small" severity="secondary" @click="prepareEdit(data)" />
                                <Button :label="`同步设备 (${syncForm.device_ip || '未选择'})`" text size="small" @click="syncOne(data.user_id)" />
                                <Button label="离职" text size="small" severity="warn" @click="deleteUser(data.user_id)" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
                <Paginator :rows="listParams.page_size" :totalRecords="total" :first="(listParams.page - 1) * listParams.page_size" :rowsPerPageOptions="[10, 20, 50]" class="mt-4" @page="handlePage" />
            </div>
        </div>

        <Dialog v-model:visible="editDialogVisible" modal header="编辑本地门禁用户" :style="{ width: 'min(36rem, 92vw)' }" @hide="selectedUser = null">
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>姓名</label>
                    <InputText v-model="editForm.name" fluid />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>用户 ID</label>
                    <InputText v-model="editForm.user_id" disabled fluid />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>权限</label>
                    <Select v-model="editForm.privilege" :options="privilegeOptions" optionLabel="label" optionValue="value" placeholder="选择权限" fluid />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>卡号</label>
                    <InputNumber v-model="editForm.card" :useGrouping="false" fluid />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>密码</label>
                    <InputText v-model="editForm.password" fluid />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-col gap-2">
                    <label>组 ID</label>
                    <InputText v-model="editForm.group_id" fluid />
                </div>
            </div>
            <template #footer>
                <Button label="取消" text @click="editDialogVisible = false" />
                <Button label="保存修改" @click="submitEdit" />
            </template>
        </Dialog>

        <div class="col-span-12" v-if="syncPreview">
            <div class="card">
                <h2 class="text-xl mt-0">设备同步预览 / 结果</h2>
                <div class="grid grid-cols-12 gap-4 mb-4">
                    <div v-for="item in previewSummaryItems()" :key="item.label" class="col-span-6 md:col-span-4 xl:col-span-2">
                        <div class="p-3 bg-surface-100 border-round text-center">
                            <div class="text-color-secondary text-sm mb-2">{{ item.label }}</div>
                            <Tag :severity="item.severity" :value="item.value" />
                        </div>
                    </div>
                </div>

                <Accordion :multiple="true" :activeIndex="[0, 1, 2]">
                    <AccordionTab header="本地缺失用户">
                        <DataTable :value="syncPreview.missing_in_local" stripedRows size="small">
                            <Column field="uid" header="UID" style="min-width: 6rem"></Column>
                            <Column field="user_id" header="用户 ID" style="min-width: 9rem"></Column>
                            <Column field="name" header="姓名" style="min-width: 8rem"></Column>
                            <Column header="权限" style="min-width: 7rem">
                                <template #body="{ data }">
                                    {{ privilegeLabel(data.privilege) }}
                                </template>
                            </Column>
                            <Column field="password" header="密码" style="min-width: 8rem"></Column>
                            <Column field="card" header="卡号" style="min-width: 8rem"></Column>
                        </DataTable>
                    </AccordionTab>
                    <AccordionTab header="本地差异用户">
                        <DataTable :value="syncPreview.different_in_local" stripedRows size="small">
                            <Column field="uid" header="UID" style="min-width: 6rem"></Column>
                            <Column field="user_id" header="用户 ID" style="min-width: 9rem"></Column>
                            <Column field="name" header="设备姓名" style="min-width: 9rem"></Column>
                            <Column header="差异字段" style="min-width: 10rem">
                                <template #body="{ data }">
                                    <div class="flex gap-2 flex-wrap">
                                        <Tag v-for="field in diffFieldNames(data)" :key="field" severity="warn" :value="field" />
                                    </div>
                                </template>
                            </Column>
                            <Column header="本地快照" style="min-width: 20rem">
                                <template #body="{ data }">
                                    <pre class="m-0 text-xs bg-surface-100 p-2 border-round overflow-auto">{{ JSON.stringify(data.local_snapshot, null, 2) }}</pre>
                                </template>
                            </Column>
                        </DataTable>
                    </AccordionTab>
                    <AccordionTab header="UID 冲突">
                        <DataTable :value="syncPreview.uid_conflicts" stripedRows size="small">
                            <Column field="uid" header="UID" style="min-width: 6rem"></Column>
                            <Column field="user_id" header="设备用户 ID" style="min-width: 10rem"></Column>
                            <Column field="name" header="设备姓名" style="min-width: 9rem"></Column>
                            <Column header="冲突本地快照" style="min-width: 20rem">
                                <template #body="{ data }">
                                    <pre class="m-0 text-xs bg-surface-100 p-2 border-round overflow-auto">{{ JSON.stringify(data.local_snapshot, null, 2) }}</pre>
                                </template>
                            </Column>
                        </DataTable>
                    </AccordionTab>
                </Accordion>
            </div>
        </div>
    </div>
</template>

<style scoped>
.sync-console-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
    gap: 0.5rem;
}

.sync-console-action {
    width: 100%;
    justify-content: center;
}

.user-row-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

@media (max-width: 640px) {
    .user-row-actions :deep(.p-button) {
        flex: 1 1 8.5rem;
    }
}
</style>
