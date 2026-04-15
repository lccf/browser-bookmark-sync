// 默认服务端地址
const DEFAULT_SERVER_URL = 'http://localhost:3000';

// 存储键名
const STORAGE_KEY = 'bookmark_sync_data';
const SERVER_URL_KEY = 'bookmark_server_url';
const SYNC_MODE_KEY = 'bookmark_sync_mode';

// 同步模式
const SYNC_MODES = {
  MERGE: 'merge',    // 合并同步
  LOCAL: 'local',    // 本地覆盖
  SERVER: 'server'   // 服务端覆盖
};

// 获取同步模式
async function getSyncMode() {
  const result = await chrome.storage.sync.get(SYNC_MODE_KEY);
  return result[SYNC_MODE_KEY] || SYNC_MODES.MERGE;
}

// 保存同步模式
async function setSyncMode(mode) {
  await chrome.storage.sync.set({ [SYNC_MODE_KEY]: mode });
}

// 获取服务端地址
async function getServerUrl() {
  const result = await chrome.storage.sync.get(SERVER_URL_KEY);
  return result[SERVER_URL_KEY] || DEFAULT_SERVER_URL;
}

// 保存服务端地址
async function setServerUrl(url) {
  await chrome.storage.sync.set({ [SERVER_URL_KEY]: url });
}

// 获取本地存储的书签数据
async function getLocalData() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || { groups: [{ id: 'default', name: '默认分组', bookmarks: [] }] };
}

// 保存本地书签数据
async function setLocalData(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

// 合并两组数据
function mergeGroups(localGroups, serverGroups) {
  const mergedMap = new Map();
  
  // 添加本地分组
  localGroups.forEach(group => {
    mergedMap.set(group.id, { ...group, bookmarks: [...group.bookmarks] });
  });
  
  // 合并服务端分组
  serverGroups.forEach(serverGroup => {
    if (mergedMap.has(serverGroup.id)) {
      // 合并书签
      const localGroup = mergedMap.get(serverGroup.id);
      const bookmarkUrls = new Set(localGroup.bookmarks.map(b => b.url));
      serverGroup.bookmarks.forEach(serverBookmark => {
        if (!bookmarkUrls.has(serverBookmark.url)) {
          localGroup.bookmarks.push(serverBookmark);
        }
      });
    } else {
      // 添加服务端独有的分组
      mergedMap.set(serverGroup.id, { ...serverGroup, bookmarks: [...serverGroup.bookmarks] });
    }
  });
  
  return Array.from(mergedMap.values());
}

// 执行同步
async function performSync() {
  const serverUrl = await getServerUrl();
  const syncMode = await getSyncMode();
  const localData = await getLocalData();
  
  try {
    // 获取服务端数据
    const response = await fetch(`${serverUrl}/api/bookmarks`);
    if (!response.ok) {
      showSyncStatus('获取服务端数据失败', 'error');
      return;
    }
    
    const serverData = await response.json();
    let finalData;
    
    switch (syncMode) {
      case SYNC_MODES.LOCAL:
        // 本地覆盖：将本地数据上传到服务端
        finalData = localData;
        break;
        
      case SYNC_MODES.SERVER:
        // 服务端覆盖：使用服务端数据
        finalData = serverData;
        break;
        
      case SYNC_MODES.MERGE:
      default:
        // 合并同步：合并本地和服务端数据
        finalData = {
          groups: mergeGroups(localData.groups, serverData.groups)
        };
        break;
    }
    
    // 保存到本地
    await setLocalData(finalData);
    
    // 上传到服务端
    const uploadResponse = await fetch(`${serverUrl}/api/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalData)
    });
    
    if (uploadResponse.ok) {
      showSyncStatus('同步成功!', 'success');
      renderBookmarks();
    } else {
      showSyncStatus('同步到服务端失败', 'error');
    }
  } catch (error) {
    showSyncStatus('连接失败', 'error');
    console.error('同步失败:', error);
  }
}

// 显示同步状态
function showSyncStatus(message, type) {
  const statusEl = document.getElementById('syncStatus');
  statusEl.textContent = message;
  statusEl.style.color = type === 'success' ? '#4CAF50' : '#f44336';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 3000);
}

// 渲染书签列表
async function renderBookmarks() {
  const data = await getLocalData();
  const container = document.getElementById('bookmarksList');
  
  if (!data.groups || data.groups.length === 0) {
    container.innerHTML = '<div class="empty-tip">暂无书签，右键网页或标签页添加</div>';
    return;
  }
  
  container.innerHTML = data.groups.map(group => `
    <div class="group" draggable="true" data-group-id="${group.id}">
      <div class="group-header">
        <span class="group-drag-handle">⋮⋮</span>
        <span class="group-toggle">▼</span>
        <span class="group-name">${escapeHtml(group.name)}</span>
        <span class="group-count">${group.bookmarks.length}</span>
        ${group.id !== 'default' ? `<button class="group-delete" data-group-id="${group.id}">×</button>` : ''}
      </div>
      <div class="bookmarks-container">
        ${group.bookmarks.map((bookmark, index) => `
          <div class="bookmark-item" draggable="true" data-bookmark-id="${bookmark.id}" data-index="${index}">
            <span class="bookmark-drag-handle">⋮⋮</span>
            <img class="bookmark-favicon" src="${getFaviconUrl(bookmark.url)}" alt="">
            <a href="${escapeHtml(bookmark.url)}" class="bookmark-link" target="_blank" title="${escapeHtml(bookmark.title)}">
              ${escapeHtml(bookmark.title)}
            </a>
            <button class="bookmark-delete" data-bookmark-id="${bookmark.id}" data-group-id="${group.id}">×</button>
          </div>
        `).join('')}
        ${group.bookmarks.length === 0 ? '<div class="empty-tip">分组为空</div>' : ''}
      </div>
    </div>
  `).join('');
  
  // 绑定事件
  bindGroupEvents();
  bindBookmarkEvents();
  bindDragEvents();
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 获取网站 favicon URL
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16`;
  } catch {
    return 'https://www.google.com/s2/favicons?domain=example.com&sz=16';
  }
}

// 绑定分组事件
function bindGroupEvents() {
  // 展开/折叠
  document.querySelectorAll('.group-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.group-delete')) return;
      const group = header.closest('.group');
      group.classList.toggle('collapsed');
    });
  });
  
  // 删除分组
  document.querySelectorAll('.group-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const groupId = btn.dataset.groupId;
      if (confirm('确定要删除这个分组吗？分组内的书签也会被删除。')) {
        const data = await getLocalData();
        data.groups = data.groups.filter(g => g.id !== groupId);
        await setLocalData(data);
        renderBookmarks();
      }
    });
  });
}

