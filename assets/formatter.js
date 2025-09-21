// ===== FORMATTER =====
const HRFMT = (()=>{

  // Capitaliza nombres propios (primera letra mayúscula, resto minúscula)
  const TitleCase = (s)=> (s||"")
    .toLowerCase()
    .split(/(\s|-)/)
    .map(p=>{
      if(p.trim()===""||p==='-') return p;
      return p.charAt(0).toUpperCase()+p.slice(1);
    }).join("");

  // Normaliza texto para WhatsApp y Word
  function formatPerson(p){
    const nombre = TitleCase(`${p.nombre||""} ${p.apellido||""}`.trim());
    return `*_${nombre}_*${p.edad?`, ${p.edad} años`:''}${p.dni?`, DNI ${p.dni}`:''}`;
  }

  function formatFuerza(f){
    const nombre = TitleCase(`${f.nombre||""} ${f.apellido||""}`.trim());
    return `*_${nombre}_* (${f.fuerza||''} ${f.jerarquia||''} ${f.legajo?`Legajo ${f.legajo}`:''})`;
  }

  function formatObjeto(o){
    const desc = o.descripcion||"";
    return `_${desc}_`; // cursiva
  }

  function formatObjetoSub(o){
    const desc = o.descripcion||"";
    return `_${desc}_`; // para Word + subrayado más abajo
  }

  // Construye texto para WhatsApp, Word y CSV
  function buildAll(data){
    const g = data.generales||{};
    const civiles = data.civiles||[];
    const fuerzas = data.fuerzas||[];
    const objetos = data.objetos||[];
    const cuerpo = (data.cuerpo||"").trim();

    // ===== Título =====
    let titulo;
    if(!g.numExp){
      titulo = `${g.fecha_hora||""} - Info DDIC Mar del Plata - Adelanto ${g.dependencia||""} - ${g.caratula||""}`;
    } else {
      titulo = `${g.fecha_hora||""} - ${g.pu||""} - ${g.dependencia||""} - ${g.caratula||""}`;
    }
    titulo = TitleCase(titulo);

    // ===== Subtítulo =====
    const subtitulo = g.subtitulo ? g.subtitulo : "";

    // ===== Cuerpo =====
    let bodyWA = "";
    if(cuerpo) bodyWA += cuerpo + "\n";

    // Personas
    civiles.forEach((p,i)=>{
      bodyWA = bodyWA.replaceAll(`#${(p.vinculo||"").toLowerCase()}:${i}`, formatPerson(p));
    });
    fuerzas.forEach((f,i)=>{
      bodyWA = bodyWA.replaceAll(`#pf:${i}`, formatFuerza(f));
    });

    // Objetos
    objetos.forEach((o,i)=>{
      const tag = `#${(o.vinculo||"").toLowerCase()}:${i}`;
      bodyWA = bodyWA.replaceAll(tag, formatObjeto(o));
    });

    // ===== WhatsApp =====
    const waLong = `*${titulo}*\n${subtitulo}\n${bodyWA}`;

    // ===== Word =====
    const bodyHtml = bodyWA
      .replace(/\n/g,"\n\n");

    const forDocx = {
      titulo: titulo,
      subtitulo: subtitulo,
      color: g.esclarecido ? "0000FF" : "FF0000",
      bodyHtml
    };

    // ===== CSV =====
    const forCSV = {
      Fecha: g.fecha_hora,
      Numero: g.pu,
      Dependencia: g.dependencia,
      Caratula: g.caratula,
      Subtitulo: g.subtitulo,
      UFI: g.ufi,
      Coordenadas: g.coordenadas,
      Relevante: g.relevante ? "SI":"NO",
      Supervisado: g.supervisado ? "SI":"NO",
      Civiles: civiles.map(p=>`${p.vinculo}: ${p.nombre} ${p.apellido}`).join("; "),
      Fuerzas: fuerzas.map(f=>`${f.vinculo}: ${f.nombre} ${f.apellido}`).join("; "),
      Objetos: objetos.map(o=>`${o.vinculo}: ${o.descripcion}`).join("; "),
      Cuerpo: cuerpo
    };

    return { waLong, html: waLong, forDocx, forCSV };
  }

  // ===== Export CSV =====
  function downloadCSV(list){
    if(!list || !list.length){ alert("Nada para exportar."); return; }
    const rows = list.map(snap=> buildAll(snap).forCSV);
    const cols = Object.keys(rows[0]);
    const csv = [cols.join(",")].concat(rows.map(r=>cols.map(c=>JSON.stringify(r[c]||"")).join(","))).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`hechos_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  // ===== Export Word =====
  async function downloadDocx(data,docx){
    const { Document, Packer, TextRun, Paragraph, AlignmentType } = docx;
    if(!Document){ alert("docx no cargada"); return; }
    const built = buildAll(data);

    const toRuns = (txt)=> [new TextRun({text:txt})];

    const doc = new Document({
      styles:{ default:{ document:{ run:{ font:"Arial", size:24 }, paragraph:{ spacing:{ after:120 } } } } },
      sections:[{
        children:[
          new Paragraph({ children:[ new TextRun({ text: built.forDocx.titulo, bold:true }) ] }),
          new Paragraph({ children:[ new TextRun({ text: built.forDocx.subtitulo, bold:true, color: built.forDocx.color }) ] }),
          ...built.forDocx.bodyHtml.split(/\n\n+/).map(p=>
            new Paragraph({ children: toRuns(p), alignment: AlignmentType.JUSTIFIED, spacing:{ after:200 } })
          )
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`Hecho_${new Date().toISOString().slice(0,10)}.docx`; a.click();
  }

  return { buildAll, downloadCSV, downloadDocx };
})();
