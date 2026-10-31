/* ============================================================
   节日 / 特殊日期 / 100天 / 周年 · 自动祝福调度
   ============================================================ */

const FEST_SCHED_KEY = 'mj_fest_sched_v1';

/* ============================================================
   节日名 → g-festival 下的专属分类（分类缺失时自动创建并预置字卡）
   - 只补缺失的分类，已存在（即用户改过 / 清空过）的一律不动
   ============================================================ */
const FEST_CAT_MAP = {
  '元旦':      { id:'cf-newyear',      name:'元旦',      list:[
    '元旦快乐，新的一年也要好好的',
    '新年第一天，想和你一起过',
    '新的一年，请多指教'
  ]},
  '春节':      { id:'cf-spring',       name:'春节',      list:[
    '春节快乐！新年吉祥',
    '过年啦，记得吃饺子',
    '新年好，想和你一起守岁',
    '新的一年也要在一起'
  ]},
  '元宵节':    { id:'cf-lantern',      name:'元宵节',    list:[
    '元宵节快乐，记得吃汤圆',
    '今晚的灯很好看，想和你一起看',
    '元宵甜甜的，像你一样'
  ]},
  '情人节':    { id:'cf-valentine',    name:'情人节',    list:[
    '情人节快乐，今天特别想你',
    '今天是情人节，只想和你过',
    '情话不多说，就想抱抱你'
  ]},
  '妇女节':    { id:'cf-women',        name:'妇女节',    list:[
    '妇女节快乐，今天你最大',
    '女神节快乐，今天好好休息',
    '今天不用辛苦啦，我心疼你'
  ]},
  '愚人节':    { id:'cf-aprilfool',    name:'愚人节',    list:[
    '愚人节快乐，刚才的话是骗你的',
    '今天可以骗人，但喜欢你是真的',
    '愚人节，我只骗你一句：我不喜欢你'
  ]},
  '劳动节':    { id:'cf-labor',        name:'劳动节',    list:[
    '劳动节快乐，好好休息一下',
    '放假了，想和你一起出去走走',
    '今天不用干活，就躺着吧'
  ]},
  '母亲节':    { id:'cf-mothersday',   name:'母亲节',    list:[
    '母亲节快乐，今天好好休息',
    '谢谢你的温柔，节日快乐',
    '今天想对你说一句辛苦了'
  ]},
  '儿童节':    { id:'cf-children',     name:'儿童节',    list:[
    '儿童节快乐，你也是我的小朋友',
    '今天可以幼稚一点',
    '给你买糖吃，节日快乐'
  ]},
  '父亲节':    { id:'cf-fathersday',   name:'父亲节',    list:[
    '父亲节快乐，今天你休息',
    '今天是你的节日，少操心一点',
    '父亲节，想抱抱你'
  ]},
  '七夕':      { id:'cf-qixi',         name:'七夕',      list:[
    '七夕快乐，今天想你了',
    '今晚的星星很好看，像你',
    '七夕，愿我们年年相见'
  ]},
  '教师节':    { id:'cf-teachers',     name:'教师节',    list:[
    '教师节快乐，今天辛苦了',
    '谢谢你的耐心，节日快乐',
    '今天换我给你上课'
  ]},
  '中秋节':    { id:'cf-midautumn',    name:'中秋节',    list:[
    '中秋节快乐，月亮好圆',
    '今晚一起吃月饼吧',
    '月亮很圆，想和你一起看'
  ]},
  '国庆节':    { id:'cf-national',     name:'国庆节',    list:[
    '国庆快乐，放假好好玩',
    '国庆假期，想和你一起去看海',
    '假期快乐，好好放松一下'
  ]},
  '万圣节':    { id:'cf-halloween',    name:'万圣节',    list:[
    '万圣节快乐，不给糖就捣蛋',
    '万圣节，我是来讨糖的',
    '今晚扮鬼也吓不到我对你的喜欢',
    '万圣节快乐，想要糖还是想要我'
  ]},
  '平安夜':    { id:'cf-xmas-eve',     name:'平安夜',    list:[
    '平安夜快乐，记得吃苹果',
    '平安夜，愿你平平安安',
    '平安夜快乐，想和你一起过'
  ]},
  '圣诞节':    { id:'cf-christmas',    name:'圣诞节',    list:[
    '圣诞快乐，想要什么礼物？',
    '圣诞快乐，我的礼物就是你',
    '下雪了，圣诞节快乐',
    '圣诞快乐，今晚一起拆礼物吗'
  ]},
  '跨年夜':    { id:'cf-newyear-eve',  name:'跨年夜',    list:[
    '跨年夜快乐，新的一年也一起',
    '今年最后一天，想和你一起过',
    '愿新的一年，我们还在彼此身边',
    '跨年快乐，倒数的时候想牵你的手'
  ]}
};

