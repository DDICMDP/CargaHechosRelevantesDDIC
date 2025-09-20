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
      // merge suave por si agregamos nuevos partidos en updates
      const cat = structuredClone(DEFAULT_CATALOGS);
      for(const k of Object.keys(parsed||{})){
        cat[k] = parsed[k];
      }
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
  }

  // ===== Desplegables dependientes =====
  function loadLocalidadesAndDeps(){
    const cat = getCatalogs();
    const partido = $("#g_partido").value || "";
    const locSel = $("#g_localidad");
    const depSel = $("#g_dep");
    locSel.innerHTML = "";
    depSel.innerHTML = "";

    if(!partido || !cat[partido]){
      locSel.append(new Option("—", ""));
      depSel.append(new Option("—", ""));
      return;
    }
    const locs = (cat[partido].localidades||[]);
    const deps = (cat[partido].dependencias||[]);
    if(locs.length===0) locSel.append(new Option("—", ""));
    else locs.forEach(l => locSel.append(new Option(l, l)));
    if(deps.length===0) depSel.append(new Option("—", ""));
    else deps.forEach(d => depSel.append(new Option(d, d)));
  }

  // ===== Etiquetas dinámicas =====
  const ROLE_KEYS = ["victima","imputado","denunciante","testigo","pp","aprehendido","detenido","menor","nn","damnificado institucional"];
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

  // ===== Stores de formulario =====
  const CIV = { store:[], add(){
      const p = {
        nombre: $("#c_nombre").value, apellido: $("#c_apellido").value, edad: $("#c_edad").value,
        genero: $("#c_genero").value, dni: $("#c_dni").value, pais: $("#c_pais").value,
        loc_domicilio: $("#c_loc").value, calle_domicilio: $("#c_calle").value,
        vinculo: $("#c_vinculo").value, obito: $("#c_obito").value==="true"
      };
      this.store.push(p); this.render();
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
          <td><button class="btn ghost" data-delc="${i}">Quitar</button></td>
        </tr>`).join("")
      }</tbody></table></div>`;
      $$("#civilesList [data-delc]").forEach(b=> b.onclick = ()=>{ this.store.splice(parseInt(b.dataset.delc,10),1); this.render(); });
      renderTagHelper();
    }
  };

  const FZA = { store:[], add(){
      const p = {
        nombre: $("#f_nombre").value, apellido: $("#f_apellido").value, edad: $("#f_edad").value,
        fuerza: $("#f_fuerza").value, jerarquia: $("#f_jerarquia").value, legajo: $("#f_legajo").value,
        destino: $("#f_destino").value, loc_domicilio: $("#f_loc").value, calle_domicilio: $("#f_calle").value,
        vinculo: $("#f_vinculo").value, obito: $("#f_obito").value==="true"
      };
      this.store.push(p); this.render();
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
          <td><button class="btn ghost" data-delf="${i}">Quitar</button></td>
        </tr>`).join("")
      }</tbody></table></div>`;
      $$("#fuerzasList [data-delf]").forEach(b=> b.onclick = ()=>{ this.store.splice(parseInt(b.dataset.delf,10),1); this.render(); });
      renderTagHelper();
    }
  };

  const OBJ = { store:[], add(){
      const o = { descripcion: $("#o_desc").value, vinculo: $("#o_vinc").value };
      if(!o.descripcion.trim()) return;
      this.store.push(o); this.render();
    },
    render(){
      const box=$("#objetosList");
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML = `<div class="table"><table><thead><tr>
        <th>#</th><th>Descripción</th><th>Vínculo</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((o,i)=>`<tr>
          <td>${i}</td><td>${o.descripcion}</td><td>${o.vinculo}</td>
          <td><button class="btn ghost" data-delo="${i}">Quitar</button></td>
        </tr>`).join("")
      }</tbody></table></div>`;
      $$("#objetosList [data-delo]").forEach(b=> b.onclick = ()=>{ this.store.splice(parseInt(b.dataset.delo,10),1); this.render(); });
      renderTagHelper();
    }
  };

  // ===== Build data from form =====
  function buildDataFromForm(){
    const tipo = $("#g_tipoExp").value || "PU";
    const num  = ($("#g_numExp").value||"").trim();
    const puFull = num ? `${tipo} ${num}` : "";

    return {
      generales: {
        fecha_hora: $("#g_fecha").value.trim(),
        pu: puFull,                 // se mantiene 'pu' para compatibilidad con formatter
        tipoExp: tipo,
        numExp: num,
        partido: $("#g_partido").value,
        localidad: $("#g_localidad").value,
        dependencia: $("#g_dep").value,
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
    const parts = [
      $("#g_fecha").value,
      puFmt,
      $("#g_dep").value,
      $("#g_car").value
    ].filter(Boolean);
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

  // ===== Eventos de inputs que actualizan título / combos dependientes =====
  ["g_fecha","g_numExp","g_tipoExp","g_dep","g_car","g_sub","g_ok","g_ufi","g_coord","g_relevante","g_supervisado"].forEach(id=>{
    const n=document.getElementById(id); if(n) n.addEventListener("input", renderTitlePreview);
    if(n && n.type==="checkbox") n.addEventListener("change", renderTitlePreview);
  });

  $("#g_partido").addEventListener("change", ()=>{ loadLocalidadesAndDeps(); renderTitlePreview(); });
  $("#g_localidad").addEventListener("change", renderTitlePreview);

  // ===== Botones base =====
  bindClick("addCivil",  ()=> CIV.add());
  bindClick("addFuerza", ()=> FZA.add());
  bindClick("addObjeto", ()=> OBJ.add());

  bindClick("generar",   ()=>{ preview(); });
  document.addEventListener("keydown",(e)=>{ if(e.ctrlKey && e.key==="Enter"){ e.preventDefault(); preview(); } });

  bindClick("copiarWA", ()=>{ const out=preview(); navigator.clipboard.writeText(out.waLong).then(()=>alert("Copiado para WhatsApp")); });

  bindClick("descargarWord", async ()=>{
    try{ await HRFMT.downloadDocx(buildDataFromForm(), (window.docx||{})); }
    catch(e){ console.error(e); showErr(e.message||e); }
  });

  bindClick("exportCSV1", ()=>{ HRFMT.downloadCSV([buildDataFromForm()]); });

  // ===== CRUD de casos =====
  const selectedRadio = ()=> { const r = document.querySelector('input[name="caseSel"]:checked'); return r ? r.getAttribute("data-id") : null; };
  const selectedChecks = ()=> $$(".caseCheck:checked").map(x=>x.getAttribute("data-id"));

  bindClick("saveCase", ()=>{
    const name = ($("#caseName").value||"").trim() || "Hecho sin nombre";
    const snap = buildDataFromForm(); snap.id = freshId(); snap.name=name;
    const cases = getCases(); cases.push(snap); setCases(cases); renderCases(); alert("Guardado.");
  });

  bindClick("updateCase", ()=>{
    const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para actualizar."); return; }
    const cases = getCases(); const idx = cases.findIndex(c=>c.id===id); if(idx<0){ alert("No encontrado"); return; }
    const snap = buildDataFromForm(); snap.id = id; snap.name = cases[idx].name;
    cases[idx] = snap; setCases(cases); renderCases(); alert("Actualizado.");
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
    $("#g_fecha").value = s.generales?.fecha_hora||"";
    // tipo + número
    $("#g_tipoExp").value = s.generales?.tipoExp || "PU";
    $("#g_numExp").value  = s.generales?.numExp || (s.generales?.pu||"").replace(/^.*?\s+/,'').trim();

    // partido/loc/dep
    $("#g_partido").value = s.generales?.partido||"";
    loadLocalidadesAndDeps();
    $("#g_localidad").value = s.generales?.localidad||"";
    $("#g_dep").value = s.generales?.dependencia||"";

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
  // inicializar catálogo editor
  cat_loadIntoEditor();
})();
