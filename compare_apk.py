import zipfile, os

def apk_stats(path, label):
    size = os.path.getsize(path)
    lines = []
    lines.append(f'=== {label}: {size} bytes ({size/1024/1024:.2f} MB) ===')
    z = zipfile.ZipFile(path)
    total = 0
    files = []
    for info in z.infolist():
        total += info.file_size
        files.append((info.file_size, info.filename))
    files.sort(reverse=True)
    lines.append(f'Total uncompressed: {total} bytes ({total/1024/1024:.2f} MB)')
    lines.append('Top 30 largest files:')
    for s, name in files[:30]:
        lines.append(f'  {s:>10}  {name}')
    return lines, {name: s for s, name in files}

a_lines, a_files = apk_stats(r'C:\Users\EricWeston\Desktop\Echo-debug.apk', 'Echo-debug.apk')
b_lines, b_files = apk_stats(r'C:\Users\EricWeston\Desktop\Echo.apk', 'Echo.apk')

with open('apk_compare_result.txt', 'w', encoding='utf-8') as f:
    for line in a_lines:
        f.write(line + '\n')
    f.write('\n')
    for line in b_lines:
        f.write(line + '\n')
    f.write('\n=== File size diff (only in debug or significantly larger) ===\n')
    all_names = set(a_files.keys()) | set(b_files.keys())
    diff = []
    for name in sorted(all_names):
        sa = a_files.get(name, 0)
        sb = b_files.get(name, 0)
        if sa != sb:
            diff.append((sa - sb, name, sa, sb))
    diff.sort(reverse=True)
    for d, name, sa, sb in diff:
        f.write(f'{d:+10}  {name}  (debug={sa}, release={sb})\n')