function getFestivalGroup(){
  if(typeof getGroupsByOwner !== 'function') return null;
  try{
    return getGroupsByOwner('public').find(function(x){ return x && x.id === 'g-festival'; }) || null;
  }catch(e){ return null; }
}

/* 首次加载：补齐节日专属分类（缺失才建，绝不覆盖已有内容） */
function ensureFestivalCats(){
  try{
    if(typeof cardStore === 'undefined' || !cardStore || !Array.isArray(cardStore.public)) return;
    let g = cardStore.public.find(function(x){ return x && x.id === 'g-festival'; });
    let dirty = false;
    if(!g){
      g = {
        id:'g-festival', name:'节日字卡', icon:'star', sub:'到节日时角色自动说祝福',
        cats:[
          { id:'cf-solar', name:'公历节日', list:[] },
          { id:'cf-lunar', name:'农历节日', list:[] },
          { id:'cf-term',  name:'节气',     list:[] }
        ]
      };
      cardStore.public.push(g);
      dirty = true;
    }
    if(!Array.isArray(g.cats)){ g.cats = []; dirty = true; }
    Object.keys(FEST_CAT_MAP).forEach(function(festName){
      const def = FEST_CAT_MAP[festName];
      /* 已存在就完全不动（用户编辑 / 清空都保留） */
      if(g.cats.some(function(c){ return c && c.id === def.id; })) return;
      g.cats.push({
        id: def.id,
        name: def.name,
        list: def.list.map(function(t){ return { text: t, t: Date.now() }; })
      });
      dirty = true;
    });
    if(dirty && typeof saveCardStore === 'function') saveCardStore();
  }catch(e){ console.error('节日字卡分类初始化失败', e); }
}
try{ ensureFestivalCats(); }catch(e){ console.error('节日字卡分类初始化失败', e); }

/* 拿某个节日分类的候选祝福语（优先专属分类，回退老的公历/农历/节气分类） */
function getFestivalCandidates(kind, festName){
  const g = getFestivalGroup();
  if(!g || !g.cats) return [];
  /* kind: 'solar' / 'lunar' / 'term' */
  const legacyId = kind === 'solar' ? 'cf-solar' : (kind === 'lunar' ? 'cf-lunar' : 'cf-term');
  let scoped = null;
  const def = FEST_CAT_MAP[festName];
  if(def){
    const c = g.cats.find(function(x){ return x && x.id === def.id; });
    if(c && Array.isArray(c.list) && c.list.length) scoped = c;
  }
  const legacy = g.cats.find(function(x){ return x && x.id === legacyId; });
  const cat = scoped || legacy;
  if(!cat || !cat.list || !cat.list.length) return [];
  const all = cat.list.map(cardText).map(function(s){ return String(s).trim(); }).filter(Boolean);
  /* 专属分类整类都是这个节日的，直接全量返回 */
  if(scoped) return all;
  /* 老分类：优先匹配包含节日名的，没有就返回全部 */
  const matched = all.filter(function(t){ return t.indexOf(festName) >= 0; });
  return matched.length ? matched : all;
}

/* 拿某个特殊日期分类的候选祝福语 */
function getSpecialCandidates(catId){
  const g = getGroupsByOwner('public').find(x => x.id === 'g-special');
  if(!g || !g.cats) return [];
  const cat = g.cats.find(c => c.id === catId);
  if(!cat || !cat.list || !cat.list.length) return [];
  return cat.list.map(cardText).map(s => String(s).trim()).filter(Boolean);
}

