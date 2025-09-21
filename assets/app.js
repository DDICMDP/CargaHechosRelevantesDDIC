// assets/app.js
(function(){
  const $ID = id=>document.getElementById(id);
  const val = id=>$ID(id)?.value||"";
  const setv=(id,v)=>{if($ID(id))$ID(id).value=v;};
  const chk=id=>!!$ID(id)?.checked;
  const setchk=(id,v)=>{if($ID(id))$ID(id).checked=!!v;};
  const $$=sel=>Array.from(document.querySelectorAll(sel));

  const CASEKEY="hr_cases_v1";

  const getCases=()=>{try{return JSON.parse(localStorage.getItem(CASEKEY)||"[]");}catch{return[];}};
  const setCases=a=>localStorage.setItem(CASEKEY,JSON.stringify(a));
  const freshId=()=> "c_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);

  function renderCases(){
    const box=$ID("casesList"); if(!box) return;
    const cases=getCases();
    if(!cases.length){box.innerHTML="Sin hechos guardados.";return;}
    box.innerHTML=`<table><thead><tr><th></th><th></th><th>Nombre</th><th>Fecha</th><th>Tipo</th><th>Número</th><th>Partido</th><th>Dep.</th></tr></thead><tbody>${
      cases.map(c=>`<tr>
        <td><input type="checkbox" class="caseCheck" data-id="${c.id}"></td>
        <td><input type="radio" name="caseSel" data-id="${c.id}"></td>
        <td>${c.name||''}</td>
        <td>${c.generales?.fecha_hora||''}</td>
        <td>${c.generales?.tipoExp||''}</td>
        <td>${c.generales?.numExp||''}</td>
        <td>${c.generales?.partido||''}</td>
        <td>${c.generales?.dependencia||''}</td>
      </tr>`).join("")}</tbody></table>`;
  }

  function buildDataFromForm(){
    return {
      generales:{
        fecha_hora: val("g_fecha_dia").split("-").reverse().join("-"),
        tipoExp: val("g_tipoExp"),
        numExp: val("g_numExp"),
        partido: val("g_partido"),
        localidad: val("g_localidad"),
        dependencia: val("g_dep")==="__manual__"?val("g_dep_manual"):val("g_dep"),
        caratula: val("g_car"),
        subtitulo: val("g_sub"),
        esclarecido: val("g_ok")==="si",
        ufi: val("g_ufi"),
        coordenadas: val("g_coord"),
        relevante: chk("g_relevante"),
        supervisado: chk("g_supervisado")
      },
      civiles:[], fuerzas:[], objetos:[],
      cuerpo: val("cuerpo")
    };
  }

  function preview(){
    const data=buildDataFromForm();
    const out=HRFMT.buildAll(data);
    return out;
  }

  const selectedRadio=()=>{const r=document.querySelector('input[name="caseSel"]:checked');return r?r.getAttribute("data-id"):null;};
  const selectedChecks=()=>$$(".caseCheck:checked").map(x=>x.getAttribute("data-id"));

  const bind=(id,fn)=>{const n=$ID(id);if(n)n.onclick=fn;};

  bind("copiarWA",()=>{
    const ids=selectedChecks();
    if(!ids.length){
      const out=preview();
      navigator.clipboard.writeText(out.waLong).then(()=>alert("Copiado"));
      return;
    }
    const list=getCases().filter(c=>ids.includes(c.id));
    const textos=list.map(c=>HRFMT.buildAll(c).waLong).join("\n\n");
    navigator.clipboard.writeText(textos).then(()=>alert("Varios copiados"));
  });

  bind("descargarWord",async()=>{
    try{await HRFMT.downloadDocx(buildDataFromForm(),window.docx||{});}
    catch(e){alert("Error Word");}
  });

  bind("downloadWordMulti",async()=>{
    const ids=selectedChecks(); if(!ids.length){alert("Seleccioná hechos");return;}
    const docx=window.docx||{};const {Document,Packer,Paragraph,TextRun,AlignmentType}=docx;
    const selected=getCases().filter(c=>ids.includes(c.id));
    const children=[];
    selected.forEach((s,i)=>{
      const b=HRFMT.buildAll(s);
      children.push(new Paragraph({children:[new TextRun({text:b.forDocx.titulo,bold:true})]}));
      children.push(new Paragraph({children:[new TextRun({text:b.forDocx.subtitulo,bold:true,color:b.forDocx.color})]}));
      (b.forDocx.bodyHtml||"").split(/\n+/).forEach(p=>{
        children.push(new Paragraph({children:[new TextRun({text:p})],alignment:AlignmentType.JUSTIFIED}));
      });
      if(i!==selected.length-1)children.push(new Paragraph({text:""}));
    });
    const doc=new Document({sections:[{children}]});
    const blob=await Packer.toBlob(doc);
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download="hechos.docx";a.click();
  });

  bind("exportCSV",()=>{
    const ids=selectedChecks();const list=ids.length?getCases().filter(c=>ids.includes(c.id)):[buildDataFromForm()];
    HRFMT.downloadCSV(list);
  });

  bind("saveCase",()=>{
    const snap=buildDataFromForm();snap.id=freshId();snap.name=HRFMT.buildAll(snap).forDocx.titulo;
    const cases=getCases();cases.push(snap);setCases(cases);renderCases();alert("Guardado");
  });

  bind("updateCase",()=>{
    const id=selectedRadio();if(!id){alert("Elegí");return;}
    const cases=getCases();const idx=cases.findIndex(c=>c.id===id);if(idx<0)return;
    const snap=buildDataFromForm();snap.id=id;snap.name=HRFMT.buildAll(snap).forDocx.titulo;
    cases[idx]=snap;setCases(cases);renderCases();alert("Actualizado");
  });

  bind("deleteCase",()=>{
    const id=selectedRadio();if(!id)return;
    setCases(getCases().filter(c=>c.id!==id));renderCases();
  });

  bind("loadSelected",()=>{
    const id=selectedRadio();if(!id)return;
    alert("Carga manual en esta demo");
  });

  document.addEventListener("DOMContentLoaded",()=>renderCases());
})();

