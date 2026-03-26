/* =========================================================
   Bailla — app.js
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

const el      = id => document.getElementById(id);
const fmtBR   = n  => (Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const parseBR = s  => Number(String(s||'').replace(/[R$\s\.]/g,'').replace(',','.'))||0;

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
      produto:  produtos,
      valor:    total,
      data:     new Date().toISOString(),
      cliente:  nomeCliente,
      telefone: telefone,
      endereco: endereco,
      status:   'Pendente'
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
    id     ? `id="${esc(id)}"`       : '',
    cls    ? `class="${esc(cls)}"`   : '',
    `alt="${esc(alt||'')}"`,
    width  ? `width="${Number(width)}"` : '',
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
      'todos':      ['top','calça','macaquinho','conjunto','outros'],
      'top':        ['top'],
      'calça':      ['calça'],
      'macaquinho': ['macaquinho'],
      'conjunto':   ['conjunto']
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
   Coleções
   ========================================================= */
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

      const imgHTML = first.img
        ? imgTag(first.img,{id:`cimg-${uid}`,alt:safeName})
        : '';

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
   Modal de produto
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

function renderProductModal(p){
  const colors=p.colors||[];
  const curCol=colors[modalCurrentColor]||{};
  const images=curCol.imgs||(curCol.img?[curCol.img]:[]);

  const mainImg=el('pmMainImg');
  if(mainImg){ mainImg.src=images[modalCurrentImg]||curCol.img||''; mainImg.alt=p.name||''; }

  const thumbs=el('pmThumbs');
  if(thumbs){
    if(images.length>1){
      thumbs.innerHTML=images.map((src,i)=>`
        <div class="pm-thumb ${i===modalCurrentImg?'active':''}" onclick="pmSetImg(${i})">
          <img src="${src}" alt="${p.name||''}">
        </div>`).join('');
    } else if(colors.length>1){
      thumbs.innerHTML=colors.map((c,i)=>`
        <div class="pm-thumb ${i===modalCurrentColor?'active':''}" onclick="pmSetColor(${i})" title="${c.color||''}">
          <img src="${c.img||''}" alt="${c.color||''}">
        </div>`).join('');
    } else { thumbs.innerHTML=''; }
  }

  const prev=el('pmPrev'),next=el('pmNext');
  if(prev) prev.style.display=images.length>1?'':'none';
  if(next) next.style.display=images.length>1?'':'none';

  const nameEl=el('pmName'),priceEl=el('pmPrice'),ratingEl=el('pmRating'),installEl=el('pmInstall');
  if(nameEl)   nameEl.textContent=p.name||'';
  if(priceEl)  priceEl.textContent=p.price!=null?fmtBR(p.price):'';
  if(ratingEl) ratingEl.innerHTML=renderStars(p.rating||4.4);
  if(installEl&&p.price) installEl.textContent=`1x ${fmtBR(p.price)} sem juros`;

  const colorLabel=el('pmColorLabel'),colorPicks=el('pmColorPicks');
  if(colorLabel) colorLabel.textContent=`Cor: ${curCol.color||''}`;
  if(colorPicks){
    colorPicks.innerHTML=colors.map((c,i)=>{
      const label=(c.color||'').toString().trim();
      const key=Object.keys(CHX).find(k=>k.toLowerCase()===label.toLowerCase());
      const bg=key?CHX[key]:'#999';
      return `<button class="pm-color-dot ${i===modalCurrentColor?'active':''}" style="background:${bg}" title="${label}" onclick="pmSetColor(${i})"></button>`;
    }).join('');
  }

  const szGrid=el('pmSzGrid');
  if(szGrid) szGrid.innerHTML=SIZES.map(s=>`<button class="pm-sz" onclick="pmSelectSize(this,'${s}')">${s}</button>`).join('');

  const addBtn=el('pmAddBtn');
  if(addBtn){ addBtn.disabled=true; addBtn.textContent='selecione um tamanho'; addBtn.onclick=pmAddToCart; }

  const descEl=el('pmDesc');
  if(descEl) descEl.textContent=p.desc||`${p.name||'Produto'} Bailla Fitness. Tecido de alta performance com conforto e estilo.`;
}

