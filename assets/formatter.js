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

  // ===== Personas =====
  function personaFmt(p) {
    const nombre = TitleCase(p.nombre || "");
    const apellido = TitleCase(p.apellido || "");
    const edad = p.edad ? ` (${p.edad})` : "";
    const nac = p.pais ? ` ${TitleCase(p.pais)}` : "";
    const dom = [p.calle_domicilio, p.loc_domicilio]
      .filter(Boolean)
      .map(TitleCase)
      .join(", ");
    const domStr = dom ? ` – ${dom}` : "";
    return `*${nombre} ${apellido}${edad}${nac}${domStr}*`;
  }

  // ===== Objetos =====
  function objetoFmt(o) {
    return `_${o.descripcion}_`; // en WhatsApp cursiva, en Word se pondrá cursiva+subrayado
  }

  // ===== Construcción del texto =====
  function buildAll(data) {
    const g = data.generales || {};
    const civiles = data.civiles || [];
    const fuerzas = data.fuerzas || [];
    const objetos = data.objetos || [];
    let cuerpo = data.cuerpo || "";

    // Fecha
    const fecha = g.fecha_hora || "";

    // Dependencia
    const dep = g.dependencia ? TitleCase(g.dependencia) : "";

    // PU
    const puFull = g.pu || "";

    // Carátula
    const car = g.caratula ? TitleCase(g.caratula) : "";

    // Subtítulo
    const sub = g.subtitulo ? TitleCase(g.subtitulo) : "";

    // ===== Construir título =====
    let titulo = "";
    if (puFull) {
      titulo = `${fecha} - ${puFull} - ${dep} - ${car}`;
    } else {
      titulo = `${fecha} - Info DDIC Mar del Plata - Adelanto ${dep} - ${car}`;
    }
    titulo = `*${titulo}*`;

    // ===== Sustituir etiquetas en cuerpo =====
    civiles.forEach((p, i) => {
      const tag = `#victima:${i}`;
      cuerpo = cuerpo.replaceAll(tag, personaFmt(p));
    });
    fuerzas.forEach((f, i) => {
      const tag = `#pf:${i}`;
      cuerpo = cuerpo.replaceAll(tag, personaFmt(f));
    });
    objetos.forEach((o, i) => {
      const tag = `#${(o.vinculo || "").toLowerCase()}:${i}`;
      cuerpo = cuerpo.replaceAll(tag, objetoFmt(o));
    });

    // ===== Para WhatsApp =====
    const waLong = `${titulo}\n${sub}\n\n${cuerpo}`;

    // ===== Para Word =====
    const forDocx = {
      titulo: titulo.replace(/\*/g, ""),
      subtitulo: sub,
      color: g.esclarecido ? "0000FF" : "FF0000", // Azul o rojo
      bodyHtml: cuerpo
    };

    return { waLong, forDocx, html: waLong };
  }

  // ===== Descargar Word de un hecho =====
  async function downloadDocx(data, docxLib) {
    const { Document, Packer, TextRun, Paragraph, AlignmentType } = docxLib;
    if (!Document) {
      alert("Librería docx no cargada");
      return;
    }

    const built = buildAll(data);

    // Convertir body a runs
    const toRuns = (txt) => {
      const parts = txt.split(/(\*|_)/g);
      let bold = false,
        ital = false;
      const runs = [];
      for (const part of parts) {
        if (part === "*") {
          bold = !bold;
          continue;
        }
        if (part === "_") {
          ital = !ital;
          continue;
        }
        if (!part) continue;
        runs.push(
          new TextRun({
            text: part,
            bold,
            italics: ital,
            underline: ital ? {} : undefined, // subrayado si es italics
          })
        );
      }
      return runs;
    };

    const JUST = AlignmentType.JUSTIFIED;

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: "Arial", size: 24 },
            paragraph: { spacing: { after: 120 } },
          },
        },
      },
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: built.forDocx.titulo, bold: true })],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: built.forDocx.subtitulo,
                  bold: true,
                  color: built.forDocx.color,
                }),
              ],
            }),
            new Paragraph({
              children: toRuns(built.forDocx.bodyHtml),
              alignment: JUST,
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Hecho_${new Date().toISOString().slice(0, 10)}.docx`;
    a.click();
  }

  // ===== Descargar CSV =====
  function downloadCSV(list) {
    const rows = [];
    rows.push([
      "Fecha",
      "PU",
      "Partido",
      "Localidad",
      "Dependencia",
      "Carátula",
      "Subtítulo",
    ]);
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
    a.download = `hechos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return { buildAll, downloadDocx, downloadCSV };
})();
