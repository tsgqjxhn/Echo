// Empire asset registry - SVG/emoji fallback version (no external images)
(function () {
  const cropEmojis = {
    wheat: '🌾', carrot: '🥕', cabbage: '🥬', beet: '🫐', apple: '🍎', orange: '🍊',
    tomato: '🍅', corn: '🌽', rice: '🌾', soybean: '🫘', strawberry: '🍓', grape: '🍇',
    cotton: '☁️', tea: '🍃', coffee: '☕', cocoa: '🍫', spice: '🌶️', pumpkin: '🎃',
    watermelon: '🍉', mushroom: '🍄',
  };
  const recipeEmojis = {
    flour: '🍞', carrot_juice: '🧃', sauerkraut: '🥗', cornmeal: '🫓', sugar: '🍬',
    tomato_sauce: '🫙', apple_juice: '🧃', orange_juice: '🍹', apple_pie: '🥧',
    bread: '🍞', pizza: '🍕', fruit_salad: '🥙', rice: '🍚', rice_bowl: '🍚',
    sushi: '🍣', soy_milk: '🥛', tofu: '🧊', tea_bag: '🍃', milk_tea: '🧋',
    coffee_powder: '☕', latte: '☕', chocolate: '🍫', chocolate_cake: '🎂',
    wine: '🍷', jam: '🫙', jam_bread: '🍞', ketchup: '🫙', mushroom_soup: '🍜',
    sandwich: '🥪', popcorn: '🍿', carrot_cake: '🍰', orange_candy: '🍬',
    beet_salad: '🥗', apple_cider: '🍺', cotton_cloth: '🧣', spice_blend: '🧂',
    pumpkin_pie: '🥧', watermelon_juice: '🍹', grilled_mushroom: '🍢',
  };
  const iconEmojis = {
    ad: '📺', arrow: '➡️', automation: '🤖', buffs: '⚡', buy: '🛒', close: '❌',
    collect: '📦', customer: '👤', customer_frenzy: '👥', decor: '🎨', diamond: '💎',
    factory: '🏭', factory_unlock: '🔒', farm: '🌱', fertilizer: '🧪', fuel: '⛽',
    gold: '💰', goods: '📦', greenhouse: '🏡', growth_boost: '🌿', harvest: '✂️',
    income: '💵', info: 'ℹ️', inventory: '📋', level: '⭐', logistics: '🚛',
    logistics_unlock: '🔒', machine: '⚙️', offline: '💤', overview: '📊',
    prestige: '👑', price_surge: '📈', production_boost: '⚡', raw: '🌾',
    recipe: '📜', route: '🗺️', save: '💾', seed: '🌱', sell: '💵', settings: '⚙️',
    shelf: '🗄️', shop: '🏪', shop_unlock: '🔒', speed: '⚡', stats: '📈',
    success: '✅', tag: '🏷️', time: '⏰', tractor: '🚜', truck: '🚛',
    truck_speed: '🏎️', upgrades: '⬆️', warning: '⚠️', water: '💧', xp: '✨',
  };
  const machineEmojis = { mill: '⚙️', juicer: '🥤', packaging: '📦', boiler: '♨️', textile: '🧵', cold_storage: '❄️' };
  const bgGradients = {
    farm: 'linear-gradient(180deg,#1a3a1a,#0f1923)',
    factory: 'linear-gradient(180deg,#1a2a3a,#0f1923)',
    shop: 'linear-gradient(180deg,#3a2a1a,#0f1923)',
    loading: 'linear-gradient(180deg,#1a2a3a,#0f1923)',
  };

  function span(content, className, alt) {
    return '<span class="' + (className || 'asset-span') + '" title="' + (alt || '') + '">' + content + '</span>';
  }

  function svgDataUri(width, height, content) {
    const svg = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"' + width + '\" height=\"' + height + '\">' + content + '</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const EmpireAssets = {
    cropEmojis, recipeEmojis, iconEmojis,

    icon(key, className, alt) {
      return span(iconEmojis[key] || '🔹', className || 'asset-icon', alt || key);
    },
    item(key, className, alt) {
      const emoji = cropEmojis[key] || recipeEmojis[key] || iconEmojis[key] || '📦';
      return span(emoji, className || 'asset-icon', alt || key);
    },
    crop(key, progress, className, alt) {
      const emoji = cropEmojis[key] || '🌱';
      const pr = Math.max(0, Math.min(1, progress || 0));
      const scale = 0.6 + pr * 0.4;
      const opacity = 0.5 + pr * 0.5;
      return span(emoji, className || 'crop-img', alt || key);
    },
    recipe(key, className, alt) {
      const emoji = recipeEmojis[key] || cropEmojis[key] || '📦';
      return span(emoji, className || 'asset-icon', alt || key);
    },
    tab(key, className) {
      const map = { farm: '🌱', factory: '🏭', shop: '🏪', logistics: '🚛', upgrades: '⬆️', buffs: '⚡', overview: '📊' };
      return span(map[key] || '📋', className || 'tab-icon-img', key);
    },
    upgrade(key, className) {
      const map = { farm_plot: '🌱', irrigation: '💧', fertilizer: '🧪', greenhouse: '🏡', tractor: '🚜', factory_machine: '⚙️', speed_boost: '⚡', automation: '🤖', shop_shelf: '🗄️', advertising: '📺', decor: '🎨', truck: '🚛', truck_speed: '🏎️' };
      return span(map[key] || '⬆️', className || 'upgrade-icon-img', key);
    },
    buff(key, className) {
      const map = { growth_boost: '🌿', production_boost: '⚡', customer_frenzy: '👥', price_surge: '💰', discount_fuel: '⛽' };
      return span(map[key] || '⚡', className || 'buff-icon-img', key);
    },
    factoryMachine(recipeKey, state, className) {
      const map = { flour: '⚙️', cornmeal: '⚙️', bread: '⚙️', apple_pie: '⚙️', pizza: '⚙️', carrot_juice: '🥤', apple_juice: '🥤', orange_juice: '🥤', fruit_salad: '🥤', sauerkraut: '📦', tomato_sauce: '📦', sugar: '♨️', rice_bowl: '♨️', sushi: '🍣', soy_milk: '🥤', tofu: '🧊', tea_bag: '🍃', milk_tea: '🧋', coffee_powder: '☕', latte: '☕', chocolate: '🍫', chocolate_cake: '🎂', wine: '🍷', jam: '🫙', jam_bread: '🍞', ketchup: '🫙', mushroom_soup: '🍜', sandwich: '🥪', popcorn: '🍿', carrot_cake: '🍰', orange_candy: '🍬', beet_salad: '🥗', apple_cider: '🍺', cotton_cloth: '🧣', spice_blend: '🧂', pumpkin_pie: '🥧', watermelon_juice: '🍹', grilled_mushroom: '🍢' };
      const emoji = map[recipeKey] || '⚙️';
      const anim = state === 'working' ? ' style="animation:pulse-machine 1s infinite alternate"' : '';
      return span(emoji, className || 'machine-art') + (anim ? '<style>@keyframes pulse-machine{0%{opacity:0.6}100%{opacity:1}}</style>' : '');
    },
    idleMachine(index, className) {
      const kinds = ['⚙️', '🥤', '📦', '♨️', '🧵', '❄️'];
      return span(kinds[(index || 0) % kinds.length], className || 'machine-art');
    },
    shelf(id, quantity, maxQuantity, className) {
      const ratio = maxQuantity ? quantity / maxQuantity : 0;
      const state = ratio <= 0 ? 'empty' : (ratio >= 0.67 ? 'full' : 'half');
      const emoji = state === 'empty' ? '🗄️' : state === 'full' ? '📦' : '🗄️';
      return span(emoji, className || 'shelf-art');
    },
    customer(seed, className) {
      const icons = ['👨', '👩', '👴', '👵', '👦', '👧', '🧑', '👱'];
      let hash = 0;
      for (const ch of String(seed || 'customer')) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
      return span(icons[Math.abs(hash) % icons.length], className || 'customer-img');
    },
    vehicle(kind, frame, className) {
      return span('🚛', className || 'truck-img');
    },
    img(src, className, alt) {
      return span('📷', className || 'asset-icon', alt || '');
    },
    backgrounds: bgGradients,
    effects: { coin: '💰', xp: '✨', offline: '💤', steam: '♨️', upgrade: '👑' },
    routeMap: '',
    cropStage(key, progress) { return cropEmojis[key] || '🌱'; },
  };

  window.EmpireAssets = EmpireAssets;
})();
