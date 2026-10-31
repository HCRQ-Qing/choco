/* ============================================================
   拍一拍 · PAT
   - 模板分三档：公用 / 角色专属 / 单独指定某个人
   - 文案里「我」= 发起者，「你」= 被拍的人（没有「你」就是公用短句）
   - 角色回拍的概率可调，默认 8%
   ============================================================ */
(function(){
  if(window.__patKitReady) return;
  window.__patKitReady = true;

  var CFG_KEY = 'mj_pat_cfg_v1';

  var DEFAULT_PUBLIC = [
    '我拍了拍你',
    '我亲了亲你',
    '我抱了抱你',
    '我摸了摸你的头',
    '我戳了戳你的脸',
    '我牵了牵你的手',
    '我揉了揉你的脸',
    '我靠在你肩膀上',
    '我摸了摸手',
    '我轻轻碰了碰你'
  ];
  var DEFAULT_ROLE = [];
  var DEFAULT_PAIR = {};

  function getCfg(){
    var c = lsGet(CFG_KEY, null);
    if(!c || typeof c !== 'object') c = {};
    if(typeof c.rate !== 'number') c.rate = 8;
    if(!Array.isArray(c.public) || !c.public.length) c.public = DEFAULT_PUBLIC.slice();
    if(!c.role || typeof c.role !== 'object') c.role = {};
    if(!c.pair || typeof c.pair !== 'object') c.pair = {};
    return c;
  }
  function saveCfg(c){ lsSet(CFG_KEY, c); }

  function patRate(){
    var c = getCfg();
    return Math.max(0, Math.min(100, Number(c.rate) || 0));
  }

  /* 抽一条模板：单独指定 > 角色专属 > 公用 */
  function patPickTemplate(fromIsUser, roleId){
    var c = getCfg();
    var pool = null;
    if(fromIsUser){
      /* 我 → 某个角色：优先「单独指定」 */
      var pair = c.pair['user_' + roleId];
      if(Array.isArray(pair) && pair.length) pool = pair;
    } else {
      /* 角色 → 我：优先该角色自己的专属模板 */
      var own = c.role[roleId];
      if(Array.isArray(own) && own.length) pool = own;
    }
    if(!pool || !pool.length) pool = c.public;
    if(!pool || !pool.length) pool = DEFAULT_PUBLIC;
    return String(pool[Math.floor(Math.random() * pool.length)] || '我拍了拍你');
  }

  /* 把模板里的「我 / 你」替换成人名，返回可直接放进 sys html 的字符串 */
  function patLineHTML(tpl, sender, target){
    var S = escapeHTML(sender || '我');
    var T = escapeHTML(target || '你');
    var body = escapeHTML(String(tpl || ''));
    body = body.replace(/我/g, S).replace(/你/g, T);
    if(body.indexOf(S) === 0){
      return '<b>' + S + '</b>' + body.slice(S.length);
    }
    return '<b>' + S + '</b> ' + body;
  }

  /* 给聊天 / 群聊用的统一入口 */
  function patBuildHTML(fromIsUser, taName, roleId){
    var sender = fromIsUser ? userName() : (taName || 'Ta');
    var target = fromIsUser ? (taName || 'Ta') : userName();
    var tpl = patPickTemplate(!!fromIsUser, roleId || getCurrentRoleId());
    return patLineHTML(tpl, sender, target);
  }

  window.patRate = patRate;
  window.patLineHTML = patLineHTML;
  window.patBuildHTML = patBuildHTML;
  window.getPatCfg = getCfg;

  /* ---------- 设置界面 ---------- */
  function ensureStyle(){
    if(document.getElementById('patStyles')) return;
    var st = document.createElement('style');
    st.id = 'patStyles';
    st.textContent = `
.pat-mask{position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.42);display:flex;align-items:flex-end;justify-content:center}
.pat-sheet{width:100%;max-width:520px;background:#fff;border-radius:20px 20px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));max-height:88vh;overflow-y:auto;animation:patUp .25s cubic-bezier(.22,1,.36,1)}
@keyframes patUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}
.pat-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.pat-title{font-size:14px;font-weight:600;letter-spacing:3px;text-indent:3px;color:#1a1a1a}
.pat-x{border:none;background:transparent;font-size:16px;color:#bbb;cursor:pointer;font-family:inherit}
.pat-label{font-size:11px;color:#999;letter-spacing:1px;margin:14px 0 6px;display:flex;justify-content:space-between;align-items:center}
.pat-area{width:100%;box-sizing:border-box;border:0.8px solid #e4e4e4;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:12.5px;line-height:1.8;color:#1a1a1a;background:#fbfbfb;outline:none;resize:vertical;min-height:84px}
.pat-area:focus{border-color:#1a1a1a;background:#fff}
.pat-num{width:64px;border:0.8px solid #e4e4e4;border-radius:8px;padding:6px 8px;text-align:center;font-family:inherit;font-size:13px;color:#1a1a1a;background:#fbfbfb;outline:none}
.pat-select{width:100%;box-sizing:border-box;border:0.8px solid #e4e4e4;border-radius:10px;padding:9px 10px;font-family:inherit;font-size:12.5px;color:#1a1a1a;background:#fbfbfb;outline:none}
.pat-range{width:100%;margin:6px 0 0;accent-color:#1a1a1a}
.pat-actions{display:flex;gap:10px;margin-top:18px}
.pat-primary{flex:1;padding:12px 0;border:none;border-radius:12px;background:#1a1a1a;color:#fff;font-family:inherit;font-size:13px;letter-spacing:3px;cursor:pointer}
.pat-ghost{flex:1;padding:12px 0;border:0.8px solid #ddd;border-radius:12px;background:transparent;font-family:inherit;font-size:13px;letter-spacing:3px;color:#666;cursor:pointer}
.pat-note{font-size:10.5px;color:#bbb;line-height:1.8;margin-top:12px}
`;
    document.head.appendChild(st);
  }

  function linesToArr(s){ return String(s || '').split('\n').map(function(x){ return x.trim(); }).filter(Boolean); }
  function arrToLines(a){ return (a || []).join('\n'); }

  function openPatSettings(){
    ensureStyle();
    var rid = getCurrentRoleId();
    var c = getCfg();
    var roleName = (typeof getRoleNameById === 'function') ? getRoleNameById(rid) : 'Ta';
    var friends = [];
    try{ friends = getFriends() || []; }catch(e){}
    var opts = friends.map(function(f){
      return '<option value="' + escapeHTML(f.id) + '"' + (f.id === rid ? ' selected' : '') + '>' + escapeHTML(displayName(f)) + '</option>';
    }).join('');

    var mask = document.createElement('div');
    mask.className = 'pat-mask';
    mask.innerHTML = '<div class="pat-sheet">' +
      '<div class="pat-head"><div class="pat-title">拍 一 拍</div><button class="pat-x" type="button">✕</button></div>' +

      '<div class="pat-label"><span>角色回拍概率</span><span id="patRateVal">' + Math.round(c.rate) + '%</span></div>' +
      '<input class="pat-range" id="patRate" type="range" min="0" max="100" step="1" value="' + Math.round(c.rate) + '">' +

      '<div class="pat-label"><span>公用模板（所有角色通用，一行一条）</span></div>' +
      '<textarea class="pat-area" id="patPublic">' + escapeHTML(arrToLines(c.public)) + '</textarea>' +

      '<div class="pat-label"><span>专属模板 · ' + escapeHTML(roleName) + '（Ta 拍你时用，一行一条）</span></div>' +
      '<textarea class="pat-area" id="patRole">' + escapeHTML(arrToLines(c.role[rid] || [])) + '</textarea>' +

      '<div class="pat-label"><span>单独指定一个人（你拍 Ta 时用）</span></div>' +
      '<select class="pat-select" id="patPairTarget">' + opts + '</select>' +
      '<textarea class="pat-area" id="patPair" style="margin-top:8px" placeholder="留空 = 使用公用模板">' + escapeHTML(arrToLines(c.pair['user_' + rid] || [])) + '</textarea>' +

      '<div class="pat-note">「我」自动替换成发起者名字，「你」自动替换成被拍的人；没有「你」的短句（如「我摸了摸手」）只显示自己的名字。</div>' +

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

    var pairSel = mask.querySelector('#patPairTarget');
    var pairArea = mask.querySelector('#patPair');
    pairSel.onchange = function(){
      var next = getCfg();
      pairArea.value = arrToLines(next.pair['user_' + pairSel.value] || '');
    };

    mask.querySelector('[data-act="cancel"]').onclick = function(){ mask.remove(); };
    mask.querySelector('[data-act="save"]').onclick = function(){
      var next = getCfg();
      next.rate = Math.max(0, Math.min(100, Number(rr.value) || 0));
      next.public = linesToArr(mask.querySelector('#patPublic').value);
      if(!next.public.length) next.public = DEFAULT_PUBLIC.slice();
      var roleTpl = linesToArr(mask.querySelector('#patRole').value);
      if(roleTpl.length) next.role[rid] = roleTpl;
      else delete next.role[rid];
      var pairTpl = linesToArr(pairArea.value);
      var pairKey = 'user_' + pairSel.value;
      if(pairTpl.length) next.pair[pairKey] = pairTpl;
      else delete next.pair[pairKey];
      saveCfg(next);
      mask.remove();
      toast('拍一拍设置已保存');
    };
  }

  window.openPatSettings = openPatSettings;
})();
