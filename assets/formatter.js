// ===== Formatter =====
const HRFMT = (() => {
  // Capitalizar solo primera letra
  const TitleCase = (s) =>
    (s || "")
      .toLowerCase()
      .split(/(\s|-)/)
      .map((p) => {
        if (p.trim() === "" || p === "-") return p;
        return p.charAt(0).toUpperCase() + p.slice(1);
      })
      .join("");

  function personaFmt(p) {
    const nombre = TitleCase(p.nombre || "");
    const apellido = TitleCase(p.apellido || "");
    const edad = p.edad ? ` (${p.edad})` : "";
    const nac = p.pais ? ` ${TitleCase(p.pais)}` : "";
    const dom = [p.calle_domicilio, p.loc_domicilio].filter(Boolean).map(TitleCase).join(", ");
    const domStr = dom ? ` – ${dom}` : "";
    return `*${nombre} ${apellido}${edad}${nac}${domStr}*`;
  }

  function objetoFmt(o) {
    return `_${o.descripcion}_`; // WA: cursiva; en DOCX además subrayado
  }

  function buildAll(data) {
    const g = data.generales || {};
    const civiles = data.civiles || [];
    const fuerzas = data.fuerzas || [];
    const objetos = data.objetos || [];
    let cuerpo = data.cuerpo || "";

    const fecha = g.fecha_hora || "";
    const dep   = g.dependencia ? TitleCase(g.dependencia) : "";
    const puFull = g.pu || "";
    const car   = g.caratula ? TitleCase(g.caratula) : "";
    const sub   = g.subtitulo ? TitleCase(g.subtitulo) : "";

    // Título (sin mayúsculas completas, solo iniciales)
    let titulo = "";
    if (puFull) {
      titulo = `${fecha} - ${puFull} - ${dep} - ${car}${sub ? ` - ${sub}` : ""}`;
    } else {
      const info = "Info DDIC Mar del Plata - Adelanto";
      titulo = `${fecha} - ${info}${dep ? ` - ${dep}` : ""} - ${car}${sub ? ` - ${sub}` : ""}`;
    }
    const tituloWA = `*${titulo}*`;

    // Reemplazos por etiquetas
    civiles.forEach((p, i) => {
      ["victima","imputado","sindicado","denunciante","testigo","aprehendido","detenido","menor","nn","pp","damnificado institucional"]
        .forEach(tag => { cuerpo = cuerpo.replaceAll(`#${tag}:${i}`, personaFmt(p)); });
    });
    fuerzas.forEach((f, i) => {
      ["pf","interviniente","aprehendido","detenido"].forEach(tag => {
        cuerpo = cuerpo.replaceAll(`#${tag}:${i}`, personaFmt(f));
      });
    });
    objetos.forEach((o, i) => {
      const tag = `#${(o.vinculo || "").toLowerCase()}:${i}`;
      cuerpo = cuerpo.replaceAll(tag, objetoFmt(o));
    });

    // WhatsApp (sin línea en blanco extra)
    const waLong = `${tituloWA}\n${cuerpo}`;

    // Para DOCX
    const forDocx = {
      titulo: titulo,
      subtitulo: sub,
      color: g.esclarecido ? "0000FF" : "FF0000",
      bodyHtml: cuerpo
    };

    return { waLong, forDocx, html: waLong };
  }

  async function downloadDocx(data, docxLib) {
    const { Document, Packer, TextRun, Paragraph, AlignmentType } = docxLib;
    if (!Document) { alert("Librería docx no cargada"); return; }

    const built = buildAll(data);

    // Parse de * y _ a negrita / cursiva (+ subrayado cuando cursiva)
    const toRuns = (txt) => {
      const parts = (txt || "").split(/(\*|_)/g);
      let B = false, I = false; const runs = [];
      for (const part of parts) {
        if (part === "*") { B = !B; continue; }
        if (part === "_") { I = !I; continue; }
        if (!part) continue;
        runs.push(new TextRun({ text: part, bold: B, italics: I, underline: I ? {} : undefined }));
      }
      return runs;
    };

    const JUST = AlignmentType.JUSTIFIED;

    const children = [];
    children.push(new Paragraph({ children: [new TextRun({ text: built.forDocx.titulo, bold: true })] }));
    if (built.forDocx.subtitulo) {
      children.push(new Paragraph({ children: [new TextRun({ text: built.forDocx.subtitulo, bold: true, color: built.forDocx.color })] }));
    }
    (built.forDocx.bodyHtml || "").split(/\n\n+/).forEach(p => {
      children.push(new Paragraph({ children: toRuns(p), alignment: JUST, spacing: { after: 200 } }));
    });

    const doc = new Document({
      styles: { default: { document: { run: { font: "Arial", size: 24 }, paragraph: { spacing: { after: 120 } } } } },
      sections: [{ children }]
    });

    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Hecho_${new Date().toISOString().slice(0,10)}.docx`;
    a.click();
  }

  function downloadCSV(list) {
    const rows = [];
    rows.push(["Fecha","PU","Partido","Localidad","Dependencia","Carátula","Subtítulo"]);
    list.forEach((c) => {
      rows.push([
        c.generales?.fecha_hora || "",
        c.generales?.pu || "",
        c.generales?.partido || "",
        c.generales?.localidad || "",
        c.generales?.dependencia || "",
        c.generales?.caratula || "",
        c.generales?.subtitulo || "",
      ]);
    });
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hechos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return { buildAll, downloadDocx, downloadCSV };
})();
