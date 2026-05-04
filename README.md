# 湖北FMO中继 · 点名参与纪念证书查询系统

<div align="center">

![Version](https://img.shields.io/badge/version-2.5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![PHP](https://img.shields.io/badge/PHP-7.4+-purple)
![Status](https://img.shields.io/badge/status-active-brightgreen)

**Hubei FMO Repeater Roll Call Certificate Query System**

为业余无线电中继台例行点名活动参与者提供电子纪念证书服务

</div>

---

## 项目简介

本系统是为湖北FMO中继台例行点名活动设计的电子纪念证书管理平台。台站可以通过输入呼号查询、下载、打印和分享自己的点名参与证书。

## 功能特性

### 核心功能

- **证书查询** - 输入呼号快速查询证书
- **证书下载** - 生成高质量PNG证书图片
- **证书打印** - 支持直接打印证书
- **证书分享** - 生成分享链接，支持微信二维码

### 证书系统

- **多模板系统** - 4种预设模板（经典红金、现代蓝白、典雅墨绿、奢华黑金）
- **自定义颜色** - 支持边框色、标题色自定义
- **文字自定义** - 证书标题、副标题、说明文字可配置

### 数据管理

- **统计分析** - 查询/下载趋势图表
- **荣誉墙** - 台站活跃度展示
- **月度排行** - Top 10 活跃台站
- **证书验证** - 在线验证证书真伪

### 管理后台

- **呼号管理** - 支持批量导入（.txt / .csv / .docx）
- **公告系统** - 弹窗公告配置
- **SSTV辅助** - 慢扫描电视模式参考工具
- **Webhook推送** - 支持企业微信 / 钉钉 / 飞书
- **数据备份** - 一键备份/恢复

### 安全特性

- **bcrypt密码加密** - 安全的密码存储
- **XSS防护** - 输入输出双重防护
- **防暴力破解** - 登录限流保护
- **操作日志** - 完整的操作审计记录
- **会话管理** - Token认证，2小时有效期

### 用户体验

- **深色模式** - 护眼暗色主题
- **键盘快捷键** - Ctrl+S 保存、Esc 关闭
- **模糊搜索** - 支持中间匹配和搜索历史
- **响应式设计** - 适配移动端

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | 原生 HTML5 + CSS3 + JavaScript（零框架依赖） |
| 后端 | PHP 7.4+（纯PHP，无第三方框架） |
| 存储 | JSON文件存储（轻量级，无需数据库） |
| 图表 | Canvas 2D 原生绘制 |
| 证书 | html2canvas |
| 二维码 | qrcode-generator |

## 安装部署

### 环境要求

- PHP 7.4 或更高版本
- 启用 `curl`、`json` 扩展
- Web服务器（Apache / Nginx）

### 快速开始

**第一步：克隆项目**

```bash
git clone https://github.com/Honest16888/fmocert.git
cd fmocert
```

**第二步：配置Web服务器**

将项目目录指向Web服务器根目录，或配置虚拟主机。

**第三步：设置目录权限**

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

## 项目结构

```
fmocert/
├── index.html          # 前端主页面
├── style.css           # 样式表
├── app.js              # 前端逻辑
├── api.php             # 后端API
├── .gitignore          # Git忽略配置
├── README.md           # 项目说明
└── LICENSE             # 开源许可证
```

### 运行时自动生成的文件

```
├── pwd.txt             # 管理员密码（bcrypt加密）
├── list.txt            # 呼号名单
├── status.txt          # 查询通道状态
├── notice.json         # 公告配置
├── cert.json           # 证书模板配置
├── basic.json          # 基本设置
├── features.json       # 功能开关
├── stats.json          # 统计数据
├── visit_log.json      # 访问日志
├── sstv.json           # SSTV配置
├── sstv_history.json   # SSTV历史
├── backups/            # 自动备份目录
└── unlock.txt          # 解锁暗号
```

## 配置说明

### 管理后台

通过搜索框输入暗号（默认：`FM02025`）可解锁管理后台，或点击页面底部管理员登录。

### 证书模板

管理后台 -> 证书模板预览与设置，可选择模板和自定义颜色。

### Webhook配置

支持三种推送方式：

- 企业微信
- 钉钉
- 飞书

在管理后台 -> 功能开关管理 中配置Webhook URL。

## 更新日志

### v2.5.0（2025-05-04）全面优化版

- 安全加固：bcrypt密码、XSS防护、CSRF防护
- 新增多模板证书系统（4种预设+自定义颜色）
- 新增模糊搜索和搜索历史
- 新增证书直接打印功能
- 新增日志导出CSV
- 新增键盘快捷键
- 无障碍优化（ARIA标签、焦点样式）
- 打印样式优化
- 深色模式增强
- Git版本控制支持

### v2.0.0（2025-04-01）

- 新增SSTV接收辅助工具
- 新增证书在线验证
- 新增台站荣誉墙
- 新增月度排行榜
- 新增Webhook推送
- 新增批量证书导出
- 新增趋势图表

### v1.0.0（2025-01-01）

- 初始版本发布
- 证书查询、下载、分享
- 管理后台

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 创建 Pull Request

## 开源协议

本项目基于 MIT 协议开源，详见 [LICENSE](LICENSE) 文件。

## 开发者

**BH6RGQ** - 湖北FMO中继台

## 致谢

- [Font Awesome](https://fontawesome.com/) - 图标库
- [html2canvas](https://html2canvas.hertzen.com/) - 证书图片生成
- [qrcode-generator](https://github.com/nicklockwood/QRCodeGenerator) - 二维码生成
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) - Word文档解析

## 联系方式

- 项目地址：[https://github.com/Honest16888/fmocert](https://github.com/Honest16888/fmocert)
- 问题反馈：[Issues](https://github.com/Honest16888/fmocert/issues)

---

**湖北FMO中继台 2025** | 业余无线电，连接你我
