import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CreationScene } from './scenes/CreationScene';
import { MapScene } from './scenes/MapScene';
import { UIScene } from './scenes/UIScene';
import { BattleScene } from './scenes/BattleScene';
import { PersonalScene } from './scenes/panels/PersonalScene';
import { InventoryScene } from './scenes/panels/InventoryScene';
import { DaoScene } from './scenes/panels/DaoScene';
import { SectScene } from './scenes/panels/SectScene';
import { SettingsScene } from './scenes/panels/SettingsScene';
import { CodexScene } from './scenes/panels/CodexScene';
import { MessengerScene } from './scenes/panels/MessengerScene';
import { BattlePrepScene } from './scenes/panels/BattlePrepScene';
import { DwellingScene } from './scenes/panels/DwellingScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#07140f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [
    BootScene,
    MainMenuScene,
    CreationScene,
    MapScene,
    UIScene,
    BattleScene,
    PersonalScene,
    InventoryScene,
    DaoScene,
    SectScene,
    SettingsScene,
    CodexScene,
    MessengerScene,
    BattlePrepScene,
    DwellingScene,
  ],
  audio: {
    default: 'webAudio',
  },
};

const game = new Phaser.Game(config);

export default game;
