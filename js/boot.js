(function(){
  function kill(){
    var loader = document.getElementById('bootLoader');
    if(loader && loader.parentNode) loader.parentNode.removeChild(loader);
  }
  /* 删掉过渡动画：加载完成即移除启动页，不做淡出。
     ★ 用 DOMContentLoaded 而不是 window.load：
     load 要等所有图片 / 字体下载完，页面才会露出来，会明显变慢；
     DOMContentLoaded 在脚本执行完（聊天已经渲染好）就触发，体感快很多。 */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', kill);
  } else {
    kill();
  }
  /* 点击启动页直接跳过 */
  var loader = document.getElementById('bootLoader');
  if(loader) loader.addEventListener('click', kill);
})();
