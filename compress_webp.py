#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全量重压壁纸 webp：最长边限制 1920px + quality=75（method=6, alpha_quality=90）。
先备份原图到 .backup_webp/，再原地覆盖压缩。安全可重跑。
"""
import os, glob, shutil
from PIL import Image

ROOT = r'C:\Users\pyk\Desktop\new\代码\随机壁纸'
DIRS = ['anime', 'beauty', 'special']
BACKUP = os.path.join(ROOT, '.backup_webp')
MAX_EDGE = 1920
QUALITY = 75
METHOD = 6
ALPHA_QUALITY = 90


def prep(im: Image.Image) -> Image.Image:
    """归一化色彩模式，保留透明通道。"""
    if im.mode in ('RGBA', 'LA'):
        return im.convert('RGBA')
    if im.mode == 'P':
        return im.convert('RGBA' if 'transparency' in im.info else 'RGB')
    if im.mode in ('RGB', 'L'):
        return im
    return im.convert('RGB')


def main():
    # 1) 备份原图（镜像目录结构）
    for d in DIRS:
        src = os.path.join(ROOT, d)
        dst = os.path.join(BACKUP, d)
        os.makedirs(dst, exist_ok=True)
        for f in glob.glob(os.path.join(src, '*.webp')):
            shutil.copy2(f, os.path.join(dst, os.path.basename(f)))
    print('[1/2] backup done ->', BACKUP)

    # 2) 压缩
    before = after = n = 0
    for d in DIRS:
        src = os.path.join(ROOT, d)
        for f in glob.glob(os.path.join(src, '*.webp')):
            im = prep(Image.open(f))
            w, h = im.size
            if max(w, h) > MAX_EDGE:
                im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
            sz0 = os.path.getsize(f)
            im.save(f, 'WEBP', quality=QUALITY, method=METHOD, alpha_quality=ALPHA_QUALITY)
            sz1 = os.path.getsize(f)
            before += sz0
            after += sz1
            n += 1
    saved = (1 - after / before) * 100 if before else 0
    print(f'[2/2] processed={n}  before={before/1048576:.1f}MB  '
          f'after={after/1048576:.1f}MB  saved={saved:.1f}%')


if __name__ == '__main__':
    main()
