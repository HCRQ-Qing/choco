(function(){
  if(window.__signPresetSyncReady) return;
  window.__signPresetSyncReady = true;

  function getTextOfItem(item){
    if(typeof item === 'string') return String(item).trim();
    if(item && typeof item === 'object' && typeof item.text === 'string') return String(item.text).trim();
    return '';
  }

  function collectBuiltinPool(catId){
    var preset = (typeof SIGN_PRESET_LIST !== 'undefined' && Array.isArray(SIGN_PRESET_LIST)) ? SIGN_PRESET_LIST : [];
    var poolFromPreset = preset.map(function(s){ return String(s || '').trim(); }).filter(Boolean);
    var poolFromBuiltin = [];
    try{
      if(typeof getBuiltinSignPool === 'function') poolFromBuiltin = getBuiltinSignPool(catId).map(function(s){ return String(s || '').trim(); }).filter(Boolean);
    }catch(e){}
    var seen = {};
    var merged = [];
    poolFromPreset.forEach(function(t){ if(t && !seen[t]){ seen[t] = 1; merged.push(t); } });
    poolFromBuiltin.forEach(function(t){ if(t && !seen[t]){ seen[t] = 1; merged.push(t); } });
    return merged;
  }

  function getBlockedSet(catId){
    var set = {};
    try{
      if(typeof getSignBlockedList === 'function'){
        getSignBlockedList(catId).forEach(function(t){ set[String(t).trim()] = 1; });
      }
    }catch(e){}
    return set;
  }

  function syncOneCategory(roleId, catId){
    if(!roleId || !catId) return 0;
    if(typeof syncRoleCardGroups === 'function') syncRoleCardGroups(roleId);
    var groups = getGroupsByOwner(roleId);
    var gSign = groups.find(function(x){ return x && x.id === 'g-sign'; });
    if(!gSign || !Array.isArray(gSign.cats)) return 0;
    var cat = gSign.cats.find(function(c){ return c && c.id === catId; });
    if(!cat) return 0;
    if(!Array.isArray(cat.list)) cat.list = [];
    var existSet = {};
    cat.list.forEach(function(item){
      var t = getTextOfItem(item);
      if(t) existSet[t] = 1;
    });
    var blockedSet = getBlockedSet(catId);
    var pool = collectBuiltinPool(catId);
    var added = 0;
    pool.forEach(function(t){
      if(!t) return;
      if(existSet[t]) return;
      if(blockedSet[t]) return;
      cat.list.push({ text: t, t: Date.now() });
      existSet[t] = 1;
      added++;
    });
    if(added > 0) saveCardStore();
    return added;
  }

  function runSync(doMe, doRole){
    var meAdded = 0;
    var roleAdded = 0;
    var roleId = (typeof getCurrentRoleId === 'function') ? getCurrentRoleId() : '';
    if(doMe){
      meAdded = syncOneCategory(roleId, 'cs-me');
    }
    if(doRole){
      roleAdded = syncOneCategory(roleId, 'cs-role');
    }
    return { me: meAdded, role: roleAdded };
  }
    function openSyncPanel(){
    var old = document.getElementById('signSyncMask');
    if(old) old.remove();

    var mask = document.createElement('div');
    mask.id = 'signSyncMask';
    mask.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:24px';

    var roleName = '角色';
    try{
      var rid = getCurrentRoleId();
      var r = getRoleById(rid);
      if(r) roleName = (r.remark && String(r.remark).trim()) || r.name || '角色';
    }catch(e){}

    mask.innerHTML =
      '<div style="width:100%;max-width:320px;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.18);padding:24px 22px 20px;box-sizing:border-box">' +
        '<div style="font-size:15px;font-weight:300;letter-spacing:3px;color:#1a1a1a;text-align:center;text-indent:3px">更 新 内 置 字 卡</div>' +
        '<div style="font-size:11.5px;color:#bbb;letter-spacing:1px;margin-top:8px;text-align:center">把新加的内置个签补进本地</div>' +
        '<div style="margin-top:20px">' +
          '<label style="display:flex;align-items:center;gap:10px;padding:12px 4px;border-bottom:0.6px solid #f2f2f2;cursor:pointer">' +
            '<input type="checkbox" id="signSyncMe" checked style="appearance:none;-webkit-appearance:none;width:20px;height:20px;border-radius:50%;border:1.4px solid #ccc;background:#fff;position:relative;flex:none;cursor:pointer;outline:none;margin:0">' +
            '<span style="flex:1;font-size:14px;color:#1a1a1a;letter-spacing:.5px">我的个签</span>' +
          '</label>' +
          '<label style="display:flex;align-items:center;gap:10px;padding:12px 4px;border-bottom:0.6px solid #f2f2f2;cursor:pointer">' +
            '<input type="checkbox" id="signSyncRole" checked style="appearance:none;-webkit-appearance:none;width:20px;height:20px;border-radius:50%;border:1.4px solid #ccc;background:#fff;position:relative;flex:none;cursor:pointer;outline:none;margin:0">' +
            '<span style="flex:1;font-size:14px;color:#1a1a1a;letter-spacing:.5px">角色个签 · ' + escapeHTML(roleName) + '</span>' +
          '</label>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:22px">' +
          '<button type="button" id="signSyncCancel" style="flex:1;padding:12px 0;border-radius:14px;border:0.7px solid rgba(0,0,0,.14);background:transparent;color:#999;font-size:13.5px;font-family:inherit;letter-spacing:2px;cursor:pointer">取 消</button>' +
          '<button type="button" id="signSyncOk" style="flex:1;padding:12px 0;border-radius:14px;border:none;background:#1a1a1a;color:#fff;font-size:13.5px;font-family:inherit;letter-spacing:2px;cursor:pointer">更 新</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(mask);

    function paintCb(cb){
      if(!cb) return;
      if(cb.checked){
        cb.style.background = '#1a1a1a';
        cb.style.borderColor = '#1a1a1a';
        cb.style.boxShadow = 'inset 0 0 0 3px #fff';
      } else {
        cb.style.background = '#fff';
        cb.style.borderColor = '#ccc';
        cb.style.boxShadow = 'none';
      }
    }
    var cbMe = mask.querySelector('#signSyncMe');
    var cbRole = mask.querySelector('#signSyncRole');
    paintCb(cbMe); paintCb(cbRole);
    if(cbMe) cbMe.addEventListener('change', function(){ paintCb(this); });
    if(cbRole) cbRole.addEventListener('change', function(){ paintCb(this); });

    mask.addEventListener('click', function(e){
      if(e.target === mask) mask.remove();
    });
    mask.querySelector('#signSyncCancel').onclick = function(){ mask.remove(); };
    mask.querySelector('#signSyncOk').onclick = function(){
      var doMe = !!(cbMe && cbMe.checked);
      var doRole = !!(cbRole && cbRole.checked);
      if(!doMe && !doRole){ toast('请至少选一项'); return; }
      var r;
      try{
        r = runSync(doMe, doRole);
      }catch(err){
        console.error('更新内置字卡失败', err);
        toast('更新失败：' + err.message);
        return;
      }
      mask.remove();
      toast('我的个签补了 ' + r.me + ' 条，角色个签补了 ' + r.role + ' 条');
      try{
        if(typeof renderCdTabs === 'function') renderCdTabs();
        if(typeof renderCdList === 'function') renderCdList();
      }catch(e){}
    };
  }

  document.addEventListener('click', function(e){
    var t = e.target;
    if(!t || !t.closest) return;
    var it = t.closest('#cdMenu .it[data-act="sign-sync"]');
    if(!it) return;
    e.preventDefault();
    e.stopPropagation();
    var menu = document.getElementById('cdMenu');
    if(menu) menu.classList.remove('show');
    openSyncPanel();
  }, true);

  var origToggleCdMenu = window.toggleCdMenu;
  if(typeof origToggleCdMenu === 'function'){
    window.toggleCdMenu = function(){
      var r = origToggleCdMenu.apply(this, arguments);
      try{
        var g = (typeof currentGroupObj === 'function') ? currentGroupObj() : null;
        var el = document.querySelector('#cdMenu .it[data-act="sign-sync"]');
        if(el) el.style.display = (g && g.id === 'g-sign') ? '' : 'none';
      }catch(e){}
      return r;
    };
  }
})();