// 绑定书签事件
function bindBookmarkEvents() {
  // favicon 加载失败时隐藏
  document.querySelectorAll('.bookmark-favicon').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
    });
  });
  
  // 删除书签
  document.querySelectorAll('.bookmark-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const bookmarkId = btn.dataset.bookmarkId;
      const groupId = btn.dataset.groupId;
      
      const data = await getLocalData();
      const group = data.groups.find(g => g.id === groupId);
      if (group) {
        group.bookmarks = group.bookmarks.filter(b => b.id !== bookmarkId);
        await setLocalData(data);
        renderBookmarks();
      }
    });
  });
}

// 绑定拖拽事件
function bindDragEvents() {
  // 书签拖拽
  const draggables = document.querySelectorAll('.bookmark-item');
  const containers = document.querySelectorAll('.bookmarks-container');
  
  draggables.forEach(draggable => {
    draggable.addEventListener('dragstart', (e) => {
      draggable.classList.add('dragging');
      e.stopPropagation();
    });
    
    draggable.addEventListener('dragend', async () => {
      draggable.classList.remove('dragging');
      // 延迟保存，确保 DOM 已更新
      setTimeout(async () => {
        await saveBookmarkOrder();
      }, 0);
    });
  });
  
  containers.forEach(container => {
    container.addEventListener('dragover', e => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      const draggable = document.querySelector('.bookmark-item.dragging');
      if (!draggable) return;
      if (afterElement == null) {
        container.appendChild(draggable);
      } else {
        container.insertBefore(draggable, afterElement);
      }
    });
  });
  
  // 分组拖拽
  const groupElements = document.querySelectorAll('.group');
  const bookmarksList = document.getElementById('bookmarksList');
  
  groupElements.forEach(group => {
    group.addEventListener('dragstart', (e) => {
      group.classList.add('group-dragging');
      e.stopPropagation();
    });
    
    group.addEventListener('dragend', async () => {
      group.classList.remove('group-dragging');
      // 保存分组顺序
      await saveGroupOrder();
    });
  });
  
  if (bookmarksList) {
    bookmarksList.addEventListener('dragover', e => {
      const draggingGroup = document.querySelector('.group-dragging');
      if (!draggingGroup) return;
      
      e.preventDefault();
      const afterGroup = getDragAfterGroup(bookmarksList, e.clientY);
      if (afterGroup == null) {
        bookmarksList.appendChild(draggingGroup);
      } else {
        bookmarksList.insertBefore(draggingGroup, afterGroup);
      }
    });
  }
}

