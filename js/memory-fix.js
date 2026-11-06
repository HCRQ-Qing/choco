/* memory-fix.js */
(function(){
  'use strict';
  if(window.__memoryFixReady) return;
  window.__memoryFixReady = true;

  var STORE_HELPERS = window.__memoryFix = window.__memoryFix || {};
  var _warnOnce = {};
  function warnOnce(key, msg){
    var now = Date.now();
    if(_warnOnce[key] && now - _warnOnce[key] < 8000) return;
    _warnOnce[key] = now;
    try{ if(typeof window.toast === 'function') window.toast(msg); }catch(e){}
  }

  (function guardLocalStorage(){
    var origSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v){
      try{
        origSet.call(this, k, v);
      }catch(e){
        warnOnce('ls_' + k, '存储已满，' + k + ' 没存上');
        try{
          if(window.MJ_LOGGER && typeof window.MJ_LOGGER.log === 'function'){
            window.MJ_LOGGER.log('Storage', 'localStorage 写入失败', 'Key: ' + k + ' | ' + (e && e.message ? e.message : String(e)));
          }
        }catch(err){}
      }
    };
  })();

  function idbSetSafe(key, blob, label){
    if(!window.__idb || typeof window.__idb.set !== 'function'){
      return Promise.reject(new Error('IndexedDB 未就绪'));
    }
    return window.__idb.set(key, blob).catch(function(e){
      warnOnce('idb_' + key, '本地空间不够，' + (label || '数据') + ' 没存上');
      try{
        if(window.MJ_LOGGER && typeof window.MJ_LOGGER.log === 'function'){
          window.MJ_LOGGER.log('Storage', 'IndexedDB 写入失败', 'Key: ' + key + ' | ' + (e && e.message ? e.message : String(e)));
        }
      }catch(err){}
      throw e;
    });
  }
  STORE_HELPERS.idbSetSafe = idbSetSafe;

  function bytesOf(str){
    try{ return new Blob([String(str || '')]).size; }catch(e){ return String(str || '').length * 2; }
  }
  function fmtBytes(n){
    if(!n || n < 0) return '0 B';
    if(n < 1024) return n + ' B';
    if(n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }
  STORE_HELPERS.fmtBytes = fmtBytes;

  function scanLocalStorage(){
    var rows = [];
    var total = 0;
    try{
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(!k) continue;
        var v = '';
        try{ v = localStorage.getItem(k) || ''; }catch(e){}
        var sz = bytesOf(v);
        total += sz;
        rows.push({ key: k, size: sz, sizeText: fmtBytes(sz) });
      }
    }catch(e){}
    rows.sort(function(a, b){ return b.size - a.size; });
    return { total: total, totalText: fmtBytes(total), rows: rows };
  }
  STORE_HELPERS.scanLocalStorage = scanLocalStorage;

  function scanIdbEstimate(cb){
    try{
      if(navigator.storage && navigator.storage.estimate){
        navigator.storage.estimate().then(function(est){
          cb({
            usage: est.usage || 0,
            quota: est.quota || 0,
            usageText: fmtBytes(est.usage || 0),
            quotaText: fmtBytes(est.quota || 0),
            percent: est.quota ? Math.round((est.usage / est.quota) * 100) : 0
          });
        }).catch(function(){ cb(null); });
      } else {
        cb(null);
      }
    }catch(e){ cb(null); }
  }
  STORE_HELPERS.scanIdbEstimate = scanIdbEstimate;

  function checkSpaceBefore(fileSize, cb){
    if(!navigator.storage || !navigator.storage.estimate){ cb(true, null); return; }
    navigator.storage.estimate().then(function(est){
      var remain = (est.quota || 0) - (est.usage || 0);
      if(remain > fileSize * 1.2){
        cb(true, { remain: remain, remainText: fmtBytes(remain) });
      } else {
        cb(false, { remain: remain, remainText: fmtBytes(remain), need: fileSize });
      }
    }).catch(function(){ cb(true, null); });
  }
  STORE_HELPERS.checkSpaceBefore = checkSpaceBefore;

  function clearAllMusic(cb){
    if(!window.__idb || typeof window.__idb.keys !== 'function'){ cb(0); return; }
    window.__idb.keys().then(function(all){
      var musicKeys = (all || []).filter(function(k){
        return k.indexOf('music_') === 0 || k.indexOf('music_lyric_') === 0;
      });
      try{ localStorage.removeItem('mj_music_v1'); }catch(e){}
      try{ localStorage.removeItem('mj_music_lyrics_v1'); }catch(e){}
      var pending = musicKeys.length;
      if(!pending){ cb(0); return; }
      musicKeys.forEach(function(k){
        window.__idb.del(k).then(function(){ if(--pending === 0) cb(musicKeys.length); }, function(){ if(--pending === 0) cb(musicKeys.length); });
      });
    }).catch(function(){ cb(0); });
  }
  STORE_HELPERS.clearAllMusic = clearAllMusic;

  function migrateLegacyDataUrls(cb){
    if(!window.__idb || typeof window.__idb.set !== 'function'){ cb({ moved: 0, bytes: 0 }); return; }
    var DATAURL_KEYS = ['mj_sticker_store_v2','mj_sticker_store_v1','mj_tarot_imgs_v2','mj_tarot_imgs_v1','mj_friends','mj_user_profile','mj_moments','mj_my_moments_v2'];
    var movedCount = 0, movedBytes = 0;
    var tasks = [];
    DATAURL_KEYS.forEach(function(key){
      var raw = null;
      try{ raw = localStorage.getItem(key); }catch(e){ return; }
      if(!raw || raw.indexOf('data:image') < 0) return;
      var obj;
      try{ obj = JSON.parse(raw); }catch(e){ return; }
      var replaced = 0;
      function walk(node){
        if(!node) return node;
        if(typeof node === 'string'){
          if(node.indexOf('data:image') === 0 && node.length > 2048){
            var idbKey = 'migrated_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
            var blobby;
            try{
              var parts = node.split(',');
              var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
              var bin = atob(parts[1]);
              var arr = new Uint8Array(bin.length);
              for(var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
              blobby = new Blob([arr], { type: mime });
            }catch(e){ return node; }
            tasks.push(idbSetSafe(idbKey, blobby, '旧图').then(function(){
              movedCount++;
              movedBytes += bytesOf(node);
              replaced++;
            }).catch(function(){}));
            return 'idb:' + idbKey;
          }
          return node;
        }
        if(Array.isArray(node)){
          var outArr = [];
          for(var ai = 0; ai < node.length; ai++) outArr.push(walk(node[ai]));
          return outArr;
        }
        if(typeof node === 'object'){
          var outObj = {};
          Object.keys(node).forEach(function(k2){ outObj[k2] = walk(node[k2]); });
          return outObj;
        }
        return node;
      }
      var transformed = walk(obj);
      if(replaced > 0 || JSON.stringify(transformed) !== raw){
        try{ localStorage.setItem(key, JSON.stringify(transformed)); }catch(e){}
      }
    });
    Promise.all(tasks).then(function(){
      cb({ moved: movedCount, bytes: movedBytes });
    }, function(){
      cb({ moved: movedCount, bytes: movedBytes });
    });
  }
  STORE_HELPERS.migrateLegacyDataUrls = migrateLegacyDataUrls;

  STORE_HELPERS.openStoragePanel = function(){
    var old = document.getElementById('mfStoragePanel');
    if(old) old.remove();
    var mask = document.createElement('div');
    mask.id = 'mfStoragePanel';
    mask.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff;max-width:520px;margin:0 auto;display:flex;flex-direction:column;overflow:hidden';
    var html = '<div style="flex:none;display:flex;align-items:center;gap:12px;padding:20px 22px 12px;border-bottom:0.6px dashed #eee">'
      + '<button id="mfSPBack" style="width:38px;height:38px;border:none;background:transparent;font-size:22px;color:#1a1a1a;opacity:.55;cursor:pointer">‹</button>'
      + '<div style="flex:1;text-align:center;font-size:15px;letter-spacing:6px;text-indent:6px;color:#1a1a1a">存 储</div>'
      + '<div style="width:38px"></div>'
      + '</div>';
    html += '<div id="mfSPBody" style="flex:1;overflow-y:auto;padding:16px 22px 40px;font-size:13px;color:#1a1a1a"></div>';
    mask.innerHTML = html;
    document.body.appendChild(mask);
    mask.querySelector('#mfSPBack').onclick = function(){ mask.remove(); };
    var body = mask.querySelector('#mfSPBody');
    body.innerHTML = '<div style="text-align:center;color:#bbb;padding:40px 0;font-size:13px">扫描中…</div>';
    var ls = scanLocalStorage();
    scanIdbEstimate(function(idb){
      var html2 = '';
      html2 += '<div style="font-size:11px;color:#999;letter-spacing:2px;margin-bottom:8px">LOCALSTORAGE</div>';
      html2 += '<div style="background:#fafafa;border-radius:12px;padding:14px 16px;margin-bottom:20px">';
      html2 += '<div style="font-size:14px;margin-bottom:8px">合计 <b>' + ls.totalText + '</b></div>';
      html2 += '<div style="font-size:11.5px;color:#999;line-height:1.7">浏览器 localStorage 硬上限约 5 MB，满了会写不进去。</div>';
      html2 += '</div>';
      if(ls.rows.length){
        html2 += '<div style="font-size:11px;color:#999;letter-spacing:2px;margin-bottom:8px">占用排行（前 30）</div>';
        html2 += '<div style="background:#fafafa;border-radius:12px;padding:6px 4px;margin-bottom:20px">';
        ls.rows.slice(0, 30).forEach(function(r){
          var isBig = r.size > 100 * 1024;
          html2 += '<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:0.5px solid #f0f0f0;font-size:12.5px">'
            + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:' + (isBig ? '#c0392b' : '#1a1a1a') + '">' + r.key + '</span>'
            + '<span style="flex:none;margin-left:10px;color:' + (isBig ? '#c0392b' : '#999') + ';font-family:monospace">' + r.sizeText + '</span>'
            + '</div>';
        });
        html2 += '</div>';
      }
      html2 += '<div style="font-size:11px;color:#999;letter-spacing:2px;margin-bottom:8px">INDEXEDDB</div>';
      html2 += '<div style="background:#fafafa;border-radius:12px;padding:14px 16px;margin-bottom:20px">';
      if(idb){
        html2 += '<div style="font-size:14px;margin-bottom:6px">已用 <b>' + idb.usageText + '</b> / 配额 ' + idb.quotaText + '</div>';
        html2 += '<div style="height:6px;background:#e8e8e8;border-radius:3px;overflow:hidden;margin-top:8px"><div style="height:100%;width:' + idb.percent + '%;background:' + (idb.percent > 80 ? '#c0392b' : '#1a1a1a') + '"></div></div>';
        html2 += '<div style="font-size:11.5px;color:#999;margin-top:8px">占比 ' + idb.percent + '%</div>';
      } else {
        html2 += '<div style="font-size:12.5px;color:#999">浏览器不支持估算 IndexedDB 用量</div>';
      }
      html2 += '</div>';
      html2 += '<div style="font-size:11px;color:#999;letter-spacing:2px;margin-bottom:8px">工 具</div>';
      html2 += '<div style="background:#fafafa;border-radius:12px;padding:6px 4px">';
      html2 += '<div id="mfMigrateBtn" style="padding:14px 12px;border-bottom:0.5px solid #f0f0f0;cursor:pointer;font-size:13px">把老的贴图搬到 IndexedDB（腾 localStorage）</div>';
      html2 += '<div id="mfMigrateMsgBtn" style="padding:14px 12px;cursor:pointer;font-size:13px">把聊天记录搬到 IndexedDB（腾出海量空间）</div>';
      html2 += '</div>';
      body.innerHTML = html2;

      var mBtn = body.querySelector('#mfMigrateBtn');
      if(mBtn) mBtn.onclick = function(){
        mBtn.textContent = '搬家中文…';
        mBtn.style.pointerEvents = 'none';
        migrateLegacyDataUrls(function(res){
          mBtn.textContent = '搬家完成：搬了 ' + res.moved + ' 张图，腾出约 ' + fmtBytes(res.bytes);
          mBtn.style.pointerEvents = '';
          setTimeout(function(){ STORE_HELPERS.openStoragePanel(); }, 1500);
        });
      };
      var cBtn = body.querySelector('#mfMigrateMsgBtn');
      if(cBtn) cBtn.onclick = function(){
        cBtn.textContent = '搬迁中，请稍候…';
        cBtn.style.pointerEvents = 'none';
        var keysToMigrate = [];
        for(var i=0; i<localStorage.length; i++){
          var k = localStorage.key(i);
          if(k && k.indexOf('mj_msgs_') === 0) keysToMigrate.push(k);
        }
        var pending = keysToMigrate.length;
        if(!pending) {
          toast('没有需要搬家的聊天记录');
          cBtn.textContent = '把聊天记录搬到 IndexedDB（腾出海量空间）';
          cBtn.style.pointerEvents = '';
          return;
        }
        keysToMigrate.forEach(function(k){
          var raw = localStorage.getItem(k);
          if(!raw){ pending--; return; }
          window.__msgIdb.set(k, raw);
          setTimeout(function(){
            localStorage.removeItem(k);
            if(--pending === 0){
              toast('搬家完成！聊天记录已安全转移');
              STORE_HELPERS.openStoragePanel();
            }
          }, 50);
        });
      };
    });
  };

  document.addEventListener('click', function(e){
    var t = e.target;
    if(!t || !t.closest) return;
    if(t.closest('#setRowStorage')){
      e.preventDefault();
      e.stopPropagation();
      if(typeof window.__memoryFix.openStoragePanel === 'function'){
        window.__memoryFix.openStoragePanel();
      }
      return;
    }
  }, true);

  document.addEventListener('change', function(e){
    var t = e.target;
    if(!t || t.id !== 'msFilePick') return;
    var files = t.files;
    if(!files || !files.length) return;
    var totalSize = 0;
    for(var i = 0; i < files.length; i++) totalSize += files[i].size || 0;
    if(totalSize <= 0) return;
    if(!navigator.storage || !navigator.storage.estimate) return;
    if(t._mfPrechecked) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    var fileList = Array.prototype.slice.call(files);
    checkSpaceBefore(totalSize, function(ok, info){
      if(ok){
        t._mfPrechecked = true;
        try{
          var dt = new DataTransfer();
          fileList.forEach(function(f){ dt.items.add(f); });
          t.files = dt.files;
        }catch(err){}
        setTimeout(function(){
          t._mfPrechecked = false;
          t.dispatchEvent(new Event('change', { bubbles: true }));
        }, 30);
      } else {
        var remainText = info && info.remainText ? info.remainText : '未知';
        warnOnce('music_full', '空间不够导入这首歌（剩 ' + remainText + '），去「设置 → 存储」清一点吧');
        t.value = '';
        try{ if(typeof window.renderMusicScreen === 'function') window.renderMusicScreen(); }catch(err){}
      }
    });
  }, true);

  /* ---------- 2. 音乐歌词：从 localStorage 搬到 IndexedDB ---------- */
  var LYRIC_IDB_PREFIX = 'music_lyric_';
  var lyricCache = {};
  var lyricLoading = {};

  function lyricIdbKey(trackId){
    return LYRIC_IDB_PREFIX + trackId;
  }

  function getLyric(trackId, cb){
    if(!trackId){ cb(null); return; }
    if(lyricCache[trackId]){ cb(lyricCache[trackId]); return; }
    if(lyricLoading[trackId]){
      lyricLoading[trackId].push(cb);
      return;
    }
    lyricLoading[trackId] = [cb];
    if(!window.__idb || typeof window.__idb.get !== 'function'){
      var arr = lyricLoading[trackId] || [];
      delete lyricLoading[trackId];
      arr.forEach(function(fn){ fn(null); });
      return;
    }
    window.__idb.get(lyricIdbKey(trackId)).then(function(raw){
      var data = null;
      if(raw){
        try{
          data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if(typeof data === 'string') data = JSON.parse(data);
        }catch(e){
          data = null;
        }
      }
      if(data && Array.isArray(data)){
        lyricCache[trackId] = data;
      }
      var arr = lyricLoading[trackId] || [];
      delete lyricLoading[trackId];
      arr.forEach(function(fn){ fn(data); });
    }).catch(function(){
      var arr = lyricLoading[trackId] || [];
      delete lyricLoading[trackId];
      arr.forEach(function(fn){ fn(null); });
    });
  }

  function setLyric(trackId, lrc, cb){
    if(!trackId){ if(cb) cb(false); return; }
    lyricCache[trackId] = lrc;
    if(!window.__idb || typeof window.__idb.set !== 'function'){
      if(cb) cb(false);
      return;
    }
    var payload = JSON.stringify(lrc);
    var blob = new Blob([payload], {type: 'application/json'});
    window.__idb.set(lyricIdbKey(trackId), blob).then(function(){
      if(cb) cb(true);
    }).catch(function(){
      try{ if(typeof window.toast === 'function') window.toast('歌词没存上，存储可能满了'); }catch(e){}
      if(cb) cb(false);
    });
  }

  function delLyric(trackId){
    if(!trackId) return;
    delete lyricCache[trackId];
    if(window.__idb && typeof window.__idb.del === 'function'){
      window.__idb.del(lyricIdbKey(trackId)).catch(function(){});
    }
  }

  window.__memoryFix = window.__memoryFix || {};
  window.__memoryFix.getLyric = getLyric;
  window.__memoryFix.setLyric = setLyric;
  window.__memoryFix.delLyric = delLyric;

  /* ---------- 3. MS_LYRIC_KEY 转发到 IndexedDB ---------- */
  var MS_LYRIC_KEY = 'mj_music_lyrics_v1';
  var LYRIC_MAP_CACHE = null;
  var LYRIC_MAP_DIRTY = false;

  function loadLyricMapFromIDB(cb){
    if(LYRIC_MAP_CACHE){ cb(LYRIC_MAP_CACHE); return; }
    if(!window.__idb || typeof window.__idb.get !== 'function'){
      LYRIC_MAP_CACHE = {};
      cb(LYRIC_MAP_CACHE);
      return;
    }
    window.__idb.get('music_lyrics_all').then(function(blob){
      if(!blob){ LYRIC_MAP_CACHE = {}; cb(LYRIC_MAP_CACHE); return; }
      var text = '';
      if(blob instanceof Blob){
        var fr = new FileReader();
        fr.onload = function(){
          try{ LYRIC_MAP_CACHE = JSON.parse(fr.result) || {}; }
          catch(e){ LYRIC_MAP_CACHE = {}; }
          cb(LYRIC_MAP_CACHE);
        };
        fr.onerror = function(){ LYRIC_MAP_CACHE = {}; cb(LYRIC_MAP_CACHE); };
        fr.readAsText(blob);
      } else if(typeof blob === 'string'){
        try{ LYRIC_MAP_CACHE = JSON.parse(blob) || {}; }
        catch(e){ LYRIC_MAP_CACHE = {}; }
        cb(LYRIC_MAP_CACHE);
      } else {
        LYRIC_MAP_CACHE = {};
        cb(LYRIC_MAP_CACHE);
      }
    }).catch(function(){
      LYRIC_MAP_CACHE = {};
      cb(LYRIC_MAP_CACHE);
    });
  }

  function saveLyricMapToIDB(){
    if(!LYRIC_MAP_DIRTY) return;
    LYRIC_MAP_DIRTY = false;
    if(!window.__idb || typeof window.__idb.set !== 'function') return;
    var payload = JSON.stringify(LYRIC_MAP_CACHE || {});
    var blob = new Blob([payload], {type: 'application/json'});
    window.__idb.set('music_lyrics_all', blob).catch(function(){});
  }

  (function hookLyricKey(){
    var origGet = Storage.prototype.getItem;
    var origSet = Storage.prototype.setItem;
    var origRemove = Storage.prototype.removeItem;

    Storage.prototype.getItem = function(key){
      if(key === MS_LYRIC_KEY){
        if(LYRIC_MAP_CACHE) return JSON.stringify(LYRIC_MAP_CACHE);
        return '{}';
      }
      return origGet.apply(this, arguments);
    };

    Storage.prototype.setItem = function(key, value){
      if(key === MS_LYRIC_KEY){
        try{
          var parsed = JSON.parse(value);
          if(parsed && typeof parsed === 'object'){
            LYRIC_MAP_CACHE = parsed;
            LYRIC_MAP_DIRTY = true;
            setTimeout(saveLyricMapToIDB, 300);
          }
        }catch(e){}
        return;
      }
      return origSet.apply(this, arguments);
    };

    Storage.prototype.removeItem = function(key){
      if(key === MS_LYRIC_KEY){
        LYRIC_MAP_CACHE = {};
        LYRIC_MAP_DIRTY = true;
        setTimeout(saveLyricMapToIDB, 300);
        return;
      }
      return origRemove.apply(this, arguments);
    };

    loadLyricMapFromIDB(function(){});
  })();

  /* ---------- 4. 一起看聊天框：退出清空 + 运行中节点上限 ---------- */
  var WC_MAX_NODES = 60;

  function clearWatchBody(){
    var body = document.getElementById('wcBody');
    if(!body) return;
    body.innerHTML = '';
  }

  function capWatchBody(){
    var body = document.getElementById('wcBody');
    if(!body) return;
    var kids = body.children;
    while(kids.length > WC_MAX_NODES){
      body.removeChild(kids[0]);
    }
  }

  function bindWatchBodyGuard(){
    var body = document.getElementById('wcBody');
    if(!body) return;
    if(body._mfGuard) return;
    body._mfGuard = new MutationObserver(function(){
      capWatchBody();
    });
    body._mfGuard.observe(body, { childList: true });
  }

  /* 每次打开一起看都重新挂一次守卫（DOM 可能被重建） */
  var _origOpenWatch = window.openWatchScreen;
  window.openWatchScreen = function(){
    var r;
    if(typeof _origOpenWatch === 'function'){
      try{ r = _origOpenWatch.apply(this, arguments); }catch(e){ console.error('[memory-fix] openWatchScreen 出错', e); }
    }
    setTimeout(bindWatchBodyGuard, 100);
    return r;
  };

  /* 覆盖 stopWatchCompanion：停掉定时器 + 清空聊天框 */
  var _origStopCompanion = window.stopWatchCompanion;
  window.stopWatchCompanion = function(){
    if(typeof _origStopCompanion === 'function'){
      try{ _origStopCompanion.apply(this, arguments); }catch(e){}
    }
    clearWatchBody();
  };

  var _origStopActions = window.stopWatchRoleActions;
  window.stopWatchRoleActions = function(){
    if(typeof _origStopActions === 'function'){
      try{ _origStopActions.apply(this, arguments); }catch(e){}
    }
  };

  /* 兜底：一起看那一页被关掉（class 去掉）时也清一次 */
  var watchScreen = document.getElementById('watchScreen');
  if(watchScreen){
    var _mo = new MutationObserver(function(){
      if(!watchScreen.classList.contains('on')){
        clearWatchBody();
      }
    });
    _mo.observe(watchScreen, { attributes: true, attributeFilter: ['class'] });
  }
})();