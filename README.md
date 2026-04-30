# Door Access Frontend

基于 `sakai-vue` 模板开发的门禁管理前端，负责对接当前后端 `FastAPI` 服务的全部核心接口。

## 技术栈

- Vue 3
- PrimeVue 4
- Sakai Vue Layout
- Vite
- 原生 `fetch` API

## 目录说明

```text
frontend/
├── src/
│   ├── layout/                 # Sakai 布局与侧边栏、顶部栏
│   ├── router/                 # 路由与登录守卫
│   ├── service/                # 后端 API 封装与登录态管理
│   └── views/
│       ├── access/             # 业务页面
│       └── pages/auth/         # 复用并改造的登录页
├── .env.example
└── vite.config.mjs
```

## 已对接的后端接口

### 认证

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

### 系统用户

- `GET /api/v1/system-users/me`
- `GET /api/v1/system-users`
- `POST /api/v1/system-users`
- `GET /api/v1/system-users/{username}`
- `PATCH /api/v1/system-users/{username}`
- `POST /api/v1/system-users/{username}/reset-password`
- `POST /api/v1/system-users/me/change-password`

### 门禁用户

- `GET /api/v1/users`
- `POST /api/v1/users`
- `DELETE /api/v1/users/{user_id}`
- `POST /api/v1/users/{user_id}/sync`
- `POST /api/v1/users/sync/batch`
- `POST /api/v1/users/sync/from-device`
- `GET /api/v1/users/sync/status`

### 设备

- `GET /api/v1/devices`
- `GET /api/v1/devices/{ip}/status`

### 打卡记录

- `GET /api/v1/attendances`
- `POST /api/v1/attendances/sync`

### 门禁控制

- `POST /api/v1/door/open`
- `POST /api/v1/door/close`
- `GET /api/v1/door/logs`

## 页面与菜单映射

- `工作台`：系统入口与模块导航
- `系统用户`：查看当前用户、列表、创建、更新、重置密码、修改个人密码
- `门禁用户`：列表、创建、删除、单个同步、批量同步、设备用户回写预览
- `设备管理`：设备列表、设备状态探测
- `打卡记录`：分页查询、手动同步
- `门禁控制`：开门、关门说明、日志查询

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化子模块

```bash
git submodule update --init --recursive
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

默认通过 Vite 代理转发到本机后端：

```env
VITE_API_BASE_URL=/api/v1
```

### 4. 启动开发服务器

```bash
npm run dev
```

默认端口：

- `http://127.0.0.1:8080`

## 后端联调要求

- 后端服务默认运行在 `http://127.0.0.1:8000`
- Vite 已配置 `/api` 代理到后端
- 登录默认示例账号为 `admin / admin`

## 下一步建议

- 为表格增加分页与筛选状态持久化
- 为写操作增加确认弹窗与 Toast 反馈
- 给门禁用户同步预览增加更好的差异化展示
