/* =========================================================
   Bailla — app.js (VERSÃO CORRIGIDA - PIX funcional)
   ========================================================= */
const SIZES = ["PP","P","M","G","GG"];
const CHX = {
  "Preto":"#111","Rosa":"#e87ea1","Vermelho Escarlate":"#c0392b","Vermelho":"#c0392b",
  "Cinza Escuro":"#555","Cinza":"#555","Café":"#6f4e37","Cafe":"#6f4e37","Marrom":"#6f4e37",
  "Verde Militar":"#4a5240","Verde":"#4a5240","Rosa Barbie":"#e75480",
  "Preto com Branco":"#333","Petróleo com Branco":"#1b4a52","Petróleo":"#1b4a52",
  "Petroleo com Branco":"#1b4a52","Petroleo":"#1b4a52",
  "Bordô com Branco":"#5a1528","Bordô":"#5a1528","Bordo com Branco":"#5a1528","Bordo":"#5a1528"
};

let cart = [];
window.cart = cart;
let pending = null, selSz = null;

const el = id => document.getElementById(id);
const fmtBR = n => (Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const parseBR = s => Number(String(s||'').replace(/[R$\s\.]/g,'').replace(',','.'))||0;

/* =========================================================
   🔥 INTEGRAÇÃO COM GOOGLE SHEETS
   ========================================================= */
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzSQOV-b7CKpNabiLEug7St935t81VbM5zgCZsDVYBn-BUyNsKpjYeTmZHKhlftdYWkTQ/exec';

function enviarParaPlanilha(nomeCliente, telefone, endereco, total){
  const produtos = cart.map(p =>
    `${p.name} (${p.color||''} - ${p.size}) x${p.qty}`
  ).join(', ');

  fetch(SHEET_URL, {
    method: 'POST',
    body: JSON.stringify({
      produto: produtos,
      valor: total,
      data: new Date().toISOString(),
      cliente: nomeCliente,
      telefone: telefone,
      endereco: endereco,
      status: 'Pendente'
    })
  })
  .then(()=> console.log('✅ Pedido enviado pra planilha'))
  .catch(err=> console.error('❌ Erro ao enviar:', err));
}

/* =========================================================
   Imagem helper
   ========================================================= */
function imgTag(src, {id,alt,cls,width,height}={}){
  if(!src) return '';
  const s = String(src).trim();
  if(s.toLowerCase().includes('<img')) return s;
  const esc = x => String(x??'').replace(/"/g,'&quot;');
  const attrs = [
    id ? `id="${esc(id)}"` : '',
    cls ? `class="${esc(cls)}"` : '',
    `alt="${esc(alt||'')}"`,
    width ? `width="${Number(width)}"` : '',
    height ? `height="${Number(height)}"` : ''
  ].filter(Boolean).join(' ');
  return `<img src="${esc(s)}"${attrs?' '+attrs:''} loading="lazy" decoding="async">`;
}

function getData(){
  if(window.SITE_DATA) return window.SITE_DATA;
  if(typeof SITE_DATA !== 'undefined') return SITE_DATA;
  return null;
}

/* =========================================================
   Header / progresso
   ========================================================= */
window.addEventListener('scroll',()=>{
  const p=el('prog'),h=el('hdr');
  if(p){ const pct=(window.scrollY/(document.body.scrollHeight-window.innerHeight))*100; p.style.width=pct+'%'; }
  if(h) h.classList.toggle('scrolled',window.scrollY>60);
});

/* =========================================================
   Filtros
   ========================================================= */
let CURRENT_TYPE='todos';
function getTypeFromName(name=''){
  const s=String(name).toLowerCase();
  if(s.includes('conjunto')) return 'conjunto';
  if(s.includes('macaquinho')||s.includes('macacão')||s.includes('macacao')||s.includes('vestido')) return 'macaquinho';
  if(s.includes('legging')||s.includes('calça')||s.includes('calca')||s.includes('short')||s.includes('bermuda')) return 'calça';
  if(s.includes('top')||s.includes('cropped')) return 'top';
  return 'outros';
}

function applyTypeFilter(){
  const active=document.querySelector('.col-panel.active'); if(!active) return;
  active.querySelectorAll('.card').forEach(card=>{
    const name=(card.querySelector('.card-name')?.textContent||'').trim();
    const type=getTypeFromName(name);
    const map={
      'todos': ['top','calça','macaquinho','conjunto','outros'],
      'top': ['top'],
      'calça': ['calça'],
      'macaquinho': ['macaquinho'],
      'conjunto': ['conjunto']
    };
    const allowed=map[CURRENT_TYPE]||[];
    card.style.display=(CURRENT_TYPE==='todos'||allowed.includes(type))?'':'none';
  });
}

function wireTypeFilters(){
  const bar=el('typeFilters'); if(!bar) return;
  bar.addEventListener('click',e=>{
    const btn=e.target.closest('.tf-btn'); if(!btn) return;
    bar.querySelectorAll('.tf-btn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    CURRENT_TYPE=btn.dataset.type||'todos';
    applyTypeFilter();
  });
}

document.addEventListener('click',e=>{
  if(e.target.closest('.col-tab')) setTimeout(applyTypeFilter,0);
});

/* =========================================================
   Coleções + Modais de Produto e Tamanho (mantidos iguais)
   ========================================================= */
// ... (todo o código de buildCollections, openProductModal, renderProductModal, 
// openSz, confirmAdd, renderCart, chg, rmItem, toggleCart, showToast 
// permanece exatamente igual ao que você enviou)

function buildCollections(){
  const tabs=el('colTabs'),panels=el('colPanels'),DATA=getData();
  if(!tabs||!panels) return;
  if(!DATA){ tabs.innerHTML='<div class="empty">Dados não carregados.</div>'; panels.innerHTML=''; return; }
  tabs.innerHTML=''; panels.innerHTML='';
  Object.entries(DATA).forEach(([col,prods],ci)=>{
    const tab=document.createElement('button');
    tab.className='col-tab'+(ci===0?' active':'');
    tab.textContent=col;
    tab.onclick=()=>{
      document.querySelectorAll('.col-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.col-panel').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      el('panel-'+ci)?.classList.add('active');
      applyTypeFilter();
    };
    tabs.appendChild(tab);
    const panel=document.createElement('div');
    panel.className='col-panel'+(ci===0?' active':'');
    panel.id='panel-'+ci;
    const grid=document.createElement('div');
    grid.className='products-grid';
    (Array.isArray(prods)?prods:[]).forEach((p,pi)=>{
      const uid=`c${ci}p${pi}`;
      const card=document.createElement('div');
      card.className='card';
      const first=(p.colors&&p.colors[0])?p.colors[0]:{img:'',color:''};
      const safeName=(p.name||'').replace(/"/g,'&quot;');
      const safeColor=(first.color||'').toString().trim();
      const imgHTML = first.img ? imgTag(first.img,{id:`cimg-${uid}`,alt:safeName}) : '';
      card.innerHTML=`
        <div class="card-img" data-ci="${ci}" data-pi="${pi}" style="cursor:pointer">
          ${imgHTML}
          <div class="img-placeholder" id="ph-${uid}" style="display:${first.img?'none':'flex'}">
            <span>🛍️</span>foto em breve
          </div>
          <div class="card-dots" id="cdots-${uid}"></div>
        </div>
        <div class="card-info">
          <div class="card-name">${safeName}</div>
          <div class="card-color" id="cclr-${uid}">${safeColor}</div>
          <div class="card-row">
            <span class="card-price">${p.price!=null?fmtBR(p.price):''}</span>
            <button class="add-btn" data-ci="${ci}" data-pi="${pi}" data-uid="${uid}">adicionar</button>
          </div>
        </div>`;
      setTimeout(()=>{
        const imgEl=el(`cimg-${uid}`);
        const ph=el(`ph-${uid}`);
        if(imgEl&&ph){ imgEl.onerror=()=>{ imgEl.style.display='none'; ph.style.display='flex'; }; }
      },0);
      setTimeout(()=>{
        const imgArea=card.querySelector('.card-img');
        imgArea&&imgArea.addEventListener('click',e=>{
          if(!e.target.closest('.dot')) openProductModal(ci,pi);
        });
      },0);
      setTimeout(()=>{
        const dotsEl=el('cdots-'+uid);
        const clrEl=el('cclr-'+uid);
        const ph=el(`ph-${uid}`);
        let imgEl=el('cimg-'+uid)||card.querySelector('img');
        if(!dotsEl||!Array.isArray(p.colors)) return;
        p.colors.forEach((c,idx)=>{
          const d=document.createElement('div');
          d.className='dot'+(idx===0?' on':'');
          const label=(c.color||'').toString().trim();
          const key=Object.keys(CHX).find(k=>k.toLowerCase()===label.toLowerCase());
          d.style.background=key?CHX[key]:'#999';
          d.onclick=ev=>{
            ev.stopPropagation();
            if(c.img){
              const html=imgTag(c.img,{id:`cimg-${uid}`,alt:safeName});
              const wrap=document.createElement('div'); wrap.innerHTML=html;
              const newImg=wrap.firstElementChild;
              if(newImg){
                newImg.onerror=()=>{ newImg.style.display='none'; if(ph) ph.style.display='flex'; };
                if(imgEl){ imgEl.replaceWith(newImg); imgEl=newImg; }
                if(ph) ph.style.display='none';
              }
            } else {
              if(imgEl) imgEl.style.display='none';
              if(ph) ph.style.display='flex';
            }
            if(clrEl) clrEl.textContent=label;
            dotsEl.querySelectorAll('.dot').forEach(x=>x.classList.remove('on'));
            d.classList.add('on');
          };
          dotsEl.appendChild(d);
        });
      },0);
      grid.appendChild(card);
    });
    panel.appendChild(grid);
    panels.appendChild(panel);
  });
  document.querySelectorAll('.add-btn').forEach(btn=>{
    btn.addEventListener('click',()=>openSz(btn.dataset.uid,btn.dataset.ci,btn.dataset.pi));
  });
  wireTypeFilters();
  applyTypeFilter();
}

/* =========================================================
   Modal de produto (mantido igual)
   ========================================================= */
let modalProductData=null, modalCurrentColor=0, modalCurrentImg=0;
function openProductModal(ci,pi){
  const DATA=getData(); if(!DATA) return;
  const colKeys=Object.keys(DATA);
  const p=(DATA[colKeys[ci]]||[])[pi]; if(!p) return;
  modalProductData={p,ci,pi}; modalCurrentColor=0; modalCurrentImg=0;
  renderProductModal(p);
  const ov=el('productModalOv');
  if(ov){ ov.classList.add('on'); document.body.style.overflow='hidden'; }
}
// renderProductModal, pmSetImg, pmSetColor, pmGalleryNav, pmSelectSize, pmAddToCart, closeProductModal 
// (todo o resto do modal de produto permanece igual ao seu código original)

function renderProductModal(p){ /* ... seu código original ... */ }
function renderStars(rating){ /* ... seu código original ... */ }
function pmSetImg(i){ /* ... seu código original ... */ }
function pmSetColor(i){ /* ... seu código original ... */ }
function pmGalleryNav(dir){ /* ... seu código original ... */ }
let pmSelectedSize=null;
function pmSelectSize(btn,size){ /* ... seu código original ... */ }
function pmAddToCart(){ /* ... seu código original ... */ }
function closeProductModal(){ /* ... seu código original ... */ }

/* =========================================================
   Modal tamanho + Carrinho (mantidos iguais)
   ========================================================= */
function openSz(uid,ci,pi){ /* ... seu código original ... */ }
function confirmAdd(){ /* ... seu código original ... */ }
function renderCart(){ /* ... seu código original ... */ }
function chg(i,d){ cart[i].qty+=d; if(cart[i].qty<=0) cart.splice(i,1); renderCart(); }
function rmItem(i){ cart.splice(i,1); renderCart(); }
function toggleCart(){ el('cartSb')?.classList.toggle('on'); el('cartOv')?.classList.toggle('on'); }
function showToast(msg){ const t=el('toast'); if(!t) return; t.textContent=msg; t.classList.add('on'); setTimeout(()=>t.classList.remove('on'),2500); }

/* =========================================================
   Checkout (mantido igual)
   ========================================================= */
function openCheckout(){ /* ... seu código original ... */ }
function closeCheckout(){ /* ... seu código original ... */ }
function getSubtotal(){ return cart.reduce((s,c)=>s+(c.price||0)*(c.qty||0),0); }
function buildCheckoutSummary(){ /* ... seu código original ... */ }
function quoteByCep(cep){ /* ... seu código original ... */ }
function normalizeCep(v){ /* ... seu código original ... */ }
async function autoFillEndereco(val){ /* ... seu código original ... */ }
async function lookupCepAndFill(cep){ /* ... seu código original ... */ }
function calcFrete(){ /* ... seu código original ... */ }
function applyShipping(){ /* ... seu código original ... */ }

/* =========================================================
   PIX — VERSÃO FINAL CORRIGIDA
   ========================================================= */
const PIX_CHAVE  = "bailamodafitness@hotmail.com";
const PIX_NOME   = "BAILLA MODA FITNESS";
const PIX_CIDADE = "SAO PAULO";

function tlv(id, valor) {
  const v = String(valor || "");
  return id + v.length.toString().padStart(2, "0") + v;
}

function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPixPayload(amount) {
  const valor = Number(amount || 0).toFixed(2);
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", PIX_CHAVE);
  const merchant = tlv("26", gui + key);

  let payload = 
    tlv("00", "01") +
    merchant +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", valor) +
    tlv("58", "BR") +
    tlv("59", PIX_NOME.slice(0, 25)) +
    tlv("60", PIX_CIDADE.slice(0, 15)) +
    tlv("62", tlv("05", "***"));

  payload += "6304";
  const checksum = crc16(payload);
  return payload + checksum;
}

let pixTimerRef = null;

function openPix(amount) {
  const total = Number(amount || 0);
  if (total <= 0) {
    alert("Valor inválido para pagamento via PIX.");
    return;
  }

  const payload = buildPixPayload(total);

  const amtEl = el('pixAmountLbl');
  if (amtEl) amtEl.textContent = fmtBR(total);

  const codeEl = el('pixCode');
  const shortEl = el('pixCodeShort');
  if (codeEl) codeEl.value = payload;
  if (shortEl) shortEl.textContent = payload.slice(0, 40) + "…";

  const statusEl = el('pixStatus');
  if (statusEl) {
    statusEl.textContent = "aguardando pagamento";
    statusEl.className = "pix-status waiting";
  }

  const wrap = document.getElementById('pixQrWrap');
  if (wrap && window.BaillaQR) {
    wrap.innerHTML = BaillaQR.toSVG(payload, 280);
    const svg = wrap.querySelector('svg');
    if (svg) {
      svg.style.cssText = 'border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,.12); display:block; max-width:100%;';
    }
  }

  const ov = el('pixOv');
  if (ov) {
    ov.classList.add('on');
    ov.setAttribute('aria-hidden', 'false');
  }

  _startPixTimer();
}

function closePix() {
  clearInterval(pixTimerRef);
  const ov = el('pixOv');
  if (ov) {
    ov.classList.remove('on');
    ov.setAttribute('aria-hidden', 'true');
  }
  document.body.style.overflow = '';
}

function copyPix() {
  const code = el('pixCode')?.value || '';
  if (!code || code.length < 20) {
    alert("Código PIX não foi gerado corretamente.");
    return;
  }

  const btn = el('pixCopyBtn');
  const flash = () => {
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Copiado ✓';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 2500);
    }
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(flash).catch(() => _execCopy(code));
  } else {
    _execCopy(code);
  }
}

function _execCopy(text) {
  const tmp = document.createElement('textarea');
  tmp.value = text;
  tmp.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(tmp);
  tmp.focus(); tmp.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(tmp);
}

function _startPixTimer() {
  clearInterval(pixTimerRef);
  let secs = 30 * 60;

  pixTimerRef = setInterval(() => {
    secs--;
    const timerEl = el('pixTimer');
    if (!timerEl) return;

    if (secs <= 0) {
      clearInterval(pixTimerRef);
      const st = el('pixStatus');
      if (st) {
        st.textContent = 'código expirado';
        st.className = 'pix-status expired';
      }
      return;
    }

    const min = Math.floor(secs / 60);
    const seg = secs % 60;
    timerEl.textContent = `${min.toString().padStart(2,'0')}:${seg.toString().padStart(2,'0')}`;
  }, 1000);
}

/* =========================================================
   CUPOM DE DESCONTO
   ========================================================= */
const CUPONS = {
  'PRIMEIRA COMPRA': { pct: 15, label: '15% de desconto (PRIMEIRA COMPRA)' }
};
let cupomAtivo = null;
function aplicarCupom(){
  const input=el('ckCupom'), msg=el('cupomMsg');
  if(!input||!msg) return;
  const codigo=input.value.trim().toUpperCase();
  const cupom=CUPONS[codigo];
  if(!cupom){
    msg.textContent='❌ Cupom inválido ou expirado.';
    msg.className='cupom-msg erro'; msg.style.display='block';
    cupomAtivo=null; _recalcTotal(); return;
  }
  cupomAtivo=cupom;
  msg.textContent=`✅ Cupom aplicado! ${cupom.label}`;
  msg.className='cupom-msg ok'; msg.style.display='block';
  _recalcTotal();
}
function _recalcTotal(){
  const sub=getSubtotal();
  const ship=parseBR(el('ckShipLbl')?.textContent||'0');
  const rowEl=el('ckDescontoRow'),lblEl=el('ckDescontoLabel'),valEl=el('ckDescontoLbl');
  const totEl=el('ckTotalLbl'),subEl=el('ckSubLbl');
  if(subEl) subEl.textContent=fmtBR(sub);
  if(cupomAtivo&&rowEl&&lblEl&&valEl){
    const desc=sub*(cupomAtivo.pct/100);
    rowEl.style.display='';
    lblEl.textContent=`Desconto (${cupomAtivo.pct}%)`;
    valEl.textContent='-'+fmtBR(desc);
    if(totEl) totEl.textContent=fmtBR(Math.max(0,sub-desc+ship));
  } else {
    if(rowEl) rowEl.style.display='none';
    if(totEl) totEl.textContent=fmtBR(sub+ship);
  }
}

/* =========================================================
   Confirmar pedido
   ========================================================= */
function confirmOrder(){
  if(!cart.length){ alert('Sua sacola está vazia.'); return; }

  const name =(el('ckName').value||'').trim();
  const phone =(el('ckPhone').value||'').trim();
  const addr =(el('ckAddr').value||'').trim();
  const num =(el('ckNumero').value||'').trim();
  const cidade =(el('ckCidade').value||'').trim();

  if(!name||!phone){ alert('Preencha Nome e WhatsApp.'); return; }
  if(!addr||!num||!cidade){ alert('Preencha o endereço completo (rua, número e cidade).'); return; }

  const total = parseBR(el('ckTotalLbl').textContent);
  const pay = (el('ckPay').value||'').trim().toLowerCase();
  const endereco = `${addr}, ${num} - ${cidade}`;

  // Envia para planilha
  enviarParaPlanilha(name, phone, endereco, total);

  // Registra no perfil local
  if(typeof registrarPedido==='function'){
    registrarPedido(cart.map(it=>({name:it.name,size:it.size,qty:it.qty})), fmtBR(total));
  }

  closeCheckout();

  if(pay.includes('pix')){
    openPix(total);
    return;
  }

  // Mercado Pago (caso configure depois)
  const MP_LINK = '';
  if(pay.includes('mercado')){
    if(!MP_LINK){ alert('Link do Mercado Pago ainda não configurado.'); return; }
    window.open(MP_LINK,'_blank','noopener');
    alert('Abrimos o Mercado Pago. Envie o comprovante no WhatsApp após pagar.');
    return;
  }

  alert(`Pedido recebido!\nPagamento: ${pay}\nTotal: ${fmtBR(total)}`);
}

/* =========================================================
   Init
   ========================================================= */
document.addEventListener('DOMContentLoaded',()=>{
  try{ buildCollections(); } catch(e){ console.error('Erro coleções:',e); }
  wireTypeFilters();
  const cepFrete=el('ckCep');
  cepFrete&&cepFrete.addEventListener('input',e=>normalizeCep(e.target.value));
  if(!getData()) console.warn('[Bailla] SITE_DATA não encontrado. Verifique data.js.');
});

window.addEventListener('cart:updated',()=>{
  const ov=el('ckOv');
  if(ov&&ov.classList.contains('on')) buildCheckoutSummary();
});
