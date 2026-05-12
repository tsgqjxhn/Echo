// Phaser 通过 <script src="../../_shared/phaser/phaser.min.js"> 全局加载
// 本文件为最小化类型声明，供严格模式编译通过；后续可补充完整类型

declare namespace Phaser {
  const AUTO: number;

  namespace Scale {
    const FIT: number;
    const RESIZE: number;
    const ENVELOP: number;
    const CENTER_BOTH: number;
  }

  class Scene {
    constructor(config?: string | { key: string });
    preload(): void;
    create(): void;
    update?(time: number, delta: number): void;
    scene: ScenePlugin;
    add: GameObjectFactory;
    make: GameObjectCreator;
    tweens: TweenManager;
    input: InputPlugin;
    game: Game;
    events: Events.EventEmitter;
    children: { exists(gameObject: GameObjects.GameObject): boolean };
    scale: ScaleManager;
    cameras: CameraManager;
    load: LoaderPlugin;
    time: TimeManager;
    textures: TextureManager;
  }

  class TextureManager {
    exists(key: string): boolean;
    get(key: string): Texture;
  }

  class Texture {
    key: string;
  }

  class LoaderPlugin extends Events.EventEmitter {
    image(key: string, url?: string): this;
    svg(key: string, url?: string): this;
    audio(key: string, urls: string | string[]): this;
    atlas(key: string, textureURL?: string, atlasURL?: string): this;
    spritesheet(key: string, url?: string, config?: { frameWidth?: number; frameHeight?: number }): this;
    on(event: string, callback: Function, context?: unknown): this;
    start(): void;
  }

  class TimeManager {
    delayedCall(delay: number, callback: Function, args?: unknown[], callbackScope?: unknown): DelayedCall;
  }

  class DelayedCall {
    remove(): void;
  }

  class CameraManager {
    main: Camera;
  }

  class Camera {
    width: number;
    height: number;
    x: number;
    y: number;
    zoom: number;
    scrollX: number;
    scrollY: number;
    centerX: number;
    centerY: number;
    ignore(gameObject: GameObjects.GameObject): this;
    fadeIn(duration?: number, red?: number, green?: number, blue?: number): this;
    fadeOut(duration?: number, red?: number, green?: number, blue?: number): this;
    setZoom(value: number): this;
    centerOn(x: number, y: number): this;
  }

  interface ScenePlugin {
    start(key: string, data?: unknown): void;
    switch(key: string): void;
    launch(key: string, data?: unknown): void;
    stop(key?: string): void;
    restart(data?: unknown): void;
    transition(config: SceneTransitionConfig): boolean;
    get(key: string): Scene | undefined;
    isActive(key: string): boolean;
    isSleeping(key: string): boolean;
    isVisible(key: string): boolean;
  }

  interface SceneTransitionConfig {
    target: string;
    duration?: number;
    sleep?: boolean;
    remove?: boolean;
    allowInput?: boolean;
    moveAbove?: boolean;
    moveBelow?: boolean;
    data?: unknown;
    onStart?(fromScene: Scene, toScene: Scene): void;
    onUpdate?(progress: number): void;
    onComplete?(): void;
  }

  class Game {
    constructor(config: Types.Core.GameConfig);
    scale: ScaleManager;
  }

  interface ScaleManager {
    width: number;
    height: number;
    on(event: string, callback: Function, context?: unknown): void;
    off(event: string, callback: Function, context?: unknown): void;
  }

  namespace Types {
    namespace Core {
      interface GameConfig {
        type?: number;
        width?: number | string;
        height?: number | string;
        parent?: string | HTMLElement;
        backgroundColor?: string;
        scale?: ScaleConfig;
        scene?: unknown;
        audio?: AudioConfig;
        render?: RenderConfig;
      }
    }

    namespace Scenes {
      interface SettingsConfig {
        key?: string;
      }
    }

