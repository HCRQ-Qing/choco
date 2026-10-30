/* ===== 气泡通用别名补丁 v2：给 .bubble 补上 message-sent / message-received =====
   这样你上传的 CSS 只要写 .message-sent / .message-received 就能生效。
   而且不会和原有 data-bubble 样式打架。
*/
(function(){
  function tagBubbles(){
    try{
      // 我方消息：加 message-sent / msg-out / msg-bubble
      document.querySelectorAll('#chatList .msg.user').forEach(function(el){
        el.classList.add('msg-out');
      });
      document.querySelectorAll('#chatList .msg.char').forEach(function(el){
        el.classList.add('msg-in');
      });
      document.querySelectorAll('#chatList .bubble').forEach(function(el){
        el.classList.add('msg-bubble');
      });
      // 保留原来的 message-sent / message-received 别名（别人 CSS 可能用这个）
      document.querySelectorAll('#chatList .msg.user .bubble').forEach(function(el){
        el.classList.add('message-sent');
      });
      document.querySelectorAll('#chatList .msg.char .bubble').forEach(function(el){
        el.classList.add('message-received');
      });
    }catch(e){}
  }

  // 页面刚加载
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', tagBubbles);
  }else{
    tagBubbles();
  }

  // 每次聊天列表内容变化后，自动补标
  var list = document.getElementById('chatList');
  if(list && window.MutationObserver){
    var mo = new MutationObserver(function(){
      tagBubbles();
    });
    mo.observe(list, { childList:true, subtree:true });
  }

  window.__tagBubbles = tagBubbles;
})();
