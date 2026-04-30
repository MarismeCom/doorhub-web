# DoorHub Web

DoorHub Web 是门禁与考勤管理系统的前端应用，基于 Vue 3、PrimeVue 和 Vite 构建。当前前端围绕门禁设备、门禁用户、打卡流水、月度考勤、节假日缓存和系统用户管理提供完整操作界面。

## 支持设备

| 品牌 / 协议 | 型号 | 支持状态 | 说明 |
| --- | --- | --- | --- |
| ZK / ZKTeco | xFace600 | 已测试支持 | 当前已完成门禁用户、打卡流水、设备状态与远程开门等核心流程测试 |

## 技术栈

- Vue 3
- Vue Router 4
- PrimeVue 4
- PrimeIcons
- Chart.js
- Tailwind CSS 4
- Vite 5
- 原生 `fetch` API

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置接口地址

开发环境默认通过 Vite 代理访问本机后端：

```env
VITE_API_BASE_URL=/api/v1
```

生产运行时可通过 `public/config.js` 或容器入口脚本生成的配置覆盖接口地址：

```js
window.__APP_CONFIG__ = {
    API_BASE_URL: '/api/v1'
};
```

### 启动开发服务

```bash
npm run dev
```

默认访问地址：

- `http://127.0.0.1:8080`

### 构建

```bash
npm run build
```

## 登录与会话

- 支持账号密码登录。
- 登录成功后保存 `access_token`、`refresh_token` 和当前用户信息到浏览器本地存储。
- 业务路由统一要求登录访问，未登录用户会跳转到 `/auth/login`。
- 接口返回 401 时会清理本地会话。

截图待上传：[docs/images/login.png](docs/images/login.png)

## 功能模块

### 工作台

路径：`/`

工作台用于汇总系统运行状态，方便快速判断门禁与考勤服务是否正常。

已支持功能：

- 门禁用户总数、在职人数、离职人数统计。
- 设备总数、启用设备、停用设备统计。
- 打卡记录总数与近 7 天打卡趋势统计。
- 待处理同步数量统计，包含待同步、待离职同步和同步失败状态。
- 门禁用户结构、设备状态分布、用户同步状态、打卡趋势图表。
- 手动刷新工作台数据。

截图待上传：[docs/images/dashboard.png](docs/images/dashboard.png)

### 打卡流水

路径：`/attendances`

打卡流水用于查看门禁设备采集到的原始打卡记录，并管理手动或定时同步任务。

已支持功能：

- 按用户 ID、用户名称、开始日期、结束日期查询打卡流水。
- 分页查看打卡记录。
- 展示用户 ID、用户名称、UID、打卡时间、状态、打卡类型、设备 SN。
- 打卡时间按 `Asia/Shanghai` 展示。
- 支持选择设备执行手动同步。
- 支持增量同步，已存在记录自动跳过。
- 展示同步进度、同步状态、解析数量、新增数量、重复数量、异常跳过数量。
- 同步任务运行中自动轮询状态。
- 支持启用每日自动同步。
- 支持设置每日同步时间。
- 支持选择定时同步设备范围，未选择时默认同步全部启用设备。

截图待上传：[docs/images/attendances.png](docs/images/attendances.png)

### 考勤记录

路径：`/attendance-records`

考勤记录用于按月查看由打卡流水计算出的日考勤结果，并支持重算和导出。

已支持功能：

- 按月份、工号或姓名、考勤状态筛选日考勤结果。
- 分页查看月度日汇总。
- 展示应出勤天数、实际出勤天数、加班天数、异常次数、总工时、加班总时长。
- 展示日期、日类型、工号、姓名、签到时间、签退时间、迟到分钟、早退分钟、工时、加班、状态。
- 结合节假日缓存展示工作日、周末、节假日、调休班等日类型。
- 支持重算当月考勤记录。
- 支持导出月报文件。

截图待上传：[docs/images/attendance-records.png](docs/images/attendance-records.png)

