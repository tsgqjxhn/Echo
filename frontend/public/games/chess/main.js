(function () {
  'use strict';

  var PIECES = {
    1: '♙', 2: '♘', 3: '♗', 4: '♖', 5: '♕', 6: '♔',
    '-1': '♟', '-2': '♞', '-3': '♝', '-4': '♜', '-5': '♛', '-6': '♚',
  };
  var VALUES = { 1: 10, 2: 30, 3: 32, 4: 50, 5: 90, 6: 900 };
  var state = null;
  var host = window.createEchoPhaserHost({
    title: '国际象棋',
    width: 520,
    height: 820,
    backgroundColor: '#101827',
    legacyRootId: 'app',
  });
  var app = host.legacyRoot;

  function initialBoard() {
    return [
      [-4, -2, -3, -5, -6, -3, -2, -4],
      [-1, -1, -1, -1, -1, -1, -1, -1],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [4, 2, 3, 5, 6, 3, 2, 4],
    ];
  }

  function newGame(difficulty) {
    state = {
      difficulty: difficulty || 2,
      board: initialBoard(),
      selected: null,
      validMoves: [],
      turn: 1,
      lastMove: null,
      capturedWhite: [],
      capturedBlack: [],
      gameOver: '',
      thinking: false,
    };
    render();
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function cloneBoard(board) {
    return board.map(function (row) { return row.slice(); });
  }

  function movesFor(board, r, c) {
    var piece = board[r][c];
    if (!piece) return [];
    var color = piece > 0 ? 1 : -1;
    var type = Math.abs(piece);
    var moves = [];

    function add(nr, nc) {
      if (!inBounds(nr, nc)) return false;
      var target = board[nr][nc];
      if (target && (target > 0 ? 1 : -1) === color) return false;
      moves.push([nr, nc]);
      return !target;
    }

    function ray(drs) {
      drs.forEach(function (d) {
        var nr = r + d[0];
        var nc = c + d[1];
        while (inBounds(nr, nc)) {
          if (!add(nr, nc)) break;
          nr += d[0];
          nc += d[1];
        }
      });
    }

    if (type === 1) {
      var dir = color === 1 ? -1 : 1;
      var startRow = color === 1 ? 6 : 1;
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !board[r + dir * 2][c]) moves.push([r + dir * 2, c]);
      }
      [[dir, -1], [dir, 1]].forEach(function (d) {
        var nr = r + d[0];
        var nc = c + d[1];
        if (inBounds(nr, nc) && board[nr][nc] && (board[nr][nc] > 0 ? 1 : -1) !== color) moves.push([nr, nc]);
      });
    } else if (type === 2) {
      [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(function (d) { add(r + d[0], c + d[1]); });
    } else if (type === 3) {
      ray([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    } else if (type === 4) {
      ray([[-1, 0], [1, 0], [0, -1], [0, 1]]);
    } else if (type === 5) {
      ray([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
    } else if (type === 6) {
      [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(function (d) { add(r + d[0], c + d[1]); });
    }
    return moves;
  }

  function allMoves(color) {
    var moves = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        if (state.board[r][c] && (state.board[r][c] > 0 ? 1 : -1) === color) {
          movesFor(state.board, r, c).forEach(function (to) { moves.push({ from: [r, c], to: to }); });
        }
      }
    }
    return moves;
  }

  function hasKing(color) {
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) if (state.board[r][c] === color * 6) return true;
    return false;
  }

  function makeMove(from, to) {
    var piece = state.board[from[0]][from[1]];
    var captured = state.board[to[0]][to[1]];
    if (captured) {
      if (piece > 0) state.capturedWhite.push(captured);
      else state.capturedBlack.push(captured);
    }
    state.board[to[0]][to[1]] = piece;
    state.board[from[0]][from[1]] = 0;
    if (Math.abs(piece) === 1 && (to[0] === 0 || to[0] === 7)) state.board[to[0]][to[1]] = piece > 0 ? 5 : -5;
    state.lastMove = { from: from, to: to };
    state.selected = null;
    state.validMoves = [];
    if (!hasKing(-1)) return endGame('你赢了，黑王被将死！');
    if (!hasKing(1)) return endGame('你输了，白王被俘。');
    state.turn *= -1;
    render();
    if (state.turn === -1) {
      state.thinking = true;
      render();
      setTimeout(aiMove, 380);
    }
  }

  function aiMove() {
    if (!state || state.gameOver) return;
    var moves = allMoves(-1);
    if (!moves.length) return endGame('和棋：黑方无子可走。');
    moves.sort(function (a, b) {
      var av = scoreMove(a, state.difficulty);
      var bv = scoreMove(b, state.difficulty);
      return bv - av;
    });
    var poolSize = state.difficulty >= 3 ? 1 : state.difficulty === 2 ? Math.min(3, moves.length) : Math.min(8, moves.length);
    var move = moves[Math.floor(Math.random() * poolSize)];
    state.thinking = false;
    makeMove(move.from, move.to);
  }

  function scoreMove(move, difficulty) {
    var target = state.board[move.to[0]][move.to[1]];
    var score = target ? VALUES[Math.abs(target)] * 10 : 0;
    var piece = Math.abs(state.board[move.from[0]][move.from[1]]);
    if (difficulty >= 2) score += (7 - move.to[0]) + (piece === 1 ? 3 : 0);
    if (difficulty >= 3) {
      var copy = cloneBoard(state.board);
      copy[move.to[0]][move.to[1]] = copy[move.from[0]][move.from[1]];
      copy[move.from[0]][move.from[1]] = 0;
      movesFor(copy, move.to[0], move.to[1]).forEach(function (to) {
        var nextTarget = copy[to[0]][to[1]];
        if (nextTarget > 0) score += VALUES[Math.abs(nextTarget)];
      });
    }
    return score + Math.random();
  }

  function clickSquare(r, c) {
    if (state.gameOver || state.thinking || state.turn !== 1) return;
    var piece = state.board[r][c];
    if (state.selected && state.validMoves.some(function (m) { return m[0] === r && m[1] === c; })) {
      makeMove(state.selected, [r, c]);
      return;
    }
    if (piece > 0) {
      state.selected = [r, c];
      state.validMoves = movesFor(state.board, r, c);
    } else {
      state.selected = null;
      state.validMoves = [];
    }
    render();
  }

  function endGame(text) {
    state.gameOver = text;
    state.thinking = false;
    render();
  }

  function statusText() {
    if (!state) return '选择难度后开始对弈';
    if (state.gameOver) return state.gameOver;
    if (state.thinking) return '黑方思考中…';
    return state.turn === 1 ? '你的回合：选择白棋移动' : '黑方回合';
  }

  function isLast(r, c) {
    if (!state.lastMove) return false;
    var from = state.lastMove.from;
    var to = state.lastMove.to;
    return (from[0] === r && from[1] === c) || (to[0] === r && to[1] === c);
  }

  function render() {
    if (!state) {
      app.innerHTML = '<main class="mini-shell"><section class="game-card hero-card"><div class="title-row"><div><h1>国际象棋</h1><p class="subtitle">基于本地 Phaser 宿主层运行，保留轻量 H5 棋盘逻辑。</p></div><span class="pill">Phaser Host</span></div><div class="menu-grid"><button class="mode-btn" data-diff="1">入门</button><button class="mode-btn" data-diff="2">简单</button><button class="mode-btn" data-diff="3">中等</button><button class="mode-btn" data-diff="4">困难</button></div></section></main>';
    } else {
      var boardHtml = '';
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          var piece = state.board[r][c];
          var valid = state.validMoves.some(function (m) { return m[0] === r && m[1] === c; });
          var selected = state.selected && state.selected[0] === r && state.selected[1] === c;
          var classes = ['square', (r + c) % 2 === 0 ? 'light' : 'dark'];
          if (selected) classes.push('selected');
          if (valid && !piece) classes.push('valid');
          if (valid && piece) classes.push('capture');
          if (isLast(r, c)) classes.push('last');
          boardHtml += '<button class="' + classes.join(' ') + '" data-r="' + r + '" data-c="' + c + '">' + (piece ? '<span class="' + (piece > 0 ? 'piece-white' : 'piece-black') + '">' + PIECES[piece] + '</span>' : '') + '</button>';
        }
      }
      app.innerHTML = '<main class="mini-shell"><section class="game-card hero-card"><div class="title-row"><div><h1>国际象棋</h1><p class="subtitle">白方先行，吃掉对方国王即结束。</p></div><span class="pill">难度 ' + state.difficulty + '</span></div><div class="status-row"><span class="status-text">' + statusText() + '</span><button class="soft-btn" data-action="restart">重开</button></div></section><section class="game-card board-wrap"><div class="board">' + boardHtml + '</div></section><section class="game-card hero-card"><div class="action-row"><button class="danger-btn" data-action="resign">认输</button><button class="primary-btn" data-action="new">选择难度</button></div><p class="capture-row">白方已吃：' + state.capturedWhite.map(function (p) { return PIECES[p]; }).join(' ') + ' ｜ 黑方已吃：' + state.capturedBlack.map(function (p) { return PIECES[p]; }).join(' ') + '</p></section>' + (state.gameOver ? '<div class="overlay"><div class="overlay-card game-card"><strong>' + state.gameOver + '</strong><button class="primary-btn" data-action="restart">再来一局</button></div></div>' : '') + '</main>';
    }
  }

  app.addEventListener('click', function (event) {
    var target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.diff) newGame(Number(target.dataset.diff));
    if (target.dataset.action === 'restart') newGame(state ? state.difficulty : 2);
    if (target.dataset.action === 'new') { state = null; render(); }
    if (target.dataset.action === 'resign') endGame('你认输了。');
    if (target.classList.contains('square')) clickSquare(Number(target.dataset.r), Number(target.dataset.c));
  });

  render();
})();
