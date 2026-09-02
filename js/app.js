// ==================== 静态版：localStorage 存储 ====================
// 数据全部存在浏览器本地，不上传任何服务器

const STORAGE_KEY = 'supermarket_media_data_v1';

// 默认数据结构
function getDefaultData() {
  return {
    topics: [],
    copywriting: [],
    analytics: [],
    promotions: [],
  };
}

// 读取所有数据
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const data = JSON.parse(raw);
    return { ...getDefaultData(), ...data };
  } catch (e) {
    console.error('读取数据失败', e);
    return getDefaultData();
  }
}

// 保存所有数据
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 生成ID
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ==================== 模拟 API ====================
const API = {
  // 仪表盘
  getDashboard: () => {
    const d = loadData();
    const today = new Date().toISOString().slice(0, 10);
    const totalViews = d.analytics.reduce((s, a) => s + (Number(a.views) || 0), 0);
    const totalLikes = d.analytics.reduce((s, a) => s + (Number(a.likes) || 0), 0);
    const totalFollowers = d.analytics.reduce((s, a) => s + (Number(a.new_followers) || 0), 0);
    const pendingTopics = d.topics.filter(t => t.status === '待发布' || t.status === '策划中');
    const todayTopics = d.topics.filter(t => t.planned_date === today);
    const activePromos = d.promotions.filter(p => p.status === '进行中' && p.end_date >= today);
    return {
      stats: {
        totalViews, totalLikes, totalFollowers,
        totalPosts: d.analytics.length,
        totalTopics: d.topics.length,
        totalCopy: d.copywriting.length,
        totalPromos: d.promotions.length,
      },
      pendingTopics, todayTopics, activePromos,
    };
  },

  // 选题
  getTopics: () => loadData().topics,
  addTopic: (item) => {
    const d = loadData();
    const it = { id: genId(), created_at: new Date().toISOString(), ...item };
    d.topics.push(it);
    saveData(d);
    return it;
  },
  updateTopic: (id, updates) => {
    const d = loadData();
    const idx = d.topics.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('未找到');
    d.topics[idx] = { ...d.topics[idx], ...updates, id };
    saveData(d);
    return d.topics[idx];
  },
  deleteTopic: (id) => {
    const d = loadData();
    d.topics = d.topics.filter(t => t.id !== id);
    saveData(d);
    return { ok: true };
  },

  // 文案
  getCopywriting: () => loadData().copywriting,
  addCopy: (item) => {
    const d = loadData();
    const it = { id: genId(), created_at: new Date().toISOString(), ...item };
    d.copywriting.push(it);
    saveData(d);
    return it;
  },
  deleteCopy: (id) => {
    const d = loadData();
    d.copywriting = d.copywriting.filter(i => i.id !== id);
    saveData(d);
    return { ok: true };
  },

  // 数据分析
  getAnalytics: () => loadData().analytics,
  addAnalytics: (item) => {
    const d = loadData();
    const it = { id: genId(), created_at: new Date().toISOString(), ...item };
    d.analytics.push(it);
    saveData(d);
    return it;
  },
  deleteAnalytics: (id) => {
    const d = loadData();
    d.analytics = d.analytics.filter(i => i.id !== id);
    saveData(d);
    return { ok: true };
  },

  // 促销
  getPromotions: () => loadData().promotions,
  addPromotion: (item) => {
    const d = loadData();
    const it = { id: genId(), created_at: new Date().toISOString(), ...item };
    d.promotions.push(it);
    saveData(d);
    return it;
  },
  updatePromotion: (id, updates) => {
    const d = loadData();
    const idx = d.promotions.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('未找到');
    d.promotions[idx] = { ...d.promotions[idx], ...updates, id };
    saveData(d);
    return d.promotions[idx];
  },
  deletePromotion: (id) => {
    const d = loadData();
    d.promotions = d.promotions.filter(p => p.id !== id);
    saveData(d);
    return { ok: true };
  },

  // 选题建议（直接计算）
  getSuggestions: () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const dateStr = String(month).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const upcoming = FESTIVALS.filter(f => {
      const fDate = new Date(now.getFullYear() + '-' + f.date + 'T00:00:00');
      const diff = (fDate - now) / (1000 * 60 * 60 * 24);
      return diff >= -1 && diff <= 30;
    });
    const season = SEASONS.find(s => s.months.includes(month));
    return { festivals: upcoming, season, contentTypes: CONTENT_TYPES };
  },

  // 文案生成（前端模板引擎）
  generateCopy: (vars) => {
    const tpl = COPYWRITING_TEMPLATES[vars.type];
    if (!tpl) throw new Error('未知的内容类型');
    const v = {
      product: '商品', features: '品质好', price: '超低价', store: '超市',
      dish: '美食', promo_name: '大促', discount: '超低折扣',
      start: '今天', end: '活动结束', category: '商品', benefit: '超多福利', festival: '节日',
      ...vars,
    };
    const fill = (str) => str.replace(/\{(\w+)\}/g, (_, k) => v[k] || '');
    const title = fill(tpl.titles[Math.floor(Math.random() * tpl.titles.length)]);
    const script = fill(tpl.scripts[Math.floor(Math.random() * tpl.scripts.length)]);
    const hashtags = tpl.hashtags.map(fill);
    return { title, script, hashtags, type: vars.type };
  },
};