    namespace Tweens {
      interface TweenBuilderConfig {
        targets?: unknown | unknown[];
        x?: number | string;
        y?: number | string;
        alpha?: number | { from: number; to: number };
        scaleX?: number | string;
        scaleY?: number | string;
        scale?: number | string;
        duration?: number;
        ease?: string;
        delay?: number;
        hold?: number;
        repeat?: number;
        repeatDelay?: number;
        yoyo?: boolean;
        onStart?: () => void;
        onComplete?: () => void;
        onUpdate?: (tween?: Tween, target?: unknown) => void;
        paused?: boolean;
        props?: Record<string, unknown>;
      }

      interface NumberTweenBuilderConfig {
        from?: number;
        to?: number;
        duration?: number;
        ease?: string;
        delay?: number;
        onUpdate?: (tween: Tween, value: number) => void;
        onComplete?: () => void;
      }

      interface StaggerConfig {
        each?: number;
        from?: string | number;
      }

      interface TimelineBuilderConfig {
        tweens?: TweenBuilderConfig[];
        onComplete?: () => void;
      }
    }

    namespace GameObjects {
      interface TextStyle {
        fontFamily?: string;
        fontSize?: string | number;
        fontStyle?: string;
        color?: string;
        align?: string;
        wordWrap?: { width?: number };
        stroke?: string;
        strokeThickness?: number;
        shadow?: {
          offsetX?: number;
          offsetY?: number;
          color?: string;
          blur?: number;
          stroke?: boolean;
          fill?: boolean;
        };
        padding?: { x?: number; y?: number };
        backgroundColor?: string;
      }

      interface GraphicsOptions {
        x?: number;
        y?: number;
        add?: boolean;
        lineStyle?: { width?: number; color?: number; alpha?: number };
        fillStyle?: { color?: number; alpha?: number };
      }

      interface GraphicsStyles {
        lineStyle?: { width?: number; color?: number; alpha?: number };
        fillStyle?: { color?: number; alpha?: number };
      }
    }
  }

  interface ScaleConfig {
    mode?: number;
    autoCenter?: number;
  }

  interface AudioConfig {
    default?: string;
  }

  interface RenderConfig {
    antialias?: boolean;
    pixelArt?: boolean;
  }

  class TweenManager {
    add(config: Types.Tweens.TweenBuilderConfig): Tween;
    create(config: Types.Tweens.TweenBuilderConfig): Tween;
    timeline(config: Types.Tweens.TimelineBuilderConfig): Timeline;
    getTweensOf(target: unknown): Tween[];
    killTweensOf(target: unknown): void;
    addCounter(config: Types.Tweens.NumberTweenBuilderConfig): Tween;
  }

  class Tween {
    isPlaying(): boolean;
    pause(): this;
    resume(): this;
    stop(): this;
    complete(): void;
    remove(): void;
    restart(): void;
    seek(progress: number): this;
    play(): this;
    chain(...tweens: Tween[]): this;
    getValue(): number;
    progress: number;
    elapsed: number;
    data: unknown[];
  }

  class Timeline extends Tween {
    queue(tween: Tween | Types.Tweens.TweenBuilderConfig): this;
    to(config: Types.Tweens.TweenBuilderConfig): this;
  }

  namespace Events {
    class EventEmitter {
      constructor();
      emit(event: string | symbol, ...args: unknown[]): boolean;
      on(event: string | symbol, fn: Function, context?: unknown): this;
      off(event: string | symbol, fn?: Function, context?: unknown, once?: boolean): this;
      once(event: string | symbol, fn: Function, context?: unknown): this;
      removeAllListeners(event?: string | symbol): this;
      listenerCount(event: string | symbol): number;
    }
  }

  class InputPlugin {
    setDefaultCursor(cursor: string): void;
    on(event: string, callback: Function, context?: unknown): void;
    off(event: string, callback?: Function, context?: unknown, once?: boolean): void;
    once(event: string, callback: Function, context?: unknown): void;
    enable(gameObject: GameObjects.GameObject): void;
    disable(gameObject: GameObjects.GameObject): void;
    setDraggable(gameObject: GameObjects.GameObject, value?: boolean): void;
    activePointer: Pointer;
  }

  class Pointer {
    id: number;
    x: number;
    y: number;
    isDown: boolean;
    primaryDown: boolean;
    worldX: number;
    worldY: number;
  }

