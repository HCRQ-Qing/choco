(function(){
  if(!window.MediaIdb) return;

  var _isDataURL = window.MediaIdb.isDataURL;
  var _convert = function(dataUrl, prefix){
    return window.MediaIdb.rpCover.set(dataUrl).then(function(newVal){
      return newVal;
    });
  };

  var genKey = function(prefix){
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  };

  var dataURLToBlob = function(dataUrl){
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
  };

  var extractAndStore = function(dataUrl, prefix){
    return new Promise(function(resolve){
      if(!_isDataURL(dataUrl)){ resolve(dataUrl || ''); return; }
      var blob = dataURLToBlob(dataUrl);
      if(!blob){ resolve(dataUrl || ''); return; }
      var key = genKey(prefix);
      window.MediaIdb.rpCover.set('idb:' + key); 
      var dbReq = indexedDB.open('mj_media_idb_v1', 1);
      dbReq.onsuccess = function(e){
        var db = e.target.result;
        var tx = db.transaction('media', 'readwrite');
        var st = tx.objectStore('media');
        var req = st.put(blob, key);
        req.onsuccess = function(){ resolve('idb:' + key); };
        req.onerror = function(){ resolve(dataUrl || ''); };
      };
      dbReq.onerror = function(){ resolve(dataUrl || ''); };
    });
  };

  window.__MediaIdbBackup = {
    extractAndStore: extractAndStore,
    dataURLToBlob: dataURLToBlob,
    isDataURL: _isDataURL
  };

  function processExportData(data, cb){
    if(!data || typeof data !== 'object') { cb(data); return; }
    var tasks = [];
    var clone = JSON.parse(JSON.stringify(data));

    if(Array.isArray(clone.friends)){
      clone.friends.forEach(function(f){
        if(f && _isDataURL(f.rpCover)){
          tasks.push(extractAndStore(f.rpCover, 'rpcover').then(function(k){ f.rpCover = k; }));
        }
      });
    }

    if(clone.groupIcons && typeof clone.groupIcons === 'object'){
      Object.keys(clone.groupIcons).forEach(function(gid){
        if(_isDataURL(clone.groupIcons[gid])){
          tasks.push(extractAndStore(clone.groupIcons[gid], 'gicon').then(function(k){ clone.groupIcons[gid] = k; }));
        }
      });
    }

    if(clone.stickers && typeof clone.stickers === 'object'){
      Object.keys(clone.stickers).forEach(function(bucket){
        var b = clone.stickers[bucket];
        if(!b || !Array.isArray(b.cats)) return;
        b.cats.forEach(function(cat){
          if(!cat || !Array.isArray(cat.list)) return;
          for(var i = 0; i < cat.list.length; i++){
            if(_isDataURL(cat.list[i])){
              (function(c, idx){
                tasks.push(extractAndStore(c.list[idx], 'sticker').then(function(k){ c.list[idx] = k; }));
              })(cat, i);
            }
          }
        });
      });
    }

    Promise.all(tasks).then(function(){
      cb(clone);
    }).catch(function(err){
      console.warn('导出剥离图片失败，使用原数据', err);
      cb(data);
    });
  }

  var _origExport = null;

  function hookExport(){
    if(!window.ChocoBackup) return;
    if(_origExport) return;

    if(typeof window.ChocoBackup.exportAll === 'function'){
      _origExport = window.ChocoBackup.exportAll;
      window.ChocoBackup.exportAll = function(mode){
        var _this = this;
        var _args = arguments;
        if(typeof window.__getExportPayload === 'function'){
          processExportData(window.__getExportPayload(), function(newData){
            var json = JSON.stringify(newData, null, 2);
            var blob = new Blob([json], {type:'application/json'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            var d = new Date();
            var stamp = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '_' + String(d.getHours()).padStart(2,'0') + String(d.getMinutes()).padStart(2,'0');
            a.href = url;
            a.download = 'choco_备份_' + stamp + '.json';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
            if(typeof toast === 'function') toast('已导出（图片已自动存入新仓库）');
          });
        } else {
          _origExport.apply(_this, _args);
        }
      };
    }
  }

  function processImportData(data, cb){
    if(!data || typeof data !== 'object') { cb(data); return; }
    var tasks = [];
    var clone = JSON.parse(JSON.stringify(data));

    if(Array.isArray(clone.friends)){
      clone.friends.forEach(function(f){
        if(f && _isDataURL(f.rpCover)){
          tasks.push(extractAndStore(f.rpCover, 'rpcover').then(function(k){ f.rpCover = k; }));
        }
      });
    }

    if(clone.groupIcons && typeof clone.groupIcons === 'object'){
      Object.keys(clone.groupIcons).forEach(function(gid){
        if(_isDataURL(clone.groupIcons[gid])){
          tasks.push(extractAndStore(clone.groupIcons[gid], 'gicon').then(function(k){ clone.groupIcons[gid] = k; }));
        }
      });
    }

    if(clone.stickers && typeof clone.stickers === 'object'){
      Object.keys(clone.stickers).forEach(function(bucket){
        var b = clone.stickers[bucket];
        if(!b || !Array.isArray(b.cats)) return;
        b.cats.forEach(function(cat){
          if(!cat || !Array.isArray(cat.list)) return;
          for(var i = 0; i < cat.list.length; i++){
            if(_isDataURL(cat.list[i])){
              (function(c, idx){
                tasks.push(extractAndStore(c.list[idx], 'sticker').then(function(k){ c.list[idx] = k; }));
              })(cat, i);
            }
          }
        });
      });
    }

    Promise.all(tasks).then(function(){
      cb(clone);
    }).catch(function(err){
      console.warn('导入剥离图片失败，使用原数据', err);
      cb(data);
    });
  }

  var _origImport = null;

  function hookImport(){
    if(!window.ChocoBackup) return;
    if(_origImport) return;

    if(typeof window.ChocoBackup.importData === 'function'){
      _origImport = window.ChocoBackup.importData;
      window.ChocoBackup.importData = function(rawData){
        var _this = this;
        var _args = arguments;
        processImportData(rawData, function(newData){
          _origImport.call(_this, newData);
        });
      };
    }
  }

  setTimeout(function(){
    hookExport();
    hookImport();
  }, 2000);

})();