// ==================== 常量数据 ====================
const FESTIVALS = [
  { date: '01-01', name: '元旦', topic: '新年新气象，超市年货预热' },
  { date: '02-14', name: '情人节', topic: '情人节甜蜜好物推荐' },
  { date: '03-08', name: '妇女节', topic: '女王节，美妆护肤好物' },
  { date: '03-15', name: '消费者权益日', topic: '品质保障，放心购物' },
  { date: '04-05', name: '清明节', topic: '春日踏青好物推荐' },
  { date: '05-01', name: '劳动节', topic: '五一囤货节，出游必备' },
  { date: '05-10', name: '母亲节', topic: '感恩母亲节，健康好礼' },
  { date: '06-01', name: '儿童节', topic: '六一儿童节，零食玩具大放送' },
  { date: '06-18', name: '618大促', topic: '618年中大促，满减攻略' },
  { date: '08-15', name: '中秋节', topic: '中秋月饼礼盒推荐' },
  { date: '10-01', name: '国庆节', topic: '国庆7天长假，出游囤货' },
  { date: '11-11', name: '双11', topic: '双11狂欢，全年最低价' },
  { date: '12-12', name: '双12', topic: '双12收官，年终好物' },
  { date: '12-25', name: '圣诞节', topic: '圣诞礼物，氛围好物推荐' },
  { date: '12-31', name: '跨年', topic: '跨年倒计时，年终大促' },
];

const SEASONS = [
  { months: [12, 1, 2], name: '冬季', topic: '冬季保暖好物、火锅食材、年货囤货' },
  { months: [3, 4, 5], name: '春季', topic: '春季踏青、野餐零食、新鲜蔬果' },
  { months: [6, 7, 8], name: '夏季', topic: '夏季消暑、冷饮冰品、防晒用品' },
  { months: [9, 10, 11], name: '秋季', topic: '秋季养生、月饼礼盒、换季护肤' },
];

const CONTENT_TYPES = [
  { id: 'product', name: '产品展示', icon: '📦' },
  { id: 'tour', name: '探店逛超市', icon: '🏪' },
  { id: 'recipe', name: '美食制作', icon: '🍳' },
  { id: 'promotion', name: '促销宣传', icon: '🎉' },
  { id: 'tips', name: '生活妙招', icon: '💡' },
  { id: 'member', name: '会员福利', icon: '🎁' },
  { id: 'festival', name: '节日主题', icon: '🎊' },
  { id: 'newarrival', name: '上新推荐', icon: '🆕' },
];