  namespace Input {
    namespace Events {
      const POINTER_DOWN = 'pointerdown';
      const POINTER_UP = 'pointerup';
      const POINTER_OVER = 'pointerover';
      const POINTER_OUT = 'pointerout';
      const POINTER_MOVE = 'pointermove';
      const DRAG_START = 'dragstart';
      const DRAG = 'drag';
      const DRAG_END = 'dragend';
      const POINTER_WHEEL = 'wheel';
    }
  }

  namespace Curves {
    class Path {
      constructor(x?: number, y?: number);
      getPoint(t: number): { x: number; y: number };
      cubicBezierTo(x: number, y: number, cp1x: number, cp1y: number, cp2x: number, cp2y: number, cp3x?: number, cp3y?: number): this;
    }
  }

  namespace Geom {
    class Rectangle {
      constructor(x: number, y: number, width: number, height: number);
      contains(x: number, y: number): boolean;
    }
  }

  namespace GameObjects {
    class GameObject extends Events.EventEmitter {
      constructor(scene: Scene, type: string);
      scene: Scene;
      x: number;
      y: number;
      alpha: number;
      visible: boolean;
      active: boolean;
      scaleX: number;
      scaleY: number;
      scale: number;
      width: number;
      height: number;
      originX: number;
      originY: number;
      depth: number;
      setPosition(x: number, y?: number): this;
      setAlpha(value: number): this;
      setVisible(value: boolean): this;
      setActive(value: boolean): this;
      setScale(x: number, y?: number): this;
      setDepth(value: number): this;
      setOrigin(x: number, y?: number): this;
      destroy(fromScene?: boolean): void;
      list?: GameObject[];
      parentContainer?: Container;
      disableInteractive(): this;
      setInteractive(hitArea?: object, callback?: Function): this;
      removeInteractive(): this;
      input?: { hitArea?: object };
      update?(time: number, delta: number): void;
    }

    class Container extends GameObject {
      constructor(scene: Scene, x?: number, y?: number);
      list: GameObject[];
      add(gameObject: GameObject | GameObject[]): this;
      remove(gameObject: GameObject | GameObject[], destroyChild?: boolean): this;
      removeAll(destroyChild?: boolean): this;
      contains(gameObject: GameObject): boolean;
      getByName(name: string): GameObject | null;
      getAll(): GameObject[];
      getBounds(): { x: number; y: number; width: number; height: number };
      setSize(width: number, height: number): this;
      getAt(index: number): GameObject;
      length: number;
      each(callback: (child: GameObject, index: number) => void, context?: unknown): this;
      setMask(mask: GeometryMask | null): this;
      preUpdate(time: number, delta: number): void;
    }

