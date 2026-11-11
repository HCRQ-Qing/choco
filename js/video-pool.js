/* ============================================================
   共享池 + 角色刷视频
   ============================================================ */
const VIDEO_POOL_KEY = 'mj_video_pool_v1';
const ROLE_SCHEDULE_KEY = 'mj_role_schedule_v1';
const VIDEO_SEEN_KEY = 'mj_video_seen_v1';
const VIDEO_PUB_RATE = 0.5;

/* 共享池扩展：蹲一蹲 / 收藏 */
const VIDEO_WATCH_KEY = 'mj_video_watch_v1';
const VIDEO_FAV_ORDER = ['douyin', 'xhs', 'bili', 'weibo', 'kuaishou', 'youtube', 'other'];

var _vpTab = 'all';
var _vpWatchMode = 'random';

const VIDEO_KW_KEY = 'mj_video_keywords_v1';
function getVideoKeywords(){
  let a = lsGet(VIDEO_KW_KEY, null);
  if(!Array.isArray(a)) a = [];
  return a;
}
function saveVideoKeywords(a){ lsSet(VIDEO_KW_KEY, a); }

try{ if(typeof purgeBuiltinVideos === 'function') purgeBuiltinVideos(); }catch(e){ console.error('清理内置视频失败', e); }

function getVideoPool(){
  let a = lsGet(VIDEO_POOL_KEY, null);
  if(!Array.isArray(a)) a = [];
  return a;
}
function saveVideoPool(a){ lsSet(VIDEO_POOL_KEY, a); }

/* 从一段文本里提取第一条 http(s) 链接
   规则：从 http:// 或 https:// 开始，取到「空格 / 换行 / 制表符 / 中文 / 字符串末尾」为止 */
function extractUrl(text){
  if(!text) return '';
  const s = String(text);
  const m = s.match(/https?:\/\/[^\s\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]+/i);
  if(!m) return '';
  return m[0].replace(/[.,;:!?)\]}>'"]+$/g, '');   // 去掉结尾可能的标点
}

