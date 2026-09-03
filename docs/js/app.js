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

  // 文案生成（前端模板引擎，支持多风格）
  generateCopy: (vars) => {
    const tpl = COPYWRITING_TEMPLATES[vars.type];
    if (!tpl) throw new Error('未知的内容类型');
    const style = vars.style || 'random';
    // 判断用户是否填写了某个字段（空字符串算没填）
    const isFilled = (k) => typeof vars[k] === 'string' ? vars[k].trim() !== '' : !!vars[k];
    // 模板占位符依赖了没填的字段 → 跳过该模板（如没填价格就不出现提价格的文案）
    const needMissing = (str) => [...str.matchAll(/\{(\w+)\}/g)].some(m => !isFilled(m[1]));
    let titles = tpl.titles.filter(x => !needMissing(x.t));
    let scripts = tpl.scripts.filter(x => !needMissing(x.t));
    // 按选定风格筛选；该风格没模板时保留全部
    if (style !== 'random') {
      const t2 = titles.filter(x => x.s === style);
      const s2 = scripts.filter(x => x.s === style);
      if (t2.length) titles = t2;
      if (s2.length) scripts = s2;
    }
    if (!titles.length) titles = tpl.titles;
    if (!scripts.length) scripts = tpl.scripts;
    const titleItem = titles[Math.floor(Math.random() * titles.length)];
    let scriptItem = scripts[Math.floor(Math.random() * scripts.length)];
    // 随机模式下让脚本与标题风格一致
    if (style === 'random') {
      const same = scripts.filter(x => x.s === titleItem.s);
      if (same.length) scriptItem = same[Math.floor(Math.random() * same.length)];
    }
    // 填充变量：用户没填的用默认词兜底
    const v = {
      product: '好物', features: '品质在线', price: '惊喜价', store: '超市',
      dish: '美食', promo_name: '优惠活动', discount: '超值优惠',
      start: '即日起', end: '活动结束', category: '好物', benefit: '专属福利', festival: '节日',
    };
    Object.keys(vars).forEach(k => {
      if (typeof vars[k] === 'string' && vars[k].trim() !== '') v[k] = vars[k].trim();
    });
    const fill = (str) => str.replace(/\{(\w+)\}/g, (_, k) => v[k] || '');
    const hashtags = tpl.hashtags.map(fill);
    return { title: fill(titleItem.t), script: fill(scriptItem.t), hashtags, type: vars.type, style: titleItem.s };
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
  { id: 'behind', name: '幕后花絮', icon: '🎬' },
  { id: 'interaction', name: '互动话题', icon: '💬' },
  { id: 'knowledge', name: '生活科普', icon: '📚' },
  { id: 'greeting', name: '节日祝福', icon: '🙏' },
];

// 文案风格定义
const COPY_STYLES = [
  { id: 'random', name: '🎲 随机混合（全部风格）' },
  { id: 'value', name: '💰 性价比型' },
  { id: 'quality', name: '✨ 品质种草型' },
  { id: 'scene', name: '🎬 场景代入型' },
  { id: 'emotion', name: '💕 情感共鸣型' },
  { id: 'suspense', name: '❓ 悬念好奇型' },
  { id: 'guide', name: '📖 干货攻略型' },
  { id: 'meme', name: '🔥 热梗网感型' },
];
const STYLE_NAMES = {
  value: '💰 性价比', quality: '✨ 品质种草', scene: '🎬 场景代入',
  emotion: '💕 情感共鸣', suspense: '❓ 悬念好奇', guide: '📖 干货攻略', meme: '🔥 热梗网感',
};