### 门禁用户

路径：`/users`

门禁用户用于维护门禁设备上的人员资料，并管理本地数据与设备数据之间的同步。

已支持功能：

- 按关键词查询门禁用户。
- 分页和排序查看用户列表。
- 自动获取推荐用户 ID。
- 新建门禁用户，支持姓名、用户 ID、权限、密码、部门、卡号、目标设备。
- 编辑用户资料。
- 将用户标记为离职，保留本地资料，并在同步时清空设备上的密码和卡号。
- 单个用户同步到指定设备，并执行回读校验。
- 批量同步待处理用户到指定设备。
- 从设备读取用户并生成预览。
- 展示设备用户、本地用户、匹配、缺失、差异、冲突统计。
- 查询用户同步状态。
- 展示待同步、待离职同步、已同步、已离职同步、同步失败等状态。

截图待上传：[docs/images/users.png](docs/images/users.png)

### 门禁控制

路径：`/door`

门禁控制用于对指定设备执行远程开门，并查询开门日志。

已支持功能：

- 从设备列表中选择目标设备。
- 设置开锁秒数。
- 填写操作备注。
- 执行远程开门。
- 调用关门说明接口，展示设备闭合策略说明。
- 查询开门日志。
- 按设备筛选日志。
- 分页查看日志列表。
- 展示操作人、设备 IP、动作、结果、备注、操作时间。
- 展示最近一次控制接口响应。

截图待上传：[docs/images/door.png](docs/images/door.png)

### 节假日

路径：`/holiday-cache`

节假日模块用于展示节假日缓存日历，并管理节假日数据刷新策略。

已支持功能：

- 按月份查看节假日日历。
- 展示工作日、周末、节假日、调休班。
- 标记今天。
- 返回今天。
- 展示当前缓存任务状态、执行信息、最近执行年份、刷新条数、开始时间、结束时间。
- 启用或停用节假日缓存自动刷新。
- 支持每日或每周刷新策略。
- 支持设置执行时间。
- 支持设置每周执行日。
- 支持手动刷新指定年份节假日缓存。

截图待上传：[docs/images/holiday-cache.png](docs/images/holiday-cache.png)

### 设备管理

路径：`/devices`

设备管理用于维护门禁设备基础信息，并探测设备运行状态。

已支持功能：

- 查看设备列表。
- 新增设备，支持名称、IP、端口、序列号、位置、启用状态。
- 编辑设备信息。
- 删除设备。
- 输入设备 IP 探测在线状态。
- 展示设备名称、IP、端口、序列号、位置、状态。
- 展示最近探测结果和错误信息。

截图待上传：[docs/images/devices.png](docs/images/devices.png)

### 系统用户

路径：`/system-users`

系统用户模块用于管理后台登录用户、密码和 API Secret。

已支持功能：

- 查看当前登录用户。
- 查看系统用户列表。
- 新建系统用户。
- 查看系统用户详情。
- 编辑用户角色和启用状态。
- 重置指定系统用户密码。
- 修改当前登录用户密码。
- 为系统用户创建 API Secret。
- 查看 API Secret 列表。
- 展示 API Secret 前缀、状态、过期时间、最近使用时间、创建时间。
- 撤销 API Secret。
- 创建成功后仅展示一次明文 Secret。

截图待上传：[docs/images/system-users.png](docs/images/system-users.png)

## 菜单结构

| 菜单分组 | 页面 | 路径 |
| --- | --- | --- |
| 总览 | 工作台 | `/` |
| 考勤服务 | 打卡流水 | `/attendances` |
| 考勤服务 | 考勤记录 | `/attendance-records` |
| 门禁服务 | 门禁用户 | `/users` |
| 门禁服务 | 门禁控制 | `/door` |
| 系统管理 | 节假日 | `/holiday-cache` |
| 系统管理 | 设备管理 | `/devices` |
| 系统管理 | 系统用户 | `/system-users` |

## 已对接接口

### 认证

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

