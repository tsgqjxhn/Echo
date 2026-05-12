import re

with open('src/services/story-assets.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract import variable names in order
imports = []
for line in lines:
    m = re.match(r"import\s+(asset\d+)\s+from", line)
    if m:
        imports.append(m.group(1))
print(f'Found {len(imports)} imports')

# We need to replace src: assetX in the two arrays.
# Strategy: track which array we're in, count objects, replace src references.

in_image_array = False
in_moment_array = False
image_obj_count = 0
moment_obj_count = 0

new_lines = []
for line in lines:
    stripped = line.strip()

    if stripped.startswith('export const STORY_IMAGE_ASSETS:'):
        in_image_array = True
        in_moment_array = False
        new_lines.append(line)
        continue
    if stripped.startswith('export const STORY_MOMENT_ASSETS:'):
        in_image_array = False
        in_moment_array = True
        new_lines.append(line)
        continue
    if stripped == ']' and (in_image_array or in_moment_array):
        in_image_array = False
        in_moment_array = False
        new_lines.append(line)
        continue

    if in_image_array and '"src":' in line:
        old_match = re.search(r'"src":\s*(asset\d+)', line)
        if old_match:
            old_asset = old_match.group(1)
            correct_asset = imports[image_obj_count] if image_obj_count < len(imports) else old_asset
            if old_asset != correct_asset:
                line = line.replace(old_asset, correct_asset, 1)
                print(f'  Fixed IMAGE {image_obj_count}: {old_asset} -> {correct_asset}')
        # Count object by detecting {"id": at start of object or after comma
    if in_image_array and '{"id":' in stripped:
        image_obj_count += 1

    if in_moment_array and '"src":' in line:
        old_match = re.search(r'"src":\s*(asset\d+)', line)
        if old_match:
            old_asset = old_match.group(1)
            correct_asset = imports[image_obj_count + moment_obj_count] if (image_obj_count + moment_obj_count) < len(imports) else old_asset
            if old_asset != correct_asset:
                line = line.replace(old_asset, correct_asset, 1)
                print(f'  Fixed MOMENT {moment_obj_count}: {old_asset} -> {correct_asset}')
    if in_moment_array and '{"id":' in stripped:
        moment_obj_count += 1

    new_lines.append(line)

with open('src/services/story-assets.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'Total IMAGE objects: {image_obj_count}, MOMENT objects: {moment_obj_count}')
print('story-assets.ts mapping fixed successfully')
