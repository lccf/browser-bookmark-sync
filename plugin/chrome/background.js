// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  // 在页面右键菜单中添加"收藏网址"
  chrome.contextMenus.create({
    id: 'bookmarkPage',
    title: '收藏当前页面',
    contexts: ['page']
  });
  
  // 在链接右键菜单中添加"收藏链接"
  chrome.contextMenus.create({
    id: 'bookmarkLink',
    title: '收藏链接',
    contexts: ['link']
  });

  // 在插件图标右键菜单中添加"收藏当前页面"
  chrome.contextMenus.create({
    id: 'bookmarkFromIcon',
    title: '收藏当前页面',
    contexts: ['action']
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let title, url;

  if (info.menuItemId === 'bookmarkPage') {
    title = tab.title;
    url = tab.url;
  } else if (info.menuItemId === 'bookmarkLink') {
    title = info.linkText || info.linkUrl;
    url = info.linkUrl;
  } else if (info.menuItemId === 'bookmarkFromIcon') {
    // 从插件图标右键菜单触发，需要获取当前活动标签页
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      title = activeTab.title;
      url = activeTab.url;
    }
  }
  
  if (title && url) {
    await addBookmark(title, url);
    // 显示通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '书签已添加',
      message: `"${title.substring(0, 50)}${title.length > 50 ? '...' : ''}" 已收藏到默认分组`
    });
  }
});

// 存储键名
const STORAGE_KEY = 'bookmark_sync_data';

// 获取本地存储的书签数据
async function getLocalData() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || { groups: [{ id: 'default', name: '默认分组', bookmarks: [] }] };
}

// 保存本地书签数据
async function setLocalData(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
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

// 点击插件图标时在新标签页打开插件页面
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html')
  });
});
