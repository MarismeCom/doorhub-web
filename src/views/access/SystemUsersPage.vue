<script setup>
import { onMounted, reactive, ref } from 'vue';
import { systemUsersService } from '@/service/systemUsers';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const loading = ref(false);
const users = ref([]);
const me = ref(null);
const selectedUser = ref(null);
const detail = ref(null);
const detailDialog = ref(false);
const createDialog = ref(false);
const editDialog = ref(false);
const resetDialog = ref(false);
const passwordDialog = ref(false);
const apiSecretDialog = ref(false);
const apiSecrets = ref([]);
const createdSecret = ref(null);

const createForm = reactive({ username: '', password: '', role: 'user' });
const editForm = reactive({ role: 'user', is_active: true });
const resetForm = reactive({ new_password: '' });
const changePasswordForm = reactive({ old_password: '', new_password: '' });
const apiSecretForm = reactive({ name: '', expires_at: '' });

async function loadUsers() {
    loading.value = true;
    try {
        const [meResponse, listResponse] = await Promise.all([systemUsersService.getMe(), systemUsersService.list()]);
        me.value = meResponse.data;
        users.value = listResponse.data.users;
    } catch (error) {
        toast.add({ severity: 'error', summary: '加载失败', detail: error.message, life: 3000 });
    } finally {
        loading.value = false;
    }
}

async function openDetail(username) {
    const [detailResponse, secretsResponse] = await Promise.all([
        systemUsersService.get(username),
        systemUsersService.listApiSecrets(username)
    ]);
    detail.value = detailResponse.data;
    apiSecrets.value = secretsResponse.data.items || [];
    detailDialog.value = true;
}

async function submitCreate() {
    try {
        await systemUsersService.create({ ...createForm });
        createDialog.value = false;
        Object.assign(createForm, { username: '', password: '', role: 'user' });
        toast.add({ severity: 'success', summary: '创建成功', detail: '系统用户已创建', life: 2500 });
        await loadUsers();
    } catch (error) {
        toast.add({ severity: 'error', summary: '创建失败', detail: error.message, life: 3000 });
    }
}

function prepareEdit(user) {
    selectedUser.value = user;
    Object.assign(editForm, { role: user.role, is_active: user.is_active });
    editDialog.value = true;
}

async function submitEdit() {
    try {
        await systemUsersService.update(selectedUser.value.username, {
            role: editForm.role,
            is_active: editForm.is_active
        });
        editDialog.value = false;
        toast.add({ severity: 'success', summary: '更新成功', detail: '系统用户已更新', life: 2500 });
        await loadUsers();
    } catch (error) {
        toast.add({ severity: 'error', summary: '更新失败', detail: error.message, life: 3000 });
    }
}

function prepareReset(user) {
    selectedUser.value = user;
    resetForm.new_password = '';
    resetDialog.value = true;
}

async function submitReset() {
    try {
        await systemUsersService.resetPassword(selectedUser.value.username, { ...resetForm });
        resetDialog.value = false;
        toast.add({ severity: 'success', summary: '重置成功', detail: '密码已重置', life: 2500 });
    } catch (error) {
        toast.add({ severity: 'error', summary: '重置失败', detail: error.message, life: 3000 });
    }
}

async function submitChangePassword() {
    try {
        await systemUsersService.changePassword({ ...changePasswordForm });
        passwordDialog.value = false;
        Object.assign(changePasswordForm, { old_password: '', new_password: '' });
        toast.add({ severity: 'success', summary: '修改成功', detail: '密码已更新', life: 2500 });
    } catch (error) {
        toast.add({ severity: 'error', summary: '修改失败', detail: error.message, life: 3000 });
    }
}

function prepareApiSecret(user) {
    selectedUser.value = user;
    createdSecret.value = null;
    apiSecrets.value = [];
    Object.assign(apiSecretForm, { name: '', expires_at: '' });
    loadApiSecrets(user.username);
    apiSecretDialog.value = true;
}

async function loadApiSecrets(username) {
    const response = await systemUsersService.listApiSecrets(username);
    apiSecrets.value = response.data.items || [];
}

async function submitApiSecret() {
    try {
        const payload = {
            name: apiSecretForm.name,
            expires_at: apiSecretForm.expires_at || null
        };
        const response = await systemUsersService.createApiSecret(selectedUser.value.username, payload);
        createdSecret.value = response.data.secret;
        Object.assign(apiSecretForm, { name: '', expires_at: '' });
        toast.add({ severity: 'success', summary: '创建成功', detail: 'API Secret 已创建，请立即保存明文 Secret', life: 3000 });
        await loadApiSecrets(selectedUser.value.username);
    } catch (error) {
        toast.add({ severity: 'error', summary: '创建失败', detail: error.message, life: 3000 });
    }
}

