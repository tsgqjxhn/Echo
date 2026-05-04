const fs = require('fs');
const code = fs.readFileSync('frontend/public/games/dark-dorm/assets/app.js', 'utf8');

const checks = [
  'at=.5,ot=.1,C=300',
  'getUpgradeCost(){const t=G[this.type].baseCost;return Math.floor(t*Math.pow(P,this.level))}',
  'upgrade(){this.level++,this.maxHp=this.baseHp()+this.level*15,this.hp=this.maxHp,this.upgradeTimer=.65}',
  'getSellValue(){let t=G[this.type].baseCost;for(let e=1;e<this.level;e++)t+=Math.floor(G[this.type].baseCost*Math.pow(P,e));return Math.floor(t*.6)}',
  'constructor(t,e){this.level=1,this.fireTimer=0,this.incomeTimer=0,this.animTimer=0,this.upgradeTimer=0,this.type=t,this.pos={...e},this.maxHp=this.baseHp(),this.hp=this.maxHp}',
  'this._awardPrestige(Math.max(1,Math.ceil(t/2)),"clear")',
  'upgradeSelected(){const t=this.ui.getSelectedBuilding();if(!t)return;const e=t.getUpgradeCost();this.gold<e||(this.spendGold(e),t.upgrade(),AudioEngine.playBuildUpgrade(),this.ui.showInfoPanel(t,this.gold),this.addFloatingText(`Lv.${t.level}`,t.pos.col*i+i/2,t.pos.row*i,"#44ff44",16))}',
  'buildings:(this.buildings||[]).map(b=>({type:b.type,col:b.pos.col,row:b.pos.row,level:b.level,hp:b.hp,maxHp:b.maxHp}))',
  'const obj=new Tt(b.type,{col:b.col,row:b.row});if(b.level>1){obj.level=b.level;obj.maxHp=b.maxHp||obj.maxHp}obj.hp=Math.min(b.hp||obj.hp,obj.maxHp);this.buildings.push(obj)'
];

checks.forEach((s, i) => {
  const idx = code.indexOf(s);
  const lastIdx = code.lastIndexOf(s);
  console.log((i+1) + '.', s.substring(0,40) + '...', '=> first:', idx, 'last:', lastIdx, 'unique:', idx !== -1 && idx === lastIdx);
});
