(function () {
  // ===== Helpers =====
  const $ = (id)=>document.getElementById(id);
  const val = (id)=> ($(id)?.value ?? "");
  const setv = (id,v)=>{ const n=$(id); if(n) n.value=v; };
  const chk = (id)=> !!$(id)?.checked;
  const setchk = (id,v)=>{ const n=$(id); if(n) n.checked=!!v; };
  const show = (id, on)=>{ const n=$(id); if(n) n.style.display = on?"block":"none"; };

  const CASEKEY="hr_cases_v9";
  const CATKEY ="hr_catalogs_v9";

  // ===== Fecha format dd-mm-aaaa =====
  const fechaFmt = ()=>{
    const d = val("g_fecha_dia");
    if(!d) return "";
    const [y,m,day] = d.split("-");
    return `${day}-${m}-${y}`;
  };

  // ===== Catálogos (con defaults) =====
  const DEFAULT_CATALOGS = {
    "General Pueyrredon": {
      localidades: ["Mar del Plata","Batán","Sierra de los Padres","Chapadmalal","Estación Camet","El Boquerón"],
      dependencias: ["Cria. Mar Del Plata 1ra.","Cria. Mar Del Plata 2da.","Cria. Mar Del Plata 3ra.","Cria. Mar Del Plata 4ta.","Cria. Mar Del Plata 5ta.","Cria. Mar Del Plata 6ta.","Subcria. Camet","Subcria. Acantilados","DDI Mar del Plata","Comisaría de la Mujer MdP","UPPL MdP","CPO MdP"]
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
  const getCatalogs=()=>{ try{ const raw=localStorage.getItem(CATKEY); if(!raw) return structuredClone(DEFAULT_CATALOGS); const parsed=JSON.parse(raw); const out=structuredClone(DEFAULT_CATALOGS); Object.keys(parsed||{}).forEach(k=>out[k]=parsed[k]); return out; }catch{ return structuredClone(DEFAULT_CATALOGS); } };
  const setCatalogs=(obj)=> localStorage.setItem(CATKEY, JSON.stringify(obj));

  function fillPartidos(){
    const cat = getCatalogs();
    const partidos = Object.keys(cat).sort((a,b)=>a.localeCompare(b));
    const sp = $("g_partido"); const sc = $("cat_partidoSel");
    if(sp){ sp.innerHTML=""; sp.append(new Option("— Elegir —","")); partidos.forEach(p=> sp.append(new Option(p,p))); }
    if(sc){ sc.innerHTML=""; partidos.forEach(p=> sc.append(new Option(p,p))); if(partidos.length) sc.value=partidos[0]; }
  }
  function loadLocalidadesDeps(){
    const cat=getCatalogs(); const partido=val("g_partido"); const sl=$("g_localidad"); const sd=$("g_dep");
    if(!sl||!sd) return;
    sl.innerHTML=""; sd.innerHTML="";
    sl.append(new Option("— Elegir —","")); sd.append(new Option("— Elegir —",""));
    if(partido && cat[partido]){
      (cat[partido].localidades||[]).forEach(v=> sl.append(new Option(v,v)));
      (cat[partido].dependencias||[]).forEach(v=> sd.append(new Option(v,v)));
      sd.append(new Option("Escribir manualmente…","__manual__"));
    }
    show("g_dep_manual_wrap", val("g_dep")==="__manual__");
  }

  // ===== Personas / Objetos =====
  const toTitle = (s)=> (s||"").toLowerCase().replace(/\b([a-záéíóúñü])([a-záéíóúñü]*)/gi, (_,a,b)=> a.toUpperCase()+b);

  const CIV = {
    store:[], editing:null,
    addOrUpdate(){
      const p = {
        vinculo:(val("c_vinculo")||"victima").toLowerCase(),
        nombre: val("c_nombre"),
        apellido:val("c_apellido"),
        edad:val("c_edad"),
        dni:val("c_dni"),
        pais:val("c_pais"),
        loc_domicilio:val("c_loc"),
        calle_domicilio:val("c_calle"),
        obito: val("c_obito")==="true"
      };
      if(this.editing===null||this.editing===undefined){ this.store.push(p); }
      else{ this.store[this.editing]=p; this.editing=null; $("addCivil").textContent="Agregar involucrado"; $("cancelEditCivil")?.remove(); }
      this.clearForm(); this.render();
    },
    clearForm(){ setv("c_vinculo","victima"); setv("c_nombre",""); setv("c_apellido",""); setv("c_edad",""); setv("c_dni",""); setv("c_pais",""); setv("c_loc",""); setv("c_calle",""); setv("c_obito","false"); },
    render(){
      const box=$("civilesList"); if(!box){ return; }
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML = `<div class="table"><table><thead><tr>
        <th>#</th><th>Vínculo</th><th>Nombre</th><th>Apellido</th><th>Edad</th><th>DNI</th><th>Domicilio</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((p,i)=>`<tr>
          <td>${i}</td><td>${toTitle(p.vinculo)}</td>
          <td>${toTitle(p.nombre||"")}</td>
          <td>${toTitle(p.apellido||"")}</td>
          <td>${p.edad||""}</td>
          <td>${p.dni||""}</td>
          <td>${[toTitle(p.calle_domicilio||""), toTitle(p.loc_domicilio||"")].filter(Boolean).join(", ")}</td>
          <td>
            <button class="btn ghost" data-editc="${i}">Editar</button>
            <button class="btn ghost" data-delc="${i}">Quitar</button>
          </td>
        </tr>`).join("")
      }</tbody></table></div>`;
      document.querySelectorAll("[data-delc]").forEach(b=> b.onclick=()=>{ this.store.splice(parseInt(b.dataset.delc,10),1); this.render(); });
      document.querySelectorAll("[data-editc]").forEach(b=> b.onclick=()=>{ const i=parseInt(b.dataset.editc,10); const p=this.store[i]; setv("c_vinculo",p.vinculo); setv("c_nombre",p.nombre||""); setv("c_apellido",p.apellido||""); setv("c_edad",p.edad||""); setv("c_dni",p.dni||""); setv("c_pais",p.pais||""); setv("c_loc",p.loc_domicilio||""); setv("c_calle",p.calle_domicilio||""); setv("c_obito",p.obito?"true":"false"); this.editing=i; $("addCivil").textContent="Guardar cambios"; if(!$("cancelEditCivil")){ const c=document.createElement("button"); c.id="cancelEditCivil"; c.className="btn ghost"; c.textContent="Cancelar"; c.style.marginLeft="6px"; $("addCivil").parentElement.appendChild(c); c.onclick=()=>{ this.editing=null; this.clearForm(); $("addCivil").textContent="Agregar involucrado"; c.remove(); }; }});
      renderTagHelper();
    }
  };

  const FZA = {
    store:[], editing:null,
    addOrUpdate(){
      const p = {
        vinculo:(val("f_vinculo")||"interviniente").toLowerCase(),
        nombre: val("f_nombre"), apellido: val("f_apellido"), edad:val("f_edad"),
        fuerza:val("f_fuerza"), jerarquia:val("f_jerarquia"), legajo:val("f_legajo"),
        destino:val("f_destino"), loc_domicilio:val("f_loc"), calle_domicilio:val("f_calle"),
        obito: val("f_obito")==="true"
      };
      if(this.editing===null||this.editing===undefined){ this.store.push(p); }
      else{ this.store[this.editing]=p; this.editing=null; $("addFuerza").textContent="Agregar personal"; $("cancelEditFza")?.remove(); }
      this.clearForm(); this.render();
    },
    clearForm(){ setv("f_vinculo","interviniente"); setv("f_nombre",""); setv("f_apellido",""); setv("f_edad",""); setv("f_fuerza",""); setv("f_jerarquia",""); setv("f_legajo",""); setv("f_destino",""); setv("f_loc",""); setv("f_calle",""); setv("f_obito","false"); },
    render(){
      const box=$("fuerzasList"); if(!box){ return; }
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML = `<div class="table"><table><thead><tr>
        <th>#</th><th>Vínculo</th><th>Nombre</th><th>Apellido</th><th>Edad</th><th>Fuerza</th><th>Jerarquía</th><th>Destino</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((p,i)=>`<tr>
          <td>${i}</td><td>${toTitle(p.vinculo)}</td>
          <td>${toTitle(p.nombre||"")}</td><td>${toTitle(p.apellido||"")}</td>
          <td>${p.edad||""}</td><td>${p.fuerza||""}</td><td>${p.jerarquia||""}</td><td>${p.destino||""}</td>
          <td>
            <button class="btn ghost" data-editf="${i}">Editar</button>
            <button class="btn ghost" data-delf="${i}">Quitar</button>
          </td>
        </tr>`).join("")
      }</tbody></table></div>`;
      document.querySelectorAll("[data-delf]").forEach(b=> b.onclick=()=>{ this.store.splice(parseInt(b.dataset.delf,10),1); this.render(); });
      document.querySelectorAll("[data-editf]").forEach(b=> b.onclick=()=>{ const i=parseInt(b.dataset.editf,10); const p=this.store[i]; setv("f_vinculo",p.vinculo); setv("f_nombre",p.nombre||""); setv("f_apellido",p.apellido||""); setv("f_edad",p.edad||""); setv("f_fuerza",p.fuerza||""); setv("f_jerarquia",p.jerarquia||""); setv("f_legajo",p.legajo||""); setv("f_destino",p.destino||""); setv("f_loc",p.loc_domicilio||""); setv("f_calle",p.calle_domicilio||""); setv("f_obito",p.obito?"true":"false"); this.editing=i; $("addFuerza").textContent="Guardar cambios"; if(!$("cancelEditFza")){ const c=document.createElement("button"); c.id="cancelEditFza"; c.className="btn ghost"; c.textContent="Cancelar"; c.style.marginLeft="6px"; $("addFuerza").parentElement.appendChild(c); c.onclick=()=>{ this.editing=null; this.clearForm(); $("addFuerza").textContent="Agregar personal"; c.remove(); }; }});
      renderTagHelper();
    }
  };

  const OBJ = {
    store:[], editing:null,
    addOrUpdate(){
      const o = { descripcion: val("o_desc"), vinculo:(val("o_vinc")||"secuestro").toLowerCase() };
      if(!o.descripcion.trim()) return;
      if(this.editing===null||this.editing===undefined){ this.store.push(o); }
      else{ this.store[this.editing]=o; this.editing=null; $("addObjeto").textContent="Agregar objeto"; $("cancelEditObj")?.remove(); }
      this.clearForm(); this.render();
    },
    clearForm(){ setv("o_desc",""); setv("o_vinc","secuestro"); },
    render(){
      const box=$("objetosList"); if(!box){ return; }
      if(!this.store.length){ box.innerHTML=""; renderTagHelper(); return; }
      box.innerHTML = `<div class="table"><table><thead><tr>
        <th>#</th><th>Descripción</th><th>Vínculo</th><th>Acción</th>
      </tr></thead><tbody>${
        this.store.map((o,i)=>`<tr>
          <td>${i}</td><td>${o.descripcion}</td><td>${toTitle(o.vinculo)}</td>
          <td>
            <button class="btn ghost" data-edito="${i}">Editar</button>
            <button class="btn ghost" data-delo="${i}">Quitar</button>
          </td>
        </tr>`).join("")
      }</tbody></table></div>`;
      document.querySelectorAll("[data-delo]").forEach(b=> b.onclick=()=>{ this.store.splice(parseInt(b.dataset.delo,10),1); this.render(); });
      document.querySelectorAll("[data-edito]").forEach(b=> b.onclick=()=>{ const i=parseInt(b.dataset.edito,10); const o=this.store[i]; setv("o_desc",o.descripcion||""); setv("o_vinc",o.vinculo||"secuestro"); this.editing=i; $("addObjeto").textContent="Guardar cambios"; if(!$("cancelEditObj")){ const c=document.createElement("button"); c.id="cancelEditObj"; c.className="btn ghost"; c.textContent="Cancelar"; c.style.marginLeft="6px"; $("addObjeto").parentElement.appendChild(c); c.onclick=()=>{ this.editing=null; this.clearForm(); $("addObjeto").textContent="Agregar objeto"; c.remove(); }; }});
      renderTagHelper();
    }
  };

  // ===== Etiquetas rápidas (insertar en cursor) =====
  function renderTagHelper(){
    const box=$("tagHelper"); if(!box) return;
    const chips=[];
    const allPeople = (CIV.store||[]).concat(FZA.store||[]);
    const roles = ["victima","imputado","sindicado","denunciante","testigo","pp","aprehendido","detenido","menor","nn","interviniente","damnificado institucional"];
    roles.forEach(role=>{
      const arr = allPeople.filter(p=> (p.vinculo||"").toLowerCase()===role);
      arr.forEach((_,i)=> chips.push(`#${role}:${i}`));
    });
    (FZA.store||[]).forEach((_,i)=> chips.push(`#pf:${i}`));
    ["secuestro","sustraccion","hallazgo","otro"].forEach(cat=>{
      const arr=(OBJ.store||[]).filter(o=> (o.vinculo||"").toLowerCase()===cat);
      arr.forEach((_,i)=> chips.push(`#${cat}:${i}`));
      if(arr.length) chips.push(`#${cat}`);
    });
    if(!chips.length){ box.innerHTML=`<span class="muted">Cargá personas/objetos para ver etiquetas…</span>`; return; }
    box.innerHTML = chips.map(t=>`<button type="button" class="chip" data-tag="${t}">${t}</button>`).join("");
    box.querySelectorAll("[data-tag]").forEach(btn=>{
      btn.onclick=()=>{
        const ta=$("cuerpo"); if(!ta) return;
        const start=ta.selectionStart ?? ta.value.length;
        const end  =ta.selectionEnd   ?? ta.value.length;
        const before=ta.value.slice(0,start);
        const after =ta.value.slice(end);
        const needsSpace = before && !/\s$/.test(before) ? " " : "";
        const inserted = `${needsSpace}${btn.dataset.tag} `;
        ta.value = before + inserted + after;
        const pos = (before + inserted).length;
        ta.setSelectionRange(pos,pos);
        ta.focus();
      };
    });
  }

  // ===== Flag para WhatsApp (sin saltos) =====
  const setWaMerge = () => {
    window.WA_MERGE_SOFTBREAKS = !!$("wa_merge")?.checked;
  };

  // ===== Build data / preview / título =====
  function resolvedDep(){ return val("g_dep")==="__manual__" ? val("g_dep_manual").trim() : val("g_dep"); }
  function buildData(){
    const tipo=val("g_tipoExp")||"PU"; const num=(val("g_numExp")||"").trim();
    return {
      generales:{
        fecha_hora: fechaFmt(),
        tipoExp: tipo, numExp: num, pu: num? `${tipo} ${num}` : "",
        partido: val("g_partido"), localidad: val("g_localidad"), dependencia: resolvedDep(),
        caratula: val("g_car").trim(), subtitulo: val("g_sub").trim(), esclarecido: val("g_ok")==="si",
        ufi: val("g_ufi").trim(), coordenadas: val("g_coord").trim(),
        relevante: chk("g_relevante"), supervisado: chk("g_supervisado")
      },
      civiles: CIV.store.slice(), fuerzas: FZA.store.slice(), objetos: OBJ.store.slice(),
      cuerpo: val("cuerpo")
    };
  }
  function preview(){
    setWaMerge(); // asegura el modo antes de construir
    const out=HRFMT.buildAll(buildData());
    const p=$("previewHtml");
    if(p) p.textContent=out.waLong;
    return out;
  }
  function renderTitlePreview(){
    const out=HRFMT.buildAll(buildData());
    $("tituloCompuesto").textContent=out.forDocx.titulo;
    $("subCompuesto").textContent=out.forDocx.subtitulo||"";
  }

  // ===== Casos (localStorage) =====
  const getCases=()=>{ try{ return JSON.parse(localStorage.getItem(CASEKEY)||"[]"); }catch{ return []; } };
  const setCases=(a)=> localStorage.setItem(CASEKEY, JSON.stringify(a));
  const freshId=()=> "c_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);

  function renderCases(){
    const box=$("casesList"); if(!box) return;
    const list=getCases();
    if(!list.length){ box.innerHTML="Sin hechos guardados."; return; }
    box.innerHTML=`<div class="table"><table><thead><tr>
        <th></th><th></th><th>Nombre</th><th>Fecha</th><th>Tipo</th><th>Número</th><th>Partido</th><th>Dep.</th>
    </tr></thead><tbody>${
      list.map(c=>`<tr>
        <td><input type="checkbox" class="caseCheck" data-id="${c.id}"></td>
        <td><input type="radio" name="caseSel" data-id="${c.id}"></td>
        <td>${c.name||""}</td>
        <td>${c.generales?.fecha_hora||""}</td>
        <td>${c.generales?.tipoExp||""}</td>
        <td>${c.generales?.numExp||""}</td>
        <td>${c.generales?.partido||""}</td>
        <td>${c.generales?.dependencia||""}</td>
      </tr>`).join("")
    }</tbody></table></div>`;
    const input=$("caseSearch");
    if(input){ input.oninput=()=>{ const q=input.value.toLowerCase(); box.querySelectorAll("tbody tr").forEach(tr=> tr.style.display = tr.textContent.toLowerCase().includes(q)? "":"none"); }; }
  }
  const selectedRadio = ()=>{ const r=document.querySelector('input[name="caseSel"]:checked'); return r?r.getAttribute("data-id"):null; };
  const selectedChecks= ()=> Array.from(document.querySelectorAll(".caseCheck:checked")).map(x=>x.getAttribute("data-id"));

  // ===== Backup / Restore / Merge =====
  function exportBackupJSON(){
    const payload={ version:1, exported_at:new Date().toISOString(), cases:getCases() };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`hechos_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
  }
  async function importBackupJSON(file, replace=false){
    try{
      const text=await file.text(); const data=JSON.parse(text);
      const incoming = Array.isArray(data?.cases)? data.cases : (Array.isArray(data)? data : null);
      if(!incoming){ alert("JSON inválido."); return; }
      if(replace){ localStorage.setItem(CASEKEY, JSON.stringify(incoming)); renderCases(); alert(`Restaurado ${incoming.length}.`); return; }
      const cur=getCases(); const ids=new Set(cur.map(c=>c.id)); let add=0, skip=0;
      incoming.forEach(it=>{ if(!it||typeof it!=="object"){ skip++; return; } if(!it.id) it.id=freshId(); if(ids.has(it.id)) skip++; else { cur.push(it); ids.add(it.id); add++; } });
      setCases(cur); renderCases(); alert(`Fusionado: +${add}, saltados ${skip}.`);
    }catch{ alert("No pude leer el JSON."); }
  }

  // ===== Eventos y acciones =====
  function bind(id,fn){ const n=$(id); if(n) n.onclick=fn; }

  function wire(){
    $("g_partido")?.addEventListener("change", ()=>{ loadLocalidadesDeps(); renderTitlePreview(); });
    $("g_dep")?.addEventListener("change", ()=>{ show("g_dep_manual_wrap", val("g_dep")==="__manual__"); renderTitlePreview(); });

    ["g_fecha_dia","g_tipoExp","g_numExp","g_car","g_sub","g_ok","g_ufi","g_coord","g_relevante","g_supervisado","g_dep_manual","g_localidad"].forEach(id=>{
      const n=$(id); if(!n) return; const ev=(n.type==="checkbox"||n.tagName==="SELECT"||n.type==="date")?"change":"input";
      n.addEventListener(ev, renderTitlePreview);
    });

    bind("addCivil", ()=> CIV.addOrUpdate());
    bind("addFuerza",()=> FZA.addOrUpdate());
    bind("addObjeto",()=> OBJ.addOrUpdate());

    bind("generar", ()=> preview());

    bind("copiarWA", ()=>{
      setWaMerge(); // importante para 1 o varios
      const ids = selectedChecks();
      if(!ids.length){
        const out = preview();
        navigator.clipboard.writeText(out.waLong).then(()=>alert("Copiado para WhatsApp (una línea)"));
        return;
      }
      const joined = getCases()
        .filter(c=>ids.includes(c.id))
        .map(c=> HRFMT.buildAll(c).waLong)
        .join("\n\n"); // separación entre hechos
      navigator.clipboard.writeText(joined).then(()=>alert("Varios copiados para WhatsApp"));
    });

    bind("descargarWord", async ()=>{
      try{ await HRFMT.downloadDocx(buildData(), (window.docx||{})); }
      catch(e){ console.error(e); alert(e.message||"Error generando Word"); }
    });

    bind("downloadWordMulti", async ()=>{
      const ids=selectedChecks(); if(!ids.length){ alert("Seleccioná al menos un hecho."); return; }
      const { Document,Packer,Paragraph,TextRun,AlignmentType } = (window.docx||{});
      if(!Document){ alert("docx no cargada"); return; }
      const JUST=AlignmentType.JUSTIFIED;
      const toRuns=(str)=>{ const parts=(str||"").split(/(\*|_)/g); let B=false,I=false; const runs=[]; for(const p of parts){ if(p==="*"){B=!B;continue;} if(p==="_"){I=!I;continue;} if(!p) continue; runs.push(new TextRun({ text:p, bold:B, italics:I, underline:I?{}:undefined })); } return runs; };
      const sel = getCases().filter(c=>ids.includes(c.id));
      const children=[];
      sel.forEach((snap,i)=>{
        const b=HRFMT.buildAll(snap);
        children.push(new Paragraph({ children:[new TextRun({text:b.forDocx.titulo, bold:true})] }));
        if(b.forDocx.subtitulo) children.push(new Paragraph({ children:[new TextRun({text:b.forDocx.subtitulo, bold:true, color:b.forDocx.color})] }));
        (b.forDocx.bodyHtml||"").split(/\n\n+/).forEach(p=> children.push(new Paragraph({ children: toRuns(p), alignment: JUST, spacing:{ after:200 } })));
        if(i!==sel.length-1) children.push(new Paragraph({ text:"" }));
      });
      const doc=new Document({ styles:{ default:{ document:{ run:{ font:"Arial", size:24 } } } }, sections:[{ children }] });
      const blob=await Packer.toBlob(doc); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`Hechos_Seleccionados_${new Date().toISOString().slice(0,10)}.docx`; a.click();
    });

    bind("exportCSV", ()=>{
      const ids=selectedChecks();
      const list = ids.length ? getCases().filter(c=>ids.includes(c.id)) : [buildData()];
      HRFMT.downloadCSV(list);
    });

    bind("saveCase", ()=>{
      const snap = buildData(); const built=HRFMT.buildAll(snap);
      snap.id=freshId(); snap.name = (val("caseName").trim()) || built.forDocx.titulo;
      const cur=getCases(); cur.push(snap); setCases(cur); renderCases(); alert("Guardado.");
    });
    bind("updateCase", ()=>{
      const id=selectedRadio(); if(!id){ alert("Elegí un hecho (radio)."); return; }
      const cur=getCases(); const idx=cur.findIndex(c=>c.id===id); if(idx<0){ alert("No encontrado"); return; }
      const snap=buildData(); const built=HRFMT.buildAll(snap);
      snap.id=id; snap.name = (val("caseName").trim()) || built.forDocx.titulo;
      cur[idx]=snap; setCases(cur); renderCases(); alert("Actualizado.");
    });
    bind("deleteCase", ()=>{
      const id=selectedRadio(); if(!id){ alert("Elegí un hecho (radio)."); return; }
      const out=getCases().filter(c=>c.id!==id); setCases(out); renderCases();
    });
    bind("loadSelected", ()=>{
      const id=selectedRadio(); if(!id){ alert("Elegí un hecho (radio)."); return; }
      const s=getCases().find(x=>x.id===id); if(!s){ alert("No encontrado"); return; }
      loadSnapshot(s); renderCases(); preview(); alert("Cargado.");
    });

    // Catálogos
    $("cat_agregarPartido")?.addEventListener("click", ()=>{
      const nombre=(val("cat_partidoNuevo")||"").trim();
      if(!nombre){ alert("Escribí el nombre del nuevo partido."); return; }
      const cat=getCatalogs(); if(!cat[nombre]) cat[nombre]={ localidades:[], dependencias:[] };
      setCatalogs(cat); fillPartidos(); $("cat_partidoSel").value=nombre; setv("cat_partidoNuevo",""); loadCatEditor();
      $("g_partido").value=nombre; loadLocalidadesDeps();
    });
    $("cat_partidoSel")?.addEventListener("change", loadCatEditor);
    $("cat_guardar")?.addEventListener("click", ()=>{
      const partido=val("cat_partidoSel"); if(!partido){ alert("Elegí un partido."); return; }
      const cat=getCatalogs();
      cat[partido]={
        localidades: val("cat_localidades").split("\n").map(s=>s.trim()).filter(Boolean),
        dependencias: val("cat_dependencias").split("\n").map(s=>s.trim()).filter(Boolean)
      };
      setCatalogs(cat); fillPartidos(); if(val("g_partido")===partido) loadLocalidadesDeps();
      alert("Catálogo guardado.");
    });
    $("cat_reset")?.addEventListener("click", ()=>{
      setCatalogs(DEFAULT_CATALOGS); fillPartidos(); loadLocalidadesDeps(); loadCatEditor(); alert("Catálogos restaurados.");
    });

    document.addEventListener("keydown",(e)=>{ if(e.ctrlKey && e.key==="Enter"){ e.preventDefault(); preview(); } });

    $("backupJSON")?.addEventListener("click", exportBackupJSON);
    $("restoreJSON")?.addEventListener("click", ()=>{
      let input=document.getElementById("restoreFile"); if(!input){ input=document.createElement("input"); input.type="file"; input.id="restoreFile"; input.accept=".json"; input.hidden=true; document.body.appendChild(input); }
      input.value=""; input.click(); input.onchange=()=>{ if(input.files?.[0]) importBackupJSON(input.files[0], confirm("¿Reemplazar todo? Aceptar=Reemplaza • Cancelar=Fusiona")); };
    });
    $("mergeJSON")?.addEventListener("click", ()=>{
      let input=document.getElementById("mergeFile"); if(!input){ input=document.createElement("input"); input.type="file"; input.id="mergeFile"; input.accept=".json"; input.hidden=true; document.body.appendChild(input); }
      input.value=""; input.click(); input.onchange=()=>{ if(input.files?.[0]) importBackupJSON(input.files[0], false); };
    });
  }

  function loadSnapshot(s){
    const g=s.generales||{};
    const m=/^(\d{2})-(\d{2})-(\d{4})$/.exec(g.fecha_hora||"");
    setv("g_fecha_dia", m ? `${m[3]}-${m[2]}-${m[1]}` : "");
    setv("g_tipoExp", g.tipoExp||"PU"); setv("g_numExp", g.numExp||"");

    fillPartidos();
    setv("g_partido", g.partido||""); loadLocalidadesDeps();
    setv("g_localidad", g.localidad||"");

    const cat=getCatalogs(); const deps=(cat[g.partido||""]?.dependencias||[]);
    if(g.dependencia && !deps.includes(g.dependencia)){ setv("g_dep","__manual__"); setv("g_dep_manual", g.dependencia); show("g_dep_manual_wrap", true); }
    else{ setv("g_dep", g.dependencia||""); setv("g_dep_manual",""); show("g_dep_manual_wrap", val("g_dep")==="__manual__"); }

    setv("g_car", g.caratula||""); setv("g_sub", g.subtitulo||""); setv("g_ok", g.esclarecido?"si":"no");
    setv("g_ufi", g.ufi||""); setv("g_coord", g.coordenadas||"");
    setchk("g_relevante", !!g.relevante); setchk("g_supervisado", !!g.supervisado);

    CIV.store=(s.civiles||[]).slice(); CIV.render();
    FZA.store=(s.fuerzas||[]).slice(); FZA.render();
    OBJ.store=(s.objetos||[]).slice(); OBJ.render();
    setv("cuerpo", s.cuerpo||"");
    renderTitlePreview();
  }

  function loadCatEditor(){
    const cat=getCatalogs(); const p=val("cat_partidoSel") || Object.keys(cat)[0]; if(!p||!cat[p]) return;
    setv("cat_localidades",(cat[p].localidades||[]).join("\n"));
    setv("cat_dependencias",(cat[p].dependencias||[]).join("\n"));
  }

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", ()=>{
    fillPartidos();
    loadLocalidadesDeps();
    CIV.render(); FZA.render(); OBJ.render();
    renderTitlePreview(); renderCases(); loadCatEditor(); renderTagHelper();
    wire();
  });
})();