const COPYWRITING_TEMPLATES = {
  product: {
    titles: [
      '超市好物推荐｜{product}才{price}，闭眼入！',
      '逛超市发现的宝藏｜{product}也太香了吧',
      '不到{price}的{product}，超市货架被我翻烂了',
      '超市必买清单TOP1｜{product}，回购N次',
      '谁教你们这么卖{product}的？{price}也太离谱了',
    ],
    scripts: [
      `【开场】家人们！今天逛超市又发现宝藏了\n【展示】就是这个{product}，只要{price}！\n【卖点】{features}\n【对比】外面卖贵多了，超市这个价格真的绝\n【结尾】赶紧去{store}货架蹲，手慢无！`,
      `【钩子】猜猜这个{product}多少钱？\n【展示】没错，只要{price}！\n【卖点】{features}\n【体验】自己用了/吃了之后真的惊艳\n【引导】关注我，每天带你逛超市薅羊毛`,
    ],
    hashtags: ['#超市好物', '#好物推荐', '#{product}', '#薅羊毛', '#超市探店'],
  },
  tour: {
    titles: [
      '带你逛{store}｜最全超市攻略',
      '超市探店｜{store}有什么值得买的？跟着我走',
      '人均50逛超市｜{store}好物一网打尽',
      '超市沉浸式逛逛｜{store}必买清单',
    ],
    scripts: [
      `【开场】今天带你们逛{store}\n【区域1】生鲜区：{features}\n【区域2】零食区：新品超多\n【区域3】日用品区：性价比之选\n【结尾】你最想买哪个？评论区告诉我`,
      `【开场】超市逛起来！\n【第一站】进门必看促销堆头\n【第二站】{features}\n【第三站】结账前必看的隐藏好物\n【结尾】关注我，下次带你逛别的超市`,
    ],
    hashtags: ['#超市探店', '#逛超市', '#{store}', '#超市攻略', '#好物分享'],
  },
  recipe: {
    titles: [
      '超市买的{product}，3分钟搞定一顿饭',
      '用超市食材做{dish}，简单又好吃',
      '不到{price}的超市食材，做出餐厅级{dish}',
      '懒人食谱｜超市买这些就能做{dish}',
    ],
    scripts: [
      `【开场】超市买的几样食材，做个{dish}\n【食材】{product}，只要{price}\n【步骤1】处理食材\n【步骤2】下锅烹饪\n【步骤3】调味出锅\n【成品】是不是超简单？跟着做起来`,
      `【开场】今天用超市食材做一道{dish}\n【购物】{features}\n【制作】简单几步搞定\n【试吃】味道绝了\n【结尾】收藏起来周末做`,
    ],
    hashtags: ['#美食教程', '#{dish}', '#超市食材', '#懒人食谱', '#在家做饭'],
  },
  promotion: {
    titles: [
      '{store}{promo_name}来了！{discount}速来',
      '省钱预警｜{store}{promo_name}，{discount}太香了',
      '{promo_name}最后X天｜{discount}错过等一年',
      '超市折扣速报｜{store}{promo_name}，囤货正当时',
    ],
    scripts: [
      `【开场】家人们注意了！{store}{promo_name}来了\n【活动】{discount}\n【时间】{start}到{end}\n【重点商品】{features}\n【引导】赶紧去超市，手慢无`,
      `【钩子】这个消息必须告诉你们\n【活动】{store}{promo_name}\n【亮点】{discount}\n【推荐】{features}\n【结尾】转发给家人朋友一起去`,
    ],
    hashtags: ['#超市促销', '#{promo_name}', '#打折', '#{store}', '#省钱'],
  },
  tips: {
    titles: [
      '超市买东西的N个隐藏技巧',
      '超市选购{category}，记住这几点',
      '超市省钱攻略｜一年省下好几千',
      '不知道这些超市冷知识，亏大了',
    ],
    scripts: [
      `【开场】逛超市这么多年，才知道这些技巧\n【技巧1】{features}\n【技巧2】看保质日期位置\n【技巧3】堆头商品不一定是最低价\n【结尾】点赞收藏，下次逛超市用上`,
      `【开场】超市选购{category}怎么挑？\n【方法1】{features}\n【方法2】看标签辨新鲜\n【方法3】性价比对比\n【结尾】关注我，更多生活小妙招`,
    ],
    hashtags: ['#生活妙招', '#超市攻略', '#{category}', '#省钱技巧', '#生活小常识'],
  },
  member: {
    titles: [
      '{store}会员日来了，{benefit}别忘了',
      '会员专属｜{store}{benefit}，别错过',
      '超市会员卡还能这么用？{benefit}',
      '会员日薅羊毛攻略｜{store}这些福利免费领',
    ],
    scripts: [
      `【开场】{store}会员日又到了\n【福利1】{benefit}\n【福利2】积分兑换好物\n【福利3】会员专属折扣\n【引导】还没办会员卡的赶紧办，一年省不少`,
      `【开场】超市会员卡你真的会用吗？\n【隐藏福利】{benefit}\n【积分妙用】积分换购攻略\n【会员日】每月X号折扣最大\n【结尾】转发给家人，一起省`,
    ],
    hashtags: ['#会员福利', '#{store}', '#会员日', '#薅羊毛', '#超市省钱'],
  },
  festival: {
    titles: [
      '{festival}到！超市这些好物别错过',
      '{festival}囤货清单｜超市一站搞定',
      '{festival}氛围感拉满，超市好物推荐',
      '超市{festival}限定来了，{features}',
    ],
    scripts: [
      `【开场】{festival}快乐！超市限定好物来了\n【推荐1】{features}\n【推荐2】节日氛围装饰\n【推荐3】送礼好物\n【结尾】{festival}去超市逛逛吧`,
      `【开场】{festival}不知道买什么？超市一站搞定\n【清单1】{features}\n【清单2】节日食品\n【清单3】氛围好物\n【引导】收藏清单，去超市照着买`,
    ],
    hashtags: ['#{festival}', '#超市好物', '#节日囤货', '#{festival}好物', '#节日氛围'],
  },
  newarrival: {
    titles: [
      '超市上新了！{product}首发测评',
      '超市新品速递｜{product}值不值得买',
      '超市货架上新｜{product}也太新奇了',
      '超市新品{product}，只要{price}试一下',
    ],
    scripts: [
      `【开场】超市又上新品了！\n【展示】{product}，{price}\n【卖点】{features}\n【测评】亲自试了，告诉你值不值\n【结尾】想看更多新品？关注我`,
      `【开场】超市新品开箱\n【产品】{product}\n【价格】只要{price}\n【体验】{features}\n【总结】值不值你说了算`,
    ],
    hashtags: ['#超市新品', '#{product}', '#新品测评', '#好物上新', '#超市好物'],
  },
};

