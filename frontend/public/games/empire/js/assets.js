// Empire asset registry. Paths are relative to index.html.
(function () {
  const root = 'assets/';
  const cropKeys = ['wheat', 'carrot', 'cabbage', 'beet', 'apple', 'orange', 'tomato', 'corn'];
  const recipeKeys = [
    'flour', 'carrot_juice', 'sauerkraut', 'cornmeal', 'sugar', 'tomato_sauce',
    'apple_juice', 'orange_juice', 'apple_pie', 'bread', 'pizza', 'fruit_salad',
  ];
  const machineByRecipe = {
    flour: 'mill',
    cornmeal: 'mill',
    bread: 'mill',
    apple_pie: 'mill',
    pizza: 'mill',
    carrot_juice: 'juicer',
    apple_juice: 'juicer',
    orange_juice: 'juicer',
    fruit_salad: 'juicer',
    sauerkraut: 'packaging',
    tomato_sauce: 'packaging',
    sugar: 'boiler',
  };
  const upgradeIconMap = {
    farm_plot: 'seed',
    irrigation: 'water',
    fertilizer: 'fertilizer',
    greenhouse: 'greenhouse',
    tractor: 'tractor',
    factory_machine: 'machine',
    speed_boost: 'speed',
    automation: 'automation',
    shop_shelf: 'shelf',
    advertising: 'ad',
    decor: 'decor',
    truck: 'truck',
    truck_speed: 'truck_speed',
  };

  function path(file) {
    return root + file;
  }

  function escapeAttr(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function img(src, className, alt) {
    return '<img src="' + escapeAttr(src) + '" class="' + escapeAttr(className || 'asset-img') + '" alt="' + escapeAttr(alt || '') + '" loading="lazy" decoding="async">';
  }

  const crops = Object.fromEntries(cropKeys.map(key => [
    key,
    Array.from({ length: 5 }, (_, i) => path('crops/' + key + '_' + i + '.webp')),
  ]));
  const rawItems = Object.fromEntries(cropKeys.map(key => [key, path('items/raw/' + key + '.webp')]));
  const goods = Object.fromEntries(recipeKeys.map(key => [key, path('items/goods/' + key + '.webp')]));
  Object.assign(goods, {
    cloth_roll: path('items/goods/cloth_roll.webp'),
    empty_bottle: path('items/goods/empty_bottle.webp'),
    pallet: path('items/goods/pallet.webp'),
    crate: path('items/goods/crate.webp'),
  });

  const icons = [
    'ad', 'arrow', 'automation', 'buffs', 'buy', 'close', 'collect', 'customer',
    'customer_frenzy', 'decor', 'diamond', 'factory', 'factory_unlock', 'farm',
    'fertilizer', 'fuel', 'gold', 'goods', 'greenhouse', 'growth_boost', 'harvest',
    'income', 'info', 'inventory', 'level', 'logistics', 'logistics_unlock', 'machine',
    'offline', 'overview', 'prestige', 'price_surge', 'production_boost', 'raw',
    'recipe', 'route', 'save', 'seed', 'sell', 'settings', 'shelf', 'shop',
    'shop_unlock', 'speed', 'stats', 'success', 'tag', 'time', 'tractor',
    'truck', 'truck_speed', 'upgrades', 'warning', 'water', 'xp',
  ].reduce((acc, key) => {
    acc[key] = path('ui/icons/' + key + '.webp');
    return acc;
  }, {});

  const backgrounds = {
    farm: path('ui/backgrounds/farm.webp'),
    factory: path('ui/backgrounds/factory.webp'),
    shop: path('ui/backgrounds/shop.webp'),
    loading: path('ui/backgrounds/loading.webp'),
  };
  const effects = {
    coin: path('effects/coin_splash.svg'),
    xp: path('effects/exp_stars.svg'),
    offline: path('effects/offline_rewards.svg'),
    steam: path('effects/steam_particle.svg'),
    upgrade: path('effects/upgrade_aura.svg'),
  };

  const EmpireAssets = {
    crops,
    rawItems,
    goods,
    icons,
    backgrounds,
    effects,
    routeMap: path('logistics/maps/route_map.webp'),
    img,
    icon(key, className, alt) {
      return img(icons[key] || icons.info, className || 'asset-icon', alt || key);
    },
    item(key, className, alt) {
      return img(rawItems[key] || goods[key] || icons.goods, className || 'asset-icon', alt || key);
    },
    cropStage(key, progress) {
      const stages = crops[key] || crops.wheat;
      const index = Math.max(0, Math.min(4, Math.floor(Math.max(0, Math.min(0.999, progress || 0)) * 5)));
      return stages[index];
    },
    crop(key, progress, className, alt) {
      return img(this.cropStage(key, progress), className || 'crop-img', alt || key);
    },
    recipe(key, className, alt) {
      return img(goods[key] || rawItems[key] || icons.goods, className || 'asset-icon', alt || key);
    },
    tab(key, className) {
      return img(icons[key] || icons.overview, className || 'tab-icon-img', key);
    },
    upgrade(key, className) {
      return img(icons[upgradeIconMap[key]] || icons.upgrades, className || 'upgrade-icon-img', key);
    },
    buff(key, className) {
      return img(icons[key] || icons.buffs, className || 'buff-icon-img', key);
    },
    factoryMachine(recipeKey, state, className) {
      const kind = machineByRecipe[recipeKey] || 'mill';
      const mode = state || 'idle';
      return img(path('machines/factory/' + kind + '_' + mode + '.webp'), className || 'machine-art', kind);
    },
    idleMachine(index, className) {
      const kinds = ['mill', 'juicer', 'packaging', 'boiler', 'textile', 'cold_storage'];
      const kind = kinds[Math.abs(index || 0) % kinds.length];
      return img(path('machines/factory/' + kind + '_idle.webp'), className || 'machine-art', kind);
    },
    shelf(id, quantity, maxQuantity, className) {
      const styles = ['wood', 'metal', 'display', 'cold'];
      const style = styles[Math.abs(id || 0) % styles.length];
      const ratio = maxQuantity ? quantity / maxQuantity : 0;
      const state = ratio <= 0 ? 'empty' : (ratio >= 0.67 ? 'full' : 'half');
      return img(path('shop/shelves/' + style + '_' + state + '.webp'), className || 'shelf-art', style);
    },
    customer(seed, className) {
      let hash = 0;
      for (const ch of String(seed || 'customer')) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
      const index = Math.abs(hash) % 8 + 1;
      return img(path('shop/customers/customer_' + String(index).padStart(2, '0') + '.webp'), className || 'customer-img', seed || 'customer');
    },
    vehicle(kind, frame, className) {
      return img(path('logistics/vehicles/' + (kind || 'truck') + '_' + (frame || 0) + '.webp'), className || 'truck-img', kind || 'truck');
    },
  };

  window.EmpireAssets = EmpireAssets;
})();
