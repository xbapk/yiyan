#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebP → PNG 全量替换（站点改用 PNG）：
1) 各分类 webp 转同名 .png（保留透明通道、同分辨率）
2) 原 webp 移入 .trash/<分类>/（删除守卫拦删除，移动可回滚）
3) 重写 manifest.json：.webp → .png，并剔除磁盘不存在的幽灵条目
"""
import os, glob, json, shutil
from PIL import Image

ROOT = r'C:\Users\pyk\Desktop\new\代码\随机壁纸'
DIRS = ['anime', 'beauty', 'special']
TRASH = os.path.join(ROOT, '.trash')


def norm(im: Image.Image) -> Image.Image:
    """归一化色彩模式，保留透明通道。"""
    if im.mode == 'P':
        return im.convert('RGBA' if 'transparency' in im.info else 'RGB')
    if im.mode in ('RGB', 'RGBA', 'L'):
        return im
    return im.convert('RGB')


def main():
    # 1) 转换 + 归档原 webp
    made = skipped = 0
    before = after = 0
    os.makedirs(TRASH, exist_ok=True)
    for d in DIRS:
        src = os.path.join(ROOT, d)
        tdir = os.path.join(TRASH, d)
        os.makedirs(tdir, exist_ok=True)
        for f in glob.glob(os.path.join(src, '*.webp')):
            im = norm(Image.open(f))
            out = os.path.join(src, os.path.splitext(os.path.basename(f))[0] + '.png')
            if os.path.exists(out):
                skipped += 1
            else:
                im.save(out, 'PNG', optimize=True)
                made += 1
            before += os.path.getsize(f)
            after += os.path.getsize(out)
            # 原 webp 移入 .trash（保留可回滚）
            try:
                shutil.move(f, os.path.join(tdir, os.path.basename(f)))
            except Exception as e:
                print('  [move failed]', os.path.basename(f), e)
    print(f'[1/3] converted={made} skipped={skipped}  '
          f'webp={before/1048576:.1f}MB -> png={after/1048576:.1f}MB')

    # 2) 重写 manifest：换扩展名 + 剔除幽灵条目
    mp = os.path.join(ROOT, 'manifest.json')
    data = json.load(open(mp, encoding='utf-8'))
    new = {}
    ghosts = 0
    for k, urls in data.items():
        keep = []
        for u in urls:
            nu = u[:-5] + '.png' if u.lower().endswith('.webp') else u
            if os.path.exists(os.path.join(ROOT, nu)):
                keep.append(nu)
            else:
                ghosts += 1
        new[k] = keep
    json.dump(new, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    total = sum(len(v) for v in new.values())
    print(f'[2/3] manifest 重写完成：{dict((k, len(v)) for k, v in new.items())} '
          f'合计={total}  剔除幽灵={ghosts}')

    # 3) 残留检查
    left = 0
    for d in DIRS:
        left += len(glob.glob(os.path.join(ROOT, d, '*.webp')))
    print(f'[3/3] 图片目录残留 webp = {left}（0 表示全部替换完成）')


if __name__ == '__main__':
    main()
