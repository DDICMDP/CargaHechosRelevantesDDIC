/*!
 * HRFMT v1 — Generador de Hechos Relevantes (WA + DOCX + CSV)
 * Requiere opcionalmente: window.docx (docx@^8)
 */
window.HRFMT = (function(){
  const TitleCase = (s)=> (s||"").toLowerCase().split(/(\s|-)/).map(p=>{
    if(p.trim()===""||p==='-') return p;
    return p.charAt(0).toUpperCase()+p.slice(1);
  }).join("");

  function peopleByRole(data, role){
    const all = [].concat(data.civiles||[], data.fuerzas||[]);
    return all.filter(p => String(p.vinculo||"").toLowerCase() === role);
  }
  function personFmt(p){
    const dom = [TitleCase(p.calle_domicilio||p.domicilio||""), TitleCase(p.loc_domicilio||p.ciudad||"")].filter(Boolean);
    const base = `${TitleCase(p.nombre||"")} ${TitleCase(p.apellido||"")}`.trim();
    return `<strong>${base}${p.edad?` (${p.edad})`:""}${dom.length?` – ${dom.join(", ")}`:""}</strong>`;
  }
  function forceFmt(p){
    const base = `${TitleCase(p.nombre||"")} ${TitleCase(p.apellido||"")}`.trim();
    const edad = p.edad ? ` (${p.edad})` : "";
    const ficha = [
      p.fuerza ? TitleCase(p.fuerza) : "",
      p.jerarquia ? TitleCase(p.jerarquia) : "",
      p.legajo ? `Legajo ${p.legajo}` : "",
      p.destino ? `Destino ${TitleCase(p.destino)}` : ""
    ].filter(Boolean).join(", ");
    const dom = [TitleCase(p.calle_domicilio||""), TitleCase(p.loc_domicilio||"")].filter(Boolean).join(", ");
    const cola = [ficha, dom].filter(Boolean).join(" – ");
    return `<strong>${base}${edad}${cola?` – ${cola}`:""}</strong>`;
  }

  const OBJ_CATS = ["secuestro","sustraccion","hallazgo","otro"];
  function objectsByCat(data, cat){
    const v = (data.objetos||[]);
    const want = String(cat||"").toLowerCase();
    return v.filter(o => String(o.vinculo||"").toLowerCase() === want)
            .map(o => (o.descripcion||"").trim())
            .filter(Boolean);
  }
  function objectFmt(desc){ return `<em><u>${desc}</u></em>`; }
  function objectsListHtml(data, cat){
    const items = objectsByCat(data, cat);
    if(!items.length) return "";
    return `<em><u>${items.join("; ")}</u></em>`;
  }

  function applyPlaceholders(body, data){
    if(!body) return "";
    let txt = body;

    const roles = ["victima","imputado","sindicado","denunciante","testigo","pp","aprehendido","detenido","menor","nn","damnificado institucional"];
    roles.forEach(role=>{
      const arr = peopleByRole(data, role);
      txt = txt.replace(new RegExp(`#${role}:(\\d+)`,"gi"), (m,idxStr)=>{
        const idx = parseInt(idxStr,10);
        const p = arr[idx];
        return p ? personFmt(p) : m;
      });
    });

    if (Array.isArray(data.fuerzas)) {
      txt = txt.replace(/#pf:(\d+)/gi, (m, idxStr)=>{
        const idx = parseInt(idxStr, 10);
        const p = data.fuerzas[idx];
        return p ? forceFmt(p) : m;
      });
      txt = txt.replace(/#pf(?!:)/gi, ()=>{
        if(!data.fuerzas.length) return "";
        return data.fuerzas.map(forceFmt).join("; ");
      });
    }

    OBJ_CATS.forEach(cat=>{
      const arr = objectsByCat(data, cat);
      const re = new RegExp(`#${cat}:(\\d+)`,"gi");
      txt = txt.replace(re, (m,idxStr)=>{
        const idx = parseInt(idxStr,10);
        const it = arr[idx];
        return it ? objectFmt(it) : m;
      });
    });
    OBJ_CATS.forEach(cat=>{
      const re = new RegExp(`#${cat}(?!:)`,"gi");
      txt = txt.replace(re, objectsListHtml(data, cat));
    });

    txt = txt.replace(/!(.+?)!/g, "<u>$1</u>");
    return txt;
  }

  // === Copiado a WhatsApp: configurable ===
  function htmlToWA(html, {mergeSoftBreaks=true} = {}){
    let s = html || "";

    // marcado -> WA
    s = s.replace(/<em><u>(.*?)<\/u><\/em>/gis, '_$1_');
    s = s.replace(/<u><em>(.*?)<\/em><\/u>/gis, '_$1_');
    s = s.replace(/<strong>(.*?)<\/strong>/gis, '*$1*');
    s = s.replace(/<em>(.*?)<\/em>/gis, '_$1_');
    s = s.replace(/<u>(.*?)<\/u>/gis, '$1');
    s = s.replace(/<[^>]+>/g, '');

    s = s.replace(/\r/g, '');

    if (mergeSoftBreaks) {
      s = s.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
      s = s.replace(/\n{3,}/g, '\n\n');
      s = s.replace(/\n\n/g, '<<P>>'); // marcador de párrafo
      s = s.replace(/\n/g, ' ');       // salto simple -> espacio
      s = s.replace(/<<P>>/g, '\n\n'); // restaurar párrafos
      s = s.replace(/[ \t]{2,}/g, ' ');
    } else {
      // Mantener saltos tal cual, pero no dejar más de 2 seguidos
      s = s.replace(/\n{3,}/g, '\n\n');
    }

    return s.trim();
  }

  function buildTitle(data){
    const g = data.generales||{};
    return [g.fecha_hora, g.pu, g.dependencia, g.caratula].filter(Boolean).join(" – ");
  }

  function buildAll(data){
    const g = data.generales||{};
    const titulo = buildTitle(data);
    const subt = g.subtitulo||"";
    const bodyHtml = applyPlaceholders(data.cuerpo||"", data);

    const badge = `<span class="badge ${g.esclarecido?'blue':'red'}"><strong>${subt}</strong></span>`;
    const html = `<strong>${titulo.toUpperCase()}</strong>\n${badge}\n${bodyHtml}`;

    const merge = (window.WA_MERGE_SOFTBREAKS !== false); // por defecto true
    const waHeader1 = `*${titulo}*`;
    const waHeader2 = `*${subt}*`;
    const waBody = htmlToWA(bodyHtml, {mergeSoftBreaks: merge});
    const waShort = `${waHeader1}\n${waHeader2}`;
    const waLong  = `${waHeader1}\n${waHeader2}\n${waBody}`;

    return { html, waShort, waLong, forDocx: { titulo: titulo.toUpperCase(), subtitulo: subt, bodyHtml, color: g.esclarecido ? "2e86ff" : "ff4d4d" } };
  }

  async function downloadDocx(data, docxNS){
    const { Document, Packer, TextRun, Paragraph, AlignmentType } = docxNS || {};
    if(!Document) throw new Error("docx no cargada");
    const built = buildAll(data);

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
    const paras = (built.forDocx.bodyHtml||"").split(/\n\n+/).map(p=> new Paragraph({ children: toRuns(p), alignment: JUST, spacing:{after:200} }));

    const doc = new Document({
      styles: { default:{ document:{ run:{ font:"Arial", size:24 }, paragraph:{ spacing: { after:120 } } } } },
      sections: [{
        children: [
          new Paragraph({ children:[ new TextRun({ text: built.forDocx.titulo, bold:true }) ] }),
          new Paragraph({ children:[ new TextRun({ text: built.forDocx.subtitulo, bold:true, color: built.forDocx.color }) ] }),
          ...paras
        ]
      }]
    });

    const pu = (data.generales?.pu || "sinPU").replace(/\s+/g,'_');
    const blob = await Packer.toBlob(doc);
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`Hecho_Relevante_${pu}.docx`; a.click();
  }

  function downloadCSV(list){
    const header = ["fecha","pu","dependencia","caratula","subtitulo","esclarecido","relevante","supervisado","ufi","partido","localidad","coordenadas","victimas","imputados","denunciantes","secuestro","sustraccion","hallazgo","otro"];
    const rows = [header];
    const getPersons = (data, role)=> peopleByRole(data, role).map(p=>`${TitleCase(p.nombre||"")} ${TitleCase(p.apellido||"")}${p.edad?` (${p.edad})`:""}`.trim()).join(" | ");
    const getCat = (data, cat)=> objectsByCat(data, cat).join(" | ");

    (list||[]).forEach(d=>{
      const g=d.generales||{};
      rows.push([
        g.fecha_hora||"", g.pu||"", g.dependencia||"", g.caratula||"", g.subtitulo||"",
        g.esclarecido? "si":"no",
        g.relevante? "si":"no",
        g.supervisado? "si":"no",
        g.ufi||"", g.partido||"", g.localidad||"", g.coordenadas||"",
        getPersons(d,"victima"),
        getPersons(d,"imputado"),
        getPersons(d,"denunciante"),
        getCat(d,"secuestro"),
        getCat(d,"sustraccion"),
        getCat(d,"hallazgo"),
        getCat(d,"otro")
      ]);
    });

    const csv = rows.map(r=> r.map(v=>{
      const s=String(v??"");
      return /[\",;\n]/.test(s) ? `"${s.replace(/\"/g,'\"\"')}"` : s;
    }).join(";")).join("\n");

    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`Hechos_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  return { buildAll, downloadDocx, downloadCSV, htmlToWA };
})();
