(function () {
  'use strict';

  var SIZE = 15;
  var host = window.createEchoPhaserHost({
    title: '五子棋',
    width: 520,
    height: 820,
    backgroundColor: '#111827',
    legacyRootId: 'app',
  });
  var app = host.legacyRoot;
  var state = null;

  function emptyBoard() {
    return Array.from({ length: SIZE }, function () { return Array(SIZE).fill(0); });
  }

  function newGame(difficulty) {
    state = {
      difficulty: difficulty || 2,
      board: emptyBoard(),
      turn: 1,
      last: null,
      over: '',
      thinking: false,
      moves: 0,
    };
    render();
  }

  function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

  function checkWin(r, c, player) {
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    return dirs.some(function (d) {
      var count = 1;
      for (var i = 1; i < 5; i++) { if (!inBounds(r + d[0] * i, c + d[1] * i) || state.board[r + d[0] * i][c + d[1] * i] !== player) break; count++; }
      for (var j = 1; j < 5; j++) { if (!inBounds(r - d[0] * j, c - d[1] * j) || state.board[r - d[0] * j][c - d[1] * j] !== player) break; count++; }
      return count >= 5;
    });
  }

  function place(r, c) {
    if (!state || state.over || state.thinking || state.board[r][c]) return;
    state.board[r][c] = state.turn;
    state.last = [r, c];
    state.moves++;
    if (checkWin(r, c, state.turn)) return endGame(state.turn === 1 ? '你赢了！五子连珠。' : '你输了，白棋连成五子。');
    if (state.moves >= SIZE * SIZE) return endGame('和棋：棋盘已满。');
    state.turn *= -1;
    render();
    if (state.turn === -1) {
      state.thinking = true;
      render();
      setTimeout(aiMove, 320);
    }
  }

  function aiMove() {
    if (!state || state.over) return;
    var move = bestMove();
    state.thinking = false;
    if (!move) return endGame('和棋：无处可下。');
    place(move[0], move[1]);
  }

  function bestMove() {
    var candidates = candidateCells();
    if (!candidates.length) return [Math.floor(SIZE / 2), Math.floor(SIZE / 2)];
    var scored = candidates.map(function (pos) {
      return { pos: pos, score: scoreCell(pos[0], pos[1], -1) + scoreCell(pos[0], pos[1], 1) * (state.difficulty >= 2 ? 0.9 : 0.5) + Math.random() };
    }).sort(function (a, b) { return b.score - a.score; });
    var pool = state.difficulty >= 3 ? 1 : state.difficulty === 2 ? Math.min(3, scored.length) : Math.min(8, scored.length);
    return scored[Math.floor(Math.random() * pool)].pos;
  }

  function candidateCells() {
    var result = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (state.board[r][c]) continue;
        if (state.moves === 0 || hasNeighbor(r, c)) result.push([r, c]);
      }
    }
    return result;
  }

  function hasNeighbor(r, c) {
    for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) if ((dr || dc) && inBounds(r + dr, c + dc) && state.board[r + dr][c + dc]) return true;
    return false;
  }

  function scoreCell(r, c, player) {
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    return dirs.reduce(function (sum, d) {
      var forward = countDirection(r, c, d[0], d[1], player);
      var back = countDirection(r, c, -d[0], -d[1], player);
      var count = 1 + forward.count + back.count;
      var open = forward.open + back.open;
      if (count >= 5) return sum + 100000;
      if (count === 4) return sum + (open ? 18000 : 6000);
      if (count === 3) return sum + (open === 2 ? 2200 : 600);
      if (count === 2) return sum + (open === 2 ? 220 : 60);
      return sum + 12;
    }, 0);
  }

  function countDirection(r, c, dr, dc, player) {
    var count = 0;
    var nr = r + dr;
    var nc = c + dc;
    while (inBounds(nr, nc) && state.board[nr][nc] === player) {
      count++;
      nr += dr;
      nc += dc;
    }
    return { count: count, open: inBounds(nr, nc) && state.board[nr][nc] === 0 ? 1 : 0 };
  }

  function endGame(text) {
    state.over = text;
    state.thinking = false;
    render();
  }

  function status() {
    if (!state) return '选择难度开始对局';
    if (state.over) return state.over;
    if (state.thinking) return '白棋思考中…';
    return '你的回合：黑棋先手';
  }

  function renderMenu() {
    app.innerHTML = '<main class="mini-shell"><section class="card header"><div class="header-row"><div><h1>五子棋</h1><p class="subtitle">基于本地 Phaser 宿主层运行，黑棋先手。</p></div><span class="pill">Phaser Host</span></div><div class="diff-grid"><button class="diff" data-diff="1">入门</button><button class="diff" data-diff="2">简单</button><button class="diff" data-diff="3">中等</button><button class="diff" data-diff="4">困难</button></div></section></main>';
  }

  function render() {
    if (!state) return renderMenu();
    var cells = '';
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var piece = state.board[r][c];
        var cls = ['cell'];
        if (piece === 1) cls.push('black');
        if (piece === -1) cls.push('white');
        if (state.last && state.last[0] === r && state.last[1] === c) cls.push('last');
        cells += '<button class="' + cls.join(' ') + '" data-r="' + r + '" data-c="' + c + '" aria-label="第' + (r + 1) + '行第' + (c + 1) + '列"></button>';
      }
    }
    app.innerHTML = '<main class="mini-shell"><section class="card header"><div class="header-row"><div><h1>五子棋</h1><p class="subtitle">连成横、竖或斜向五子即可获胜。</p></div><span class="pill">难度 ' + state.difficulty + '</span></div><p class="status">' + status() + '</p></section><section class="card board-wrap"><div class="board">' + cells + '</div></section><section class="card panel"><div class="action-row"><button class="danger" data-action="resign">认输</button><button class="soft" data-action="restart">重开</button><button class="primary" data-action="menu">选难度</button></div></section>' + (state.over ? '<div class="overlay"><div class="overlay-card card"><strong>' + state.over + '</strong><button class="primary" data-action="restart">再来一局</button></div></div>' : '') + '</main>';
  }

  app.addEventListener('click', function (event) {
    var btn = event.target.closest('button');
    if (!btn) return;
    if (btn.dataset.diff) newGame(Number(btn.dataset.diff));
    if (btn.classList.contains('cell')) place(Number(btn.dataset.r), Number(btn.dataset.c));
    if (btn.dataset.action === 'restart') newGame(state ? state.difficulty : 2);
    if (btn.dataset.action === 'menu') { state = null; render(); }
    if (btn.dataset.action === 'resign') endGame('你认输了。');
  });

  render();
})();
