import re

# 1. panel.vue
with open('frontend/src/pages/game/panel.vue', 'r', encoding='utf-8') as f:
    s = f.read()

# Remove xiuxian-v2 catalog entry
s = re.sub(
    r"  \{\n    id: 'xiuxian-v2',\n    name: '[^']*',\n    description: '[^']*',\n    route: '[^']*',\n    icon: '[^']*',\n    iconSrc: xiuxianGameAvatar,\n    iconKind: 'text',\n    iconClass: 'xiuxian-icon',\n    primarySubcategory: '[^']*',\n    playCategories: \[[^\]]*\],\n  \},\n",
    '',
    s
)
# Remove import
s = s.replace("import xiuxianGameAvatar from '@/static/images/game-center/game-center-xiuxian.webp'\n", '')
# Remove xiuxian-icon CSS
s = re.sub(r"\n\.xiuxian-icon \{\n  color: #[a-f0-9]+;\n\}", '', s)

with open('frontend/src/pages/game/panel.vue', 'w', encoding='utf-8') as f:
    f.write(s)
print('panel.vue done')

# 2. play.vue
with open('frontend/src/pages/game/play.vue', 'r', encoding='utf-8') as f:
    s = f.read()

# Remove xiuxian entries from gameTitles dict
s = s.replace("  xiuxian: '问道长生',\n", '')
s = s.replace("  'xiuxian-v2': '问道长生',\n", '')
# Remove xiuxian entries from h5GamePaths dict
s = s.replace("  xiuxian: '/games/xiuxian-v2/dist/index.html',\n", '')
s = s.replace("  'xiuxian-v2': '/games/xiuxian-v2/dist/index.html',\n", '')
# Fix landscape ids
s = s.replace("landscapeH5GameIds = new Set(['survivor-defense', 'xiuxian', 'xiuxian-v2'])", "landscapeH5GameIds = new Set(['survivor-defense'])")
# Fix comment
s = s.replace('// -- Outer top-bar tab integration for hero / empire / xiuxian --', '// -- Outer top-bar tab integration for hero / empire --')

# Remove xiuxian tab configs (multiline blocks)
s = re.sub(
    r"  xiuxian: \{\n    tabs: \[[^\]]*\],\n    hostSource: 'xiuxian-host',\n    gameSource: 'xiuxian-game',\n    defaultKey: 'cultivation',\n  \},\n",
    '',
    s
)
s = re.sub(
    r"  'xiuxian-v2': \{\n    tabs: \[[^\]]*\],\n    hostSource: 'xiuxian-host',\n    gameSource: 'xiuxian-game',\n    defaultKey: 'cultivation',\n  \},\n",
    '',
    s
)
# Remove save bridge configs
s = s.replace("  xiuxian: { hostSource: 'xiuxian-host', gameSource: 'xiuxian-game' },\n", '')
s = s.replace("  'xiuxian-v2': { hostSource: 'xiuxian-host', gameSource: 'xiuxian-game' },\n", '')

with open('frontend/src/pages/game/play.vue', 'w', encoding='utf-8') as f:
    f.write(s)
print('play.vue done')

# 3. settings.vue
with open('frontend/src/pages/game/settings.vue', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace("  { id: 'xiuxian', name: '问道长生' },\n", '')
with open('frontend/src/pages/game/settings.vue', 'w', encoding='utf-8') as f:
    f.write(s)
print('settings.vue done')

print('ALL XIUXIAN REFERENCES REMOVED')
