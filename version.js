/* ===== 开屏版本提醒 · 版本号 =====
   每次你更新 index.html，把这个数字 +1（或改成日期）
   用户刷新页面时，如果发现版本号变了，就弹提醒让他再刷新一次。
*/
window.__APP_VERSION__ = '0.1.0';

 

 

 

/* ★ 在"关于"页顶部显示版本号 */
(function bindVersionDisplay(){
  function tryShow(){
    try{
      var el = document.querySelector('#aboutScreen .about-version');
      if(el){
        el.textContent = 'our-dreamland · v' + window.__APP_VERSION__;
      } else {
        setTimeout(tryShow, 500);
      }
    }catch(e){}
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', tryShow);
  } else {
    tryShow();
  }
})();
