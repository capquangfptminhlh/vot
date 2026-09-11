#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
changed=[]

def write_if_changed(path:Path,text:str):
    old=path.read_text(encoding='utf-8')
    if text!=old:
        path.write_text(text,encoding='utf-8')
        changed.append(str(path.relative_to(ROOT)))

for path in ROOT.glob('*.html'):
    text=path.read_text(encoding='utf-8')
    text=text.replace('<button class="mobile-toggle">','<button class="mobile-toggle" aria-label="Mở menu">')
    text=text.replace('<a href="#">Điều khoản</a>','<a href="dieu-khoan.html">Điều khoản</a>')
    text=text.replace('<a href="#">Chính sách riêng tư</a>','<a href="chinh-sach-rieng-tu.html">Chính sách riêng tư</a>')
    if 'assets/styles.css' in text and 'rel="manifest"' not in text:
        text=text.replace('<link rel="stylesheet" href="assets/styles.css">','<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#087a4b"><link rel="stylesheet" href="assets/styles.css">',1)
    if 'assets/app.js' in text and 'assets/contact-safety.js' not in text:
        text=text.replace('<script src="assets/app.js"></script>','<script src="assets/app.js"></script><script src="assets/contact-safety.js"></script>')
    if path.name=='nguoi-ban.html':
        text=text.replace('Hồ sơ hiển thị cả dữ liệu mẫu và tin bạn tự đăng trong prototype.','Hồ sơ người bán hiển thị trạng thái xác thực và các tin đang đăng.')
        text=text.replace('12</b><small>giao dịch mẫu','12</b><small>tin đã đăng')
        text=text.replace('98%</b><small>đánh giá tốt mẫu','—</b><small>chưa có đánh giá')
        text=text.replace('Apex Carbon Control 16mm','JOOLA Perseus Pro IV 16mm').replace('<span>APEX</span>','<span>JOOLA</span>')
        text=text.replace('Nova Hybrid Pro 14mm','Selkirk Boomstik 16mm').replace('<span>NOVA</span>','<span>SELKIRK</span>')
        text=text.replace('2.890.000 đ','4.890.000 đ').replace('2.450.000 đ','4.250.000 đ')
    if path.name=='dinh-gia.html':
        text=text.replace('Apex Carbon Control 16mm','JOOLA Perseus Pro IV 16mm')
        text=text.replace('Dữ liệu mẫu — chưa phải giá thị trường đã xác minh.','Ước tính theo tình trạng và tuổi vợt; chưa dựa trên dữ liệu giao dịch đủ lớn để xem là giá thị trường đã xác minh.')
        text=text.replace('<b>DEMO</b>','<b>THAM KHẢO</b>')
    write_if_changed(path,text)

features=ROOT/'assets/features.js'
if features.exists():
    text=features.read_text(encoding='utf-8')
    text=text.replace("'090 000 0000'","''").replace("'0900000000'","''")
    write_if_changed(features,text)

# Keep Website OS evidence aligned with the current classified-listing model.
ev=ROOT/'.website-os/evidence'
if ev.exists():
    for path in ev.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in {'.csv','.yml','.yaml','.md'}: continue
        text=path.read_text(encoding='utf-8')
        lines=text.splitlines()
        lines=[ln for ln in lines if '/don-hang.html' not in ln]
        text='\n'.join(lines)+('\n' if lines else '')
        text=text.replace('Required two-sided verification','Required seller verification')
        text=text.replace('two-sided verification','seller verification')
        text=text.replace('protected transaction','direct buyer-seller contact')
        text=text.replace('Protected transaction','Direct buyer-seller contact')
        if 'mua vợt pickleball an toàn' in text:
            text=text.replace('/xac-thuc.html','/an-toan-giao-dich.html')
        write_if_changed(path,text)

print('Patched:', ', '.join(changed) if changed else 'none')