// ==================== 工具函数 ====================
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function fmtDate(d) {
  if (!d) return '';
  return d.slice(0, 10);
}

function statusTag(status) {
  const map = {
    '策划中': 'tag-warning', '待发布': 'tag-primary', '已发布': 'tag-success', '已取消': 'tag-danger',
    '未开始': 'tag-warning', '进行中': 'tag-success', '已结束': 'tag-danger',
  };
  return `<span class="tag ${map[status] || ''}">${status}</span>`;
}

// ==================== 导航 ====================
function switchPage(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  document.getElementById('page-' + page).classList.add('active');
  // 关闭移动端菜单
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  // 按需加载
  if (page === 'dashboard') loadDashboard();
  if (page === 'topics') { loadContentTypes(); renderTopics(); loadSuggestions(); }
  if (page === 'copywriting') { loadContentTypes(); toggleCwFields(); renderSavedCopies(); }
  if (page === 'analytics') renderAnalytics();
  if (page === 'promotions') renderPromotions();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchPage(item.dataset.page));
});

// 移动端菜单切换
document.getElementById('menu-toggle')?.addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
});
document.getElementById('overlay')?.addEventListener('click', () => {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
});

// ==================== 仪表盘 ====================
function loadDashboard() {
  const data = API.getDashboard();
  const s = data.stats;
  const cards = [
    { icon: '👁️', value: s.totalViews, label: '总播放量' },
    { icon: '❤️', value: s.totalLikes, label: '总点赞数' },
    { icon: '👥', value: s.totalFollowers, label: '新增粉丝' },
    { icon: '🎬', value: s.totalPosts, label: '已发布视频' },
    { icon: '📝', value: s.totalTopics, label: '选题总数' },
    { icon: '🎉', value: s.totalPromos, label: '促销活动' },
  ];
  document.getElementById('stat-cards').innerHTML = cards.map(c =>
    `<div class="stat-card"><div class="stat-icon">${c.icon}</div><div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div></div>`
  ).join('');

  const todayEl = document.getElementById('today-topics');
  if (data.todayTopics.length === 0) {
    todayEl.innerHTML = '<p class="empty-hint">今日无待发布内容</p>';
  } else {
    todayEl.innerHTML = data.todayTopics.map(t =>
      `<div class="list-item"><div class="list-item-content"><div class="list-item-title">${t.title}</div><div class="list-item-meta">${statusTag(t.status)} <span>${t.platform || ''}</span> <span>${t.content_type || ''}</span></div></div></div>`
    ).join('');
  }

  const pendingEl = document.getElementById('pending-topics');
  if (data.pendingTopics.length === 0) {
    pendingEl.innerHTML = '<p class="empty-hint">暂无待发布选题</p>';
  } else {
    pendingEl.innerHTML = data.pendingTopics.slice(0, 10).map(t =>
      `<div class="list-item"><div class="list-item-content"><div class="list-item-title">${t.title}</div><div class="list-item-meta">${statusTag(t.status)} <span>📅 ${fmtDate(t.planned_date)}</span> <span>${t.platform || ''}</span></div></div></div>`
    ).join('');
  }

  const promoEl = document.getElementById('active-promos');
  if (data.activePromos.length === 0) {
    promoEl.innerHTML = '<p class="empty-hint">暂无进行中的促销</p>';
  } else {
    promoEl.innerHTML = data.activePromos.map(p =>
      `<div class="list-item"><div class="list-item-content"><div class="list-item-title">${p.name}</div><div class="list-item-meta">${statusTag(p.status)} <span>${p.discount_type || ''}: ${p.discount_value || ''}</span></div><div class="list-item-desc">📅 ${fmtDate(p.start_date)} ~ ${fmtDate(p.end_date)}</div></div></div>`
    ).join('');
  }
}

