/**
 * 《问道长生》Phaser 3 重构版 —— 传音符系统面板
 * Phase 4: 传音符系统
 *
 * 全屏 InkPanel，标题"传音符"
 * 消息列表（ScrollList），每条消息显示：发件人、标题、时间、已读/未读状态
 * 未读消息有红点标记
 * 点击消息查看详情（InkPanel 弹窗）
 * 支持删除消息
 */

import { BaseScene } from '../BaseScene';
import { GameStateManager } from '../../managers/GameStateManager';
import { GameEventType } from '../../managers/EventBus';
import { ScrollList } from '../../ui';
import { INK_COLORS } from '../../ui/InkPanel';
import type { GameMessage, MessageType } from '../../types';

/** 消息列表项（扩展索引） */
interface MsgListItem extends GameMessage {
  index: number;
  [key: string]: unknown;
}

const TYPE_LABELS: Record<MessageType, string> = {
  sect: '宗门',
  event: '事件',
  npc: 'NPC',
  system: '系统',
};

const TYPE_COLORS: Record<MessageType, number> = {
  sect: 0x4A90D9,
  event: 0xD9534F,
  npc: 0x4A6741,
  system: 0x888888,
};

export class MessengerScene extends BaseScene {
  private _gsm!: GameStateManager;
  private _mainPanel!: ReturnType<BaseScene['createInkPanel']>;
  private _scrollList!: ScrollList<MsgListItem>;
  private _detailPanel?: ReturnType<BaseScene['createInkPanel']>;
  private _unreadBadge?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MessengerScene' });
  }

  create(): void {
    super.create();
    this._gsm = GameStateManager.getInstance();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this._mainPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.94,
      height: h * 0.92,
      title: '传音符',
      showOverlay: true,
      closeOnOverlay: true,
      animate: true,
    });
    this._mainPanel.show();

    const originalHide = this._mainPanel.hide.bind(this._mainPanel);
    this._mainPanel.hide = () => {
      originalHide();
      this.scene.stop();
    };

    this._buildLayout();
    this._subscribeEvents();
  }

  // ==========================================================================
  // 布局
  // ==========================================================================

  private _buildLayout(): void {
    const pw = this._mainPanel.width;
    const ph = this._mainPanel.height;
    const contentY = this._mainPanel.contentOriginY;
    const contentH = this._mainPanel.contentHeight;

    // 未读数量标签
    const unreadCount = this._gsm.getUnreadMessageCount();
    if (unreadCount > 0) {
      const badge = this.add.text(-pw * 0.35, contentY + 14, `未读 ${unreadCount} 条`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '12px',
        color: '#FF6B6B',
      });
      badge.setOrigin(0.5);
      this._mainPanel.add(badge);
    }

    // 一键已读按钮
    const readAllBtn = this.createInkButton(pw * 0.32, contentY + 14, {
      text: '全部已读',
      width: 90,
      height: 32,
      fontSize: 12,
    });
    readAllBtn.onClick(() => this._markAllRead());
    this._mainPanel.add(readAllBtn);

    // 消息列表
    this._buildMessageList(0, contentY + contentH * 0.5 + 16, pw * 0.88, contentH - 60);

    // 返回按钮
    const backBtn = this.createInkButton(pw * 0.42, contentY + 10, {
      text: '返回',
      width: 70,
      height: 36,
      fontSize: 14,
    });
    backBtn.onClick(() => this.scene.stop());
    this._mainPanel.add(backBtn);
  }

  private _buildMessageList(x: number, y: number, w: number, h: number): void {
    const messages = this._gsm.getMessages();
    const data: MsgListItem[] = messages.map((m, index) => ({ ...m, index }));

    this._scrollList = new ScrollList<MsgListItem>(this, x, y, {
      width: w,
      height: h,
      itemHeight: 64,
      itemSpacing: 4,
      data,
      renderer: (scene, item) => this._renderMessageCell(scene, item as MsgListItem, w),
      onSelect: (item) => this._showMessageDetail(item as MsgListItem),
    });
    this._mainPanel.add(this._scrollList);
  }

  private _renderMessageCell(
    scene: Phaser.Scene,
    item: MsgListItem,
    listW: number
  ): Phaser.GameObjects.Container {
    const cellW = listW - 16;
    const cellH = 60;
    const container = scene.add.container(0, 0);

    // 背景
    const bg = scene.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, item.read ? 0.2 : 0.35);
    bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
    container.add(bg);

    // 类型标签
    const typeColor = TYPE_COLORS[item.type];
    const typeLabel = scene.add.graphics();
    typeLabel.fillStyle(typeColor, 0.6);
    typeLabel.fillRoundedRect(-cellW / 2 + 8, -cellH / 2 + 8, 36, 18, 4);
    container.add(typeLabel);

    const typeText = scene.add.text(-cellW / 2 + 26, -cellH / 2 + 17, TYPE_LABELS[item.type], {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '10px',
      color: '#FFFFFF',
    });
    typeText.setOrigin(0.5);
    container.add(typeText);

    // 发件人
    const senderText = scene.add.text(-cellW / 2 + 54, -cellH / 2 + 17, item.sender, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: item.read ? '#888888' : '#F5F5DC',
    });
    senderText.setOrigin(0, 0.5);
    container.add(senderText);

    // 标题
    const titleText = scene.add.text(-cellW / 2 + 12, 2, item.title, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: item.read ? '#888888' : '#F5F5DC',
    });
    titleText.setOrigin(0, 0.5);
    container.add(titleText);

    // 时间
    const timeText = scene.add.text(cellW / 2 - 12, -cellH / 2 + 17, `${item.timestamp}月`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '10px',
      color: '#666666',
    });
    timeText.setOrigin(1, 0.5);
    container.add(timeText);

    // 未读红点
    if (!item.read) {
      const dot = scene.add.graphics();
      dot.fillStyle(0xFF4444, 1);
      dot.fillCircle(cellW / 2 - 18, cellH / 2 - 14, 5);
      container.add(dot);
    }

    return container;
  }

  // ==========================================================================
  // 详情弹窗
  // ==========================================================================

  private _showMessageDetail(item: MsgListItem): void {
    // 标记已读
    this._gsm.markMessageRead(item.id);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this._detailPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.72,
      height: h * 0.55,
      title: item.title,
      showOverlay: true,
      closeOnOverlay: true,
      animate: true,
    });
    this._detailPanel.show();

    // 发件人 + 类型
    const header = this.add.text(0, -this._detailPanel.contentHeight * 0.32, `发件人：${item.sender} · ${TYPE_LABELS[item.type]}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#AAAAAA',
    });
    header.setOrigin(0.5);
    this._detailPanel.add(header);

    // 内容
    const content = this.add.text(0, 0, item.content, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#CCCCCC',
      align: 'left',
      wordWrap: { width: w * 0.6 },
    });
    content.setOrigin(0.5);
    this._detailPanel.add(content);

    // 删除按钮
    const delBtn = this.createInkButton(0, this._detailPanel.contentHeight * 0.32, {
      text: '删除',
      width: 80,
      height: 36,
      fontSize: 14,
    });
    delBtn.onClick(() => {
      this._gsm.deleteMessage(item.id);
      this._detailPanel?.hide();
      this._refreshList();
    });
    this._detailPanel.add(delBtn);

    this._refreshList();
  }

  // ==========================================================================
  // 刷新
  // ==========================================================================

  private _refreshList(): void {
    const messages = this._gsm.getMessages();
    const data: MsgListItem[] = messages.map((m, index) => ({ ...m, index }));
    this._scrollList.setData(data);
  }

  private _markAllRead(): void {
    const messages = this._gsm.getMessages();
    for (const msg of messages) {
      if (!msg.read) {
        this._gsm.markMessageRead(msg.id);
      }
    }
    this._refreshList();
  }

  // ==========================================================================
  // 事件
  // ==========================================================================

  private _subscribeEvents(): void {
    this.subscribeToEvent(GameEventType.MESSAGE_RECEIVED, () => {
      this._refreshList();
    });
  }
}
