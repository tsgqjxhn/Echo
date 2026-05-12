(function () {
  'use strict';

  var ROWS = 8;
  var COLS = 8;
  var MOVES = 24;
  var TARGET = 2600;
  var PIECES = [
    { id: 'sun', label: 'S', color: 'linear-gradient(135deg,#fde68a,#f59e0b)' },
    { id: 'leaf', label: 'L', color: 'linear-gradient(135deg,#bbf7d0,#22c55e)' },
    { id: 'wave', label: 'W', color: 'linear-gradient(135deg,#bae6fd,#38bdf8)' },
    { id: 'berry', label: 'B', color: 'linear-gradient(135deg,#fbcfe8,#ec4899)' },
    { id: 'grape', label: 'G', color: 'linear-gradient(135deg,#ddd6fe,#8b5cf6)' },
    { id: 'star', label: 'A', color: 'linear-gradient(135deg,#fef08a,#facc15)' },
  ];
  var host = window.createEchoPhaserHost({ title: '星糖消消乐', width: 520, height: 820, backgroundColor: '#172033', legacyRootId: 'app' });
  var app = host.legacyRoot;
  var state = null;

  function randomPiece() { return PIECES[Math.floor(Math.random() * PIECES.length)].id; }
  function piece(id) { return PIECES.find(function (p) { return p.id === id; }) || PIECES[0]; }
  function key(r, c) { return r + '-' + c; }

  function newGame() {
    state = { board: [], score: 0, moves: MOVES, cleared: 0, combo: 0, bestCombo: 0, selected: null, hint: [], busy: false, result: '', message: '交换相邻星糖，三连即可消除。' };
    buildBoard();
    render();
  }

  function buildBoard() {
    for (var attempt = 0; attempt < 80; attempt++) {
      state.board = Array.from({ length: ROWS }, function () { return Array(COLS).fill(null); });
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          do { state.board[r][c] = randomPiece(); } while (createsMatch(r, c));
        }
      }
      if (possibleMove()) return;
    }
  }

  function createsMatch(r, c) {
    var id = state.board[r][c];
    return (c >= 2 && state.board[r][c - 1] === id && state.board[r][c - 2] === id) || (r >= 2 && state.board[r - 1][c] === id && state.board[r - 2][c] === id);
  }

  function adjacent(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1; }

  function clickCell(r, c) {
    if (state.busy || state.result) return;
    state.hint = [];
    if (!state.selected) { state.selected = { r: r, c: c }; render(); return; }
    var from = state.selected;
    if (from.r === r && from.c === c) { state.selected = null; render(); return; }
    if (!adjacent(from, { r: r, c: c })) { state.selected = { r: r, c: c }; render(); return; }
    swap(from, { r: r, c: c });
    var matches = findMatches();
    if (!matches.length) {
      swap(from, { r: r, c: c });
      state.message = '这一步没有形成三连。';
      state.selected = null;
      render();
      return;
    }
    state.moves--;
    state.selected = null;
    resolve(matches);
  }

  function swap(a, b) {
    var tmp = state.board[a.r][a.c];
    state.board[a.r][a.c] = state.board[b.r][b.c];
    state.board[b.r][b.c] = tmp;
  }

  function findMatches() {
    var found = new Set();
    for (var r = 0; r < ROWS; r++) {
      var run = 1;
      for (var c = 1; c <= COLS; c++) {
        if (c < COLS && state.board[r][c] && state.board[r][c] === state.board[r][c - 1]) run++;
        else { if (run >= 3) for (var x = c - run; x < c; x++) found.add(key(r, x)); run = 1; }
      }
    }
    for (var col = 0; col < COLS; col++) {
      var vrun = 1;
      for (var row = 1; row <= ROWS; row++) {
        if (row < ROWS && state.board[row][col] && state.board[row][col] === state.board[row - 1][col]) vrun++;
        else { if (vrun >= 3) for (var y = row - vrun; y < row; y++) found.add(key(y, col)); vrun = 1; }
      }
    }
    return Array.from(found).map(function (k) { var parts = k.split('-').map(Number); return { r: parts[0], c: parts[1] }; });
  }

  function resolve(matches) {
    state.busy = true;
    state.combo++;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    var gain = Math.round(matches.length * 12 * (1 + (state.combo - 1) * 0.35));
    state.score += gain;
    state.cleared += matches.length;
    state.message = '连锁 ' + state.combo + 'x，获得 +' + gain;
    matches.forEach(function (m) { state.board[m.r][m.c] = null; });
    collapse();
    setTimeout(function () {
      var next = findMatches();
      if (next.length) resolve(next);
      else {
        state.busy = false;
        state.combo = 0;
        if (!possibleMove()) shuffleBoard();
        finishIfNeeded();
        render();
      }
    }, 160);
    render();
  }

  function collapse() {
    for (var c = 0; c < COLS; c++) {
      var stack = [];
      for (var r = ROWS - 1; r >= 0; r--) if (state.board[r][c]) stack.push(state.board[r][c]);
      for (var row = ROWS - 1; row >= 0; row--) state.board[row][c] = stack[ROWS - 1 - row] || randomPiece();
    }
  }

  function finishIfNeeded() {
    if (state.score >= TARGET) state.result = '挑战成功，星糖乐园被点亮！';
    else if (state.moves <= 0) state.result = '步数用尽，本局结束。';
  }

  function possibleMove() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var dirs = [[1, 0], [0, 1]];
      for (var i = 0; i < dirs.length; i++) {
        var nr = r + dirs[i][0];
        var nc = c + dirs[i][1];
        if (nr >= ROWS || nc >= COLS) continue;
        swap({ r: r, c: c }, { r: nr, c: nc });
        var ok = findMatches().length > 0;
        swap({ r: r, c: c }, { r: nr, c: nc });
        if (ok) return [{ r: r, c: c }, { r: nr, c: nc }];
      }
    }
    return null;
  }

  function shuffleBoard() {
    var flat = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) flat.push(state.board[r][c]);
    for (var i = flat.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = flat[i]; flat[i] = flat[j]; flat[j] = t; }
    for (var idx = 0; idx < flat.length; idx++) state.board[Math.floor(idx / COLS)][idx % COLS] = flat[idx];
    if (!possibleMove()) buildBoard();
    state.message = '棋盘已自动重排。';
  }

  function showHint() {
    var hint = possibleMove();
    state.hint = hint || [];
    state.message = hint ? '高亮的两枚星糖可以交换。' : '暂无可用交换，已重排。';
    if (!hint) shuffleBoard();
    render();
  }

  function render() {
    if (!state) return;
    var progress = Math.min(100, Math.round(state.score / TARGET * 100));
    var cells = '';
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var id = state.board[r][c];
      var p = piece(id);
      var selected = state.selected && state.selected.r === r && state.selected.c === c;
      var hint = state.hint.some(function (h) { return h.r === r && h.c === c; });
      cells += '<button class="tile' + (selected ? ' selected' : '') + (hint ? ' hint' : '') + (state.busy ? ' busy' : '') + '" style="--tile-bg:' + p.color + '" data-r="' + r + '" data-c="' + c + '"><span>' + p.label + '</span></button>';
    }
    app.innerHTML = '<main class="shell"><section class="card header"><div class="header-row"><div><h1>星糖消消乐</h1><p class="subtitle">' + state.message + '</p></div><span class="pill">Phaser Host</span></div></section><section class="stats"><div class="stat"><span>得分</span><strong>' + state.score + '</strong></div><div class="stat"><span>目标</span><strong>' + TARGET + '</strong></div><div class="stat"><span>步数</span><strong>' + state.moves + '</strong></div><div class="stat"><span>连锁</span><strong>' + state.bestCombo + 'x</strong></div></section><div class="progress"><i style="--p:' + progress + '%"></i></div><section class="card board-wrap"><div class="board">' + cells + '</div></section><section class="card header"><div class="actions"><button class="soft" data-action="hint">提示</button><button class="soft" data-action="shuffle">重排</button><button class="primary" data-action="restart">重开</button></div><p class="status">已消除 ' + state.cleared + ' 枚星糖</p></section>' + (state.result ? '<div class="overlay"><div class="overlay-card card"><strong>' + state.result + '</strong><p>最终得分：' + state.score + '</p><button class="primary" data-action="restart">再来一局</button></div></div>' : '') + '</main>';
  }

  app.addEventListener('click', function (event) {
    var btn = event.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('tile')) clickCell(Number(btn.dataset.r), Number(btn.dataset.c));
    if (btn.dataset.action === 'restart') newGame();
    if (btn.dataset.action === 'hint') showHint();
    if (btn.dataset.action === 'shuffle' && !state.busy && !state.result) { shuffleBoard(); render(); }
  });

  newGame();
})();
