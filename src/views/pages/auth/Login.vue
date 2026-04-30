<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { login } from '@/service/auth';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const REMEMBERED_LOGIN_KEY = 'door_access_remembered_login';

const router = useRouter();
const route = useRoute();

const rememberedLogin = readRememberedLogin();
const username = ref(rememberedLogin?.username || '');
const password = ref(rememberedLogin?.password || '');
const checked = ref(Boolean(rememberedLogin));
const loading = ref(false);
const errorMessage = ref('');

function readRememberedLogin() {
    const raw = localStorage.getItem(REMEMBERED_LOGIN_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw);
        return parsed?.username && parsed?.password ? parsed : null;
    } catch {
        localStorage.removeItem(REMEMBERED_LOGIN_KEY);
        return null;
    }
}

function syncRememberedLogin() {
    if (checked.value) {
        localStorage.setItem(
            REMEMBERED_LOGIN_KEY,
            JSON.stringify({
                username: username.value,
                password: password.value
            })
        );
        return;
    }

    localStorage.removeItem(REMEMBERED_LOGIN_KEY);
}

async function submitLogin() {
    loading.value = true;
    errorMessage.value = '';
    try {
        await login(username.value, password.value);
        syncRememberedLogin();
        await router.push(route.query.redirect || '/');
    } catch (error) {
        errorMessage.value = error.message || '登录失败';
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <FloatingConfigurator />
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden px-4 py-6">
        <div class="flex flex-col items-center justify-center w-full">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(15, 23, 42, 0) 30%)">
                <div class="w-[min(92vw,32rem)] bg-surface-0 dark:bg-surface-900 py-10 px-6 sm:px-10 sm:py-14" style="border-radius: 53px">
                    <div class="text-center mb-8">
                        <div class="w-5rem h-5rem border-circle bg-primary-reverse flex align-items-center justify-content-center mx-auto mb-5">
                            <i class="pi pi-shield text-4xl text-primary"></i>
                        </div>
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">门禁管理系统</div>
                        <span class="text-muted-color font-medium">使用系统用户账号登录并访问后端接口</span>
                    </div>

                    <div class="flex flex-col gap-4">
                        <div class="flex flex-col gap-2">
                            <label for="username" class="text-surface-900 dark:text-surface-0 text-xl font-medium">用户名</label>
                            <InputText id="username" type="text" placeholder="请输入用户名" class="w-full" v-model="username" autocomplete="username" @keyup.enter="submitLogin" />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label for="password" class="text-surface-900 dark:text-surface-0 font-medium text-xl">密码</label>
                            <Password id="password" v-model="password" placeholder="请输入密码" :toggleMask="true" fluid :feedback="false" autocomplete="current-password" @keyup.enter="submitLogin"></Password>
                        </div>

                        <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>

                        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-2">
                            <div class="flex items-center flex-wrap gap-2">
                                <Checkbox v-model="checked" id="rememberme1" binary class="mr-2"></Checkbox>
                                <label for="rememberme1">Remember me</label>
                            </div>
                            <span class="text-sm text-color-secondary break-words">勾选后下次自动填充账号密码</span>
                        </div>

                        <Button label="Sign In" class="w-full mt-2" :loading="loading" @click="submitLogin"></Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
