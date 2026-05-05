# 湖北FMO中继 · 点名参与纪念证书查询系统

<div align="center">

[![Version](https://img.shields.io/badge/version-3.0.1-blue?style=flat-square)](https://github.com/Honest16888/fmocert)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](https://github.com/Honest16888/fmocert/blob/main/LICENSE)
[![PHP](https://img.shields.io/badge/PHP-7.4%2B-777BB4?style=flat-square&logo=php&logoColor=white)](https://www.php.net/)
[![Status](https://img.shields.io/badge/status-active-brightgreen?style=flat-square)](https://github.com/Honest16888/fmocert)

**Hubei FMO Repeater Roll Call Certificate Query System**

为业余无线电中继台例行点名活动参与者提供电子纪念证书服务

</div>

---

## 📖 项目简介

本系统是为湖北FMO中继台例行点名活动设计的电子纪念证书管理平台。台站可以通过输入呼号查询、下载、打印和分享自己的点名参与证书。系统采用纯原生前端（HTML5 + CSS3 + JavaScript）和PHP后端架构，无需数据库依赖，部署简单，适合小型业余无线电社群使用。

## ✨ 功能特性

### 🔍 核心功能

| 功能 | 说明 |
|------|------|
| 证书查询 | 输入呼号快速查询证书，支持模糊搜索和搜索历史 |
| 证书下载 | 生成高质量 PNG 证书图片（2x 分辨率） |
| 证书打印 | 支持直接打印证书，自动适配打印样式 |
| 证书分享 | 生成分享链接，支持微信二维码扫码查看 |

### 🎨 证书模板系统

- **4种预设模板**：经典红金、现代蓝白、典雅墨绿、奢华黑金
- **自定义颜色**：支持边框色、标题色实时调整
- **文字自定义**：证书标题、副标题、说明文字均可配置
- **实时预览**：修改后即时预览效果

### 📊 数据管理

| 功能 | 说明 |
|------|------|
| 统计分析 | 查询/下载趋势图表（7天/30天） |
| 荣誉墙 | 台站活跃度展示，实时统计数据 |
| 月度排行 | Top 10 活跃台站排行榜 |
| 证书验证 | 在线验证证书编号真伪 |

### ⚙️ 管理后台

- **呼号管理** - 支持批量导入（.txt / .csv / .docx），拖拽上传
- **公告系统** - 弹窗公告配置，支持每日/每次显示
- **SSTV辅助** - 慢扫描电视模式参考工具，22种模式详解
- **Webhook推送** - 支持企业微信 / 钉钉 / 飞书通知
- **数据备份** - 一键备份/恢复，危险操作前自动备份
- **健康检查** - 系统状态监控（PHP版本、磁盘空间、文件权限）

### 🔒 安全特性

| 安全措施 | 说明 |
|----------|------|
| 密码加密 | bcrypt 哈希存储，向兼容 MD5 |
| XSS防护 | 输入验证 + 输出编码双重防护 |
| 防暴力破解 | 登录限流（5次/15分钟） |
| API限流 | 公开接口限流（30次/分钟） |
| 会话管理 | Token认证，2小时有效期 |
| 操作日志 | 完整的审计记录，IP脱敏存储 |

### 🌙 用户体验

- **深色模式** - 一键切换护眼暗色主题
- **键盘快捷键** - Ctrl+S 保存、Esc 关闭、Enter 查询
- **模糊搜索** - 支持中间匹配，关键词高亮
- **搜索历史** - 记录最近8条查询
- **响应式设计** - 适配桌面端和移动端

## 🛠️ 技术栈

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | HTML5 + CSS3 + JavaScript | 零框架依赖，原生实现 |
| 后端 | PHP 7.4+ | 纯PHP，无第三方框架 |
| 存储 | JSON 文件 | 轻量级，无需数据库 |
| 图表 | Canvas 2D | 原生绘制趋势图 |
| 证书 | html2canvas | 高质量图片生成 |
| 二维码 | qrcode-generator | SVG格式二维码 |
| 文档解析 | mammoth.js | .docx文件导入支持 |

## 📦 安装部署

### 环境要求

| 依赖 | 最低版本 | 说明 |
|------|----------|------|
| PHP | 7.4+ | 推荐 8.0+ |
| curl扩展 | - | Webhook推送需要 |
| json扩展 | - | JSON数据处理需要 |
| Web服务器 | - | Apache / Nginx / PHP内置服务器 |

### 快速开始

**第一步：克隆项目**

```bash
git clone https://github.com/Honest16888/fmocert.git
cd fmocert
```

**第二步：配置Web服务器**

将项目目录指向Web服务器根目录，或配置虚拟主机。

**第三步：设置目录权限（Linux）**

```bash
chmod 755 .
chmod 644 *.php *.html *.css *.js
```

**第四步：访问系统**

打开浏览器访问 `http://your-domain/`

默认管理员密码：`123456`（请及时修改）

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/fmocert;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### Apache 配置

确保启用 `mod_rewrite` 模块，项目自带 `.htaccess` 支持。

### 本地开发测试

```bash
# 使用PHP内置服务器快速测试
php -S localhost:8000
# 然后访问 http://localhost:8000
```

## 📁 项目结构

```
fmocert/
├── index.html              # 前端主页面
├── style.css               # 样式表（含深色模式、打印样式）
├── app.js                  # 前端逻辑（模块化架构）
├── api.php                 # 后端API（RESTful风格）
├── .gitignore              # Git忽略配置
├── README.md               # 项目说明文档
└── LICENSE                 # MIT开源许可证
```

### 运行时自动生成的数据文件

```
├── pwd.txt                 # 管理员密码（bcrypt加密）
├── list.txt                # 呼号名单
├── status.txt              # 查询通道状态（0/1）
├── notice.json             # 公告弹窗配置
├── cert.json               # 证书模板配置
├── basic.json              # 基本设置（日期、前缀）
├── features.json           # 功能开关配置
├── stats.json              # 统计数据（查询/下载记录）
├── visit_log.json          # 访问日志（最多500条）
├── sstv.json               # SSTV栏目开关
├── sstv_history.json       # SSTV接收历史记录
├── backups/                # 自动备份目录（30天自动清理）
└── unlock.txt              # 管理后台解锁暗号
```

## 🔧 配置说明

### 管理后台

通过搜索框输入暗号（默认：`FM02025`）可解锁管理后台，或点击页面底部"管理员登录"按钮。

### 证书模板配置

管理后台 -> 证书模板预览与设置 -> 选择模板 -> 自定义颜色 -> 预览 -> 保存

### Webhook推送配置

支持三种推送方式：

| 平台 | 说明 |
|------|------|
| 企业微信 | 机器人Webhook URL |
| 钉钉 | 自定义机器人Webhook |
| 飞书 | 自定义机器人Webhook |

在管理后台 -> 功能开关管理 中配置Webhook URL。

## 📜 更新日志

### v3.0.1（2026-05-05）- 地图修复版

**Bug修复**
- 修复台站分布地图数据加载失败问题
  - 替换失效的 ECharts 5.x 地图 GeoJSON CDN 地址为 4.x 版本（ECharts 5.x 已移除内置地图数据）
  - 地图加载超时时间从 8秒 增加到 15秒
  - 添加地图加载失败的控制台日志输出，便于排查

### v3.0.0（2026-05-05）- 三新功能版

**新功能**
- 新增中国地图热力图（ECharts）
  - 呼号前缀自动解析省份（ITU分配表）
  - 省份热力图颜色深浅表示台站数量
  - 主控呼号在地图上高亮发光显示（金色标注）
  - 支持地图缩放、拖拽、悬浮详情
- 新增台站勋章成就系统
  - 8种勋章：首次参与🏅/连续参与🔥/早期参与⚡/分享达人📤/收藏家🏆/老台站🎖️
  - 5级等级系统：新手🌱→铜牌🥉→银牌🥈→金牌🥇→钻石💎
  - 主控呼号特殊标识（⭐主控台站）
  - 已获得/待解锁勋章分区展示
- 新增意见反馈系统（详见v2.9.0）

**其他**
- 新增ECharts中国地图CDN依赖
- 更新版本号至v3.0.0

### v2.9.0（2026-05-05）- 意见反馈版

**新功能**
- 新增前台意见反馈入口（底部渐变按钮）
- 新增意见意向反馈弹窗（功能建议/问题反馈/好评鼓励/其他四类）
- 新增反馈提交API（匿名提交，支持联系方式选填）
- 新增后台"意见倾听"管理面板
- 支持查看/标为已读/删除/清空反馈
- 未读反馈数量角标实时显示

### v2.8.3（2026-05-05）- 移动端优化版

**移动端优化**
- 全面优化手机端页面显示效果
- Header标题缩小字号、减小内边距，避免小屏溢出
- 统计栏/卡片/按钮/搜索框全面适配小屏
- SSTV面板/模式卡片/标签页移动端自适应
- 证书模板缩小字号和间距，适配窄屏
- 管理后台表单改为纵向布局，标签和输入框堆叠
- Toast通知移动端底部居中显示
- 深色模式按钮缩小适配
- 日期选择器/列表容器/模态框移动端优化

### v2.8.2（2026-05-05）- 稳定性优化版

**Bug修复**
- 修复页面刷新时总点名人数跳为0的问题
- 修复快速反复刷新页面弹出"加载失败"错误提示
- 修复并发请求导致的PHP文件锁竞争问题
- 修复 `Promise.all` 级联失败导致整个页面加载中断

**性能优化**
- 新增IP归属地查询缓存机制（7天有效，最多1000条），消除重复外部HTTP请求
- 核心加载接口（list/status/notice/cert/basic）免除API限流
- 核心加载接口跳过日志文件写入，消除并发文件锁竞争
- `reloadList()` 添加自动重试机制（最多3次，递增延迟）
- `fetchWithTimeout()` 包装函数，5秒超时防止请求挂起
- `Promise.all` 改为 `Promise.allSettled`，单个请求失败不影响其他
- 新增 `sessionStorage` 名单缓存，刷新时瞬间恢复数据
- 已有缓存数据时网络失败静默降级，不弹错误提示

**其他**
- 底部版本号添加GitHub仓库跳转链接
- 更新版本号至 v2.8.2

### v2.8.0（2026-05-04）- 管理后台优化版

**界面优化**
- 优化登录后主页面显示逻辑
- 登录后仅显示登录状态和管理后台入口
- 隐藏退出登录按钮，简化前端界面
- 管理功能统一迁移到独立后台页面
 
### v2.5.0（2026-05-04）- 全面优化版

**安全加固**
- 新增 bcrypt 密码加密存储
- 新增 XSS 防护（输入验证 + 输出编码）
- 新增 API 限流保护（30次/分钟）
- 新增输入长度限制和格式验证
- 新增路径遍历防护
- 新增安全HTTP响应头

**新功能**
- 新增多模板证书系统（4种预设模板 + 自定义颜色）
- 新增证书直接打印功能
- 新增模糊搜索（支持中间匹配，关键词高亮）
- 新增搜索历史记录（最近8条）
- 新增日志导出CSV
- 新增系统信息和版本号显示
- 新增"关于本系统"面板
- 新增Git版本控制支持
- 新增自动备份机制（危险操作前自动快照）

**优化**
- 优化键盘快捷键（Ctrl+S / Esc / Enter）
- 优化无障碍访问（ARIA标签、焦点样式、高对比度）
- 优化打印样式（自动隐藏非证书元素）
- 优化深色模式
- 优化减少动画偏好支持
- 优化文件安全写入（原子操作防并发）

### v2.0.0（2026-04-01）

- 新增 SSTV 接收辅助工具（22种模式）
- 新增证书在线验证
- 新增台站荣誉墙
- 新增月度活跃排行榜
- 新增 Webhook 推送（企业微信/钉钉/飞书）
- 新增批量证书导出
- 新增趋势数据图表

### v1.0.0（2026-01-01）

- 初始版本发布
- 证书查询、下载、分享功能
- 管理后台基础功能

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'feat: Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 创建 Pull Request

### Commit 规范

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` Bug修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `perf:` 性能优化
- `test:` 测试相关

## 📄 开源协议

本项目基于 MIT 协议开源，详见 [LICENSE](LICENSE) 文件。

## 👨‍💻 开发者

**BH6RGQ** - 湖北FMO中继台

## 🙏 致谢

| 项目 | 用途 |
|------|------|
| [Font Awesome](https://fontawesome.com/) | 图标库 |
| [html2canvas](https://html2canvas.hertzen.com/) | 证书图片生成 |
| [qrcode-generator](https://github.com/nicklockwood/QRCodeGenerator) | 二维码生成 |
| [mammoth.js](https://github.com/mwilliamson/mammoth.js) | Word文档解析 |
| [blueimp-md5](https://github.com/blueimp/JavaScript-MD5) | MD5哈希计算 |

## 📮 联系方式

- 项目地址：[https://github.com/Honest16888/fmocert](https://github.com/Honest16888/fmocert)
- 问题反馈：[GitHub Issues](https://github.com/Honest16888/fmocert/issues)

---

<div align="center">

**湖北FMO中继台 © 2026**

*业余无线电，连接你我*

</div>
