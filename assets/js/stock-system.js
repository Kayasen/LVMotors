(function(){
  "use strict";

  const W = window;
  const D = document;

  function getLang(){
    const path = location.pathname.toLowerCase();
    return path.includes("/en/") ? "en" : "pt";
  }

  function getBase(){
    const path = location.pathname.replace(/\\/g, "/").toLowerCase();
    if (path.includes("/en/pages/")) return "../../";
    if (path.includes("/pages/")) return "../";
    if (path.includes("/en/")) return "../";
    return "";
  }

  function resolveAsset(src){
    if (!src) return getBase() + "assets/img/favicon.png";
    const s = String(src).trim();
    if (/^(https?:|data:|blob:|\/\/)/i.test(s)) return s;
    if (s.startsWith("/")) return s;
    const clean = s.replace(/^(\.\/)+/, "").replace(/^(\.\.\/)+/, "");
    return getBase() + clean;
  }

  function slugify(value){
    return String(value || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "viatura";
  }

  function esc(value){
    return String(value ?? "").replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c];
    });
  }

  function asArray(value){
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") return value.split(/\n|,/).map(x => x.trim()).filter(Boolean);
    return [];
  }

  function localText(value, lang){
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value[lang] || value.pt || value.en || "";
    }
    return value || "";
  }

  function rawCars(){
    return W.LVM_CARS || W.cars || W.CARS || [];
  }

  function normalizeCar(car, index){
    const title = car.title || car.name || car.nome || car.titulo || car.modelo || car.model || "";
    const titlePt = localText(title, "pt") || car.titlePt || car.titulo || car.name || car.nome || [car.brand || car.marca, car.model || car.modelo].filter(Boolean).join(" ");
    const titleEn = localText(title, "en") || car.titleEn || titlePt;

    const images = asArray(car.images || car.imagens || car.gallery || car.fotos || car.image || car.img);
    const id = car.id || car.slug || slugify(titlePt || titleEn || ("viatura-" + (index + 1)));

    return {
      ...car,
      id,
      order: Number.isFinite(+car.order) ? +car.order : index,
      status: car.status || (car.active === false ? "draft" : "published"),
      featured: !!(car.featured || car.destaque),
      brand: car.brand || car.marca || "",
      model: car.model || car.modelo || "",
      title: { pt: titlePt, en: titleEn },
      price: car.price || car.preco || car.valor || "",
      year: car.year || car.ano || "",
      mileage: car.mileage || car.km || car.kms || "",
      fuel: car.fuel || car.combustivel || "",
      transmission: car.transmission || car.caixa || "",
      power: car.power || car.potencia || "",
      color: car.color || car.cor || "",
      description: {
        pt: localText(car.description || car.descricao, "pt"),
        en: localText(car.description || car.descricao, "en") || localText(car.description || car.descricao, "pt")
      },
      equipment: asArray(car.equipment || car.equipamento || car.extras),
      images
    };
  }

  function getCars(){
    return rawCars()
      .map(normalizeCar)
      .filter(car => car.status !== "deleted")
      .sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  }

  function getPublishedCars(){
    return getCars().filter(car => car.status === "published" || car.status === "sold" || car.status === "reserved");
  }

  function carTitle(car){
    const rawTitle = localText(car.title, getLang()) || car.model || car.modelo || car.brand || car.marca || "LVMOTORS";
    const brand = car.brand || car.marca || "";
    if (brand && !String(rawTitle).toLowerCase().startsWith(String(brand).toLowerCase())) {
      return (brand + " " + rawTitle).replace(/\s+/g, " ").trim();
    }
    return rawTitle;
  }

  function carDescription(car){
    return localText(car.description, getLang());
  }

  function detailUrl(car){
    const lang = getLang();
    const path = location.pathname.toLowerCase();
    const id = encodeURIComponent(car.id);
    if (lang === "en") {
      return path.includes("/en/pages/") ? "car.html?id=" + id : "en/pages/car.html?id=" + id;
    }
    return path.includes("/pages/") ? "viatura.html?id=" + id : "pages/viatura.html?id=" + id;
  }

  function cover(car){
    return resolveAsset((car.images && car.images[0]) || car.image || car.img);
  }

  function labelStatus(car){
    const lang = getLang();
    if (car.status === "sold") return lang === "en" ? "Sold" : "Vendido";
    if (car.status === "reserved") return lang === "en" ? "Reserved" : "Reservado";
    if (car.featured) return lang === "en" ? "Featured" : "Destaque";
    return "";
  }

  function formatPrice(car){
    if (!car.price) return getLang() === "en" ? "Price on request" : "Sob consulta";
    return String(car.price);
  }

  function renderStock(){
    const grid = D.querySelector("#stockGrid, #stock-grid, .stock-grid, [data-stock-grid]");
    if (!grid) return;

    const cars = getPublishedCars();
    const search = D.querySelector("#stockSearch, [data-stock-search]");
    const brand = D.querySelector("#stockBrand, [data-stock-brand]");
    const status = D.querySelector("#stockStatus, [data-stock-status]");

    function draw(){
      const q = (search && search.value || "").toLowerCase().trim();
      const b = (brand && brand.value || "").toLowerCase().trim();
      const s = (status && status.value || "").toLowerCase().trim();

      const filtered = cars.filter(car => {
        const hay = [carTitle(car), car.brand, car.model, car.year, car.fuel, car.transmission].join(" ").toLowerCase();
        if (q && !hay.includes(q)) return false;
        if (b && String(car.brand).toLowerCase() !== b) return false;
        if (s && String(car.status).toLowerCase() !== s) return false;
        return true;
      });

      grid.innerHTML = filtered.map(car => {
        const statusLabel = labelStatus(car);
        return `
          <article class="lvm-stock-card car-card" data-car-id="${esc(car.id)}">
            <a class="lvm-stock-card__image" href="${esc(detailUrl(car))}" aria-label="${esc(carTitle(car))}">
              <img src="${esc(cover(car))}" alt="${esc(carTitle(car))}" loading="lazy">
              ${statusLabel ? `<span class="lvm-stock-card__badge">${esc(statusLabel)}</span>` : ""}
            </a>
            <div class="lvm-stock-card__body">
              <h3>${esc(carTitle(car))}</h3>
              <p class="lvm-stock-card__price">${esc(formatPrice(car))}</p>
              <div class="lvm-stock-card__meta">
                ${car.year ? `<span><i class="fa-regular fa-calendar"></i>${esc(car.year)}</span>` : ""}
                ${car.mileage ? `<span><i class="fa-solid fa-road"></i>${esc(car.mileage)}</span>` : ""}
                ${car.fuel ? `<span><i class="fa-solid fa-gas-pump"></i>${esc(car.fuel)}</span>` : ""}
                ${car.transmission ? `<span><i class="fa-solid fa-gears"></i>${esc(car.transmission)}</span>` : ""}
              </div>
              <a class="lvm-stock-card__link" href="${esc(detailUrl(car))}">${getLang()==="en" ? "View vehicle" : "Ver viatura"}</a>
            </div>
          </article>
        `;
      }).join("") || `<p class="lvm-empty">${getLang()==="en" ? "No vehicles available." : "Sem viaturas disponíveis."}</p>`;
    }

    if (brand && !brand.dataset.lvmFilled) {
      const brands = [...new Set(cars.map(c => c.brand).filter(Boolean))].sort();
      brand.innerHTML = `<option value="">${getLang()==="en" ? "All brands" : "Todas as marcas"}</option>` + brands.map(x => `<option value="${esc(String(x).toLowerCase())}">${esc(x)}</option>`).join("");
      brand.dataset.lvmFilled = "1";
    }

    [search, brand, status].filter(Boolean).forEach(el => el.addEventListener("input", draw));
    draw();
  }

  function renderDetail(){
    const root = D.querySelector("#vehicleDetail, #carDetail, [data-car-detail], .vehicle-detail-auto");
    const isDetailPage = /viatura\.html|car\.html/i.test(location.pathname);
    if (!root && !isDetailPage) return;

    const params = new URLSearchParams(location.search);
    const id = params.get("id") || params.get("car") || params.get("slug");
    const cars = getPublishedCars();
    const car = cars.find(c => c.id === id) || cars[0];
    const lang = getLang();
    const isEN = lang === "en";

    const target = root || D.querySelector("main") || D.body;
    if (!car) {
      target.innerHTML = `<section class="section white"><div class="container"><h1>${isEN ? "Vehicle not found" : "Viatura não encontrada"}</h1></div></section>`;
      return;
    }

    const imgs = (car.images && car.images.length ? car.images : [car.image || car.img]).filter(Boolean).map(resolveAsset);
    const coverImage = imgs[0] || "";
    const title = carTitle(car);
    const desc = carDescription(car) || car.historico || "";
    const equipment = isEN ? asArray(car.equipment_en || car.equipment || car.equipamento || car.extras) : asArray(car.equipment || car.equipamento || car.extras);
    const category = car.categoria || car.category || "";
    const origin = car.origem || car.origin || "";
    const state = car.estado || car.state || (isEN ? "Available" : "Disponível");
    let current = 0;
    let slideTimer = null;
    let progressFrame = null;
    let progressStartedAt = 0;
    const SLIDE_MS = 5000;

    function money(value){
      if(value === null || value === undefined || value === "") return "";
      const clean = String(value).trim();
      if(clean === "0") return "";
      if(clean.includes("€")) return clean;
      const n = Number(clean);
      if(Number.isFinite(n) && n > 0){
        return n.toLocaleString("pt-PT") + " €";
      }
      return clean;
    }

    function displayPrice(){
      const value = money(car.price || car.preco || "");
      if(value) return value;
      if(isEN) return "Price on request";
      const txt = String(car.precoTexto || "Sob consulta").replace("Valor sob consulta", "Sob consulta");
      return txt || "Sob consulta";
    }

    const allSpecs = [
      [isEN ? "Year" : "Ano", car.year || car.ano],
      [isEN ? "Kilometres" : "Quilómetros", car.mileage || car.km || car.kms],
      [isEN ? "Fuel" : "Combustível", car.fuel || car.combustivel],
      [isEN ? "Gearbox" : "Caixa", car.transmission || car.caixa],
      [isEN ? "Power" : "Potência", car.power || car.potencia],
      [isEN ? "Engine" : "Cilindrada", car.cilindrada || car.engine],
      [isEN ? "Origin" : "Origem", origin],
      [isEN ? "Status" : "Estado", state]
    ].filter(x => x[1] !== undefined && x[1] !== null && String(x[1]).trim() !== "");

    const heroSpecs = allSpecs.slice(0, 6);
    const stockHref = isEN ? "stock.html" : "stock.html";
    const contactHref = isEN ? "contact.html" : "contactos.html";

    const railSpecs = [
      [isEN ? "Year" : "Ano", car.year || car.ano, "fa-regular fa-calendar"],
      [isEN ? "Mileage" : "Quilómetros", car.mileage || car.km || car.kms, "fa-solid fa-gauge-high"],
      [isEN ? "Fuel" : "Combustível", car.fuel || car.combustivel, "fa-solid fa-gas-pump"],
      [isEN ? "Gearbox" : "Caixa", car.transmission || car.caixa, "fa-solid fa-gears"],
      [isEN ? "Power" : "Potência", car.power || car.potencia, "fa-solid fa-bolt"],
      [isEN ? "Colour" : "Cor", car.color || car.cor, "fa-solid fa-palette"],
      [isEN ? "Origin" : "Origem", origin, "fa-solid fa-location-dot"]
    ].filter(x => x[1] !== undefined && x[1] !== null && String(x[1]).trim() !== "").slice(0, 7);

    const whats = "351918742025";

    D.title = title + " | LVMOTORS";
    const sublineTxt = [category, origin, state].filter(Boolean).join("  ·  ");
    const galleryLabel = isEN ? "Photo gallery" : "Galeria de fotos";

    target.innerHTML = `
      <div class="lvm-veh">

        <header class="lvm-veh-hero" id="lvmVehHero">
          <div class="lvm-veh-hero-media" id="lvmVehHeroMedia" style="background-image:url('${esc(coverImage)}')"></div>
          <div class="lvm-veh-hero-caption">
            <div class="lvm-veh-hero-inner">
              <span class="lvm-veh-eyebrow">${isEN ? "LVMOTORS · Curated" : "LVMOTORS · Coleção"}</span>
              <h1 class="lvm-veh-serif">${esc(title)}</h1>
              <div class="lvm-veh-hero-meta">
                <span class="price">${esc(displayPrice())}</span>
              </div>
            </div>
          </div>
        </header>

        <div class="lvm-veh-shell lvm-veh-shell--clean">
          <div class="lvm-veh-body">
            <div class="lvm-veh-gallery lvm-reveal">
              <div class="lvm-veh-stage" id="lvmVehStage">
                <img id="lvmMainVehicleImage" src="${esc(imgs[0] || "")}" alt="${esc(title)}">
                ${imgs.length > 1 ? `<button class="lvm-veh-nav lvm-veh-prev" type="button" aria-label="${isEN ? "Previous" : "Anterior"}"><i class="fa-solid fa-chevron-left"></i></button><button class="lvm-veh-nav lvm-veh-next" type="button" aria-label="${isEN ? "Next" : "Seguinte"}"><i class="fa-solid fa-chevron-right"></i></button>` : ""}
                <button class="lvm-veh-expand" type="button"><i class="fa-solid fa-expand"></i>${isEN ? "Full screen" : "Ecrã inteiro"}</button>
              </div>
              ${imgs.length > 1 ? `<div class="lvm-veh-strip">
                ${imgs.map((img,i) => `<button class="lvm-veh-thumb ${i===0 ? "active" : ""}" type="button" data-index="${i}"><img src="${esc(img)}" alt="${esc(title)} ${i+1}" loading="lazy"></button>`).join("")}
              </div>` : ""}
            </div>

            <aside class="lvm-veh-panel lvm-reveal">
              <span class="brand">${isEN ? "Available now" : "Disponível agora"}</span>
              <p class="lvm-veh-panel-note">${isEN ? "A curated vehicle selection with personalised support from first contact to delivery." : "Uma seleção cuidada com acompanhamento personalizado desde o primeiro contacto até à entrega."}</p>
              <div class="lvm-veh-cta lvm-veh-cta--whatsapp-only">
                <a class="wa" target="_blank" rel="noopener" href="https://wa.me/${whats}?text=${encodeURIComponent((isEN ? "Hello, I would like more information about " : "Olá, gostaria de mais informações sobre ") + title)}"><i class="fa-brands fa-whatsapp"></i>${isEN ? "Message on WhatsApp" : "Falar por WhatsApp"}</a>
              </div>
              <div class="lvm-veh-trust">
                <span><i class="fa-solid fa-shield-halved"></i>${isEN ? "Inspected vehicle" : "Viatura inspecionada"}</span>
                <span><i class="fa-solid fa-handshake"></i>${isEN ? "Credit intermediation" : "Intermediação de crédito"}</span>
                <span><i class="fa-solid fa-key"></i>${isEN ? "Test drive on request" : "Test drive a pedido"}</span>
              </div>
            </aside>
          </div>

          <section class="lvm-veh-section lvm-veh-story lvm-reveal">
            <span class="lvm-veh-eyebrow-2">${isEN ? "Presentation" : "Apresentação"}</span>
            <h2 class="title lvm-veh-serif">${isEN ? "About this vehicle" : "Sobre esta viatura"}</h2>
            <p>${esc(desc || (isEN ? "A carefully selected vehicle, prepared and presented to the standard you would expect from LVMOTORS. Contact our team to arrange a viewing or to discuss financing options." : "Uma viatura cuidadosamente selecionada, preparada e apresentada ao nível que espera da LVMOTORS. Contacte a nossa equipa para agendar uma visita ou conhecer as opções de financiamento."))}</p>
          </section>

          <section class="lvm-veh-section lvm-reveal">
            <span class="lvm-veh-eyebrow-2">${isEN ? "Technical data" : "Ficha técnica"}</span>
            <h2 class="title lvm-veh-serif">${isEN ? "Specifications" : "Características"}</h2>
            <div class="lvm-veh-spectable">
              ${allSpecs.map(x => `<div><small>${esc(x[0])}</small><strong>${esc(x[1])}</strong></div>`).join("")}
            </div>
          </section>

          ${equipment.length ? `<section class="lvm-veh-section lvm-reveal">
            <span class="lvm-veh-eyebrow-2">${isEN ? "Equipment" : "Equipamento"}</span>
            <h2 class="title lvm-veh-serif">${isEN ? "Selected equipment" : "Equipamento de série e opcional"}</h2>
            <ul class="lvm-veh-equip">${equipment.map(x => `<li><i class="fa-solid fa-check"></i>${esc(x)}</li>`).join("")}</ul>
          </section>` : ""}
        </div>

        <div class="lvm-veh-lightbox" id="lvmVehicleLightbox">
          <div class="lvm-veh-lb-progress" aria-hidden="true"><span id="lvmLightboxProgressBar"></span></div>
          <div class="lvm-veh-lb-actions" aria-label="${isEN ? "Gallery controls" : "Controlos da galeria"}">
            <button class="lvm-veh-lb-action" id="lvmLightboxZoom" type="button" title="${isEN ? "Zoom" : "Lupa"}" aria-label="${isEN ? "Zoom" : "Lupa"}"><i class="fa-solid fa-magnifying-glass"></i></button>
            <button class="lvm-veh-lb-action" id="lvmLightboxPlay" type="button" title="${isEN ? "Play slideshow" : "Reproduzir fotos"}" aria-label="${isEN ? "Play slideshow" : "Reproduzir fotos"}"><i class="fa-solid fa-play"></i></button>
            <button class="lvm-veh-lb-action" id="lvmLightboxGallery" type="button" title="${galleryLabel}" aria-label="${galleryLabel}"><i class="fa-solid fa-table-cells"></i></button>
            <button class="lvm-veh-lb-action lvm-veh-lb-close" type="button" aria-label="${isEN ? "Close" : "Fechar"}"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <button class="lvm-veh-lb-btn lvm-veh-lb-prev" type="button" aria-label="${isEN ? "Previous" : "Anterior"}">‹</button>
          <img id="lvmLightboxImage" src="${esc(imgs[0] || "")}" alt="${esc(title)}">
          <button class="lvm-veh-lb-btn lvm-veh-lb-next" type="button" aria-label="${isEN ? "Next" : "Seguinte"}">›</button>
          <div class="lvm-veh-lb-counter" id="lvmLightboxCounter">1 / ${imgs.length}</div>
          <div class="lvm-veh-lb-thumbs" id="lvmLightboxThumbs">
            ${imgs.map((img,i) => `<button class="${i===0 ? "active" : ""}" type="button" data-index="${i}"><img src="${esc(img)}" alt="${esc(title)} ${i+1}" loading="lazy"></button>`).join("")}
          </div>
        </div>
      </div>
    `;

    const mainImg = D.querySelector("#lvmMainVehicleImage");
    const heroMedia = D.querySelector("#lvmVehHeroMedia");
    const lightbox = D.querySelector("#lvmVehicleLightbox");
    const lightboxImg = D.querySelector("#lvmLightboxImage");
    const lightboxCounter = D.querySelector("#lvmLightboxCounter");
    const lightboxZoom = D.querySelector("#lvmLightboxZoom");
    const lightboxPlay = D.querySelector("#lvmLightboxPlay");
    const lightboxGallery = D.querySelector("#lvmLightboxGallery");
    const lightboxThumbs = D.querySelector("#lvmLightboxThumbs");
    const progressBar = D.querySelector("#lvmLightboxProgressBar");
    let panX = 0;
    let panY = 0;
    let panStartX = 0;
    let panStartY = 0;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let isPanning = false;
    let panMoved = false;
    let suppressZoomClickUntil = 0;

    function updatePhoto(index){
      if(!imgs.length) return;
      current = (index + imgs.length) % imgs.length;
      const src = imgs[current];
      if(mainImg) mainImg.src = src;
      if(lightboxImg) lightboxImg.src = src;
      if(lightboxCounter) lightboxCounter.textContent = `${current + 1} / ${imgs.length}`;
      resetPan();
      D.querySelectorAll(".lvm-veh-thumb").forEach((btn,i) => btn.classList.toggle("active", i === current));
      D.querySelectorAll(".lvm-veh-lb-thumbs button").forEach((btn,i) => btn.classList.toggle("active", i === current));
      D.querySelector(".lvm-veh-thumb.active")?.scrollIntoView({behavior:"smooth", inline:"center", block:"nearest"});
    }

    function resetProgress(){
      if(progressBar) progressBar.style.width = "0%";
    }

    function stopProgress(){
      if(progressFrame){
        cancelAnimationFrame(progressFrame);
        progressFrame = null;
      }
    }

    function runProgress(){
      stopProgress();
      progressStartedAt = Date.now();
      resetProgress();
      function frame(){
        if(!slideTimer) return;
        const pct = Math.max(0, Math.min(100, ((Date.now() - progressStartedAt) / SLIDE_MS) * 100));
        if(progressBar) progressBar.style.width = pct + "%";
        if(pct < 100) progressFrame = requestAnimationFrame(frame);
      }
      progressFrame = requestAnimationFrame(frame);
    }

    function stopSlideshow(){
      if(slideTimer){
        clearTimeout(slideTimer);
        slideTimer = null;
      }
      stopProgress();
      resetProgress();
      if(lightboxPlay){
        lightboxPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
        lightboxPlay.classList.remove("active");
      }
    }

    function scheduleSlideshow(){
      runProgress();
      slideTimer = setTimeout(function(){
        updatePhoto(current + 1);
        scheduleSlideshow();
      }, SLIDE_MS);
    }

    function startSlideshow(){
      stopSlideshow();
      scheduleSlideshow();
      if(lightboxPlay){
        lightboxPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
        lightboxPlay.classList.add("active");
      }
    }

    function toggleSlideshow(){
      if(slideTimer) stopSlideshow();
      else startSlideshow();
    }

    function openLightbox(index){
      if(!lightbox) return;
      if(typeof index === "number") updatePhoto(index); else updatePhoto(current);
      lightbox.classList.add("open");
      D.body.classList.add("lvm-lightbox-open");
      D.documentElement.classList.add("lvm-lightbox-open");
      D.body.style.overflow = "hidden";
    }

    function closeLightbox(){
      if(!lightbox) return;
      stopSlideshow();
      lightbox.classList.remove("open", "show-thumbs");
      setZoom(false);
      lightboxZoom?.classList.remove("active");
      lightboxGallery?.classList.remove("active");
      D.body.classList.remove("lvm-lightbox-open");
      D.documentElement.classList.remove("lvm-lightbox-open");
      D.body.style.overflow = "";
    }

    function applyPan(){
      if(!lightboxImg) return;
      lightboxImg.style.setProperty("--lvm-pan-x", panX + "px");
      lightboxImg.style.setProperty("--lvm-pan-y", panY + "px");
    }

    function resetPan(){
      panX = 0;
      panY = 0;
      applyPan();
    }

    function setZoom(active){
      if(!lightboxImg) return;
      lightboxImg.classList.toggle("zoomed", !!active);
      lightboxZoom?.classList.toggle("active", lightboxImg.classList.contains("zoomed"));
      resetPan();
    }

    function toggleZoom(){
      if(!lightboxImg) return;
      setZoom(!lightboxImg.classList.contains("zoomed"));
    }

    function toggleThumbs(){
      if(!lightbox) return;
      lightbox.classList.toggle("show-thumbs");
      lightboxGallery?.classList.toggle("active", lightbox.classList.contains("show-thumbs"));
    }

    D.querySelectorAll(".lvm-veh-thumb").forEach(btn => {
      btn.addEventListener("click", () => { stopSlideshow(); updatePhoto(Number(btn.dataset.index || 0)); });
    });


    D.querySelector(".lvm-veh-prev")?.addEventListener("click", e => { e.stopPropagation(); stopSlideshow(); updatePhoto(current - 1); });
    D.querySelector(".lvm-veh-next")?.addEventListener("click", e => { e.stopPropagation(); stopSlideshow(); updatePhoto(current + 1); });
    D.querySelector("#lvmVehStage")?.addEventListener("click", e => { if(!e.target.closest("button")) openLightbox(); });
    D.querySelector(".lvm-veh-expand")?.addEventListener("click", e => { e.stopPropagation(); openLightbox(); });
    D.querySelector(".lvm-veh-lb-prev")?.addEventListener("click", () => { stopSlideshow(); updatePhoto(current - 1); });
    D.querySelector(".lvm-veh-lb-next")?.addEventListener("click", () => { stopSlideshow(); updatePhoto(current + 1); });

    lightboxThumbs?.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        stopSlideshow();
        updatePhoto(Number(btn.dataset.index || 0));
      });
    });

    lightboxZoom?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); toggleZoom(); });

    lightboxImg?.addEventListener("pointerdown", function(e){
      if(!lightboxImg.classList.contains("zoomed")) return;
      e.preventDefault();
      e.stopPropagation();
      isPanning = true;
      panMoved = false;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      panStartX = panX;
      panStartY = panY;
      lightboxImg.classList.add("is-panning");
      try{ lightboxImg.setPointerCapture(e.pointerId); }catch(err){}
    });

    lightboxImg?.addEventListener("pointermove", function(e){
      if(!isPanning || !lightboxImg.classList.contains("zoomed")) return;
      e.preventDefault();
      e.stopPropagation();
      const dx = e.clientX - pointerStartX;
      const dy = e.clientY - pointerStartY;
      if(Math.abs(dx) > 4 || Math.abs(dy) > 4) panMoved = true;
      panX = panStartX + dx;
      panY = panStartY + dy;
      applyPan();
    });

    function endPan(e){
      if(!isPanning) return;
      isPanning = false;
      lightboxImg?.classList.remove("is-panning");
      try{ lightboxImg?.releasePointerCapture(e.pointerId); }catch(err){}
      if(panMoved) suppressZoomClickUntil = Date.now() + 220;
    }

    lightboxImg?.addEventListener("pointerup", endPan);
    lightboxImg?.addEventListener("pointercancel", endPan);
    lightboxImg?.addEventListener("lostpointercapture", function(){ isPanning = false; lightboxImg?.classList.remove("is-panning"); });

    lightboxImg?.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      if(Date.now() < suppressZoomClickUntil) return;
      toggleZoom();
    });
    lightboxPlay?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); toggleSlideshow(); });
    lightboxGallery?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); toggleThumbs(); });
    D.querySelector(".lvm-veh-lb-close")?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); closeLightbox(); });

    lightbox?.addEventListener("click", e => { if(e.target === lightbox) closeLightbox(); });

    D.addEventListener("keydown", function(e){
      if(!lightbox || !lightbox.classList.contains("open")) return;
      if(e.key === "Escape") closeLightbox();
      if(e.key === "ArrowRight"){ stopSlideshow(); updatePhoto(current + 1); }
      if(e.key === "ArrowLeft"){ stopSlideshow(); updatePhoto(current - 1); }
    });

    requestAnimationFrame(() => D.querySelector("#lvmVehHero")?.classList.add("ready"));
    const reveals = D.querySelectorAll(".lvm-reveal");
    if ("IntersectionObserver" in W) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold:.12, rootMargin:"0px 0px -8% 0px" });
      reveals.forEach(el => io.observe(el));
    } else {
      reveals.forEach(el => el.classList.add("in"));
    }
  }


  D.addEventListener("DOMContentLoaded", function(){
    W.LVM_CARS = W.LVM_CARS || W.cars || [];
    W.cars = W.LVM_CARS;
    renderStock();
    renderDetail();
  });

  W.LVMStock = { getCars, getPublishedCars, normalizeCar, resolveAsset, slugify };
})();