function hashUrl(url){
  let s = String(url||'').trim();
  s = s.replace(/[?#].*$/, '');
  s = s.replace(/\/+$/,'');
  let h = 0;
  for(let i = 0; i < s.length; i++){
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return 'v' + Math.abs(h).toString(36);
}

function detectPlatform(url){
  const u = String(url||'').toLowerCase();
  if(u.includes('douyin') || u.includes('v.douyin')) return 'douyin';
  if(u.includes('xiaohongshu') || u.includes('xhslink')) return 'xhs';
  if(u.includes('bilibili') || u.includes('b23.tv')) return 'bili';
  if(u.includes('weibo')) return 'weibo';
  if(u.includes('kuaishou') || u.includes('v.kuaishou')) return 'kuaishou';
  if(u.includes('youtube') || u.includes('youtu.be')) return 'youtube';
  return 'other';
}
function platformName(p){
  return {douyin:'抖音',xhs:'小红书',bili:'B站',weibo:'微博',kuaishou:'快手',youtube:'YouTube',other:'链接'}[p] || '链接';
}
function platformClass(p){
  if(p === 'douyin') return 'douyin';
  if(p === 'xhs') return 'xhs';
  if(p === 'kuaishou') return 'kuaishou';
  if(p === 'youtube') return 'youtube';
  return '';
}
function platformIcon(p){
  return {douyin:'🎵',xhs:'📕',bili:'📺',weibo:'🌐',kuaishou:'⚡',youtube:'▶️',other:'🔗'}[p] || '🔗';
}

function getVideoSeen(){
  let m = lsGet(VIDEO_SEEN_KEY, null);
  if(!m || typeof m !== 'object') m = {};
  return m;
}
function saveVideoSeen(m){ lsSet(VIDEO_SEEN_KEY, m); }
function markVideoSeen(roleId, videoId){
  const m = getVideoSeen();
  if(!m[roleId]) m[roleId] = [];
  if(!m[roleId].includes(videoId)) m[roleId].push(videoId);
  if(m[roleId].length > 500) m[roleId] = m[roleId].slice(-500);
  saveVideoSeen(m);
}
function hasSeen(roleId, videoId){
  const m = getVideoSeen();
  return m[roleId] && m[roleId].includes(videoId);
}
async function fetchBiliVideoByKeyword(kw) {
  try {
    const url = 'https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=' + encodeURIComponent(kw);
    const res = await fetch(url);
    const json = await res.json();
    if (json && json.data && json.data.result && json.data.result.length > 0) {
      const first = json.data.result[0];
      const bvMatch = first.bvid;
      if (bvMatch) {
        return {
          id: bvMatch,
          url: 'https://www.bilibili.com/video/' + bvMatch,
          title: first.title.replace(/<[^>]+>/g, ''),
          desc: first.description || '按关键词为你找到了这个，快去看看',
          cover: first.pic,
          isBili: true
        };
      }
    }
  } catch(e) {
    console.error("B站搜索失败", e);
  }
  return null;
}

async function pickRandomVideo(roleId){
  const pool = getVideoPool();
  const fresh = pool.filter(v => !hasSeen(roleId, v.id));
  if(!fresh.length) return null;
  return fresh[Math.floor(Math.random() * fresh.length)];
}

const VIDEO_COUNT_WEIGHTS = [
  {count:1,  weight:25},
  {count:2,  weight:25},
  {count:3,  weight:20},
  {count:4,  weight:12},
  {count:5,  weight:10},
  {count:6,  weight:4},
  {count:7,  weight:2},
  {count:8,  weight:1},
  {count:9,  weight:0.5},
  {count:10, weight:0.5}
];
const VIDEO_TOTAL_WEIGHT = VIDEO_COUNT_WEIGHTS.reduce((s,x)=>s+x.weight, 0);
function pickVideoCount(){
  let r = Math.random() * VIDEO_TOTAL_WEIGHT;
  for(const item of VIDEO_COUNT_WEIGHTS){
    r -= item.weight;
    if(r <= 0) return item.count;
  }
  return 1;
}
function pickHourSlotsForVideo(){
  const n = 1 + Math.floor(Math.random() * 3);
  const available = [];
  for(let h = 7; h <= 22; h++) available.push(h);
  for(let i = available.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const picked = [];
  for(const h of available){
    if(picked.length >= n) break;
    if(picked.some(p => Math.abs(p - h) < 2)) continue;
    picked.push(h);
  }
  return picked.sort((a,b)=>a-b);
}
function pickMinutesInHourForVideo(K){
  const set = new Set();
  while(set.size < K){
    set.add(Math.floor(Math.random() * 60));
  }
  return Array.from(set).sort((a,b)=>a-b);
}
function todayKey(){
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}
function buildScheduleForRole(roleId){
  if(Math.random() > VIDEO_PUB_RATE){
    return { rest:true, slots:[], date:todayKey() };
  }
  const slots = pickHourSlotsForVideo();
  const result = [];
  slots.forEach(hour => {
    const K = pickVideoCount();
    const minutes = pickMinutesInHourForVideo(K);
    result.push({
      hour,
      count: K,
      times: minutes.map(m => {
        const t = new Date();
        t.setHours(hour, m, 0, 0);
        return t.getTime();
      })
    });
  });
  return { rest:false, slots:result, date:todayKey(), fired:[] };
}
function getOrBuildSchedule(roleId){
  let m = lsGet(ROLE_SCHEDULE_KEY, null);
  if(!m || typeof m !== 'object') m = {};
  const today = todayKey();
  let kwFlag = lsGet('mj_kw_update_flag', 0);
  if(!m[roleId] || m[roleId].date !== today || !m[roleId].kwFlag || m[roleId].kwFlag !== kwFlag){
    m[roleId] = buildScheduleForRole(roleId);
    m[roleId].kwFlag = kwFlag;
    lsSet(ROLE_SCHEDULE_KEY, m);
  }
  return m[roleId];
}
function saveSchedule(roleId, sched){
  let m = lsGet(ROLE_SCHEDULE_KEY, null);
  if(!m || typeof m !== 'object') m = {};
  m[roleId] = sched;
  lsSet(ROLE_SCHEDULE_KEY, m);
}

function sendVideoMessage(roleId, video){
  const role = getRoleById(roleId);
  if(!role) return;
  const platform = detectPlatform(video.url);
  markVideoSeen(roleId, video.id);

  // 状态栏临时变成「刷视频中」
  flashVideoStatus(roleId, 15000);

  // 先构造视频卡片消息（无论哪种情况都要发这张卡）
  const cardMsg = {
    id: uid(),
    role: 'char',
    videoCard: {
      url: video.url,
      title: video.desc || platformName(platform) + '视频',
      desc: video.desc || '',
      platform: platform,
      platformName: platformName(platform),
      platformIcon: platformIcon(platform),
      videoId: video.id
    },
    time: Date.now()
  };

  // 决定这次走哪种模式
  // 90% → 从「分享卡片」分组抽一句
  // 5%  → 完整走普通字卡逻辑（genReply），可能多气泡/拼好卡/混单字字卡
  // 5%  → 只有卡片，不说话
  const roll = Math.random();

  // 组装最终要发的消息列表
  const toSend = [];

  if(roll < 0.90){
    // === 情况 1：先发一条文字气泡，再单独发视频卡片 ===
    const text = pickShareCardReply(platform);
    if(text){
      toSend.push({
        id: uid(),
        role: 'char',
        text: text,
        time: Date.now()
      });
      // 卡片稍后一点发（时间戳 +1ms，保证排序在文字后面）
      cardMsg.time = Date.now() + 1;
    }
    /* 卡片消息本身不能带 text，否则会渲染出空气泡 */
    delete cardMsg.text;
    toSend.push(cardMsg);

  } else if(roll < 0.95){
    // === 情况 2：完整普通字卡逻辑 ===
    // genReply 返回 [{kind:'bubbles', bubbles:[...]}] 或 [{kind:'recall'}]
    let result;
    try {
      result = genReply(undefined, roleId);
    } catch(e){
      result = null;
    }

    if(result && result.length && result[0].kind === 'recall'){
      // 撤回：只发一张卡片（不说话）
      toSend.push(cardMsg);
    } else if(result && result.length && result[0].kind === 'bubbles'){
      // 调公共函数把气泡结构变成消息数组，跟聊天页一套
      const builtMsgs = buildMsgsFromBubbles(result[0].bubbles, roleId, null);
      if(builtMsgs.length){
        // 最后一条挂上视频卡片
        builtMsgs[builtMsgs.length - 1].videoCard = cardMsg.videoCard;
        builtMsgs.forEach(function(m){ toSend.push(m); });
      } else {
        toSend.push(cardMsg);
      }
    } else {
      // 兜底：只发卡片
      toSend.push(cardMsg);
    }

  } else {
    // 情况 3：仅发送卡片
    toSend.push(cardMsg);
  }

  const key = 'mj_msgs_' + roleId;
  let arr = lsGet(key, null);
  if(!Array.isArray(arr)) arr = [];
  toSend.forEach(m => arr.push(m));
  lsSet(key, arr);
  if(getCurrentRoleId() === roleId){
    msgs = arr;
    renderChat(true);
  }
}

async function runVideoScheduleTickAsync() {
  const friends = getFriends().filter(f => !f.hidden && !f.blocked && !f.builtin);
  const now = Date.now();
  for (const f of friends) {
    const sched = getOrBuildSchedule(f.id);
    if(sched.rest) continue;
    if(!sched.fired) sched.fired = [];
    const catching = !!window.__kaCatchUpActive;
    let caughtSent = 0;
    for (let si = 0; si < sched.slots.length; si++) {
      const slot = sched.slots[si];
      for (let ti = 0; ti < slot.times.length; ti++) {
        const t = slot.times[ti];
        const key = si + '-' + ti;
        if(sched.fired.includes(key)) continue;
        const freshWin = catching ? 6 * 3600 * 1000 : 5 * 60 * 1000;
        if(now >= t && now - t < freshWin){
          if(catching && caughtSent >= 1){
            sched.fired.push(key);
            saveSchedule(f.id, sched);
            continue;
          }
          flashVideoStatus(f.id, 15000);
          const video = await pickRandomVideo(f.id);
          if(video){
            sched.fired.push(key);
            saveSchedule(f.id, sched);
            sendVideoMessage(f.id, video);
            caughtSent++;
          } else {
            sched.fired.push(key);
            saveSchedule(f.id, sched);
          }
        } else if(now - t >= 5*60*1000 && now - t < 24*3600*1000){
          sched.fired.push(key);
          saveSchedule(f.id, sched);
        }
      }
    }
  }
}

function pickShareCardReply(platform){
  const g = getGroupsByOwner('public').find(x => x.id === 'g-share');
  if(!g || !g.cats || !g.cats.length) return pickCard();

  /* 优先用「分享回复」分类；找不到就在全部分类里汇总抽 */
  let pool = [];
  const mainCat = g.cats.find(c => c.id === 'csh-all');
  if(mainCat && Array.isArray(mainCat.list)){
    pool = mainCat.list.map(cardText).map(s => String(s).trim()).filter(Boolean);
  }
  /* 用户自己加的分类也参与，但只在主分类没有可用内容时才回退 */
  if(!pool.length){
    g.cats.forEach(c => {
      (c.list || []).forEach(item => {
        const t = cardText(item).trim();
        if(t) pool.push(t);
      });
    });
  }
  if(!pool.length) return pickCard();
  return pool[Math.floor(Math.random() * pool.length)];
}

function runVideoScheduleTick(){
  runVideoScheduleTickAsync().catch(e => console.error('视频调度出错', e));
}
/* 定时调度统一交给 keepalive 的 KA 调度器（只在主标签执行，多开不会重复发消息） */
(function scheduleVideoTicks(){
  function guarded(){
    try{ runVideoScheduleTick(); }catch(e){ console.error('视频调度出错', e); }
  }
  if(window.KA && typeof window.KA.on === 'function'){
    window.KA.on('video-schedule', guarded, 60 * 1000);
    setTimeout(function(){
      try{ if(window.KA.isLeader && window.KA.isLeader()) guarded(); }catch(e){}
    }, 3000);
  } else {
    setInterval(guarded, 60 * 1000);
    setTimeout(guarded, 3000);
  }
})();

/* ============ 共享池：样式注入 ============ */
function ensureVideoExtraStyles(){
  if(document.getElementById('videoExtraStyles')) return;
  const st = document.createElement('style');
  st.id = 'videoExtraStyles';
  st.textContent = `
    #videoPoolScreen{background:#fff !important; padding-top:0 !important;}
    #videoPoolScreen .vp-body{padding-top:0 !important; margin-top:-8px;}
    #videoPoolScreen .vp-tabs{position:sticky;top:0;z-index:3;display:flex;
      margin:0 -18px 8px;padding:0 18px;background:#fff;
      border-bottom:0.7px solid #f0f0f0;}
    #videoPoolScreen .vp-tab{padding:8px 0 7px !important;}
    #videoPoolScreen .vp-tab{flex:1;padding:11px 0 10px;border:none;background:transparent;
      font-family:inherit;font-size:12px;font-weight:300;letter-spacing:3px;text-indent:3px;
      color:#aaa;cursor:pointer;position:relative;-webkit-font-smoothing:antialiased;
      transition:color .18s ease;}
    #videoPoolScreen .vp-tab.on{color:#1a1a1a;font-weight:400;}
    #videoPoolScreen .vp-tab.on::after{content:'';position:absolute;left:50%;bottom:-1px;
      width:20px;height:2px;margin-left:-10px;background:#1a1a1a;border-radius:2px;}

 
    #videoPoolScreen .vp-item .vp-fav{width:26px;height:26px;flex:none;
      border:none;background:transparent;color:#ccc;font-size:15px;line-height:1;
      cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;
      transition:color .18s ease, transform .18s ease;}
    #videoPoolScreen .vp-item .vp-fav.on{color:#1a1a1a;}
    #videoPoolScreen .vp-item .vp-fav:active{transform:scale(.88);}

    #videoPoolScreen .vp-group-title{display:flex;align-items:center;gap:6px;
      font-family:Georgia,serif;font-size:11px;letter-spacing:2px;color:#999;
      margin:16px 0 2px;padding:0 2px;}
    #videoPoolScreen .vp-group-title b{margin-left:auto;font-size:10px;font-weight:400;
      color:#bbb;letter-spacing:0;}

    #videoPoolScreen .vp-watch-add{padding:4px 0 2px;}
    #videoPoolScreen .vp-watch-add-btn{width:100%;padding:13px 0;border:0.7px solid #e8e8e8;
      border-radius:12px;background:#fff;color:#1a1a1a;font-family:inherit;font-size:12.5px;
      font-weight:300;letter-spacing:3px;cursor:pointer;transition:background .18s ease;}
    #videoPoolScreen .vp-watch-add-btn:active{background:#fafafa;}
    #videoPoolScreen .vp-watch-hint{font-size:10.5px;color:#bbb;letter-spacing:.5px;
      margin:8px 2px 0;text-align:center;font-weight:300;}
    #videoPoolScreen .vp-watch-item{display:flex;align-items:flex-start;gap:12px;
      padding:13px 4px;border-bottom:0.7px dashed rgba(0,0,0,.1);}
    #videoPoolScreen .vp-watch-item:last-child{border-bottom:none;}
    #videoPoolScreen .vp-watch-item .vp-ic{width:36px;height:36px;border-radius:10px;flex:none;
      border:0.7px solid #d0d0d0;display:flex;align-items:center;justify-content:center;
      font-size:16px;background:#fff;}
    #videoPoolScreen .vp-watch-main{flex:1;min-width:0;}
    #videoPoolScreen .vp-watch-desc{font-size:13px;color:#1a1a1a;font-weight:500;
      line-height:1.5;word-break:break-word;}
    #videoPoolScreen .vp-watch-url{font-size:11px;color:#999;margin-top:3px;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    #videoPoolScreen .vp-watch-meta{font-size:10px;color:#bbb;margin-top:5px;
      letter-spacing:.5px;font-family:Georgia,serif;}
    #videoPoolScreen .vp-watch-meta.warn{color:#1a1a1a;}

    #videoPoolScreen .vp-about{padding:8px 2px 20px;}
    #videoPoolScreen .vp-about-title{font-family:Georgia,serif;font-size:11px;
      letter-spacing:3px;color:#bbb;margin:6px 0 14px;}
    #videoPoolScreen .vp-about p{font-size:12.5px;line-height:2;color:#666;
      font-weight:300;letter-spacing:.6px;margin:0 0 12px;word-break:break-word;}

    #vpWatchOverlay{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99998;display:none;}
    #vpWatchOverlay.show{display:block;}
    #vpWatchOverlay .vpw-mask{position:absolute;left:0;top:0;right:0;bottom:0;
      background:rgba(0,0,0,.36);}
    #vpWatchOverlay .vpw-sheet{position:absolute;left:0;right:0;bottom:0;background:#fff;
      border-radius:18px 18px 0 0;padding:22px 22px calc(24px + env(safe-area-inset-bottom,0px));
      max-height:88vh;overflow-y:auto;box-shadow:0 -10px 40px rgba(0,0,0,.14);}
    #vpWatchOverlay .vpw-close{position:absolute;right:14px;top:12px;width:28px;height:28px;
      border:none;background:transparent;color:#ccc;font-size:14px;cursor:pointer;
      font-family:inherit;display:flex;align-items:center;justify-content:center;padding:0;}
    #vpWatchOverlay .vpw-title{font-size:14px;font-weight:300;letter-spacing:4px;
      color:#1a1a1a;text-align:center;margin:0 0 18px;-webkit-font-smoothing:antialiased;}
    #vpWatchOverlay .vpw-label{display:block;font-size:11px;color:#bbb;letter-spacing:1px;
      margin:14px 0 7px;font-weight:300;}
    #vpWatchOverlay .vpw-input{width:100%;box-sizing:border-box;border:0.7px solid #e8e8e8;
      border-radius:10px;background:#fff;padding:11px 12px;font-family:inherit;font-size:13px;
      color:#1a1a1a;outline:none;letter-spacing:.5px;transition:border-color .18s ease;}
    #vpWatchOverlay .vpw-input:focus{border-color:#1a1a1a;}
    #vpWatchUrl::placeholder,#vpWatchDesc::placeholder,#vpWatchDays::placeholder{
      font-size:12px;color:#c8c8c8;}
    #vpWatchOverlay .vpw-opts{display:flex;flex-direction:column;gap:8px;}
    #vpWatchOverlay .vpw-opt{display:flex;align-items:center;gap:10px;padding:11px 12px;
      border:0.7px solid #e8e8e8;border-radius:10px;background:#fff;font-size:12.5px;
      color:#777;letter-spacing:.5px;cursor:pointer;transition:border-color .18s ease,color .18s ease;}
    #vpWatchOverlay .vpw-opt.on{border-color:#1a1a1a;color:#1a1a1a;}
    #vpWatchOverlay .vpw-opt .vpw-dot{width:14px;height:14px;border-radius:50%;flex:none;
      border:0.7px solid #ccc;position:relative;box-sizing:border-box;transition:border-color .18s ease;}
    #vpWatchOverlay .vpw-opt.on .vpw-dot{border-color:#1a1a1a;}
    #vpWatchOverlay .vpw-opt.on .vpw-dot::after{content:'';position:absolute;
      left:3px;top:3px;right:3px;bottom:3px;border-radius:50%;background:#1a1a1a;}
    #vpWatchDays{width:66px;padding:5px 6px;margin-left:auto;font-size:12.5px;text-align:center;}
    #vpWatchOverlay .vpw-unit{font-size:12px;flex:none;}
    #vpWatchOverlay .vpw-save{width:100%;margin-top:20px;padding:13px 0;border:none;
      border-radius:22px;background:#1a1a1a;color:#fff;font-family:inherit;font-size:13px;
      font-weight:300;letter-spacing:4px;text-indent:4px;cursor:pointer;}
    #vpWatchOverlay .vpw-save:active{opacity:.85;}

    #videoPoolScreen .vp-kw-wrap{padding:8px 0 20px;}
    #videoPoolScreen .vp-kw-input-box{display:flex;gap:8px;margin-bottom:20px;}
    #videoPoolScreen .vp-kw-input{flex:1;height:40px;border:0.7px solid #e8e8e8;background:#fafafa;border-radius:10px;padding:0 14px;font-size:13.5px;outline:none;font-family:inherit;color:#1a1a1a;}
    #videoPoolScreen .vp-kw-input:focus{border-color:#1a1a1a;background:#fff;}
    #videoPoolScreen .vp-kw-btn{width:64px;height:40px;border:none;background:#1a1a1a;color:#fff;border-radius:10px;font-size:13px;font-family:inherit;cursor:pointer;}
    #videoPoolScreen .vp-kw-list{display:flex;flex-wrap:wrap;gap:8px;}
    #videoPoolScreen .kw-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#f5f5f5;border-radius:20px;font-size:13px;color:#1a1a1a;}
    #videoPoolScreen .kw-del{font-size:12px;color:#aaa;padding:2px 4px;cursor:pointer;font-family:Arial;}
    #videoPoolScreen .kw-del:active{color:#1a1a1a;}
  `;
  (document.head || document.body).appendChild(st);
}

/* ============ 蹲一蹲：数据层 ============ */
function getVideoWatch(){
  let a = lsGet(VIDEO_WATCH_KEY, null);
  if(!Array.isArray(a)) a = [];
  return a;
}
function saveVideoWatch(a){ lsSet(VIDEO_WATCH_KEY, a); }

/* 到期的蹲一蹲：标记已提醒，并向当前角色发一条提示（没有角色就只标记） */
function checkWatch(){
  const list = getVideoWatch();
  const now = Date.now();
  let changed = false;
  list.forEach(function(it){
    if(!it || it.notified) return;
    if(!(it.dueAt <= now)) return;
    it.notified = true;
    changed = true;
    let rid = '';
    let role = null;
    try{
      rid = typeof getCurrentRoleId === 'function' ? getCurrentRoleId() : '';
      role = (rid && typeof getRoleById === 'function') ? getRoleById(rid) : null;
    }catch(e){
      role = null;
    }
    if(!role) return;
    try{
      appendMsgToRole(rid, {
        id: uid(),
        role: 'char',
        text: '蹲的视频到时间啦：' + it.url,
        time: Date.now()
      });
    }catch(e){
      console.error('发送蹲一蹲提醒失败', e);
    }
  });
  if(changed){
    saveVideoWatch(list);
    const screen = document.getElementById('videoPoolScreen');
    if(screen && screen.classList.contains('on')) renderVideoPool();
  }
}
kaSchedule('video-watch', checkWatch, 60 * 1000);

/* ============ 清理池子里遗留的内置视频：一次清完，不弹提示 ============ */
function purgeBuiltinVideos(){
  var FLAG = 'mj_video_builtin_purged_v1';
  if(lsGet(FLAG, false)) return;
  const pool = getVideoPool();
  const kept = pool.filter(function(v){ return !(v && v.builtin === true); });
  if(kept.length !== pool.length){
    saveVideoPool(kept);
  }
  lsSet(FLAG, true);
}

/* ============ 共享池：渲染 ============ */
function vpFavLabel(p){
  return p === 'other' ? '其它' : platformName(p);
}
function vpTimeText(t){
  return new Date(t || Date.now()).toLocaleString('zh-CN',
    { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
function vpItemHTML(v){
  const p = detectPlatform(v.url);
  const fav = !!v.fav;
  return '<div class="vp-item" data-open="' + esc(v.id) + '">' +
    '<div class="vp-ic">' + platformIcon(p) + '</div>' +
    '<div class="vp-main">' +
      '<div class="vp-name">' + esc(v.desc || platformName(p) + '视频') +
      '</div>' +
      '<div class="vp-url">' + esc(v.url) + '</div>' +
      '<div class="vp-time">' + vpTimeText(v.time) + '</div>' +
    '</div>' +
    '<button class="vp-fav' + (fav ? ' on' : '') + '" data-fav="' + esc(v.id) +
      '" type="button">' + (fav ? '★' : '☆') + '</button>' +
    '<button class="vp-del" data-del="' + esc(v.id) + '" type="button">✕</button>' +
  '</div>';
}
function vpRenderAll(pool){
  if(!pool.length){
    return '<div class="vp-empty">视频池还是空的<br>点右上角「＋ 上传」粘贴链接添加一个吧<br>' +
      '支持抖音 / B站 / 小红书 / 微博等任意链接</div>';
  }
  const sorted = pool.slice().sort(function(a, b){ return (b.time || 0) - (a.time || 0); });
  return '<div class="vp-section-title">全部视频（' + sorted.length + '）</div>' +
    sorted.map(vpItemHTML).join('');
}
function vpRenderFav(pool){
  const favs = pool.filter(function(v){ return !!v.fav; });
  if(!favs.length){
    return '<div class="vp-empty">还没有收藏的视频<br>点视频右侧的 ☆ 就能收藏</div>';
  }
  let html = '';
  VIDEO_FAV_ORDER.forEach(function(p){
    const items = favs.filter(function(v){ return detectPlatform(v.url) === p; })
      .sort(function(a, b){ return (b.time || 0) - (a.time || 0); });
    if(!items.length) return;
    html += '<div class="vp-group-title">' + platformIcon(p) + ' ' + esc(vpFavLabel(p)) +
      '<b>' + items.length + '</b></div>';
    html += items.map(vpItemHTML).join('');
  });
  return html;
}
function vpRenderWatch(){
  const list = getVideoWatch().slice().sort(function(a, b){
    return (a.dueAt || 0) - (b.dueAt || 0);
  });
  let html = '<div class="vp-watch-add">' +
    '<button class="vp-watch-add-btn" data-watch-add="1" type="button">＋ 蹲一个视频</button>' +
    '<div class="vp-watch-hint">粘贴链接，到时间提醒你去看</div>' +
  '</div>';
  if(!list.length){
    return html + '<div class="vp-empty">还没有蹲的视频<br>先把想看的链接存进来吧</div>';
  }
  html += list.map(function(it){
    const p = detectPlatform(it.url);
    const left = (it.dueAt || 0) - Date.now();
    let state;
    let warn = false;
    if(it.notified){
      state = '已提醒';
    } else if(left <= 0){
      state = '即将提醒';
      warn = true;
    } else {
      state = Math.ceil(left / 86400000) + ' 天后提醒';
    }
    const created = it.created
      ? new Date(it.created).toLocaleString('zh-CN', { month:'numeric', day:'numeric' })
      : '';
    return '<div class="vp-watch-item">' +
      '<div class="vp-ic">' + platformIcon(p) + '</div>' +
      '<div class="vp-watch-main">' +
        '<div class="vp-watch-desc">' + esc(it.desc || vpFavLabel(p) + '链接') + '</div>' +
        '<div class="vp-watch-url">' + esc(it.url) + '</div>' +
        '<div class="vp-watch-meta' + (warn ? ' warn' : '') + '">' + state +
          (created ? ' · 加入于 ' + created : '') + '</div>' +
      '</div>' +
      '<button class="vp-del" data-watch-del="' + esc(it.id) + '" type="button">✕</button>' +
    '</div>';
  }).join('');
  return html;
}
function vpRenderKeywords(){
  const keys = getVideoKeywords();
  let chips = keys.map(k => '<div class="kw-chip" data-kw="' + esc(k) + '">' + esc(k) + ' <span class="kw-del" data-kw-del="' + esc(k) + '">×</span></div>').join('');
  if(!keys.length){
    chips = '<div style="font-size:12px;color:#bbb;padding:10px 0">还没有关键词，添加一个吧</div>';
  }
  return '<div class="vp-kw-wrap">' +
    '<div class="vp-kw-input-box">' +
      '<input class="vp-kw-input" id="vpKwInput" type="text" placeholder="输入关键词，如：搞笑猫猫">' +
      '<button class="vp-kw-btn" id="vpKwAdd" type="button">添加</button>' +
    '</div>' +
    '<div class="vp-kw-list">' + chips + '</div>' +
  '</div>';
}
function vpTabBarHTML(){
  const tabs = [
    { k:'all',   label:'全部' },
    { k:'fav',   label:'收藏' },
    { k:'watch', label:'蹲一蹲' }
  ];
  return '<div class="vp-tabs">' + tabs.map(function(t){
    return '<button class="vp-tab' + (_vpTab === t.k ? ' on' : '') + '" data-vtab="' + t.k +
      '" type="button">' + t.label + '</button>';
  }).join('') + '</div>';
}

function openVideoPool(){
  showScreen('videoPoolScreen');
  try{ checkWatch(); }catch(e){ console.error('蹲一蹲检查出错', e); }
  renderVideoPool();
}
function closeVideoPool(){
  showScreen('deskScreen');
}
function renderVideoPool(){
  const box = document.getElementById('vpBody');
  if(!box) return;
  ensureVideoExtraStyles();
  purgeBuiltinVideos();
  const pool = getVideoPool();
  let inner;
  
  if(_vpTab === 'fav'){
    if(window.VideoFav){
      if(!window.__curFavGroup){
        inner = window.VideoFav.renderFolders(pool, function(group){
          window.__curFavGroup = group;
          renderVideoPool();
        });
      } else {
        inner = window.VideoFav.renderFolderDetail(pool, window.__curFavGroup, function(){
          window.__curFavGroup = '';
          renderVideoPool();
        });
      }
    } else {
      inner = vpRenderFav(pool);
    }
  } 
  else if(_vpTab === 'watch') { inner = vpRenderWatch(); }
  else { inner = vpRenderAll(pool); }
  
  box.innerHTML = vpTabBarHTML() + '<div class="vp-tab-body">' + inner + '</div>';
}

/* ============ 收藏 / 删除 ============ */
function toggleVideoFav(id){
  const arr = getVideoPool();
  const v = arr.find(function(x){ return x.id === id; });
  if(!v) return;
  
  if(v.fav){
    v.fav = false;
    v.favGroup = '';
    saveVideoPool(arr);
    renderVideoPool();
    toast('已取消收藏');
    return;
  }

  if(window.VideoFav){
    window.VideoFav.promptGroup(id, function(groupName){
      v.fav = true;
      v.favGroup = groupName;
      saveVideoPool(arr);
      renderVideoPool();
      toast('已收藏到：' + groupName);
    });
  } else {
    v.fav = true;
    saveVideoPool(arr);
    renderVideoPool();
    toast('已收藏');
  }
}
function deleteVideoById(id){
  if(!confirm('删除这条视频？')) return;
  saveVideoPool(getVideoPool().filter(function(x){ return x.id !== id; }));
  renderVideoPool();
  toast('已删除');
}
function deleteWatchById(id){
  if(!confirm('删除这条蹲一蹲？')) return;
  saveVideoWatch(getVideoWatch().filter(function(x){ return x.id !== id; }));
  renderVideoPool();
  toast('已删除');
}

/* ============ 蹲一蹲：底部弹层 ============ */
function ensureWatchOverlay(){
  let ov = document.getElementById('vpWatchOverlay');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'vpWatchOverlay';
  ov.innerHTML =
    '<div class="vpw-mask" data-watch-close="1"></div>' +
    '<div class="vpw-sheet">' +
      '<button class="vpw-close" data-watch-close="1" type="button">✕</button>' +
      '<div class="vpw-title">蹲 一 蹲</div>' +
      '<label class="vpw-label">视频链接</label>' +
      '<input class="vpw-input" id="vpWatchUrl" type="text" ' +
        'placeholder="粘贴抖音 / B站 / 小红书等链接">' +
      '<label class="vpw-label">备注（可选）</label>' +
      '<input class="vpw-input" id="vpWatchDesc" type="text" placeholder="想蹲的是什么">' +
      '<label class="vpw-label">提醒方式</label>' +
      '<div class="vpw-opts">' +
        '<div class="vpw-opt on" data-wmode="random">' +
          '<span class="vpw-dot"></span><span>随机 1~30 天内提醒</span>' +
        '</div>' +
        '<div class="vpw-opt" data-wmode="custom">' +
          '<span class="vpw-dot"></span><span>自定义</span>' +
          '<input class="vpw-input" id="vpWatchDays" type="number" min="1" max="365" placeholder="1-365">' +
          '<span class="vpw-unit">天后提醒</span>' +
        '</div>' +
      '</div>' +
      '<button class="vpw-save" id="vpWatchSave" type="button">加 入 蹲 一 蹲</button>' +
    '</div>';
  document.body.appendChild(ov);
  return ov;
}
function updateWatchModeUI(){
  const ov = document.getElementById('vpWatchOverlay');
  if(!ov) return;
  ov.querySelectorAll('.vpw-opt').forEach(function(el){
    if(el.getAttribute('data-wmode') === _vpWatchMode) el.classList.add('on');
    else el.classList.remove('on');
  });
}
function openWatchOverlay(){
  ensureVideoExtraStyles();
  const ov = ensureWatchOverlay();
  _vpWatchMode = 'random';
  const urlEl = document.getElementById('vpWatchUrl');
  const descEl = document.getElementById('vpWatchDesc');
  const daysEl = document.getElementById('vpWatchDays');
  if(urlEl) urlEl.value = '';
  if(descEl) descEl.value = '';
  if(daysEl) daysEl.value = '';
  updateWatchModeUI();
  ov.classList.add('show');
  setTimeout(function(){ if(urlEl) urlEl.focus(); }, 200);
}
function closeWatchOverlay(){
  const ov = document.getElementById('vpWatchOverlay');
  if(ov) ov.classList.remove('show');
}
function saveWatchEntry(){
  const urlEl = document.getElementById('vpWatchUrl');
  const descEl = document.getElementById('vpWatchDesc');
  if(!urlEl) return;
  const raw = String(urlEl.value || '').trim();
  if(!raw){ toast('请粘贴链接'); return; }
  const url = extractUrl(raw);
  if(!url){ toast('没找到有效链接，请检查粘贴内容'); return; }
  let days;
  if(_vpWatchMode === 'custom'){
    const daysEl = document.getElementById('vpWatchDays');
    days = parseInt(String((daysEl && daysEl.value) || ''), 10);
    if(!(days >= 1 && days <= 365)){ toast('请输入 1~365 之间的整数天'); return; }
  } else {
    days = 1 + Math.floor(Math.random() * 30);
  }
  const list = getVideoWatch();
  if(list.some(function(x){ return !x.notified && x.url === url; })){
    toast('这条已经在蹲了');
    return;
  }
  list.push({
    id: uid(),
    url: url,
    desc: String((descEl && descEl.value) || '').trim(),
    dueAt: Date.now() + days * 86400000,
    created: Date.now(),
    notified: false
  });
  saveVideoWatch(list);
  closeWatchOverlay();
  renderVideoPool();
  toast('已加入蹲一蹲，' + days + ' 天后提醒');
}

/* ============ 共享池：事件委托 ============ */
document.addEventListener('click', function(e){
  const t = e.target;
  if(!t || !t.closest) return;

  const tabBtn = t.closest('.vp-tab');
  if(tabBtn){
    e.preventDefault();
    _vpTab = tabBtn.getAttribute('data-vtab') || 'all';
    window.__curFavGroup = '';
    renderVideoPool();
    return;
  }

  if(t.closest('[data-watch-close]')){
    e.preventDefault();
    closeWatchOverlay();
    return;
  }

  if(t.closest('[data-watch-add]')){
    e.preventDefault();
    openWatchOverlay();
    return;
  }

  const modeEl = t.closest('.vpw-opt');
  if(modeEl){
    _vpWatchMode = modeEl.getAttribute('data-wmode') || 'random';
    updateWatchModeUI();
    return;
  }

  if(t.closest('#vpWatchSave')){
    e.preventDefault();
    saveWatchEntry();
    return;
  }

  const favBtn = t.closest('.vp-fav');
  if(favBtn){
    e.preventDefault();
    toggleVideoFav(favBtn.getAttribute('data-fav'));
    return;
  }

  const wDel = t.closest('[data-watch-del]');
  if(wDel){
    e.preventDefault();
    deleteWatchById(wDel.getAttribute('data-watch-del'));
    return;
  }

  const delBtn = t.closest('[data-del]');
  if(delBtn){
    e.preventDefault();
    deleteVideoById(delBtn.getAttribute('data-del'));
    return;
  }

  const item = t.closest('.vp-item');
  if(item){
    const id = item.getAttribute('data-open');
    const v = getVideoPool().find(function(x){ return x.id === id; });
    if(v && v.url) window.open(v.url, '_blank');
  }
});

function openVideoUpload(){
  document.getElementById('vuUrl').value = '';
  document.getElementById('mVideoUpload').classList.add('show');
  setTimeout(() => document.getElementById('vuUrl').focus(), 200);
}

document.addEventListener('click', (e) => {
  const t = e.target;
  if(!t || !t.closest) return;
  if(t.closest('#vpBack')){
    e.preventDefault(); e.stopPropagation();
    closeVideoPool();
    return;
  }
  if(t.closest('#vpAdd')){
    e.preventDefault(); e.stopPropagation();
    openVideoUpload();
    return;
  }
  if(t.closest('#vuOk')){
    e.preventDefault(); e.stopPropagation();
    const raw = document.getElementById('vuUrl').value.trim();
    if(!raw){ toast('请输入链接'); return; }
    const url = extractUrl(raw);
    if(!url){ toast('没找到有效链接，请检查粘贴内容'); return; }
    const pool = getVideoPool();
    const id = hashUrl(url);
    if(pool.some(v => v.id === id)){ toast('这条链接已经在池子里了'); return; }
    pool.push({
      id: id,
      url: url,
      desc: '',
      platform: detectPlatform(url),
      time: Date.now()
    });
    saveVideoPool(pool);
    document.getElementById('mVideoUpload').classList.remove('show');
    renderVideoPool();
    toast('已上传');
    return;
  }
}, true);



(function ensureShareCardGroup(){
  if(!cardStore || !Array.isArray(cardStore.public)) return;

  /* 如果分组已存在：把三个默认分类合并成一个「分享回复」，保留用户自建分类 */
  const exist = cardStore.public.find(g => g.id === 'g-share');
  if(exist){
    if(!Array.isArray(exist.cats)) exist.cats = [];
    const oldIds = ['csh-douyin', 'csh-xhs', 'csh-common'];
    const mergedList = [];
    exist.cats.forEach(c => {
      if(oldIds.includes(c.id) && Array.isArray(c.list)){
        c.list.forEach(item => {
          const t = cardText(item).trim();
          if(t && !mergedList.includes(t)) mergedList.push(t);
        });
      }
    });
    /* 如果合并后至少有一条内容，就移除旧的三个分类，插入一个「分享回复」 */
    if(mergedList.length){
      exist.cats = exist.cats.filter(c => !oldIds.includes(c.id));
      const already = exist.cats.find(c => c.id === 'csh-all');
      if(already){
        already.list = mergedList;
      } else {
        exist.cats.unshift({ id:'csh-all', name:'分享回复', list: mergedList });
      }
    }
    saveCardStore();
    return;
  }

  /* 分组不存在：新建一个，只放一个「分享回复」分类 */
  cardStore.public.push({
    id: 'g-share',
    name: '分享卡片',
    icon: 'star',
    sub: '角色分享视频时用的回复',
    cats: [
      { id:'csh-all', name:'分享回复', list:[
        '这个笑死我了','你快看这个','我刚刷到的','哈哈哈哈哈哈','你看这个猫',
        '这个也太可爱了','救命我笑不活了','快看快看','这个好上头','刷到这个就想到你',
        '这个好绝','收藏了','你肯定喜欢','这个我要试试','好喜欢这个风格',
        '这个也太美了','看到这个就想起你','这个氛围感绝了','快看这个','这个我真的爱了',
        '刚刷到这个，你看看','这个不错','分享给你','你看看这个','这个有意思',
        '刚好刷到的','想起了你','这个应该合你口味','随手分享一下'
      ]}
    ]
  });
  saveCardStore();
})();

/* ============================================================
   内置：天气字卡 / 节日字卡 / 特殊日期字卡（一次性建好，用户可改）
   ============================================================ */
(function ensureLinkCardGroups(){
  if(!cardStore || !Array.isArray(cardStore.public)) return;
  const FLAG = 'mj_link_groups_v1';
  if(lsGet(FLAG, false)) return;

  /* ---- 天气字卡（从 WeatherCats 读分类，老数据只补不删）---- */
  (function rebuildWeatherGroup(){
    if(!window.WeatherCats || typeof window.WeatherCats.getCats !== 'function') return;
    var newCats = window.WeatherCats.getCats();
    var g = cardStore.public.find(function(x){ return x && x.id === 'g-weather'; });
    if(!g){
      /* 老用户/新用户都没有这个分组 → 按 16 类新建 */
      cardStore.public.push({
        id: 'g-weather',
        name: '天气字卡',
        icon: 'star',
        sub: '角色根据今日天气说话',
        cats: newCats.map(function(c){
          return {
            id: c.id,
            name: c.name,
            list: c.legacy ? [] : c.list.map(function(t){ return { text: t, t: Date.now() }; })
          };
        })
      });
      return;
    }
    /* 已有分组：只补不删
       - 分类 id 已在 → 名字不动，字卡一条不动，只在空时补默认字卡
       - 分类 id 不在 → 新建 + 填默认字卡
       - 老的 cw-rain / 用户自建分类 → 原样保留，不碰 */
    if(!Array.isArray(g.cats)) g.cats = [];
    newCats.forEach(function(c){
      var exist = g.cats.find(function(x){ return x && x.id === c.id; });
      if(exist){
        if(!Array.isArray(exist.list)) exist.list = [];
        if(!exist.list.length && !c.legacy && useBuiltinCards()){
          exist.list = c.list.map(function(t){ return { text: t, t: Date.now(), src:'builtin' }; });
        }
        return;
      }
      g.cats.push({
        id: c.id,
        name: c.name,
        list: c.legacy ? [] : c.list.map(function(t){ return { text: t, t: Date.now() }; })
      });
    });
  })();

  /* ---- 节日字卡 ---- */
  if(!cardStore.public.some(g => g.id === 'g-festival')){
    cardStore.public.push({
      id: 'g-festival',
      name: '节日字卡',
      icon: 'star',
      sub: '到节日时角色自动说祝福',
      cats: [
        { id:'cf-solar', name:'公历节日', list:[] },
        { id:'cf-lunar', name:'农历节日', list:[] },
        { id:'cf-term',  name:'节气',     list:[] }
      ]
    });
  }
  /* 往节日字卡里填默认祝福语（幂等，只在分类空时填） */
  (function fillFestivalDefaults(){
    const g = cardStore.public.find(x => x.id === 'g-festival');
    if(!g || !g.cats) return;
    const solarCat = g.cats.find(c => c.id === 'cf-solar');
    const lunarCat = g.cats.find(c => c.id === 'cf-lunar');
    const termCat  = g.cats.find(c => c.id === 'cf-term');
    function fill(cat, list){
      if(!cat) return;
      if(!Array.isArray(cat.list)) cat.list = [];
      if(cat.list.length) return;
      list.forEach(t => cat.list.push({ text: t, t: Date.now() }));
    }
    fill(solarCat, [
      '元旦快乐，新的一年也要好好的',
      '新年快乐！今年也要在一起',
      '情人节快乐，今天特别想你',
      '劳动节快乐，好好休息一下',
      '儿童节快乐，你也是我的小朋友',
      '国庆快乐，放假好好玩',
      '圣诞快乐，想要什么礼物',
      '平安夜快乐，记得吃苹果'
    ]);
    fill(lunarCat, [
      '春节快乐！新年吉祥',
      '元宵节快乐，记得吃汤圆',
      '端午节安康，今天吃粽子了吗',
      '七夕快乐，今天想你了',
      '中秋节快乐，月亮好圆',
      '重阳节安康，记得看看老人',
      '腊八节快乐，今天喝粥了吗'
    ]);
    fill(termCat, [
      '今天立春，春天要来了',
      '今天清明，去踏青了吗',
      '今天夏至，白天最长',
      '今天秋分，昼夜等长',
      '今天冬至，记得吃饺子或汤圆',
      '今天是大雪，注意保暖'
    ]);
  })();

  /* ---- 特殊日期字卡（生日 / 纪念日 / 倒计时 / 100 天）---- */
  if(!cardStore.public.some(g => g.id === 'g-special')){
    cardStore.public.push({
      id: 'g-special',
      name: '特殊日期字卡',
      icon: 'star',
      sub: '生日 / 纪念日 / 倒计时当天自动祝福',
      cats: [
        { id:'cs-birthday', name:'生日祝福', list:[
          '生日快乐！今天你是主角',
          '生日快乐，希望你每天都开心',
          '又长大一岁啦，生日快乐',
          '生日快乐，我准备了一个小惊喜',
          '生日快乐，这一年也要健康平安'
        ]},
        { id:'cs-love',     name:'恋爱纪念日', list:[
          '纪念日快乐，今天特别想你',
          '又是和你在一起的一天，真好',
          '纪念日快乐，想和你走更远',
          '今天是我们在一起的第 N 天，纪念一下',
          '纪念日快乐，每天都是新的开始'
        ]},
        { id:'cs-countdown',name:'倒计时 / 日程', list:[
          '今天是那个日子，你准备好了吗',
          '今天终于到了，加油',
          '记着呢，就是今天',
          '那个日子到了，我陪你'
        ]}
      ]
    });
  }

  saveCardStore();
  lsSet(FLAG, true);
})();

/* ============================================================
   ★ 一次性迁移：把「公用 → 个签字卡 → 角色个签」搬到每个角色专属
   - 每个角色专属里建 g-sign 分组，把公用 cs-role 的内容复制过去
   - 迁移完成后，删掉公用 g-sign 里的 cs-role 分类
   - 用 flag 保证只跑一次
   ============================================================ */
 

(function patchChatRender(){
  const origRender = window.renderChat;
  if(typeof origRender !== 'function') return;
  window.renderChat = function(forceBottom, force){
    origRender(forceBottom, force);
    if(window.__tagBubbles) window.__tagBubbles();
    if(window.VideoMsg && typeof window.VideoMsg.bindClickDelegation === 'function'){
      window.VideoMsg.bindClickDelegation();
    }
  };
})();/* ============ 刷视频时，临时改状态栏 ============ */
let _videoStatusTimer = null;
function flashVideoStatus(roleId, durationMs){
  // 只在当前正在看的这个角色身上生效
  if(roleId !== getCurrentRoleId()) return;

  const ms2 = getMoodState();
  const backup = { status: ms2.status, mood: ms2.mood };

  // 切换为「刷视频中」
  ms2.status = '📱 刷视频中';
  saveMoodState(ms2);
  applyMoodUI();

  // 定时还原
  if(_videoStatusTimer) clearTimeout(_videoStatusTimer);
  _videoStatusTimer = setTimeout(()=>{
    // 还原成原来的（如果期间用户手动改过，就不还原，避免打架）
    const now = getMoodState();
    if(now.status === '📱 刷视频中'){
      now.status = backup.status;
      now.mood = backup.mood;
      saveMoodState(now);
      applyMoodUI();
    }
    _videoStatusTimer = null;
  }, durationMs || 15000);
}
/* ============================================================
   renderTopBar · 全站唯一顶部栏函数
   用法：
     renderTopBar({ title:'字 卡' })                        // 只返回
     renderTopBar({ title:'字 卡', onBack:()=>{...} })      // 自定义返回
     renderTopBar({ title:'心 情', act:'⚙', onAct:()=>{...} })
     renderTopBar({ title:'编 辑 桌 面', act:'EDIT', actCls:'edit', onAct:()=>{...} })
     renderTopBar({ title:'共 享 池', act:'＋ 上传', actCls:'txt', onAct:()=>{...} })
     renderTopBar({ title:'群 聊', avatar:role.avatar, act:'⋯', onAct:()=>{...} })
   参数：
     title  标题文字（必填）
     act    右上角按钮文字（不传就不显示按钮）
     actCls 'txt' 文字小按钮 / 'edit' 字距大的文字按钮 / 不传＝普通图标按钮
     avatar 头像地址（传了就显示在标题左边）
     onBack 返回按钮回调（不传＝先关所有 .screen.on，再 goToPage('me')）
     onAct  右上角按钮回调
   ============================================================ */
function renderTopBar(cfg){
  cfg = cfg || {};
  var hostId = cfg.host || 'utopHost';
  var host = document.getElementById(hostId);
  if(!host) return;
  var title = cfg.title || '';
  var act = cfg.act || '';
  var actCls = cfg.actCls || '';
  var avatar = cfg.avatar || '';

  var avHTML = '';
  if(avatar){
    avHTML = '<div class="utop-av">' + avatarHTML(avatar) + '</div>';
  }

  var actHTML = '';
  if(act){
    var cls = 'utop-act';
    if(actCls === 'txt') cls += ' txt';
    if(actCls === 'edit') cls += ' edit';
    /* ★ 修复：以前全站按钮都用同一个 id，几十个页面里 id 重复，
       getElementById 会拿到别的页面上的按钮。改成按 host 生成唯一 id。 */
    var btnId = cfg.actId || ('utopAct_' + hostId);
    actHTML = '<button class="' + cls + '" id="' + btnId + '" type="button"></button>';
  }

  var backId = 'utopBack_' + hostId;
  host.innerHTML =
    '<div class="utop">' +
      '<button class="utop-back" id="' + backId + '" type="button">‹</button>' +
      avHTML +
      '<div class="utop-title">' + escapeHTML(title) + '</div>' +
      '<div class="utop-right">' + actHTML + '</div>' +
    '</div>';

  /* ★ 关键修复：只在当前 host 内部找返回按钮。
     以前用 document.getElementById('utopBackBtn')，页面一多就会绑到
     别的（隐藏的）页面上的 ‹ 上，当前页的 ‹ 看起来就"点了没反应"。 */
  var back = host.querySelector('.utop-back');
  if(back){
    back.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      if(typeof cfg.onBack === 'function'){
        cfg.onBack();
      } else {
        document.querySelectorAll('.screen.on').forEach(function(s){ s.classList.remove('on'); });
        if(typeof goToPage === 'function') goToPage('me');
      }
    };
  }

  var actBtn = host.querySelector('.utop-act');
  if(actBtn){
    if(act) actBtn.innerHTML = act;
    if(typeof cfg.onAct === 'function'){
      actBtn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        cfg.onAct();
      };
    }
  }
}

/* ============ 切换角色按钮 · 锚定小浮窗 ============ */
function openRoleSwitchMenu(){
  let menu = document.getElementById('roleSwitchMenu');
  if(!menu){
    menu = document.createElement('div');
    menu.id = 'roleSwitchMenu';
    menu.innerHTML = '<div class="rsm-title">切 换 角 色</div><div class="rsm-list" id="rsmList"></div>';
    document.body.appendChild(menu);

    const style = document.createElement('style');
    style.textContent =
      '#roleSwitchMenu{position:fixed;z-index:99999;min-width:200px;max-width:270px;' +
      'background:#fff;border:0.7px solid rgba(0,0,0,.12);border-radius:16px;' +
      'box-shadow:0 10px 34px rgba(0,0,0,.14);padding:12px 8px 10px;' +
      'display:none;opacity:0;transform:translateY(-6px) scale(.96);' +
      'transition:opacity .18s ease, transform .18s cubic-bezier(.22,1,.36,1);}' +
      '#roleSwitchMenu.show{display:block;opacity:1;transform:translateY(0) scale(1);}' +
      '#roleSwitchMenu .rsm-title{font-size:10.5px;letter-spacing:4px;color:#ccc;' +
      'font-family:Georgia,serif;text-align:center;padding:2px 0 10px;' +
      'border-bottom:0.6px solid #f2f2f2;margin-bottom:8px;}' +
      '#roleSwitchMenu .rsm-list{max-height:320px;overflow-y:auto;scrollbar-width:none;}' +
      '#roleSwitchMenu .rsm-list::-webkit-scrollbar{display:none;}' +
      '#roleSwitchMenu .rsm-item{display:flex;align-items:center;gap:12px;' +
      'padding:10px 10px;border-radius:11px;cursor:pointer;' +
      'transition:background .15s ease;}' +
      '#roleSwitchMenu .rsm-item:active{background:#f7f7f7;}' +
      '#roleSwitchMenu .rsm-item.on{background:#fafafa;}' +
      '#roleSwitchMenu .rsm-av{width:38px;height:38px;' +
      'flex:none;background:#f0f0f0;position:relative;overflow:hidden;' +
      'border-radius:var(--avatar-radius,12%);}' +
      '#roleSwitchMenu .rsm-av svg{position:absolute;inset:0;width:100%;height:100%;}' +
      '#roleSwitchMenu .rsm-av .silhouette{fill:#c8c8c8;}' +
      '#roleSwitchMenu .rsm-av img{position:absolute;inset:0;width:100%;height:100%;' +
      'object-fit:cover;display:block;}' +
      '#roleSwitchMenu .rsm-nm{flex:1;font-size:14.5px;color:#1a1a1a;font-weight:300;' +
      'letter-spacing:1.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
      'max-width:140px;-webkit-font-smoothing:antialiased;' +
      '-webkit-text-stroke:0.1px #1a1a1a;}' +
      '#roleSwitchMenu .rsm-badge{flex:none;min-width:20px;height:20px;padding:0 7px;' +
      'border-radius:10px;background:#1a1a1a;color:#fff;font-size:11px;' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:Georgia,serif;letter-spacing:0;font-weight:400;}' +
      '';
    document.head.appendChild(style);

    menu.addEventListener('click', function(e){
      const item = e.target.closest('.rsm-item');
      if(!item) return;
      e.stopPropagation();
      const rid = item.dataset.rid;
      closeRoleSwitchMenu();
      if(rid && rid !== getCurrentRoleId()){
        switchToRole(rid);
        toast('已切换到：' + getCurrentRoleName());
      }
    });

    document.addEventListener('click', function(e){
      const m = document.getElementById('roleSwitchMenu');
      if(!m || !m.classList.contains('show')) return;
      if(m.contains(e.target)) return;
      if(e.target.closest('#roleSwitchBtn')) return;
      closeRoleSwitchMenu();
    }, true);
    window.addEventListener('resize', closeRoleSwitchMenu);
  }

  // 渲染列表
  const list = document.getElementById('rsmList');
  const friends = getFriends().filter(f => !f.hidden && !f.builtin);
  const curId = getCurrentRoleId();
  const avShape = 'var(--avatar-radius,12%)';
  const unreadMap = getUnreadMap();
  list.innerHTML = friends.map(f => {
    const on = f.id === curId ? ' on' : '';
    const un = (f.id === curId) ? 0 : (unreadMap[f.id] || 0);
    const badge = un > 0
      ? '<span class="rsm-badge">' + (un > 99 ? '99+' : un) + '</span>'
      : '';
    return '<div class="rsm-item' + on + '" data-rid="' + f.id + '">' +
      '<div class="rsm-av" style="border-radius:' + avShape + '">' + avatarHTML(f.avatar) + '</div>' +
      '<div class="rsm-nm">' + esc(displayName(f)) + '</div>' +
      badge +
    '</div>';
  }).join('');

  const btn = document.getElementById('roleSwitchBtn');
  menu.classList.add('show');
  if(btn){
    const r = btn.getBoundingClientRect();
    const mw = menu.offsetWidth || 200;
    const mh = menu.offsetHeight || 140;
    let left = r.right - mw;
    let top = r.bottom + 10;
    if(left < 8) left = 8;
    if(left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    if(top + mh > window.innerHeight - 8) top = r.top - mh - 10;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }
}
function closeRoleSwitchMenu(){
  const m = document.getElementById('roleSwitchMenu');
  if(m) m.classList.remove('show');
}

/* ============ 让 Ta 刷一下 · 手动触发 ============ */
function forceSendVideo(){
  const roleId = getCurrentRoleId();
  const role = getRoleById(roleId);
  if(!role){ toast('找不到当前角色'); return; }

  const pool = getVideoPool();
  const kws = getVideoKeywords();
  if(!pool.length && !kws.length){
    toast('池子是空的，也没有设置关键词，先去加几条吧');
    return;
  }

  toast(role.name + ' 正在刷手机…');
  pickRandomVideo(roleId).then(video => {
    if(!video){
      toast('没有找到可发送的视频，可能池子空了或网络不佳');
      return;
    }
    setTimeout(() => {
      try{
        sendVideoMessage(roleId, video);
        toast('已发送');
      }catch(e){
        console.error(e);
        toast('发送失败：' + e.message);
      }
    }, 1000 + Math.random() * 1000);
  });
}
/* 迁移后清掉旧 key，释放 localStorage 空间 */
(function cleanupLegacyStickerKey(){
  if(lsGet('mj_sticker_migrated_v2', false)){
    try{ localStorage.removeItem('mj_sticker_store_v1'); }catch(e){}
    try{ localStorage.removeItem('mj_sticker_cats'); }catch(e){}
  }
  /* ★ 清掉旧的"全局我的个签"key，已改成每个角色专属各一份 */
  try{ localStorage.removeItem('mj_my_sign_list_v1'); }catch(e){}
})();
window.__memoDebug = function(){
  const t = document.getElementById('memoTabTemplate');
  const f = document.getElementById('memoTabFree');
  console.log('=== memo debug ===');
  console.log('memoTabTemplate 存在:', !!t);
  console.log('memoTabFree 存在:', !!f);
  if(f){
    console.log('tabF 的 onclick:', typeof f.onclick);
    console.log('tabF 的 class:', f.className);
    console.log('tabF 的位置:', f.getBoundingClientRect());
  }
  console.log('window.__memo 存在:', !!window.__memo);
  if(window.__memo){
    console.log('getCurrentMemo():', window.__memo.getCurrentMemo());
  }
};
/* ============================================================
   一次性迁移：把老用户的 g-weather 升级到 16 类
   - 用新 key mj_weather_cats_v2 做闸门，只跑一次
   - 只补不删：老分类名字不动、字卡不动，只补缺失的分类
   - 老的 cw-rain / cw-snow 大类保留，只是不再参与抽卡
   ============================================================ */
(function migrateWeatherCatsV2(){
  var _tried = 0;
  (function tagOldWeatherCards(){
    if(lsGet('mj_weather_tag_v1', false)) return;
    if(typeof cardStore === 'undefined' || !cardStore || !Array.isArray(cardStore.public)) return;
    if(!window.WeatherCats || typeof window.WeatherCats.getCats !== 'function') return;
    var dftMap = {};
    window.WeatherCats.getCats().forEach(function(c){
      (c.list || []).forEach(function(t){ dftMap[String(t).trim()] = 1; });
    });
    var g = cardStore.public.find(function(x){ return x && x.id === 'g-weather'; });
    if(!g || !Array.isArray(g.cats)){ lsSet('mj_weather_tag_v1', true); return; }
    var tagged = 0;
    g.cats.forEach(function(c){
      if(!c || !Array.isArray(c.list)) return;
      c.list.forEach(function(it){
        if(!it || typeof it !== 'object') return;
        if(it.src === 'builtin') return;
        var txt = String(it.text || it.mood || it.kaomoji || '').trim();
        if(txt && dftMap[txt]){ it.src = 'builtin'; tagged++; }
      });
    });
    if(tagged) saveCardStore();
    lsSet('mj_weather_tag_v1', true);
    console.log('[天气字卡] 已给 ' + tagged + ' 条老天气卡打上内置标记');
  })();
  function _start(){
    if(lsGet('mj_weather_cats_v2', false)) return;
    if(typeof cardStore === 'undefined' || !cardStore || !Array.isArray(cardStore.public)){
      if(++_tried < 25){ setTimeout(_start, 200); }
      return;
    }
    if(!window.WeatherCats || typeof window.WeatherCats.getCats !== 'function'){
      if(++_tried < 25){ setTimeout(_start, 200); }
      return;
    }
    _run();
  }
  function _run(){
  try{
    var FLAG = 'mj_weather_cats_v2';
    if(lsGet(FLAG, false)) return;
    if(typeof cardStore === 'undefined' || !cardStore || !Array.isArray(cardStore.public)) return;
    if(!window.WeatherCats || typeof window.WeatherCats.getCats !== 'function'){
      /* weather-cats.js 还没加载好，下次再试 */
      return;
    }

    var newCats = window.WeatherCats.getCats();
    var g = cardStore.public.find(function(x){ return x && x.id === 'g-weather'; });

    /* 分组不存在：建一个空的，交给正常初始化流程填 */
    if(!g){
      lsSet(FLAG, true);
      return;
    }

    if(!Array.isArray(g.cats)) g.cats = [];

    /* 老 9 类：字卡全部挪进「旧天气字卡」，分类本身删掉 */
    var OLD_IDS = ['cw-sunny','cw-cloudy','cw-overcast','cw-rain','cw-snow','cw-fog','cw-wind','cw-hot','cw-storm'];
    var migrated = [];

    /* ① 捞老分类里的字卡 */
    g.cats.forEach(function(c){
      if(!c || OLD_IDS.indexOf(c.id) < 0) return;
      if(!Array.isArray(c.list)) return;
      c.list.forEach(function(item){
        var t = (typeof item === 'string') ? item : ((item && (item.text || item.mood || item.kaomoji)) || '');
        t = String(t || '').trim();
        if(t) migrated.push({ text: t, t: Date.now() });
      });
    });

    /* ② 删老分类 */
    var removedNames = [];
    g.cats = g.cats.filter(function(c){
      if(!c || OLD_IDS.indexOf(c.id) < 0) return true;
      removedNames.push(c.name);
      return false;
    });

    /* ③ 补新的 16 类 */
    var added = 0, filled = 0;
    newCats.forEach(function(c){
      var exist = g.cats.find(function(x){ return x && x.id === c.id; });
      if(exist){
        if(!Array.isArray(exist.list)) exist.list = [];
        if(!exist.list.length && !c.legacy && useBuiltinCards()){
          exist.list = c.list.map(function(t){ return { text: t, t: Date.now(), src:'builtin' }; });
          filled++;
        }
        return;
      }
      g.cats.push({
        id: c.id,
        name: c.name,
        list: c.legacy ? [] : c.list.map(function(t){ return { text: t, t: Date.now() }; })
      });
      added++;
    });

    /* ③.5 删掉 cw-rain 空壳（不参与抽卡，留着只会让用户困惑）
       老数据里可能没有 legacy 字段，所以只按 id 判，不看 legacy */
    g.cats = g.cats.filter(function(c){
      return !(c && c.id === 'cw-rain');
    });

    /* ④ 老字卡塞进「旧天气字卡」，并强制挪到最后
       - 只要 cw-migrated 存在，就无条件摘出来再 push 到最后
         （不管这次有没有字卡要搬，位置每次都对齐）
       - 有字卡要搬，再往里塞（去重） */
    var mig = g.cats.find(function(c){ return c && c.id === 'cw-migrated'; });
    if(mig){
      g.cats = g.cats.filter(function(c){ return c && c.id !== 'cw-migrated'; });
    } else {
      mig = { id:'cw-migrated', name:'旧天气字卡', list:[] };
    }
    if(migrated.length){
      var existPool = {};
      mig.list.forEach(function(it){
        var t = (typeof it === 'string') ? it : ((it && it.text) || '');
        if(t) existPool[String(t).trim()] = 1;
      });
      migrated.forEach(function(it){
        if(existPool[it.text]) return;
        existPool[it.text] = 1;
        mig.list.push(it);
      });
    }
    g.cats.push(mig);

    if(added || filled || migrated.length){
      if(typeof saveCardStore === 'function') saveCardStore();
      console.log('[天气字卡迁移] 新增 ' + added + ' 类，补默认 ' + filled + ' 类，旧字卡 ' +
        migrated.length + ' 条（从 ' + removedNames.join(' / ') + ' 搬到「旧天气字卡」）');
    }
    lsSet(FLAG, true);
  }catch(e){
    console.error('[天气字卡迁移] 出错', e);
  }
  }   /* ← _run 结束 */
  _start();
})();
 