// ==================== 选题策划 ====================
function loadContentTypes() {
  const sel1 = document.getElementById('topic-type');
  const sel2 = document.getElementById('cw-type');
  if (sel1 && sel1.options.length === 0) {
    sel1.innerHTML = CONTENT_TYPES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  }
  if (sel2 && sel2.options.length === 0) {
    sel2.innerHTML = CONTENT_TYPES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  }
}

function renderTopics() {
  const allTopics = API.getTopics();
  const fStatus = document.getElementById('topic-filter-status')?.value || '';
  const fPlatform = document.getElementById('topic-filter-platform')?.value || '';
  let filtered = allTopics;
  if (fStatus) filtered = filtered.filter(t => t.status === fStatus);
  if (fPlatform) filtered = filtered.filter(t => t.platform === fPlatform);
  filtered.sort((a, b) => (b.planned_date || '').localeCompare(a.planned_date || ''));

  const el = document.getElementById('topics-list');
  if (filtered.length === 0) {
    el.innerHTML = '<p class="empty-hint">暂无选题，点击上方"新建选题"添加</p>';
    return;
  }

  el.innerHTML = filtered.map(t => {
    const typeObj = CONTENT_TYPES.find(c => c.id === t.content_type) || { name: t.content_type, icon: '📌' };
    return `<div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${typeObj.icon} ${t.title}</div>
        <div class="list-item-meta">
          ${statusTag(t.status)}
          <span>📅 ${fmtDate(t.planned_date)}</span>
          <span>📍 ${t.platform || '未设置'}</span>
          <span>🏷️ ${typeObj.name}</span>
        </div>
        ${t.description ? `<div class="list-item-desc">${t.description}</div>` : ''}
      </div>
      <div class="list-item-actions">
        <select onchange="updateTopicStatus('${t.id}', this.value)" class="btn btn-sm" style="padding:4px 8px">
          <option value="策划中" ${t.status === '策划中' ? 'selected' : ''}>策划中</option>
          <option value="待发布" ${t.status === '待发布' ? 'selected' : ''}>待发布</option>
          <option value="已发布" ${t.status === '已发布' ? 'selected' : ''}>已发布</option>
          <option value="已取消" ${t.status === '已取消' ? 'selected' : ''}>已取消</option>
        </select>
        <button class="btn btn-sm btn-danger" onclick="deleteTopic('${t.id}')">删除</button>
      </div>
    </div>`;
  }).join('');
}

function addTopic() {
  const title = document.getElementById('topic-title').value.trim();
  if (!title) { toast('请输入选题标题'); return; }
  API.addTopic({
    title,
    content_type: document.getElementById('topic-type').value,
    platform: document.getElementById('topic-platform').value,
    planned_date: document.getElementById('topic-date').value,
    status: document.getElementById('topic-status').value,
    description: document.getElementById('topic-desc').value.trim(),
  });
  document.getElementById('topic-title').value = '';
  document.getElementById('topic-desc').value = '';
  toast('选题添加成功');
  renderTopics();
}

function updateTopicStatus(id, status) {
  API.updateTopic(id, { status });
  toast('状态已更新');
  renderTopics();
}

function deleteTopic(id) {
  if (!confirm('确定删除此选题？')) return;
  API.deleteTopic(id);
  toast('已删除');
  renderTopics();
}

function loadSuggestions() {
  const data = API.getSuggestions();
  const el = document.getElementById('suggestions-area');
  let html = '';
  if (data.season) {
    html += `<div style="margin-bottom:12px"><span class="tag tag-success">🍂 当前${data.season.name}</span> <span style="font-size:13px;color:var(--gray-600)">${data.season.topic}</span></div>`;
  }
  if (data.festivals.length > 0) {
    html += '<div class="suggestion-grid">';
    data.festivals.forEach(f => {
      html += `<div class="suggestion-card" onclick="useSuggestion('${f.topic.replace(/'/g, "\\'")}')">
        <div class="sug-name">🎊 ${f.name}</div>
        <div class="sug-date">📅 ${f.date}</div>
        <div class="sug-topic">${f.topic}</div>
      </div>`;
    });
    html += '</div>';
  } else {
    html += '<p class="empty-hint">近期无特别节日，可以关注日常选题</p>';
  }
  el.innerHTML = html;
}

function useSuggestion(topic) {
  document.getElementById('topic-title').value = topic;
  document.getElementById('topic-status').value = '策划中';
  document.getElementById('topic-title').focus();
  toast('已填入选题标题，完善信息后添加');
}

