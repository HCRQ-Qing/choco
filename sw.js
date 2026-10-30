/* ============================================================
   Service Worker（sw.js）
   ------------------------------------------------------------
   app.js 会 register('./sw.js')，并通过 postMessage 塞进来
   「接下来几小时内该弹的通知」：

     page → SW : { type:'schedule-batch', items:[{at,title,body,tag,roleId}] }
     SW   → page: { type:'MOCHI_NOTIFY_CLICK', tag }
     SW   → IDB : key 'xy-home-v2:__notify-click'  { tag, ts }

   说明：
   - SW 空闲约 30 秒会被浏览器回收，setTimeout 随之丢失；
     所以每个事件进来都先从 IndexedDB 读回排期再重新 arm 一次。
   - 支持 periodicSync（Chromium 系已安装 PWA）时顺便重排。
   ============================================================ */

const DB_NAME = 'mj_big_files';
const STORE = 'files';
const SCHED_KEY = 'sw_ka_schedule_v1';
const CLICK_KEY = 'xy-home-v2:__notify-click';
const MAX_ITEMS = 300;

/* ---------- IndexedDB 小工具 ---------- */
function openDb(){
  return new Promise(function(resolve, reject){
    let req;
    try{
      req = indexedDB.open(DB_NAME, 1);
    }catch(e){ reject(e); return; }
    req.onupgradeneeded = function(e){
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = function(e){ resolve(e.target.result); };
    req.onerror = function(e){ reject(e.target.error); };
  });
}

function dbPut(key, val){
  return openDb().then(function(db){
    return new Promise(function(resolve, reject){
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(val, key);
      t.oncomplete = function(){ resolve(true); };
      t.onerror = function(e){ reject(e.target.error); };
    });
  });
}

function dbGet(key){
  return openDb().then(function(db){
    return new Promise(function(resolve, reject){
      const t = db.transaction(STORE, 'readonly');
      const r = t.objectStore(STORE).get(key);
      r.onsuccess = function(){ resolve(r.result === undefined ? null : r.result); };
      r.onerror = function(e){ reject(e.target.error); };
    });
  });
}

/* ---------- 排期缓存 ---------- */
let items = [];           /* [{at,title,body,tag,roleId}] */
let timerIds = [];
let loaded = false;

function loadSchedule(){
  if(loaded) return Promise.resolve(items);
  return dbGet(SCHED_KEY).then(function(v){
    items = Array.isArray(v) ? v : [];
    loaded = true;
    return items;
  }).catch(function(){ loaded = true; return items; });
}

function saveSchedule(){
  return dbPut(SCHED_KEY, items).catch(function(){});
}

function clearTimers(){
  timerIds.forEach(function(id){ clearTimeout(id); });
  timerIds = [];
}

/* 把还没到点的条目全部挂成 setTimeout */
function arm(){
  clearTimers();
  const now = Date.now();
  items = items.filter(function(it){
    return it && it.at && it.at > now - 5 * 60 * 1000;   /* 超过 5 分钟的过期条目直接丢 */
  }).slice(-MAX_ITEMS);

  items.forEach(function(it){
    const delay = Math.max(0, it.at - Date.now());
    if(delay > 24 * 3600 * 1000) return;
    const id = setTimeout(function(){ fire(it); }, delay);
    timerIds.push(id);
  });
  return saveSchedule();
}

function fire(item){
  if(!item) return;
  /* 到点后从排期里删掉 */
  items = items.filter(function(x){ return x.tag !== item.tag; });
  saveSchedule();
  if(typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if(!self.registration || !self.registration.showNotification) return;

  const opts = {
    body: String(item.body || '').slice(0, 80),
    tag: String(item.tag || ''),
    renotify: false,
    silent: false,
    data: { tag: String(item.tag || ''), roleId: item.roleId || '', at: item.at || 0 }
  };
  try{
    self.registration.showNotification(item.title || '角色', opts);
  }catch(e){}
}

/* 合并新排期：按 tag 去重，同 tag 以新时间为准 */
function mergeBatch(batch){
  if(!Array.isArray(batch) || !batch.length) return arm();
  const map = new Map();
  items.forEach(function(it){ if(it && it.tag) map.set(it.tag, it); });
  batch.forEach(function(it){
    if(!it || !it.at || !it.tag) return;
    map.set(it.tag, {
      at: Number(it.at),
      title: it.title || '',
      body: it.body || '',
      tag: String(it.tag),
      roleId: it.roleId || ''
    });
  });
  items = Array.from(map.values());
  return arm();
}

/* ---------- 生命周期 ---------- */
self.addEventListener('install', function(){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(self.clients.claim());
  /* 激活后立即重排一次 */
  e.waitUntil(loadSchedule().then(function(){
    arm();
  }).catch(function(){}));
});

self.addEventListener('message', function(e){
  const d = e.data || {};
  if(d.type === 'schedule-batch'){
    e.waitUntil(loadSchedule().then(function(){ return mergeBatch(d.items); }).catch(function(){}));
  }else if(d.type === 'schedule-clear'){
    items = [];
    clearTimers();
    e.waitUntil(saveSchedule());
  }else if(d.type === 'ka-rearm'){
    e.waitUntil(loadSchedule().then(function(){ return arm(); }).catch(function(){}));
  }
});

/* Chromium 已安装 PWA：定期唤醒时重排 + 补发刚过期不久的通知 */
self.addEventListener('periodicsync', function(e){
  if(e.tag !== 'ka-rearm') return;
  e.waitUntil(loadSchedule().then(function(){
    const now = Date.now();
    /* 过期 5 分钟内、还没发过的补发一次 */
    items.slice().forEach(function(it){
      if(it.at <= now && now - it.at <= 5 * 60 * 1000) fire(it);
    });
    return arm();
  }).catch(function(){}));
});

/* ---------- 通知点击 ---------- */
self.addEventListener('notificationclick', function(e){
  const notif = e.notification || {};
  const data = notif.data || {};
  const tag = String(data.tag || notif.tag || '');
  notif.close();

  e.waitUntil((async function(){
    /* 1) 写一条点击回执，页面启动时读到会自己跳转 */
    try{
      await dbPut(CLICK_KEY, { tag: tag, ts: Date.now() });
    }catch(err){}

    /* 2) 有页面就 postMessage + 聚焦 */
    try{
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      let focused = false;
      for(const c of list){
        try{ c.postMessage({ type: 'MOCHI_NOTIFY_CLICK', tag: tag }); }catch(err){}
        if(!focused && 'focus' in c){
          try{ await c.focus(); focused = true; }catch(err){}
        }
      }
      if(!list.length && self.clients.openWindow){
        /* 3) 没有页面就开一个 */
        await self.clients.openWindow('./');
      }
    }catch(err){}
  })());
});

self.addEventListener('notificationclose', function(){
  /* 用户划掉通知：什么都不做，交给页面侧逻辑 */
});