// 获取拖拽后的位置
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.bookmark-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 获取分组拖拽后的位置
function getDragAfterGroup(container, y) {
  const draggableElements = [...container.querySelectorAll('.group:not(.group-dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 保存分组顺序
async function saveGroupOrder() {
  const data = await getLocalData();
  const bookmarksList = document.getElementById('bookmarksList');
  if (!bookmarksList) return;
  
  const groupIds = [...bookmarksList.querySelectorAll('.group')].map(el => el.dataset.groupId);
  const groupMap = new Map(data.groups.map(g => [g.id, g]));
  
  // 按 DOM 顺序重新排列分组
  data.groups = groupIds.map(id => groupMap.get(id)).filter(Boolean);
  
  await setLocalData(data);
}

// 保存书签顺序（支持跨分组拖拽）
async function saveBookmarkOrder() {
  const data = await getLocalData();
  
  // 先从所有分组收集所有书签（用于跨分组查找）
  const allBookmarksMap = new Map();
  data.groups.forEach(g => {
    g.bookmarks.forEach(b => allBookmarksMap.set(b.id, b));
  });
  
  // 创建新的分组数据数组
  const newGroups = data.groups.map(g => ({ ...g, bookmarks: [] }));
  
  // 根据当前 DOM 状态更新各分组的书签
  document.querySelectorAll('.group').forEach(groupEl => {
    const groupId = groupEl.dataset.groupId;
    const group = newGroups.find(g => g.id === groupId);
    if (group) {
      const bookmarkIds = [...groupEl.querySelectorAll('.bookmark-item')].map(el => el.dataset.bookmarkId);
      group.bookmarks = bookmarkIds.map(id => allBookmarksMap.get(id)).filter(Boolean);
    }
  });
  
  // 更新数据
  data.groups = newGroups;
  await setLocalData(data);
  
  // 重新渲染以更新空分组提示和计数
  await renderBookmarks();
}

// 添加书签到默认分组
async function addBookmark(title, url) {
  const data = await getLocalData();
  const defaultGroup = data.groups.find(g => g.id === 'default') || data.groups[0];
  
  // 检查是否已存在
  const exists = defaultGroup.bookmarks.some(b => b.url === url);
  if (exists) {
    return { success: false, message: '该书签已存在' };
  }
  
  const bookmark = {
    id: Date.now().toString(),
    title: title || url,
    url: url,
    createdAt: new Date().toISOString()
  };
  
  defaultGroup.bookmarks.push(bookmark);
  await setLocalData(data);
  return { success: true };
}

// 更新同步模式UI
async function updateSyncModeUI() {
  const currentMode = await getSyncMode();
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.classList.toggle('active', item.dataset.mode === currentMode);
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 先渲染本地数据（离线模式）
  await renderBookmarks();
  
  // 更新同步模式UI
  await updateSyncModeUI();
  
  // 页面获得焦点时重新渲染（处理从其他页面返回的情况）
  window.addEventListener('focus', async () => {
    await renderBookmarks();
  });
  
  // 配置按钮
  document.getElementById('configBtn').addEventListener('click', async () => {
    const serverUrl = await getServerUrl();
    document.getElementById('serverUrl').value = serverUrl;
    document.getElementById('configModal').classList.remove('hidden');
  });
  
  // 保存配置
  document.getElementById('saveConfig').addEventListener('click', async () => {
    const url = document.getElementById('serverUrl').value.trim() || DEFAULT_SERVER_URL;
    await setServerUrl(url);
    document.getElementById('configModal').classList.add('hidden');
  });
  
  // 取消配置
  document.getElementById('cancelConfig').addEventListener('click', () => {
    document.getElementById('configModal').classList.add('hidden');
  });
  
  // 同步按钮
  document.getElementById('syncBtn').addEventListener('click', performSync);
  
  // 同步模式下拉菜单
  const syncModeBtn = document.getElementById('syncModeBtn');
  const syncModeMenu = document.getElementById('syncModeMenu');
  
  syncModeBtn.addEventListener('click', () => {
    syncModeMenu.classList.toggle('hidden');
  });
  
  // 点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sync-dropdown')) {
      syncModeMenu.classList.add('hidden');
    }
  });
  
  // 选择同步模式
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', async () => {
      const mode = item.dataset.mode;
      await setSyncMode(mode);
      await updateSyncModeUI();
      syncModeMenu.classList.add('hidden');
    });
  });
  
  // 添加分组
  document.getElementById('addGroupBtn').addEventListener('click', async () => {
    const name = document.getElementById('newGroupName').value.trim();
    if (!name) {
      alert('请输入分组名称');
      return;
    }
    
    const data = await getLocalData();
    const newGroup = {
      id: Date.now().toString(),
      name: name,
      bookmarks: []
    };
    data.groups.push(newGroup);
    await setLocalData(data);
    document.getElementById('newGroupName').value = '';
    renderBookmarks();
  });
  
  // 导出功能
  document.getElementById('exportBtn').addEventListener('click', async () => {
    const data = await getLocalData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSyncStatus('导出成功!', 'success');
  });
  
  // 导入功能
  let importFileContent = null;
  let selectedFileName = '';
  const importFileInput = document.getElementById('importFile');
  const importModal = document.getElementById('importModal');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const selectedFileNameEl = document.getElementById('selectedFileName');
  const confirmImportBtn = document.getElementById('confirmImport');
  
  // 打开导入弹窗
  document.getElementById('importBtn').addEventListener('click', () => {
    // 重置状态
    importFileContent = null;
    selectedFileName = '';
    selectedFileNameEl.textContent = '未选择文件';
    selectedFileNameEl.classList.remove('has-file');
    confirmImportBtn.disabled = true;
    importFileInput.value = '';
    // 默认选中增量导入
    document.querySelector('input[name="importMode"][value="merge"]').checked = true;
    importModal.classList.remove('hidden');
  });
  
  // 选择文件按钮
  selectFileBtn.addEventListener('click', () => {
    importFileInput.click();
  });
  
  // 文件选择变化
  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    selectedFileName = file.name;
    selectedFileNameEl.textContent = file.name;
    selectedFileNameEl.classList.add('has-file');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        importFileContent = JSON.parse(event.target.result);
        confirmImportBtn.disabled = false;
      } catch (error) {
        alert('文件格式错误，请上传有效的 JSON 文件');
        importFileContent = null;
        confirmImportBtn.disabled = true;
      }
    };
    reader.onerror = () => {
      alert('文件读取失败');
      importFileContent = null;
      confirmImportBtn.disabled = true;
    };
    reader.readAsText(file);
  });
  
  document.getElementById('cancelImport').addEventListener('click', () => {
    importModal.classList.add('hidden');
    importFileContent = null;
    selectedFileName = '';
  });
  
  document.getElementById('confirmImport').addEventListener('click', async () => {
    if (!importFileContent) {
      alert('请先选择文件');
      return;
    }
    
    const importMode = document.querySelector('input[name="importMode"]:checked').value;
    
    try {
      if (importMode === 'overwrite') {
        // 全量覆盖
        await setLocalData(importFileContent);
      } else {
        // 增量导入（合并）
        const currentData = await getLocalData();
        const mergedData = {
          groups: mergeGroups(currentData.groups, importFileContent.groups)
        };
        await setLocalData(mergedData);
      }
      
      importModal.classList.add('hidden');
      importFileContent = null;
      selectedFileName = '';
      await renderBookmarks();
      showSyncStatus('导入成功!', 'success');
    } catch (error) {
      alert('导入失败: ' + error.message);
    }
  });
});