const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json());

// 初始化数据文件
function initData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      groups: [
        {
          id: 'default',
          name: '默认分组',
          bookmarks: []
        }
      ]
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// 读取数据
function readData() {
  initData();
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

// 保存数据
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 获取所有书签和分组
app.get('/api/bookmarks', (req, res) => {
  const data = readData();
  res.json(data);
});

// 保存所有书签和分组（同步）
app.post('/api/bookmarks', (req, res) => {
  const { groups } = req.body;
  if (!groups || !Array.isArray(groups)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  saveData({ groups });
  res.json({ success: true });
});

// 创建分组
app.post('/api/groups', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  
  const data = readData();
  const newGroup = {
    id: Date.now().toString(),
    name,
    bookmarks: []
  };
  data.groups.push(newGroup);
  saveData(data);
  res.json(newGroup);
});

// 删除分组
app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  data.groups = data.groups.filter(g => g.id !== id);
  saveData(data);
  res.json({ success: true });
});

// 添加书签到分组
app.post('/api/groups/:groupId/bookmarks', (req, res) => {
  const { groupId } = req.params;
  const { title, url } = req.body;
  
  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }
  
  const data = readData();
  const group = data.groups.find(g => g.id === groupId);
  
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  const bookmark = {
    id: Date.now().toString(),
    title,
    url,
    createdAt: new Date().toISOString()
  };
  
  group.bookmarks.push(bookmark);
  saveData(data);
  res.json(bookmark);
});

// 删除书签
app.delete('/api/groups/:groupId/bookmarks/:bookmarkId', (req, res) => {
  const { groupId, bookmarkId } = req.params;
  const data = readData();
  const group = data.groups.find(g => g.id === groupId);
  
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  group.bookmarks = group.bookmarks.filter(b => b.id !== bookmarkId);
  saveData(data);
  res.json({ success: true });
});

// 更新书签顺序
app.put('/api/groups/:groupId/bookmarks/reorder', (req, res) => {
  const { groupId } = req.params;
  const { bookmarkIds } = req.body;
  
  const data = readData();
  const group = data.groups.find(g => g.id === groupId);
  
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  const bookmarkMap = new Map(group.bookmarks.map(b => [b.id, b]));
  group.bookmarks = bookmarkIds.map(id => bookmarkMap.get(id)).filter(Boolean);
  saveData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Bookmark sync server running on http://localhost:${PORT}`);
});
