import re

with open('src/services/story-assets.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove import line for scene-classroom
lines = content.split('\n')
new_lines = []
for line in lines:
    if 'scene-classroom.webp' in line:
        continue
    new_lines.append(line)
content = '\n'.join(new_lines)

# Renumber assets in reverse to avoid collision: asset153->asset152, ..., asset18->asset17
for old in range(153, 17, -1):
    content = content.replace(f'asset{old}', f'asset{old - 1}')

# Remove scene-classroom array entry line
content = re.sub(r'\n\s+\{"id": "scene-classroom",[^}]+\},', '', content)

with open('src/services/story-assets.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('story-assets.ts updated successfully')