const COPYWRITING_TEMPLATES = {
  product: {
    titles: [
      { s: 'value', t: '超市好物推荐｜{product}才{price}，闭眼入！' },
      { s: 'value', t: '谁教你们这么卖{product}的？{price}也太离谱了' },
      { s: 'value', t: '不到{price}的{product}，超市货架被我翻烂了' },
      { s: 'quality', t: '逛了趟超市，这个{product}惊艳到我了' },
      { s: 'quality', t: '不吹不黑，超市这个{product}品质真的能打' },
      { s: 'quality', t: '{features}｜这就是我回购{product}的理由' },
      { s: 'scene', t: '下班顺路逛超市，{product}治愈打工人的胃' },
      { s: 'scene', t: '周末追剧标配，{product}给我安排上' },
      { s: 'scene', t: '聚餐不知道带什么？拎上{product}就有面子' },
      { s: 'emotion', t: '小时候的味道，我在超市货架上找到了' },
      { s: 'emotion', t: '妈妈总买的{product}，原来藏着她的用心' },
      { s: 'emotion', t: '加班晚归，一份{product}就是给自己的安慰' },
      { s: 'suspense', t: '逛超市千万别拿这个{product}，怕你停不下来' },
      { s: 'suspense', t: '超市员工自己都在囤的{product}，到底好在哪？' },
      { s: 'suspense', t: '这个{product}我犹豫了三次，第四次直接搬空货架' },
      { s: 'guide', t: '挑{product}记住这3点，不花冤枉钱' },
      { s: 'guide', t: '超市买{product}避坑指南，学会就是赚到' },
      { s: 'guide', t: '老采购教你挑{product}，一挑一个准' },
      { s: 'meme', t: '听劝！超市这个{product}真的别错过' },
      { s: 'meme', t: '家人们谁懂啊，这个{product}是真好吃的程度' },
      { s: 'meme', t: '这个{product}，尊嘟假嘟这么香？' },
    ],
    scripts: [
      { s: 'value', t: `【开场】家人们！今天逛超市又发现宝藏了\n【展示】就是这个{product}，只要{price}！\n【卖点】{features}\n【对比】外面卖贵多了，超市这个价格真的绝\n【结尾】赶紧去{store}货架蹲，手慢无！` },
      { s: 'value', t: `【钩子】猜猜这个{product}多少钱？\n【展示】没错，只要{price}！\n【卖点】{features}\n【体验】自己用了/吃了之后真的惊艳\n【引导】关注我，每天带你逛超市薅羊毛` },
      { s: 'quality', t: `【开场】今天不吹不黑，聊聊这个{product}\n【细节】{features}\n【体验】上手/入口的瞬间就知道差距\n【观点】好东西值得多看一眼，超市这家很实在\n【结尾】懂的人自然懂，去试试就知道` },
      { s: 'quality', t: `【开场】为什么我总回购这个{product}？\n【原因1】{features}\n【原因2】品质稳定，闭眼买不踩雷\n【展示】近距离看看这个质感\n【结尾】好东西不用多说，你试一次就明白` },
      { s: 'scene', t: `【开场】下班回家顺路进超市\n【场景】晚上追剧/加班/朋友来家里，正好需要{product}\n【展示】{features}\n【体验】那一刻真的被治愈了\n【结尾】生活的小确幸，有时候就在货架上` },
      { s: 'scene', t: `【开场】周末的正确打开方式\n【场景】睡到自然醒，去超市买点{product}\n【过程】慢慢逛慢慢挑，{features}\n【感受】平凡的快乐最治愈\n【结尾】你的周末，也可以这样过` },
      { s: 'emotion', t: `【开场】今天想分享一个有点暖的发现\n【引入】妈妈每次来超市都买{product}\n【细节】{features}\n【感悟】原来她一直记得家里的味道\n【结尾】有些爱藏在购物车里，你也去超市找找看` },
      { s: 'emotion', t: `【开场】深夜的超市，治愈了今天的疲惫\n【场景】加完班进来逛了一圈\n【相遇】看到了熟悉的{product}，{features}\n【感悟】成年人就靠这些小事撑着\n【结尾】辛苦了，记得对自己好一点` },
      { s: 'suspense', t: `【开场】逛超市千万别碰这个{product}\n【原因1】{features}\n【原因2】用过一次就会一直惦记\n【反转】我已经回购第N次了\n【结尾】不信你自己去试试，回来评论区找我` },
      { s: 'suspense', t: `【开场】超市员工自己都在偷偷买什么？\n【揭秘】就是这个{product}\n【卖点】{features}\n【验证】我买了，真的名不虚传\n【结尾】下期再揭秘更多，关注不迷路` },
      { s: 'guide', t: `【开场】超市买{product}，90%的人都不会挑\n【要点1】{features}\n【要点2】看配料表：越短越干净越好\n【要点3】看日期：货架最里侧的通常更新鲜\n【结尾】学会了吗？点赞收藏，下次照着挑` },
      { s: 'guide', t: `【开场】老采购师的{product}挑选心得\n【第一步】先看外观：{features}\n【第二步】再摸手感/闻气味\n【第三步】对比单价而不是总价\n【结尾】这三步学会了，天天都用得上` },
      { s: 'meme', t: `【开场】家人们谁懂啊！\n【种草】超市这个{product}，{features}\n【玩梗】这谁研发的，真的会谢（褒义）\n【安利】我已经替你们试过了，放心冲\n【结尾】听劝，去晚了真没了` },
      { s: 'meme', t: `【开场】挑战用{product}解决今晚的嘴馋\n【开局】{features}\n【过程】这味道直接给我干沉默了\n【结果】结论：无脑冲就完事了\n【结尾】还想看测什么，评论区点单` },
    ],
    hashtags: ['#超市好物', '#好物推荐', '#{product}', '#超市探店', '#好物分享'],
  },
  tour: {
    titles: [
      { s: 'quality', t: '带你逛{store}｜最全超市攻略' },
      { s: 'quality', t: '探店实录｜{store}这些区域别错过' },
      { s: 'scene', t: '周末无事，去{store}逛了一下午' },
      { s: 'scene', t: '下班后的快乐，从逛{store}开始' },
      { s: 'suspense', t: '逛了10年超市才发现，{store}藏着这些好东西' },
      { s: 'suspense', t: '{store}里最容易被忽略的宝藏角落' },
      { s: 'guide', t: '超市探店｜{store}有什么值得买的？跟着我走' },
      { s: 'guide', t: '人均50逛超市｜{store}好物一网打尽' },
      { s: 'meme', t: '沉浸式逛{store}，陪伴式解压' },
      { s: 'meme', t: '在{store}，我逛出了度假的快乐' },
    ],
    scripts: [
      { s: 'quality', t: `【开场】今天带你认真逛一遍{store}\n【区域1】生鲜区：{features}\n【区域2】零食区：新品超多\n【区域3】日用品区：品质之选\n【结尾】你最想逛哪个区？评论区告诉我` },
      { s: 'scene', t: `【开场】闲下来的一天，来{store}转转\n【过程】没有目的地的逛超市最解压\n【发现】{features}\n【感受】烟火气真的能治愈人\n【结尾】累了就去逛逛超市吧` },
      { s: 'suspense', t: `【开场】逛了这么多年超市，这些角落你注意过吗？\n【位置1】冷柜最上层：{features}\n【位置2】货架顶层：新品聚集地\n【位置3】收银台旁：临期特价区\n【结尾】下次去试试，有惊喜回来谢我` },
      { s: 'guide', t: `【开场】今天带你按路线逛{store}\n【路线】进门先看促销堆头\n【第二站】{features}\n【第三站】结账前必看的隐藏好物\n【结尾】关注我，下次带你逛别的超市` },
      { s: 'guide', t: `【开场】人均50怎么逛{store}？\n【原则】先买必需品，再逛折扣区\n【清单】{features}\n【总结】照着买，省钱又齐全\n【结尾】收藏这份清单，周末就出发` },
      { s: 'meme', t: `【开场】沉浸式逛{store}，全程不说话\n【过程】{features}\n【细节】听这个扫码声，多解压\n【结尾】看饿了吗？下次带你云逛街` },
      { s: 'meme', t: `【开场】在超市实现逛吃自由\n【路线】{features}\n【玩梗】这不是超市，这是我的快乐老家\n【结尾】每周探一家店，想看哪个评论区说` },
    ],
    hashtags: ['#超市探店', '#逛超市', '#{store}', '#超市攻略', '#好物分享'],
  },
  recipe: {
    titles: [
      { s: 'value', t: '不到{price}的超市食材，做出餐厅级{dish}' },
      { s: 'scene', t: '超市买的{product}，3分钟搞定一顿饭' },
      { s: 'scene', t: '下班20分钟，用超市食材搞定今晚的{dish}' },
      { s: 'guide', t: '用超市食材做{dish}，简单又好吃' },
      { s: 'guide', t: '懒人食谱｜超市买这些就能做{dish}' },
      { s: 'guide', t: '新手也能学会的{dish}，超市食材就能做' },
      { s: 'emotion', t: '给家人做一道{dish}，比外卖更有温度' },
      { s: 'emotion', t: '用超市平价食材，复刻妈妈的味道' },
      { s: 'meme', t: '这个{dish}一学就会，好吃到跺脚' },
      { s: 'meme', t: '听劝！{dish}这么做，真的绝' },
    ],
    scripts: [
      { s: 'value', t: `【开场】超市买的几样食材，做个{dish}\n【食材】{product}，只要{price}\n【步骤1】处理食材\n【步骤2】下锅烹饪\n【步骤3】调味出锅\n【成品】是不是超简单？跟着做起来` },
      { s: 'scene', t: `【开场】下班到家20分钟开饭挑战\n【食材】超市买的{product}\n【步骤】简单三步搞定{dish}\n【成品】比点外卖还快\n【结尾】打工人晚餐，就是这么简单` },
      { s: 'guide', t: `【开场】今天用超市食材做一道{dish}\n【购物】{features}\n【制作】简单几步搞定\n【试吃】味道绝了\n【结尾】收藏起来周末做` },
      { s: 'guide', t: `【开场】新手也能一次成功的{dish}\n【食材清单】{product}\n【关键步骤】火候和时间是重点\n【避坑】这两个错误千万别犯\n【结尾】跟着做，翻车来找我` },
      { s: 'emotion', t: `【开场】今天给家人做一道{dish}\n【准备】超市买了{product}，{features}\n【烹饪】慢慢做，不着急\n【上桌】家人说比饭店的还香\n【结尾】家的味道，其实就是有人为你做饭` },
      { s: 'meme', t: `【开场】今日挑战：用超市食材做{dish}\n【食材】{product}，{features}\n【过程】这个香味直接把我拿捏了\n【成品】好吃到想申请专利\n【结尾】学会了你就是家里的显眼包大厨` },
    ],
    hashtags: ['#美食教程', '#{dish}', '#超市食材', '#懒人食谱', '#在家做饭'],
  },
  promotion: {
    titles: [
      { s: 'value', t: '{store}{promo_name}来了！{discount}速来' },
      { s: 'value', t: '省钱预警｜{store}{promo_name}，{discount}太香了' },
      { s: 'value', t: '{promo_name}最后几天｜{discount}错过等一年' },
      { s: 'suspense', t: '超市这周有大动作，我先透露一点' },
      { s: 'suspense', t: '这个折扣力度，经理批的时候手都在抖' },
      { s: 'scene', t: '周末采购正当时，{store}{promo_name}安排上' },
      { s: 'scene', t: '囤货好时机：{discount}，一次买齐' },
      { s: 'meme', t: '家人们！这波羊毛不薅真的亏' },
      { s: 'meme', t: '钱包守护挑战失败：{discount}太香了' },
    ],
    scripts: [
      { s: 'value', t: `【开场】家人们注意了！{store}{promo_name}来了\n【活动】{discount}\n【时间】{start}到{end}\n【重点商品】{features}\n【引导】赶紧去超市，手慢无` },
      { s: 'value', t: `【钩子】这个消息必须告诉你们\n【活动】{store}{promo_name}\n【亮点】{discount}\n【推荐】{features}\n【结尾】转发给家人朋友一起去` },
      { s: 'suspense', t: `【开场】超市这周有大动作\n【剧透】{discount}\n【补充】{features}\n【提醒】时间：{start}到{end}\n【结尾】想知道全部清单？去店里自己看，保准惊喜` },
      { s: 'scene', t: `【开场】周末采购的计划来了\n【活动】{store}{promo_name}\n【优惠】{discount}\n【推荐】{features}\n【结尾】列好清单，一次买齐不跑空` },
      { s: 'meme', t: `【开场】家人们谁懂啊，这波太值了\n【活动】{store}{promo_name}，{discount}\n【种草】{features}\n【玩梗】这羊毛再不薅，对不起自己的钱包\n【结尾】转发家人群，一起去捡漏` },
    ],
    hashtags: ['#超市促销', '#{promo_name}', '#打折', '#{store}', '#省钱'],
  },
  tips: {
    titles: [
      { s: 'guide', t: '超市买东西的N个隐藏技巧' },
      { s: 'guide', t: '超市选购{category}，记住这几点' },
      { s: 'guide', t: '超市省钱攻略｜一年省下好几千' },
      { s: 'suspense', t: '不知道这些超市冷知识，亏大了' },
      { s: 'suspense', t: '超市购物小票里藏着的省钱秘密' },
      { s: 'scene', t: '下班逛超市，用这招10分钟买齐不踩坑' },
      { s: 'meme', t: '听劝！这几个超市技巧真的有用' },
      { s: 'meme', t: '原来超市是这样布局的，难怪总买多' },
    ],
    scripts: [
      { s: 'guide', t: `【开场】逛超市这么多年，才知道这些技巧\n【技巧1】{features}\n【技巧2】看保质日期位置\n【技巧3】堆头商品不一定是最低价\n【结尾】点赞收藏，下次逛超市用上` },
      { s: 'guide', t: `【开场】超市选购{category}怎么挑？\n【方法1】{features}\n【方法2】看标签辨新鲜\n【方法3】性价比对比\n【结尾】关注我，更多生活小妙招` },
      { s: 'suspense', t: `【开场】超市不会主动告诉你的几件事\n【冷知识1】{features}\n【冷知识2】堆头商品不一定是最低价\n【冷知识3】临期区藏着超值好物\n【结尾】知道这些，每个月能省不少钱` },
      { s: 'scene', t: `【开场】下班顺路进超市，怎么快速买完？\n【方法1】进门先拿需要的，直奔目标\n【方法2】{features}\n【方法3】只逛计划内的两个区域\n【结尾】10分钟买齐，不乱花一分钱` },
      { s: 'meme', t: `【开场】家人们，这些超市技巧也太实用了\n【技巧1】{features}\n【技巧2】购物前先吃饱，不会乱买\n【技巧3】自有品牌往往性价比更高\n【结尾】学到了就点个赞，下次用得上` },
    ],
    hashtags: ['#生活妙招', '#超市攻略', '#{category}', '#省钱技巧', '#生活小常识'],
  },
  member: {
    titles: [
      { s: 'value', t: '{store}会员日来了，{benefit}别忘了' },
      { s: 'value', t: '会员专属｜{store}{benefit}，别错过' },
      { s: 'guide', t: '超市会员卡还能这么用？{benefit}' },
      { s: 'guide', t: '会员日薅羊毛攻略｜{store}这些福利免费领' },
      { s: 'scene', t: '每月这几天，去{store}之前先看看会员日' },
      { s: 'meme', t: '会员日的快乐，懂的都懂' },
      { s: 'meme', t: '有会员卡的进，{benefit}白嫖攻略' },
    ],
    scripts: [
      { s: 'value', t: `【开场】{store}会员日又到了\n【福利1】{benefit}\n【福利2】积分兑换好物\n【福利3】会员专属折扣\n【引导】还没办会员卡的赶紧办，一年省不少` },
      { s: 'guide', t: `【开场】超市会员卡你真的会用吗？\n【隐藏福利】{benefit}\n【积分妙用】积分换购攻略\n【会员日】每月X号折扣最大\n【结尾】转发给家人，一起省` },
      { s: 'scene', t: `【开场】月底了，该去超市补货了\n【时机】正好赶上{store}会员日\n【福利】{benefit}\n【操作】结账前先出示会员码\n【结尾】同样的东西，会员价就是香` },
      { s: 'meme', t: `【开场】会员日就是超市给的安全感\n【福利】{benefit}\n【附加】积分还能换东西\n【玩梗】不领白不领，领了就是赚到\n【结尾】转发给室友，一起省省省` },
    ],
    hashtags: ['#会员福利', '#{store}', '#会员日', '#薅羊毛', '#超市省钱'],
  },
  festival: {
    titles: [
      { s: 'guide', t: '{festival}到！超市这些好物别错过' },
      { s: 'guide', t: '超市{festival}限定来了，{features}' },
      { s: 'scene', t: '{festival}囤货清单｜超市一站搞定' },
      { s: 'scene', t: '{festival}氛围感拉满，超市好物推荐' },
      { s: 'emotion', t: '{festival}回家团圆，带上这些超市好物' },
      { s: 'emotion', t: '小时候最盼{festival}，现在轮到我来准备' },
      { s: 'meme', t: '{festival}限定？这波超市整活了' },
    ],
    scripts: [
      { s: 'guide', t: `【开场】{festival}快乐！超市限定好物来了\n【推荐1】{features}\n【推荐2】节日氛围装饰\n【推荐3】送礼好物\n【结尾】{festival}去超市逛逛吧` },
      { s: 'scene', t: `【开场】{festival}不知道买什么？超市一站搞定\n【清单1】{features}\n【清单2】节日食品\n【清单3】氛围好物\n【结尾】收藏清单，去超市照着买` },
      { s: 'emotion', t: `【开场】{festival}快到了，今年我来准备\n【回忆】小时候最盼过节\n【准备】在超市挑了{features}\n【感悟】长大后才懂，节日是表达爱的机会\n【结尾】这个{festival}，回家好好陪陪家人` },
      { s: 'meme', t: `【开场】超市的{festival}限定也太好逛了\n【发现】{features}\n【玩梗】这波节日氛围直接拉满\n【安利】随便挑不踩雷\n【结尾】节日仪式感，超市给你安排明白` },
    ],
    hashtags: ['#{festival}', '#超市好物', '#节日囤货', '#{festival}好物', '#节日氛围'],
  },
  newarrival: {
    titles: [
      { s: 'quality', t: '超市上新了！{product}首发测评' },
      { s: 'quality', t: '超市新品速递｜{product}值不值得买' },
      { s: 'suspense', t: '超市货架又上新了，这个{product}有点意思' },
      { s: 'suspense', t: '第一次见这种{product}，直接好奇心拉满' },
      { s: 'value', t: '超市新品{product}，只要{price}试一下' },
      { s: 'meme', t: '超市新品{product}，是懂年轻人的' },
      { s: 'meme', t: '这届超市新品，也太会整活了' },
    ],
    scripts: [
      { s: 'quality', t: `【开场】超市又上新品了！\n【展示】{product}\n【卖点】{features}\n【测评】亲自试了，告诉你值不值\n【结尾】想看更多新品？关注我` },
      { s: 'suspense', t: `【开场】这个新品我在货架前研究了一分钟\n【好奇】{product}，到底什么来头？\n【开箱】{features}\n【结论】答案是：值得买\n【结尾】新品盲测系列持续更新，关注不迷路` },
      { s: 'value', t: `【开场】超市新品开箱\n【产品】{product}\n【价格】只要{price}\n【体验】{features}\n【总结】值不值你说了算` },
      { s: 'meme', t: `【开场】超市新品真的太懂了\n【展示】{product}，{features}\n【玩梗】研发人员是不是在我家装了摄像头\n【结论】这波新品，从包装到口味都很在线\n【结尾】路过一定要试试，回来谢我` },
    ],
    hashtags: ['#超市新品', '#{product}', '#新品测评', '#好物上新', '#超市好物'],
  },
  behind: {
    titles: [
      { s: 'quality', t: '超市的一天，从凌晨进货开始' },
      { s: 'quality', t: '带你看看{store}营业前什么样' },
      { s: 'scene', t: '凌晨4点的{store}，比你想的更热闹' },
      { s: 'scene', t: '超市补货现场，强迫症狂喜' },
      { s: 'suspense', t: '超市打烊之后，我们都干了什么' },
      { s: 'suspense', t: '你以为超市晚上关门就没人了？' },
      { s: 'emotion', t: '在超市工作第N年，最怕听到这句话' },
      { s: 'emotion', t: '超市员工的日常，累但值得' },
      { s: 'meme', t: '超市打工人的精神状态，请勿模仿' },
      { s: 'meme', t: '干超市这行后，我落下了这些"职业病"' },
      { s: 'guide', t: '超市为什么总把牛奶放在最里面？内幕来了' },
    ],
    scripts: [
      { s: 'quality', t: `【开场】今天带你看看超市的幕后\n【场景】{features}\n【细节】每一排货架都有自己的讲究\n【感受】原来开好一家超市这么不容易\n【结尾】下次逛超市，留意一下这些小细节` },
      { s: 'scene', t: `【开场】凌晨4点，大部分人还在睡\n【场景】{store}的卷帘门已经拉开\n【过程】{features}\n【细节】一箱箱货物上架、码放整齐\n【结尾】你今天买到的每样东西，都有人提前几小时为你搬过` },
      { s: 'suspense', t: `【开场】超市打烊后你以为就没人了？\n【揭秘】{features}\n【过程】对账、补货、清洁、盘点\n【反转】忙完已经深夜\n【结尾】明天开门时，货架又是满的` },
      { s: 'emotion', t: `【开场】在超市工作的第N年\n【日常】{features}\n【瞬间】有顾客说了一句"谢谢，辛苦了"\n【感悟】普通的工作，也有它的光\n【结尾】明天见，老朋友们` },
      { s: 'meme', t: `【开场】超市打工人的一天\n【日常】{features}\n【玩梗】别人上班带电脑，我上班搬箱子\n【结尾】点赞的都去好好吃饭，别浪费我搬的货` },
      { s: 'guide', t: `【开场】超市的陈列都是"心机"\n【冷知识1】牛奶放最里面，为了让你多逛\n【冷知识2】{features}\n【冷知识3】收银台旁是小件高利润区\n【结尾】知道这些，购物更理性` },
    ],
    hashtags: ['#超市幕后', '#超市日常', '#{store}', '#打工人日常', '#幕后花絮'],
  },
  interaction: {
    titles: [
      { s: 'scene', t: '评论区聊聊｜{category}你怎么选？' },
      { s: 'scene', t: '今天不带货，就想跟大家唠唠{category}' },
      { s: 'suspense', t: '灵魂拷问：{category}到底是先吃还是先存？' },
      { s: 'guide', t: '投票｜超市买{category}，你是哪一派？' },
      { s: 'guide', t: '有奖征集｜说说你的{category}故事' },
      { s: 'meme', t: '这个问题我憋了很久：{category}到底谁在买？' },
    ],
    scripts: [
      { s: 'scene', t: `【开场】今天不带货，就想跟大家聊聊\n【话题】{category}\n【我的答案】{features}\n【提问】你会怎么做？\n【结尾】评论区聊聊，点赞最高的下期拍出来` },
      { s: 'guide', t: `【开场】发起一个投票\n【选项A】{features}\n【选项B】随大流派\n【玩法】评论区扣1或2\n【结尾】下期公布结果，看看哪边人多` },
      { s: 'suspense', t: `【开场】这个问题真的吵起来了\n【争论点】{category}\n【正方】{features}\n【反方】根本没必要\n【结尾】你站哪边？评论区见` },
      { s: 'meme', t: `【开场】家人们来做个人形弹幕\n【话题】{category}\n【玩梗】答案没有对错，但有高低（狗头）\n【结尾】评论区刷起来，看看谁是显眼包` },
    ],
    hashtags: ['#互动话题', '#{category}', '#评论区聊聊', '#超市那些事', '#来聊天'],
  },
  knowledge: {
    titles: [
      { s: 'guide', t: '{category}保存指南｜这样做放更久' },
      { s: 'guide', t: '3个{category}冷知识，第一个就不知道' },
      { s: 'suspense', t: '{category}这么做等于白买，90%的人都错了' },
      { s: 'quality', t: '原来{category}要这样挑，以前全浪费了' },
      { s: 'meme', t: '听劝！{category}千万别这样放' },
      { s: 'value', t: '学会这几招，{category}多吃半个月' },
    ],
    scripts: [
      { s: 'guide', t: `【开场】{category}总是很快坏？方法不对\n【要点1】{features}\n【要点2】分类存放，别混放\n【要点3】注意温度和湿度\n【结尾】收藏起来，下次用得上` },
      { s: 'suspense', t: `【开场】{category}放冰箱直接坏了？\n【原因】{features}\n【正确做法】先做这一步\n【结尾】转发给家里买菜的人` },
      { s: 'quality', t: `【开场】挑{category}的诀窍，一学就会\n【看什么】{features}\n【摸什么】手感紧实的更新鲜\n【避坑】别只看个头大\n【结尾】学会了吗？去超市试试` },
      { s: 'meme', t: `【开场】这些{category}的知识，学校没教过\n【冷知识】{features}\n【玩梗】学完感觉自己白活了\n【结尾】关注我，每天涨点小知识` },
    ],
    hashtags: ['#生活科普', '#{category}', '#冷知识', '#生活小妙招', '#涨知识'],
  },
  greeting: {
    titles: [
      { s: 'emotion', t: '{festival}快乐｜来自{store}的一句心里话' },
      { s: 'emotion', t: '这个{festival}，愿你所愿皆所得' },
      { s: 'scene', t: '{festival}当天，超市里的人间烟火气' },
      { s: 'meme', t: '{festival}祝福已上线，请查收' },
      { s: 'quality', t: '{festival}将至，愿你日子像蜜一样甜' },
    ],
    scripts: [
      { s: 'emotion', t: `【开场】{festival}到了\n【想说】感谢每一位顾客的一年相伴\n【祝福】愿家人平安、诸事顺意\n【画面】超市灯火、人来人往的温暖镜头\n【结尾】{festival}快乐，我们都在` },
      { s: 'emotion', t: `【开场】又是一年{festival}\n【回忆】这些年，看着老顾客们来来往往\n【感悟】超市不只是买东西的地方，也是生活的一部分\n【祝福】{features}\n【结尾】{festival}快乐，阖家幸福` },
      { s: 'scene', t: `【开场】{festival}当天的超市，热闹又温柔\n【画面】{features}\n【瞬间】每个人提着大包小包，脸上带着笑\n【祝福】愿你也被生活温柔以待\n【结尾】{festival}快乐` },
      { s: 'meme', t: `【开场】{festival}祝福打包送达\n【祝福1】吃嘛嘛香\n【祝福2】钱包鼓鼓\n【玩梗】剩下的幸福自己补齐\n【结尾】评论区接好运` },
    ],
    hashtags: ['#{festival}', '#{festival}快乐', '#节日祝福', '#{store}', '#感恩相伴'],
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
  const selStyle = document.getElementById('cw-style');
  if (sel1 && sel1.options.length === 0) {
    sel1.innerHTML = CONTENT_TYPES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  }
  if (sel2 && sel2.options.length === 0) {
    sel2.innerHTML = CONTENT_TYPES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  }
  if (selStyle && selStyle.options.length === 0) {
    selStyle.innerHTML = COPY_STYLES.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
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
  const styleSel = document.getElementById('cw-style');
  const data = { type, style: styleSel ? styleSel.value : 'random' };
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
  const styleBadge = STYLE_NAMES[r.style] ? `<div style="margin-bottom:10px"><span class="tag tag-primary">${STYLE_NAMES[r.style]}</span></div>` : '';
  document.getElementById('copy-result').innerHTML = `
    ${styleBadge}
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
    style: currentCopy.style,
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
        <div class="list-item-meta"><span>🏷️ ${c.content_type || ''}</span> ${c.style && STYLE_NAMES[c.style] ? `<span>${STYLE_NAMES[c.style]}</span>` : ''} <span>📅 ${fmtDate(c.created_at)}</span></div>
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
  const styleBadge = c.style && STYLE_NAMES[c.style] ? `<div style="margin-bottom:10px"><span class="tag tag-primary">${STYLE_NAMES[c.style]}</span></div>` : '';
  document.getElementById('copy-result').innerHTML = `
    ${styleBadge}
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