    class Graphics extends GameObject {
      constructor(scene: Scene, options?: Types.GameObjects.GraphicsOptions);
      fillStyle(color: number, alpha?: number): this;
      lineStyle(lineWidth: number, color?: number, alpha?: number): this;
      fillRect(x: number, y: number, width: number, height: number): this;
      strokeRect(x: number, y: number, width: number, height: number): this;
      fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number | { tl?: number; tr?: number; br?: number; bl?: number }): this;
      strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number | { tl?: number; tr?: number; br?: number; bl?: number }): this;
      fillCircle(x: number, y: number, radius: number): this;
      strokeCircle(x: number, y: number, radius: number): this;
      fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): this;
      beginPath(): this;
      moveTo(x: number, y: number): this;
      lineTo(x: number, y: number): this;
      closePath(): this;
      strokePath(): this;
      fillPath(): this;
      fillPoints(points: { x: number; y: number }[], close?: boolean, end?: boolean): this;
      strokePoints(points: { x: number; y: number }[], close?: boolean, end?: boolean): this;
      clear(): this;
      generateTexture(key: string, width?: number, height?: number): this;
      destroy(): void;
      createGeometryMask(): GeometryMask;
    }

    class GeometryMask {
      destroy(): void;
    }

    class Text extends GameObject {
      constructor(scene: Scene, x: number, y: number, text: string | string[], style?: Types.GameObjects.TextStyle);
      text: string;
      style: Types.GameObjects.TextStyle;
      setText(text: string | string[]): this;
      setStyle(style: Types.GameObjects.TextStyle): this;
      setColor(color: string): this;
      setFontSize(size: string | number): this;
      setFontFamily(family: string): this;
      setAlign(align: string): this;
      setStroke(color: string, thickness: number): this;
      setShadow(x: number, y: number, color?: string, blur?: number, shadowStroke?: boolean, shadowFill?: boolean): this;
      setWordWrapWidth(width: number): this;
      setLineSpacing(value: number): this;
      getBounds(): { x: number; y: number; width: number; height: number };
      width: number;
      height: number;
    }

    class Image extends GameObject {
      constructor(scene: Scene, x: number, y: number, texture: string, frame?: string | number);
      setTexture(key: string, frame?: string | number): this;
      setFrame(frame: string | number): this;
      setCrop(x?: number, y?: number, width?: number, height?: number): this;
      clearCrop(): this;
      setDisplaySize(width: number, height: number): this;
      displayWidth: number;
      displayHeight: number;
    }

    class Zone extends GameObject {
      constructor(scene: Scene, x: number, y: number, width?: number, height?: number);
      setSize(width: number, height: number): this;
    }

    class Rectangle extends GameObject {
      constructor(scene: Scene, x?: number, y?: number, width?: number, height?: number, fillColor?: number, fillAlpha?: number);
      setFillStyle(color: number, alpha?: number): this;
      setStrokeStyle(lineWidth: number, color?: number, alpha?: number): this;
      width: number;
      height: number;
    }

    class NineSlice extends GameObject {
      constructor(scene: Scene, x: number, y: number, texture: string, frame?: string | number, width?: number, height?: number, leftWidth?: number, rightWidth?: number, topHeight?: number, bottomHeight?: number);
      setSize(width: number, height: number): this;
      setTexture(key: string, frame?: string | number): this;
    }

    namespace Particles {
      class ParticleEmitter extends GameObject {
        start(): this;
        stop(): this;
        pause(): this;
        resume(): this;
        killAll(): this;
        setFrequency(frequency: number, quantity?: number): this;
        setQuantity(quantity: number): this;
        setPosition(x: number, y: number): this;
        setSpeedX(min: number, max?: number): this;
        setSpeedY(min: number, max?: number): this;
        setLifespan(min: number, max?: number): this;
        setScale(min: number, max?: number): this;
        setAlpha(min: number, max?: number): this;
        setBlendMode(value: number): this;
      }
    }
  }

  class GameObjectFactory {
    container(x: number, y: number, children?: GameObjects.GameObject[]): GameObjects.Container;
    graphics(options?: Types.GameObjects.GraphicsOptions): GameObjects.Graphics;
    text(x: number, y: number, text: string | string[], style?: Types.GameObjects.TextStyle): GameObjects.Text;
    image(x: number, y: number, texture: string, frame?: string | number): GameObjects.Image;
    zone(x: number, y: number, width?: number, height?: number): GameObjects.Zone;
    rectangle(x?: number, y?: number, width?: number, height?: number, fillColor?: number, fillAlpha?: number): GameObjects.Rectangle;
    nineSlice(x: number, y: number, texture: string, frame?: string | number, width?: number, height?: number, leftWidth?: number, rightWidth?: number, topHeight?: number, bottomHeight?: number): GameObjects.NineSlice;
    existing(gameObject: GameObjects.GameObject): GameObjects.GameObject;
    particles(x: number, y: number, texture: string, config?: Record<string, unknown>): GameObjects.Particles.ParticleEmitter;
  }

  class GameObjectCreator {
    graphics(options?: Types.GameObjects.GraphicsOptions): GameObjects.Graphics;
  }

  namespace BlendModes {
    const ADD: number;
    const NORMAL: number;
    const MULTIPLY: number;
    const SCREEN: number;
  }

  namespace Display {
    namespace Color {
      function GetColor(red: number, green: number, blue: number): number;
    }
  }

  namespace Math {
    function Clamp(value: number, min: number, max: number): number;
    function Between(min: number, max: number): number;
    function Distance(x1: number, y1: number, x2: number, y2: number): number;
  }

  namespace Utils {
    namespace Array {
      function GetRandom<T>(array: T[], startIndex?: number, length?: number): T;
    }
  }
}

declare const Phaser: typeof Phaser;
