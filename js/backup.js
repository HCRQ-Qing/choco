/* ============================================================
   数据备份 / 恢复（backup.js）
   ------------------------------------------------------------
   清缓存 / 换手机 / 卸载重装时，localStorage 和 IndexedDB 都会丢。
   这里把两者打包成一个 JSON，方便用户自己存到网盘 / 微信收藏。

   - 导出：localStorage 的 mj_* / xy-home-v2:* 全部原始字符串
           + IndexedDB（mj_big_files / files）里的大文件（转 base64）
   - 恢复：校验文件头 → 二次确认 → 覆盖写回 → 刷新页面

   依赖：indexeddb.js 的 window.__idb、app.js 的 toast / uniAsk
   本文件必须在 app.js 之后、indexeddb.js 之后加载。
   ============================================================ */
(function(){
  'use strict';
  if(window.__chocoBackupReady) return;
  window.__chocoBackupReady = true;

  /* 只备份本应用的键，避免把同源其它数据一起带走 */
  var LS_PREFIXES = ['mj_', 'xy-home-v2:', 'choco_'];
  /* 单个 / 合计大文件上限（base64 后会膨胀约 33%） */
  var MAX_ITEM_BYTES  = 8 * 1024 * 1024;
  var MAX_TOTAL_BYTES = 80 * 1024 * 1024;

  function isAppKey(k){
    if(!k) return false;
    for(var i = 0; i < LS_PREFIXES.length; i++){
      if(k.indexOf(LS_PREFIXES[i]) === 0) return true;
    }
    return false;
  }

  function say(msg){
    try{ if(typeof toast === 'function') toast(msg); }catch(e){ console.log('[backup]', msg); }
  }

  function blobToDataURL(blob){
    return new Promise(function(resolve, reject){
      var fr = new FileReader();
      fr.onload  = function(){ resolve(fr.result); };
      fr.onerror = function(){ reject(fr.error || new Error('读取文件失败')); };
      fr.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(dataURL){
    if(window.__idb && __idb.dataURLToBlob){
      var b = __idb.dataURLToBlob(dataURL);
      if(b) return b;
    }
    var parts = String(dataURL || '').split(',');
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    var bin = atob(parts[1] || '');
    var arr = new Uint8Array(bin.length);
    for(var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function stamp(){
    var d = new Date();
    function p(n){ return String(n).padStart(2, '0'); }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function download(filename, obj){
    var json = JSON.stringify(obj);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      URL.revokeObjectURL(url);
      if(a.parentNode) a.parentNode.removeChild(a);
    }, 1500);
    return json.length;
  }

  /* ---------- 导出 ---------- */
  function exportAll(){
    var ls = {};
    try{
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(!isAppKey(k)) continue;
        ls[k] = localStorage.getItem(k);
      }
    }catch(e){
      console.error('[backup] 读 localStorage 失败', e);
    }

    var payload = {
      __type: 'choco-backup',
      version: 1,
      app: 'choco',
      exportedAt: new Date().toISOString(),
      localStorage: ls,
      idb: {}
    };

    var skipped = 0;
    var totalBytes = 0;

    function finish(){
      var size = download('choco-backup-' + stamp() + '.json', payload);
      var mb = (size / 1024 / 1024).toFixed(1);
      var extra = skipped ? '（' + skipped + ' 个大文件超过上限已跳过）' : '';
      say('已导出备份 ' + mb + ' MB' + extra);
    }

    if(!(window.__idb && __idb.keys && __idb.get)){
      finish();
      return;
    }

    say('正在打包备份…');
    __idb.keys().then(function(keys){
      keys = Array.from(keys || []);
      var idx = 0;

      function next(){
        if(idx >= keys.length) return Promise.resolve();
        var key = keys[idx++];
        return __idb.get(key).then(function(val){
          if(!val) return;
          if(val instanceof Blob){
            if(val.size > MAX_ITEM_BYTES || totalBytes + val.size > MAX_TOTAL_BYTES){
              skipped++;
              return;
            }
            totalBytes += val.size;
            return blobToDataURL(val).then(function(dataURL){
              payload.idb[key] = { kind: 'blob', mime: val.type || '', data: dataURL };
            });
          }
          /* 非 Blob 的（极少见）直接原样存 */
          try{ payload.idb[key] = { kind: 'raw', data: val }; }catch(e){ skipped++; }
        }).catch(function(e){
          console.warn('[backup] 读取大文件失败', key, e);
          skipped++;
        }).then(next);
      }

      return next();
    }).then(finish).catch(function(e){
      console.error('[backup] 打包失败', e);
      say('备份失败：' + (e && e.message ? e.message : '未知错误'));
    });
  }

  /* ---------- 恢复 ---------- */
  function applyImport(data, done){
    try{
      /* 1. 清掉现有本应用键，再写回备份里的键（真正的"恢复"而不是合并） */
      var oldKeys = [];
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(isAppKey(k)) oldKeys.push(k);
      }
      oldKeys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
      var ls = data.localStorage || {};
      Object.keys(ls).forEach(function(k){
        if(!isAppKey(k)) return;
        try{ localStorage.setItem(k, ls[k]); }catch(e){ console.error('[backup] 写入失败', k, e); }
      });

      /* 2. IndexedDB：先清空，再逐个写回 */
      var idb = data.idb || {};
      var entries = Object.keys(idb);
      if(!entries.length || !(window.__idb && __idb.set)){
        done();
        return;
      }
      __idb.clear().catch(function(){}).then(function(){
        var idx = 0;
        function next(){
          if(idx >= entries.length) return Promise.resolve();
          var key = entries[idx++];
          var it = idb[key] || {};
          var blob = null;
          try{
            if(it.kind === 'blob' && typeof it.data === 'string') blob = dataURLToBlob(it.data);
            else if(it.data !== undefined) blob = it.data;
          }catch(e){ console.warn('[backup] 解析大文件失败', key, e); }
          if(!blob) return next();
          return __idb.set(key, blob).catch(function(e){
            console.warn('[backup] 写回大文件失败', key, e);
          }).then(next);
        }
        return next();
      }).then(done, done);
    }catch(e){
      console.error('[backup] 恢复失败', e);
      say('恢复失败：' + (e && e.message ? e.message : '未知错误'));
    }
  }

  function importFromFile(file){
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var data = null;
      try{ data = JSON.parse(String(reader.result || '')); }catch(e){}
      if(!data || data.__type !== 'choco-backup'){
        say('这不是 choco 的备份文件');
        return;
      }
      var nLS = Object.keys(data.localStorage || {}).length;
      var nIDB = Object.keys(data.idb || {}).length;
      var sub = '备份时间：' + (data.exportedAt || '未知') + '\n包含 ' + nLS + ' 项设置与 ' + nIDB + ' 个文件。\n恢复会覆盖当前全部数据，输入「恢复」确认';

      function go(){
        say('正在恢复数据…');
        applyImport(data, function(){
          say('恢复完成，正在刷新…');
          setTimeout(function(){ location.reload(); }, 600);
        });
      }

      if(typeof uniAsk === 'function'){
        uniAsk({
          title: '恢复备份',
          sub: sub,
          value: '',
          placeholder: '输入「恢复」两个字确认',
          maxlength: 4
        }).then(function(v){
          if(v === null) return;
          if(String(v).trim() !== '恢复'){ say('未确认，已取消'); return; }
          go();
        });
      }else{
        if(window.confirm('恢复会覆盖当前全部数据，确定继续吗？')) go();
      }
    };
    reader.onerror = function(){ say('读取备份文件失败'); };
    reader.readAsText(file);
  }

  function pickImport(){
    var f = document.getElementById('bkImportFile');
    if(f){ f.value = ''; f.click(); }
  }

  /* 隐藏文件选择器：change 事件 */
  function bindFileInput(){
    var f = document.getElementById('bkImportFile');
    if(!f || f._bkBound) return;
    f._bkBound = true;
    f.addEventListener('change', function(){
      var file = this.files && this.files[0];
      this.value = '';
      if(file) importFromFile(file);
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindFileInput);
  }else{
    bindFileInput();
  }

  window.ChocoBackup = {
    exportAll: exportAll,
    importFromFile: importFromFile,
    pickImport: pickImport
  };
})();
