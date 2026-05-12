with open('src/data/story.generated.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = '[图片插入:scene-classroom|惨白教室内部|场景资产][图鉴解锁:scene-classroom]'
new = '[图片插入:img-d04-footprint-x17|浓雾中的光脚脚印与铭牌|主线证据][图鉴解锁:img-d04-footprint-x17]'
content = content.replace(old, new)

with open('src/data/story.generated.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('story.generated.ts updated successfully')
