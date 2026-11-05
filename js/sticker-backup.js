(function(){
  'use strict';
  if(window.__stickerBackupReady) return;
  window.__stickerBackupReady = true;

  var LS_KEY = 'mj_sticker_store_v2';
  var IDB_PREFIX = 'sticker_';
  var IDB_INDEX_KEY = 'mj_sticker_idb_index_v1';

  function lsGet(k, d){
    try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; }
  }
  function lsSet(k, v){
    try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; }
  }

  function getIndex(){
    var m = lsGet(IDB_INDEX_KEY, null);
    if(!m || typeof m !== 'object') m = {};
    return m;
  }
  function saveIndex(m){ lsSet(IDB_INDEX_KEY, m); }

  function toBlob(dataUrl){
    if(window.__idb && window.__idb.dataURLToBlob) return window.__idb.dataURLToBlob(dataUrl);
    try{
      var p = String(dataUrl || '').split(',');
      var mime = (p[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
      var bin = atob(p[1] || '');
      var arr = new Uint8Array(bin.length);
      for(var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }catch(e){ return null; }
  }

  function loadStore(){
    var s = lsGet(LS_KEY, null);
    if(!s || typeof s !== 'object') s = {};
    return s;
  }
  function saveStore(s){
    return lsSet(LS_KEY, s);
  }

  function getBucket(key){
    var store = loadStore();
    if(!store[key] || !Array.isArray(store[key].cats) || !store[key].cats.length){
      store[key] = { cats: [{ name: '默认', list: [] }] };
      saveStore(store);
    }
    return store[key].cats;
  }
  function setBucket(key, cats){
    var store = loadStore();
    store[key] = { cats: Array.isArray(cats) ? cats : [] };
    return saveStore(store);
  }

  function putStickerToIdb(dataUrl){
    if(!window.__idb || !window.__idb.set) return Promise.resolve('');
    var blob = toBlob(dataUrl);
    if(!blob) return Promise.resolve('');
    var key = IDB_PREFIX + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    return window.__idb.set(key, blob).then(function(){
      var idx = getIndex();
      idx[key] = Date.now();
      saveIndex(idx);
      return key;
    }).catch(function(){ return ''; });
  }

  function resolveSticker(src){
    if(!src) return Promise.resolve('');
    if(src.indexOf('idb:') === 0){
      var k = src.slice(4);
      if(window.__idb && window.__idb.toURL) return window.__idb.toURL(k).catch(function(){ return ''; });
      return Promise.resolve('');
    }
    if(src.indexOf(IDB_PREFIX) === 0){
      if(window.__idb && window.__idb.toURL) return window.__idb.toURL(src).catch(function(){ return ''; });
      return Promise.resolve('');
    }
    return Promise.resolve(src);
  }

  function importStickerFile(file, cb){
    var fr = new FileReader();
    fr.onload = function(ev){
      var src = ev.target && ev.target.result;
      if(!src){ cb(''); return; }
      if(file && file.type === 'image/gif'){ cb(src); return; }
      var img = new Image();
      img.onload = function(){
        try{
          var MAX = 240;
          var w = img.naturalWidth || img.width || MAX;
          var h = img.naturalHeight || img.height || MAX;
          if(w > MAX || h > MAX){
            var k = Math.min(MAX / w, MAX / h);
            w = Math.max(1, Math.round(w * k));
            h = Math.max(1, Math.round(h * k));
          }
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          var out = cv.toDataURL('image/jpeg', 0.72);
          cb(out && out.length < src.length ? out : src);
        }catch(e){ cb(src); }
      };
      img.onerror = function(){ cb(src); };
      img.src = src;
    };
    fr.onerror = function(){ cb(''); };
    fr.readAsDataURL(file);
  }

  function exportStickers(bucketKeys){
    var store = loadStore();
    var keys = Array.isArray(bucketKeys) && bucketKeys.length ? bucketKeys : Object.keys(store);
    var out = { __type: 'choco-sticker', __version: 1, exportedAt: Date.now(), buckets: {} };
    var pending = 0;
    var done = false;
    function flush(){
      if(done) return;
      done = true;
      var json = JSON.stringify(out);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var d = new Date();
      function p(n){ return String(n).padStart(2, '0'); }
      a.download = 'choco-sticker-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
      a.href = url;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        URL.revokeObjectURL(url);
        if(a.parentNode) a.parentNode.removeChild(a);
      }, 1500);
      return json.length;
    }
    keys.forEach(function(k){
      var bucket = store[k];
      if(!bucket || !Array.isArray(bucket.cats)) return;
      pending++;
      var cats = bucket.cats;
      var newCats = [];
      var i = 0;
      function nextCat(){
        if(i >= cats.length){
          out.buckets[k] = { cats: newCats };
          pending--;
          if(pending <= 0) flush();
          return;
        }
        var c = cats[i++];
        var cat = { name: c.name, list: [] };
        var j = 0;
        function nextItem(){
          if(j >= (c.list || []).length){
            newCats.push(cat);
            nextCat();
            return;
          }
          var src = c.list[j++];
          resolveSticker(src).then(function(url){
            if(url){ cat.list.push(url); }
            else if(src && src.indexOf('idb:') !== 0 && src.indexOf(IDB_PREFIX) !== 0){ cat.list.push(src); }
            nextItem();
          }).catch(function(){ nextItem(); });
        }
        nextItem();
      }
      nextCat();
    });
    if(pending === 0) flush();
  }

  function importStickersFromJson(json){
    var data = null;
    try{ data = (typeof json === 'string') ? JSON.parse(json) : json; }catch(e){ return Promise.reject(e); }
    if(!data || data.__type !== 'choco-sticker') return Promise.reject(new Error('不是表情包文件'));
    var buckets = data.buckets || {};
    var store = loadStore();
    var tasks = [];
    Object.keys(buckets).forEach(function(bkey){
      var incoming = buckets[bkey];
      if(!incoming || !Array.isArray(incoming.cats)) return;
      if(!store[bkey] || !Array.isArray(store[bkey].cats) || !store[bkey].cats.length){
        store[bkey] = { cats: [] };
      }
      var dst = store[bkey].cats;
      incoming.cats.forEach(function(ic){
        if(!ic || !Array.isArray(ic.list)) return;
        var tcat = dst.find(function(x){ return x.name === ic.name; });
        if(!tcat){ tcat = { name: ic.name || '默认', list: [] }; dst.push(tcat); }
        ic.list.forEach(function(src){
          if(!src) return;
          tasks.push(putStickerToIdb(src).then(function(idbKey){
            if(idbKey){ tcat.list.push(idbKey); }
            else { tcat.list.push(src); }
          }).catch(function(){}));
        });
      });
    });
    return Promise.all(tasks).then(function(){
      saveStore(store);
      return true;
    });
  }

  function makeExportPayload(){
    var store = loadStore();
    return { __type: 'choco-sticker', __version: 1, exportedAt: Date.now(), buckets: store };
  }

  function replaceStickersFromPayload(payload){
    if(!payload || payload.__type !== 'choco-sticker') return false;
    return saveStore(payload.buckets || {});
  }

  function listIdbStickerKeys(){
    var idx = getIndex();
    return Object.keys(idx);
  }
  function clearIdbStickers(){
    var keys = listIdbStickerKeys();
    if(!window.__idb || !window.__idb.del) return Promise.resolve(0);
    return Promise.all(keys.map(function(k){
      return window.__idb.del(k).catch(function(){});
    })).then(function(){ saveIndex({}); return keys.length; });
  }

  window.__stickerBackup = {
    LS_KEY: LS_KEY,
    IDB_PREFIX: IDB_PREFIX,
    getBucket: getBucket,
    setBucket: setBucket,
    resolveSticker: resolveSticker,
    importStickerFile: importStickerFile,
    putStickerToIdb: putStickerToIdb,
    exportStickers: exportStickers,
    importStickersFromJson: importStickersFromJson,
    makeExportPayload: makeExportPayload,
    replaceStickersFromPayload: replaceStickersFromPayload,
    listIdbStickerKeys: listIdbStickerKeys,
    clearIdbStickers: clearIdbStickers
  };
})();
