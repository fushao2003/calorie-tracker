# 热量追踪 (Calorie Tracker)

一个纯前端 PWA 热量记录应用，帮助记录每日饮食摄入，追踪热量与宏量营养素。

## 功能

- **今日记录** — 记录每餐食物摄入，显示单品热量及蛋白质/脂肪/碳水含量
- **热量环** — 可视化展示当日热量目标完成度
- **宏量营养素统计** — 汇总当日蛋白质、脂肪、碳水总量
- **食物营养库** — 管理常用食物及其每 100g 营养数据
- **餐食模板** — 保存常用餐食搭配，一键记录
- **历史记录** — 按日查看过往饮食记录
- **周视图** — 一周热量与营养素趋势总览
- **数据导入/导出** — JSON 格式备份与恢复
- **PWA 离线支持** — 可安装到手机桌面，离线可用

## 技术栈

- 纯 HTML/CSS/JavaScript，无框架依赖
- IndexedDB 本地存储，无需后端
- Service Worker 离线缓存
- Web App Manifest（可安装 PWA）

## 使用方式

直接用浏览器打开 `index.html`，或部署到任意静态服务：

```bash
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 文件结构

```
├── index.html       # 应用入口
├── manifest.json    # PWA 清单
├── sw.js            # Service Worker
├── css/
│   └── app.css      # 样式
├── js/
│   ├── app.js       # 业务逻辑与事件处理
│   ├── db.js        # IndexedDB 数据层
│   └── ui.js        # DOM 渲染
└── icons/           # PWA 图标
```
