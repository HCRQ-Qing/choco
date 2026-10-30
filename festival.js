/* ============================================================
   节日 / 特殊日期 / 100天 / 周年 · 自动祝福调度
   ============================================================ */

const FEST_SCHED_KEY = 'mj_fest_sched_v1';

/* 拿某个节日分类的候选祝福语 */
function getFestivalCandidates(kind, festName){
  const g = getGroupsByOwner('public').find(x => x.id === 'g-festival');
  if(!g || !g.cats) return [];
  /* kind: 'solar' / 'lunar' / 'term' */
  const catId = kind === 'solar' ? 'cf-solar' : (kind === 'lunar' ? 'cf-lunar' : 'cf-term');
  const cat = g.cats.find(c => c.id === catId);
  if(!cat || !cat.list || !cat.list.length) return [];
  /* 优先匹配包含节日名的，没有就返回全部 */
  const all = cat.list.map(cardText).map(s => String(s).trim()).filter(Boolean);
  const matched = all.filter(t => t.indexOf(festName) >= 0);
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

  /* 4. 节日（公历） */
  const solarFest = SOLAR_FESTIVALS[m + '-' + d];
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
  _festTickTimer = setInterval(function(){
    try{ runFestTick(); }catch(e){ console.error('节日 tick 出错', e); }
  }, 60 * 1000);
  /* 启动后 5 秒先跑一次 */
  setTimeout(function(){ try{ runFestTick(); }catch(e){} }, 5000);
}

try{ scheduleFestTick(); }catch(e){ console.error('节日调度启动失败', e); }
