const fs = require('fs');
const code = fs.readFileSync('frontend/public/games/dark-dorm/assets/app.js', 'utf8');

const s1 = 'for(const e of this.buildings){const s=e.pos.col*i,a=e.pos.row*i,o=s+i/2,l=a+i/2;switch(';
const s2 = "t.fillText(`${e.level}`,s+i-8,a+i-5))}}";

console.log('s1 first:', code.indexOf(s1), 'last:', code.lastIndexOf(s1));
console.log('s2 first:', code.indexOf(s2), 'last:', code.lastIndexOf(s2));
