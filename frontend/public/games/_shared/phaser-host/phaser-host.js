(function () {
  'use strict';

  var HOST_ID_PREFIX = 'echo-phaser-host-';
  var hostCounter = 0;

  function toKebab(value) {
    return String(value || 'game')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'game';
  }

  function normalizeColor(value, fallback) {
    var color = value || fallback || '#0f172a';
    if (typeof color === 'number') return '#' + color.toString(16).padStart(6, '0');
    if (typeof color !== 'string') return fallback || '#0f172a';
    return color.charAt(0) === '#' ? color : '#' + color.replace(/^0x/i, '');
  }

  function cssColorToNumber(value, fallback) {
    var normalized = normalizeColor(value, fallback).replace('#', '');
    var parsed = parseInt(normalized.length === 3
      ? normalized.split('').map(function (ch) { return ch + ch; }).join('')
      : normalized.slice(0, 6), 16);
    return Number.isFinite(parsed) ? parsed : 0x0f172a;
  }

  function readSize(root, width, height) {
    var rect = root.getBoundingClientRect ? root.getBoundingClientRect() : null;
    return {
      width: Math.max(1, Math.round((rect && rect.width) || root.clientWidth || window.innerWidth || width || 480)),
      height: Math.max(1, Math.round((rect && rect.height) || root.clientHeight || window.innerHeight || height || 800)),
    };
  }

  function createDefaultScene(backgroundColor, title) {
    var fillColor = cssColorToNumber(backgroundColor, '#0f172a');

    return class EchoPhaserHostScene extends Phaser.Scene {
      constructor() {
        super({ key: 'EchoPhaserHostScene' });
        this._echoTitle = title || 'Echo Phaser Host';
      }

      create() {
        this._echoGraphics = this.add.graphics();
        this._echoTitleText = this.add.text(18, 16, this._echoTitle, {
          color: 'rgba(226, 232, 240, 0.18)',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: '14px',
          fontStyle: '600',
        }).setAlpha(0.55);
        this._paint();
        this.scale.on('resize', this._paint, this);
      }

      _paint() {
        var width = this.scale.width || 1;
        var height = this.scale.height || 1;
        var g = this._echoGraphics;
        if (!g) return;
        g.clear();
        g.fillStyle(fillColor, 1);
        g.fillRect(0, 0, width, height);
        g.lineStyle(1, 0xffffff, 0.035);
        var gap = Math.max(48, Math.min(96, Math.round(Math.min(width, height) / 8)));
        for (var x = -gap; x < width + gap; x += gap) g.lineBetween(x, 0, x + height * 0.24, height);
        for (var y = gap; y < height + gap; y += gap) g.lineBetween(0, y, width, y - width * 0.08);
        g.fillStyle(0xffffff, 0.035);
        g.fillCircle(width * 0.82, height * 0.18, Math.max(80, Math.min(width, height) * 0.18));
        if (this._echoTitleText) this._echoTitleText.setPosition(18, 16);
      }
    };
  }

  function resolveLegacyRoot(options) {
    if (options.legacyRoot && options.legacyRoot.nodeType === 1) return options.legacyRoot;
    if (options.legacyRootId) return document.getElementById(options.legacyRootId);
    return null;
  }

  function createLegacyRoot(options) {
    var root = document.createElement('div');
    if (options.legacyRootId) root.id = options.legacyRootId;
    return root;
  }

  function safeCall(fn, arg) {
    if (typeof fn !== 'function') return;
    try { fn(arg); } catch (error) { setTimeout(function () { throw error; }, 0); }
  }

  function createEchoPhaserHost(options) {
    options = options || {};
    if (!window.Phaser || !window.Phaser.Game) {
      throw new Error('Echo Phaser Host requires local Phaser to be loaded first.');
    }

    var width = options.width || 480;
    var height = options.height || 800;
    var title = options.title || 'Echo Phaser Host';
    var backgroundColor = normalizeColor(options.backgroundColor, '#0f172a');
    var hostId = options.hostId || (HOST_ID_PREFIX + toKebab(title) + '-' + (++hostCounter));
    var originalParent = null;
    var originalNextSibling = null;
    var destroyed = false;
    var paused = false;

    document.documentElement.classList.add('echo-phaser-host-html');
    document.body.classList.add('echo-phaser-host-body');
    document.body.style.setProperty('--echo-phaser-host-background', backgroundColor);

    var legacyRoot = resolveLegacyRoot(options) || createLegacyRoot(options);
    originalParent = legacyRoot.parentNode;
    originalNextSibling = legacyRoot.nextSibling;
    legacyRoot.classList.add('echo-phaser-legacy-root');

    var hostRoot = document.createElement('div');
    hostRoot.id = hostId;
    hostRoot.className = 'echo-phaser-host';
    hostRoot.style.setProperty('--echo-phaser-host-background', backgroundColor);

    var canvasLayer = document.createElement('div');
    canvasLayer.className = 'echo-phaser-canvas-layer';
    if (options.interactiveCanvas) canvasLayer.classList.add('echo-phaser-canvas-interactive');

    var legacyLayer = document.createElement('div');
    legacyLayer.className = 'echo-phaser-legacy-layer';

    hostRoot.appendChild(canvasLayer);
    hostRoot.appendChild(legacyLayer);
    legacyLayer.appendChild(legacyRoot);
    document.body.insertBefore(hostRoot, document.body.firstChild || null);

    if (options.showBadge) {
      var badge = document.createElement('div');
      badge.className = 'echo-phaser-host-badge';
      badge.textContent = 'Powered by Phaser';
      hostRoot.appendChild(badge);
    }

    var initialSize = readSize(hostRoot, width, height);
    var api = null;
    var ready = false;
    var sceneConfig = options.scene || createDefaultScene(backgroundColor, title);
    var scaleMode = options.scaleMode || (Phaser.Scale && Phaser.Scale.RESIZE) || (Phaser.Scale && Phaser.Scale.FIT);
    var autoCenter = (Phaser.Scale && Phaser.Scale.CENTER_BOTH) || 1;

    var gameConfig = {
      type: options.type || Phaser.AUTO,
      parent: canvasLayer,
      width: initialSize.width,
      height: initialSize.height,
      backgroundColor: backgroundColor,
      transparent: options.transparent === true,
      scale: {
        mode: scaleMode,
        autoCenter: autoCenter,
        width: initialSize.width,
        height: initialSize.height,
      },
      scene: sceneConfig,
    };

    if (options.physics) gameConfig.physics = options.physics;
    if (options.render) gameConfig.render = options.render;
    if (options.input) gameConfig.input = options.input;

    var game = new Phaser.Game(gameConfig);

    function currentSize() {
      return readSize(hostRoot, width, height);
    }

    function resize() {
      if (destroyed) return;
      var size = currentSize();
      try {
        if (game.scale && typeof game.scale.resize === 'function') game.scale.resize(size.width, size.height);
      } catch (_) {}
      safeCall(options.onResize, { width: size.width, height: size.height, host: api });
    }

    function pause() {
      if (destroyed || paused) return;
      paused = true;
      try { if (game.loop && typeof game.loop.sleep === 'function') game.loop.sleep(); } catch (_) {}
      safeCall(options.onPause, api);
    }

    function resume() {
      if (destroyed || !paused) return;
      paused = false;
      try { if (game.loop && typeof game.loop.wake === 'function') game.loop.wake(); } catch (_) {}
      safeCall(options.onResume, api);
      resize();
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      safeCall(options.onDestroy, api);
      try { game.destroy(true); } catch (_) {}
      legacyRoot.classList.remove('echo-phaser-legacy-root');
      if (originalParent) originalParent.insertBefore(legacyRoot, originalNextSibling || null);
      if (hostRoot.parentNode) hostRoot.parentNode.removeChild(hostRoot);
    }

    function handleVisibility() {
      if (document.hidden) pause();
      else resume();
    }

    function markReady() {
      if (ready || destroyed) return;
      ready = true;
      resize();
      safeCall(options.onReady, api);
    }

    api = {
      game: game,
      root: hostRoot,
      canvasLayer: canvasLayer,
      legacyLayer: legacyLayer,
      legacyRoot: legacyRoot,
      resize: resize,
      pause: pause,
      resume: resume,
      destroy: destroy,
      getSize: currentSize,
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    document.addEventListener('visibilitychange', handleVisibility);

    try {
      if (game.events && Phaser.Core && Phaser.Core.Events && Phaser.Core.Events.READY) {
        game.events.once(Phaser.Core.Events.READY, markReady);
      }
    } catch (_) {}
    setTimeout(markReady, 0);

    return api;
  }

  window.createEchoPhaserHost = createEchoPhaserHost;
})();
