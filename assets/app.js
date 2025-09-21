(function(){
  // --------- Helpers a prueba de null ---------
  const $ID = (id) => document.getElementById(id);
  const val  = (id) => ($ID(id)?.value ?? "");
  const setv = (id, v) => { if ($ID(id)) $ID(id).value = v; };
  const chk  = (id) => !!$ID(id)?.checked;
  const setchk = (id, v) => { if ($ID(id)) $ID(id).checked = !!v; };
  const styleShow = (id, show) => { if ($ID(id)) $ID(id).style.display = show ? "block" : "none"; };
  const $$ = (sel)=> Array.from(document.querySelectorAll(sel));
  const showErr = m => { const b=$ID("errorBox"); if(b){ b.textContent="Error: "+m; b.hidden=false; } };

  // ==== Fecha (solo dd-mm-aaaa) ====
  function formattedFecha(){
    const d = val("g_fecha_dia");
    if(!d) return "";
    const [y,m,day] = d.split("-");
    return `${day}-${m}-${y}`;
  }

  // ===== Catálogos =====
  const CASEKEY="hr_cases_v1";
  const CATKEY ="hr_catalogs_v1";

  const DEFAULT_CATALOGS = {
    "General Pueyrredon": {
      localidades: ["Mar del Plata","Batán","Sierra de los Padres","Chapadmalal","Estación Camet","El Boquerón"],
      dependencias: ["Comisaría 1ra MdP","Comisaría 2da MdP","Comisaría 3ra MdP","Comisaría 4ta MdP","Comisaría 5ta MdP","Comisaría 6ta MdP","Subcomisaría Camet","Subcomisaría Acantilados","DDI Mar del Plata","Comisaría de la Mujer MdP","UPPL MdP","CPO MdP"]
    },
    "Balcarce": {
      localidades: ["Balcarce","San Agustín","Los Pinos"],
      dependencias: ["Comisaría Balcarce","Comisaría de la Mujer Balcarce","DDI Balcarce","Destacamento San Agustín"]
    },
    "Mar Chiquita": {
      localidades: ["Coronel Vidal","Santa Clara del Mar","Vivoratá","Mar de Cobo","La Caleta","Mar Chiquita"],
      dependencias: ["Comisaría Coronel Vidal","Comisaría Santa Clara del Mar","Comisaría de la Mujer Mar Chiquita","Destacamento Mar de Cobo"]
    },
    "General Alvarado": {
      localidades: ["Miramar","Mechongué","Comandante N. Otamendi","Mar del Sud"],
      dependencias: ["Comisaría Miramar","Comisaría Otamendi","Comisaría de la Mujer Gral. Alvarado","Destacamento Mar del Sud"]
    }
  };
  const getCatalogs=()=>{ try{const raw=localStorage.getItem(CATKEY); if(!raw) return structuredClone(DEFAULT_CATALOGS); const parsed=JSON.parse(raw); const cat=structuredClone(DEFAULT_CATALOGS); Object.keys(parsed||{}).forEach(k=>cat[k]=parsed[k]); return cat;}catch{return structuredClone(DEFAULT_CATALOGS);} };
  const setCatalogs=(obj)=> localStorage.setItem(CATKEY, JSON.stringify(obj));

  // ===== Casos =====
  const getCases=()=>{ try{ return JSON.parse(localStorage.getItem(CASEKEY)||"[]"); }catch{ return []; } };
  const setCases=(a)=> localStorage.setItem(CASEKEY, JSON.stringify(a));
  const freshId=()=> "c_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);

  function renderCases(){
    const box=$ID("casesList"); if(!box) return;
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

  // ===== Buscador =====
  function attachCaseSearch() {
    const input = $ID("caseSearch");
    const box = $ID("casesList");
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
    if(!select) return;
    select.innerHTML = "";
    select.append(new Option("— Elegir —", ""));
    (list||[]).forEach(v=> select.append(new Option(v, v)));
    if(includeManual) select.append(new Option("Escribir manualmente…", "__manual__"));
  }
  function loadLocalidadesAndDeps(){
    const cat = getCatalogs();
    const partido = val("g_partido") || "";
    const locSel = $ID("g_localidad");
    const depSel = $ID("g_dep");
    if(!locSel || !depSel){ return; }
    if(!partido || !cat[partido]){
      fillSelectOptions(locSel, [], {});
      fillSelectOptions(depSel, [], {includeManual:true});
      styleShow("g_dep_manual_wrap", false);
      return;
    }
    fillSelectOptions(locSel, (cat[partido].localidades||[]), {});
    fillSelectOptions(depSel, (cat[partido].dependencias||[]), {includeManual:true});
    styleShow("g_dep_manual_wrap", (val("g_dep")==="__manual__"));
  }
  $ID("g_dep")?.addEventListener("change", ()=>{
    styleShow("g_dep_manual_wrap", (val("g_dep")==="__manual__"));
    renderTitlePreview();
  });

  // ===== Etiquetas =====
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
    const box = $ID("tagHelper");
    if(!box) return;
    const tags = availableTags();
    if(!tags.length){
      box.innerHTML = `<span class="muted">No hay etiquetas disponibles. Cargá personas/objetos para ver sugerencias.</span>`;
      return;
    }
    box.innerHTML = tags.map(t=>`<button type="button" class="chip" data-tag="${t}">${t}</button>`).join("");
    box.querySelectorAll("[data-tag]").forEach(btn=>{
      btn.onclick = ()=> insertAtCursor($ID("cuerpo"), btn.dataset.tag);
    });
  }

  // ===== Civiles (editar) =====
  const TitleCase = (s)=> (s||"").toLowerCase().split(/(\s|-)/).map(p=>{
    if(p.trim()===""||p==='-') return p; return p.charAt(0).toUpperCase()+p.slice(1);
  }).join("");

  const CIV = {
    store:[], editingIndex:null,
    addOrUpdate(){
      const p = {
        nombre: val("c_nombre"), apellido: val("c_apellido"), edad: val("c_edad"),
        genero: val("c_genero"), dni: val("c_dni"), pais: val("c_pais"),
        loc_domicilio: val("c_loc"), calle_domicilio: val("c_calle"),
        vinculo: val("c_vinculo"), obito: val("c_obito")==="true"
      };
      if (this.editingIndex === null) this.store.push(p);
      else { this.store[this.editingIndex]=p; this.editingIndex=null; const b=$ID("addCivil"); if(b) b.textContent="Agregar involucrado"; $ID("cancelEditCivil")?.remove(); }
      this.clearForm(); this.render();
    },
    clearForm(){ setv("c_nombre",""); setv("c_apellido",""); setv("c_edad",""); setv("c_genero",""); setv("c_dni",""); setv("c_pais",""); setv("c_loc",""); setv("c_calle",""); setv("c_vinculo","Victima"); setv("c_obito","false"); },
    startEdit(i){
      const p=this.store[i]; if(!p) return;
      setv("c_nombre",p.nombre||""); setv("c_apellido",p.apellido||""); setv("c_edad",p.edad||"");
      setv("c_genero",p.genero||""); setv("c_dni",p.dni||""); setv("c_pais",p.pais||"");
      setv("c_loc",p.loc_domicilio||""); setv("c_calle",p.calle_domicilio||""); setv("c_vinculo",p.vinculo||"Victima"); setv("c_obito",p.obito?"true":"false");
      this.editingIndex=i; const btn=$ID("addCivil"); if(btn) btn.textContent="Guardar cambios";
      if(!$ID("cancelEditCivil")){ const c=document.createElement("button"); c.id="cancelEditCivil"; c.className="btn ghost"; c.style.marginLeft="6px"; c.textContent="Cancelar"; btn.parentElement.appendChild(c); c.onclick=()=>{ this.editingIndex=null; this.clearForm(); if(btn) btn.textContent="Agregar involucrado"; c.remove(); }; }
    },
    render(){
      const box=$ID("civilesList");
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
      $$("#civilesList [data-delc]").forEach(b=> b.onclick = ()=>{ this.store.splice(parseInt(b.dataset.delc,10),1); this.render(); });
      $$("#civilesList [data-editc]").forEach(b=> b.onclick = ()=>{ this.startEdit(parseInt(b.dataset.editc,10)); });
      renderTagHelper();
    }
  };

  // ===== Fuerzas (editar) =====
  const FZA = {
    store:[], editingIndex:null,
    addOrUpdate(){
      const p = {
        nombre: val("f_nombre"), apellido: val("f_apellido"), edad: val("f_edad"),
        fuerza: val("f_fuerza"), jerarquia: val("f_jerarquia"), legajo: val("f_legajo"),
        destino: val("f_destino"), loc_domicilio: val("f_loc"), calle_domicilio: val("f_calle"),
        vinculo: val("f_vinculo"), obito: val("f_obito")==="true"
      };
      if (this.editingIndex === null) this.store.push(p);
      else { this.store[this.editingIndex]=p; this.editingIndex=null; const b=$ID("addFuerza"); if(b) b.textContent="Agregar personal"; $ID("cancelEditFza")?.remove(); }
      this.clearForm(); this.render();
    },
    clearForm(){ setv("f_nombre",""); setv("f_apellido",""); setv("f_edad",""); setv("f_fuerza",""); setv("f_jerarquia",""); setv("f_legajo",""); setv("f_destino",""); setv("f_loc",""); setv("f_calle",""); setv("f_vinculo","Imputado"); setv("f_obito","false"); },
    startEdit(i){
      const p=this.store[i]; if(!p) return;
      setv("f_nombre",p.nombre||""); setv("f_apellido",p.apellido||""); setv("f_edad",p.edad||""); setv("f_fuerza",p.fuerza||""); setv("f_jerarquia",p.jerarquia||""); setv("f_legajo",p.legajo||""); setv("f_destino",p.destino||""); setv("f_loc",p.loc_domicilio||""); setv("f_calle",p.calle_domicilio||""); setv("f_vinculo",p.vinculo||"Imputado"); setv("f_obito",p.obito?"true":"false");
      this.editingIndex=i; const btn=$ID("addFuerza"); if(btn) btn.textContent="Guardar cambios";
      if(!$ID("cancelEditFza")){ const c=document.createElement("button"); c.id="cancelEditFza"; c.className="btn ghost"; c.style.marginLeft="6px"; c.textContent="Cancelar"; btn.parentElement.appendChild(c); c.onclick=()=>{ this.editingIndex=null; this.clearForm(); if(btn) btn.textContent="Agregar personal"; c.remove(); }; }
    },
    render(){
      const box=$ID("fuerzasList");
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
      $$("#fuerzasList [data-delf]").forEach(b=> b.onclick = ()=>{ this.store.splice(parseInt(b.dataset.delf,10),1); this.render(); });
      $$("#fuerzasList [data-editf]").forEach(b=> b.onclick = ()=>{ this.startEdit(parseInt(b.dataset.editf,10)); });
      renderTagHelper();
    }
  };

  // ===== Objetos (editar) =====
  const OBJ = {
    store:[], editingIndex:null,
    addOrUpdate(){
      const o = { descripcion: val("o_desc"), vinculo: val("o_vinc") };
      if(!o.descripcion.trim()) return;
      if (this.editingIndex === null) this.store.push(o);
      else { this.store[this.editingIndex]=o; this.editingIndex=null; const b=$ID("addObjeto"); if(b) b.textContent="Agregar objeto"; $ID("cancelEditObj")?.remove(); }
      this.clearForm(); this.render();
    },
    clearForm(){ setv("o_desc",""); setv("o_vinc","Secuestro"); },
    startEdit(i){
      const o=this.store[i]; if(!o) return;
      setv("o_desc",o.descripcion||""); setv("o_vinc",o.vinculo||"Secuestro");
      this.editingIndex=i; const btn=$ID("addObjeto"); if(btn) btn.textContent="Guardar cambios";
      if(!$ID("cancelEditObj")){ const c=document.createElement("button"); c.id="cancelEditObj"; c.className="btn ghost"; c.style.marginLeft="6px"; c.textContent="Cancelar"; btn.parentElement.appendChild(c); c.onclick=()=>{ this.editingIndex=null; this.clearForm(); if(btn) btn.textContent="Agregar objeto"; c.remove(); }; }
    },
    render(){
      const box=$ID("objetosList");
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
      $$("#objetosList [data-delo]").forEach(b=> b.onclick = ()=>{ this.store.splice(parseInt(b.dataset.delo,10),1); this.render(); });
      $$("#objetosList [data-edito]").forEach(b=> b.onclick = ()=>{ this.startEdit(parseInt(b.dataset.edito,10)); });
      renderTagHelper();
    }
  };

  // ===== AUTONOMBRE =====
  let __lastAutoName = "";
  function autoCaseNameFromCaratula() {
    const car = val("g_car").trim();
    const d   = val("g_fecha_dia");
    let fechaFmt = "";
    if (d) { const [y,m,day] = d.split("-"); fechaFmt = `${day}-${m}-${y}`; }
    const tipo = val("g_tipoExp") || "PU";
    const num  = val("g_numExp").trim();
    const pu   = num ? `${tipo} ${num}` : "";
    const partes = [car || "Hecho", fechaFmt, pu ? `(${pu})` : ""].filter(Boolean);
    return partes.join(" – ");
  }
  function refreshAutoCaseName() {
    const inp = $ID("caseName");
    if (!inp) return;
    if (!inp.value.trim() || inp.value.trim() === __lastAutoName) {
      const nuevo = autoCaseNameFromCaratula();
      inp.value = nuevo;
      __lastAutoName = nuevo;
    }
  }

  // ===== Build data =====
  function resolvedDependencia(){
    const v = val("g_dep");
    if(v==="__manual__") return val("g_dep_manual").trim();
    return v;
  }
  function buildDataFromForm(){
    const tipo = val("g_tipoExp") || "PU";
    const num  = val("g_numExp").trim();
    const puFull = num ? `${tipo} ${num}` : "";

    return {
      generales: {
        fecha_hora: formattedFecha(),
        pu: puFull,
        tipoExp: tipo,
        numExp: num,
        partido: val("g_partido"),
        localidad: val("g_localidad"),
        dependencia: resolvedDependencia(),
        caratula: val("g_car").trim(),
        subtitulo: val("g_sub").trim(),
        esclarecido: val("g_ok")==="si",
        ufi: val("g_ufi").trim(),
        coordenadas: val("g_coord").trim(),
        relevante: chk("g_relevante"),
        supervisado: chk("g_supervisado")
      },
      civiles: CIV.store.slice(),
      fuerzas: FZA.store.slice(),
      objetos: OBJ.store.slice(),
      cuerpo: val("cuerpo")
    };
  }

  // ===== Título compuesto =====
  function renderTitlePreview(){
    const tipo = val("g_tipoExp") || "PU";
    const num  = val("g_numExp").trim();
    const puFmt = num ? `${tipo} ${num}` : "";
    const dep  = resolvedDependencia();

    const parts = [ formattedFecha(), puFmt, dep, val("g_car") ].filter(Boolean);
    const t = parts.join(" – ");

    const sub = val("g_sub"); const ok = (val("g_ok")==="si");
    $ID("tituloCompuesto") && ($ID("tituloCompuesto").innerHTML = `<strong>${t.toUpperCase()}</strong>`);
    $ID("subCompuesto")    && ($ID("subCompuesto").innerHTML    = `<span class="badge ${ok?'blue':'red'}"><strong>${sub}</strong></span>`);
  }

  // ===== Preview / acciones =====
  function preview(){
    const data = buildDataFromForm();
    const out = HRFMT.buildAll(data);
    $ID("previewHtml") && ($ID("previewHtml").innerHTML = out.html);
    return out;
  }

  // ===== Eventos =====
  ["g_fecha_dia","g_numExp","g_tipoExp","g_car","g_sub","g_ok","g_ufi","g_coord","g_relevante","g_supervisado","g_dep_manual"].forEach(id=>{
    const n = $ID(id);
    if(!n) return;
    n.addEventListener("input", ()=>{ 
      renderTitlePreview(); 
      if (id==="g_car" || id==="g_fecha_dia" || id==="g_tipoExp" || id==="g_numExp") refreshAutoCaseName();
    });
    if(n.type==="checkbox") n.addEventListener("change", renderTitlePreview);
  });
  $ID("g_partido")?.addEventListener("change", ()=>{ loadLocalidadesAndDeps(); renderTitlePreview(); });
  $ID("g_localidad")?.addEventListener("change", renderTitlePreview);
  $ID("g_dep")?.addEventListener("change", renderTitlePreview);

  const bind = (id,fn)=>{ const n=$ID(id); if(n) n.onclick=fn; };

  bind("addCivil",  ()=> CIV.addOrUpdate());
  bind("addFuerza", ()=> FZA.addOrUpdate());
  bind("addObjeto", ()=> OBJ.addOrUpdate());

  bind("generar",   ()=>{ preview(); });
  document.addEventListener("keydown",(e)=>{ if(e.ctrlKey && e.key==="Enter"){ e.preventDefault(); preview(); } });

  bind("copiarWA", ()=>{
  // leer el toggle antes de construir el texto
  window.WA_MERGE_SOFTBREAKS = !!$ID("wa_merge")?.checked;
  const out = preview(); 
  navigator.clipboard.writeText(out.waLong).then(()=>alert("Copiado para WhatsApp"));
});

  bind("descargarWord", async ()=>{
    try{ await HRFMT.downloadDocx(buildDataFromForm(), (window.docx||{})); }
    catch(e){ console.error(e); showErr(e.message||e); }
  });

  bind("exportCSV1", ()=>{ HRFMT.downloadCSV([buildDataFromForm()]); });

  bind("clearAll", ()=>{
    if(!confirm("¿Borrar todos los campos del formulario actual? Esto no borra los 'Hechos guardados'.")) return;

    setv("g_fecha_dia",""); setv("g_tipoExp","PU"); setv("g_numExp","");
    setv("g_partido",""); loadLocalidadesAndDeps(); setv("g_localidad","");
    setv("g_dep",""); setv("g_dep_manual",""); styleShow("g_dep_manual_wrap",false);
    setv("g_car",""); setv("g_sub",""); setv("g_ok","no"); setv("g_ufi",""); setv("g_coord","");
    setchk("g_relevante",false); setchk("g_supervisado",false);

    CIV.store=[]; FZA.store=[]; OBJ.store=[];
    CIV.clearForm(); FZA.clearForm(); OBJ.clearForm();
    CIV.render(); FZA.render(); OBJ.render();

    setv("cuerpo","");

    renderTitlePreview();
    renderTagHelper();
    refreshAutoCaseName();
  });

  // ===== CRUD de casos =====
  const selectedRadio = ()=> { const r = document.querySelector('input[name="caseSel"]:checked'); return r ? r.getAttribute("data-id") : null; };
  const selectedChecks = ()=> $$(".caseCheck:checked").map(x=>x.getAttribute("data-id"));

  bind("saveCase", ()=>{
    const nameInput = (val("caseName") || "").trim();
    const name = nameInput || autoCaseNameFromCaratula();

    const snap = buildDataFromForm(); 
    snap.id = freshId(); 
    snap.name = name;

    const cases = getCases(); cases.push(snap); setCases(cases); renderCases(); 
    __lastAutoName = name;
    alert("Guardado.");
  });

  bind("updateCase", ()=>{
    const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para actualizar."); return; }
    const cases = getCases(); const idx = cases.findIndex(c=>c.id===id); if(idx<0){ alert("No encontrado"); return; }

    const nameInput = (val("caseName") || "").trim();
    const name = nameInput || autoCaseNameFromCaratula();

    const snap = buildDataFromForm(); 
    snap.id = id; 
    snap.name = name;

    cases[idx] = snap; setCases(cases); renderCases(); 
    __lastAutoName = name;
    alert("Actualizado.");
  });

  bind("deleteCase", ()=>{
    const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para borrar."); return; }
    const cases = getCases().filter(c=>c.id!==id); setCases(cases); renderCases();
  });

  bind("loadSelected", ()=>{
    const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para cargar."); return; }
    const c = getCases().find(x=>x.id===id); if(!c){ alert("No encontrado"); return; }
    loadSnapshot(c); renderCases(); preview(); alert("Cargado.");
  });

  bind("exportCSV", ()=>{
    const ids = selectedChecks(); if(!ids.length){ alert("Seleccioná al menos un hecho (checkbox)."); return; }
    const list = getCases().filter(c=>ids.includes(c.id));
    HRFMT.downloadCSV(list);
  });

  bind("downloadWordMulti", async ()=>{
    const ids = selectedChecks(); if(!ids.length){ alert("Seleccioná al menos un hecho (checkbox)."); return; }
    const docx = window.docx||{}; const { Document, Packer, TextRun, Paragraph, AlignmentType } = docx;
    if(!Document){ showErr("docx no cargada"); return; }

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

    const JUST = AlignmentType.JUSTIFIED;
    const selected = getCases().filter(c=>ids.includes(c.id));
    const children = [];
    selected.forEach((snap,i)=>{
      const built = HRFMT.buildAll(snap);
      children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.titulo, bold:true }) ] }));
      children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.subtitulo, bold:true, color: built.forDocx.color }) ] }));
      (built.forDocx.bodyHtml||"").split(/\n\n+/).forEach(p=>{
        children.push(new Paragraph({ children: toRuns(p), alignment: JUST, spacing:{after:200} }));
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
    if(m){ setv("g_fecha_dia",`${m[3]}-${m[2]}-${m[1]}`); } else { setv("g_fecha_dia",""); }

    setv("g_tipoExp", s.generales?.tipoExp || "PU");
    setv("g_numExp",  s.generales?.numExp || (s.generales?.pu||"").replace(/^.*?\s+/,'').trim());

    setv("g_partido", s.generales?.partido||"");
    loadLocalidadesAndDeps();
    setv("g_localidad", s.generales?.localidad||"");

    const cat = getCatalogs();
    const partido = val("g_partido");
    const deps = (cat[partido]?.dependencias||[]);
    if (s.generales?.dependencia && !deps.includes(s.generales.dependencia)) {
      setv("g_dep", "__manual__");
      setv("g_dep_manual", s.generales.dependencia || "");
      styleShow("g_dep_manual_wrap", true);
    } else {
      setv("g_dep", s.generales?.dependencia || "");
      setv("g_dep_manual", "");
      styleShow("g_dep_manual_wrap", (val("g_dep")==="__manual__"));
    }

    setv("g_car", s.generales?.caratula||"");
    setv("g_sub", s.generales?.subtitulo||"");
    setv("g_ok",  s.generales?.esclarecido ? "si" : "no");
    setv("g_ufi", s.generales?.ufi||"");
    setv("g_coord", s.generales?.coordenadas||"");
    setchk("g_relevante", !!s.generales?.relevante);
    setchk("g_supervisado", !!s.generales?.supervisado);

    CIV.store = (s.civiles||[]).slice(); CIV.render();
    FZA.store = (s.fuerzas||[]).slice(); FZA.render();
    OBJ.store = (s.objetos||[]).slice(); OBJ.render();
    setv("cuerpo", s.cuerpo||"");

    const nameBox = $ID("caseName");
    if (nameBox) { nameBox.value = s.name || autoCaseNameFromCaratula(); __lastAutoName = nameBox.value; }

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
  async function importBackupJSON(file, replace=false) {
    try{
      const text = await file.text();
      const data = JSON.parse(text);
      const incoming = Array.isArray(data?.cases) ? data.cases : (Array.isArray(data) ? data : null);
      if(!incoming){ alert("No encontré 'cases' en el JSON."); return; }

      if(replace){
        setCases(incoming); renderCases(); alert(`Restauración completa: ${incoming.length} hechos.`); return;
      }
      const current = getCases();
      const ids = new Set(current.map(c=>c.id));
      let added=0, skipped=0;
      incoming.forEach(it=>{
        if(!it || typeof it!=="object"){ skipped++; return; }
        if(!it.id) it.id=freshId();
        if(!it.name) it.name="Hecho importado";
        if(ids.has(it.id)) skipped++; else { current.push(it); ids.add(it.id); added++; }
      });
      setCases(current); renderCases();
      alert(`Fusión completa: agregados ${added}, saltados ${skipped}.`);
    }catch(e){ console.error(e); alert("No se pudo leer el archivo JSON."); }
  }
  bind("backupJSON", ()=> exportBackupJSON());
  bind("restoreJSON", ()=>{
    const input=$ID("restoreFile"); if(!input) return; input.value=""; input.click();
    input.onchange=()=>{ if(input.files?.[0]) importBackupJSON(input.files[0], confirm("¿Reemplazar todo lo guardado por el archivo?\nAceptar = Reemplazar • Cancelar = Fusionar")); };
  });
  bind("mergeJSON", ()=>{
    const input=$ID("mergeFile"); if(!input) return; input.value=""; input.click();
    input.onchange=()=>{ if(input.files?.[0]) importBackupJSON(input.files[0], false); };
  });

  // ===== Catálogos UI =====
  function cat_loadIntoEditor(){
    const cat = getCatalogs();
    const partido = val("cat_partidoSel") || "General Pueyrredon";
    const locs = (cat[partido]?.localidades||[]).join("\n");
    const deps = (cat[partido]?.dependencias||[]).join("\n");
    setv("cat_localidades", locs);
    setv("cat_dependencias", deps);
  }
  const cat_guardar=()=>{ const partido=val("cat_partidoSel")||"General Pueyrredon"; const cat=getCatalogs();
    cat[partido]={ localidades: val("cat_localidades").split("\n").map(s=>s.trim()).filter(Boolean),
                   dependencias: val("cat_dependencias").split("\n").map(s=>s.trim()).filter(Boolean) };
    setCatalogs(cat); if(val("g_partido")===partido){ loadLocalidadesAndDeps(); renderTitlePreview(); } alert("Catálogos guardados."); };
  const cat_reset=()=>{ setCatalogs(DEFAULT_CATALOGS); cat_loadIntoEditor(); if(val("g_partido")){ loadLocalidadesAndDeps(); renderTitlePreview(); } alert("Restaurados valores de ejemplo."); };
  $ID("cat_partidoSel")?.addEventListener("change", cat_loadIntoEditor);
  $ID("cat_guardar")?.addEventListener("click", cat_guardar);
  $ID("cat_reset")?.addEventListener("click", cat_reset);

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", ()=>{
    renderCases();
    loadLocalidadesAndDeps();
    renderTitlePreview();
    renderTagHelper();
    cat_loadIntoEditor();
    refreshAutoCaseName();
  });
    // ===== Avisar Hecho =====
  bind("avisarHecho", ()=>{
    const id = selectedRadio(); 
    if(!id){ alert("Elegí un hecho (radio) para avisar."); return; }
    const c = getCases().find(x=>x.id===id);
    if(!c){ alert("No encontrado"); return; }

    const built = HRFMT.buildAll(c);
    const texto = built.waLong || built.html || "Hecho importante.";
    navigator.clipboard.writeText(texto).then(()=>{
      alert("Hecho copiado al portapapeles. Ahora podés pegarlo en WhatsApp 📲");
    });
  });
  // ===== Descargar Word Multi =====
  bind("downloadWordMulti", async ()=>{
    const ids = selectedChecks(); 
    if(!ids.length){ alert("Seleccioná al menos un hecho (checkbox)."); return; }
    const docx = window.docx||{}; 
    const { Document, Packer, TextRun, Paragraph, AlignmentType } = docx;
    if(!Document){ showErr("docx no cargada"); return; }

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
    const JUST = AlignmentType.JUSTIFIED;
    const selected = getCases().filter(c=>ids.includes(c.id));
    const children = [];
    selected.forEach((snap,i)=>{
      const built = HRFMT.buildAll(snap);
      children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.titulo, bold:true }) ] }));
      children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.subtitulo, bold:true, color: built.forDocx.color }) ] }));
      (built.forDocx.bodyHtml||"").split(/\n\n+/).forEach(p=>{
        children.push(new Paragraph({ children: toRuns(p), alignment: JUST, spacing:{after:200} }));
      });
      if(i !== selected.length-1) children.push(new Paragraph({ text:"" }));
    });
    const doc = new Document({
      styles:{ default:{ document:{ run:{ font:"Arial", size:24 }, paragraph:{ spacing:{ after:120 } } } } },
      sections:[{ children }]
    });
    const blob = await Packer.toBlob(doc);
    const a=document.createElement('a'); 
    a.href=URL.createObjectURL(blob);
    a.download=`Hechos_Seleccionados_${new Date().toISOString().slice(0,10)}.docx`; 
    a.click();
  });
})();

