(function(){
  if(window.__avatarStoreReady) return;
  window.__avatarStoreReady = true;

  var PREFIX = 'idb:';

  function isIdbKey(s){
    return typeof s === 'string' && s.indexOf(PREFIX) === 0;
  }

  function makeKey(roleId){
    return 'av_' + (roleId || 'x') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
  }

  function setAvatar(roleId, dataUrlOrBlob, cb){
    var blob = dataUrlOrBlob;
    if(typeof dataUrlOrBlob === 'string'){
      blob = window.__idb && window.__idb.dataURLToBlob
        ? window.__idb.dataURLToBlob(dataUrlOrBlob)
        : null;
    }
    if(!blob){ if(cb) cb(''); return; }
    var key = makeKey(roleId);
    window.__idb.set(key, blob).then(function(){
      if(cb) cb(PREFIX + key);
    }).catch(function(e){
      console.error('头像存 IndexedDB 失败', e);
      if(cb) cb('');
    });
  }

  function getAvatar(stored, cb){
    if(!stored){ if(cb) cb(''); return; }
    if(isIdbKey(stored)){
      var key = stored.slice(PREFIX.length);
      window.__idb.toURL(key).then(function(url){
        if(cb) cb(url || '');
      }).catch(function(){
        if(cb) cb('');
      });
      return;
    }
    if(cb) cb(stored);
  }

  function delAvatar(stored){
    if(!isIdbKey(stored)) return;
    var key = stored.slice(PREFIX.length);
    try{ window.__idb.del(key).catch(function(){}); }catch(e){}
  }

  window.__avatarStore = {
    isIdbKey: isIdbKey,
    set: setAvatar,
    get: getAvatar,
    del: delAvatar
  };
})();