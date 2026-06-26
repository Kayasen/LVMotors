
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
const featuredCar=list=>list.find(c=>c.featured||c.destaque||c.highlight==="featured"||c.highlight==="week")||null;
const titleLabel=c=>c.titulo||c.title?.pt||c.title?.en||[c.marca||c.brand,c.modelo||c.model].filter(Boolean).join(" ")||"LVMOTORS";
const coverImage=c=>asset(c.imagem||c.image||(Array.isArray(c.imagens)&&c.imagens[0])||(Array.isArray(c.images)&&c.images[0])||"");
qsa("[data-site-phone]").forEach(e=>e.textContent=cfg.phone||"");qsa("[data-site-email]").forEach(e=>e.textContent=cfg.email||"");qsa("[data-site-address]").forEach(e=>e.textContent=cfg.address||"");
function urlFor(c){
if(inENPages){return "car.html?id="+encodeURIComponent(c.id);}
if(inPages){return "viatura.html?id="+encodeURIComponent(c.id);}
if(isEN){return "pages/car.html?id="+encodeURIComponent(c.id);}
return "pages/viatura.html?id="+encodeURIComponent(c.id);
}
function card(c){const title=titleLabel(c);return `<article class="car-card"><a href="${urlFor(c)}"><div class="car-img"><img src="${coverImage(c)}" alt="${title}"><div class="car-overlay"><div class="overlay-specs"><span><i class="fa-regular fa-calendar"></i> Ano ${lvmFormatYear(c.ano||c.year)||"-"}</span><span><i class="fa-solid fa-road"></i> Km ${lvmFormatKm(c.kms||c.mileage)||"-"}</span><span><i class="fa-solid fa-gears"></i> Caixa ${lvmFormatGearbox(c.caixa||c.transmission)||"-"}</span></div></div></div><div class="car-info"><h3>${title}</h3><div class="price">${priceLabel(c)}</div><div class="meta"><span>${c.ano||c.year||"-"}</span><span>${lvmFormatKm(c.kms||c.mileage)||"-"} km</span><span>${c.combustivel||c.fuel||"-"}</span><span>${lvmFormatGearbox(c.caixa||c.transmission)||"-"}</span></div></div></a></article>`}
function heroCar(){return cars.find(c=>c.highlight==="week")||cars.find(c=>c.highlight==="featured")||cars[0]}
function renderHome(){const h=heroCar();if(!h)return;if(qs(".hero-bg"))qs(".hero-bg").style.backgroundImage=`url('${asset(h.imagem)}')`;if(qs("[data-featured-cars]"))qs("[data-featured-cars]").innerHTML=cars.slice(0,6).map(card).join("");if(qs("[data-hero-link]"))qs("[data-hero-link]").href=urlFor(h)}
function initFilters(){const b=qs("#brandFilter");if(b&&!b.dataset.ready){b.innerHTML=`<option value="">${isEN?"All brands":"Todas as marcas"}</option>`+[...new Set(cars.map(c=>c.marca).filter(Boolean))].sort().map(x=>`<option>${x}</option>`).join("");b.dataset.ready=1}}
function closeCustomStockSelects(current){qsa(".custom-select-wrap.open").forEach(w=>{if(w!==current)w.classList.remove("open")})}
function renderStockFeatured(){const wrap=qs("[data-stock-featured]");if(!wrap)return;const visibleCars=cars.filter(c=>!(c.status&&c.status!=="published"&&c.status!=="reserved"&&c.status!=="sold"));const car=featuredCar(visibleCars);if(!car){wrap.innerHTML="";wrap.classList.remove("is-ready");return}const title=titleLabel(car), btn=isEN?"View vehicle":"Ver viatura", kicker=isEN?"Featured vehicle":"Viatura em destaque";wrap.classList.add("is-ready");wrap.innerHTML=`<article class="lvm-stock-featured-card lvm-stock-featured-card--page"><a class="lvm-stock-featured-media" href="${urlFor(car)}" aria-label="${title}"><img src="${coverImage(car)}" alt="${title}"></a><div class="lvm-stock-featured-overlay"></div><div class="lvm-stock-featured-content"><span class="lvm-stock-featured-kicker">${kicker}</span><h2>${title}</h2><a href="${urlFor(car)}" class="lvm-stock-featured-btn">${btn}</a></div></article>`}
function initCustomStockSelects(){const box=qs(".stock-filters-final");if(!box)return;if(!document.body.dataset.customStockOutsideBind){document.addEventListener("click",function(e){if(!e.target.closest(".custom-select-wrap")){closeCustomStockSelects()}});document.body.dataset.customStockOutsideBind="1"}qsa(".stock-filters-final select[data-filter]").forEach(function(select){let wrap=select.parentElement;if(!wrap.classList.contains("custom-select-wrap")){wrap=document.createElement("div");wrap.className="custom-select-wrap";select.parentNode.insertBefore(wrap,select);wrap.appendChild(select)}select.classList.add("native-select-hidden");let custom=wrap.querySelector(".custom-select");if(!custom){custom=document.createElement("div");custom.className="custom-select";custom.innerHTML='<button type="button" class="custom-select-trigger"><span></span><i class="fa-solid fa-chevron-down"></i></button><div class="custom-select-dropdown"></div>';wrap.appendChild(custom)}const trigger=custom.querySelector(".custom-select-trigger"),label=trigger.querySelector("span"),dropdown=custom.querySelector(".custom-select-dropdown");label.textContent=select.options[select.selectedIndex]?.textContent||"";dropdown.innerHTML=Array.from(select.options).map(function(opt){const selected=opt.selected?' selected':'';return `<button type="button" class="custom-select-option${selected}" data-value="${String(opt.value).replace(/"/g,'&quot;')}">${opt.textContent}</button>`}).join("");trigger.onclick=function(ev){ev.preventDefault();ev.stopPropagation();const isOpen=wrap.classList.contains("open");closeCustomStockSelects(wrap);wrap.classList.toggle("open",!isOpen)};dropdown.querySelectorAll(".custom-select-option").forEach(function(btn){btn.onclick=function(ev){ev.preventDefault();ev.stopPropagation();select.value=btn.dataset.value;label.textContent=btn.textContent;wrap.classList.remove("open");select.dispatchEvent(new Event("change",{bubbles:true}))}})})}
function renderStock(){const wrap=qs("[data-stock-list]");if(!wrap)return;renderStockFeatured();initFilters();initCustomStockSelects();const v={q:(qs("#searchFilter")?.value||"").toLowerCase(),brand:qs("#brandFilter")?.value||"",fuel:qs("#fuelFilter")?.value||"",price:Number(qs("#priceFilter")?.value||0),year:Number(qs("#yearFilter")?.value||0),sort:qs("#sortFilter")?.value||"recent"};let list=cars.filter(c=>(!v.q||(`${c.titulo} ${c.marca} ${c.modelo} ${c.categoria}`).toLowerCase().includes(v.q))&&(!v.brand||c.marca===v.brand)&&(!v.fuel||c.combustivel===v.fuel)&&(!v.price||!c.preco||c.preco<=v.price)&&(!v.year||c.ano>=v.year));if(v.sort==="price-asc")list.sort((a,b)=>(a.preco||9999999)-(b.preco||9999999));if(v.sort==="price-desc")list.sort((a,b)=>(b.preco||0)-(a.preco||0));if(v.sort==="year-desc")list.sort((a,b)=>(b.ano||0)-(a.ano||0));if(v.sort==="kms-asc")list.sort((a,b)=>(a.kms||0)-(b.kms||0));wrap.innerHTML=list.length?list.map(card).join(""):`<p>${isEN?"No vehicles found.":"Não foram encontradas viaturas."}</p>`}
function renderDetail(){const detail=qs("[data-vehicle-detail]");if(!detail)return;const id=new URLSearchParams(location.search).get("id"),c=cars.find(x=>x.id===id)||cars[0];if(!c)return;const photo=(c.imagens?.length?c.imagens:[c.imagem]).map(src=>({type:"image",src:asset(src)})),items=c.video?[{type:"video",src:asset(c.video),poster:asset(c.imagem)}].concat(photo):photo,eq=isEN?(c.equipment_en||c.equipamento):(c.equipamento||[]),homeLink=isEN?"../index.html":"../index.html",contactLink=isEN?"contact.html":"contactos.html",stockLink=isEN?"stock.html":"stock.html",backText=isEN?"Back to inventory":"Voltar ao stock",historyTitle=isEN?"Vehicle history":"Histórico da viatura",equipmentTitle=isEN?"Equipment":"Equipamento",detailsTitle=isEN?"Technical details":"Detalhes técnicos",openGalleryText=isEN?"Open gallery":"Abrir galeria",zoomTitle=isEN?"Zoom":"Lupa",galleryTitle=isEN?"Photo gallery":"Galeria de fotos",playTitle=isEN?"Play slideshow":"Reproduzir fotos",pauseTitle=isEN?"Pause slideshow":"Pausar slideshow",closeTitle=isEN?"Close":"Fechar",selectedLabel=isEN?"Selected vehicle":"Viatura selecionada",overviewText=isEN?"Premium viewing with immersive gallery.":"Visualização premium com galeria imersiva.",statusLabel=isEN?"Status":"Estado",originLabel=isEN?"Origin":"Origem",engineLabel=isEN?"Engine":"Cilindrada",powerLabel=isEN?"Power":"Potência",gearboxLabel=isEN?"Gearbox":"Caixa",fuelLabel=isEN?"Fuel":"Combustível",yearLabel=isEN?"Year":"Ano",contactText=isEN?"Contact":"Contactar",callText=isEN?"Call":"Ligar";detail.innerHTML=`<section class="lvm-vehicle-page"><div class="lvm-vehicle-shell"><div class="lvm-vehicle-topbar"><a class="lvm-back-stock" href="${stockLink}"><i class="fa-solid fa-arrow-left"></i><span>${backText}</span></a><div class="lvm-photo-count"><strong>${items.length}</strong> ${galleryTitle.toLowerCase()}</div></div><div class="lvm-vehicle-hero"><div class="lvm-vehicle-viewer"><div class="lvm-vehicle-main" id="lvmVehicleMain">${items[0].type==="video"?`<video src="${items[0].src}" poster="${items[0].poster||''}" controls autoplay muted loop playsinline></video>`:`<img src="${items[0].src}" alt="${c.titulo}">`}<button class="lvm-gallery-nav lvm-gallery-prev" type="button" id="lvmMainPrev" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button><button class="lvm-gallery-nav lvm-gallery-next" type="button" id="lvmMainNext" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button><button class="lvm-expand-gallery" type="button" id="lvmOpenGallery"><i class="fa-solid fa-images"></i><span>${openGalleryText}</span></button></div><div class="lvm-vehicle-strip" id="lvmVehicleStrip">${items.map((it,i)=>`<button type="button" class="${i===0?'active':''} ${it.type==='video'?'video-thumb':''}" data-index="${i}"><img src="${it.type==='video'?(it.poster||asset(c.imagem)):it.src}" alt="${c.titulo} ${i+1}"></button>`).join("")}</div></div><aside class="lvm-vehicle-info"><div class="lvm-selected-label">LVMOTORS</div><h1>${c.titulo}</h1><p class="lvm-vehicle-subline">${overviewText}</p><div class="lvm-vehicle-price">${priceLabel(c)}</div><div class="lvm-hero-specs"><div><small>${yearLabel}</small><strong>${lvmFormatYear(c.ano)||"-"}</strong></div><div><small>Km</small><strong>${lvmFormatKm(c.kms)||"-"}</strong></div><div><small>${fuelLabel}</small><strong>${c.combustivel||"-"}</strong></div><div><small>${gearboxLabel}</small><strong>${lvmFormatGearbox(c.caixa)||"-"}</strong></div><div><small>${powerLabel}</small><strong>${c.potencia||"-"}</strong></div><div><small>${engineLabel}</small><strong>${c.cilindrada||"-"}</strong></div></div><div class="lvm-vehicle-actions"><a class="btn" href="https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent((isEN?'Hello, I saw the vehicle ':'Olá, vi a viatura ')+c.titulo+(isEN?' on the LVMOTORS website.':' no website da LVMOTORS.'))}">WhatsApp</a></div></aside></div><div class="lvm-vehicle-content"><div class="lvm-vehicle-block lvm-story-block"><span>LVMOTORS</span><h2>${historyTitle}</h2><p>${c.historico||''}</p></div><div class="lvm-vehicle-block"><span>LVMOTORS</span><h2>${detailsTitle}</h2><div class="lvm-full-specs"><div><small>${yearLabel}</small><strong>${lvmFormatYear(c.ano)||"-"}</strong></div><div><small>Km</small><strong>${lvmFormatKm(c.kms)||"-"}</strong></div><div><small>${fuelLabel}</small><strong>${c.combustivel||"-"}</strong></div><div><small>${gearboxLabel}</small><strong>${lvmFormatGearbox(c.caixa)||"-"}</strong></div><div><small>${powerLabel}</small><strong>${c.potencia||"-"}</strong></div><div><small>${engineLabel}</small><strong>${c.cilindrada||"-"}</strong></div><div><small>${originLabel}</small><strong>${c.origem||"-"}</strong></div><div><small>${statusLabel}</small><strong>${c.estado||"-"}</strong></div></div></div><div class="lvm-vehicle-block lvm-equipment-block"><span>LVMOTORS</span><h2>${equipmentTitle}</h2><ul>${eq.length?eq.map(e=>`<li><i class="fa-solid fa-check"></i><span>${e}</span></li>`).join(""):`<li><span>${isEN?'Equipment information unavailable.':'Informação de equipamento indisponível.'}</span></li>`}</ul></div></div></div><div class="lvm-immersive-lightbox" id="lvmVehicleLightbox"><div class="lvm-lightbox-toolbar"><button type="button" class="lvm-lightbox-tool" id="lvmToolZoom" title="${zoomTitle}" aria-label="${zoomTitle}"><span class="lvm-tool-symbol">⌕</span></button><button type="button" class="lvm-lightbox-tool" id="lvmToolPlay" title="${playTitle}" aria-label="${playTitle}"><span class="lvm-tool-symbol">▶</span></button><button type="button" class="lvm-lightbox-tool" id="lvmToolGrid" title="${galleryTitle}" aria-label="${galleryTitle}"><span class="lvm-tool-symbol">▦</span></button><button type="button" class="lvm-lightbox-tool lvm-lightbox-close-icon" id="lvmLightboxClose" title="${closeTitle}" aria-label="${closeTitle}"><span class="lvm-tool-symbol">×</span></button></div><button class="lvm-lightbox-prev" type="button" id="lvmLightboxPrev" aria-label="Previous">‹</button><div class="lvm-lightbox-stage"><div class="lvm-lightbox-media-wrap"><div class="lvm-lightbox-media" id="lvmLightboxMedia"></div><div class="lvm-lightbox-counter" id="lvmLightboxCounter"></div></div><aside class="lvm-lightbox-grid" id="lvmLightboxGrid">${items.map((it,i)=>`<button type="button" class="${i===0?'active':''}" data-index="${i}"><img src="${it.type==='video'?(it.poster||asset(c.imagem)):it.src}" alt="${c.titulo} ${i+1}"></button>`).join("")}</aside></div><button class="lvm-lightbox-next" type="button" id="lvmLightboxNext" aria-label="Next">›</button></div></section>`;let i=0,slideTimer=null,zoomed=false;const main=qs('#lvmVehicleMain'),strip=qs('#lvmVehicleStrip'),lb=qs('#lvmVehicleLightbox'),lbMedia=qs('#lvmLightboxMedia'),lbCounter=qs('#lvmLightboxCounter'),lbGrid=qs('#lvmLightboxGrid'),playBtn=qs('#lvmToolPlay'),zoomBtn=qs('#lvmToolZoom'),gridBtn=qs('#lvmToolGrid');function stopSlideshow(){if(slideTimer){clearInterval(slideTimer);slideTimer=null}if(playBtn){playBtn.innerHTML='<span class="lvm-tool-symbol">▶</span>';playBtn.title=playTitle;playBtn.setAttribute('aria-label',playTitle)}}function startSlideshow(){stopSlideshow();slideTimer=setInterval(function(){next(true)},2500);if(playBtn){playBtn.innerHTML='<span class="lvm-tool-symbol">Ⅱ</span>';playBtn.title=pauseTitle;playBtn.setAttribute('aria-label',pauseTitle)}}function toggleSlideshow(){if(slideTimer){stopSlideshow()}else{startSlideshow()}}function renderMain(){const it=items[i];main.querySelector('img,video')?.remove();const media=it.type==='video'?document.createElement('video'):document.createElement('img');if(it.type==='video'){media.src=it.src;media.poster=it.poster||'';media.controls=true;media.autoplay=true;media.muted=true;media.loop=true;media.playsInline=true}else{media.src=it.src;media.alt=c.titulo}main.insertBefore(media,main.firstChild);strip.querySelectorAll('button').forEach((b,idx)=>b.classList.toggle('active',idx===i));lbGrid?.querySelectorAll('button').forEach((b,idx)=>b.classList.toggle('active',idx===i));const activeThumb=strip.querySelector(`button[data-index="${i}"]`);activeThumb?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}function renderLightbox(){const it=items[i];lbMedia.innerHTML=it.type==='video'?`<video src="${it.src}" poster="${it.poster||''}" controls autoplay playsinline></video>`:`<img src="${it.src}" alt="${c.titulo}" class="${zoomed?'zoomed':''}">`;lbCounter.textContent=(i+1)+' / '+items.length;lbGrid?.querySelectorAll('button').forEach((b,idx)=>b.classList.toggle('active',idx===i))}function openLightbox(index){i=index??i;renderMain();renderLightbox();lb.classList.add('open');document.body.style.overflow='hidden'}function closeLightbox(){lb.classList.remove('open');document.body.style.overflow='';zoomed=false;stopSlideshow()}function next(fromSlide){i=(i+1)%items.length;renderMain();if(lb.classList.contains('open'))renderLightbox();if(!fromSlide)stopSlideshow()}function prev(){i=(i-1+items.length)%items.length;renderMain();if(lb.classList.contains('open'))renderLightbox();stopSlideshow()}function toggleZoom(){zoomed=!zoomed;const img=lbMedia.querySelector('img');if(img){img.classList.toggle('zoomed',zoomed)}zoomBtn?.classList.toggle('active',zoomed)}strip.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',function(){i=Number(this.dataset.index||0);renderMain();stopSlideshow()}));main.addEventListener('click',function(e){if(e.target.closest('.lvm-gallery-nav')||e.target.closest('.lvm-expand-gallery'))return;openLightbox(i)});qs('#lvmOpenGallery')?.addEventListener('click',function(e){e.preventDefault();openLightbox(i)});qs('#lvmMainPrev')?.addEventListener('click',function(e){e.stopPropagation();prev()});qs('#lvmMainNext')?.addEventListener('click',function(e){e.stopPropagation();next()});qs('#lvmLightboxPrev')?.addEventListener('click',prev);qs('#lvmLightboxNext')?.addEventListener('click',function(){next()});qs('#lvmLightboxClose')?.addEventListener('click',closeLightbox);playBtn?.addEventListener('click',toggleSlideshow);zoomBtn?.addEventListener('click',toggleZoom);gridBtn?.addEventListener('click',function(){lbGrid.classList.toggle('open');lb.classList.toggle('show-grid',lbGrid.classList.contains('open'))});lbGrid?.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',function(){i=Number(this.dataset.index||0);renderMain();renderLightbox();stopSlideshow()}));lb.addEventListener('click',function(e){if(e.target===lb)closeLightbox()});document.addEventListener('keydown',function(e){if(!detail.isConnected)return;if(lb.classList.contains('open')){if(e.key==='Escape')closeLightbox();if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev()}else{if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev()}})}
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


/* ===== NOMES DOS CARROS FORMATO NORMAL ===== */

(function(){
    const keepUpper = new Set([
        "AMG","BMW","SUV","GT","GTS","GT3","GT4","RS","RS3","RS4","RS5","RS6","RS7",
        "M","M2","M3","M4","M5","M8","M50","PDK","TDI","TFSI","TSI","V6","V8","V10","V12",
        "E-HYBRID","HYBRID","4MATIC","AWD","RWD","FWD","S","SE","SL","SLS","GTI","GTD",
        "EV","PHEV","Turbo","Targa","EQ","EQS","EQE","GLC","GLE","GLS","CLA","CLS"
    ]);

    const smallWords = new Set(["de","da","do","das","dos","e","the","of"]);

    function fixCarName(name){
        if(!name) return name;

        return String(name)
            .toLowerCase()
            .split(/(\s+|-)/)
            .map(function(part, index){
                if(part.trim() === "" || part === "-") return part;

                const clean = part.replace(/[^\wÀ-ÿ]/g, "");
                const upper = clean.toUpperCase();

                if(keepUpper.has(upper)) return upper;
                if(/^\d/.test(part)) return part.toUpperCase();
                if(smallWords.has(part) && index !== 0) return part;

                return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join("")
            .replace(/\bMercedes-benz\b/gi, "Mercedes-Benz")
            .replace(/\bE-performance\b/gi, "E-Performance")
            .replace(/\bE-hybrid\b/gi, "E-Hybrid")
            .replace(/\b4matic\b/gi, "4MATIC")
            .replace(/\bPdk\b/g, "PDK")
            .replace(/\bTdi\b/g, "TDI")
            .replace(/\bTfsi\b/g, "TFSI")
            .replace(/\bAmg\b/g, "AMG")
            .replace(/\bBmw\b/g, "BMW");
    }

    function applyCarNameFix(){
        document.querySelectorAll(".car-info h3, .car-card h3, .stock-card h3, .vehicle-card h3, .car-title, .vehicle-title, [data-car-title]").forEach(function(el){
            const fixed = fixCarName(el.textContent);
            if(el.textContent !== fixed){
                el.textContent = fixed;
            }
        });
    }

    document.addEventListener("DOMContentLoaded", applyCarNameFix);
    window.addEventListener("load", applyCarNameFix);
    setTimeout(applyCarNameFix, 250);
    setTimeout(applyCarNameFix, 1000);
    setTimeout(applyCarNameFix, 2000);
})();







/* ===== EN CARD OVERLAY TRANSLATION FIXED ===== */
(function(){
    function isEnglishPage(){
        return window.location.pathname.toLowerCase().includes("/en/");
    }

    function fixValue(txt){
        if(!txt) return txt;

        txt = String(txt);

        txt = txt.replace(/Manual Gearbox(?:\s+Gearbox)+/gi, "Manual Gearbox");
        txt = txt.replace(/Automatic Gearbox(?:\s+Gearbox)+/gi, "Automatic Gearbox");

        txt = txt.replace(/\bAno\s+(\d{4})\b/g, "Year $1");
        txt = txt.replace(/\bCaixa\s+Manual\b/gi, "Manual Gearbox");
        txt = txt.replace(/\bCaixa\s+Autom[aá]tica\b/gi, "Automatic Gearbox");

        return txt;
    }

    function apply(){
        if(!isEnglishPage()) return;

        document.querySelectorAll(".car-overlay, .overlay-specs, .car-card, .vehicle-card, .stock-card").forEach(function(scope){
            scope.querySelectorAll("*").forEach(function(el){
                el.childNodes.forEach(function(node){
                    if(node.nodeType === Node.TEXT_NODE && node.nodeValue && node.nodeValue.trim()){
                        node.nodeValue = fixValue(node.nodeValue);
                    }
                });
            });
        });
    }

    document.addEventListener("DOMContentLoaded", apply);
    window.addEventListener("load", apply);
    setTimeout(apply, 300);
})();



/* ===== EN CAR LABELS TRANSLATION FIX ===== */
(function(){
    function isEnglishPage(){
        return window.location.pathname.toLowerCase().includes("/en/");
    }

    const map = {
        "CABRIO": "CONVERTIBLE",
        "DESCAPOTÁVEL": "CONVERTIBLE",
        "COUPÉ": "COUPÉ",
        "BERLINA": "SEDAN",
        "CARRINHA": "ESTATE",
        "UTILITÁRIO": "CITY CAR",
        "COMERCIAL": "COMMERCIAL",
        "CLÁSSICO": "CLASSIC",
        "SUPER DESPORTIVO": "SUPERCAR",
        "DESPORTIVO": "SPORTS CAR",
        "ELÉTRICO": "ELECTRIC",
        "HÍBRIDO": "HYBRID",
        "GASOLINA": "PETROL",
        "GASÓLEO": "DIESEL"
    };

    function translateLabel(text){
        if(!text) return text;
        const clean = String(text).trim().toUpperCase();
        return map[clean] || text;
    }

    function apply(){
        if(!isEnglishPage()) return;

        document.querySelectorAll(".car-card, .stock-card, .vehicle-card").forEach(function(card){
            card.querySelectorAll("h4, .badge, .tag, .label, .category, .car-type, .vehicle-type, .car-info span, .car-info p, .car-info strong").forEach(function(el){
                const original = el.textContent.trim();
                const translated = translateLabel(original);
                if(translated !== original){
                    el.textContent = translated;
                }
            });
        });
    }

    document.addEventListener("DOMContentLoaded", apply);
    window.addEventListener("load", apply);
    setTimeout(apply, 300);
    setTimeout(apply, 1000);
})();



/* ===== REMOVER LABELS/CATEGORIAS DOS CARDS ===== */
(function(){
    const labels = new Set([
        "CABRIO","CONVERTIBLE","SUV PREMIUM","SUV","COUPÉ","COUPE","SEDAN","BERLINA",
        "ESTATE","CARRINHA","CITY CAR","UTILITÁRIO","COMMERCIAL","COMERCIAL","CLASSIC",
        "CLÁSSICO","SUPERCAR","SPORTS CAR","DESPORTIVO","ELECTRIC","ELÉTRICO","HYBRID","HÍBRIDO"
    ]);

    function clean(){
        document.querySelectorAll(".car-card, .stock-card, .vehicle-card").forEach(function(card){
            card.querySelectorAll("h4, p, span, strong, small, div").forEach(function(el){
                const txt = (el.textContent || "").trim().toUpperCase();
                if(labels.has(txt)){
                    el.remove();
                }
            });
        });
    }

    document.addEventListener("DOMContentLoaded", clean);
    window.addEventListener("load", clean);
    setTimeout(clean, 300);
    setTimeout(clean, 1000);
    setTimeout(clean, 2000);
})();



/* ===== Equipa interativa ===== */
document.addEventListener('DOMContentLoaded', function () {
    const teamCards = document.querySelectorAll('.team-card');

    teamCards.forEach(function (card) {
        card.addEventListener('mousemove', function (event) {
            const rect = card.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mx', x + '%');
            card.style.setProperty('--my', y + '%');
        });

        card.addEventListener('click', function () {
            if (window.matchMedia('(hover: none)').matches) {
                card.classList.toggle('is-open');
            }
        });
    });
});






/* ===== Header hide/show on scroll - desktop + mobile final ===== */
(function () {
    const header = document.querySelector('.header');
    if (!header) return;

    let lastScrollY = window.scrollY || 0;
    let ticking = false;

    function updateHeader() {
        const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const goingDown = currentScrollY > lastScrollY;
        const goingUp = currentScrollY < lastScrollY;

        if (currentScrollY > 120 && goingDown && Math.abs(currentScrollY - lastScrollY) > 4) {
            header.classList.add('header-hidden');
        }

        if (goingUp && Math.abs(currentScrollY - lastScrollY) > 4) {
            header.classList.remove('header-hidden');
        }

        if (currentScrollY <= 60) {
            header.classList.remove('header-hidden');
        }

        if (currentScrollY > 20) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }

        lastScrollY = currentScrollY;
        ticking = false;
    }

    window.addEventListener('scroll', function () {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }, { passive: true });

    updateHeader();
})();




(function(){
    function initHeaderScrollForce(){
        var header = document.querySelector('.header');
        if(!header) return;

        var lastY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        var ticking = false;

        function setHeaderHidden(hidden){
            if(hidden){
                header.classList.add('lvm-hide-header');
                header.classList.remove('lvm-show-header');
                header.style.setProperty('transform', 'translate3d(0,-140%,0)', 'important');
            }else{
                header.classList.remove('lvm-hide-header');
                header.classList.add('lvm-show-header');
                header.style.setProperty('transform', 'translate3d(0,0,0)', 'important');
            }
        }

        function update(){
            var y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            var diff = y - lastY;

            if(y > 35){
                header.classList.add('lvm-scrolled');
            }else{
                header.classList.remove('lvm-scrolled');
            }

            if(y > 110 && diff > 2){
                setHeaderHidden(true);
            }

            if(diff < -2 || y < 70){
                setHeaderHidden(false);
            }

            lastY = y <= 0 ? 0 : y;
            ticking = false;
        }

        function requestUpdate(){
            if(!ticking){
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestUpdate, {passive:true});
        document.addEventListener('scroll', requestUpdate, {passive:true});
        window.addEventListener('touchmove', requestUpdate, {passive:true});
        window.addEventListener('wheel', requestUpdate, {passive:true});

        setHeaderHidden(false);
        update();
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', initHeaderScrollForce);
    }else{
        initHeaderScrollForce();
    }
})();