async function revokeApiSecret(secretId) {
    try {
        await systemUsersService.revokeApiSecret(selectedUser.value.username, secretId);
        toast.add({ severity: 'success', summary: '撤销成功', detail: 'API Secret 已撤销', life: 2500 });
        await loadApiSecrets(selectedUser.value.username);
    } catch (error) {
        toast.add({ severity: 'error', summary: '撤销失败', detail: error.message, life: 3000 });
    }
}

function secretStatus(secret) {
    if (secret.revoked_at) {
        return { label: '已撤销', severity: 'contrast' };
    }
    if (secret.expires_at && new Date(secret.expires_at).getTime() <= Date.now()) {
        return { label: '已过期', severity: 'warn' };
    }
    return { label: '有效', severity: 'success' };
}

onMounted(loadUsers);
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12">
            <div class="card">
                <div class="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                    <div>
                        <h1 class="text-2xl font-semibold m-0">系统用户管理</h1>
                        <p class="text-color-secondary mt-2 mb-0">覆盖 `/system-users`、`/system-users/me`、密码修改与密码重置接口。</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <Button label="修改我的密码" icon="pi pi-key" severity="secondary" @click="passwordDialog = true" />
                        <Button label="新建系统用户" icon="pi pi-plus" @click="createDialog = true" />
                    </div>
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-4">
            <div class="card h-full">
                <h2 class="text-xl mt-0">当前登录用户</h2>
                <Skeleton v-if="loading" height="8rem" />
                <div v-else-if="me" class="flex flex-col gap-3">
                    <div><strong>用户名：</strong>{{ me.username }}</div>
                    <div><strong>角色：</strong><Tag :value="me.role" :severity="me.role === 'admin' ? 'danger' : 'info'" /></div>
                    <div><strong>状态：</strong><Tag :value="me.is_active ? '启用' : '停用'" :severity="me.is_active ? 'success' : 'contrast'" /></div>
                </div>
            </div>
        </div>

        <div class="col-span-12 xl:col-span-8">
            <div class="card">
                <DataTable :value="users" :loading="loading" dataKey="username" stripedRows scrollable>
                    <template #header>
                        <div class="flex items-center justify-between gap-3 flex-wrap">
                            <span class="font-semibold">系统用户列表</span>
                            <Tag severity="contrast" :value="`共 ${users.length} 个用户`" />
                        </div>
                    </template>
                    <Column field="username" header="用户名"></Column>
                    <Column field="role" header="角色">
                        <template #body="{ data }">
                            <Tag :value="data.role" :severity="data.role === 'admin' ? 'danger' : 'info'" />
                        </template>
                    </Column>
                    <Column field="is_active" header="状态">
                        <template #body="{ data }">
                            <Tag :value="data.is_active ? '启用' : '停用'" :severity="data.is_active ? 'success' : 'contrast'" />
                        </template>
                    </Column>
                    <Column header="操作" style="width: 28rem">
                        <template #body="{ data }">
                            <div class="flex items-center gap-2 whitespace-nowrap">
                                <Button label="详情" text size="small" @click="openDetail(data.username)" />
                                <Button label="编辑" text size="small" @click="prepareEdit(data)" />
                                <Button label="API Secret" text size="small" severity="secondary" @click="prepareApiSecret(data)" />
                                <Button label="重置密码" text size="small" severity="warn" @click="prepareReset(data)" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>

        <Dialog v-model:visible="createDialog" modal header="创建系统用户" :style="{ width: 'min(32rem, 92vw)' }">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                    <label>用户名</label>
                    <InputText v-model="createForm.username" />
                </div>
                <div class="flex flex-col gap-2">
                    <label>密码</label>
                    <Password v-model="createForm.password" toggleMask :feedback="false" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label>角色</label>
                    <Select v-model="createForm.role" :options="['admin', 'user']" />
                </div>
            </div>
            <template #footer>
                <Button label="取消" text @click="createDialog = false" />
                <Button label="创建" @click="submitCreate" />
            </template>
        </Dialog>

        <Dialog v-model:visible="editDialog" modal header="更新系统用户" :style="{ width: 'min(30rem, 92vw)' }">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                    <label>角色</label>
                    <Select v-model="editForm.role" :options="['admin', 'user']" />
                </div>
                <div class="flex items-center gap-2">
                    <InputSwitch v-model="editForm.is_active" />
                    <span>启用用户</span>
                </div>
            </div>
            <template #footer>
                <Button label="取消" text @click="editDialog = false" />
                <Button label="保存" @click="submitEdit" />
            </template>
        </Dialog>

        <Dialog v-model:visible="resetDialog" modal header="重置系统用户密码" :style="{ width: 'min(30rem, 92vw)' }">
            <div class="flex flex-col gap-2">
                <label>新密码</label>
                <Password v-model="resetForm.new_password" toggleMask :feedback="false" fluid />
            </div>
            <template #footer>
                <Button label="取消" text @click="resetDialog = false" />
                <Button label="重置" severity="warn" @click="submitReset" />
            </template>
        </Dialog>

        <Dialog v-model:visible="passwordDialog" modal header="修改我的密码" :style="{ width: 'min(30rem, 92vw)' }">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                    <label>旧密码</label>
                    <Password v-model="changePasswordForm.old_password" toggleMask :feedback="false" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label>新密码</label>
                    <Password v-model="changePasswordForm.new_password" toggleMask :feedback="false" fluid />
                </div>
            </div>
            <template #footer>
                <Button label="取消" text @click="passwordDialog = false" />
                <Button label="修改" @click="submitChangePassword" />
            </template>
        </Dialog>

        <Dialog
            v-model:visible="detailDialog"
            modal
            header="系统用户详情"
            :style="{ width: 'min(30rem, 92vw)' }"
            @hide="detail = null"
        >
            <div v-if="detail" class="flex flex-col gap-3">
                <div><strong>用户名：</strong>{{ detail.username }}</div>
                <div><strong>角色：</strong>{{ detail.role }}</div>
                <div><strong>状态：</strong>{{ detail.is_active ? '启用' : '停用' }}</div>
                <div><strong>创建时间：</strong>{{ detail.created_at || '-' }}</div>
                <div><strong>更新时间：</strong>{{ detail.updated_at || '-' }}</div>
                <div><strong>API Secret：</strong>{{ apiSecrets.length }} 个</div>
            </div>
        </Dialog>

        <Dialog
            v-model:visible="apiSecretDialog"
            modal
            header="管理 API Secret"
            :style="{ width: 'min(72rem, 96vw)' }"
            @hide="createdSecret = null"
        >
            <div class="flex flex-col gap-4">
                <div class="text-sm text-color-secondary">每个系统用户最多创建 3 个有效 API Secret。明文 Secret 仅在创建成功时显示一次。</div>
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-5 flex flex-col gap-2">
                        <label>名称</label>
                        <InputText v-model="apiSecretForm.name" />
                    </div>
                    <div class="col-span-12 md:col-span-5 flex flex-col gap-2">
                        <label>过期时间</label>
                        <InputText v-model="apiSecretForm.expires_at" placeholder="例如 2026-05-31T23:00:00+08:00" />
                    </div>
                    <div class="col-span-12 md:col-span-2 flex items-end">
                        <Button label="创建" class="w-full" @click="submitApiSecret" />
                    </div>
                </div>

                <div v-if="createdSecret" class="p-3 border-round bg-green-50 border-1 border-green-200">
                    <div class="font-semibold mb-2">请立即保存 API Secret</div>
                    <code class="block text-sm break-all">{{ createdSecret }}</code>
                </div>

                <DataTable :value="apiSecrets" dataKey="id" stripedRows size="small" scrollable>
                    <Column field="name" header="名称" style="min-width: 12rem"></Column>
                    <Column field="secret_prefix" header="前缀" style="min-width: 10rem"></Column>
                    <Column header="状态" style="min-width: 8rem">
                        <template #body="{ data }">
                            <Tag :value="secretStatus(data).label" :severity="secretStatus(data).severity" />
                        </template>
                    </Column>
                    <Column field="expires_at" header="过期时间" style="min-width: 14rem"></Column>
                    <Column field="last_used_at" header="最近使用" style="min-width: 14rem"></Column>
                    <Column field="created_at" header="创建时间" style="min-width: 14rem"></Column>
                    <Column header="操作" style="min-width: 8rem">
                        <template #body="{ data }">
                            <Button label="撤销" text size="small" severity="danger" :disabled="!!data.revoked_at" @click="revokeApiSecret(data.id)" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </Dialog>
    </div>
</template>
