import os

# Fix chat.vue: remove isCurrentChatGenerating from disabled prop
chat_path = 'frontend/src/pages/chat/chat.vue'
with open(chat_path, 'r', encoding='utf-8') as f:
    s = f.read()
old = ':disabled="switchingCharacter || isCurrentChatGenerating"'
new = ':disabled="switchingCharacter"'
if old in s:
    s = s.replace(old, new, 1)
    print('fixed chat.vue')
else:
    print('chat.vue target not found')
with open(chat_path, 'w', encoding='utf-8') as f:
    f.write(s)

# Fix list.vue: checkbox position and shape
list_path = 'frontend/src/pages/character/list.vue'
with open(list_path, 'r', encoding='utf-8') as f:
    s = f.read()

# Normalize line endings
s = s.replace('\r\n', '\n').replace('\r', '\n')

old1 = '''.card-checkbox {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 5;
}'''
new1 = '''.card-checkbox {
  position: absolute;
  top: 8px;
  right: 8px;
  left: auto;
  z-index: 5;
}'''
if old1 in s:
    s = s.replace(old1, new1, 1)
    print('fixed list.vue card-checkbox')
else:
    print('list.vue card-checkbox not found')

old2 = '''.checkbox-inner {
  width: 22px;
  height: 22px;
  border-radius: 6px;'''
new2 = '''.checkbox-inner {
  width: 24px;
  height: 24px;
  border-radius: 50%;'''
if old2 in s:
    s = s.replace(old2, new2, 1)
    print('fixed list.vue checkbox-inner')
else:
    print('list.vue checkbox-inner not found')

with open(list_path, 'w', encoding='utf-8') as f:
    f.write(s)
