import Link from 'next/link'
import { site } from '@/lib/site'

const featured = [
  ['Apex Carbon Control 16mm','2.890.000 đ','Mới 100%','APEX'],
  ['Nova Hybrid Pro 14mm','2.450.000 đ','Like new','NOVA'],
  ['Volt Power Max 16mm','1.990.000 đ','Đã sử dụng','VOLT'],
  ['Aero Touch 14mm','3.290.000 đ','Mới 100%','AERO'],
]

export default function HomePage(){
  const website = {'@context':'https://schema.org','@type':'WebSite',name:site.name,url:site.url,potentialAction:{'@type':'SearchAction',target:`${site.url}/marketplace?q={search_term_string}`,'query-input':'required name=search_term_string'}}
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(website)}}/>
    <section className="hero"><div className="container heroGrid"><div>
      <span className="eyebrow">✓ Người mua & người bán đều được xác thực</span>
      <h1>Chợ vợt Pickleball <span style={{color:'var(--green)'}}>đáng tin cậy</span></h1>
      <p>Mua vợt mới, vợt cũ, định giá và giao dịch trong một marketplace chuyên biệt. Hồ sơ uy tín, tình trạng minh bạch, ảnh thật và quy trình bảo vệ hai bên.</p>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:28}}><Link className="btn primary" href="/marketplace">Khám phá marketplace</Link><Link className="btn lime" href="/dang-ban">＋ Đăng bán vợt</Link></div>
    </div><div className="heroCard"><span className="eyebrow" style={{background:'rgba(255,255,255,.12)',color:'#efffc0'}}>Trust layer</span><h2>{site.tagline}</h2><div className="trustGrid"><div className="trustBox"><b>🪪 Danh tính</b><br/><small>KYC người mua & người bán</small></div><div className="trustBox"><b>🏦 Ngân hàng</b><br/><small>Đối chiếu chủ tài khoản</small></div><div className="trustBox"><b>🏓 Vợt</b><br/><small>Serial, ảnh và chứng từ</small></div><div className="trustBox"><b>🛡 Giao dịch</b><br/><small>Theo dõi trạng thái & tranh chấp</small></div></div></div></div></section>
    <section className="section"><div className="container"><div className="sectionHead"><div><h2>Vợt nổi bật</h2><p>Trang sản phẩm riêng giúp người mua xem rõ tình trạng, người bán và lịch sử xác thực.</p></div><Link className="btn" href="/marketplace">Xem tất cả</Link></div><div className="grid grid4">{featured.map(([name,price,state,mark],i)=><Link key={name} className="productCard" href={`/san-pham/${name.toLowerCase().replaceAll(' ','-').replace(/[^a-z0-9-]/g,'')}`}><div className="productMedia"><div className="paddle" style={{borderColor:['#dfff4f','#68b8ff','#ff79b8','#eee'][i]}}><span style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#fff',fontWeight:900,fontSize:12}}>{mark}</span></div></div><div className="productBody"><b>{name}</b><p style={{color:'var(--muted)',margin:'5px 0'}}>{state} • Người bán đã xác thực</p><div className="price">{price}</div></div></Link>)}</div></div></section>
    <section className="section soft"><div className="container"><div className="sectionHead"><div><h2>Không chỉ là chỗ đăng tin</h2><p>ChoVot được thiết kế theo vòng đời của một cây vợt.</p></div></div><div className="grid grid4"><div className="card"><h3>🔎 Tìm & so sánh</h3><p>Lọc theo tình trạng, độ dày, mức giá, thương hiệu và người bán.</p></div><div className="card"><h3>💰 Định giá</h3><p>Ước tính khoảng giá theo model, tuổi vợt, tình trạng và dữ liệu giao dịch.</p></div><div className="card"><h3>🔁 Đổi / ký gửi</h3><p>Hỗ trợ đổi ngang, bù chênh lệch hoặc ký gửi khi hệ thống vận hành đầy đủ.</p></div><div className="card"><h3>✅ Xác thực</h3><p>Danh tính người dùng và tình trạng cây vợt là hai lớp xác thực tách biệt.</p></div></div></div></section>
    <section className="section"><div className="container"><div className="sectionHead"><div><h2>Kiến thức chọn và mua vợt</h2><p>Nội dung chuyên sâu, có ngày cập nhật và câu trả lời trực tiếp để người chơi ra quyết định nhanh.</p></div><Link className="btn" href="/blog">Xem kiến thức</Link></div><div className="grid grid3"><Link className="card articleCard" href="/blog/vot-pickleball-14mm-va-16mm"><h3>Vợt Pickleball 14mm và 16mm khác nhau thế nào?</h3><p>Câu trả lời ngắn, bảng so sánh và cách chọn theo lối chơi.</p></Link><Link className="card articleCard" href="/blog/kiem-tra-vot-pickleball-cu"><h3>Checklist kiểm tra vợt cũ trước khi mua</h3><p>Viền, mặt vợt, cán, serial, hóa đơn và các dấu hiệu nên tránh.</p></Link><Link className="card articleCard" href="/blog/dinh-gia-vot-pickleball-cu"><h3>Cách định giá vợt Pickleball cũ</h3><p>Khung định giá theo model, độ mới, thanh khoản và phụ kiện đi kèm.</p></Link></div></div></section>
  </main>
}
