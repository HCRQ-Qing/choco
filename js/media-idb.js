(function(){
  if(window.MediaIdb) return;
  var DB_NAME = 'mj_media_idb_v1';
  var DB_VER = 1;
  var STORE = 'media';
  var _db = null;
  var _dbPromise = null;

  function openDB(){
    if(_db) return Promise.resolve(_db);
    if(_dbPromise) return _dbPromise;
    _dbPromise = new Promise(function(resolve, reject){
      try{
        var req = indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = function(e){
          var db = e.target.result;
          if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = function(e){ _db = e.target.result; resolve(_db); };
        req.onerror = function(e){ _dbPromise = null; reject(e.target.error || new Error('idb-open-fail')); };
      }catch(err){ _dbPromise = null; reject(err); }
    });
    return _dbPromise;
  }

  function idbSet(key, blob){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(STORE, 'readwrite');
        var req = tx.objectStore(STORE).put(blob, key);
        req.onsuccess = function(){ resolve(key); };
        req.onerror = function(e){ reject(e.target.error || new Error('idb-set-fail')); };
      });
    });
  }

  function idbGet(key){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).get(key);
        req.onsuccess = function(e){ resolve(e.target.result || null); };
        req.onerror = function(e){ reject(e.target.error || new Error('idb-get-fail')); };
      });
    });
  }

  function idbDel(key){
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(STORE, 'readwrite');
        var req = tx.objectStore(STORE).delete(key);
        req.onsuccess = function(){ resolve(true); };
        req.onerror = function(e){ reject(e.target.error || new Error('idb-del-fail')); };
      });
    });
  }

  var _urlCache = {};
  function idbToURL(key){
    if(!key) return Promise.resolve('');
    if(_urlCache[key]) return Promise.resolve(_urlCache[key]);
    return idbGet(key).then(function(blob){
      if(!blob) return '';
      try{ var url = URL.createObjectURL(blob); _urlCache[key] = url; return url; }
      catch(e){ return ''; }
    }).catch(function(){ return ''; });
  }

  function dataURLToBlob(dataUrl){
    try{
      var parts = String(dataUrl).split(',');
      var mm = (parts[0] || '').match(/:(.*?);/);
      var mime = mm ? mm[1] : 'image/png';
      var bin = atob(parts[1] || '');
      var len = bin.length;
      var arr = new Uint8Array(len);
      for(var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }catch(e){ return null; }
  }

  function isDataURL(v){ return typeof v === 'string' && v.indexOf('data:') === 0; }
  function isIdbKey(v){ return typeof v === 'string' && v.indexOf('idb:') === 0; }
  function keyOf(v){ return isIdbKey(v) ? v.slice(4) : ''; }
  function genKey(prefix){ return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }

  function convertDataURLToIdb(dataUrl, prefix){
    if(!isDataURL(dataUrl)) return Promise.resolve(dataUrl || '');
    var blob = dataURLToBlob(dataUrl);
    if(!blob) return Promise.resolve('');
    var key = genKey(prefix);
    return idbSet(key, blob).then(function(){ return 'idb:' + key; }).catch(function(){ return dataUrl; });
  }
  
  var rpCover = {
    get: function(value){
      if(!value) return Promise.resolve('');
      if(isIdbKey(value)) return idbToURL(keyOf(value));
      return Promise.resolve(value);
    },
    set: function(dataUrl){
      if(!dataUrl) return Promise.resolve('');
      if(isIdbKey(dataUrl)) return Promise.resolve(dataUrl);
      return convertDataURLToIdb(dataUrl, 'rpcover');
    },
    del: function(value){
      if(!isIdbKey(value)) return Promise.resolve(true);
      return idbDel(keyOf(value)).catch(function(){ return false; });
    }
  };

  var GROUP_ICON_KEY = 'mj_group_icons_v1';
  var groupIcon = {
    getMapRaw: function(){
      try{
        var raw = localStorage.getItem(GROUP_ICON_KEY);
        if(!raw) return {};
        var m = JSON.parse(raw);
        if(!m || typeof m !== 'object') return {};
        return m;
      }catch(e){ return {}; }
    },
    saveMapRaw: function(m){
      try{ localStorage.setItem(GROUP_ICON_KEY, JSON.stringify(m || {})); }catch(e){}
    },
    get: function(gid, map){
      if(!gid) return Promise.resolve('');
      var m = map || groupIcon.getMapRaw();
      var v = m[gid];
      if(!v) return Promise.resolve('');
      if(isIdbKey(v)) return idbToURL(keyOf(v));
      return Promise.resolve(v);
    },
    set: function(gid, dataUrl){
      if(!gid || !dataUrl) return Promise.resolve('');
      if(isIdbKey(dataUrl)){
        var m0 = groupIcon.getMapRaw();
        m0[gid] = dataUrl;
        groupIcon.saveMapRaw(m0);
        return Promise.resolve(dataUrl);
      }
      return convertDataURLToIdb(dataUrl, 'gicon').then(function(newVal){
        var m = groupIcon.getMapRaw();
        var oldVal = m[gid];
        m[gid] = newVal;
        groupIcon.saveMapRaw(m);
        if(isIdbKey(oldVal)) idbDel(keyOf(oldVal)).catch(function(){});
        return newVal;
      });
    },
    del: function(gid){
      if(!gid) return Promise.resolve(true);
      var m = groupIcon.getMapRaw();
      var oldVal = m[gid];
      delete m[gid];
      groupIcon.saveMapRaw(m);
      if(isIdbKey(oldVal)) return idbDel(keyOf(oldVal)).catch(function(){ return true; });
      return Promise.resolve(true);
    },
    migrateAll: function(){
      var m = groupIcon.getMapRaw();
      var keys = Object.keys(m);
      if(!keys.length) return Promise.resolve(0);
      var tasks = [];
      var moved = 0;
      keys.forEach(function(gid){
        var v = m[gid];
        if(isDataURL(v)){
          tasks.push(convertDataURLToIdb(v, 'gicon').then(function(newVal){
            if(isIdbKey(newVal)){ m[gid] = newVal; moved++; }
          }));
        }
      });
      if(!tasks.length) return Promise.resolve(0);
      return Promise.all(tasks).then(function(){
        groupIcon.saveMapRaw(m);
        return moved;
      });
    }
  };

  var STICKER_KEY = 'mj_sticker_store_v2';
  var sticker = {
    getStoreRaw: function(){
      try{
        var raw = localStorage.getItem(STICKER_KEY);
        if(!raw) return null;
        var s = JSON.parse(raw);
        if(!s || typeof s !== 'object') return null;
        return s;
      }catch(e){ return null; }
    },
    saveStoreRaw: function(s){
      try{ localStorage.setItem(STICKER_KEY, JSON.stringify(s || {})); }catch(e){}
    },
    migrateAll: function(){
      var s = sticker.getStoreRaw();
      if(!s) return Promise.resolve(0);
      var tasks = [];
      var moved = 0;
      Object.keys(s).forEach(function(bucketKey){
        var bucket = s[bucketKey];
        if(!bucket || !Array.isArray(bucket.cats)) return;
        bucket.cats.forEach(function(cat){
          if(!cat || !Array.isArray(cat.list)) return;
          for(var i = 0; i < cat.list.length; i++){
            if(isDataURL(cat.list[i])){
              (function(catRef, idx){
                tasks.push(convertDataURLToIdb(catRef.list[idx], 'sticker').then(function(newVal){
                  if(isIdbKey(newVal)){ catRef.list[idx] = newVal; moved++; }
                }));
              })(cat, i);
            }
          }
        });
      });
      if(!tasks.length) return Promise.resolve(0);
      return Promise.all(tasks).then(function(){
        sticker.saveStoreRaw(s);
        return moved;
      });
    }
  };

  function migrateRpCovers(){
    try{
      var raw = localStorage.getItem('mj_friends');
      if(!raw) return Promise.resolve(0);
      var friends = JSON.parse(raw);
      if(!Array.isArray(friends)) return Promise.resolve(0);
      
      var needMigrate = friends.some(function(f){ return f && isDataURL(f.rpCover); });
      if(!needMigrate) return Promise.resolve(0);

      var backupFriends = JSON.parse(raw);
      friends.forEach(function(f){
        if(f && isDataURL(f.rpCover)){ f.rpCover = ''; }
      });
      try{ localStorage.setItem('mj_friends', JSON.stringify(friends)); }catch(e){}

      var tasks = [];
      var moved = 0;
      var changed = false;
      backupFriends.forEach(function(bf){
        if(!bf || !isDataURL(bf.rpCover)) return;
        (function(roleRef, bRoleRef){
          tasks.push(convertDataURLToIdb(bRoleRef.rpCover, 'rpcover').then(function(newVal){
            if(isIdbKey(newVal)){ 
              roleRef.rpCover = newVal; 
              moved++; changed = true; 
            }
          }));
        })(friends.find(function(x){ return x.id === bf.id; }), bf);
      });

      if(!tasks.length) return Promise.resolve(0);
      return Promise.all(tasks).then(function(){
        if(changed){
          try{ localStorage.setItem('mj_friends', JSON.stringify(friends)); }catch(e){}
        }
        return moved;
      });
    }catch(e){ return Promise.resolve(0); }
  }
  
  var MIGRATE_FLAG = 'mj_media_idb_migrated_v1';
  function migrateOnce(){
    try{
      if(localStorage.getItem(MIGRATE_FLAG) === '1') return Promise.resolve();
    }catch(e){}
    var tasks = [];
    try{ tasks.push(migrateRpCovers()); }catch(e){}
    try{ tasks.push(groupIcon.migrateAll()); }catch(e){}
    try{ tasks.push(sticker.migrateAll()); }catch(e){}
    return Promise.all(tasks).then(function(){
      try{ localStorage.setItem(MIGRATE_FLAG, '1'); }catch(e){}
    }).catch(function(e){
      console.warn('[MediaIdb] 迁移失败，下次再试', e);
    });
  }

  window.MediaIdb = {
    rpCover: rpCover,
    groupIcon: groupIcon,
    sticker: sticker,
    toURL: idbToURL,
    isDataURL: isDataURL,
    isIdbKey: isIdbKey,
    migrateOnce: migrateOnce
  };

  try{
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){
        setTimeout(function(){ try{ migrateOnce(); }catch(e){} }, 1500);
      });
    }else{
      setTimeout(function(){ try{ migrateOnce(); }catch(e){} }, 1500);
    }
  }catch(e){}
})();