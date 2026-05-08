
function lvmFormatYear(value){
    if(value === null || value === undefined){
        return "";
    }

    value = String(value).trim();

    if(value.includes("/")){
        return value.split("/")[0].trim();
    }

    return value;
}

function lvmFormatKm(value){
    if(value === null || value === undefined){
        return "";
    }

    value = String(value).replace("Km", "").replace("km", "").trim();

    if(value === ""){
        return "";
    }

    if(value.includes(".")){
        return value;
    }

    const clean = value.replace(/\D/g, "");

    if(clean === ""){
        return value;
    }

    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function lvmFormatGearbox(value){
    if(value === null || value === undefined){
        return "";
    }

    return String(value).replace("Automático", "Automática").replace("automático", "automática");
}


function lvmFormatYear(value){
    if(value === null || value === undefined){
        return "";
    }

    value = String(value).trim();

    if(value.includes("/")){
        return value.split("/")[0].trim();
    }

    return value;
}





(function(){
const cfg=window.SITE_CONFIG||{}, baseCars=window.LVM_CARS||[], added=JSON.parse(localStorage.getItem("lvm_added_cars")||"[]"), hidden=JSON.parse(localStorage.getItem("lvm_hidden_cars")||"[]"), cars=baseCars.concat(added).filter(c=>!hidden.includes(c.id));
const qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s)), euro=v=>Number(v||0).toLocaleString("pt-PT")+" €";
const isEN=location.pathname.includes("/en/");
const inENPages=location.pathname.includes("/en/pages/");
const inPages=location.pathname.includes("/pages/");
const inAdmin=location.pathname.includes("/admin/");
const root=inENPages?"../../":(isEN?"../":(inPages||inAdmin?"../":""));
const asset=p=>!p?root+"assets/img/logo-lvmotors.svg":p.startsWith("http")||p.startsWith("data:")?p:root+p, priceLabel=c=>c.precoTexto||euro(c.preco);
qsa("[data-site-phone]").forEach(e=>e.textContent=cfg.phone||"");qsa("[data-site-email]").forEach(e=>e.textContent=cfg.email||"");qsa("[data-site-address]").forEach(e=>e.textContent=cfg.address||"");
function urlFor(c){
if(inENPages){return "car.html?id="+encodeURIComponent(c.id);}
if(inPages){return "viatura.html?id="+encodeURIComponent(c.id);}
if(isEN){return "pages/car.html?id="+encodeURIComponent(c.id);}
return "pages/viatura.html?id="+encodeURIComponent(c.id);
}
function card(c){return `<article class="car-card"><a href="${urlFor(c)}"><div class="car-img"><img src="${asset(c.imagem)}" alt="${c.titulo}"><div class="car-overlay"><div class="overlay-specs"><span><i class="fa-regular fa-calendar"></i> Ano ${lvmFormatYear(c.ano)||"-"}</span><span><i class="fa-solid fa-road"></i> Km ${lvmFormatKm(c.kms)||"-"}</span><span><i class="fa-solid fa-gears"></i> Caixa ${lvmFormatGearbox(c.caixa)||"-"}</span></div><div class="overlay-title">${c.categoria||"Premium"}</div></div></div><div class="car-info"><h3>${c.titulo}</h3><div class="price">${priceLabel(c)}</div><div class="meta"><span>${c.ano||"-"}</span><span>${lvmFormatKm(c.kms)||"-"} km</span><span>${c.combustivel||"-"}</span><span>${lvmFormatGearbox(c.caixa)||"-"}</span></div></div></a></article>`}
function heroCar(){return cars.find(c=>c.highlight==="week")||cars.find(c=>c.highlight==="featured")||cars[0]}
function renderHome(){const h=heroCar();if(!h)return;if(qs(".hero-bg"))qs(".hero-bg").style.backgroundImage=`url('${asset(h.imagem)}')`;if(qs("[data-featured-cars]"))qs("[data-featured-cars]").innerHTML=cars.slice(0,6).map(card).join("");if(qs("[data-hero-link]"))qs("[data-hero-link]").href=urlFor(h)}
function initFilters(){const b=qs("#brandFilter");if(b&&!b.dataset.ready){b.innerHTML=`<option value="">${isEN?"All brands":"Todas as marcas"}</option>`+[...new Set(cars.map(c=>c.marca).filter(Boolean))].sort().map(x=>`<option>${x}</option>`).join("");b.dataset.ready=1}}
function renderStock(){const wrap=qs("[data-stock-list]");if(!wrap)return;initFilters();const v={q:(qs("#searchFilter")?.value||"").toLowerCase(),brand:qs("#brandFilter")?.value||"",fuel:qs("#fuelFilter")?.value||"",price:Number(qs("#priceFilter")?.value||0),year:Number(qs("#yearFilter")?.value||0),sort:qs("#sortFilter")?.value||"recent"};let list=cars.filter(c=>(!v.q||(`${c.titulo} ${c.marca} ${c.modelo} ${c.categoria}`).toLowerCase().includes(v.q))&&(!v.brand||c.marca===v.brand)&&(!v.fuel||c.combustivel===v.fuel)&&(!v.price||!c.preco||c.preco<=v.price)&&(!v.year||c.ano>=v.year));if(v.sort==="price-asc")list.sort((a,b)=>(a.preco||9999999)-(b.preco||9999999));if(v.sort==="price-desc")list.sort((a,b)=>(b.preco||0)-(a.preco||0));if(v.sort==="year-desc")list.sort((a,b)=>(b.ano||0)-(a.ano||0));if(v.sort==="kms-asc")list.sort((a,b)=>(a.kms||0)-(b.kms||0));wrap.innerHTML=list.length?list.map(card).join(""):`<p>${isEN?"No vehicles found.":"Não foram encontradas viaturas."}</p>`}
function renderDetail(){const detail=qs("[data-vehicle-detail]");if(!detail)return;const id=new URLSearchParams(location.search).get("id"),c=cars.find(x=>x.id===id)||cars[0];if(!c)return;const photo=(c.imagens?.length?c.imagens:[c.imagem]).map(src=>({type:"image",src:asset(src)})),items=c.video?[{type:"video",src:asset(c.video),poster:asset(c.imagem)}].concat(photo):photo,first=items[0],eq=isEN?(c.equipment_en||c.equipamento):(c.equipamento||[]);detail.innerHTML=`<div class="breadcrumb"><a href="../index.html">${isEN?"Home":"Início"}</a> / Stock / ${c.titulo}</div><div class="showroom"><div><div class="gallery-main" id="openLightbox">${first.type==="video"?`<video src="${first.src}" poster="${first.poster||''}" controls autoplay muted loop playsinline></video>`:`<img src="${first.src}">`}</div><div class="thumbs">${items.map((it,i)=>`<button class="thumb ${it.type==='video'?'video-thumb':''} ${i===0?'active':''}" data-index="${i}"><img src="${it.type==='video'?(it.poster||asset(c.imagem)):it.src}"></button>`).join("")}</div><div class="detail-block"><h2>${isEN?"Vehicle history":"Histórico da viatura"}</h2><p>${c.historico}</p></div><div class="detail-block"><h2>${isEN?"Equipment":"Equipamento"}</h2><ul class="equipment">${eq.map(e=>`<li><i class="fa-solid fa-check"></i>${e}</li>`).join("")}</ul></div></div><aside class="vehicle-panel"><div class="kicker">${c.categoria}</div><h1>${c.titulo}</h1><div class="price">${priceLabel(c)}</div><div class="spec-list"><div class="spec-box"><small>${isEN?"Year":"Ano"}</small><strong>${c.ano||"-"}</strong></div><div class="spec-box"><small>Km</small><strong>${lvmFormatKm(c.kms)||"-"} km</strong></div><div class="spec-box"><small>${isEN?"Fuel":"Combustível"}</small><strong>${c.combustivel||"-"}</strong></div><div class="spec-box"><small>${isEN?"Gearbox":"Caixa"}</small><strong>${lvmFormatGearbox(c.caixa)||"-"}</strong></div><div class="spec-box"><small>${isEN?"Power":"Potência"}</small><strong>${c.potencia||"-"}</strong></div><div class="spec-box"><small>${isEN?"Engine":"Cilindrada"}</small><strong>${c.cilindrada||"-"}</strong></div><div class="spec-box"><small>${isEN?"Origin":"Origem"}</small><strong>${c.origem||"-"}</strong></div><div class="spec-box"><small>${isEN?"Status":"Estado"}</small><strong>${c.estado}</strong></div></div><div class="panel-actions"><a class="btn" href="https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent('Olá, vi a viatura '+c.titulo+' no website da LVMOTORS.')}">WhatsApp</a><a class="btn ghost" href="${isEN?'contact.html':'contactos.html'}">${isEN?"Contact":"Contactar"}</a></div></aside></div><div class="lightbox" id="vehicleLightbox"><button class="lightbox-close" id="lightboxClose">×</button><button class="lightbox-prev" id="lightboxPrev">‹</button><div class="lightbox-media" id="lightboxMedia"></div><button class="lightbox-next" id="lightboxNext">›</button><div class="lightbox-counter" id="lightboxCounter"></div></div>`;let i=0;const main=qs("#openLightbox"),lb=qs("#vehicleLightbox"),media=qs("#lightboxMedia"),counter=qs("#lightboxCounter");function rmain(n){i=n;let it=items[i];main.innerHTML=it.type==="video"?`<video src="${it.src}" poster="${it.poster||''}" controls autoplay muted loop playsinline></video>`:`<img src="${it.src}">`;qsa(".thumb").forEach(x=>x.classList.remove("active"));qs(`.thumb[data-index="${i}"]`)?.classList.add("active")}function rlb(){let it=items[i];media.innerHTML=it.type==="video"?`<video src="${it.src}" controls autoplay playsinline></video>`:`<img src="${it.src}">`;counter.textContent=(i+1)+" / "+items.length}function open(n){i=n;rlb();lb.classList.add("open");document.body.style.overflow="hidden"}function close(){lb.classList.remove("open");media.innerHTML="";document.body.style.overflow=""}function next(){i=(i+1)%items.length;rmain(i);rlb()}function prev(){i=(i-1+items.length)%items.length;rmain(i);rlb()}qsa(".thumb").forEach(b=>b.onclick=()=>rmain(Number(b.dataset.index)));main.onclick=()=>open(i);qs("#lightboxClose").onclick=close;qs("#lightboxNext").onclick=next;qs("#lightboxPrev").onclick=prev;document.onkeydown=e=>{if(!lb.classList.contains("open"))return;if(e.key==="Escape")close();if(e.key==="ArrowRight")next();if(e.key==="ArrowLeft")prev()}}
function renderAdmin(){const list=qs("[data-admin-list]");if(!list)return;list.innerHTML=baseCars.map(c=>`<div class="admin-item"><div><strong>${c.titulo}</strong><br>${c.marca} · ${priceLabel(c)}</div></div>`).join("");qs("#exportJson").onclick=()=>qs("#jsonOutput").value="window.LVM_CARS = "+JSON.stringify(baseCars,null,2)+";"}
["input","change"].forEach(e=>qsa("[data-filter]").forEach(el=>el.addEventListener(e,renderStock)));renderHome();renderStock();renderDetail();renderAdmin();
})();


