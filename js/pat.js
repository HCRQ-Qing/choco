/* ============================================================
   拍一拍 · PAT
   - 每个角色一份独立配置：概率、最短时长、最长时长、文案模板
   - 后台按角色各自计时，到点摇概率，中了这个角色主动拍你
   ============================================================ */
(function(){
  if(window.__patKitReady) return;
  window.__patKitReady = true;

  var CFG_KEY = 'mj_pat_cfg_v2';

  var DEFAULT_TPL = [
    '我拍了拍你',
    '我亲了亲你',
    '我抱了抱你',
    '我摸了摸你的头',
    '我戳了戳你的脸',
    '我牵了牵你的手',
    '我揉了揉你的脸',
    '我靠在你肩膀上',
    '我轻轻碰了碰你'
  ];

  function defaultRoleCfg(){
    return { rate: 8, minMin: 10, maxMin: 60, tpl: DEFAULT_TPL.slice() };
  }

  var DEFAULT_MY_TPL = [
    '我拍了拍你',
    '我亲了亲你',
    '我抱了抱你',
    '我摸了摸你的头',
    '我戳了戳你的脸',
    '我牵了牵你的手',
    '我揉了揉你的脸',
    '我靠在你肩膀上',
    '我轻轻碰了碰你'
  ];

  function getCfg(){
    var c = lsGet(CFG_KEY, null);
    if(!c || typeof c !== 'object') c = {};
    if(!c.roles || typeof c.roles !== 'object') c.roles = {};
    if(!Array.isArray(c.myTpl) || !c.myTpl.length) c.myTpl = DEFAULT_MY_TPL.slice();
    return c;
  }
  function saveCfg(c){ lsSet(CFG_KEY, c); }

  function getRoleCfg(roleId){
    if(!roleId) return defaultRoleCfg();
    var c = getCfg();
    var r = c.roles[roleId];
    if(!r || typeof r !== 'object') r = defaultRoleCfg();
    if(typeof r.rate !== 'number') r.rate = 8;
    if(typeof r.minMin !== 'number' || r.minMin < 1) r.minMin = 10;
    if(typeof r.maxMin !== 'number' || r.maxMin < r.minMin) r.maxMin = 60;
    if(!Array.isArray(r.tpl) || !r.tpl.length) r.tpl = DEFAULT_TPL.slice();
    return r;
  }
  function saveRoleCfg(roleId, r){
    if(!roleId) return;
    var c = getCfg();
    c.roles[roleId] = r;
    saveCfg(c);
  }

  function patPickTemplate(roleId){
    var r = getRoleCfg(roleId);
    var pool = r.tpl && r.tpl.length ? r.tpl : DEFAULT_TPL;
    return String(pool[Math.floor(Math.random() * pool.length)] || '我拍了拍你');
  }

  function patLineHTML(tpl, sender, target){
    var S = escapeHTML(sender || '我');
    var T = escapeHTML(target || '你');
    var body = escapeHTML(String(tpl || ''));
    return body.replace(/我/g, S).replace(/你/g, T);
  }

  function patBuildHTML(fromIsUser, taName, roleId){
    var sender = fromIsUser ? userName() : (taName || 'Ta');
    var target = fromIsUser ? (taName || 'Ta') : userName();
    var tpl = patPickTemplate(roleId || getCurrentRoleId());
    return patLineHTML(tpl, sender, target);
  }

  window.patBuildHTML = patBuildHTML;
  window.patLineHTML = patLineHTML;
  window.getPatRoleCfg = getRoleCfg;

  /* ---------- 后台调度：每个角色各自计时 ---------- */
  var __patTimers = {};
  function scheduleRolePat(roleId){
    if(!roleId) return;
    if(__patTimers[roleId]) clearTimeout(__patTimers[roleId]);
    var r = getRoleCfg(roleId);
    var minMs = r.minMin * 60 * 1000;
    var maxMs = r.maxMin * 60 * 1000;
    var wait = minMs + Math.random() * Math.max(0, maxMs - minMs);
    __patTimers[roleId] = setTimeout(function(){
      var cfg = getRoleCfg(roleId);
      if(Math.random() < (cfg.rate / 100)){
        var role = getRoleById(roleId);
        if(role){
          var taName = (role.remark && String(role.remark).trim()) || role.name || 'Ta';
          var html = patBuildHTML(false, taName, roleId);
          appendMsgToRole(roleId, {
            id: uid(),
            time: Date.now(),
            sys: html,
            pat: true,
            patFromUser: false
          });
        }
      }
      scheduleRolePat(roleId);
    }, wait);
  }
  function scheduleAll(){
    var ids = (typeof getAllRoleIds === 'function') ? getAllRoleIds() : [];
    ids.forEach(function(rid){
      var role = getRoleById(rid);
      if(!role || role.hidden) return;
      scheduleRolePat(rid);
    });
  }
  setTimeout(scheduleAll, 3000);

  /* ---------- 设置面板 ---------- */
  function ensureStyle(){
    if(document.getElementById('patStyles')) return;
    var st = document.createElement('style');
    st.id = 'patStyles';
    st.textContent = `
.pat-mask{position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.42);display:flex;align-items:flex-end;justify-content:center}
.pat-sheet{width:100%;max-width:520px;background:#fff;border-radius:20px 20px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));max-height:88vh;overflow-y:auto;animation:patUp .25s cubic-bezier(.22,1,.36,1);box-sizing:border-box}
@keyframes patUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}
.pat-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.pat-title{font-size:14px;font-weight:600;letter-spacing:3px;text-indent:3px;color:#1a1a1a}
.pat-x{border:none;background:transparent;font-size:16px;color:#bbb;cursor:pointer;font-family:inherit}
.pat-label{font-size:11px;color:#999;letter-spacing:1px;margin:14px 0 6px;display:flex;justify-content:space-between;align-items:center}
.pat-area{width:100%;box-sizing:border-box;border:0.8px solid #e4e4e4;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:12.5px;line-height:1.8;color:#1a1a1a;background:#fbfbfb;outline:none;resize:vertical;min-height:84px}
.pat-area:focus{border-color:#1a1a1a;background:#fff}
.pat-range{width:100%;margin:6px 0 0;accent-color:#1a1a1a}
.pat-num-row{display:flex;gap:10px;align-items:center;font-size:12px;color:#999}
.pat-num{width:64px;border:0.8px solid #e4e4e4;border-radius:8px;padding:6px 8px;text-align:center;font-family:inherit;font-size:13px;color:#1a1a1a;background:#fbfbfb;outline:none}
.pat-actions{display:flex;gap:10px;margin-top:18px}
.pat-primary{flex:1;padding:12px 0;border:none;border-radius:12px;background:#1a1a1a;color:#fff;font-family:inherit;font-size:13px;letter-spacing:3px;cursor:pointer}
.pat-ghost{flex:1;padding:12px 0;border:0.8px solid #ddd;border-radius:12px;background:transparent;font-family:inherit;font-size:13px;letter-spacing:3px;color:#666;cursor:pointer}
.pat-note{font-size:10.5px;color:#bbb;line-height:1.8;margin-top:12px}
.pat-panel-mask{position:fixed;inset:0;z-index:1600;background:rgba(0,0,0,.4);backdrop-filter:blur(2px);display:none;align-items:flex-end;justify-content:center}
.pat-panel-mask.show{display:flex}
.pat-panel{width:100%;max-width:520px;background:#fff;border-radius:20px 20px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));animation:patUp .25s cubic-bezier(.22,1,.36,1);box-sizing:border-box}
.pat-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.pat-panel-title{font-size:15px;font-weight:500;letter-spacing:2px;text-indent:2px;color:#1a1a1a}
.pat-panel-x{border:none;background:transparent;font-size:18px;color:#bbb;cursor:pointer;padding:0;font-family:inherit}
.pat-panel-list{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;max-height:40vh;overflow-y:auto;scrollbar-width:none}
.pat-panel-list::-webkit-scrollbar{display:none}
.pat-panel-btn{display:block;width:100%;text-align:left;padding:14px 16px;border-radius:12px;border:0.7px solid #eee;background:#fafafa;font-size:14px;cursor:pointer;font-family:inherit;color:#1a1a1a}
.pat-panel-btn:active{background:#f0f0f0}
.pat-panel-btn b{color:#1a1a1a;font-weight:500}
.pat-panel-input-row{display:flex;gap:10px;margin-bottom:20px}
.pat-panel-input-row input{flex:1;padding:12px 16px;border-radius:12px;border:0.7px solid #eee;background:#fafafa;font-size:14px;font-family:inherit;outline:none;color:#1a1a1a;box-sizing:border-box}
.pat-panel-input-row button{padding:0 20px;border-radius:12px;border:none;background:#1a1a1a;color:#fff;font-size:14px;font-family:inherit;cursor:pointer;flex:none}
.pat-panel-set{text-align:center;font-size:12px;color:#999;cursor:pointer;padding:10px 0;text-decoration:underline}
`;
    document.head.appendChild(st);
  }

  function linesToArr(s){ return String(s || '').split('\n').map(function(x){ return x.trim(); }).filter(Boolean); }
  function arrToLines(a){ return (a || []).join('\n'); }

  function openPatSettings(){
    ensureStyle();
    var rid = getCurrentRoleId();
    var r = getRoleCfg(rid);
    var roleName = (typeof getRoleNameById === 'function') ? getRoleNameById(rid) : 'Ta';

    var mask = document.createElement('div');
    mask.className = 'pat-mask';
    mask.innerHTML = '<div class="pat-sheet">' +
      '<div class="pat-head"><div class="pat-title">拍 一 拍 · ' + escapeHTML(roleName) + '</div><button class="pat-x" type="button">✕</button></div>' +

      '<div class="pat-label"><span>触发概率（到点摇一次）</span><span id="patRateVal">' + Math.round(r.rate) + '%</span></div>' +
      '<input class="pat-range" id="patRate" type="range" min="0" max="100" step="1" value="' + Math.round(r.rate) + '">' +

      '<div class="pat-label"><span>间隔时长（分钟）</span><span id="patGapVal">' + r.minMin + ' ~ ' + r.maxMin + ' 分钟</span></div>' +
      '<div class="pat-num-row">' +
        '<input class="pat-num" id="patMinMin" type="number" min="1" max="1440" value="' + r.minMin + '">' +
        '<span>到</span>' +
        '<input class="pat-num" id="patMaxMin" type="number" min="1" max="1440" value="' + r.maxMin + '">' +
        '<span>分钟</span>' +
      '</div>' +

      '<div class="pat-label"><span>文案模板（Ta 拍你时用，一行一条）</span></div>' +
      '<textarea class="pat-area" id="patTpl">' + escapeHTML(arrToLines(r.tpl)) + '</textarea>' +

      '<div class="pat-note">「我」自动替换成角色名，「你」自动替换成你的名字；没有「你」的短句只替换「我」。</div>' +

      '<div class="pat-actions">' +
        '<button class="pat-ghost" data-act="cancel" type="button">取消</button>' +
        '<button class="pat-primary" data-act="save" type="button">保 存</button>' +
      '</div>' +
    '</div>';

    document.body.appendChild(mask);
    mask.addEventListener('click', function(e){ if(e.target === mask) mask.remove(); });
    mask.querySelector('.pat-x').onclick = function(){ mask.remove(); };

    var rr = mask.querySelector('#patRate');
    rr.oninput = function(){ mask.querySelector('#patRateVal').textContent = rr.value + '%'; };
    var mn = mask.querySelector('#patMinMin');
    var mx = mask.querySelector('#patMaxMin');
    function updGap(){
      var a = parseInt(mn.value, 10) || 1;
      var b = parseInt(mx.value, 10) || a;
      mask.querySelector('#patGapVal').textContent = a + ' ~ ' + b + ' 分钟';
    }
    mn.oninput = updGap;
    mx.oninput = updGap;

    mask.querySelector('[data-act="cancel"]').onclick = function(){ mask.remove(); };
    mask.querySelector('[data-act="save"]').onclick = function(){
      var next = getRoleCfg(rid);
      next.rate = Math.max(0, Math.min(100, Number(rr.value) || 0));
      var a = Math.max(1, parseInt(mn.value, 10) || 10);
      var b = Math.max(a, parseInt(mx.value, 10) || 60);
      next.minMin = a;
      next.maxMin = b;
      var tpl = linesToArr(mask.querySelector('#patTpl').value);
      next.tpl = tpl.length ? tpl : DEFAULT_TPL.slice();
      saveRoleCfg(rid, next);
      scheduleRolePat(rid);
      mask.remove();
      toast('拍一拍设置已保存');
    };
  }

  function openPatPanel(taName, roleId, fromIsUser){
    ensureStyle();
    var sender = fromIsUser ? userName() : (taName || 'Ta');
    var target = fromIsUser ? (taName || 'Ta') : userName();

    var c = getCfg();
    var myTplList = c.myTpl;

    var mask = document.createElement('div');
    mask.className = 'pat-panel-mask show';

    function renderList(){
      var btnsHTML = myTplList.map(function(tpl, idx){
        var S = escapeHTML(sender);
        var T = escapeHTML(target);
        var body = escapeHTML(String(tpl || '')).replace(/我/g, S).replace(/你/g, T);
        var full = body.indexOf(S) === 0 ? '<b>' + S + '</b>' + body.slice(S.length) : '<b>' + S + '</b> ' + body;
        return '<button class="pat-panel-btn" data-tpl="' + escapeHTML(tpl) + '">' + full + '</button>';
      }).join('');
      mask.querySelector('.pat-panel-list').innerHTML = btnsHTML;
      
      mask.querySelectorAll('.pat-panel-btn').forEach(function(btn){
        btn.onclick = function(){
          close();
          var html = patLineHTML(btn.dataset.tpl, sender, target);
          appendMsgToRole(roleId, {
            id: uid(), time: Date.now(), sys: html, pat: true, patFromUser: !!fromIsUser
          });
        };
      });
    }

    mask.innerHTML = '<div class="pat-panel">' +
      '<div class="pat-panel-head">' +
        '<div class="pat-panel-title">拍 一 拍</div>' +
        '<button class="pat-panel-x" type="button">✕</button>' +
      '</div>' +
      '<div class="pat-panel-list"></div>' +
      '<div class="pat-panel-input-row">' +
        '<input type="text" id="patCustomInput" placeholder="输入新模板并点添加…" maxlength="50">' +
        '<button id="patCustomAdd" type="button">添加</button>' +
      '</div>' +
      '<div class="pat-panel-set" id="patPanelSetBtn">⚙ 拍一拍设置</div>' +
    '</div>';

    document.body.appendChild(mask);
    renderList();

    function close(){ mask.remove(); }

    mask.addEventListener('click', function(e){ if(e.target === mask) close(); });
    mask.querySelector('.pat-panel-x').onclick = close;
    mask.querySelector('#patPanelSetBtn').onclick = function(){
      close();
      openPatSettings();
    };

    mask.querySelector('#patCustomAdd').onclick = function(){
      var inp = mask.querySelector('#patCustomInput');
      var val = inp.value.trim();
      if(!val) return;
      
      var cfg = getCfg();
      if(!cfg.myTpl.includes(val)){
        cfg.myTpl.push(val);
        saveCfg(cfg);
        myTplList = cfg.myTpl;
        renderList();
      }
      inp.value = '';
    };
    mask.querySelector('#patCustomInput').addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); mask.querySelector('#patCustomAdd').click(); }
    });
  }

  window.openPatPanel = openPatPanel;
  window.openPatSettings = openPatSettings;
})();