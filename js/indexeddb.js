/* ============================================================
   IndexedDB 底座
   用途：把大文件（音频、图片、头像、背景）从 localStorage 挪到这里，
         localStorage 从此只留文字配置。
   说明：
     - 只提供工具函数，不改任何现有功能
     - 存的是 Blob（不转 base64，省 33%）
     - 读出来会自动生成一个临时 URL 供 <img>/<audio> 用
   ============================================================ */
(function(){
  if(window.__idbReady) return;
  window.__idbReady = true;

  var DB_NAME = 'mj_big_files';
  var DB_VERSION = 1;
  var STORE = 'files';

  var _db = null;
  var _dbPromise = null;

  /* 打开（或首次创建）数据库 */
  function openDB(){
    if(_db) return Promise.resolve(_db);
    if(_dbPromise) return _dbPromise;

    _dbPromise = new Promise(function(resolve, reject){
      var req;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch(e){
        reject(e);
        return;
      }
      req.onupgradeneeded = function(ev){
        var db = ev.target.result;
        if(!db.objectStoreNames.contains(STORE)){
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = function(ev){
        _db = ev.target.result;
        _db.onclose = function(){ _db = null; _dbPromise = null; };
        resolve(_db);
      };
      req.onerror = function(ev){
        reject(ev.target.error || new Error('indexedDB open failed'));
      };
    });
    return _dbPromise;
  }

  /* 通用：拿 store（读写模式） */
  function tx(mode, fn){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var result;
        try {
          result = fn(store);
        } catch(e){
          reject(e);
          return;
        }
        t.oncomplete = function(){ resolve(result && result.__req ? result.__req.result : result); };
        t.onerror = function(ev){ reject(ev.target.error || new Error('tx failed')); };
        t.onabort = function(ev){ reject(ev.target.error || new Error('tx aborted')); };
      });
    });
  }

  /* 存：key + Blob（或任意可结构化克隆的东西） */
  function idbSet(key, value){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var t = db.transaction(STORE, 'readwrite');
        var store = t.objectStore(STORE);
        var req = store.put(value, key);
        req.onsuccess = function(){ resolve(true); };
        req.onerror = function(ev){ reject(ev.target.error); };
      });
    });
  }

  /* 读：拿回 Blob */
  function idbGet(key){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var t = db.transaction(STORE, 'readonly');
        var store = t.objectStore(STORE);
        var req = store.get(key);
        req.onsuccess = function(ev){
          resolve(ev.target.result === undefined ? null : ev.target.result);
        };
        req.onerror = function(ev){ reject(ev.target.error); };
      });
    });
  }

  /* 删 */
  function idbDel(key){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var t = db.transaction(STORE, 'readwrite');
        var store = t.objectStore(STORE);
        var req = store.delete(key);
        req.onsuccess = function(){ resolve(true); };
        req.onerror = function(ev){ reject(ev.target.error); };
      });
    });
  }

  /* 清空整个库 */
  function idbClear(){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var t = db.transaction(STORE, 'readwrite');
        var store = t.objectStore(STORE);
        var req = store.clear();
        req.onsuccess = function(){ resolve(true); };
        req.onerror = function(ev){ reject(ev.target.error); };
      });
    });
  }

  /* 列所有 key（排查用） */
  function idbKeys(){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var t = db.transaction(STORE, 'readonly');
        var store = t.objectStore(STORE);
        var req = store.getAllKeys();
        req.onsuccess = function(ev){ resolve(Array.from(ev.target.result || [])); };
        req.onerror = function(ev){ reject(ev.target.error); };
      });
    });
  }

  /* Blob → 可显示的 URL（缓存住，避免重复生成） */
  var _urlCache = {};
  function idbToURL(key){
    if(_urlCache[key]) return Promise.resolve(_urlCache[key]);
    return idbGet(key).then(function(blob){
      if(!blob) return null;
      var url = URL.createObjectURL(blob);
      _urlCache[key] = url;
      return url;
    });
  }
  function idbRevokeURL(key){
    if(_urlCache[key]){
      try { URL.revokeObjectURL(_urlCache[key]); } catch(e){}
      delete _urlCache[key];
    }
  }

  /* 存 base64 dataURL → 转 Blob 存起来，省空间 */
  function dataURLToBlob(dataURL){
    var parts = String(dataURL || '').split(',');
    if(parts.length < 2) return null;
    var mimeMatch = parts[0].match(/:(.*?);/);
    var mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    var bin = atob(parts[1]);
    var len = bin.length;
    var arr = new Uint8Array(len);
    for(var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], {type: mime});
  }

  /* 挂到 window，全局可用 */
  window.__idb = {
    set: idbSet,
    get: idbGet,
    del: idbDel,
    clear: idbClear,
    keys: idbKeys,
    toURL: idbToURL,
    revokeURL: idbRevokeURL,
    dataURLToBlob: dataURLToBlob
  };
})();
