// assets/formatter.js
const HRFMT = (()=>{

  const capWords = (str="") =>
    str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  function renderPerson(p){
    let txt = `${capWords(p.nombre||"")} ${capWords(p.apellido||"")}`;
    if(p.edad) txt += ` (${p.edad})`;
    if(p.dni) txt += `, DNI ${p.dni}`;
    return `*_${txt.trim()}_*`;
  }

  function renderObject(o){
    let txt = o.descripcion || "";
    return `_*${txt}*_`;
  }

  function buildTitle(data){
    const g = data.generales||{};
    let fecha = g.fecha_hora || "";
    let car = capWords(g.caratula||"");
    let sub = capWords(g.subtitulo||"");
    let dep = g.dependencia || "";
    let tipo = g.tipoExp || "PU";
    let num  = g.numExp || "";

    if(num){
      return `*${fecha} - ${tipo} ${num} - ${dep} - ${car}${sub?(" - "+sub):""}*`;
    }else{
      return `*${fecha} - Info DDIC Mar del Plata - Adelanto ${dep} - ${car}${sub?(" - "+sub):""}*`;
    }
  }

  function buildBody(data){
    let cuerpo = data.cuerpo||"";
    const civs = data.civiles||[];
    const objs = data.objetos||[];

    civs.forEach((p,i)=>{
      const tag = new RegExp(`#victima:${i}`,"g");
      cuerpo = cuerpo.replace(tag, renderPerson(p));
    });

    objs.forEach((o,i)=>{
      const tag = new RegExp(`#${o.vinculo.toLowerCase()}:${i}`,"g");
      cuerpo = cuerpo.replace(tag, renderObject(o));
    });

    return cuerpo;
  }

  function buildAll(data){
    return {
      html: buildTitle(data) + "<br>" + buildBody(data),
      waLong: buildTitle(data) + "\n" + buildBody(data),
      forDocx: {
        titulo: buildTitle(data),
        subtitulo: capWords(data.generales?.subtitulo||""),
        color: data.generales?.esclarecido ? "0000FF" : "FF0000",
        bodyHtml: buildBody(data)
      }
    };
  }

  function downloadCSV(list){
    const rows = [["Fecha","Tipo","Número","Partido","Localidad","Dependencia","Carátula","Subtítulo"]];
    list.forEach(c=>{
      const g=c.generales||{};
      rows.push([g.fecha_hora,g.tipoExp,g.numExp,g.partido,g.localidad,g.dependencia,g.caratula,g.subtitulo]);
    });
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="hechos.csv";
    a.click();
  }

  async function downloadDocx(data, docx){
    const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;
    const built = buildAll(data);
    const children=[
      new Paragraph({children:[new TextRun({text:built.forDocx.titulo,bold:true})]}),
      new Paragraph({children:[new TextRun({text:built.forDocx.subtitulo,bold:true,color:built.forDocx.color})]})
    ];
    (built.forDocx.bodyHtml||"").split(/\n+/).forEach(p=>{
      children.push(new Paragraph({children:[new TextRun({text:p})],alignment:AlignmentType.JUSTIFIED}));
    });
    const doc=new Document({
      styles:{default:{document:{run:{font:"Arial",size:24}}}},
      sections:[{children}]
    });
    const blob=await Packer.toBlob(doc);
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="hecho.docx";
    a.click();
  }

  return {buildAll,downloadCSV,downloadDocx};
})();
