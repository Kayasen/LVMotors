(function(){
  "use strict";

  const D = document;
  const STORAGE_KEY = "lvmotors_admin_stock_draft_v5";
  let cars = [];
  let selected = -1;
  let searchTerm = "";
  let draggedCarIndex = null;
  let draggedImageIndex = null;
  let draggedFeatureIndex = null;

  function $(id){ return D.getElementById(id); }

  function esc(v){
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;"
    }[c]));
  }

  function slugify(value){
    return String(value || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "viatura";
  }

  function asArray(v){
    if(Array.isArray(v)) return v.filter(Boolean);
    if(!v) return [];
    return String(v).split(/\n|,/).map(x => x.trim()).filter(Boolean);
  }

  function getTitle(car){
    return (car.title && (car.title.pt || car.title.en)) || car.titlePt || car.model || car.id || "Nova viatura";
  }

  function statusLabel(status){
    return {
      published:"Publicado",
      draft:"Rascunho",
      reserved:"Reservado",
      sold:"Vendido"
    }[status] || status || "Sem estado";
  }

  function normaliseExistingCar(car, index){
    return {
      id: car.id || car.slug || slugify((car.title && (car.title.pt || car.title.en)) || car.title || car.name || car.model || "viatura-" + index),
      status: car.status || "published",
      featured: !!car.featured,
      brand: car.brand || car.marca || "",
      model: car.model || car.modelo || "",
      title: typeof car.title === "object" ? car.title : { pt: car.title || car.name || car.nome || "", en: car.title || car.name || car.nome || "" },
      price: car.price || car.preco || "",
      year: car.year || car.ano || "",
      mileage: car.mileage || car.km || car.kms || "",
      fuel: car.fuel || car.combustivel || "",
      transmission: car.transmission || car.caixa || "",
      power: car.power || car.potencia || "",
      color: car.color || car.cor || "",
      description: typeof car.description === "object" ? car.description : { pt: car.description || car.descricao || "", en: car.description || car.descricao || "" },
      equipment: asArray(car.equipment || car.equipamento || car.extras),
      images: asArray(car.images || car.imagens || car.gallery || car.fotos || car.image),
      order: Number.isFinite(+car.order) ? +car.order : index
    };
  }

  function fromExisting(){
    const source = window.LVM_CARS || window.cars || [];
    return source.map(normaliseExistingCar);
  }

  function selectedCar(){
    return selected >= 0 ? cars[selected] : null;
  }


  function enforceSingleFeatured(activeCar){
    if(!activeCar || !activeCar.featured) return false;
    let changed = false;
    cars.forEach(car => {
      if(car !== activeCar && car.featured){
        car.featured = false;
        changed = true;
      }
    });
    return changed;
  }

  function normalizeFeaturedSelection(){
    let first = -1;
    cars.forEach((car, index) => {
      if(!car.featured) return;
      if(first === -1){
        first = index;
      }else{
        car.featured = false;
      }
    });
  }

  function saveLocal(){
    cars.forEach((car, i) => car.order = i);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cars, null, 2));
    renderList();
    renderStats();
  }

  function setStatus(message, type){
    const el = $("admin-status");
    if(!el) return;
    el.textContent = message || "";
    el.className = "admin-status " + (type || "muted");
  }

  function setServerState(ok, title, text){
    const dot = $("server-dot");
    const titleEl = $("server-title");
    const textEl = $("server-text");
    if(dot) dot.className = "server-dot " + (ok ? "ok" : "warn");
    if(titleEl) titleEl.textContent = title;
    if(textEl) textEl.textContent = text;
  }

  async function checkServer(){
    if(location.protocol === "file:"){
      setServerState(false, "Modo local detetado", "Abre pelo domínio/cPanel. Em file:// o PHP não consegue guardar.");
      return;
    }

    try{
      const res = await fetch("ping.php?ts=" + Date.now(), {cache:"no-store"});
      const data = await res.json();
      if(data.ok && data.carsWritable && data.stockWritable){
        if(data.gdLoaded && data.webpSupport){
        setServerState(true, "Servidor pronto", "PHP ativo, WebP ativo e permissões OK.");
      } else if(data.gdLoaded){
        setServerState(true, "Servidor pronto", "PHP ativo. Sem WebP, usa compressão JPG.");
      } else {
        setServerState(false, "GD não ativo", "Ativa a extensão GD no cPanel/PHP para comprimir imagens.");
      }
      } else if(data.ok){
        setServerState(false, "Permissões a rever", "Confirma permissões de data/cars.js e assets/img/stock no cPanel.");
      } else {
        setServerState(false, "Servidor não validado", "Não foi possível confirmar o PHP.");
      }
    } catch(e){
      setServerState(false, "PHP não respondeu", "O guardar direto só funciona num servidor com PHP ativo.");
    }
  }

  function load(){
    try {
      const draft = localStorage.getItem(STORAGE_KEY);
      cars = draft ? JSON.parse(draft) : fromExisting();
    } catch(e) {
      cars = fromExisting();
    }

    if(!Array.isArray(cars)) cars = [];
    cars = cars.map(normaliseExistingCar);
    cars.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
    normalizeFeaturedSelection();
    selected = cars.length ? 0 : -1;

    renderAll();
    setStatus("Pronto.", "muted");
    checkServer();
  }

  function renderAll(){
    renderList();
    renderForm();
    renderStats();
  }

  function renderStats(){
    $("stat-total") && ($("stat-total").textContent = cars.length);
    $("stat-published") && ($("stat-published").textContent = cars.filter(c => c.status === "published").length);
    $("stat-draft") && ($("stat-draft").textContent = cars.filter(c => c.status === "draft").length);
    $("stat-featured") && ($("stat-featured").textContent = cars.filter(c => c.featured).length);
    $("sidebar-count") && ($("sidebar-count").textContent = cars.length);
  }

  function filteredCars(){
    const term = searchTerm.trim().toLowerCase();
    if(!term) return cars;
    return cars.filter(car => {
      const blob = [car.id, car.brand, car.model, getTitle(car), car.price, car.year, car.status].join(" ").toLowerCase();
      return blob.includes(term);
    });
  }

  function adminImageSrc(path){
    const value = String(path || "");
    if(/^(https?:|data:|blob:|\/\/)/i.test(value)) return value;
    return "../" + value.replace(/^(\.\.\/)+|^\//, "");
  }

  function renderList(){
    const list = $("car-list");
    if(!list) return;

    const visible = filteredCars();
    list.innerHTML = visible.map(car => {
      const i = cars.indexOf(car);
      const img = (car.images || [])[0] || "assets/img/favicon.png";
      return `
        <button type="button" class="admin-car-item ${i === selected ? "active" : ""}" draggable="true" data-index="${i}">
          <span class="admin-car-item__drag"><i class="fa-solid fa-grip-vertical"></i></span>
          <span class="admin-car-item__order">${i + 1}</span>
          <img class="admin-car-item__thumb" src="${esc(adminImageSrc(img))}" alt="">
          <span class="admin-car-item__content">
            <span class="admin-car-item__top">
              <strong>${esc(getTitle(car))}</strong>
              <span class="admin-badge admin-badge--${esc(car.status)}">${esc(statusLabel(car.status))}</span>
            </span>
            <span class="admin-car-item__meta">${esc([car.year, car.price].filter(Boolean).join(" · ")) || "Sem preço"}</span>
            ${car.featured ? `<span class="admin-badge admin-badge--featured"><i class="fa-solid fa-star"></i> Destaque</span>` : ""}
          </span>
        </button>
      `;
    }).join("") || `<p class="admin-muted">Ainda não existem viaturas.</p>`;

    list.querySelectorAll(".admin-car-item").forEach(btn => {
      btn.addEventListener("click", () => {
        selected = Number(btn.dataset.index);
        renderList();
        renderForm();
      });

      btn.addEventListener("dragstart", e => {
        draggedCarIndex = Number(btn.dataset.index);
        btn.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      btn.addEventListener("dragend", () => {
        draggedCarIndex = null;
        btn.classList.remove("dragging");
      });

      btn.addEventListener("dragover", e => {
        e.preventDefault();
        btn.classList.add("drag-over");
      });

      btn.addEventListener("dragleave", () => btn.classList.remove("drag-over"));

      btn.addEventListener("drop", e => {
        e.preventDefault();
        btn.classList.remove("drag-over");
        const target = Number(btn.dataset.index);
        if(draggedCarIndex === null || draggedCarIndex === target) return;
        const [item] = cars.splice(draggedCarIndex, 1);
        cars.splice(target, 0, item);
        selected = target;
        saveLocal();
        renderForm();
        setStatus("Ordem das viaturas alterada. Carrega em Guardar no site para publicar.", "warn");
      });
    });
  }

  function renderCurrentCar(){
    const wrap = $("admin-current-car");
    const car = selectedCar();
    if(!wrap) return;

    if(!car){
      wrap.innerHTML = `<div class="admin-current-car__thumb"></div><div><strong>Nenhuma viatura selecionada</strong><span>Seleciona ou cria uma viatura.</span></div>`;
      return;
    }

    const img = (car.images || [])[0] || "assets/img/favicon.png";
    wrap.innerHTML = `
      <div class="admin-current-car__thumb"><img src="${esc(adminImageSrc(img))}" alt=""></div>
      <div>
        <strong>${esc(getTitle(car))}</strong>
        <span>${esc(car.id)} · ${esc(statusLabel(car.status))}${car.featured ? " · Destaque" : ""}</span>
      </div>
    `;
  }

  function getImageList(){
    return asArray($("car-images") ? $("car-images").value : "");
  }

  function setImageList(images){
    const car = selectedCar();
    if($("car-images")) $("car-images").value = (images || []).join("\n");
    if(car){
      car.images = images || [];
      saveLocal();
      renderImages();
      renderPreview();
      renderCurrentCar();
    }
  }

  function setFeatureList(features){
    const car = selectedCar();
    if($("car-equipment")) $("car-equipment").value = (features || []).join("\n");
    if(car){
      car.equipment = features || [];
      saveLocal();
      renderFeatures();
    }
  }

  function readForm(){
    const car = selectedCar();
    if(!car) return;

    syncEnglishHiddenFromManual();

    car.id = $("car-id").value.trim() || slugify($("car-title-pt").value || $("car-model").value);
    car.status = $("car-status").value;
    const wantedFeatured = $("car-featured").checked;
    const wasFeatured = !!car.featured;
    car.featured = wantedFeatured;
    const replacedFeatured = enforceSingleFeatured(car);
    if(wantedFeatured && replacedFeatured && !wasFeatured){
      setStatus("Esta viatura ficou em destaque. A anterior foi removida automaticamente.", "ok");
    }
    car.brand = $("car-brand").value.trim();
    car.model = $("car-model").value.trim();
    car.title = {
      pt: $("car-title-pt").value.trim(),
      en: ($("car-title-en").value.trim() || $("car-title-pt").value.trim())
    };
    car.price = $("car-price").value.trim();
    car.year = $("car-year").value.trim();
    car.mileage = $("car-mileage").value.trim();
    car.fuel = $("car-fuel").value.trim();
    car.transmission = $("car-transmission").value.trim();
    car.power = $("car-power").value.trim();
    car.color = $("car-color").value.trim();
    car.description = {
      pt: $("car-description-pt").value.trim(),
      en: ($("car-description-en").value.trim() || $("car-description-pt").value.trim())
    };
    car.equipment = asArray($("car-equipment").value);
    car.images = getImageList();

    saveLocal();
    renderPreview();
    renderCurrentCar();
  }

  function renderForm(){
    const car = selectedCar();
    const form = $("car-form");
    if(!form) return;

    if(!car){
      form.classList.add("is-disabled");
      ["id","brand","model","title-pt","title-en","title-en-manual","price","year","mileage","fuel","transmission","power","color","description-pt","description-en","description-en-manual","equipment","images"].forEach(id => {
        const el = $("car-" + id);
        if(el) el.value = "";
      });
      $("car-featured").checked = false;
      renderCurrentCar();
      renderPreview();
      renderFeatures();
      renderImages();
      return;
    }

    form.classList.remove("is-disabled");
    $("car-id").value = car.id || "";
    $("car-status").value = car.status || "published";
    $("car-featured").checked = !!car.featured;
    $("car-brand").value = car.brand || "";
    $("car-model").value = car.model || "";
    $("car-title-pt").value = (car.title && car.title.pt) || "";
    $("car-title-en").value = (car.title && car.title.en) || "";
    if($("car-title-en-manual")) $("car-title-en-manual").value = (car.title && car.title.en) || "";
    $("car-price").value = car.price || "";
    $("car-year").value = car.year || "";
    $("car-mileage").value = car.mileage || "";
    $("car-fuel").value = car.fuel || "";
    $("car-transmission").value = car.transmission || "";
    $("car-power").value = car.power || "";
    $("car-color").value = car.color || "";
    $("car-description-pt").value = (car.description && car.description.pt) || "";
    $("car-description-en").value = (car.description && car.description.en) || "";
    if($("car-description-en-manual")) $("car-description-en-manual").value = (car.description && car.description.en) || "";
    $("car-equipment").value = (car.equipment || []).join("\n");
    $("car-images").value = (car.images || []).join("\n");

    renderCurrentCar();
    renderPreview();
    renderFeatures();
    renderImages();
  }

  function renderFeatures(){
    const wrap = $("features-list");
    const car = selectedCar();
    if(!wrap) return;

    const features = car ? (car.equipment || []) : [];
    if(!features.length){
      wrap.innerHTML = `<p class="admin-muted">Sem extras adicionados.</p>`;
      return;
    }

    wrap.innerHTML = features.map((feature, i) => `
      <div class="feature-pill" draggable="true" data-index="${i}">
        <span class="feature-pill__drag"><i class="fa-solid fa-grip-vertical"></i></span>
        <span>${esc(feature)}</span>
        <button type="button" data-action="remove" aria-label="Remover"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `).join("");

    wrap.querySelectorAll(".feature-pill").forEach(row => {
      row.addEventListener("dragstart", e => {
        draggedFeatureIndex = Number(row.dataset.index);
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        draggedFeatureIndex = null;
        row.classList.remove("dragging");
      });
      row.addEventListener("dragover", e => {
        e.preventDefault();
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", e => {
        e.preventDefault();
        row.classList.remove("drag-over");
        const target = Number(row.dataset.index);
        if(draggedFeatureIndex === null || draggedFeatureIndex === target) return;
        const list = [...features];
        const [item] = list.splice(draggedFeatureIndex, 1);
        list.splice(target, 0, item);
        setFeatureList(list);
      });
    });

    wrap.querySelectorAll("[data-action='remove']").forEach(btn => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".feature-pill");
        const i = Number(row.dataset.index);
        const list = [...features];
        list.splice(i, 1);
        setFeatureList(list);
      });
    });
  }

  function addFeature(){
    const input = $("feature-input");
    const car = selectedCar();
    if(!input || !car) return;
    const value = input.value.trim();
    if(!value) return;
    const list = [...(car.equipment || []), value];
    input.value = "";
    setFeatureList(list);
    setStatus("Extra adicionado. Carrega em Guardar no site para publicar.", "warn");
  }

  function renderImages(){
    const wrap = $("admin-images-list");
    const car = selectedCar();
    if(!wrap) return;

    const images = car ? (car.images || []) : [];
    if(!images.length){
      wrap.innerHTML = `<p class="admin-muted">Sem imagens. Faz upload ou arrasta imagens para a zona de upload.</p>`;
      return;
    }

    wrap.innerHTML = images.map((img, i) => `
      <div class="admin-image-row" draggable="true" data-index="${i}">
        <span class="admin-image-row__drag"><i class="fa-solid fa-grip-vertical"></i></span>
        <img src="${esc(adminImageSrc(img))}" alt="">
        <div>
          <strong>${i === 0 ? "Capa" : "Imagem " + (i + 1)}</strong>
          <span>${esc(img)}</span>
        </div>
        <button type="button" data-action="cover" ${i===0 ? "disabled" : ""}>Capa</button>
        <button type="button" data-action="remove">Apagar</button>
      </div>
    `).join("");

    wrap.querySelectorAll(".admin-image-row").forEach(row => {
      row.addEventListener("dragstart", e => {
        draggedImageIndex = Number(row.dataset.index);
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        draggedImageIndex = null;
        row.classList.remove("dragging");
      });
      row.addEventListener("dragover", e => {
        e.preventDefault();
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", e => {
        e.preventDefault();
        row.classList.remove("drag-over");
        const target = Number(row.dataset.index);
        if(draggedImageIndex === null || draggedImageIndex === target) return;
        const list = [...images];
        const [item] = list.splice(draggedImageIndex, 1);
        list.splice(target, 0, item);
        setImageList(list);
        setStatus("Ordem das imagens alterada. Carrega em Guardar no site para publicar.", "warn");
      });
    });

    wrap.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".admin-image-row");
        const i = Number(row.dataset.index);
        const action = btn.dataset.action;
        const list = [...images];

        if(action === "cover" && i > 0){
          const [img] = list.splice(i, 1);
          list.unshift(img);
        }

        if(action === "remove"){
          list.splice(i, 1);
        }

        setImageList(list);
      });
    });
  }

  function renderPreview(){
    const car = selectedCar();
    const preview = $("car-preview");
    if(!preview) return;

    if(!car){
      preview.innerHTML = `<p class="admin-muted">Seleciona ou cria uma viatura.</p>`;
      return;
    }

    const img = (car.images || [])[0] || "assets/img/favicon.png";
    preview.innerHTML = `
      <div class="admin-preview-card">
        <img src="${esc(adminImageSrc(img))}" alt="">
        <div>
          <div class="admin-preview-card__top">
            <span class="admin-badge admin-badge--${esc(car.status)}">${esc(statusLabel(car.status))}</span>
            ${car.featured ? `<span class="admin-badge admin-badge--featured"><i class="fa-solid fa-star"></i> Destaque</span>` : ""}
          </div>
          <h3>${esc(getTitle(car))}</h3>
          <p>${esc(car.price || "Sob consulta")}</p>
          <small>${esc([car.year, car.mileage, car.fuel, car.transmission].filter(Boolean).join(" · "))}</small>
        </div>
      </div>
    `;
  }

  function newCar(){
    cars.push({
      id: "nova-viatura-" + (cars.length + 1),
      status: "draft",
      featured: false,
      brand: "",
      model: "",
      title: { pt: "Nova viatura", en: "New vehicle" },
      price: "Sob consulta",
      year: "",
      mileage: "",
      fuel: "",
      transmission: "",
      power: "",
      color: "",
      description: { pt: "", en: "" },
      equipment: [],
      images: [],
      order: cars.length
    });
    selected = cars.length - 1;
    saveLocal();
    renderForm();
    setStatus("Nova viatura criada em rascunho.", "ok");
  }

  function duplicateCar(){
    const car = selectedCar();
    if(!car) return;
    const copy = JSON.parse(JSON.stringify(car));
    copy.id = slugify((copy.id || "viatura") + "-copia");
    copy.title.pt = (copy.title.pt || "Viatura") + " cópia";
    copy.title.en = (copy.title.en || "Vehicle") + " copy";
    copy.status = "draft";
    cars.splice(selected + 1, 0, copy);
    selected++;
    saveLocal();
    renderForm();
    setStatus("Viatura duplicada.", "ok");
  }

  function deleteCar(){
    if(selected < 0) return;
    if(!confirm("Apagar esta viatura da lista? Depois carrega em Guardar no site.")) return;
    cars.splice(selected, 1);
    selected = Math.min(selected, cars.length - 1);
    saveLocal();
    renderForm();
    setStatus("Viatura apagada localmente. Carrega em Guardar no site para publicar.", "warn");
  }

  function exportCarsJs(){
    readForm();
    const output = `window.LVM_CARS = ${JSON.stringify(cars.map((c,i)=>({...c, order:i})), null, 2)};\nwindow.cars = window.LVM_CARS;\n`;
    downloadFile("cars.js", output, "text/javascript;charset=utf-8");
  }

  function exportJson(){
    readForm();
    downloadFile("lvmotors-cars-backup.json", JSON.stringify(cars, null, 2), "application/json;charset=utf-8");
  }

  function downloadFile(filename, content, type){
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = D.createElement("a");
    a.href = url;
    a.download = filename;
    D.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = JSON.parse(String(reader.result));
        cars = Array.isArray(parsed) ? parsed : parsed.cars || [];
        cars = cars.map(normaliseExistingCar);
        normalizeFeaturedSelection();
        selected = cars.length ? 0 : -1;
        saveLocal();
        renderForm();
        setStatus("Backup importado. Carrega em Guardar no site para publicar.", "ok");
      } catch(e){
        setStatus("Ficheiro inválido.", "error");
      }
    };
    reader.readAsText(file);
  }

  async function saveToServer(){
    readForm();

    if(location.protocol === "file:"){
      setStatus("Estás em modo local. Para guardar direto, abre o painel no domínio/cPanel com PHP. Fiz download do cars.js como alternativa.", "error");
      exportCarsJs();
      return;
    }

    const password = ($("admin-password") && $("admin-password").value || "").trim();
    if(!password){
      setStatus("Coloca a password do painel.", "error");
      $("admin-password")?.focus();
      return;
    }

    const form = new FormData();
    form.append("password", password);
    form.append("cars", JSON.stringify(cars.map((c,i)=>({...c, order:i}))));

    setStatus("A guardar no servidor...", "warn");

    try{
      const res = await fetch("save-cars.php", {method:"POST", body:form});
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) {
        throw new Error("O PHP não devolveu JSON. Confirma que estás num servidor com PHP ativo.");
      }

      if(!res.ok || !data.ok) throw new Error(data.message || "Erro ao guardar.");
      localStorage.removeItem(STORAGE_KEY);
      setStatus(`${data.message} (${data.count} viaturas)`, "ok");
      checkServer();
    } catch(e){
      setStatus(e.message || "Erro ao guardar no servidor.", "error");
    }
  }


  function formatBytes(bytes){
    const value = Number(bytes || 0);
    if(value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + " MB";
    if(value >= 1024) return (value / 1024).toFixed(0) + " KB";
    return value + " B";
  }

  async function uploadImages(filesFromDrop){
    const car = selectedCar();
    if(!car){
      setStatus("Seleciona uma viatura antes de carregar imagens.", "error");
      return;
    }

    if(location.protocol === "file:"){
      setStatus("Upload direto só funciona no servidor/cPanel com PHP.", "error");
      return;
    }

    const password = ($("admin-password") && $("admin-password").value || "").trim();
    if(!password){
      setStatus("Coloca a password do painel.", "error");
      $("admin-password")?.focus();
      return;
    }

    const input = $("images-upload");
    const files = filesFromDrop || (input && input.files ? [...input.files] : []);
    if(!files.length){
      setStatus("Seleciona pelo menos uma imagem.", "error");
      return;
    }

    const form = new FormData();
    form.append("password", password);
    files.forEach(file => form.append("images[]", file));

    setStatus("A carregar imagens...", "warn");

    try{
      const res = await fetch("upload-images.php", {method:"POST", body:form});
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) {
        throw new Error("O PHP não devolveu JSON. Confirma que estás num servidor com PHP ativo.");
      }

      if(!res.ok || !data.ok) throw new Error(data.message || "Erro no upload.");

      const next = getImageList().concat(data.images || []);
      setImageList(next);
      if(input) input.value = "";

      const saved = (data.details || []).reduce((total, item) => total + Number(item.savedBytes || 0), 0);
      const savedText = saved > 0 ? " Espaço poupado: " + formatBytes(saved) + "." : "";

      setStatus(`${(data.images || []).length} imagem(ns) carregada(s) e comprimida(s).${savedText} Carrega em Guardar no site para publicar.`, "ok");
      checkServer();
    } catch(e){
      setStatus(e.message || "Erro ao carregar imagens.", "error");
    }
  }

  function setupTabs(){
    D.querySelectorAll(".admin-tabs button").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        D.querySelectorAll(".admin-tabs button").forEach(b => b.classList.toggle("active", b === btn));
        D.querySelectorAll(".admin-tab-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === tab));
      });
    });
  }

  function setupUploadDrop(){
    const zone = $("upload-zone");
    if(!zone) return;

    ["dragenter","dragover"].forEach(evt => {
      zone.addEventListener(evt, e => {
        e.preventDefault();
        zone.classList.add("drag-over");
      });
    });

    ["dragleave","drop"].forEach(evt => {
      zone.addEventListener(evt, e => {
        e.preventDefault();
        zone.classList.remove("drag-over");
      });
    });

    zone.addEventListener("drop", e => {
      const files = [...(e.dataTransfer.files || [])].filter(file => file.type.startsWith("image/"));
      if(files.length) uploadImages(files);
    });
  }


  function getManualEnFields(){
    return {
      title: $("car-title-en-manual"),
      description: $("car-description-en-manual")
    };
  }

  function syncEnglishHiddenFromManual(){
    const manual = getManualEnFields();
    const titleHidden = $("car-title-en");
    const descHidden = $("car-description-en");

    if(titleHidden && manual.title){
      titleHidden.value = manual.title.value.trim() || ($("car-title-pt") ? $("car-title-pt").value.trim() : "");
    }

    if(descHidden && manual.description){
      descHidden.value = manual.description.value.trim() || ($("car-description-pt") ? $("car-description-pt").value.trim() : "");
    }
  }

  async function translateText(text){
    const password = ($("admin-password") && $("admin-password").value || "").trim();

    if(!password){
      throw new Error("Coloca a password do painel para usar tradução automática.");
    }

    if(location.protocol === "file:"){
      throw new Error("A tradução automática só funciona no servidor/cPanel com PHP.");
    }

    const form = new FormData();
    form.append("password", password);
    form.append("text", text || "");

    const res = await fetch("translate.php", {
      method: "POST",
      body: form
    });

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch(e) {
      throw new Error("O PHP de tradução não devolveu JSON.");
    }

    if(!res.ok || !data.ok){
      throw new Error(data.message || "Erro ao traduzir.");
    }

    return data.translated || "";
  }

  async function translateCurrentToEnglish(){
    const car = selectedCar();
    if(!car) return;

    readForm();

    const titlePt = ($("car-title-pt") && $("car-title-pt").value || "").trim();
    const descPt = ($("car-description-pt") && $("car-description-pt").value || "").trim();

    if(!titlePt && !descPt){
      setStatus("Não existe título nem descrição em português para traduzir.", "error");
      return;
    }

    setStatus("A gerar inglês automaticamente...", "warn");

    try {
      const [titleEn, descEn] = await Promise.all([
        titlePt ? translateText(titlePt) : Promise.resolve(""),
        descPt ? translateText(descPt) : Promise.resolve("")
      ]);

      const manual = getManualEnFields();

      if(manual.title) manual.title.value = titleEn;
      if(manual.description) manual.description.value = descEn;

      if($("car-title-en")) $("car-title-en").value = titleEn;
      if($("car-description-en")) $("car-description-en").value = descEn;

      readForm();
      setStatus("Inglês gerado com sucesso. Carrega em Guardar no site para publicar.", "ok");
    } catch(e) {
      const manual = getManualEnFields();
      if(manual.title && !manual.title.value) manual.title.value = titlePt;
      if(manual.description && !manual.description.value) manual.description.value = descPt;
      syncEnglishHiddenFromManual();
      readForm();
      setStatus((e.message || "Erro na tradução.") + " Mantive o PT como fallback no EN.", "error");
    }
  }


  D.addEventListener("DOMContentLoaded", () => {
    load();
    setupTabs();
    setupUploadDrop();

    D.querySelectorAll("#car-form input, #car-form textarea, #car-form select").forEach(el => {
      el.addEventListener("input", readForm);
      el.addEventListener("change", readForm);
    });

    $("car-search")?.addEventListener("input", e => {
      searchTerm = e.target.value || "";
      renderList();
    });

    $("btn-new")?.addEventListener("click", newCar);
    $("btn-duplicate")?.addEventListener("click", duplicateCar);
    $("btn-delete")?.addEventListener("click", deleteCar);
    $("btn-add-feature")?.addEventListener("click", addFeature);
    $("btn-translate-en")?.addEventListener("click", translateCurrentToEnglish);
    $("car-title-en-manual")?.addEventListener("input", () => { syncEnglishHiddenFromManual(); readForm(); });
    $("car-description-en-manual")?.addEventListener("input", () => { syncEnglishHiddenFromManual(); readForm(); });
    $("feature-input")?.addEventListener("keydown", e => {
      if(e.key === "Enter"){
        e.preventDefault();
        addFeature();
      }
    });
    $("btn-export-js")?.addEventListener("click", exportCarsJs);
    $("btn-export-json")?.addEventListener("click", exportJson);
    $("btn-save-server")?.addEventListener("click", saveToServer);
    $("btn-upload-images")?.addEventListener("click", () => uploadImages());
    $("btn-clear-draft")?.addEventListener("click", () => {
      if(confirm("Limpar rascunho local e recarregar do data/cars.js?")){
        localStorage.removeItem(STORAGE_KEY);
        load();
      }
    });
    $("import-json")?.addEventListener("change", e => importJsonFile(e.target.files[0]));
  });
})();