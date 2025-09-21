// formatter.js — v9 con WA en una sola línea
window.HRFMT = (function () {
  const titleCase = (s) =>
    (s||"").toLowerCase().replace(/\b([a-záéíóúñü])([a-záéíóúñü]*)/gi, (_,a,b)=> a.toUpperCase()+b);
  const nonEmpty = (x)=> (x??"").toString().trim().length>0;

  function oneLineForWA(txt){
    if(!txt) return "";
    return txt.replace(/\s*\n+\s*/g," ").replace(/[ \t]{2,}/g," ").trim();
  }
  function niceName(p){
    const nombre   = titleCase(p?.nombre||"");
    const apellido = titleCase(p?.apellido||"");
    const full = [nombre, apellido].filter(Boolean).join(" ").trim();
    return full ? `*_${full}_*` : "";
  }

  function buildTitulo(d){
    const g = d.generales || {};
    const fecha = g.fecha_hora || "";
    const dep   = titleCase(g.dependencia || "");
    const car   = titleCase(g.caratula || "");
    const sub   = titleCase(g.subtitulo || "");
    const tipo  = g.tipoExp || "PU";
    const num   = (g.numExp||"").trim();

    const partes = [];
    if (fecha) partes.push(fecha);

    if (num) {
      partes.push(`${tipo} ${num}`);
      if (dep) partes.push(dep);
      if (car) partes.push(car);
      if (sub) partes.push(sub);
    } else {
      partes.push("Info DDIC Mar del Plata");
      partes.push("Adelanto");
      if (dep) partes.push(dep);
      if (car) partes.push(car);
      if (sub) partes.push(sub);
    }
    return partes.filter(nonEmpty).join(" - ");
  }

  function expandTags(d, raw){
    const civ   = d.civiles || [];
    const fza   = d.fuerzas || [];
    const objs  = d.objetos || [];
    const allPeople = civ.concat(fza);

    const ROLE = ["victima","imputado","sindicado","denunciante","testigo","pp","aprehendido","detenido","menor","nn","interviniente","damnificado institucional"];
    const OBJS = ["secuestro","sustraccion","hallazgo","otro"];

    function personByRoleIndex(role, i){
      const arr = allPeople.filter(p => (p.vinculo||"").toLowerCase()===role);
      return arr[+i] || null;
    }
    function pfByIndex(i){ return fza[+i] || null; }
    function objList(cat){ return objs.filter(o => (o.vinculo||"").toLowerCase()===cat).map(o=>o.descripcion); }

    let texto = raw || "";

    texto = texto.replace(/#(victima|imputado|sindicado|denunciante|testigo|pp|aprehendido|detenido|menor|nn|interviniente|damnificado institucional):(\d+)/gi,
      (_, rol, idx)=>{ const p=personByRoleIndex(rol.toLowerCase(), idx); return p ? niceName(p) : `#${rol}:${idx}`; });

    texto = texto.replace(/#pf:(\d+)/gi,(_,i)=>{ const p=pfByIndex(i); return p? niceName(p): `#pf:${i}`; });
    texto = texto.replace(/#pf\b/gi, ()=> fza.length ? niceName(fza[0]) : "#pf");

    OBJS.forEach(cat=>{
      const reIdx = new RegExp(`#${cat}:(\\d+)`,"gi");
      texto = texto.replace(reIdx, (_,i)=>{
        const arr = objList(cat); const o = arr[+i];
        return o ? `_${o}_` : `#${cat}:${i}`;
      });
      const re = new RegExp(`#${cat}\\b`,"gi");
      texto = texto.replace(re, ()=>{
        const arr = objList(cat);
        return arr.length ? `_${arr.join(", ")}_` : `#${cat}`;
      });
    });

    return texto;
  }

  function buildAll(data){
    const d = data || {};
    const g = d.generales || {};
    const tituloPlano = buildTitulo(d);
    let cuerpo = expandTags(d, d.cuerpo||"");

    const waBody = oneLineForWA(cuerpo);
    const waTitle = `*${tituloPlano}*`;
    const wa = `${waTitle} ${g.subtitulo ? titleCase(g.subtitulo)+" " : ""}${waBody}`.trim();

    const bodyDocx = (cuerpo||"").replace(/\r/g,"").trim();

    return {
      waLong: wa,
      html: wa,
      forDocx: {
        titulo: tituloPlano,
        subtitulo: titleCase(g.subtitulo||""),
        color: g.esclarecido ? "00AEEF" : "FF3B30",
        bodyHtml: bodyDocx
      }
    };
  }

  function downloadCSV(list){
    const rows = [];
    rows.push(["Nombre","Fecha","Tipo","Número","Partido","Localidad","Dependencia","Carátula","Subtítulo","Cuerpo"].join(","));
    (list||[]).forEach(s=>{
      const g=s.generales||{};
      const safe=(x)=>`"${(x||"").toString().replace(/"/g,'""')}"`;
      rows.push([
        s.name||"", g.fecha_hora||"", g.tipoExp||"", g.numExp||"",
        g.partido||"", g.localidad||"", g.dependencia||"",
        g.caratula||"", g.subtitulo||"", (s.cuerpo||"").replace(/\n/g," \\n ")
      ].map(safe).join(","));
    });
    const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="hechos.csv"; a.click();
  }

  async function downloadDocx(snap, docxLib){
    const { Document, Packer, Paragraph, TextRun, AlignmentType } = docxLib||{};
    if(!Document) throw new Error("docx no cargada");
    const JUST = AlignmentType.JUSTIFIED;
    const built = buildAll(snap);

    function mdRuns(str){
      const parts=(str||"").split(/(\*|_)/g);
      let B=false,I=false; const runs=[];
      for(const p of parts){
        if(p==="*"){ B=!B; continue; }
        if(p==="_"){ I=!I; continue; }
        if(!p) continue;
        runs.push(new TextRun({ text:p, bold:B, italics:I, underline:I?{}:undefined }));
      }
      return runs;
    }

    const children=[];
    children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.titulo, bold:true }) ] }));
    if(built.forDocx.subtitulo){
      children.push(new Paragraph({ children:[ new TextRun({ text: built.forDocx.subtitulo, bold:true, color: built.forDocx.color }) ] }));
    }
    (built.forDocx.bodyHtml||"").split(/\n\n+/).forEach(p=>{
      children.push(new Paragraph({ children: mdRuns(p), alignment: JUST, spacing:{ after:200 } }));
    });

    const doc=new Document({
      styles:{ default:{ document:{ run:{ font:"Arial", size:24 } } } },
      sections:[{ children }]
    });
    const blob=await Packer.toBlob(doc);
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`Hecho_${new Date().toISOString().slice(0,10)}.docx`; a.click();
  }

  return { buildAll, downloadCSV, downloadDocx };
})();
