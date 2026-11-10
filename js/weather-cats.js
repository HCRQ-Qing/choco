/* ============================================================
   天气分类表 · 全站唯一来源
   谁在用：
     - video-pool.js → 建 g-weather 时从 WEATHER_CATS 读分类
     - app.js        → 抽卡时用 weatherCodeToCatId() 翻译
   以后加分类 / 改映射，只改这一个文件。
   ============================================================ */
(function(){
  if(window.__weatherCatsReady) return;
  window.__weatherCatsReady = true;

  /* 16 个分类
     id     跟 cardStore 里 g-weather.cats[].id 对齐
     name   用天气预报的原词
     list   默认字卡，只在分类为空时补，不动用户已加的
     legacy 老的“雨”大类，保留数据、不参与抽卡 */
  var WEATHER_CATS = [
    { id:'cw-cold',       name:'冷',      legacy:false, list:[] },
    { id:'cw-cool',       name:'凉',      legacy:false, list:[] },
    { id:'cw-comfort',    name:'舒适',    legacy:false, list:[] },
    { id:'cw-warm',       name:'热',      legacy:false, list:[] },
    { id:'cw-hot',        name:'高温',    legacy:false, list:[] },
    { id:'cw-drop',       name:'突然变凉',legacy:false, list:[] },
    { id:'cw-rise',       name:'突然升温',legacy:false, list:[] },
    { id:'cw-cloudy',     name:'多云',    legacy:false, list:[] },
    { id:'cw-overcast',   name:'阴',      legacy:false, list:[] },
    { id:'cw-rain-light', name:'小雨',    legacy:false, list:[] },
    { id:'cw-rain-mid',   name:'中雨',    legacy:false, list:[] },
    { id:'cw-rain-heavy', name:'大雨',    legacy:false, list:[] },
    { id:'cw-rain-storm', name:'暴雨',    legacy:false, list:[] },
    { id:'cw-thunder',    name:'雷阵雨',  legacy:false, list:[] },
    { id:'cw-snow-light', name:'小雪',    legacy:false, list:[] },
    { id:'cw-snow-mid',   name:'中雪',    legacy:false, list:[] },
    { id:'cw-snow-heavy', name:'大雪',    legacy:false, list:[] },
    { id:'cw-fog',        name:'雾',      legacy:false, list:[] },
    { id:'cw-wind',       name:'大风',    legacy:false, list:[] },
    { id:'cw-storm',      name:'台风暴雨',legacy:false, list:[] },
    { id:'cw-rain',       name:'雨（旧）', legacy:true,  list:[] },
    { id:'cw-sunny',      name:'晴（旧）', legacy:true,  list:[] }
  ];

  /* 天气代码 → 分类 id
     code  WMO 天气代码
     temp  摄氏温度（没有就传 null）
     wind  风速 m/s（没有就传 null）
     优先级：台风暴雨 > 高温 > 代码表
     legacy 分类永远不会被返回 */
  function weatherCatIdsOf(code, temp, wind, prevTemp){
    var c = Number(code);
    var t = (typeof temp === 'number') ? temp : null;
    var w = (typeof wind === 'number') ? wind : null;
    var p = (typeof prevTemp === 'number') ? prevTemp : null;
    var ids = [];

    function pushTempCat(){
      if(t === null) return;
      if(t < 0)        ids.push('cw-cold');
      else if(t < 15)  ids.push('cw-cool');
      else if(t < 26)  ids.push('cw-comfort');
      else if(t < 35)  ids.push('cw-warm');
      else             ids.push('cw-hot');
    }

    function pushChangeCat(){
      if(t === null || p === null) return;
      var d = t - p;
      if(d < -5)      ids.push('cw-drop');
      else if(d > 5)  ids.push('cw-rise');
    }

    pushTempCat();
    pushChangeCat();

    if(c >= 95 && c <= 99 && w !== null && w >= 24.5){
      ids.push('cw-storm');
      return ids;
    }
    if(c === 45 || c === 48){ ids.push('cw-fog'); return ids; }
    if(c >= 95 && c <= 99){ ids.push('cw-thunder'); return ids; }

    if(c >= 51 && c <= 57){ ids.push('cw-overcast'); return ids; }
    if(c === 61){ ids.push('cw-overcast'); return ids; }
    if(c === 63){ ids.push('cw-rain-light'); return ids; }
    if(c === 65){ ids.push('cw-rain-mid'); return ids; }
    if(c === 66 || c === 67){ ids.push('cw-rain-heavy'); return ids; }
    if(c === 80){ ids.push('cw-rain-light'); return ids; }
    if(c === 81){ ids.push('cw-rain-mid'); return ids; }
    if(c === 82){ ids.push('cw-rain-heavy'); return ids; }

    if(c === 71 || c === 77){ ids.push('cw-snow-light'); return ids; }
    if(c === 73){ ids.push('cw-snow-mid'); return ids; }
    if(c === 75){ ids.push('cw-snow-heavy'); return ids; }
    if(c === 85){ ids.push('cw-snow-mid'); return ids; }
    if(c === 86){ ids.push('cw-snow-heavy'); return ids; }

    if(w !== null && w >= 10.8){ ids.push('cw-wind'); return ids; }

    if(c === 0) return ids;
    if(c === 1 || c === 2){ ids.push('cw-cloudy'); return ids; }
    if(c === 3){ ids.push('cw-overcast'); return ids; }

    ids.push('cw-cloudy');
    return ids;
  }

  function weatherCodeToCatId(code, temp, wind, prevTemp){
    var ids = weatherCatIdsOf(code, temp, wind, prevTemp);
    for(var i = 0; i < ids.length; i++){
      if(ids[i] !== 'cw-drop' && ids[i] !== 'cw-rise') return ids[i];
    }
    return ids[0] || 'cw-cloudy';
  }

  window.WeatherCats = {
    getCats: function(){ return WEATHER_CATS.slice(); },
    weatherCodeToCatId: weatherCodeToCatId
  };

  (function syncWeatherGroups(){
    try{
      var FLAG = 'mj_weather_synced_v3';

      var OLD_CAT_ID = 'cw-migrated';
      var OLD_CAT_NAME = '旧天气字卡';

      function ensureWeatherGroup(groups){
        if(!Array.isArray(groups)) return null;
        var g = null;
        for(var i = 0; i < groups.length; i++){
          if(groups[i] && groups[i].id === 'g-weather'){ g = groups[i]; break; }
        }
        if(!g){
          g = { id:'g-weather', name:'天气字卡', icon:'sun', sub:'按天气自动抽卡', cats:[] };
          groups.push(g);
        }
        if(!Array.isArray(g.cats)) g.cats = [];
        return g;
      }

      function syncOne(g){
        var changed = false;

        var hasBuiltin = false;
        var hasSunny = false;
        g.cats.forEach(function(c){
          if(!c) return;
          if(c.id === 'cw-sunny') hasSunny = true;
          if(Array.isArray(c.list)){
            c.list.forEach(function(item){
              if(item && typeof item === 'object' && item.src === 'builtin') hasBuiltin = true;
            });
          }
        });

        if(hasBuiltin || hasSunny){
          var oldCat = null;
          for(var i = 0; i < g.cats.length; i++){
            if(g.cats[i] && g.cats[i].id === OLD_CAT_ID){ oldCat = g.cats[i]; break; }
          }
          if(!oldCat){
            oldCat = { id: OLD_CAT_ID, name: OLD_CAT_NAME, list: [] };
            g.cats.push(oldCat);
            changed = true;
          }
          if(!Array.isArray(oldCat.list)){ oldCat.list = []; changed = true; }

          var existKeys = {};
          g.cats.forEach(function(c){
            if(!c || !Array.isArray(c.list)) return;
            c.list.forEach(function(item){
              var txt = '';
              if(typeof item === 'string') txt = item;
              else if(item && typeof item === 'object') txt = item.text || item.mood || '';
              txt = String(txt).trim();
              if(txt) existKeys[txt] = 1;
            });
          });

          g.cats.forEach(function(c){
            if(!c || c.id === OLD_CAT_ID || !Array.isArray(c.list)) return;
            var moved = [];
            var kept = [];
            c.list.forEach(function(item){
              if(item && typeof item === 'object' && item.src === 'builtin'){
                moved.push(item);
              } else {
                kept.push(item);
              }
            });
            if(moved.length){
              moved.forEach(function(item){
                var txt = '';
                if(typeof item === 'string') txt = item;
                else if(item && typeof item === 'object') txt = item.text || item.mood || '';
                txt = String(txt).trim();
                if(!txt) return;
                if(existKeys[txt]) return;
                oldCat.list.push({ text: txt, t: item.t || Date.now() });
                existKeys[txt] = 1;
              });
              c.list = kept;
              changed = true;
            }
          });

          var sunny = null;
          for(var m = 0; m < g.cats.length; m++){
            if(g.cats[m] && g.cats[m].id === 'cw-sunny'){ sunny = g.cats[m]; break; }
          }
          if(sunny && sunny.name !== '晴（旧）'){
            sunny.name = '晴（旧）';
            changed = true;
          }
        }

        WEATHER_CATS.forEach(function(def){
          if(def.legacy) return;
          var hit = null;
          for(var j = 0; j < g.cats.length; j++){
            if(g.cats[j] && g.cats[j].id === def.id){ hit = g.cats[j]; break; }
          }
          if(hit) return;
          var sameName = null;
          for(var k = 0; k < g.cats.length; k++){
            if(g.cats[k] && g.cats[k].name === def.name){ sameName = g.cats[k]; break; }
          }
          if(sameName) return;
          g.cats.push({ id: def.id, name: def.name, list: [] });
          changed = true;
        });

        return changed;
      }

      var store = JSON.parse(localStorage.getItem('mj_card_groups_v5') || 'null');
      if(store && typeof store === 'object'){
        var changed = false;
        if(Array.isArray(store.public)){
          var gp = ensureWeatherGroup(store.public);
          if(gp && syncOne(gp)) changed = true;
        }
        if(store.roles && typeof store.roles === 'object'){
          Object.keys(store.roles).forEach(function(rid){
            if(!Array.isArray(store.roles[rid])) return;
            var gr = ensureWeatherGroup(store.roles[rid]);
            if(gr && syncOne(gr)) changed = true;
          });
        }
        if(changed) localStorage.setItem('mj_card_groups_v5', JSON.stringify(store));
      }
      localStorage.setItem(FLAG, '1');
    }catch(e){}
  })();
})();