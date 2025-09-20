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
  const TitleCase = (s)=> (s||"").toLowerCase().split(/(\s|-)/).map(p=>{
    if(p.trim()===""||p==='-') return p; return p.charAt(0).toUpperCase()+p.slice(1);
  }).join("");

  function getCases(){ try{ return JSON.parse(localStorage.getItem(CASEKEY)||"[]"); }catch{ return []; } }
  function setCases(arr){ localStorage.setItem(CASEKEY, JSON.stringify(arr)); }
  function freshId(){ return "c_"+Date.now()+"_"+Math.random().toString(36).slice(2,7); }

  function renderCases(){
    const box=$("#casesList"); if(!box) return;
    const cases = getCases();
    if(!cases.length){ box.innerHTML="Sin hechos guardados."; return; }
    box.innerHTML = `<table><thead><tr><th></th><th></th><th>Nombre</th><th>Fecha</th><th>PU</th></tr></thead><tbody>${
      cases.map(c=>`<tr>
        <td><input type="checkbox" class="caseCheck" data-id="${c.id}"></td>
        <td><input type="radio" name="caseSel" data-id="${c.id}"></td>
        <td>${c.name||''}</td><td>${c.generales?.fecha_hora||''}</td><td>${c.generales?.pu||''}</td>
      </tr>`).join("")
    }</tbody></table>`;
  }

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

  function buildDataFromForm(){
    return {
      generales: {
        fecha_hora: $("#g_fecha").value.trim(),
        pu: $("#g_pu").value.trim(),
        dependencia: $("#g_dep").value.trim(),
        caratula: $("#g_car").value.trim(),
        subtitulo: $("#g_sub").value.trim(),
        esclarecido: $("#g_ok").value==="si",
        ufi: $("#g_ufi").value.trim(),
        partido: $("#g_partido").value.trim(),
        localidad: $("#g_localidad").value.trim(),
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

  function renderTitlePreview(){
    const t = [$("#g_fecha").value,$("#g_pu").value,$("#g_dep").value,$("#g_car").value].filter(Boolean).join(" – ");
    const sub = $("#g_sub").value; const ok = ($("#g_ok").value==="si");
    $("#tituloCompuesto").innerHTML = `<strong>${t.toUpperCase()}</strong>`;
    $("#subCompuesto").innerHTML = `<span class="badge ${ok?'blue':'red'}"><strong>${sub}</strong></span>`;
  }
  ["g_fecha","g_pu","g_dep","g_car","g_sub","g_ok","g_ufi","g_partido","g_localidad","g_coord","g_relevante","g_supervisado"].forEach(id=>{
    const n=document.getElementById(id); if(n) n.addEventListener("input", renderTitlePreview);
    if(n && n.type==="checkbox") n.addEventListener("change", renderTitlePreview);
  });

  function preview(){
    const data = buildDataFromForm();
    const out = HRFMT.buildAll(data);
    $("#previewHtml").innerHTML = out.html;
    return out;
  }

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
    $("#g_fecha").value = s.generales?.fecha_hora||"";
    $("#g_pu").value    = s.generales?.pu||"";
    $("#g_dep").value   = s.generales?.dependencia||"";
    $("#g_car").value   = s.generales?.caratula||"";
    $("#g_sub").value   = s.generales?.subtitulo||"";
    $("#g_ok").value    = s.generales?.esclarecido ? "si" : "no";
    $("#g_ufi").value   = s.generales?.ufi||"";
    $("#g_partido").value = s.generales?.partido||"";
    $("#g_localidad").value = s.generales?.localidad||"";
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

  // ===== RESPALDO / RESTAURACIÓN JSON =====
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

  // Eventos backup/restore/merge
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

  // Init
  renderCases();
  renderTitlePreview();
  renderTagHelper();
})();
