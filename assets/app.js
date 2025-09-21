(function () {
  // ---------- Helpers seguros ----------
  const ALT_IDS = {
    g_partido: ["g_partido"],
    g_localidad: ["g_localidad", "g_localidades"],
    g_dep: ["g_dep", "g_dependencia"],
    g_dep_manual: ["g_dep_manual", "g_dep_manu"],
    caseSearch: ["caseSearch"],
    casesList: ["casesList"],
    cuerpo: ["cuerpo"],
    tagHelper: ["tagHelper"],
    caseName: ["caseName"],
    restoreFile: ["restoreFile"],
    mergeFile: ["mergeFile"],
    // Catálogos
    cat_partidoSel: ["cat_partidoSel"],
    cat_localidades: ["cat_localidades"],
    cat_dependencias: ["cat_dependencias"],
    cat_partidoNuevo: ["cat_partidoNuevo"],
  };
  const getNode = (id) => {
    const ids = ALT_IDS[id] || [id];
    for (const k of ids) {
      const n = document.getElementById(k);
      if (n) return n;
    }
    return null;
  };
  const $ID = getNode;
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const val = (id) => ($ID(id)?.value ?? "");
  const setv = (id, v) => { const n=$ID(id); if(n) n.value=v; };
  const chk = (id) => !!$ID(id)?.checked;
  const setchk = (id, v) => { const n=$ID(id); if(n) n.checked=!!v; };
  const styleShow = (id, show) => { const n=$ID(id); if(n) n.style.display = show ? "block" : "none"; };
  const safeJSON = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };
  const showErr = (m)=>{ const b=document.getElementById("errorBox"); if(b){ b.hidden=false; b.textContent="Error: "+m; } };

  // ---------- Storage keys ----------
  const CASEKEY = "hr_cases_v9";
  const CATKEY  = "hr_catalogs_v9";

  // ---------- Fecha dd-mm-aaaa ----------
  const fechaFmt = () => {
    const d = val("g_fecha_dia");
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}-${m}-${y}`;
  };

  // ---------- Catálogos por defecto ----------
  const DEFAULT_CATALOGS = {
    "General Pueyrredon": {
      localidades: ["Mar del Plata","Batán","Sierra de los Padres","Chapadmalal","Estación Camet","El Boquerón"],
      dependencias: [
        "Cria. Mar Del Plata 1ra.","Cria. Mar Del Plata 2da.","Cria. Mar Del Plata 3ra.",
        "Cria. Mar Del Plata 4ta.","Cria. Mar Del Plata 5ta.","Cria. Mar Del Plata 6ta.",
        "Subcria. Camet","Subcria. Acantilados","DDI Mar del Plata",
        "Comisaría de la Mujer MdP","UPPL MdP","CPO MdP"
      ]
    },
    "Balcarce": {
      localidades: ["Balcarce","San Agustín","Los Pinos"],
      dependencias: ["Cria. Balcarce","DDI Balcarce","Cria. de la Mujer Balcarce","Destac. San Agustín"]
    },
    "Mar Chiquita": {
      localidades: ["Coronel Vidal","Santa Clara del Mar","Vivoratá","Mar de Cobo","La Caleta","Mar Chiquita"],
      dependencias: ["Cria. Cnel. Vidal","Cria. Sta. Clara del Mar","Cria. de la Mujer Mar Chiquita","Destac. Mar de Cobo"]
    },
    "General Alvarado": {
      localidades: ["Miramar","Mechongué","Comandante N. Otamendi","Mar del Sud"],
      dependencias: ["Cria. Miramar","Cria. Otamendi","Cria. de la Mujer Gral. Alvarado","Destac. Mar del Sud"]
    }
  };

  // ---------- Catalogs load/save + migración ----------
  const getCatalogs = () => {
    if (!localStorage.getItem(CATKEY)) {
      const alt = localStorage.getItem("hr_catalogs_v1") || localStorage.getItem("hr_catalogs") || null;
      localStorage.setItem(CATKEY, alt || JSON.stringify(DEFAULT_CATALOGS));
    }
    const parsed = safeJSON(localStorage.getItem(CATKEY), null);
    if (!parsed || typeof parsed !== "object") return structuredClone(DEFAULT_CATALOGS);
    // merge con defaults para no perder data base
    const out = structuredClone(DEFAULT_CATALOGS);
    Object.keys(parsed).forEach(k=> out[k]=parsed[k]);
    return out;
  };
  const setCatalogs = (obj) => localStorage.setItem(CATKEY, JSON.stringify(obj));

  // ---------- Cases load/save + migración ----------
  const getCases = () => {
    if (!localStorage.getItem(CASEKEY)) {
      const alt = localStorage.getItem("hr_cases_v1") || localStorage.getItem("hr_cases") || null;
      localStorage.setItem(CASEKEY, alt || "[]");
    }
    return safeJSON(localStorage.getItem(CASEKEY) || "[]", []);
  };
  const setCases = (a) => localStorage.setItem(CASEKEY, JSON.stringify(a));
  const freshId = () => "c_" + Date.now() + "_" + Math.random().toString(36).slice(2,7);

  // ---------- Selects dependientes ----------
  function fillSelect(sel, list, { includeManual=false }={}) {
    if (!sel) return;
    sel.innerHTML = "";
    sel.append(new Option("— Elegir —", ""));
    (list||[]).forEach(v=> sel.append(new Option(v, v)));
    if (includeManual) sel.append(new Option("Escribir manualmente…", "__manual__"));
  }
  function loadPartidos(){
    const partidos = Object.keys(getCatalogs()).sort((a,b)=>a.localeCompare(b));
    fillSelect($ID("g_partido"), partidos);
    // también en el tab Catálogos
    fillSelect($ID("cat_partidoSel"), partidos);
  }
  function resolvedDependencia() {
    const v = val("g_dep");
    if (v === "__manual__") return val("g_dep_manual").trim();
    return v;
  }
  function loadLocalidadesDeps() {
    const cat = getCatalogs();
    const partido = val("g_partido");
    const locSel = $ID("g_localidad");
    const depSel = $ID("g_dep");
    if (!locSel || !depSel) return;

    if (!partido || !cat[partido]) {
      fillSelect(locSel, []);
      fillSelect(depSel, [], { includeManual:true });
      styleShow("g_dep_manual_wrap", false);
      return;
    }
    fillSelect(locSel, (cat[partido].localidades||[]));
    fillSelect(depSel, (cat[partido].dependencias||[]), { includeManual:true });
    styleShow("g_dep_manual_wrap", val("g_dep")==="__manual__");
  }

  // ---------- TitleCase ----------
  const TitleCase = (s) =>
    (s||"").toLowerCase().split(/(\s|-)/).map(p=>p.trim()===""||p==='-'?p:p.charAt(0).toUpperCase()+p.slice(1)).join("");

  // ---------- Módulos personas/objetos ----------
  const CIV = {
    store:[], editingIndex:null,
    addOrUpdate(){
      const p = {
        nombre: val("c_nombre"), apellido: val("c_apellido"), edad: val("c_edad"),
        genero: val("c_genero"), dni: val("c_dni"), pais: val("c_pais"),
        loc_domicilio: val("c_loc"), calle_domicilio: val("c_calle"),
        vinculo: (val("c_vinculo")||"victima").toLowerCase(),
        obito: val("c_obito")==="true"
      };
      if (this.editingIndex===null) this.store.push(p);
      else { this.store[this.editingIndex]=p; this.editingIndex=null; const b=document.getElementById("addCivil"); if(b) b.textContent="Agregar involucrado"; document.getElementById("cancelEditCivil")?.remove(); }
      this.clearForm(); this.render();
    },
    clearForm(){ setv("c_nombre",""); setv("c_apellido",""); setv("c_edad",""); setv("c_genero",""); setv("c_dni",""); setv("c_pais",""); setv("c_loc",""); setv("c_calle",""); setv("c_vinculo","victima"); setv("c_obito","false"); },
    render(){
      const box=document.getElementById("civilesList"); if(!box) return;
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML=`<div class="table"><table><thead><tr>
        <th>#</th><th>Vínculo</th><th>Nombre</th><th>Apellido</th><th>Edad</th><th>DNI</th><th>Domicilio</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((p,i)=>`<tr>
          <td>${i}</td><td>${TitleCase(p.vinculo)}</td>
          <td>${TitleCase(p.nombre||"")}</td><td>${TitleCase(p.apellido||"")}</td>
          <td>${p.edad||""}</td><td>${p.dni||""}</td>
          <td>${[TitleCase(p.calle_domicilio||""), TitleCase(p.loc_domicilio||"")].filter(Boolean).join(", ")}</td>
          <td><button class="btn ghost" data-editc="${i}">Editar</button><button class="btn ghost" data-delc="${i}">Quitar</button></td>
        </tr>`).join("")
      }</tbody></table></div>`;
      $$("#civilesList [data-delc]").forEach(b=> b.onclick=()=>{ this.store.splice(parseInt(b.dataset.delc,10),1); this.render(); });
      $$("#civilesList [data-editc]").forEach(b=> b.onclick=()=>{ const i=parseInt(b.dataset.editc,10); const p=this.store[i]; setv("c_nombre",p.nombre||""); setv("c_apellido",p.apellido||""); setv("c_edad",p.edad||""); setv("c_genero",p.genero||""); setv("c_dni",p.dni||""); setv("c_pais",p.pais||""); setv("c_loc",p.loc_domicilio||""); setv("c_calle",p.calle_domicilio||""); setv("c_vinculo",p.vinculo||"victima"); setv("c_obito",p.obito?"true":"false"); this.editingIndex=i; const btn=document.getElementById("addCivil"); if(btn) btn.textContent="Guardar cambios"; if(!document.getElementById("cancelEditCivil")){ const c=document.createElement("button"); c.id="cancelEditCivil"; c.className="btn ghost"; c.style.marginLeft="6px"; c.textContent="Cancelar"; btn.parentElement.appendChild(c); c.onclick=()=>{ this.editingIndex=null; this.clearForm(); btn.textContent="Agregar involucrado"; c.remove(); }; }});
      renderTagHelper();
    }
  };

  const FZA = {
    store:[], editingIndex:null,
    addOrUpdate(){
      const p = {
        nombre: val("f_nombre"), apellido: val("f_apellido"), edad: val("f_edad"),
        fuerza: val("f_fuerza"), jerarquia: val("f_jerarquia"), legajo: val("f_legajo"),
        destino: val("f_destino"), loc_domicilio: val("f_loc"), calle_domicilio: val("f_calle"),
        vinculo: (val("f_vinculo")||"interviniente").toLowerCase(), obito: val("f_obito")==="true"
      };
      if(this.editingIndex===null) this.store.push(p);
      else { this.store[this.editingIndex]=p; this.editingIndex=null; const b=document.getElementById("addFuerza"); if(b) b.textContent="Agregar personal"; document.getElementById("cancelEditFza")?.remove(); }
      this.clearForm(); this.render();
    },
    clearForm(){ setv("f_nombre",""); setv("f_apellido",""); setv("f_edad",""); setv("f_fuerza",""); setv("f_jerarquia",""); setv("f_legajo",""); setv("f_destino",""); setv("f_loc",""); setv("f_calle",""); setv("f_vinculo","interviniente"); setv("f_obito","false"); },
    render(){
      const box=document.getElementById("fuerzasList"); if(!box) return;
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML=`<div class="table"><table><thead><tr>
        <th>#</th><th>Vínculo</th><th>Nombre</th><th>Apellido</th><th>Edad</th><th>Fuerza</th><th>Jerarquía</th><th>Destino</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((p,i)=>`<tr>
          <td>${i}</td><td>${TitleCase(p.vinculo)}</td>
          <td>${TitleCase(p.nombre||"")}</td><td>${TitleCase(p.apellido||"")}</td>
          <td>${p.edad||""}</td><td>${p.fuerza||""}</td><td>${p.jerarquia||""}</td><td>${p.destino||""}</td>
          <td><button class="btn ghost" data-editf="${i}">Editar</button><button class="btn ghost" data-delf="${i}">Quitar</button></td>
        </tr>`).join("")
      }</tbody></table></div>`;
      $$("#fuerzasList [data-delf]").forEach(b=> b.onclick=()=>{ this.store.splice(parseInt(b.dataset.delf,10),1); this.render(); });
      $$("#fuerzasList [data-editf]").forEach(b=> b.onclick=()=>{ const i=parseInt(b.dataset.editf,10); const p=this.store[i]; setv("f_nombre",p.nombre||""); setv("f_apellido",p.apellido||""); setv("f_edad",p.edad||""); setv("f_fuerza",p.fuerza||""); setv("f_jerarquia",p.jerarquia||""); setv("f_legajo",p.legajo||""); setv("f_destino",p.destino||""); setv("f_loc",p.loc_domicilio||""); setv("f_calle",p.calle_domicilio||""); setv("f_vinculo",p.vinculo||"interviniente"); setv("f_obito",p.obito?"true":"false"); this.editingIndex=i; const btn=document.getElementById("addFuerza"); if(btn) btn.textContent="Guardar cambios"; if(!document.getElementById("cancelEditFza")){ const c=document.createElement("button"); c.id="cancelEditFza"; c.className="btn ghost"; c.style.marginLeft="6px"; c.textContent="Cancelar"; btn.parentElement.appendChild(c); c.onclick=()=>{ this.editingIndex=null; this.clearForm(); btn.textContent="Agregar personal"; c.remove(); }; }});
      renderTagHelper();
    }
  };

  const OBJ = {
    store:[], editingIndex:null,
    addOrUpdate(){
      const o = { descripcion: val("o_desc"), vinculo: (val("o_vinc")||"secuestro").toLowerCase() };
      if(!o.descripcion.trim()) return;
      if(this.editingIndex===null) this.store.push(o);
      else { this.store[this.editingIndex]=o; this.editingIndex=null; const b=document.getElementById("addObjeto"); if(b) b.textContent="Agregar objeto"; document.getElementById("cancelEditObj")?.remove(); }
      this.clearForm(); this.render();
    },
    clearForm(){ setv("o_desc",""); setv("o_vinc","secuestro"); },
    render(){
      const box=document.getElementById("objetosList"); if(!box) return;
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML=`<div class="table"><table><thead><tr>
        <th>#</th><th>Descripción</th><th>Vínculo</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((o,i)=>`<tr>
          <td>${i}</td><td>${o.descripcion}</td><td>${TitleCase(o.vinculo)}</td>
          <td><button class="btn ghost" data-edito="${i}">Editar</button><button class="btn ghost" data-delo="${i}">Quitar</button></td>
        </tr>`).join("")
      }</tbody></table></div>`;
      $$("#objetosList [data-delo]").forEach(b=> b.onclick=()=>{ this.store.splice(parseInt(b.dataset.delo,10),1); this.render(); });
      $$("#objetosList [data-edito]").forEach(b=> b.onclick=()=>{ const i=parseInt(b.dataset.edito,10); const o=this.store[i]; setv("o_desc",o.descripcion||""); setv("o_vinc",o.vinculo||"secuestro"); this.editingIndex=i; const btn=document.getElementById("addObjeto"); if(btn) btn.textContent="Guardar cambios"; if(!document.getElementById("cancelEditObj")){ const c=document.createElement("button"); c.id="cancelEditObj"; c.className="btn ghost"; c.style.marginLeft="6px"; c.textContent="Cancelar"; btn.parentElement.appendChild(c); c.onclick=()=>{ this.editingIndex=null; this.clearForm(); btn.textContent="Agregar objeto"; c.remove(); }; }});
      renderTagHelper();
    }
  };

  // ---------- Etiquetas rápidas (#victima:0 etc.) ----------
  const ROLE_KEYS = ["victima","imputado","sindicado","denunciante","testigo","interviniente","aprehendido","detenido","menor","nn","pp","damnificado institucional"];
  const OBJ_KEYS  = ["secuestro","sustraccion","hallazgo","otro"];

  function renderTagHelper(){
    const box = $ID("tagHelper"); if(!box) return;
    const chips = [];
    const allPeople = (CIV.store||[]).concat(FZA.store||[]);
    ROLE_KEYS.forEach(role=>{
      const arr = allPeople.filter(p => (p.vinculo||"").toLowerCase()===role);
      arr.forEach((_,i)=> chips.push(`#${role}:${i}`));
    });
    (FZA.store||[]).forEach((_,i)=> chips.push(`#pf:${i}`));
    OBJ_KEYS.forEach(cat=>{
      const arr = (OBJ.store||[]).filter(o => (o.vinculo||"").toLowerCase()===cat);
      arr.forEach((_,i)=> chips.push(`#${cat}:${i}`));
    });
    if(!chips.length){ box.innerHTML=`<span class="muted">Cargá personas/objetos para ver etiquetas rápidas…</span>`; return; }
    box.innerHTML = chips.map(t=>`<button type="button" class="chip" data-tag="${t}">${t}</button>`).join("");
    box.querySelectorAll("[data-tag]").forEach(btn=>{
      btn.onclick = ()=>{
        const ta = $ID("cuerpo"); if(!ta) return;
        const start = ta.selectionStart ?? ta.value.length;
        const end   = ta.selectionEnd   ?? ta.value.length;
        const before = ta.value.slice(0,start);
        const after  = ta.value.slice(end);
        const needsSpace = before && !/\s$/.test(before) ? " " : "";
        const inserted = needsSpace + btn.dataset.tag + " ";
        ta.value = before + inserted + after;
        const pos = (before + inserted).length;
        ta.setSelectionRange(pos,pos);
        ta.focus();
      };
    });
  }

  // ---------- Build / Preview ----------
  function buildDataFromForm(){
    const tipo = val("g_tipoExp") || "PU";
    const num  = (val("g_numExp")||"").trim();
    const puFull = num ? `${tipo} ${num}` : "";
    return {
      generales: {
        fecha_hora: fechaFmt(),
        tipoExp: tipo, numExp: num, pu: puFull,
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
  function preview(){
    const out = HRFMT.buildAll(buildDataFromForm());
    const prev = document.getElementById("previewHtml");
    if(prev) prev.textContent = out.waLong;
    return out;
  }
  function renderTitlePreview(){
    const out = HRFMT.buildAll(buildDataFromForm());
    const t=document.getElementById("tituloCompuesto");
    const s=document.getElementById("subCompuesto");
    if(t) t.textContent = out.forDocx.titulo;
    if(s) s.textContent = out.forDocx.subtitulo || "";
  }

  // ---------- Casos (tabla) ----------
  function renderCases(){
    const box=$ID("casesList"); if(!box) return;
    const cases = getCases();
    if(!cases.length){ box.innerHTML="Sin hechos guardados."; return; }
    box.innerHTML = `<div class="table"><table><thead>
      <tr><th></th><th></th><th>Nombre</th><th>Fecha</th><th>Tipo</th><th>Número</th><th>Partido</th><th>Dep.</th></tr>
    </thead><tbody>${
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
    }</tbody></table></div>`;
    attachCaseSearch();
  }
  function attachCaseSearch(){
    const input=$ID("caseSearch"); const box=$ID("casesList"); if(!input||!box) return;
    input.oninput=()=>{ const q=input.value.toLowerCase(); box.querySelectorAll("tbody tr").forEach(tr=>{ tr.style.display= tr.textContent.toLowerCase().includes(q)?"": "none"; }); };
  }
  const selectedRadio  = ()=>{ const r=document.querySelector('input[name="caseSel"]:checked'); return r?r.getAttribute("data-id"):null; };
  const selectedChecks = ()=> $$(".caseCheck:checked").map(x=>x.getAttribute("data-id"));
  const bind = (id,fn)=>{ const n=document.getElementById(id); if(n) n.onclick=fn; };

  // ---------- Backup / Restore / Merge ----------
  function exportBackupJSON(){
    const payload = { version:1, exported_at:new Date().toISOString(), cases:getCases() };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`hechos_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }
  async function importBackupJSON(file, replace=false){
    try{
      const text = await file.text();
      const data = JSON.parse(text);
      const incoming = Array.isArray(data?.cases) ? data.cases : (Array.isArray(data) ? data : null);
      if(!incoming){ alert("JSON inválido. Debe traer 'cases' o ser un array."); return; }
      if(replace){ setCases(incoming); renderCases(); alert(`Restaurado: ${incoming.length} hechos.`); return; }
      const current = getCases(); const ids=new Set(current.map(c=>c.id));
      let added=0, skipped=0;
      incoming.forEach(it=>{ if(!it||typeof it!=="object"){ skipped++; return; } if(!it.id) it.id=freshId(); if(ids.has(it.id)) skipped++; else { current.push(it); ids.add(it.id); added++; } });
      setCases(current); renderCases(); alert(`Fusionado: agregados ${added}, saltados ${skipped}.`);
    }catch(e){ console.error(e); alert("No pude leer el JSON."); }
  }
  function ensureFileInputs(){
    if(!$ID("restoreFile")){ const i=document.createElement("input"); i.type="file"; i.id="restoreFile"; i.accept=".json"; i.hidden=true; document.body.appendChild(i); }
    if(!$ID("mergeFile")){ const i=document.createElement("input"); i.type="file"; i.id="mergeFile"; i.accept=".json"; i.hidden=true; document.body.appendChild(i); }
  }

  // ---------- Botones ----------
  function wireButtons(){
    bind("addCivil",  ()=> CIV.addOrUpdate());
    bind("addFuerza", ()=> FZA.addOrUpdate());
    bind("addObjeto", ()=> OBJ.addOrUpdate());

    bind("generar",   ()=> preview());

    bind("copiarWA", ()=>{
      const ids = selectedChecks();
      if(!ids.length){
        const out = preview();
        navigator.clipboard.writeText(out.waLong).then(()=>alert("Copiado al portapapeles"));
        return;
      }
      const joined = getCases().filter(c=>ids.includes(c.id)).map(c=> HRFMT.buildAll(c).waLong).join("\n\n");
      navigator.clipboard.writeText(joined).then(()=>alert("Varios copiados"));
    });

    bind("descargarWord", async ()=>{
      try{ await HRFMT.downloadDocx(buildDataFromForm(), (window.docx||{})); }
      catch(e){ console.error(e); showErr(e.message||"Error generando Word"); }
    });

    bind("downloadWordMulti", async ()=>{
      const ids = selectedChecks(); if(!ids.length){ alert("Seleccioná al menos un hecho (checkbox)."); return; }
      const docx = window.docx||{}; const { Document, Packer, TextRun, Paragraph, AlignmentType } = docx;
      if(!Document){ alert("Librería docx no cargada."); return; }
      const JUST = AlignmentType.JUSTIFIED;
      const toRuns = (txt)=>{ const parts=(txt||"").split(/(\*|_)/g); let B=false,I=false; const runs=[]; for(const part of parts){ if(part==="*"){B=!B;continue;} if(part==="_"){I=!I;continue;} if(!part) continue; runs.push(new TextRun({text:part,bold:B,italics:I,underline:I?{}:undefined})); } return runs; };
      const selected = getCases().filter(c=>ids.includes(c.id));
      const children = [];
      selected.forEach((snap,i)=>{
        const built = HRFMT.buildAll(snap);
        children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.titulo, bold:true }) ] }));
        if(built.forDocx.subtitulo) children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.subtitulo, bold:true, color: built.forDocx.color }) ] }));
        (built.forDocx.bodyHtml||"").split(/\n\n+/).forEach(p=> children.push(new Paragraph({ children: toRuns(p), alignment: JUST, spacing:{after:200} })));
        if(i !== selected.length-1) children.push(new Paragraph({ text:"" }));
      });
      const doc = new Document({ styles:{ default:{ document:{ run:{ font:"Arial", size:24 } } } }, sections:[{ children }] });
      const blob = await Packer.toBlob(doc);
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`Hechos_Seleccionados_${new Date().toISOString().slice(0,10)}.docx`; a.click();
    });

    bind("exportCSV", ()=>{
      const ids = selectedChecks();
      const list = ids.length ? getCases().filter(c=>ids.includes(c.id)) : [buildDataFromForm()];
      HRFMT.downloadCSV(list);
    });
    bind("exportCSV1", ()=> HRFMT.downloadCSV([buildDataFromForm()]) );

    bind("clearAll", ()=>{
      if(!confirm("¿Borrar los campos del formulario actual? (No borra los guardados)")) return;
      setv("g_fecha_dia",""); setv("g_tipoExp","PU"); setv("g_numExp","");
      setv("g_partido",""); loadLocalidadesDeps(); setv("g_localidad","");
      setv("g_dep",""); setv("g_dep_manual",""); styleShow("g_dep_manual_wrap",false);
      setv("g_car",""); setv("g_sub",""); setv("g_ok","no"); setv("g_ufi",""); setv("g_coord","");
      setchk("g_relevante",false); setchk("g_supervisado",false);
      CIV.store=[]; FZA.store=[]; OBJ.store=[];
      CIV.clearForm(); FZA.clearForm(); OBJ.clearForm();
      CIV.render(); FZA.render(); OBJ.render();
      setv("cuerpo","");
      renderTitlePreview(); renderTagHelper();
    });

    // CRUD casos
    bind("saveCase", ()=>{
      const snap = buildDataFromForm();
      const built = HRFMT.buildAll(snap);
      snap.id = freshId();
      snap.name = (val("caseName").trim()) || built.forDocx.titulo;
      const list = getCases(); list.push(snap); setCases(list); renderCases(); alert("Guardado.");
    });
    bind("updateCase", ()=>{
      const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para actualizar."); return; }
      const list = getCases(); const idx = list.findIndex(c=>c.id===id); if(idx<0){ alert("No encontrado"); return; }
      const snap = buildDataFromForm(); const built = HRFMT.buildAll(snap);
      snap.id = id; snap.name = (val("caseName").trim()) || built.forDocx.titulo;
      list[idx] = snap; setCases(list); renderCases(); alert("Actualizado.");
    });
    bind("deleteCase", ()=>{
      const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para borrar."); return; }
      const list = getCases().filter(c=>c.id!==id); setCases(list); renderCases();
    });
    bind("loadSelected", ()=>{
      const id = selectedRadio(); if(!id){ alert("Elegí un hecho (radio) para cargar."); return; }
      const s = getCases().find(x=>x.id===id); if(!s){ alert("No encontrado"); return; }
      loadSnapshot(s); renderCases(); preview(); alert("Cargado.");
    });

    // Backup/Restore/Merge
    ensureFileInputs();
    bind("backupJSON", ()=> exportBackupJSON());
    bind("restoreJSON", ()=>{
      const input=$ID("restoreFile"); input.value=""; input.click();
      input.onchange=()=>{ if(input.files?.[0]) importBackupJSON(input.files[0], confirm("¿Reemplazar todo por el archivo?\nAceptar = Reemplazar • Cancelar = Fusionar")); };
    });
    bind("mergeJSON", ()=>{
      const input=$ID("mergeFile"); input.value=""; input.click();
      input.onchange=()=>{ if(input.files?.[0]) importBackupJSON(input.files[0], false); };
    });

    // Catálogos
    bind("cat_guardar", cat_guardar);
    bind("cat_reset", cat_reset);
    bind("cat_agregarPartido", cat_agregarPartido);
    bind("cat_borrarPartido", cat_borrarPartido);
    $ID("cat_partidoSel")?.addEventListener("change", cat_loadIntoEditor);
  }

  function loadSnapshot(s){
    const fh = s.generales?.fecha_hora || ""; const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(fh);
    if(m){ setv("g_fecha_dia",`${m[3]}-${m[2]}-${m[1]}`); } else { setv("g_fecha_dia",""); }
    setv("g_tipoExp", s.generales?.tipoExp || "PU");
    setv("g_numExp",  s.generales?.numExp || "");
    setv("g_partido", s.generales?.partido||""); loadLocalidadesDeps();
    setv("g_localidad", s.generales?.localidad||"");
    const cat = getCatalogs(); const partido = val("g_partido"); const deps = (cat[partido]?.dependencias||[]);
    if (s.generales?.dependencia && !deps.includes(s.generales.dependencia)) { setv("g_dep","__manual__"); setv("g_dep_manual", s.generales.dependencia || ""); styleShow("g_dep_manual_wrap", true); }
    else { setv("g_dep", s.generales?.dependencia || ""); setv("g_dep_manual",""); styleShow("g_dep_manual_wrap", val("g_dep")==="__manual__"); }
    setv("g_car", s.generales?.caratula||""); setv("g_sub", s.generales?.subtitulo||"");
    setv("g_ok",  s.generales?.esclarecido ? "si" : "no"); setv("g_ufi", s.generales?.ufi||""); setv("g_coord", s.generales?.coordenadas||"");
    setchk("g_relevante", !!s.generales?.relevante); setchk("g_supervisado", !!s.generales?.supervisado);
    CIV.store = (s.civiles||[]).slice(); CIV.render(); FZA.store = (s.fuerzas||[]).slice(); FZA.render(); OBJ.store = (s.objetos||[]).slice(); OBJ.render();
    setv("cuerpo", s.cuerpo||""); setv("caseName", s.name || "");
    renderTitlePreview(); renderTagHelper();
  }

  // ---------- Catálogos UI ----------
  function cat_loadIntoEditor(){
    const cat = getCatalogs();
    const partido = val("cat_partidoSel") || Object.keys(cat)[0] || "General Pueyrredon";
    const locs = (cat[partido]?.localidades||[]).join("\n");
    const deps = (cat[partido]?.dependencias||[]).join("\n");
    setv("cat_localidades", locs);
    setv("cat_dependencias", deps);
  }
  function cat_guardar(){
    const partido = val("cat_partidoSel");
    if(!partido){ alert("Elegí un partido primero."); return; }
    const cat = getCatalogs();
    cat[partido] = {
      localidades: val("cat_localidades").split("\n").map(s=>s.trim()).filter(Boolean),
      dependencias: val("cat_dependencias").split("\n").map(s=>s.trim()).filter(Boolean),
    };
    setCatalogs(cat);
    // refrescar selects si el partido activo coincide
    if(val("g_partido")===partido){ loadLocalidadesDeps(); }
    alert("Catálogo guardado.");
  }
  function cat_reset(){
    if(!confirm("¿Restaurar valores de ejemplo para todos los partidos?")) return;
    setCatalogs(DEFAULT_CATALOGS);
    loadPartidos();
    cat_loadIntoEditor();
    alert("Catálogos restaurados.");
  }
  function cat_agregarPartido(){
    const nombre = (val("cat_partidoNuevo")||"").trim();
    if(!nombre){ alert("Escribí el nombre del nuevo partido."); return; }
    const cat = getCatalogs();
    if(cat[nombre]){ alert("Ese partido ya existe."); return; }
    cat[nombre] = { localidades:[], dependencias:[] };
    setCatalogs(cat);
    loadPartidos();
    setv("cat_partidoSel", nombre);
    cat_loadIntoEditor();
    alert("Partido agregado.");
  }
  function cat_borrarPartido(){
    const partido = val("cat_partidoSel");
    if(!partido){ alert("Elegí un partido."); return; }
    if(!confirm(`¿Borrar el partido "${partido}" del catálogo?`)) return;
    const cat = getCatalogs();
    delete cat[partido];
    setCatalogs(cat);
    loadPartidos();
    cat_loadIntoEditor();
    alert("Partido borrado.");
  }

  // ---------- Live preview + cascadas ----------
  function wireLivePreview(){
    ["g_fecha_dia","g_tipoExp","g_numExp","g_partido","g_localidad","g_dep","g_dep_manual","g_car","g_sub","g_ok","g_ufi","g_coord","g_relevante","g_supervisado"]
      .forEach(id=>{ const n=$ID(id); if(!n) return; const ev=(n.tagName==="SELECT"||n.type==="checkbox"||n.type==="date")?"change":"input"; n.addEventListener(ev, renderTitlePreview); });
    $ID("g_partido")?.addEventListener("change", ()=>{ loadLocalidadesDeps(); renderTitlePreview(); });
    $ID("g_dep")?.addEventListener("change", ()=>{ styleShow("g_dep_manual_wrap", val("g_dep")==="__manual__"); renderTitlePreview(); });
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", ()=>{
    loadPartidos();
    loadLocalidadesDeps();
    CIV.render(); FZA.render(); OBJ.render();
    wireButtons(); wireLivePreview();
    renderTitlePreview(); renderTagHelper(); renderCases();
    cat_loadIntoEditor();
  });
})();