/* 今天命中的所有事件（可能多个）
   返回 [{ type, name, catId, text }, ...]
   可能同时包含：生日 + 纪念日 + 节日（农历） + 节日（公历） + 节气 + 倒计时 + 100天 */
function getTodaySpecialEvents(){
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  const todayKey = y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
  const events = [];

  /* 1. 生日 / 恋爱纪念日（来自编辑桌面的特殊日期） */
  const specials = (typeof getSpecialDates === 'function') ? getSpecialDates() : [];
  specials.forEach(s => {
    let hit = false;
    if(s.type === 'solar' && s.date === m + '-' + d) hit = true;
    if(s.type === 'lunar'){
      const lunar = (typeof solarToLunar === 'function') ? solarToLunar(y, m, d) : null;
      if(lunar && lunar.month === s.month && lunar.day === s.day && !lunar.isLeap) hit = true;
    }
    if(!hit) return;
    if(s.category === 'birthday'){
      const arr = getSpecialCandidates('cs-birthday');
      events.push({ type:'birthday', name:s.name, catId:'cs-birthday', text: arr.length ? arr[Math.floor(Math.random()*arr.length)] : '生日快乐' });
    } else if(s.category === 'love'){
      const arr = getSpecialCandidates('cs-love');
      events.push({ type:'love', name:s.name, catId:'cs-love', text: arr.length ? arr[Math.floor(Math.random()*arr.length)] : '纪念日快乐' });
    }
  });

  /* 2. 100 天节点（从恋爱纪念日算起） */
  specials.forEach(s => {
    if(s.category !== 'love') return;
    let baseTs = 0;
    if(s.type === 'solar'){
      const parts = s.date.split('-');
      baseTs = new Date(y, parseInt(parts[0],10) - 1, parseInt(parts[1],10)).getTime();
    } else if(s.type === 'lunar'){
      const r = (typeof lunarToSolar === 'function') ? lunarToSolar(y, s.month, s.day, false) : null;
      if(r) baseTs = new Date(r.year, r.month - 1, r.day).getTime();
    }
    if(!baseTs) return;
    const diffDays = Math.round((new Date(y, m-1, d).getTime() - baseTs) / 86400000);
    if(diffDays > 0 && diffDays % 100 === 0){
      const arr = getSpecialCandidates('cs-love');
      events.push({ type:'love100', name:s.name, catId:'cs-love', text: arr.length ? arr[Math.floor(Math.random()*arr.length)] : ('在一起第 ' + diffDays + ' 天') });
    }
  });

  /* 3. 节日（农历） */
  const lunar = (typeof solarToLunar === 'function') ? solarToLunar(y, m, d) : null;
  if(lunar){
    const lunarFest = LUNAR_FESTIVALS[lunar.month + '-' + lunar.day];
    if(lunarFest && !lunar.isLeap){
      const arr = getFestivalCandidates('lunar', lunarFest);
      events.push({ type:'festival-lunar', name:lunarFest, catId:'cf-lunar', text: arr.length ? arr[Math.floor(Math.random()*arr.length)] : (lunarFest + '快乐') });
    }
  }

  /* 4. 节日（公历，含母亲节 / 父亲节这类按星期推算的节日） */
  const solarFest = (typeof getSolarFestivalName === 'function')
    ? getSolarFestivalName(y, m, d)
    : SOLAR_FESTIVALS[m + '-' + d];
  if(solarFest){
    const arr = getFestivalCandidates('solar', solarFest);
    events.push({ type:'festival-solar', name:solarFest, catId:'cf-solar', text: arr.length ? arr[Math.floor(Math.random()*arr.length)] : (solarFest + '快乐') });
  }

  /* 5. 节气 */
  const term = (typeof getSolarTerm === 'function') ? getSolarTerm(y, m, d) : '';
  if(term){
    const arr = getFestivalCandidates('term', term);
    events.push({ type:'term', name:term, catId:'cf-term', text: arr.length ? arr[Math.floor(Math.random()*arr.length)] : ('今天' + term) });
  }

  /* 6. 倒计时 / 日程结束日 */
  const todos = (typeof getTodos === 'function') ? getTodos() : [];
  todos.forEach(t => {
    if(t.type === 'range' && t.end === todayKey){
      const arr = getSpecialCandidates('cs-countdown');
      events.push({ type:'countdown', name:t.title, catId:'cs-countdown', text: arr.length ? arr[Math.floor(Math.random()*arr.length)] : ('今天终于到了：' + t.title) });
    }
  });

  return events;
}