function renderStars(rating){
  const full=Math.floor(rating),half=(rating-full)>=0.5?1:0,empty=5-full-half;
  return '★'.repeat(full)+(half?'½':'')+'☆'.repeat(empty)+` <span class="pm-rating-num">${Number(rating).toFixed(1)}</span>`;
}

function pmSetImg(i){
  const p=modalProductData?.p;
  const curCol=(p?.colors||[])[modalCurrentColor]||{};
  const images=curCol.imgs||(curCol.img?[curCol.img]:[]);
  modalCurrentImg=i;
  const mainImg=el('pmMainImg'); if(mainImg) mainImg.src=images[i]||'';
  document.querySelectorAll('.pm-thumb').forEach((t,idx)=>t.classList.toggle('active',idx===i));
}

function pmSetColor(i){
  modalCurrentColor=i; modalCurrentImg=0;
  if(modalProductData?.p) renderProductModal(modalProductData.p);
}

function pmGalleryNav(dir){
  const p=modalProductData?.p;
  const curCol=(p?.colors||[])[modalCurrentColor]||{};
  const images=curCol.imgs||(curCol.img?[curCol.img]:[]);
  if(images.length<=1) return;
  modalCurrentImg=(modalCurrentImg+dir+images.length)%images.length;
  pmSetImg(modalCurrentImg);
}

let pmSelectedSize=null;
function pmSelectSize(btn,size){
  pmSelectedSize=size;
  document.querySelectorAll('.pm-sz').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  const addBtn=el('pmAddBtn');
  if(addBtn){ addBtn.disabled=false; addBtn.textContent='adicionar à sacola'; }
}

function pmAddToCart(){
  if(!pmSelectedSize||!modalProductData) return;
  const p=modalProductData.p;
  const curCol=(p.colors||[])[modalCurrentColor]||{};
  const ex=cart.find(c=>c.name===p.name&&c.color===(curCol.color||'')&&c.size===pmSelectedSize);
  if(ex) ex.qty++; else cart.push({name:p.name,price:p.price,color:curCol.color||'',img:curCol.img||'',size:pmSelectedSize,qty:1});
  closeProductModal(); showToast('Produto adicionado ✓'); renderCart();
}

function closeProductModal(){
  const ov=el('productModalOv');
  if(ov){ ov.classList.remove('on'); document.body.style.overflow=''; }
  pmSelectedSize=null;
}

document.addEventListener('click',e=>{
  if(e.target.id==='productModalOv') closeProductModal();
});

/* =========================================================
   Modal tamanho (botão "adicionar" do card)
   ========================================================= */
function openSz(uid,ci,pi){
  const DATA=getData(); if(!DATA) return;
  const colKeys=Object.keys(DATA);
  const p=(DATA[colKeys[ci]]||[])[pi]; if(!p) return;
  const clrEl=el('cclr-'+uid);
  const clr=clrEl?clrEl.textContent.trim():((p.colors&&p.colors[0]&&p.colors[0].color)||'').trim();
  const co=(p.colors||[]).find(x=>(x.color||'').trim()===clr)||(p.colors||[])[0]||{};
  pending={name:p.name,price:p.price,color:clr,img:co.img||''}; selSz=null;
  el('szName').textContent=p.name||''; el('szSub').textContent='cor: '+(clr||'').toUpperCase();
  const grid=el('szGrid'); grid.innerHTML='';
  SIZES.forEach(s=>{
    const b=document.createElement('button'); b.className='sz'; b.textContent=s;
    b.onclick=()=>{ grid.querySelectorAll('.sz').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); selSz=s; const c=el('confBtn'); c.disabled=false; c.textContent='adicionar à sacola'; };
    grid.appendChild(b);
  });
  const c=el('confBtn'); c.disabled=true; c.textContent='selecione um tamanho';
  el('szOv').classList.add('on');
}

