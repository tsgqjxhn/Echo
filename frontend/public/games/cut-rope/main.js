(function () {
  'use strict';

  var LEVELS = [
    { title: '摆起来再切', hint: '等糖果接近口袋上方时切断绳子。', candy: { x: 126, y: 164, r: 18 }, velocity: { x: 1.1, y: 0 }, ropes: [{ id: 'r1', anchor: { x: 184, y: 72 }, length: 110, active: true }], goal: { x: 232, y: 430, r: 34 }, stars: [{ x: 148, y: 238 }, { x: 214, y: 312 }, { x: 236, y: 380 }], obstacles: [], time: 45 },
    { title: '双绳释放', hint: '先断一根制造摆动，再断第二根。', candy: { x: 180, y: 166, r: 18 }, velocity: { x: 0, y: 0 }, ropes: [{ id: 'r1', anchor: { x: 112, y: 82 }, length: 104, active: true }, { id: 'r2', anchor: { x: 248, y: 82 }, length: 104, active: true }], goal: { x: 272, y: 420, r: 34 }, stars: [{ x: 205, y: 232 }, { x: 242, y: 314 }, { x: 272, y: 372 }], obstacles: [{ x: 88, y: 306, w: 120, h: 16 }], time: 50 },
    { title: '弹跳垫', hint: '避开挡板，让糖果落进口袋。', candy: { x: 112, y: 156, r: 18 }, velocity: { x: 0, y: 0 }, ropes: [{ id: 'r1', anchor: { x: 78, y: 78 }, length: 92, active: true }, { id: 'r2', anchor: { x: 220, y: 70 }, length: 132, active: true }], goal: { x: 180, y: 432, r: 34 }, stars: [{ x: 122, y: 246 }, { x: 208, y: 306 }, { x: 180, y: 382 }], obstacles: [{ x: 178, y: 248, w: 130, h: 16 }, { x: 48, y: 350, w: 114, h: 16 }], time: 55 },
  ];
  var host = window.createEchoPhaserHost({ title: '糖果绳索', width: 440, height: 820, backgroundColor: '#142033', legacyRootId: 'app' });
  var app = host.legacyRoot;
  var state = null;
  var timer = 0;
  var slicing = null;

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function startLevel(index) {
    var level = clone(LEVELS[index % LEVELS.length]);
    state = {
      index: index % LEVELS.length,
      level: level,
      candy: { x: level.candy.x, y: level.candy.y, r: level.candy.r },
      velocity: { x: level.velocity.x, y: level.velocity.y },
      stars: level.stars.map(function () { return false; }),
      score: 0,
      totalScore: state ? state.totalScore || 0 : 0,
      timeLeft: level.time,
      result: '',
      message: level.hint,
    };
    clearInterval(timer);
    timer = setInterval(tickClock, 1000);
    render();
  }

  function tickClock() {
    if (!state || state.result) return;
    state.timeLeft--;
    if (state.timeLeft <= 0) finish('lost', '时间耗尽，糖果没有送达。');
    render();
  }

  function activeRopes() { return state.level.ropes.filter(function (rope) { return rope.active; }); }

  function step() {
    if (!state || state.result) return;
    var ropes = activeRopes();
    if (ropes.length) {
      ropes.forEach(function (rope) {
        var dx = state.candy.x - rope.anchor.x;
        var dy = state.candy.y - rope.anchor.y;
        var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        var stretch = dist - rope.length;
        if (stretch > 0) {
          state.velocity.x -= (dx / dist) * stretch * 0.012;
          state.velocity.y -= (dy / dist) * stretch * 0.012;
        }
      });
    } else {
      state.velocity.y += 0.26;
    }
    state.velocity.x *= 0.992;
    state.velocity.y *= 0.992;
    state.candy.x += state.velocity.x;
    state.candy.y += state.velocity.y;
    collideObstacles();
    collectStars();
    checkGoalOrFail();
    render();
  }

  function collideObstacles() {
    state.level.obstacles.forEach(function (o) {
      var cx = Math.max(o.x, Math.min(state.candy.x, o.x + o.w));
      var cy = Math.max(o.y, Math.min(state.candy.y, o.y + o.h));
      var dx = state.candy.x - cx;
      var dy = state.candy.y - cy;
      if (dx * dx + dy * dy < state.candy.r * state.candy.r) {
        if (Math.abs(dx) > Math.abs(dy)) state.velocity.x *= -0.55;
        else state.velocity.y *= -0.55;
        state.candy.x += Math.sign(dx || 1) * 4;
        state.candy.y += Math.sign(dy || 1) * 4;
      }
    });
  }

  function collectStars() {
    state.level.stars.forEach(function (star, i) {
      if (state.stars[i]) return;
      if (distance(state.candy, star) < state.candy.r + 13) {
        state.stars[i] = true;
        state.score += 100;
        state.message = '收集到星星！';
      }
    });
  }

  function checkGoalOrFail() {
    if (distance(state.candy, state.level.goal) < state.level.goal.r) finish('won', '糖果送达！');
    else if (state.candy.y > 560 || state.candy.x < -60 || state.candy.x > 420) finish('lost', '糖果掉出了场地。');
  }

  function finish(result, message) {
    if (state.result) return;
    state.result = result;
    state.message = message;
    var timeBonus = Math.max(0, state.timeLeft) * 5;
    if (result === 'won') state.score += 250 + timeBonus;
    state.totalScore += state.score;
    clearInterval(timer);
    render();
  }

  function distance(a, b) { var dx = a.x - b.x; var dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  function cutRope(id) {
    if (!state || state.result) return;
    var rope = state.level.ropes.find(function (r) { return r.id === id; });
    if (!rope || !rope.active) return;
    rope.active = false;
    state.velocity.x += (state.candy.x - rope.anchor.x) * 0.015;
    state.velocity.y += (state.candy.y - rope.anchor.y) * 0.006;
    state.message = rope.id.toUpperCase() + ' 已切断。';
    render();
  }

  function starPath(x, y, outer, inner) {
    var points = [];
    for (var i = 0; i < 10; i++) {
      var angle = -Math.PI / 2 + i * Math.PI / 5;
      var radius = i % 2 === 0 ? outer : inner;
      points.push((i ? 'L' : 'M') + (x + Math.cos(angle) * radius).toFixed(1) + ' ' + (y + Math.sin(angle) * radius).toFixed(1));
    }
    return points.join(' ') + 'Z';
  }

  function lineHitRope(a, b, rope) {
    return segmentDistance(a, b, rope.anchor, state.candy) < 14;
  }

  function segmentDistance(a, b, c, d) {
    var steps = 18;
    var best = Infinity;
    for (var i = 0; i <= steps; i++) {
      var p = { x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps };
      best = Math.min(best, pointToSegment(p, c, d));
    }
    return best;
  }

  function pointToSegment(p, a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var l2 = dx * dx + dy * dy || 1;
    var t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    return distance(p, { x: a.x + dx * t, y: a.y + dy * t });
  }

  function svgPoint(event) {
    var svg = app.querySelector('.field');
    var rect = svg.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 360, y: (event.clientY - rect.top) / rect.height * 520 };
  }

  function render() {
    if (!state) return;
    var level = state.level;
    var ropeSvg = level.ropes.filter(function (r) { return r.active; }).map(function (rope) {
      return '<g><line class="rope-hit" x1="' + rope.anchor.x + '" y1="' + rope.anchor.y + '" x2="' + state.candy.x + '" y2="' + state.candy.y + '" data-rope="' + rope.id + '"/><line class="rope" x1="' + rope.anchor.x + '" y1="' + rope.anchor.y + '" x2="' + state.candy.x + '" y2="' + state.candy.y + '"/><circle class="anchor" cx="' + rope.anchor.x + '" cy="' + rope.anchor.y + '" r="8"/></g>';
    }).join('');
    var starsSvg = level.stars.map(function (star, i) {
      return '<g class="' + (state.stars[i] ? 'star collected' : '') + '"><path class="star-halo" d="' + starPath(star.x, star.y, 17, 8) + '"/><path class="star" d="' + starPath(star.x, star.y, 12, 5.5) + '"/></g>';
    }).join('');
    var obs = level.obstacles.map(function (o) { return '<rect class="obstacle" x="' + o.x + '" y="' + o.y + '" width="' + o.w + '" height="' + o.h + '" rx="8"/>'; }).join('');
    var sliceSvg = slicing ? '<line class="slice" x1="' + slicing.start.x + '" y1="' + slicing.start.y + '" x2="' + slicing.end.x + '" y2="' + slicing.end.y + '"/>' : '';
    var ropeBtns = level.ropes.map(function (rope) { return '<button class="rope-btn' + (!rope.active ? ' cut' : '') + '" data-rope="' + rope.id + '">' + (rope.active ? '切断 ' + rope.id.toUpperCase() : rope.id.toUpperCase() + ' 已断') + '</button>'; }).join('');
    app.innerHTML = '<main class="shell"><section class="card header"><div class="row"><div><h1>糖果绳索</h1><p class="subtitle">' + level.title + ' · ' + state.message + '</p></div><span class="pill">Phaser Host</span></div></section><section class="stats"><div class="stat"><span>得分</span><strong>' + state.totalScore + '</strong></div><div class="stat"><span>本关</span><strong>' + state.score + '</strong></div><div class="stat"><span>星星</span><strong>' + state.stars.filter(Boolean).length + '/' + level.stars.length + '</strong></div><div class="stat"><span>剩余</span><strong>' + state.timeLeft + 's</strong></div></section><section class="card field-wrap"><svg class="field" viewBox="0 0 360 520" data-field="1"><defs><radialGradient id="candyGloss" cx="34%" cy="28%" r="72%"><stop offset="0%" stop-color="#fecdd3"/><stop offset="48%" stop-color="#fb7185"/><stop offset="100%" stop-color="#be123c"/></radialGradient></defs><rect width="360" height="520" rx="24" class="field-bg"/><path class="grid" d="M32 84H328M32 168H328M32 252H328M32 336H328M32 420H328M90 38V482M180 38V482M270 38V482"/>' + obs + '<circle class="goal-halo" cx="' + level.goal.x + '" cy="' + level.goal.y + '" r="' + (level.goal.r + 10) + '"/><circle class="goal" cx="' + level.goal.x + '" cy="' + level.goal.y + '" r="' + level.goal.r + '"/><path class="goal-smile" d="M ' + (level.goal.x - 18) + ' ' + (level.goal.y - 4) + ' Q ' + level.goal.x + ' ' + (level.goal.y + 14) + ' ' + (level.goal.x + 18) + ' ' + (level.goal.y - 4) + '"/>' + starsSvg + ropeSvg + '<circle class="candy-shadow" cx="' + state.candy.x + '" cy="' + (state.candy.y + 5) + '" r="' + (state.candy.r + 5) + '"/><circle class="candy" cx="' + state.candy.x + '" cy="' + state.candy.y + '" r="' + state.candy.r + '"/>' + sliceSvg + '</svg></section><section class="card header"><div class="rope-grid">' + ropeBtns + '</div><div class="actions" style="margin-top:10px"><button class="soft" data-action="restart">重来</button><button class="primary" data-action="next">下一关</button></div><p class="status">划过绳子或点击按钮切断。' + level.hint + '</p></section>' + (state.result ? '<div class="overlay"><div class="overlay-card card"><strong>' + (state.result === 'won' ? '糖果送达' : '本关失败') + '</strong><p>' + state.message + ' 本关得分：' + state.score + '</p><button class="primary" data-action="' + (state.result === 'won' ? 'next' : 'restart') + '">' + (state.result === 'won' ? '下一关' : '重试') + '</button></div></div>' : '') + '</main>';
  }

  app.addEventListener('click', function (event) {
    var btn = event.target.closest('button, .rope-hit');
    if (!btn) return;
    if (btn.dataset.rope) cutRope(btn.dataset.rope);
    if (btn.dataset.action === 'restart') startLevel(state.index);
    if (btn.dataset.action === 'next') startLevel(state.index + 1);
  });

  app.addEventListener('pointerdown', function (event) {
    if (!event.target.closest('.field')) return;
    var p = svgPoint(event);
    slicing = { start: p, end: p };
    render();
  });
  app.addEventListener('pointermove', function (event) {
    if (!slicing || !event.target.closest('.field')) return;
    slicing.end = svgPoint(event);
    activeRopes().forEach(function (rope) { if (lineHitRope(slicing.start, slicing.end, rope)) cutRope(rope.id); });
    render();
  });
  app.addEventListener('pointerup', function () { slicing = null; render(); });
  app.addEventListener('pointercancel', function () { slicing = null; render(); });

  setInterval(step, 1000 / 30);
  startLevel(0);
})();