/* 给所有好友各发一条消息（走「角色主动发消息」通道） */
function broadcastToAllRoles(text, opts){
  opts = opts || {};
  const ids = getAllRoleIds();
  ids.forEach(rid => {
    const role = getRoleById(rid);
    if(!role || role.hidden) return;
    /* 每个角色独立加 0~30 秒抖动，避免同时抵达 */
    const delay = (opts.baseDelay || 0) + Math.random() * 30000;
    setTimeout(() => {
      try{
        const msg = {
          id: uid(),
          role: 'char',
          text: text,
          time: Date.now(),
          active: true
        };
        if(opts.type) msg.festivalType = opts.type;
        /* ★ appendMsgToRole 内部已经走总闸了，这里再判断一次
             用 msg.id 做去重键，跟内部那条是同一条消息，不会弹两遍 */
        appendMsgToRole(rid, msg);
        notifyPush(rid, msg);
      }catch(e){ console.error('广播祝福出错', e); }
    }, delay);
  });
}

/* 每天一次的调度：
   - 检查今天命中的所有事件（可能多个）
   - 每个事件在今天剩余时间里独立随机挑一个时刻
   - 到点广播给所有好友
   存储结构：
   { date:'2026-10-11', events:[ {type,name,catId,text,at,fired}, ... ] }
*/
function buildTodayFestSched(){
  const todayKey = (function(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  })();

  let sched = lsGet(FEST_SCHED_KEY, null);
  if(!sched || typeof sched !== 'object') sched = {};
  if(sched.date === todayKey && Array.isArray(sched.events)) return sched;

  /* 新的一天：重置 */
  sched = { date: todayKey, events: [] };

  const evs = getTodaySpecialEvents();
  if(evs && evs.length){
    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const span = endOfDay.getTime() - now;
    evs.forEach((ev, idx) => {
      /* 每个事件独立挑一个时刻（可能撞车，但撞车概率小） */
      const at = (span > 0)
        ? (now + Math.floor(Math.random() * span))
        : 0;
      sched.events.push({
        type: ev.type,
        name: ev.name,
        catId: ev.catId,
        text: ev.text,
        at: at,
        fired: false
      });
    });
  }
  lsSet(FEST_SCHED_KEY, sched);
  return sched;
}

/* 每分钟 tick：检查每个事件是否到点 */
let _festTickTimer = null;
function runFestTick(){
  const sched = buildTodayFestSched();
  if(!sched || !Array.isArray(sched.events) || !sched.events.length) return;
  const now = Date.now();
  let changed = false;

  sched.events.forEach(ev => {
    if(ev.fired) return;
    if(!ev.at) return;
    if(now < ev.at) return;
    /* 到点：广播 */
    try{
      broadcastToAllRoles(ev.text, { type: ev.type });
    }catch(e){ console.error('节日广播失败', e); }
    ev.fired = true;
    changed = true;
  });

  if(changed) lsSet(FEST_SCHED_KEY, sched);
}

function scheduleFestTick(){
  if(_festTickTimer) clearInterval(_festTickTimer);
  _festTickTimer = null;
  function guarded(){
    try{ runFestTick(); }catch(e){ console.error('节日 tick 出错', e); }
  }
  /* 统一走 keepalive 调度器：只在主标签跑 */
  if(window.KA && typeof window.KA.on === 'function'){
    window.KA.on('fest-tick', guarded, 60 * 1000);
    setTimeout(function(){
      try{ if(window.KA.isLeader && window.KA.isLeader()) guarded(); }catch(e){}
    }, 5000);
    return;
  }
  _festTickTimer = setInterval(guarded, 60 * 1000);
  /* 启动后 5 秒先跑一次 */
  setTimeout(guarded, 5000);
}

try{ scheduleFestTick(); }catch(e){ console.error('节日调度启动失败', e); }
