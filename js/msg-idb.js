/* msg-idb.js */
(function(){
  'use strict';
  if(window.__msgIdbReady) return;
  window.__msgIdbReady = true;

  var idbCache = {};

  window.__msgIdb = {
    get: function(key, cb){
      if(idbCache[key] !== undefined){ cb(idbCache[key]); return; }
      if(!window.__idb) { cb(null); return; }
      window.__idb.get(key).then(function(raw){
        var arr = [];
        if(raw){
          try{
            if(typeof raw === 'string') arr = JSON.parse(raw);
            else if(raw instanceof Blob){
              var fr = new FileReader();
              fr.onload = function(){
                try{ arr = JSON.parse(fr.result); }catch(e){}
                idbCache[key] = arr;
                cb(arr);
              };
              fr.readAsText(raw);
              return;
            }
          }catch(e){}
        }
        idbCache[key] = arr;
        cb(arr);
      }).catch(function(){ cb(null); });
    },
    set: function(key, arr){
      idbCache[key] = arr;
      if(!window.__idb) return;
      var blob = new Blob([JSON.stringify(arr)], {type:'application/json'});
      window.__idb.set(key, blob).catch(function(){});
    },
    has: function(key, cb){
      if(!window.__idb) { cb(false); return; }
      window.__idb.keys().then(function(all){
        cb((all || []).indexOf(key) >= 0);
      }).catch(function(){ cb(false); });
    },
    getAllKeys: function(cb){
      if(!window.__idb) { cb([]); return; }
      window.__idb.keys().then(cb).catch(function(){ cb([]); });
    },
    del: function(key){
      delete idbCache[key];
      if(window.__idb) window.__idb.del(key).catch(function(){});
    }
  };

  var _origGet = window.__getCurMsgs;
  window.__getCurMsgs = function(){
    return _origGet ? _origGet() : [];
  };
})();