// ==================== 文案生成 ====================
function toggleCwFields() {
  const type = document.getElementById('cw-type').value;
  document.querySelectorAll('.cw-field').forEach(el => {
    const types = el.dataset.types.split(',');
    el.style.display = types.includes(type) ? '' : 'none';
  });
}

function generateCopy() {
  const type = document.getElementById('cw-type').value;
  const data = { type };
  document.querySelectorAll('.cw-field').forEach(el => {
    if (el.style.display !== 'none') {
      const input = el.querySelector('input, textarea, select');
      if (input) data[input.id.replace('cw-', '')] = input.value.trim();
    }
  });
  try {
    const result = API.generateCopy(data);
    currentCopy = result;
    renderCopyResult(result);
  } catch (e) {
    toast(e.message);
  }
}

function randomizeCopy() { generateCopy(); }

function renderCopyResult(r) {
  document.getElementById('copy-result').innerHTML = `
    <div class="copy-result-block">
      <label>📌 视频标题</label>
      <div class="result-box" onclick="copyText(this)" title="点击复制">${escapeHtml(r.title)}</div>
    </div>
    <div class="copy-result-block">
      <label>🎬 视频脚本</label>
      <div class="result-box" onclick="copyText(this)" title="点击复制" style="white-space:pre-wrap">${escapeHtml(r.script)}</div>
    </div>
    <div class="copy-result-block">
      <label>🏷️ 话题标签</label>
      <div class="hashtag-list">${r.hashtags.map(h => `<span class="hashtag" onclick="copyText('${escapeAttr(h)}')">${escapeHtml(h)}</span>`).join('')}</div>
    </div>
  `;
  document.getElementById('save-copy-btn').style.display = '';
}

let currentCopy = null;

