body {
  font-family: Arial, sans-serif;
  background: #f7f9fc;
  margin: 0;
  padding: 0;
  color: #222;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #202a44;
  color: white;
  padding: 10px 20px;
}

header h1 {
  margin: 0;
}

header .logo {
  width: 60px;
  height: 60px;
}

main {
  padding: 20px;
}

.card {
  background: white;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

h2 {
  margin-top: 0;
  color: #202a44;
}

.tabs {
  display: flex;
  margin-bottom: 10px;
}

.tab-btn {
  padding: 8px 12px;
  border: none;
  cursor: pointer;
  background: #eee;
  margin-right: 5px;
  border-radius: 6px 6px 0 0;
}

.tab-btn.active {
  background: #202a44;
  color: white;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

textarea {
  width: 100%;
  min-height: 150px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-family: monospace;
}

.btn {
  background: #202a44;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 5px 0;
  cursor: pointer;
}

.btn:hover {
  background: #314372;
}

.btn.ghost {
  background: #eee;
  color: #333;
}

.btn.danger {
  background: #b33a3a;
  color: white;
}

#casesList table {
  width: 100%;
  border-collapse: collapse;
}

#casesList th, #casesList td {
  border: 1px solid #ccc;
  padding: 4px;
}

#tagHelper {
  margin-top: 10px;
}

#tagHelper .chip {
  display: inline-block;
  background: #202a44;
  color: white;
  padding: 4px 8px;
  margin: 2px;
  border-radius: 10px;
  cursor: pointer;
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
    if (!num) {
      return `${fechaFmt} - Info DDIC Mar del Plata - Adelanto ${resolvedDependencia()} - ${car}`;
    }
    const pu   = num ? `${tipo} ${num}` : "";
    return `${fechaFmt} - ${pu} - ${resolvedDependencia()} - ${car}`;
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
    const fechaFmt = formattedFecha();
    const car = val("g_car");

    let t;
    if (!num) {
      t = `${fechaFmt} - Info DDIC Mar del Plata - Adelanto ${dep} - ${car}`;
    } else {
      t = `${fechaFmt} - ${puFmt} - ${dep} - ${car}`;
    }

    const sub = val("g_sub");
    const ok = (val("g_ok")==="si");
    $ID("tituloCompuesto") && ($ID("tituloCompuesto").innerHTML = `<strong>${TitleCase(t)}</strong>`);
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
    window.WA_MERGE_SOFTBREAKS = !!$ID("wa_merge")?.checked;
    const out = preview(); 
    navigator.clipboard.writeText(out.waLong).then(()=>alert("Copiado para WhatsApp"));
  });

  bind("descargarWord", async ()=>{
    try{ await HRFMT.downloadDocx(buildDataFromForm(), (window.docx||{})); }
    catch(e){ console.error(e); showErr(e.message||e); }
  });

  bind("exportCSV1", ()=>{ HRFMT.downloadCSV([buildDataFromForm()]); });

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
    const ids = selectedChecks(); 
    if(!ids.length){ alert("Seleccioná al menos un hecho (checkbox)."); return; }
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

  // ===== Backup / Restore =====
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

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", ()=>{
    renderCases();
    loadLocalidadesAndDeps();
    renderTitlePreview();
    renderTagHelper();
    refreshAutoCaseName();
  });
})();