### 工作台

- `GET /api/v1/dashboard/summary`

### 打卡流水

- `GET /api/v1/attendances`
- `POST /api/v1/attendances/sync`
- `GET /api/v1/attendances/sync/status`
- `GET /api/v1/attendances/sync/settings`
- `PUT /api/v1/attendances/sync/settings`

### 考勤记录与节假日缓存

- `GET /api/v1/attendance-records`
- `POST /api/v1/attendance-records/recalculate`
- `GET /api/v1/attendance-records/export/monthly`
- `GET /api/v1/attendance-records/holiday-cache/status`
- `GET /api/v1/attendance-records/holiday-cache/calendar`
- `GET /api/v1/attendance-records/holiday-cache/settings`
- `PUT /api/v1/attendance-records/holiday-cache/settings`
- `POST /api/v1/attendance-records/holiday-cache/refresh`

### 门禁用户

- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/next-user-id`
- `PUT /api/v1/users/{user_id}`
- `DELETE /api/v1/users/{user_id}`
- `POST /api/v1/users/{user_id}/sync`
- `POST /api/v1/users/sync/batch`
- `POST /api/v1/users/sync/from-device`
- `GET /api/v1/users/sync/status`

### 门禁控制

- `POST /api/v1/door/open`
- `POST /api/v1/door/close`
- `GET /api/v1/door/logs`

### 设备管理

- `GET /api/v1/devices`
- `POST /api/v1/devices`
- `PUT /api/v1/devices/{device_id}`
- `DELETE /api/v1/devices/{device_id}`
- `GET /api/v1/devices/{ip}/status`

### 系统用户

- `GET /api/v1/system-users/me`
- `GET /api/v1/system-users`
- `POST /api/v1/system-users`
- `GET /api/v1/system-users/{username}`
- `PATCH /api/v1/system-users/{username}`
- `POST /api/v1/system-users/{username}/reset-password`
- `POST /api/v1/system-users/me/change-password`
- `GET /api/v1/system-users/{username}/api-secrets`
- `POST /api/v1/system-users/{username}/api-secrets`
- `DELETE /api/v1/system-users/{username}/api-secrets/{secret_id}`

## 目录结构

```text
doorhub-web/
├── public/
│   ├── config.js              # 运行时 API 配置
│   └── config.js.tpl          # 容器环境变量模板
├── src/
│   ├── layout/                # 应用布局、侧边栏、顶部栏
│   ├── router/                # 路由与登录守卫
│   ├── service/               # 后端 API 封装与登录态管理
│   ├── views/access/          # 门禁与考勤业务页面
│   └── views/pages/auth/      # 登录、访问拒绝、错误页
├── Dockerfile
├── nginx.conf
├── package.json
└── vite.config.mjs
```

## 截图占位说明

README 已预留以下截图位置。截图完成后，将图片放到 `docs/images/` 并使用对应文件名即可：

- `docs/images/login.png`
- `docs/images/dashboard.png`
- `docs/images/attendances.png`
- `docs/images/attendance-records.png`
- `docs/images/users.png`
- `docs/images/door.png`
- `docs/images/holiday-cache.png`
- `docs/images/devices.png`
- `docs/images/system-users.png`

上传图片后，如果希望 README 直接渲染图片，可将对应占位链接改为相对路径图片语法，例如：

```md
![登录页截图](docs/images/login.png)
```

如果需要使用完整 GitHub 地址渲染图片，请使用 `raw.githubusercontent.com`，不要使用 `github.com/.../blob/...`：

```md
![登录页截图](https://raw.githubusercontent.com/MarismeCom/doorhub-web/main/docs/images/login.png)
```

## 后端联调要求

- 后端开发服务默认运行在 `http://127.0.0.1:8000`。
- 前端开发服务默认运行在 `http://127.0.0.1:8080`。
- Vite 已将 `/api` 代理到后端服务。
- 默认示例账号为 `admin / admin`，以实际后端初始化数据为准。
