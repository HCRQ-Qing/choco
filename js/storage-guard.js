(function(){
  if(window.__storageGuardReady) return;
  window.__storageGuardReady = true;

  var idb = window.__idb;
  if(!idb) return;

  function isDataUrl(s){
    return typeof s === 'string' && s.indexOf('data:image/') === 0;
  }

  function tryDataUrlToBlob(dataUrl){
    try{
      if(idb.dataURLToBlob) return idb.dataURLToBlob(dataUrl);
      var parts = dataUrl.split(',');
      var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
      var bin = atob(parts[1]);
      var arr = new Uint8Array(bin.length);
      for(var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }catch(e){
      return null;
    }
  }

  function migrateKey(key, val){
    return new Promise(function(resolve){
      var blob = tryDataUrlToBlob(val);
      if(!blob){ resolve(false); return; }
      var newKey = 'mig_' + key + '_' + Date.now().toString(36);
      idb.set(newKey, blob).then(function(){
        resolve(newKey);
      }).catch(function(){
        resolve(false);
      });
    });
  }

  function replaceDataUrlInValue(val, cb){
    if(typeof val !== 'string'){ cb(val); return; }
    if(!isDataUrl(val)){ cb(val); return; }
    migrateKey('inline_' + Date.now().toString(36), val).then(function(newKey){
      if(!newKey){ cb(val); return; }
      cb(newKey);
    });
  }

  function walkAndMigrate(obj, cb){
    if(Array.isArray(obj)){
      var i = 0;
      function nextArr(){
        if(i >= obj.length){ cb(obj); return; }
        var item = obj[i];
        if(item && typeof item === 'object'){
          walkAndMigrate(item, function(newItem){
            obj[i] = newItem;
            i++;
            nextArr();
          });
        } else if(isDataUrl(item)){
          migrateKey('arr_' + Date.now().toString(36) + '_' + i, item).then(function(newKey){
            if(newKey) obj[i] = newKey;
            i++;
            nextArr();
          });
        } else {
          i++;
          nextArr();
        }
      }
      nextArr();
      return;
    }
    if(!obj || typeof obj !== 'object'){ cb(obj); return; }
    var keys = Object.keys(obj);
    var ki = 0;
    function nextKey(){
      if(ki >= keys.length){ cb(obj); return; }
      var k = keys[ki++];
      var v = obj[k];
      if(v && typeof v === 'object'){
        walkAndMigrate(v, function(newV){
          obj[k] = newV;
          nextKey();
        });
      } else if(isDataUrl(v)){
        migrateKey('field_' + k + '_' + Date.now().toString(36), v).then(function(newKey){
          if(newKey) obj[k] = newKey;
          nextKey();
        });
      } else if(typeof v === 'string' && v.indexOf('data:audio/') === 0){
        migrateKey('audio_' + k + '_' + Date.now().toString(36), v).then(function(newKey){
          if(newKey) obj[k] = newKey;
          nextKey();
        });
      } else {
        nextKey();
      }
    }
    nextKey();
  }

  function cleanStickerStore(){
    return new Promise(function(resolve){
      var raw = '';
      try{ raw = localStorage.getItem('mj_sticker_store_v2'); }catch(e){ raw = ''; }
      if(!raw){ resolve(); return; }
      var store;
      try{ store = JSON.parse(raw); }catch(e){ resolve(); return; }
      if(!store || typeof store !== 'object'){ resolve(); return; }
      var totalMigrated = 0;
      var buckets = Object.keys(store);
      var bi = 0;
      function nextBucket(){
        if(bi >= buckets.length){
          if(totalMigrated > 0){
            try{ localStorage.setItem('mj_sticker_store_v2', JSON.stringify(store)); }catch(e){}
          }
          resolve();
          return;
        }
        var b = store[buckets[bi++]];
        if(!b || !Array.isArray(b.cats)){ nextBucket(); return; }
        var ci = 0;
        function nextCat(){
          if(ci >= b.cats.length){ nextBucket(); return; }
          var cat = b.cats[ci++];
          if(!cat || !Array.isArray(cat.list)){ nextCat(); return; }
          var li = 0;
          function nextItem(){
            if(li >= cat.list.length){ nextCat(); return; }
            var item = cat.list[li];
            if(isDataUrl(item)){
              migrateKey('sticker_' + Date.now().toString(36) + '_' + li, item).then(function(newKey){
                if(newKey){ cat.list[li] = 'idb:' + newKey; totalMigrated++; }
                li++;
                nextItem();
              });
            } else {
              li++;
              nextItem();
            }
          }
          nextItem();
        }
        nextCat();
      }
      nextBucket();
    });
  }

  function cleanChatMsgs(){
    return new Promise(function(resolve){
      var keys = [];
      try{
        for(var i = 0; i < localStorage.length; i++){
          var k = localStorage.key(i);
          if(k && (k.indexOf('mj_msgs_') === 0 || k.indexOf('mj_group_msgs_') === 0)){
            keys.push(k);
          }
        }
      }catch(e){ resolve(); return; }
      var ki = 0;
      var changedAny = false;
      function nextK(){
        if(ki >= keys.length){
          if(changedAny){ window.__storageGuardMigrated = true; }
          resolve();
          return;
        }
        var key = keys[ki++];
        var raw = '';
        try{ raw = localStorage.getItem(key); }catch(e){ raw = ''; }
        if(!raw){ nextK(); return; }
        var arr;
        try{ arr = JSON.parse(raw); }catch(e){ nextK(); return; }
        if(!Array.isArray(arr)){ nextK(); return; }
        var mi = 0;
        var changed = false;
        function nextMsg(){
          if(mi >= arr.length){
            if(changed){
              try{ localStorage.setItem(key, JSON.stringify(arr)); }catch(e){}
              changedAny = true;
            }
            nextK();
            return;
          }
          var m = arr[mi++];
          if(!m || typeof m !== 'object'){ nextMsg(); return; }
          if(isDataUrl(m.imageUrl) || isDataUrl(m.sticker)){
            var field = isDataUrl(m.imageUrl) ? 'imageUrl' : 'sticker';
            migrateKey('chat_' + field + '_' + Date.now().toString(36), m[field]).then(function(newKey){
              if(newKey){
                if(field === 'imageUrl'){
                  m.imageIdbKey = newKey;
                  delete m.imageUrl;
                } else {
                  m.sticker = 'idb:' + newKey;
                }
                changed = true;
              }
              nextMsg();
            });
            return;
          }
          nextMsg();
        }
        nextMsg();
      }
      nextK();
    });
  }

  window.__storageGuard = {
    run: function(){
      return Promise.resolve();
    }
  };

  setTimeout(function(){
    return;
  }, 2000);
})();