function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
function escapeAttr(s) { return (s || '').replace(/'/g, "\\'"); }

function copyText(element) {
  let text;
  if (typeof element === 'string') text = element;
  else text = element.textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('已复制到剪贴板')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('已复制到剪贴板'); } catch { toast('复制失败，请手动选择'); }
  document.body.removeChild(ta);
}

function saveCopy() {
  if (!currentCopy) return;
  API.addCopy({
    title: currentCopy.title,
    script: currentCopy.script,
    hashtags: currentCopy.hashtags,
    content_type: currentCopy.type,
  });
  toast('文案已保存');
  renderSavedCopies();
}

function renderSavedCopies() {
  const copies = API.getCopywriting();
  const el = document.getElementById('saved-copies');
  if (copies.length === 0) {
    el.innerHTML = '<p class="empty-hint">暂无保存的文案</p>';
    return;
  }
  copies.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  el.innerHTML = copies.map(c => {
    const safeData = escapeAttr(JSON.stringify(c));
    return `<div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(c.title)}</div>
        <div class="list-item-meta"><span>🏷️ ${c.content_type || ''}</span> <span>📅 ${fmtDate(c.created_at)}</span></div>
        <div class="list-item-desc" style="white-space:pre-wrap;margin-top:6px">${escapeHtml((c.script || '').slice(0, 100))}${c.script && c.script.length > 100 ? '...' : ''}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm" onclick='showCopyDetail(${safeData})'>查看</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCopy('${c.id}')">删除</button>
      </div>
    </div>`;
  }).join('');
}

function showCopyDetail(c) {
  document.getElementById('copy-result').innerHTML = `
    <div class="copy-result-block">
      <label>📌 视频标题</label>
      <div class="result-box" onclick="copyText(this)">${escapeHtml(c.title)}</div>
    </div>
    <div class="copy-result-block">
      <label>🎬 视频脚本</label>
      <div class="result-box" onclick="copyText(this)" style="white-space:pre-wrap">${escapeHtml(c.script)}</div>
    </div>
    <div class="copy-result-block">
      <label>🏷️ 话题标签</label>
      <div class="hashtag-list">${(c.hashtags || []).map(h => `<span class="hashtag" onclick="copyText('${escapeAttr(h)}')">${escapeHtml(h)}</span>`).join('')}</div>
    </div>
  `;
  document.getElementById('save-copy-btn').style.display = 'none';
  switchPage('copywriting');
}

function deleteCopy(id) {
  if (!confirm('确定删除此文案？')) return;
  API.deleteCopy(id);
  toast('已删除');
  renderSavedCopies();
}

// ==================== 数据分析 ====================
function renderAnalytics() {
  const allAnalytics = API.getAnalytics();
  allAnalytics.sort((a, b) => (b.post_date || '').localeCompare(a.post_date || ''));

  const totalViews = allAnalytics.reduce((s, a) => s + (Number(a.views) || 0), 0);
  const totalLikes = allAnalytics.reduce((s, a) => s + (Number(a.likes) || 0), 0);
  const totalComments = allAnalytics.reduce((s, a) => s + (Number(a.comments) || 0), 0);
  const totalShares = allAnalytics.reduce((s, a) => s + (Number(a.shares) || 0), 0);
  const totalFollowers = allAnalytics.reduce((s, a) => s + (Number(a.new_followers) || 0), 0);

  const cards = [
    { icon: '👁️', value: totalViews, label: '总播放' },
    { icon: '❤️', value: totalLikes, label: '总点赞' },
    { icon: '💬', value: totalComments, label: '总评论' },
    { icon: '🔁', value: totalShares, label: '总分享' },
    { icon: '👥', value: totalFollowers, label: '新增粉丝' },
    { icon: '🎬', value: allAnalytics.length, label: '视频总数' },
  ];
  document.getElementById('analytics-stats').innerHTML = cards.map(c =>
    `<div class="stat-card"><div class="stat-icon">${c.icon}</div><div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div></div>`
  ).join('');

  drawChart(allAnalytics);

  const el = document.getElementById('analytics-list');
  if (allAnalytics.length === 0) {
    el.innerHTML = '<p class="empty-hint">暂无数据，点击上方"记录新数据"添加</p>';
    return;
  }
  el.innerHTML = `
    <div class="data-row header">
      <span>标题</span><span>平台</span><span>日期</span><span>播放</span><span>点赞</span><span>评论</span><span>分享</span><span></span>
    </div>
    ${allAnalytics.map(a => `
      <div class="data-row">
        <span>${escapeHtml(a.title || '-')}</span>
        <span>${a.platform || '-'}</span>
        <span>${fmtDate(a.post_date)}</span>
        <span>${a.views || 0}</span>
        <span>${a.likes || 0}</span>
        <span>${a.comments || 0}</span>
        <span>${a.shares || 0}</span>
        <span><button class="btn btn-sm btn-danger" onclick="deleteAnalytics('${a.id}')">删</button></span>
      </div>
    `).join('')}
  `;
}

function addAnalytics() {
  const title = document.getElementById('an-title').value.trim();
  if (!title) { toast('请输入视频标题'); return; }
  API.addAnalytics({
    title,
    platform: document.getElementById('an-platform').value,
    post_date: document.getElementById('an-date').value || new Date().toISOString().slice(0, 10),
    views: Number(document.getElementById('an-views').value) || 0,
    likes: Number(document.getElementById('an-likes').value) || 0,
    comments: Number(document.getElementById('an-comments').value) || 0,
    shares: Number(document.getElementById('an-shares').value) || 0,
    new_followers: Number(document.getElementById('an-followers').value) || 0,
  });
  ['an-title', 'an-views', 'an-likes', 'an-comments', 'an-shares', 'an-followers'].forEach(id => document.getElementById(id).value = '');
  toast('数据已保存');
  renderAnalytics();
}

function deleteAnalytics(id) {
  if (!confirm('确定删除此条数据？')) return;
  API.deleteAnalytics(id);
  toast('已删除');
  renderAnalytics();
}

function drawChart(allAnalytics) {
  const canvas = document.getElementById('chart-canvas');
  if (!canvas) return;
  // 适配高清屏
  const dpr = window.devicePixelRatio || 1;
  const displayW = canvas.parentElement.clientWidth - 40;
  const displayH = 300;
  canvas.width = displayW * dpr;
  canvas.height = displayH * dpr;
  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = displayW, H = displayH;
  ctx.clearRect(0, 0, W, H);

  if (!allAnalytics || allAnalytics.length === 0) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', W / 2, H / 2);
    return;
  }

  const sorted = [...allAnalytics].sort((a, b) => (a.post_date || '').localeCompare(b.post_date || ''));
  const data = sorted.slice(-12);
  const padding = { top: 30, right: 20, bottom: 50, left: 60 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => Number(d.views) || 0), 1);
  const barW = Math.max(8, chartW / data.length * 0.35);
  const gap = chartW / data.length;

  ctx.strokeStyle = '#e5e7eb';
  ctx.fillStyle = '#9ca3af';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + chartH - (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(maxVal * i / 4), padding.left - 8, y + 4);
  }

  data.forEach((d, i) => {
    const x = padding.left + gap * i + gap / 2;
    const views = Number(d.views) || 0;
    const likes = Number(d.likes) || 0;
    const h1 = (views / maxVal) * chartH;
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(x - barW - 2, padding.top + chartH - h1, barW, h1);
    const h2 = (likes / maxVal) * chartH;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 2, padding.top + chartH - h2, barW, h2);
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const label = (d.post_date || '').slice(5) || '-';
    ctx.fillText(label, x, padding.top + chartH + 15);
  });

  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(padding.left, 8, 12, 12);
  ctx.fillStyle = '#374151';
  ctx.fillText('播放量', padding.left + 18, 18);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(padding.left + 90, 8, 12, 12);
  ctx.fillStyle = '#374151';
  ctx.fillText('点赞数', padding.left + 108, 18);
}

