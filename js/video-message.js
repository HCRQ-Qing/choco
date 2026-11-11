/* 文件：js/video-message.js */
(function(){
  'use strict';

  if(window.VideoMsg) return;

  function esc(s){
    if(s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function platformClass(p){
    var s = String(p || '').toLowerCase();
    if(s === 'douyin') return 'douyin';
    if(s === 'xhs' || s === 'xiaohongshu') return 'xhs';
    if(s === 'kuaishou') return 'kuaishou';
    if(s === 'youtube') return 'youtube';
    return '';
  }

  function buildCardHTML(vc){
    if(!vc || !vc.url) return '';
    var pc = platformClass(vc.platform);
    var pName = String(vc.platformName || '链接').replace(/视频|图文/g, '');
    var title = vc.title || pName || '视频';
    if(title === '小红书视频' || title === '抖音视频' || title === 'B站视频') title = pName;
    
    return '<div class="video-card vCard3" data-vcurl="' + esc(vc.url) + '">' +
      '<div class="vc-head">' +
        '<span class="vc-platform ' + pc + '">' + esc(vc.platformIcon || '🔗') + ' ' + esc(pName) + '</span>' +
      '</div>' +
      '<div class="vc-title">' + esc(title) + '</div>' +
      '<div class="vc-foot"><span>点击打开 ›</span></div>' +
    '</div>';
  }

  var _bound = {};
  function bindList(list){
    if(!list || !list.id) return;
    if(_bound[list.id]) return;
    _bound[list.id] = true;
    list.addEventListener('click', function(e){
      var card = e.target.closest && e.target.closest('.video-card');
      if(!card) return;
      if(!list.contains(card)) return;
      e.preventDefault();
      e.stopPropagation();
      var url = card.getAttribute('data-vcurl') || '';
      if(!/^https?:\/\//i.test(url)){
        if(typeof toast === 'function') toast('这条视频没有有效链接');
        return;
      }
      window.open(url, '_blank');
    }, true);
  }
  function bindClickDelegation(){
    bindList(document.getElementById('chatList'));
    bindList(document.getElementById('gchList'));
  }

  function saveToRole(roleId, msg){
    if(!roleId || !msg) return '';
    if(typeof appendMsgToRole === 'function'){
      return appendMsgToRole(roleId, msg);
    }
    var key = 'mj_msgs_' + roleId;
    var arr = [];
    try{ arr = JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){ arr = []; }
    if(!Array.isArray(arr)) arr = [];
    arr.push(msg);
    try{ localStorage.setItem(key, JSON.stringify(arr)); }catch(e){}
    return msg.id || '';
  }

  window.VideoMsg = {
    buildCardHTML: buildCardHTML,
    bindClickDelegation: bindClickDelegation,
    saveToRole: saveToRole
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindClickDelegation);
  } else {
    bindClickDelegation();
  }
})();