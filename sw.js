/* ============================================================
   Service Worker（sw.js）
   ------------------------------------------------------------
   两件事：
   ① 离线可用：把 index.html / css / js 全部预缓存，断网也能打开
   ② 后台通知：页面切后台时把未来几小时该弹的通知塞进来，到点由
      SW 弹系统通知（页面被冻结也还有机会弹出来）

   页面 ↔ SW 约定：
     page → SW : { type:'schedule-batch', items:[{at,title,body,tag,roleId}] }
     SW   → page: { type:'MOCHI_NOTIFY_CLICK', tag }
     SW   → IDB : key 'xy-home-v2:__notify-click'  { tag, ts }

   注意：SW 空闲约 30 秒会被回收，setTimeout 随之丢失；
   所以每个事件进来都先从 IndexedDB 读回排期再重新 arm 一次。
   ============================================================ */

const CACHE_NAME = 'choco-v3';          /* ★ 改了 css/js 就把它 +1，用户下次刷新即更新 */
const DB_NAME = 'mj_big_files';
const STORE = 'files';
const SCHED_KEY = 'sw_ka_schedule_v1';
const CLICK_KEY = 'xy-home-v2:__notify-click';
const MAX_ITEMS = 300;

/* ★ 离线预缓存清单（新增文件记得加进来） */
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/calendar.css',
  './css/chat.css',
  './css/me.css',
  './css/friends.css',
  './css/card.css',
  './css/divine.css',
  './css/role.css',
  './css/chat-info.css',
  './css/search.css',
  './css/beauty.css',
  './css/relationship.css',
  './css/settings.css',
  './css/moments.css',
  './css/memo.css',
  './css/favorites.css',
  './css/extra.css',
  './css/groupchat.css',
  './css/media.css',
  './js/boot.js',
  './js/version.js',
  './js/indexeddb.js',
  './js/chat-image.js',
  './js/bubble-alias.js',
  './js/app.js',
  './js/keepalive.js',
  './js/backup.js',
  './js/video-pool.js',
  './js/calendar.js',
  './js/festival.js'
  /* ★ 不再预缓存 fonts/LikeJian.ttf（6MB）：这个字体现在没有任何元素使用，
     放进预缓存只会让首次加载白等 6MB。真要用了会由下面的「静态资源按需缓存」兜住。 */
];

/* ---------- 离线缓存 ---------- */
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      /* 逐个 add，任何一个失败都不影响整体安装 */
      return Promise.all(PRECACHE.map(function(url){
        return cache.add(url).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); }).then(function(){
      /* 激活后立即重排一次通知 */
      return loadSchedule().then(function(){ arm(); }).catch(function(){});
    })
  );
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(!req || req.method !== 'GET') return;

  const url = new URL(req.url);
  /* 跨域（字体 CDN 等）不拦，直接走网络 */
  if(url.origin !== self.location.origin) return;

  /* 页面导航：先网络，断网才用缓存 */
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function(c){ c.put('./index.html', copy); });
        }
        return res;
      }).catch(function(){
        return caches.match('./index.html').then(function(r){
          return r || caches.match('./');
        });
      })
    );
    return;
  }

  /* 静态资源：先用缓存（秒开），后台顺手更新 */
  e.respondWith(
    caches.match(req).then(function(cached){
      const network = fetch(req).then(function(res){
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});

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

/* ---------- 通知排期缓存 ---------- */
let items = [];
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

/* ---------- 消息 / 生命周期 ---------- */
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
