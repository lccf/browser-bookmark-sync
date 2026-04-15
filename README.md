# 浏览器书签同步

一个支持 Chrome 和 Safari 的浏览器书签同步插件，可以将书签数据同步到自建服务端，实现跨浏览器、跨设备的书签管理。

## 功能特性

- 🔖 **书签管理**：创建分组、添加书签、拖动排序
- 🌐 **跨浏览器支持**：支持 Chrome 和 Safari 浏览器
- ☁️ **数据同步**：支持将书签同步到自建服务端
- 💾 **离线模式**：默认离线存储，无需联网即可使用
- 📥 **导入导出**：支持 JSON 格式导入导出书签数据
- 🖼️ **网站图标**：自动显示收藏网站的 favicon
- 🔄 **多种同步模式**：合并同步、本地覆盖、服务端覆盖

## 项目结构

```
browser-bookmark-sync/
├── server/                    # Node.js 服务端
│   ├── index.js              # 服务端主代码
│   ├── package.json          # 依赖配置
│   └── data.json             # 数据存储文件
├── plugin/
│   ├── chrome/               # Chrome 插件
│   │   ├── manifest.json     # 插件配置
│   │   ├── popup.html        # 弹窗页面
│   │   ├── popup.css         # 样式文件
│   │   ├── popup.js          # 弹窗逻辑
│   │   ├── background.js     # 后台脚本
│   │   └── icons/            # 图标文件
│   └── safari/               # Safari 插件
│       └── ...               # 复用 Chrome 代码
└── docs/
    └── task.yml              # 任务列表
```

## 安装说明

### 服务端部署

1. 进入服务端目录：
```bash
cd server
```

2. 安装依赖：
```bash
tyarn install
```

3. 启动服务端：
```bash
tyarn start
```

服务端默认运行在 `http://localhost:3000`

### Chrome 插件安装

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `plugin/chrome` 文件夹

### Safari 插件安装

1. 打开 Safari 浏览器
2. 进入"偏好设置" → "扩展"
3. 开启"开发"菜单（如未显示）
4. 加载 `plugin/safari` 文件夹中的扩展

## 使用说明

### 基本操作

1. **打开插件页面**：点击浏览器工具栏的插件图标，在新标签页中打开书签管理页面

2. **添加书签**：
   - 在网页上右键，选择"收藏当前页面"
   - 在链接上右键，选择"收藏链接"

3. **管理书签**：
   - 创建分组：输入分组名称，点击"添加分组"
   - 拖动排序：拖动书签到不同位置或分组
   - 删除书签/分组：点击右侧的删除按钮

4. **数据同步**：
   - 点击"同步"按钮，将数据同步到服务端
   - 点击同步按钮旁的下拉箭头，选择同步模式：
     - 合并同步：合并本地和服务端数据
     - 本地覆盖：用本地数据覆盖服务端
     - 服务端覆盖：用服务端数据覆盖本地

5. **导入导出**：
   - 导出：点击"导出"按钮，下载 JSON 格式的书签数据
   - 导入：点击"导入"按钮，选择 JSON 文件，支持增量导入和全量覆盖

### 配置服务端地址

1. 点击页面右上角的设置按钮（⚙️）
2. 输入服务端地址，如 `http://localhost:3000`
3. 点击"保存"

## API 接口

服务端提供以下 REST API：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/bookmarks` | GET | 获取所有书签数据 |
| `/api/bookmarks` | POST | 保存书签数据 |
| `/api/groups` | POST | 创建分组 |
| `/api/groups/:id` | DELETE | 删除分组 |
| `/api/groups/:groupId/bookmarks` | POST | 添加书签 |
| `/api/groups/:groupId/bookmarks/:bookmarkId` | DELETE | 删除书签 |
| `/api/groups/:groupId/bookmarks/reorder` | PUT | 更新书签顺序 |

## 技术栈

- **服务端**：Node.js + Express
- **插件**：Chrome Extension Manifest V3 / Safari Extension
- **存储**：Chrome Storage API + 本地 JSON 文件

## 开发说明

### 本地开发

1. 克隆项目：
```bash
git clone <repository-url>
cd browser-bookmark-sync
```

2. 启动服务端：
```bash
cd server
tyarn start
```

3. 加载插件：
   - Chrome：访问 `chrome://extensions/`，加载 `plugin/chrome` 文件夹
   - Safari：在 Safari 中加载 `plugin/safari` 文件夹

### 构建说明

本项目无需构建步骤，直接加载源码即可使用。

## 注意事项

1. **数据安全**：服务端默认使用本地 JSON 文件存储数据，生产环境建议添加身份验证
2. **跨域问题**：如需跨域访问服务端，请确保服务端 CORS 配置正确
3. **Safari 支持**：Safari 插件使用 Manifest V2，部分 API 与 Chrome 略有差异

## 许可证

MIT License
