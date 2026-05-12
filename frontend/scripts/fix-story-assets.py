import re

with open('src/services/story-assets.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all import lines preserving order
import_lines = re.findall(r"import asset\d+ from '@/static/images/story/[^']+'", content)

# Rebuild imports with correct sequential numbering
new_imports = []
for idx, line in enumerate(import_lines):
    path = line.split("from ")[1]
    new_imports.append(f"import asset{idx} from {path}")

# Replace imports in content
import_pattern = re.compile(r"import asset\d+ from '@/static/images/story/[^']+'")
new_content = import_pattern.sub(lambda m, it=iter(new_imports): next(it), content)

# Now fix all references in the array: src: assetX
# We need to map old asset numbers to new ones based on import order
# But since we already replaced imports, the old numbers in the array are now wrong.
# Let's find what the original numbers were by looking at the original content.

# Extract original asset numbers from original imports
orig_nums = []
for line in import_lines:
    m = re.search(r'asset(\d+)', line)
    if m:
        orig_nums.append(int(m.group(1)))

# Create mapping from original number to new number
mapping = {}
for new_num, old_num in enumerate(orig_nums):
    mapping[old_num] = new_num

# Replace all src: assetX references in the array (and xingAvatarWebp)
# Use word boundary to avoid partial matches
def replace_src(m):
    old_num = int(m.group(1))
    new_num = mapping.get(old_num, old_num)
    return f'src: asset{new_num}'

new_content = re.sub(r'src: asset(\d+)\b', replace_src, new_content)

with open('src/services/story-assets.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('story-assets.ts fixed successfully')
