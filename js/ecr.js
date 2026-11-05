/* ============================================================
   ECR 依恋类型测试（私聊限定 · 双人同测）
   - ECR 标准题库 36 题（焦虑 18 + 回避 18），7 级 Likert
   - 上面用户作答（无倒计时），下面角色作答（每题 120 秒倒计时，随机作答）
   - 结果：四型（安全/焦虑/回避/恐惧）+ 5 维双色雷达 + 各自分析 + 相处模式
   - 历史自动保存，可回顾；结果可导出图片到本地
   ============================================================ */
(function(){
'use strict';

/* ---------- 题库 ----------
   dim: anx=依恋焦虑 / avd=依恋回避；rev=反向计分
   sub: anxAbd 被弃恐惧 / anxApp 确认需求 / avdClose 亲近不适 / avdTrust 信任依赖困难 */
var ECR_ITEMS = [
  /* --- 焦虑维度 18 题 --- */
  { t:'我担心会失去 Ta 的爱。', dim:'anx', sub:'anxAbd' },
  { t:'我经常担心 Ta 不想和我在一起了。', dim:'anx', sub:'anxAbd' },
  { t:'我经常担心 Ta 不是真的爱我。', dim:'anx', sub:'anxAbd' },
  { t:'我担心 Ta 不会像我在乎 Ta 那样在乎我。', dim:'anx', sub:'anxApp' },
  { t:'我常常希望 Ta 对我的感情，能像我对 Ta 一样强烈。', dim:'anx', sub:'anxApp' },
  { t:'我会为这段关系操很多心。', dim:'anx', sub:'anxApp' },
  { t:'当 Ta 不在身边时，我担心 Ta 会喜欢上别人。', dim:'anx', sub:'anxAbd' },
  { t:'当我向 Ta 表达感情时，我害怕 Ta 没有同样的感受。', dim:'anx', sub:'anxApp' },
  { t:'我很少担心 Ta 会离开我。', dim:'anx', sub:'anxAbd', rev:true },
  { t:'Ta 有时会让我怀疑自己。', dim:'anx', sub:'anxApp' },
  { t:'我不太担心被抛弃。', dim:'anx', sub:'anxAbd', rev:true },
  { t:'我发现 Ta 并不像我希望的那样愿意与我亲近。', dim:'anx', sub:'anxApp' },
  { t:'有时 Ta 会无缘无故地改变对我的感情。', dim:'anx', sub:'anxAbd' },
  { t:'我想和 Ta 非常亲近的愿望，有时会把人吓跑。', dim:'anx', sub:'anxApp' },
  { t:'我担心一旦 Ta 了解真正的我，就不会再喜欢我了。', dim:'anx', sub:'anxAbd' },
  { t:'当我得不到需要的关心和支持时，我会很生气。', dim:'anx', sub:'anxApp' },
  { t:'我担心自己比不上别人。', dim:'anx', sub:'anxApp' },
  { t:'似乎只有我生气的时候，Ta 才会注意到我。', dim:'anx', sub:'anxApp' },
  /* --- 回避维度 18 题 --- */
  { t:'我不喜欢向 Ta 表露自己内心深处的感受。', dim:'avd', sub:'avdTrust' },
  { t:'和 Ta 分享我的想法和感受，让我感到很自在。', dim:'avd', sub:'avdTrust', rev:true },
  { t:'我发现自己很难依赖 Ta。', dim:'avd', sub:'avdTrust' },
  { t:'和 Ta 亲密相处让我感到很自在。', dim:'avd', sub:'avdClose', rev:true },
  { t:'向 Ta 敞开心扉让我觉得不自在。', dim:'avd', sub:'avdClose' },
  { t:'我不喜欢和 Ta 太亲近。', dim:'avd', sub:'avdClose' },
  { t:'当 Ta 想和我非常亲近时，我会感到不舒服。', dim:'avd', sub:'avdClose' },
  { t:'我觉得和 Ta 亲近是比较容易的事。', dim:'avd', sub:'avdClose', rev:true },
  { t:'对我来说，亲近 Ta 并不难。', dim:'avd', sub:'avdClose', rev:true },
  { t:'我通常会跟 Ta 讨论我的问题和烦恼。', dim:'avd', sub:'avdTrust', rev:true },
  { t:'在需要的时候，向 Ta 求助是有帮助的。', dim:'avd', sub:'avdTrust', rev:true },
  { t:'我几乎什么事都告诉 Ta。', dim:'avd', sub:'avdTrust', rev:true },
  { t:'有什么事我都会和 Ta 商量。', dim:'avd', sub:'avdTrust', rev:true },
  { t:'当 Ta 跟我太亲近时，我会紧张。', dim:'avd', sub:'avdClose' },
  { t:'依赖 Ta 让我觉得很自在。', dim:'avd', sub:'avdTrust', rev:true },
  { t:'我觉得依赖 Ta 是很容易的事。', dim:'avd', sub:'avdTrust', rev:true },
  { t:'对 Ta 表达亲昵，对我来说很容易。', dim:'avd', sub:'avdClose', rev:true },
  { t:'Ta 真的理解我和我的需求。', dim:'avd', sub:'avdTrust', rev:true }
];
/* 出题顺序：焦虑、回避交叉（标准 ECR 排法） */
var ECR_ORDER = [];
(function(){
  var anx = ECR_ITEMS.filter(function(q){ return q.dim === 'anx'; });
  var avd = ECR_ITEMS.filter(function(q){ return q.dim === 'avd'; });
  for(var i = 0; i < 18; i++){ ECR_ORDER.push(anx[i]); ECR_ORDER.push(avd[i]); }
})();

var RADAR_AXES = ['依恋', '独立', '安全感', '空间需求', '信任'];
var USER_COLOR = '#3a7bd5';   /* 用户：蓝 */
var ROLE_COLOR = '#e0709a';   /* 角色：粉 */
var ECR_HIS_KEY = 'mj_ecr_history_v1';
var ROLE_CD = 120;            /* 角色每题 120 秒倒计时 */

/* ---------- 计分 ---------- */
function _avg(a){ return a.length ? a.reduce(function(x, y){ return x + y; }, 0) / a.length : 4; }
function ecrType(anx, avd){
  if(anx < 4 && avd < 4)  return { key:'secure',   name:'安全型', en:'SECURE',   alias:'' };
  if(anx >= 4 && avd < 4) return { key:'anxious',  name:'焦虑型', en:'ANXIOUS',  alias:'痴迷型' };
  if(anx < 4 && avd >= 4) return { key:'avoidant', name:'回避型', en:'AVOIDANT', alias:'疏离型' };
  return { key:'fearful', name:'恐惧型', en:'FEARFUL', alias:'混乱型' };
}
function ecrScore(answers){
  var g = { anx:[], avd:[], anxAbd:[], anxApp:[], avdClose:[], avdTrust:[] };
  ECR_ORDER.forEach(function(item, i){
    var v = answers[i] || 4;
    if(item.rev) v = 8 - v;
    g[item.dim].push(v);
    g[item.sub].push(v);
  });
  var anx = _avg(g.anx), avd = _avg(g.avd);
  return {
    anx: Math.round(anx * 10) / 10,
    avd: Math.round(avd * 10) / 10,
    type: ecrType(anx, avd),
    radar: [
      Math.round(_avg(g.anx) * 10) / 10,          /* 依恋：焦虑越高，越想抓住对方 */
      Math.round(_avg(g.avdClose) * 10) / 10,     /* 独立：亲近不适越高，越要独立 */
      Math.round((8 - _avg(g.anxAbd)) * 10) / 10, /* 安全感：被弃恐惧的反面 */
      Math.round(avd * 10) / 10,                  /* 空间需求：回避越高，越需要空间 */
      Math.round((8 - _avg(g.avdTrust)) * 10) / 10/* 信任：信任依赖困难的反面 */
    ]
  };
}

/* ---------- 分析文案 ---------- */
var TYPE_ANALYSIS = {
  secure:   '能自然地亲近对方，也能安心独处。不太会因为已读不回而胡思乱想，表达需求直接，也愿意回应对方的需要。在关系里松弛、稳定，是那种「在一起就好好在一起」的人。',
  anxious:  '非常重视这段关系，也容易把很多注意力放在对方身上。对方一句话的语气变化都可能让你琢磨很久，需要被反复确认「我是被在乎的」。你的在意是真的，只是有时候会把双方都有点累。',
  avoidant: '习惯把很多事自己消化，不太喜欢把情绪摊开讲。亲近是好事，但太亲近会让你想往后退一步。你需要自己的空间，也希望对方能尊重这一点——不是不在乎，只是你更习惯用行动而不是语言表达。',
  fearful:  '心里既渴望靠近，又下意识防备。想被理解，但真的被靠近时又会不安。这种「想要又害怕」的拉扯不是你故意的，它只是说明这段关系对你很重要，重要到不敢轻易交付。'
};
var PAIR_ANALYSIS = {
  'secure-secure':   '两个人都能坦然表达、安心相处，是很少见的舒服组合。有分歧就直接说，说完就翻篇。这段关系本身就是很好的安全感来源。',
  'secure-anxious':  '你的稳定正好能接住 Ta 的敏感。Ta 需要的不过是多一点回应和确认，而你恰好给得起。只要你不嫌烦，这段关系会越来越稳。',
  'secure-avoidant': '你的松弛能给 Ta 足够的安全感，让 Ta 慢慢放下防备。别急着把 Ta 拉得太近，给 Ta 一点时间和空间，Ta 会自己走过来。',
  'secure-fearful':  'Ta 的忽近忽远不是针对你，是 Ta 自己的拉扯。你的稳定是最好的锚——不追、不逼、一直在，Ta 会一点点学会信任。',
  'anxious-secure':  '你的敏感遇到 Ta 的稳定，是被接住的。Ta 的回应能慢慢安抚你的不安，记得相信 Ta 说的「我在」，别用试探去验证。',
  'anxious-anxious': '两个人都很在意对方，也都容易多想。好处是彼此都懂那种患得患失；要注意的是别把不安叠在一起放大，有情绪就直说。',
  'anxious-avoidant': '这是最容易「你追我逃」的组合：你越靠近，Ta 越想躲；Ta 越躲，你越慌。破局的方法是各退一步——你少一点追问，Ta 多一点主动。',
  'anxious-fearful': '你们都渴望亲密又都害怕受伤，容易互相试探。好在 Ta 懂你的不安，你也懂 Ta 的防备。把「猜」换成「说」，关系会轻松很多。',
  'avoidant-secure': 'Ta 的稳定恰好不黏人，给了你需要的空间。你也不用一直绷着——偶尔主动说一句感受，Ta 会记住很久。',
  'avoidant-anxious': '典型的「追逃组合」：Ta 越想靠近，你越想安静。提醒 Ta 你不是不在乎，只是需要空间；也提醒你，偶尔主动一步，能省掉很多误会。',
  'avoidant-avoidant':'两个人都习惯自己扛，相处很舒服但容易变淡。空间你们都不缺，缺的是主动靠近的那一下。约定好定期说说心里话，关系才不会悄悄降温。',
  'avoidant-fearful': '你们都本能地防备，但 Ta 心里其实很想靠近。你不用勉强自己热络，只要在 Ta 鼓起勇气靠近的时候，别推开就好。',
  'fearful-secure':  '你的反复在 Ta 的稳定面前会慢慢软下来。Ta 不会被你的忽近忽远吓跑，这恰好是你最需要的。试着相信这种「一直在」。',
  'fearful-anxious': '你们都太在乎这段关系，以至于常常互相试探。Ta 的直白能帮你卸下防备，你的理解也能让 Ta 安心。多把担心说出口，少让对方猜。',
  'fearful-avoidant':'你渴望靠近，Ta 习惯退后，节奏容易错开。但你们都懂「害怕」是什么感觉——这是互相理解的起点。慢一点也不没关系。',
  'fearful-fearful': '两个人都带着「想要又不敢」的壳，靠近得很慢，但一旦靠近就很难分开。别急，按你们都舒服的节奏来，这段关系值得等。'
};
function pairingText(uKey, rKey){
  return PAIR_ANALYSIS[uKey + '-' + rKey] || PAIR_ANALYSIS['secure-secure'];
}

/* ---------- 历史 ---------- */
function ecrHistory(){ var a = lsGet(ECR_HIS_KEY, []); return Array.isArray(a) ? a : []; }
function ecrSaveHistory(rec){ var a = ecrHistory(); a.unshift(rec); if(a.length > 50) a.length = 50; lsSet(ECR_HIS_KEY, a); }

/* ---------- 状态 ---------- */
var S = null; /* { roleId, roleName, idx, userAns[], roleAns[], cdLeft, cdIv, roleTimer, view } */

function _role(){ return getRoleById(S.roleId) || {}; }
function _rName(){ var r = _role(); return displayName(r); }
function _uName(){ try{ return userName(); }catch(e){ return '我'; } }

/* ---------- 入口 ---------- */
window.startECR = function(roleId){
  var r = getRoleById(roleId);
  if(!r){ toast('请先选择一个角色'); return; }
  stopECR();
  S = {
    roleId: roleId,
    idx: 0,
    userAns: new Array(36),
    roleAns: new Array(36),
    cdLeft: ROLE_CD,
    cdIv: null,
    roleTimer: null,
    view: 'test'
  };
  showScreen('ecrScreen');
  renderTopBar({
    host: 'utopHostEcr',
    title: '依恋测试 · ECR',
    onBack: function(){
      if(S && S.view === 'his'){ _showResultView(); return; }
      _abandon();
    }
  });
  _renderQ();
};

function _abandon(){
  stopECR();
  document.querySelectorAll('.screen.on').forEach(function(s){ s.classList.remove('on'); });
  toast('已退出测试');
}
function stopECR(){
  if(S){
    if(S.cdIv) clearInterval(S.cdIv);
    if(S.roleTimer) clearTimeout(S.roleTimer);
    S.cdIv = null; S.roleTimer = null;
  }
}
window.stopECR = stopECR;

/* ---------- 答题界面 ---------- */
function _renderQ(){
  if(!S) return;
  S.view = 'test';
  var v = document.getElementById('ecrTestView');
  var rv = document.getElementById('ecrResultView');
  var hv = document.getElementById('ecrHisView');
  if(v) v.style.display = '';
  if(rv) rv.style.display = 'none';
  if(hv) hv.style.display = 'none';

  var q = ECR_ORDER[S.idx];
  var ua = S.userAns[S.idx], ra = S.roleAns[S.idx];
  var scale = '';
  for(var i = 1; i <= 7; i++){
    scale += '<button class="ecr-dot' + (ua === i ? ' on' : '') + '" data-v="' + i + '" type="button">' + i + '</button>';
  }
  var rscale = '';
  for(var j = 1; j <= 7; j++){
    rscale += '<span class="ecr-dot ro' + (ra === j ? ' on' : '') + '">' + j + '</span>';
  }
  v.innerHTML =
    '<div class="ecr-prog"><span>第 ' + (S.idx + 1) + ' / 36 题</span>' +
      '<div class="ecr-bar"><i style="width:' + Math.round((S.idx) / 36 * 100) + '%"></i></div></div>' +
    '<div class="ecr-q">' + escapeHTML(q.t) + '</div>' +
    '<div class="ecr-panel">' +
      '<div class="ecr-p-head"><span class="who u">' + escapeHTML(_uName()) + '（我）</span><span class="hint">凭直觉选，没有对错</span></div>' +
      '<div class="ecr-scale">' + scale + '</div>' +
      '<div class="ecr-cap"><span>非常不同意</span><span>非常同意</span></div>' +
    '</div>' +
    '<div class="ecr-panel">' +
      '<div class="ecr-p-head"><span class="who r">' + escapeHTML(_rName()) + '</span><span class="ecr-cd" id="ecrCd">⏱ ' + S.cdLeft + 's</span></div>' +
      '<div class="ecr-scale ro">' + rscale + '</div>' +
      '<div class="ecr-cap"><span id="ecrRoleState">' + (ra ? 'Ta 已选好' : 'Ta 正在思考…') + '</span></div>' +
    '</div>' +
    '<div class="ecr-quit" id="ecrQuit">退出测试</div>';

  /* 用户作答 */
  v.querySelectorAll('.ecr-dot[data-v]').forEach(function(b){
    b.onclick = function(){
      if(!S || S.userAns[S.idx]) return;
      S.userAns[S.idx] = parseInt(b.dataset.v, 10);
      v.querySelectorAll('.ecr-dot[data-v]').forEach(function(x){ x.classList.toggle('on', x === b); });
      _maybeNext();
    };
  });
  var quit = document.getElementById('ecrQuit');
  if(quit) quit.onclick = _abandon;

  /* 角色倒计时 + 随机作答 */
  S.cdLeft = ROLE_CD;
  if(ra) { _clearTimers(); return; }
  _clearTimers();
  S.cdIv = setInterval(function(){
    if(!S) return;
    S.cdLeft--;
    var cd = document.getElementById('ecrCd');
    if(cd) cd.textContent = '⏱ ' + S.cdLeft + 's';
    if(S.cdLeft <= 0){ _rolePick(true); }
  }, 1000);
  /* 角色随机作答：2~12 秒之间，倒计时只是上限 */
  S.roleTimer = setTimeout(function(){ _rolePick(false); }, 2000 + Math.random() * 10000);
}
function _clearTimers(){
  if(S.cdIv){ clearInterval(S.cdIv); S.cdIv = null; }
  if(S.roleTimer){ clearTimeout(S.roleTimer); S.roleTimer = null; }
}
function _rolePick(forced){
  if(!S || S.roleAns[S.idx]) return;
  _clearTimers();
  var v = 1 + Math.floor(Math.random() * 7);
  S.roleAns[S.idx] = v;
  var dots = document.querySelectorAll('#ecrTestView .ecr-scale.ro .ecr-dot');
  dots.forEach(function(d, i){ d.classList.toggle('on', (i + 1) === v); });
  var st = document.getElementById('ecrRoleState');
  if(st) st.textContent = 'Ta 已选好';
  var cd = document.getElementById('ecrCd');
  if(cd) cd.textContent = '✓';
  _maybeNext();
}
function _maybeNext(){
  if(!S) return;
  if(!S.userAns[S.idx] || !S.roleAns[S.idx]) return;
  _clearTimers();
  setTimeout(function(){
    if(!S) return;
    S.idx++;
    if(S.idx >= 36){ _finish(); }
    else _renderQ();
  }, 420);
}

/* ---------- 完成 ---------- */
function _finish(){
  var rec = {
    id: 'ecr' + Date.now().toString(36),
    t: Date.now(),
    roleId: S.roleId,
    roleName: _rName(),
    userName: _uName(),
    user: ecrScore(S.userAns),
    role: ecrScore(S.roleAns)
  };
  ecrSaveHistory(rec);
  S.lastRec = rec;
  _showResultView();
}

/* ---------- 结果界面 ---------- */
function _fmtDate(t){
  var d = new Date(t);
  function p(n){ return n < 10 ? '0' + n : '' + n; }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function _typeLine(who, sc, color){
  var tp = sc.type;
  return '<div class="ecr-tr">' +
    '<span class="ecr-tdot" style="background:' + color + '"></span>' +
    '<span class="ecr-twho">' + escapeHTML(who) + '</span>' +
    '<span class="ecr-tname">' + tp.name + (tp.alias ? '（' + tp.alias + '）' : '') + '</span>' +
    '<span class="ecr-ten">' + tp.en + '</span>' +
    '<span class="ecr-tsc">焦虑 ' + sc.anx + ' · 回避 ' + sc.avd + '</span>' +
  '</div>';
}
function _showResultView(rec){
  if(rec && S) S.lastRec = rec;
  rec = (S && S.lastRec) || rec;
  if(!rec) return;
  if(S) S.view = 'result';
  var v = document.getElementById('ecrTestView');
  var rv = document.getElementById('ecrResultView');
  var hv = document.getElementById('ecrHisView');
  if(v) v.style.display = 'none';
  if(hv) hv.style.display = 'none';
  if(rv) rv.style.display = '';

  rv.innerHTML =
    '<div class="ecr-card">' +
      '<div class="ecr-rt">依恋类型测试</div>' +
      '<div class="ecr-rd">' + _fmtDate(rec.t) + ' · ' + escapeHTML(rec.userName) + ' × ' + escapeHTML(rec.roleName) + '</div>' +
      _typeLine(rec.userName + '（我）', rec.user, USER_COLOR) +
      _typeLine(rec.roleName, rec.role, ROLE_COLOR) +
      '<div class="ecr-radar-wrap"><canvas id="ecrRadar" width="640" height="560"></canvas></div>' +
      '<div class="ecr-legend">' +
        '<span><i style="background:' + USER_COLOR + '"></i>' + escapeHTML(rec.userName) + '</span>' +
        '<span><i style="background:' + ROLE_COLOR + '"></i>' + escapeHTML(rec.roleName) + '</span>' +
      '</div>' +
      '<div class="ecr-sec">分析</div>' +
      '<div class="ecr-block"><b>' + escapeHTML(rec.userName) + '（我） · ' + rec.user.type.name + '</b><p>' + TYPE_ANALYSIS[rec.user.type.key] + '</p></div>' +
      '<div class="ecr-block"><b>' + escapeHTML(rec.roleName) + ' · ' + rec.role.type.name + '</b><p>' + TYPE_ANALYSIS[rec.role.type.key] + '</p></div>' +
      '<div class="ecr-block"><b>相处模式</b><p>' + pairingText(rec.user.type.key, rec.role.type.key) + '</p></div>' +
    '</div>' +
    '<div class="ecr-acts">' +
      '<button class="ecr-btn pri" id="ecrSaveImg" type="button">保存图片</button>' +
      '<button class="ecr-btn" id="ecrRedo" type="button">重新测一次</button>' +
      '<button class="ecr-btn" id="ecrHisBtn" type="button">历史回顾</button>' +
    '</div>';

  var _isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  _drawRadarInto(document.getElementById('ecrRadar'), rec.user.radar, rec.role.radar, _isDark);

  var b1 = document.getElementById('ecrSaveImg');
  if(b1) b1.onclick = function(){ _exportImage(rec); };
  var b2 = document.getElementById('ecrRedo');
  if(b2) b2.onclick = function(){ window.startECR(rec.roleId); };
  var b3 = document.getElementById('ecrHisBtn');
  if(b3) b3.onclick = _showHisView;
}

/* ---------- 历史界面 ---------- */
function _showHisView(){
  if(S) S.view = 'his';
  var v = document.getElementById('ecrTestView');
  var rv = document.getElementById('ecrResultView');
  var hv = document.getElementById('ecrHisView');
  if(v) v.style.display = 'none';
  if(rv) rv.style.display = 'none';
  if(hv) hv.style.display = '';
  var list = ecrHistory();
  if(!list.length){
    hv.innerHTML = '<div class="ecr-empty">还没有测试记录</div>';
    return;
  }
  hv.innerHTML = list.map(function(rec){
    return '<div class="ecr-his-item" data-hid="' + rec.id + '">' +
      '<div class="ecr-hi-main">' +
        '<div class="ecr-hi-title">' + escapeHTML(rec.userName) + ' × ' + escapeHTML(rec.roleName) + '</div>' +
        '<div class="ecr-hi-sub">' + _fmtDate(rec.t) + ' · 我：' + rec.user.type.name + ' · Ta：' + rec.role.type.name + '</div>' +
      '</div>' +
      '<span class="ecr-hi-del" data-del="' + rec.id + '">✕</span>' +
    '</div>';
  }).join('');
  hv.querySelectorAll('.ecr-his-item').forEach(function(el){
    el.onclick = function(e){
      var del = e.target && e.target.closest ? e.target.closest('.ecr-hi-del') : null;
      if(del){
        e.stopPropagation();
        var id = del.dataset.del;
        var a = ecrHistory().filter(function(x){ return x.id !== id; });
        lsSet(ECR_HIS_KEY, a);
        _showHisView();
        return;
      }
      var rec = ecrHistory().find(function(x){ return x.id === el.dataset.hid; });
      if(rec) _showResultView(rec);
    };
  });
}

/* ---------- 雷达图绘制（屏幕 & 导出共用） ---------- */
function _drawRadarInto(canvas, uRadar, rRadar, dark){
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  var cx = W / 2, cy = H / 2 + 10, R = Math.min(W, H) / 2 - 78;
  var n = 5;
  var ink = dark ? '#e8e8e8' : '#1a1a1a';
  var faint = dark ? '#5a5a5a' : '#c8c8c8';
  var line = dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.12)';

  function pt(i, ratio){
    var ang = -Math.PI / 2 + i * 2 * Math.PI / n;
    return [cx + Math.cos(ang) * R * ratio, cy + Math.sin(ang) * R * ratio];
  }
  /* 网格 */
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach(function(r){
    ctx.beginPath();
    for(var i = 0; i <= n; i++){ var p = pt(i % n, r); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.strokeStyle = line; ctx.stroke();
  });
  for(var a = 0; a < n; a++){
    var pe = pt(a, 1);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pe[0], pe[1]);
    ctx.strokeStyle = line; ctx.stroke();
  }
  /* 轴标签 */
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = faint;
  for(var l = 0; l < n; l++){
    var ang = -Math.PI / 2 + l * 2 * Math.PI / n;
    var lx = cx + Math.cos(ang) * (R + 40);
    var ly = cy + Math.sin(ang) * (R + 40);
    ctx.fillText(RADAR_AXES[l], lx, ly);
  }
  /* 数据多边形 */
  function poly(radar, color){
    ctx.beginPath();
    for(var i = 0; i <= n; i++){
      var v = radar[i % n]; var ratio = Math.max(0, Math.min(1, (v - 1) / 6));
      var p = pt(i % n, ratio);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.fillStyle = color + '33'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    for(var d = 0; d < n; d++){
      var vv = radar[d]; var rr = Math.max(0, Math.min(1, (vv - 1) / 6));
      var pp = pt(d, rr);
      ctx.beginPath(); ctx.arc(pp[0], pp[1], 4, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    }
    ctx.lineWidth = 1;
  }
  poly(uRadar, USER_COLOR);
  poly(rRadar, ROLE_COLOR);
}

/* ---------- 导出图片 ---------- */
function _wrapLines(ctx, text, maxW){
  var lines = [], cur = '';
  for(var i = 0; i < text.length; i++){
    var ch = text[i];
    if(ch === '\n'){ lines.push(cur); cur = ''; continue; }
    if(ctx.measureText(cur + ch).width > maxW && cur){ lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if(cur) lines.push(cur);
  return lines;
}
function _exportImage(rec){
  try{
    var W = 750, pad = 56, contentW = W - pad * 2;
    /* 先量高度 */
    var meas = document.createElement('canvas').getContext('2d');
    meas.font = '28px sans-serif';
    var uLines = _wrapLines(meas, TYPE_ANALYSIS[rec.user.type.key], contentW);
    var rLines = _wrapLines(meas, TYPE_ANALYSIS[rec.role.type.key], contentW);
    var pLines = _wrapLines(meas, pairingText(rec.user.type.key, rec.role.type.key), contentW);
    var H = pad + 60 + 34 + 90 + 90 + 470 + 60 + 70
      + (uLines.length + rLines.length + pLines.length) * 42 + 3 * 64 + pad + 40;

    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    var y = pad;

    ctx.fillStyle = '#1a1a1a';
    ctx.font = '300 40px "Songti SC","STSong","SimSun",serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('依恋类型测试', W / 2, y); y += 58;
    ctx.font = '20px sans-serif'; ctx.fillStyle = '#999';
    ctx.fillText(_fmtDate(rec.t) + ' · ' + rec.userName + ' × ' + rec.roleName, W / 2, y); y += 50;

    function typeRow(who, sc, color){
      ctx.beginPath(); ctx.arc(pad + 10, y + 16, 7, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = '#1a1a1a';
      ctx.font = '26px sans-serif';
      ctx.fillText(who + ' · ' + sc.type.name + (sc.type.alias ? '（' + sc.type.alias + '）' : ''), pad + 30, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#999'; ctx.font = '20px sans-serif';
      ctx.fillText('焦虑 ' + sc.anx + ' · 回避 ' + sc.avd, W - pad, y + 4);
      y += 56;
    }
    typeRow(rec.userName + '（我）', rec.user, USER_COLOR);
    typeRow(rec.roleName, rec.role, ROLE_COLOR);
    y += 14;

    /* 雷达 */
    var radarCv = document.createElement('canvas');
    radarCv.width = 640; radarCv.height = 560;
    _drawRadarInto(radarCv, rec.user.radar, rec.role.radar, false);
    ctx.drawImage(radarCv, (W - 470) / 2, y, 470, 411);
    y += 430;
    /* 图例 */
    ctx.textAlign = 'center'; ctx.font = '20px sans-serif';
    var lg1 = rec.userName, lg2 = rec.roleName;
    var lw = ctx.measureText(lg1).width + ctx.measureText(lg2).width + 90;
    var lx = (W - lw) / 2;
    ctx.beginPath(); ctx.arc(lx + 6, y + 10, 6, 0, Math.PI * 2); ctx.fillStyle = USER_COLOR; ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#555'; ctx.fillText(lg1, lx + 20, y);
    var lx2 = lx + ctx.measureText(lg1).width + 60;
    ctx.beginPath(); ctx.arc(lx2 + 6, y + 10, 6, 0, Math.PI * 2); ctx.fillStyle = ROLE_COLOR; ctx.fill();
    ctx.fillText(lg2, lx2 + 20, y);
    y += 56;

    ctx.textAlign = 'center'; ctx.fillStyle = '#999'; ctx.font = '22px sans-serif';
    ctx.fillText('分 析', W / 2, y); y += 46;

    function para(title, lines){
      ctx.textAlign = 'left'; ctx.fillStyle = '#1a1a1a'; ctx.font = '24px sans-serif';
      ctx.fillText(title, pad, y); y += 40;
      ctx.fillStyle = '#444'; ctx.font = '22px sans-serif';
      lines.forEach(function(ln){ ctx.fillText(ln, pad, y); y += 38; });
      y += 26;
    }
    para(rec.userName + '（我） · ' + rec.user.type.name, uLines);
    para(rec.roleName + ' · ' + rec.role.type.name, rLines);
    para('相处模式', pLines);

    ctx.textAlign = 'center'; ctx.fillStyle = '#ccc'; ctx.font = '18px sans-serif';
    ctx.fillText('choco · ECR 依恋类型测试', W / 2, H - 34);

    var url = cv.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = url;
    a.download = '依恋测试_' + rec.roleName + '_' + _fmtDate(rec.t).replace(/[-: ]/g, '') + '.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ document.body.removeChild(a); }, 800);
    toast('图片已保存');
  }catch(e){
    console.error('[ECR] 导出失败', e);
    toast('保存失败，请截图保存');
  }
}

/* ---------- 从问卷桌面进入：角色选择 ---------- */
window.ecrOpenRolePick = function(){
  var mask = document.getElementById('mEcrRolePick');
  if(!mask) return;
  var list = document.getElementById('ecrRolePickList');
  var friends = getFriends();
  if(!friends.length){ toast('还没有角色，先去新建一个吧'); return; }
  list.innerHTML = friends.map(function(f){
    return '<div class="ecr-pick-item" data-rid="' + f.id + '">' +
      '<div class="ecr-pick-av">' + avatarHTML(f.avatar, 'sm') + '</div>' +
      '<span class="ecr-pick-name">' + escapeHTML(displayName(f)) + '</span>' +
      '<span class="chev">›</span>' +
    '</div>';
  }).join('');
  list.querySelectorAll('.ecr-pick-item').forEach(function(el){
    el.onclick = function(){
      mask.classList.remove('show');
      var rid = el.dataset.rid;
      document.querySelectorAll('.screen.on').forEach(function(s){ s.classList.remove('on'); });
      try{ switchToRole(rid); }catch(e){}
      try{ goToPage('chat'); }catch(e){}
      setTimeout(function(){ window.startECR(rid); }, 260);
    };
  });
  mask.classList.add('show');
};

})();