/* ===== LVM FINAL NAVBAR GTO EFFECT ===== */
(function(){
    const header = document.querySelector(".header");

    if(!header){
        return;
    }

    let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
    let ticking = false;

    function updateNavbar(){
        const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

        if(currentScrollY <= 30){
            header.classList.add("nav-top");
            header.classList.remove("nav-scrolled");
            header.classList.remove("nav-hidden");
        }
        else{
            header.classList.remove("nav-top");
            header.classList.add("nav-scrolled");

            if(currentScrollY > lastScrollY && currentScrollY > 135){
                header.classList.add("nav-hidden");
            }
            else{
                header.classList.remove("nav-hidden");
            }
        }

        lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
        ticking = false;
    }

    header.classList.add("nav-top");
    updateNavbar();

    window.addEventListener("scroll", function(){
        if(!ticking){
            window.requestAnimationFrame(updateNavbar);
            ticking = true;
        }
    }, { passive:true });
})();
/* ===== END LVM FINAL NAVBAR GTO EFFECT ===== */





/* ===== FINAL SMOOTH VIDEO LOADER ===== */
(function(){
    const heroVideo = document.getElementById("heroVideo");
    const videoLoader = document.getElementById("videoLoader");

    if(!heroVideo || !videoLoader){
        return;
    }

    function hideLoader(){
        videoLoader.classList.add("is-hidden");
        heroVideo.classList.add("is-ready");
    }

    heroVideo.addEventListener("loadeddata", hideLoader);
    heroVideo.addEventListener("canplay", hideLoader);
    heroVideo.addEventListener("playing", hideLoader);

    heroVideo.play().catch(function(){});

    setTimeout(hideLoader, 2200);
})();
/* ===== END FINAL SMOOTH VIDEO LOADER ===== */
















document.addEventListener("DOMContentLoaded", function(){
    const y = document.getElementById("footerYear");
    if(y){ y.textContent = new Date().getFullYear(); }
});