// ==================== 促销管理 ====================
function renderPromotions() {
  const allPromotions = API.getPromotions();
  const fStatus = document.getElementById('pm-filter-status')?.value || '';
  let filtered = allPromotions;
  if (fStatus) filtered = filtered.filter(p => p.status === fStatus);
  filtered.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));

  const el = document.getElementById('promotions-list');
  if (filtered.length === 0) {
    el.innerHTML = '<p class="empty-hint">暂无促销活动，点击上方"新建促销活动"添加</p>';
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = filtered.map(p => {
    let autoStatus = p.status;
    if (p.start_date && p.end_date) {
      if (p.end_date < today) autoStatus = '已结束';
      else if (p.start_date <= today) autoStatus = '进行中';
      else autoStatus = '未开始';
    }
    return `<div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">🎉 ${escapeHtml(p.name)}</div>
        <div class="list-item-meta">
          ${statusTag(autoStatus)}
          <span>🏷️ ${p.discount_type || ''}</span>
          <span>💰 ${escapeHtml(p.discount_value || '')}</span>
          <span>📦 ${escapeHtml(p.product || '')}</span>
        </div>
        <div class="list-item-desc">📅 ${fmtDate(p.start_date)} ~ ${fmtDate(p.end_date)}</div>
        ${p.description ? `<div class="list-item-desc">${escapeHtml(p.description)}</div>` : ''}
      </div>
      <div class="list-item-actions">
        <select onchange="updatePromoStatus('${p.id}', this.value)" class="btn btn-sm" style="padding:4px 8px">
          <option value="未开始" ${p.status === '未开始' ? 'selected' : ''}>未开始</option>
          <option value="进行中" ${p.status === '进行中' ? 'selected' : ''}>进行中</option>
          <option value="已结束" ${p.status === '已结束' ? 'selected' : ''}>已结束</option>
        </select>
        <button class="btn btn-sm btn-danger" onclick="deletePromotion('${p.id}')">删除</button>
      </div>
    </div>`;
  }).join('');
}

function addPromotion() {
  const name = document.getElementById('pm-name').value.trim();
  if (!name) { toast('请输入活动名称'); return; }
  API.addPromotion({
    name,
    product: document.getElementById('pm-product').value.trim(),
    discount_type: document.getElementById('pm-discount-type').value,
    discount_value: document.getElementById('pm-discount-value').value.trim(),
    start_date: document.getElementById('pm-start').value,
    end_date: document.getElementById('pm-end').value,
    status: document.getElementById('pm-status').value,
    description: document.getElementById('pm-desc').value.trim(),
  });
  ['pm-name', 'pm-product', 'pm-discount-value', 'pm-desc'].forEach(id => document.getElementById(id).value = '');
  toast('活动添加成功');
  renderPromotions();
}

function updatePromoStatus(id, status) {
  API.updatePromotion(id, { status });
  toast('状态已更新');
  renderPromotions();
}

function deletePromotion(id) {
  if (!confirm('确定删除此活动？')) return;
  API.deletePromotion(id);
  toast('已删除');
  renderPromotions();
}

// ==================== 数据导入导出 ====================
document.getElementById('export-btn')?.addEventListener('click', () => {
  const data = localStorage.getItem(STORAGE_KEY) || '{}';
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `超市新媒体数据_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('数据已导出');
});

document.getElementById('import-btn')?.addEventListener('click', () => {
  document.getElementById('import-file').click();
});
document.getElementById('import-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      JSON.parse(ev.target.result);
      localStorage.setItem(STORAGE_KEY, ev.target.result);
      toast('数据已导入');
      location.reload();
    } catch {
      toast('文件格式错误');
    }
  };
  reader.readAsText(file);
});

// ==================== 初始化 ====================
function setToday(id) {
  const el = document.getElementById(id);
  if (el && !el.value) el.value = new Date().toISOString().slice(0, 10);
}

window.addEventListener('DOMContentLoaded', () => {
  setToday('topic-date');
  setToday('an-date');
  setToday('pm-start');
  setToday('pm-end');
  loadContentTypes();
  toggleCwFields();
  loadDashboard();
});