function confirmAdd(){
  if(!pending||!selSz) return;
  const ex=cart.find(c=>c.name===pending.name&&c.color===pending.color&&c.size===selSz);
  if(ex) ex.qty++; else cart.push({...pending,size:selSz,qty:1});
  el('szOv').classList.remove('on'); showToast('Produto adicionado ✓'); renderCart();
}

/* =========================================================
   Carrinho
   ========================================================= */
function renderCart(){
  const body=el('cartBody'),ft=el('cartFt');
  const tq=cart.reduce((s,c)=>s+(c.qty||0),0);
  const badge=el('badge'); if(badge){ badge.textContent=tq; badge.classList.toggle('on',tq>0); }
  if(!cart.length){
    if(body) body.innerHTML='<div class="cart-empty-msg">sua sacola está vazia</div>';
    if(ft) ft.style.display='none';
    window.dispatchEvent(new Event('cart:updated')); return;
  }
  if(ft) ft.style.display='block';
  if(body){
    body.innerHTML=cart.map((it,i)=>{
      const name=it.name||''; const html=imgTag(it.img,{alt:name,width:70,height:95});
      return `<div class="ci">
        ${html||`<div style="width:70px;height:95px;background:#eee;border-radius:4px"></div>`}
        <div class="ci-info">
          <div class="ci-name">${name}</div>
          <div class="ci-meta">${it.color||''} · tam. ${it.size||''}</div>
          <div class="ci-bot">
            <span class="ci-price">${fmtBR((it.price||0)*(it.qty||0))}</span>
            <div style="display:flex;align-items:center">
              <div class="qty">
                <button onclick="chg(${i},-1)">−</button>
                <span>${it.qty||0}</span>
                <button onclick="chg(${i},1)">+</button>
              </div>
              <button class="rm" onclick="rmItem(${i})">✕</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  const sub=cart.reduce((s,c)=>s+(c.price||0)*(c.qty||0),0);
  el('cartQtyLbl')&&(el('cartQtyLbl').textContent=tq);
  el('cartSubLbl')&&(el('cartSubLbl').textContent=fmtBR(sub));
  el('cartTotalLbl')&&(el('cartTotalLbl').textContent=fmtBR(sub));
  window.dispatchEvent(new Event('cart:updated'));
}

function chg(i,d){ cart[i].qty+=d; if(cart[i].qty<=0) cart.splice(i,1); renderCart(); }
function rmItem(i){ cart.splice(i,1); renderCart(); }
function toggleCart(){ el('cartSb')?.classList.toggle('on'); el('cartOv')?.classList.toggle('on'); }
function showToast(msg){ const t=el('toast'); if(!t) return; t.textContent=msg; t.classList.add('on'); setTimeout(()=>t.classList.remove('on'),2500); }

/* =========================================================
   Checkout
   ========================================================= */
function openCheckout(){
  if(!cart.length){ alert('Sua sacola está vazia.'); return; }
  buildCheckoutSummary();
  if(typeof preencherCheckoutComPerfil==='function') preencherCheckoutComPerfil();
  el('ckOv').classList.add('on'); el('ckOv').setAttribute('aria-hidden','false');
  el('cartSb')?.classList.remove('on'); el('cartOv')?.classList.remove('on');
}
function closeCheckout(){ el('ckOv').classList.remove('on'); el('ckOv').setAttribute('aria-hidden','true'); }
function getSubtotal(){ return cart.reduce((s,c)=>s+(c.price||0)*(c.qty||0),0); }

function buildCheckoutSummary(){
  const box=el('ckSummary'),sub=getSubtotal();
  if(!cart.length){
    box.classList.add('empty'); box.textContent='Sua sacola está vazia.';
    el('ckSubLbl').textContent=fmtBR(0); el('ckShipLbl').textContent=fmtBR(0);
    el('ckTotalLbl').textContent=fmtBR(0); el('ckEtaLbl').textContent=''; return;
  }
  box.classList.remove('empty');
  box.innerHTML=cart.map(it=>{
    const name=it.name||''; const html=imgTag(it.img,{alt:name,width:64,height:64});
    return `<div class="ck-item">${html||''}
      <div class="ck-info"><div class="ck-name">${name}</div><div class="ck-meta">${it.color||''} · tam. ${it.size||''}</div></div>
      <div class="ck-qtd">x${it.qty||0}</div>
      <div class="ck-line">${fmtBR((it.price||0)*(it.qty||0))}</div>
    </div>`;
  }).join('');
  el('ckSubLbl').textContent=fmtBR(sub);
  const ship=parseBR(el('ckShipLbl').textContent);
  el('ckTotalLbl').textContent=fmtBR(sub+ship);
  if(typeof _recalcTotal==='function') _recalcTotal();
}

/* Frete */
function quoteByCep(cep){
  const p2=parseInt(String(cep).slice(0,2),10),sub=getSubtotal();
  let pac=34.90,sed=49.90,etaPac='5–9 dias úteis',etaSed='2–5 dias úteis';
  if(p2>=1&&p2<=39){pac=22.90;sed=36.90;etaPac='3–6 dias úteis';etaSed='1–3 dias úteis';}
  else if(p2>=40&&p2<=65){pac=34.90;sed=54.90;}
  else if(p2>=66&&p2<=69){pac=39.90;sed=64.90;}
  else if(p2>=70&&p2<=79){pac=29.90;sed=49.90;}
  else if(p2>=80&&p2<=99){pac=24.90;sed=39.90;etaPac='3–6 dias úteis';etaSed='1–3 dias úteis';}
  if(sub>=299.90){ pac=0; sed=Math.max(0,sed-20); }
  return{pac,sed,etaPac,etaSed};
}

function normalizeCep(v){
  const d=String(v||'').replace(/\D/g,'').slice(0,8);
  const i=el('ckCep'); if(i) i.value=d.length===8?d.replace(/(\d{5})(\d{3})/,'$1-$2'):d; return d;
}

async function autoFillEndereco(val){
  const d=String(val||'').replace(/\D/g,'').slice(0,8);
  const input=el('ckCepEnd');
  if(input) input.value=d.length===8?d.replace(/(\d{5})(\d{3})/,'$1-$2'):d;
  if(d.length!==8) return;
  try{
    const r=await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const j=await r.json();
    if(j&&!j.erro){
      if(el('ckAddr'))   el('ckAddr').value=(j.logradouro||'').trim();
      if(el('ckBairro')) el('ckBairro').value=(j.bairro||'').trim();
      if(el('ckCidade')) el('ckCidade').value=(j.localidade||'').trim();
      if(el('ckUF'))     el('ckUF').value=(j.uf||'').trim();
      setTimeout(()=>el('ckNumero')?.focus(),100);
    }
  }catch(e){ console.warn('ViaCEP erro',e); }
}

async function lookupCepAndFill(cep){
  try{
    const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d=await r.json();
    if(d&&!d.erro){
      if(el('ckAddr'))   el('ckAddr').value=(d.logradouro||'').trim();
      if(el('ckBairro')) el('ckBairro').value=(d.bairro||'').trim();
      if(el('ckCidade')) el('ckCidade').value=(d.localidade||'').trim();
      if(el('ckUF'))     el('ckUF').value=(d.uf||'').trim();
    }
  }catch(e){ console.warn('ViaCEP falhou',e); }
}

function calcFrete(){
  const cep=normalizeCep(el('ckCep').value);
  if(cep.length!==8){ alert('Informe um CEP válido (8 dígitos)'); return; }
  lookupCepAndFill(cep);
  const q=quoteByCep(cep);
  el('ckFreteResult').style.display='block';
  el('shipPacLbl').textContent=fmtBR(q.pac);
  el('shipSedexLbl').textContent=fmtBR(q.sed);
  const opt=document.querySelector('input[name="shipOpt"]:checked')?.value||'PAC';
  el('shipEtaText').textContent=(opt==='SEDEX')?q.etaSed:q.etaPac;
  applyShipping();
}

function applyShipping(){
  const sub=getSubtotal();
  const opt=document.querySelector('input[name="shipOpt"]:checked')?.value||'PAC';
  const pac=parseBR(el('shipPacLbl').textContent);
  const sed=parseBR(el('shipSedexLbl').textContent);
  const ship=(opt==='SEDEX')?sed:pac;
  el('ckShipLbl').textContent=fmtBR(ship);
  el('ckTotalLbl').textContent=fmtBR(sub+ship);
  const cSub=el('cartSubLbl'),cShip=el('cartShipLbl'),cTot=el('cartTotalLbl');
  if(cSub&&cShip&&cTot){ cSub.textContent=fmtBR(sub); cShip.textContent=fmtBR(ship); cTot.textContent=fmtBR(sub+ship); }
  const cep=normalizeCep(el('ckCep').value);
  const q=cep.length===8?quoteByCep(cep):null;
  el('ckEtaLbl').textContent=q?`Prazo estimado: ${(opt==='SEDEX')?q.etaSed:q.etaPac}`:'';
}

/* =========================================================
   PIX — BR Code + QR Code
   ========================================================= */
function _renderQRSVG(text){
  const wrap = el('pixCanvas')?.parentElement;
  if(!wrap) return;
  wrap.innerHTML='<div style="width:260px;height:260px;background:#f5f5f5;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aaa">gerando QR…</div>';
  try{
    const svg = window.BaillaQR.toSVG(text, 280);
    wrap.innerHTML = svg;
    const s = wrap.querySelector('svg');
    if(s) s.style.cssText = 'border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,.1);display:block;max-width:100%;';
  }catch(e){
    console.error('[QR]',e);
    wrap.innerHTML='<p style="font-size:12px;color:#888;text-align:center;padding:20px;border:1px solid #eee;border-radius:12px;">Use o código copia e cola acima.</p>';
  }
}

const PIX_KEY  = 'bailamodafitness@hotmail.com';
const PIX_NAME = 'BAILLA MODA FITNESS';
const PIX_CITY = 'SAO PAULO';

function _f(id,val){ const v=String(val); return id+String(v.length).padStart(2,'0')+v; }

function _crc(str){
  let c=0xFFFF;
  for(let i=0;i<str.length;i++){
    c^=str.charCodeAt(i)<<8;
    for(let j=0;j<8;j++) c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF;
  }
  return c.toString(16).toUpperCase().padStart(4,'0');
}

function _san(str,max){
  return String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').replace(/[|"'<>&]/g,'').trim().toUpperCase().substring(0,max);
}

function _sanKey(str,max){
  return String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').replace(/[|"'<>&\s]/g,'').substring(0,max);
}

function buildPixPayload(amount){
  const valor=Number(amount||0).toFixed(2);
  const name=_san(PIX_NAME,25);
  const city=_san(PIX_CITY,15);
  const key=_sanKey(PIX_KEY,77);
  const mai=_f('26',_f('00','br.gov.bcb.pix')+_f('01',key));
  const adf=_f('62',_f('05','***'));
  const body=
    _f('00','01')+_f('01','12')+mai+
    _f('52','0000')+_f('53','986')+_f('54',valor)+
    _f('58','BR')+_f('59',name)+_f('60',city)+adf+'6304';
  return body+_crc(body);
}

let _pixTimerRef=null;

function _startTimer(){
  const timerEl=el('pixTimer'); if(!timerEl) return;
  clearInterval(_pixTimerRef);
  let secs=30*60;
  _pixTimerRef=setInterval(()=>{
    secs--;
    if(secs<=0){
      clearInterval(_pixTimerRef);
      timerEl.textContent='expirado';
      const st=el('pixStatus');
      if(st){ st.textContent='código expirado'; st.className='pix-status expired'; }
      return;
    }
    timerEl.textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
  },1000);
}

function openPix(amount){
  const total=Number(amount||0);
  const payload=buildPixPayload(total);
  const amtEl=el('pixAmountLbl'); if(amtEl) amtEl.textContent=fmtBR(total);
  const stEl=el('pixStatus'); if(stEl){ stEl.textContent='aguardando pagamento'; stEl.className='pix-status waiting'; }
  const codeEl=el('pixCode'); if(codeEl) codeEl.value=payload;
  const shortEl=el('pixCodeShort'); if(shortEl) shortEl.textContent=payload.slice(0,34)+'…';
  const ov=el('pixOv'); if(ov){ ov.classList.add('on'); ov.setAttribute('aria-hidden','false'); }
  _renderQRSVG(payload);
  _startTimer();
}

function closePix(){
  clearInterval(_pixTimerRef);
  const ov=el('pixOv');
  if(ov){ ov.classList.remove('on'); ov.setAttribute('aria-hidden','true'); }
}

function copyPix(){
  const ta=el('pixCode'); if(!ta) return;
  const code=ta.value;
  if(!code||code.length<10){ alert('Código Pix não foi gerado ainda.'); return; }
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(code).then(_flashCopy).catch(()=>_execCopy(code));
  } else { _execCopy(code); }
}

function _execCopy(text){
  const tmp=document.createElement('textarea');
  tmp.value=text;
  tmp.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(tmp);
  tmp.focus(); tmp.select();
  try{ document.execCommand('copy'); _flashCopy(); }
  catch(e){ alert('Não foi possível copiar automaticamente.\nSelecione e copie o código manualmente.'); }
  document.body.removeChild(tmp);
}

function _flashCopy(){
  const btn=el('pixCopyBtn'); if(!btn) return;
  const orig=btn.textContent;
  btn.textContent='Copiado ✓'; btn.classList.add('copied');
  setTimeout(()=>{ btn.textContent=orig; btn.classList.remove('copied'); },2500);
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
   Confirmar pedido — com integração Google Sheets 🔥
   ========================================================= */
function confirmOrder(){
  if(!cart.length){ alert('Sua sacola está vazia.'); return; }

  const name   =(el('ckName').value||'').trim();
  const phone  =(el('ckPhone').value||'').trim();
  const addr   =(el('ckAddr').value||'').trim();
  const num    =(el('ckNumero').value||'').trim();
  const cidade =(el('ckCidade').value||'').trim();

  if(!name||!phone){ alert('Preencha Nome e WhatsApp.'); return; }
  if(!addr||!num||!cidade){ alert('Preencha o endereço completo (rua, número e cidade).'); return; }

  const total=parseBR(el('ckTotalLbl').textContent);
  const pay=(el('ckPay').value||'').trim().toLowerCase();
  const endereco=`${addr}, ${num} - ${cidade}`;

  const MP_LINK='';
  if(pay.includes('mercado')){
    if(!MP_LINK){ alert('Link do Mercado Pago ainda não configurado.'); return; }
    window.open(MP_LINK,'_blank','noopener');
    alert('Abrimos o Mercado Pago. Envie o comprovante no WhatsApp após pagar.');
    closeCheckout(); return;
  }

  if(pay.includes('pix')){
    // 🔥 Envia para a planilha como Pendente
    enviarParaPlanilha(name, phone, endereco, total);

    // Registra no perfil local
    if(typeof registrarPedido==='function'){
      registrarPedido(cart.map(it=>({name:it.name,size:it.size,qty:it.qty})), fmtBR(total));
    }
    closeCheckout();
    openPix(total);
    return;
  }

  // Outros pagamentos — também registra na planilha
  enviarParaPlanilha(name, phone, endereco, total);
  alert(`Pedido recebido!\nPagamento: ${pay}\nTotal: ${fmtBR(total)}`);
  closeCheckout();
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
