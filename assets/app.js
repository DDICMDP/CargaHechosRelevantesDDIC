(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const showErr = m => { const b=$("#errorBox"); if(b){ b.textContent="Error: "+m; b.hidden=false; } };

  function bindClick(id, handler){
    const n = document.getElementById(id);
    if (n) n.onclick = handler;
    return !!n;
  }

  const CASEKEY="hr_cases_v1";
  const CATKEY ="hr_catalogs_v1";

  const TitleCase = (s)=> (s||"").toLowerCase().split(/(\s|-)/).map(p=>{
    if(p.trim()===""||p==='-') return p; return p.charAt(0).toUpperCase()+p.slice(1);
  }).join("");

  // ==== Fecha (solo dd-mm-aaaa en título) ====
  function formattedFecha(){
    const d = $("#g_fecha_dia").value;
    if(!d) return "";
    const [y,m,day] = d.split("-");
    return `${day}-${m}-${y}`;
  }

  // ===== Catálogos (seed + persistencia) =====
  const DEFAULT_CATALOGS = {
    "General Pueyrredon": {
      localidades: [
        "Mar del Plata","Batán","Sierra de los Padres","Chapadmalal","Estación Camet","El Boquerón"
      ],
      dependencias: [
        "Comisaría 1ra MdP","Comisaría 2da MdP","Comisaría 3ra MdP","Comisaría 4ta MdP",
        "Comisaría 5ta MdP","Comisaría 6ta MdP","Subcomisaría Camet","Subcomisaría Acantilados",
        "DDI Mar del Plata","Comisaría de la Mujer MdP","UPPL MdP","CPO MdP"
      ]
    },
    "Balcarce": {
      localidades: ["Balcarce","San Agustín","Los Pinos"],
      dependencias: [
        "Comisaría Balcarce","Comisaría de la Mujer Balcarce","DDI Balcarce","Destacamento San Agustín"
      ]
    },
    "Mar Chiquita": {
      localidades: ["Coronel Vidal","Santa Clara del Mar","Vivoratá","Mar de Cobo","La Caleta","Mar Chiquita"],
      dependencias: [
        "Comisaría Coronel Vidal","Comisaría Santa Clara del Mar","Comisaría de la Mujer Mar Chiquita","Destacamento Mar de Cobo"
      ]
    },
    "General Alvarado": {
      localidades: ["Miramar","Mechongué","Comandante N. Otamendi","Mar del Sud"],
      dependencias: [
        "Comisaría Miramar","Comisaría Otamendi","Comisaría de la Mujer Gral. Alvarado","Destacamento Mar del Sud"
      ]
    }
  };

  function getCatalogs(){
    try{
      const raw = localStorage.getItem(CATKEY);
      if(!raw) return structuredClone(DEFAULT_CATALOGS);
      const parsed = JSON.parse(raw);
      const cat = structuredClone(DEFAULT_CATALOGS);
      for(const k of Object.keys(parsed||{})){ cat[k] = parsed[k]; }
      return cat;
    } catch { return structuredClone(DEFAULT_CATALOGS); }
  }
  function setCatalogs(obj){ localStorage.setItem(CATKEY, JSON.stringify(obj)); }

  // ===== Casos =====
  function getCases(){ try{ return JSON.parse(localStorage.getItem(CASEKEY)||"[]"); }catch{ return []; } }
  function setCases(arr){ localStorage.setItem(CASEKEY, JSON.stringify(arr)); }
  function freshId(){ return "c_"+Date.now()+"_"+Math.random().toString(36).slice(2,7); }

  function renderCases(){
    const box=$("#casesList"); if(!box) return;
    const cases = getCases();
    if(!cases.length){ box.innerHTML="Sin hechos guardados."; return; }
    box.innerHTML = `<table><thead><tr><th></th><th></th><th>Nombre</th><th>Fecha</th><th>Tipo</th><th>Número</th><th>Partido</th><th>Dep.</th></tr></thead><tbody>${
      cases.map(c=>`<tr>
        <td><input type="checkbox" class="caseCheck" data-id="${c.id}"></td>
        <td><input type="radio" name="caseSel" data-id="${c.id}"></td>
        <td>${c.name||''}</td>
        <td>${c.generales?.fecha_hora||''}</td>
        <td>${c.generales?.tipoExp||''}</td>
        <td>${c.generales?.numExp||''}</td>
        <td>${c.generales?.partido||''}</td>
        <td>${c.generales?.dependencia||''}</td>
      </tr>`).join("")
    }</tbody></table>`;
    attachCaseSearch();
  }

  // ===== Buscador en la tabla =====
  function attachCaseSearch() {
    const input = document.getElementById("caseSearch");
    const box = document.getElementById("casesList");
    if (!input || !box) return;
    input.oninput = () => {
      const q = input.value.toLowerCase();
      box.querySelectorAll("tbody tr").forEach(tr=>{
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    };
  }

  // ===== Desplegables dependientes =====
  function fillSelectOptions(select, list, {includeManual=false}={}){
    select.innerHTML = "";
    select.append(new Option("— Elegir —", ""));
    (list||[]).forEach(v=> select.append(new Option(v, v)));
    if(includeManual) select.append(new Option("Escribir manualmente…", "__manual__"));
  }

  function loadLocalidadesAndDeps(){
    const cat = getCatalogs();
    const partido = $("#g_partido").value || "";
    const locSel = $("#g_localidad");
    const depSel = $("#g_dep");
    const depManualWrap = $("#g_dep_manual_wrap");

    if(!partido || !cat[partido]){
      fillSelectOptions(locSel, [], {});
      fillSelectOptions(depSel, [], {includeManual:true});
      depManualWrap.style.display="none";
      return;
    }
    fillSelectOptions(locSel, (cat[partido].localidades||[]), {});
    fillSelectOptions(depSel, (cat[partido].dependencias||[]), {includeManual:true});
    depManualWrap.style.display = (depSel.value==="__manual__") ? "block" : "none";
  }

  $("#g_dep")?.addEventListener("change", ()=>{
    const depManualWrap = $("#g_dep_manual_wrap");
    depManualWrap.style.display = ($("#g_dep").value==="__manual__") ? "block" : "none";
    renderTitlePreview();
  });

  // ===== Etiquetas dinámicas =====
  const ROLE_KEYS = ["victima","imputado","sindicado","denunciante","testigo","pp","aprehendido","detenido","menor","nn","damnificado institucional"];
  const OBJ_CATS  = ["secuestro","sustraccion","hallazgo","otro"];

  function insertAtCursor(textarea, text){
    if(!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end   = textarea.selectionEnd   ?? textarea.value.length;
    const before = textarea.value.slice(0,start);
    const after  = textarea.value.slice(end);
    const needsSpace = before && !/\s$/.test(before) ? " " : "";
    textarea.value = before + needsSpace + text + " " + after;
    const pos = (before + needsSpace + text + " ").length;
    textarea.setSelectionRange(pos,pos);
    textarea.focus();
  }

  function availableTags(){
    const tags = new Set();
    const allPeople = (CIV.store||[]).concat(FZA.store||[]);
    ROLE_KEYS.forEach(role=>{
      const arr = allPeople.filter(p => String(p.vinculo||"").toLowerCase() === role);
      for(let i=0;i<arr.length;i++){ tags.add(`#${role}:${i}`); }
    });
    for(let i=0;i<(FZA.store||[]).length;i++){ tags.add(`#pf:${i}`); }
    if((FZA.store||[]).length){ tags.add(`#pf`); }
    OBJ_CATS.forEach(cat=>{
      const arr = (OBJ.store||[]).filter(o => String(o.vinculo||"").toLowerCase()===cat);
      for(let i=0;i<arr.length;i++){ tags.add(`#${cat}:${i}`); }
      if(arr.length) tags.add(`#${cat}`);
    });
    return Array.from(tags);
  }

  function renderTagHelper(){
    const box = document.getElementById("tagHelper");
    if(!box) return;
    const tags = availableTags();
    if(!tags.length){
      box.innerHTML = `<span class="muted">No hay etiquetas disponibles. Cargá personas/objetos para ver sugerencias.</span>`;
      return;
    }
    box.innerHTML = tags.map(t=>`<button type="button" class="chip" data-tag="${t}">${t}</button>`).join("");
    box.querySelectorAll("[data-tag]").forEach(btn=>{
      btn.onclick = ()=> insertAtCursor(document.getElementById("cuerpo"), btn.dataset.tag);
    });
  }

  // ===== Civiles (con editar) =====
  const CIV = {
    store:[],
    editingIndex: null,
    addOrUpdate(){
      const p = {
        nombre: $("#c_nombre").value, apellido: $("#c_apellido").value, edad: $("#c_edad").value,
        genero: $("#c_genero").value, dni: $("#c_dni").value, pais: $("#c_pais").value,
        loc_domicilio: $("#c_loc").value, calle_domicilio: $("#c_calle").value,
        vinculo: $("#c_vinculo").value, obito: $("#c_obito").value==="true"
      };
      if (this.editingIndex === null) {
        this.store.push(p);
      } else {
        this.store[this.editingIndex] = p;
        this.editingIndex = null;
        const btn = document.getElementById("addCivil");
        if (btn) btn.textContent = "Agregar involucrado";
        const cancel = document.getElementById("cancelEditCivil");
        if (cancel) cancel.remove();
      }
      this.clearForm();
      this.render();
    },
    clearForm(){
      $("#c_nombre").value=""; $("#c_apellido").value=""; $("#c_edad").value="";
      $("#c_genero").value=""; $("#c_dni").value=""; $("#c_pais").value="";
      $("#c_loc").value=""; $("#c_calle").value=""; $("#c_vinculo").value="Victima"; $("#c_obito").value="false";
    },
    startEdit(i){
      const p = this.store[i]; if(!p) return;
      $("#c_nombre").value=p.nombre||""; $("#c_apellido").value=p.apellido||""; $("#c_edad").value=p.edad||"";
      $("#c_genero").value=p.genero||""; $("#c_dni").value=p.dni||""; $("#c_pais").value=p.pais||"";
      $("#c_loc").value=p.loc_domicilio||""; $("#c_calle").value=p.calle_domicilio||"";
      $("#c_vinculo").value=p.vinculo||"Victima"; $("#c_obito").value=p.obito?"true":"false";
      this.editingIndex = i;
      const btn = document.getElementById("addCivil");
      if (btn) btn.textContent = "Guardar cambios";
      if (!document.getElementById("cancelEditCivil")) {
        const cancel = document.createElement("button");
        cancel.id = "cancelEditCivil";
        cancel.className = "btn ghost";
        cancel.style.marginLeft = "6px";
        cancel.textContent = "Cancelar";
        btn.parentElement.appendChild(cancel);
        cancel.onclick = ()=>{ this.editingIndex=null; this.clearForm(); if(btn) btn.textContent="Agregar involucrado"; cancel.remove(); };
      }
    },
    render(){
      const box=$("#civilesList");
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML = `<div class="table"><table><thead><tr>
        <th>#</th><th>Vínculo</th><th>Nombre</th><th>Apellido</th><th>Edad</th><th>DNI</th><th>Domicilio</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((p,i)=>`<tr>
          <td>${i}</td><td>${p.vinculo}</td>
          <td>${TitleCase(p.nombre||"")}</td><td>${TitleCase(p.apellido||"")}</td>
          <td>${p.edad||""}</td><td>${p.dni||""}</td>
          <td>${[TitleCase(p.calle_domicilio||""), TitleCase(p.loc_domicilio||"")].filter(Boolean).join(", ")}</td>
          <td>
            <button class="btn ghost" data-editc="${i}">Editar</button>
            <button class="btn ghost" data-delc="${i}">Quitar</button>
          </td>
        </tr>`).join("")
      }</tbody></table></div>`;
      $$("#civilesList [data-delc]").forEach(b=> b.onclick = ()=>{
        this.store.splice(parseInt(b.dataset.delc,10),1); this.render();
      });
      $$("#civilesList [data-editc]").forEach(b=> b.onclick = ()=>{
        this.startEdit(parseInt(b.dataset.editc,10));
      });
      renderTagHelper();
    }
  };

  // ===== Fuerzas (con editar) =====
  const FZA = {
    store:[],
    editingIndex: null,
    addOrUpdate(){
      const p = {
        nombre: $("#f_nombre").value, apellido: $("#f_apellido").value, edad: $("#f_edad").value,
        fuerza: $("#f_fuerza").value, jerarquia: $("#f_jerarquia").value, legajo: $("#f_legajo").value,
        destino: $("#f_destino").value, loc_domicilio: $("#f_loc").value, calle_domicilio: $("#f_calle").value,
        vinculo: $("#f_vinculo").value, obito: $("#f_obito").value==="true"
      };
      if (this.editingIndex === null) {
        this.store.push(p);
      } else {
        this.store[this.editingIndex] = p;
        this.editingIndex = null;
        const btn = document.getElementById("addFuerza");
        if (btn) btn.textContent = "Agregar personal";
        const cancel = document.getElementById("cancelEditFza");
        if (cancel) cancel.remove();
      }
      this.clearForm();
      this.render();
    },
    clearForm(){
      $("#f_nombre").value=""; $("#f_apellido").value=""; $("#f_edad").value="";
      $("#f_fuerza").value=""; $("#f_jerarquia").value=""; $("#f_legajo").value="";
      $("#f_destino").value=""; $("#f_loc").value=""; $("#f_calle").value="";
      $("#f_vinculo").value="Imputado"; $("#f_obito").value="false";
    },
    startEdit(i){
      const p = this.store[i]; if(!p) return;
      $("#f_nombre").value=p.nombre||""; $("#f_apellido").value=p.apellido||""; $("#f_edad").value=p.edad||"";
      $("#f_fuerza").value=p.fuerza||""; $("#f_jerarquia").value=p.jerarquia||""; $("#f_legajo").value=p.legajo||"";
      $("#f_destino").value=p.destino||""; $("#f_loc").value=p.loc_domicilio||""; $("#f_calle").value=p.calle_domicilio||"";
      $("#f_vinculo").value=p.vinculo||"Imputado"; $("#f_obito").value=p.obito?"true":"false";
      this.editingIndex = i;
      const btn = document.getElementById("addFuerza");
      if (btn) btn.textContent = "Guardar cambios";
      if (!document.getElementById("cancelEditFza")) {
        const cancel = document.createElement("button");
        cancel.id = "cancelEditFza";
        cancel.className = "btn ghost";
        cancel.style.marginLeft = "6px";
        cancel.textContent = "Cancelar";
        btn.parentElement.appendChild(cancel);
        cancel.onclick = ()=>{ this.editingIndex=null; this.clearForm(); if(btn) btn.textContent="Agregar personal"; cancel.remove(); };
      }
    },
    render(){
      const box=$("#fuerzasList");
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML = `<div class="table"><table><thead><tr>
        <th>#</th><th>Vínculo</th><th>Nombre</th><th>Apellido</th><th>Edad</th><th>Fuerza</th><th>Jerarquía</th><th>Destino</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((p,i)=>`<tr>
          <td>${i}</td><td>${p.vinculo}</td>
          <td>${TitleCase(p.nombre||"")}</td><td>${TitleCase(p.apellido||"")}</td>
          <td>${p.edad||""}</td><td>${p.fuerza||""}</td><td>${p.jerarquia||""}</td><td>${p.destino||""}</td>
          <td>
            <button class="btn ghost" data-editf="${i}">Editar</button>
            <button class="btn ghost" data-delf="${i}">Quitar</button>
          </td>
        </tr>`).join("")
      }</tbody></table></div>`;
      $$("#fuerzasList [data-delf]").forEach(b=> b.onclick = ()=>{
        this.store.splice(parseInt(b.dataset.delf,10),1); this.render();
      });
      $$("#fuerzasList [data-editf]").forEach(b=> b.onclick = ()=>{
        this.startEdit(parseInt(b.dataset.editf,10));
      });
      renderTagHelper();
    }
  };

  // ===== Objetos (con editar) =====
  const OBJ = {
    store:[],
    editingIndex: null,
    addOrUpdate(){
      const o = { descripcion: $("#o_desc").value, vinculo: $("#o_vinc").value };
      if(!o.descripcion.trim()) return;
      if (this.editingIndex === null) {
        this.store.push(o);
      } else {
        this.store[this.editingIndex] = o;
        this.editingIndex = null;
        const btn = document.getElementById("addObjeto");
        if (btn) btn.textContent = "Agregar objeto";
        const cancel = document.getElementById("cancelEditObj");
        if (cancel) cancel.remove();
      }
      this.clearForm();
      this.render();
    },
    clearForm(){
      $("#o_desc").value=""; $("#o_vinc").value="Secuestro";
    },
    startEdit(i){
      const o = this.store[i]; if(!o) return;
      $("#o_desc").value = o.descripcion||"";
      $("#o_vinc").value = o.vinculo||"Secuestro";
      this.editingIndex = i;
      const btn = document.getElementById("addObjeto");
      if (btn) btn.textContent = "Guardar cambios";
      if (!document.getElementById("cancelEditObj")) {
        const cancel = document.createElement("button");
        cancel.id = "cancelEditObj";
        cancel.className = "btn ghost";
        cancel.style.marginLeft = "6px";
        cancel.textContent = "Cancelar";
        btn.parentElement.appendChild(cancel);
        cancel.onclick = ()=>{ this.editingIndex=null; this.clearForm(); if(btn) btn.textContent="Agregar objeto"; cancel.remove(); };
      }
    },
    render(){
      const box=$("#objetosList");
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML = `<div class="table"><table><thead><tr>
        <th>#</th><th>Descripción</th><th>Vínculo</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((o,i)=>`<tr>
          <td>${i}</td><td>${o.descripcion}</td><td>${o.vinculo}</td>
          <td>
            <button class="btn ghost" data-edito="${i}">Editar</button>
            <button class="btn ghost" data-delo="${i}">Quitar</button>
          </td>
        </tr>`).join("")
      }</tbody></table></div>`;
      $$("#objetosList [data-delo]").forEach(b=> b.onclick = ()=>{
        this.store.splice(parseInt(b.dataset.delo,10),1); this.render();
      });
      $$("#objetosList [data-edito]").forEach(b=> b.onclick = ()=>{
        this.startEdit(parseInt(b.dataset.edito,10));
      });
      renderTagHelper();
    }
  };

  // ===== AUTONOMBRE desde Carátula + Fecha + (PU) =====
  let __lastAutoName = "";

  function autoCaseNameFromCaratula() {
    const car = (document.getElementById("g_car").value || "").trim();
    const d   = (document.getElementById("g_fecha_dia").value || "");
    let fechaFmt = "";
    if (d) { const [y,m,day] = d.split("-"); fechaFmt = `${day}-${m}-${y}`; }
    const tipo = document.getElementById("g_tipoExp").value || "PU";
    const num  = (document.getElementById("g_numExp").value || "").trim();
    const pu   = num ? `${tipo} ${num}` : "";
    const partes = [car || "Hecho", fechaFmt, pu ? `(${pu})` : ""].filter(Boolean);
    return partes.join(" – ");
  }
  function refreshAutoCaseName() {
    const inp = document.getElementById("caseName");
    if (!inp) return;
    if (!inp.value.trim() || inp.value.trim() === __lastAutoName) {
      const nuevo = autoCaseNameFromCaratula();
      inp.value = nuevo;
      __lastAutoName = nuevo;
    }
  }

  // ===== Build data from form =====
  function resolvedDependencia(){
    const val = $("#g_dep").value;
    if(val==="__manual__") return $("#g_dep_manual").value.trim();
    return val;
  }

  function buildDataFromForm(){
    const tipo = $("#g_tipoExp").value || "PU";
    const num  = ($("#g_numExp").value||"").trim();
    const puFull = num ? `${tipo} ${num}` : "";

    return {
      generales: {
        fecha_hora: formattedFecha(),
        pu: puFull,
        tipoExp: tipo,
        numExp: num,
        partido: $("#g_partido").value,
        localidad: $("#g_localidad").value,
        dependencia: resolvedDependencia(),
        caratula: $("#g_car").value.trim(),
        subtitulo: $("#g_sub").value.trim(),
        esclarecido: $("#g_ok").value==="si",
        ufi: $("#g_ufi").value.trim(),
        coordenadas: $("#g_coord").value.trim(),
        relevante: $("#g_relevante").checked,
        supervisado: $("#g_supervisado").checked
      },
      civiles: CIV.store.slice(),
      fuerzas: FZA.store.slice(),
      objetos: OBJ.store.slice(),
      cuerpo: $("#cuerpo").value
    };
  }

  // ===== Título compuesto =====
  function renderTitlePreview(){
    const tipo = $("#g_tipoExp").value || "PU";
    const num  = ($("#g_numExp").value||"").trim();
    const puFmt = num ? `${tipo} ${num}` : "";
    const dep  = resolvedDependencia();

    const parts = [ formattedFecha(), puFmt, dep, $("#g_car").value ].filter(Boolean);
    const t = parts.join(" – ");

    const sub = $("#g_sub").value; const ok = ($("#g_ok").value==="si");
    $("#tituloCompuesto").innerHTML = `<strong>${t.toUpperCase()}</strong>`;
    $("#subCompuesto").innerHTML = `<span class="badge ${ok?'blue':'red'}"><strong>${sub}</strong></span>`;
  }

  // ===== Preview / acciones =====
  function preview(){
    const data = buildDataFromForm();
    const out = HRFMT.buildAll(data);
    $("#previewHtml").innerHTML = out.html;
    return out;
  }

  // ===== Eventos =====
  ["g_fecha_dia","g_numExp","g_tipoExp","g_car","g_sub","g_ok","g_ufi","g_coord","g_relevante","g_supervisado","g_dep_manual"].forEach(id=>{
    const n=document.getElementById(id); 
    if(n) n.addEventListener("input", ()=>{ 
      renderTitlePreview(); 
      if (id==="g_car" || id==="g_fecha_dia" || id==="g_tipoExp" || id==="g_numExp") refreshAutoCaseName();
    });
    if(n && n.type==="checkbox") n.addEventListener("change", renderTitlePreview);
  });

  $("#g_partido").addEventListener("change", ()=>{ loadLocalidadesAndDeps(); renderTitlePreview(); });
  $("#g_localidad").addEventListener("change", renderTitlePreview);
  $("#g_dep").addEventListener("change", renderTitlePreview);

  // Botones
  bindClick("addCivil",  ()=> CIV.addOrUpdate());
  bindClick("addFuerza", ()=> FZA.addOrUpdate());
  bindClick("addObjeto", ()=> OBJ.addOrUpdate());

  bindClick("generar",   ()=>{ preview(); });
  document.addEventListener("keydown",(e)=>{ if(e.ctrlKey && e.key==="Enter"){ e.preventDefault(); preview(); } });

  bindClick("copiarWA", ()=>{ const out=preview(); navigator.clipboard.writeText(out.waLong).then(()=>alert("Copiado para WhatsApp")); });

  bindClick("descargarWord", async ()=>{
    try{ await HRFMT.downloadDocx(buildDataFromForm(), (window.docx||{})); }
    catch(e){ console.error(e); showErr(e.message||e); }
  });

  bindClick("exportCSV1", ()=>{ HRFMT.downloadCSV([buildDataFromForm()]); });

  // Borrar todo (form actual)
  bindClick("clearAll", ()=>{
    if(!confirm("¿Borrar todos los campos del formulario actual? Esto no borra los 'Hechos guardados'.")) return;

    $("#g_fecha_dia").value="";
    $("#g_tipoExp").value="PU";
    $("#g_numExp").value="";
    $("#g_partido").value="";
    loadLocalidadesAndDeps();
    $("#g_localidad").value="";
    $("#g_dep").value="";
    $("#g_dep_manual").value="";
    $("#g_dep_manual_wrap").style.display="none";
    $("#g_car").value="";
    $("#g_sub").value="";
    $("#g_ok").value="no";
    $("#g_ufi").value="";
    $("#g_coord").value="";
    $("#g_relevante").checked=false;
    $("#g_supervisado").checked=false;

    CIV.store=[]; FZA.store=[]; OBJ.store=[];
    CIV.clearForm(); FZA.clearForm(); OBJ.clearForm();
    CIV.render(); FZA.render(); OBJ.render();

    $("#cuerpo").value="";

    renderTitlePreview();
    renderTagHelper();
    refreshAutoCaseName();
  });

  // ===== CRUD de casos =====
  const selectedRadio = ()=> { const r = document.querySelector('input[name="caseSel"]:checked'); return r ? r.getAttribute("data-id") : null; };
  const selectedChecks = ()=> $$(".caseCheck:checked").map(x=>x.getAttribute("data-id"));

  bindClick("saveCase", ()=>{
    const nameInput = (document.getElementById("caseName").value || "").trim();
    const name = nameInput || autoCaseNameFromCaratula();

    const snap = buildDataFromForm(); 
    snap.id = freshId(); 
    snap.name = name;

    const cases = getCases(); cases.push(snap); setCases(cases); renderCases(); 
    __lastAutoName = name;
    alert("Guardado.");
  });

  bindClick("updateCase", ()=>{
    const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para actualizar."); return; }
    const cases = getCases(); const idx = cases.findIndex(c=>c.id===id); if(idx<0){ alert("No encontrado"); return; }

    const nameInput = (document.getElementById("caseName").value || "").trim();
    const name = nameInput || autoCaseNameFromCaratula();

    const snap = buildDataFromForm(); 
    snap.id = id; 
    snap.name = name;

    cases[idx] = snap; setCases(cases); renderCases(); 
    __lastAutoName = name;
    alert("Actualizado.");
  });

  bindClick("deleteCase", ()=>{
    const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para borrar."); return; }
    const cases = getCases().filter(c=>c.id!==id); setCases(cases); renderCases();
  });

  bindClick("loadSelected", ()=>{
    const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para cargar."); return; }
    const c = getCases().find(x=>x.id===id); if(!c){ alert("No encontrado"); return; }
    loadSnapshot(c); renderCases(); preview(); alert("Cargado.");
  });

  bindClick("exportCSV", ()=>{
    const ids = selectedChecks(); if(!ids.length){ alert("Seleccioná al menos un hecho (checkbox)."); return; }
    const list = getCases().filter(c=>ids.includes(c.id));
    HRFMT.downloadCSV(list);
  });

  bindClick("downloadWordMulti", async ()=>{
    const ids = selectedChecks(); if(!ids.length){ alert("Seleccioná al menos un hecho (checkbox)."); return; }
    const docx = window.docx||{}; const { Document, Packer, TextRun, Paragraph, AlignmentType } = docx;
    if(!Document){ showErr("docx no cargada"); return; }

    const JUST = AlignmentType.JUSTIFIED;
    const toRuns = (html)=>{
      const parts=(html||"").split(/(<\/?strong>|<\/?em>|<\/?u>)/g);
      let B=false,I=false,U=false; const runs=[];
      for(const part of parts){
        if(part==="<strong>"){B=true;continue;}
        if(part==="</strong>"){B=false;continue;}
        if(part==="<em>"){I=true;continue;}
        if(part==="</em>"){I=false;continue;}
        if(part==="<u>"){U=true;continue;}
        if(part==="</u>"){U=false;continue;}
        if(part){ runs.push(new TextRun({text:part,bold:B,italics:I,underline:U?{}:undefined})); }
      }
      return runs;
    };

    const selected = getCases().filter(c=>ids.includes(c.id));
    const children = [];
    selected.forEach((snap,i)=>{
      const built = HRFMT.buildAll(snap);
      children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.titulo, bold:true }) ] }));
      children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.subtitulo, bold:true, color: built.forDocx.color }) ] }));
      (built.forDocx.bodyHtml||"").split(/\n\n+/).forEach(p=>{
        children.push(new Paragraph({ children: toRuns(p), alignment: AlignmentType.JUSTIFIED, spacing:{after:200} }));
      });
      if(i !== selected.length-1) children.push(new Paragraph({ text:"" }));
    });

    const doc = new Document({
      styles:{ default:{ document:{ run:{ font:"Arial", size:24 }, paragraph:{ spacing:{ after:120 } } } } },
      sections:[{ children }]
    });

    const blob = await Packer.toBlob(doc);
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`Hechos_Relevantes_${new Date().toISOString().slice(0,10)}.docx`; a.click();
  });

  function loadSnapshot(s){
    const fh = s.generales?.fecha_hora || "";
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(fh);
    if(m){ $("#g_fecha_dia").value = `${m[3]}-${m[2]}-${m[1]}`; } else { $("#g_fecha_dia").value = ""; }

    $("#g_tipoExp").value = s.generales?.tipoExp || "PU";
    $("#g_numExp").value  = s.generales?.numExp || (s.generales?.pu||"").replace(/^.*?\s+/,'').trim();

    $("#g_partido").value = s.generales?.partido||"";
    loadLocalidadesAndDeps();
    $("#g_localidad").value = s.generales?.localidad||"";

    const cat = getCatalogs();
    const partido = $("#g_partido").value;
    const deps = (cat[partido]?.dependencias||[]);
    if (s.generales?.dependencia && !deps.includes(s.generales.dependencia)) {
      $("#g_dep").value="__manual__";
      $("#g_dep_manual").value = s.generales.dependencia;
      $("#g_dep_manual_wrap").style.display="block";
    } else {
      $("#g_dep").value = s.generales?.dependencia||"";
      $("#g_dep_manual").value="";
      $("#g_dep_manual_wrap").style.display = ($("#g_dep").value==="__manual__") ? "block" : "none";
    }

    $("#g_car").value   = s.generales?.caratula||"";
    $("#g_sub").value   = s.generales?.subtitulo||"";
    $("#g_ok").value    = s.generales?.esclarecido ? "si" : "no";
    $("#g_ufi").value   = s.generales?.ufi||"";
    $("#g_coord").value = s.generales?.coordenadas||"";
    $("#g_relevante").checked = !!s.generales?.relevante;
    $("#g_supervisado").checked = !!s.generales?.supervisado;

    CIV.store = (s.civiles||[]).slice(); CIV.render();
    FZA.store = (s.fuerzas||[]).slice(); FZA.render();
    OBJ.store = (s.objetos||[]).slice(); OBJ.render();
    $("#cuerpo").value  = s.cuerpo||"";

    // Actualizo nombre visible
    const nameBox = document.getElementById("caseName");
    if (nameBox) {
      nameBox.value = s.name || autoCaseNameFromCaratula();
      __lastAutoName = nameBox.value;
    }

    renderTitlePreview();
    renderTagHelper();
  }

  // ===== Backup / Restore / Merge JSON =====
  function exportBackupJSON() {
    const cases = getCases();
    const payload = { version: 1, exported_at: new Date().toISOString(), cases };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hechos_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }

  async function importBackupJSON(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const incoming = Array.isArray(data?.cases) ? data.cases : (Array.isArray(data) ? data : null);
      if (!incoming) { alert("No encontré 'cases' en el JSON."); return; }

      const replaceAll = confirm("¿Querés REEMPLAZAR todo lo guardado por el contenido del archivo?\nAceptar = Reemplazar todo\nCancelar = Fusionar (agrega sin duplicar)");
      if (replaceAll) {
        setCases(incoming);
        renderCases();
        alert(`Restauración completa: ${incoming.length} hechos.`);
        return;
      }

      const current = getCases();
      const existingIds = new Set(current.map(c => c.id));
      let added = 0, skipped = 0;

      incoming.forEach(item => {
        if (!item || typeof item !== "object") { skipped++; return; }
        if (!item.id) item.id = freshId();
        if (!item.name) item.name = "Hecho importado";
        if (existingIds.has(item.id)) { skipped++; }
        else { current.push(item); existingIds.add(item.id); added++; }
      });

      setCases(current);
      renderCases();
      alert(`Fusión completa: agregados ${added}, saltados ${skipped}.`);
    } catch (e) {
      console.error(e);
      alert("No se pudo leer el archivo JSON.");
    }
  }

  async function mergeBackupJSON(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const incoming = Array.isArray(data?.cases) ? data.cases : (Array.isArray(data) ? data : null);
      if (!incoming) { alert("No encontré 'cases' en el JSON."); return; }

      const current = getCases();
      const existingIds = new Set(current.map(c => c.id));
      let added = 0, skipped = 0;

      incoming.forEach(item => {
        if (!item || typeof item !== "object") { skipped++; return; }
        if (!item.id) item.id = freshId();
        if (!item.name) item.name = "Hecho importado";
        if (existingIds.has(item.id)) { skipped++; }
        else { current.push(item); existingIds.add(item.id); added++; }
      });

      setCases(current);
      renderCases();
      alert(`Fusionado: agregados ${added}, saltados ${skipped}.`);
    } catch (e) {
      console.error(e);
      alert("No se pudo leer el archivo JSON.");
    }
  }

  bindClick("backupJSON", ()=> exportBackupJSON());

  bindClick("restoreJSON", ()=>{
    const input = document.getElementById("restoreFile");
    if (!input) return;
    input.value = "";
    input.click();
  });
  const restoreInput = document.getElementById("restoreFile");
  if (restoreInput) {
    restoreInput.addEventListener("change", ()=>{
      if (restoreInput.files && restoreInput.files[0]) {
        importBackupJSON(restoreInput.files[0]);
      }
    });
  }

  bindClick("mergeJSON", ()=>{
    const input = document.getElementById("mergeFile");
    if (!input) return;
    input.value = "";
    input.click();
  });
  const mergeInput = document.getElementById("mergeFile");
  if (mergeInput) {
    mergeInput.addEventListener("change", ()=>{
      if (mergeInput.files && mergeInput.files[0]) {
        mergeBackupJSON(mergeInput.files[0]);
      }
    });
  }

  // ===== Catálogos UI =====
  function cat_loadIntoEditor(){
    const cat = getCatalogs();
    const partido = $("#cat_partidoSel").value;
    const locs = (cat[partido]?.localidades||[]).join("\n");
    const deps = (cat[partido]?.dependencias||[]).join("\n");
    $("#cat_localidades").value = locs;
    $("#cat_dependencias").value = deps;
  }
  bindClick("cat_guardar", ()=>{
    const partido = $("#cat_partidoSel").value;
    const cat = getCatalogs();
    cat[partido] = {
      localidades: $("#cat_localidades").value.split("\n").map(s=>s.trim()).filter(Boolean),
      dependencias: $("#cat_dependencias").value.split("\n").map(s=>s.trim()).filter(Boolean)
    };
    setCatalogs(cat);
    if($("#g_partido").value===partido){ loadLocalidadesAndDeps(); renderTitlePreview(); }
    alert("Catálogos guardados.");
  });
  bindClick("cat_reset", ()=>{
    setCatalogs(DEFAULT_CATALOGS);
    cat_loadIntoEditor();
    if($("#g_partido").value){ loadLocalidadesAndDeps(); renderTitlePreview(); }
    alert("Restaurados valores de ejemplo.");
  });
  $("#cat_partidoSel").addEventListener("change", cat_loadIntoEditor);

  // ===== Init =====
  renderCases();
  loadLocalidadesAndDeps();
  renderTitlePreview();
  renderTagHelper();
  cat_loadIntoEditor();
  refreshAutoCaseName();   // AUTONOMBRE inicial
})();
