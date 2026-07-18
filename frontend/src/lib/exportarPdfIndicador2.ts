// ── Generación del PDF de resultados de Indicador 11.2 (Seguimiento de Syllabus) ──
// Porteado del módulo jsPDF de ucsg_caces.git (frontend/src/app/App.tsx,
// generarPdfAsignatura + helpers de dibujo). Mismo diseño y estructura que el
// reporte de referencia: encabezado con metadatos, donut + barras por EF,
// nota metodológica, tabla de fuentes por EF, detalle de encuesta (EF1/EF4),
// tabla de evidencia documental (EF2/EF3/EF5) y anexo de las 23 preguntas.
//
// Sin html2canvas: todo se dibuja directo con primitivas de jsPDF (igual que
// el original), así el alto de cada bloque se mide a partir del texto real
// antes de dibujar, en vez de coordenadas fijas.
//
// Diferencia respecto al original: ahí la evidencia documental salía de un
// array `Evidencia[]` con campo `tipo` (mecanismo por asignatura). Acá la
// evidencia de EF2/EF3/EF5 sale de los slots genéricos de carrera/evaluación
// (`EvidenciaGuardada`/`EvidenciaCompartida`, campo `codigo_evidencia`), que es
// el mecanismo real que usa esta app para I2 (ver memoria del proyecto).

import type { ResultadoAsignatura, EncuestaDetalle } from "../services/seguimientoSyllabus";
import type { EvidenciaGuardada, EvidenciaCompartida } from "../services/evidencias";

type PdfDoc = InstanceType<typeof import("jspdf").default>;
type RGB = [number, number, number];

const NAVY = "#1B3A6B";
const NAVY_DARK = "#0F1E3C";
const SLATE = "#5A7295";

const EF_INFO: Record<"ef1" | "ef2" | "ef3" | "ef4" | "ef5", { titulo: string; descripcion: string; peso: number; fuente: string }> = {
  ef1: { titulo: "EF1", descripcion: "Seguimiento de contenidos del syllabus", peso: 33, fuente: "Encuesta de heteroevaluación, syllabus y malla curricular" },
  ef2: { titulo: "EF2", descripcion: "Mejora al micro currículo", peso: 27, fuente: "Documentos de planificación y actas de resolución" },
  ef3: { titulo: "EF3", descripcion: "Proceso de seguimiento difundido", peso: 20, fuente: "EVA, informes y registros de difusión" },
  ef4: { titulo: "EF4", descripcion: "Difusión del syllabus en el EVA", peso: 13, fuente: "EVA — carga y difusión del syllabus" },
  ef5: { titulo: "EF5", descripcion: "Normativa institucional", peso: 7, fuente: "Reglamento interno de seguimiento" },
};

// codigo_evidencia (catalogo_evidencias) -> EF que alimenta y etiqueta a mostrar.
const EVIDENCIA_PDF_LABELS: Record<string, string> = {
  "DOC.SEG.03": "Acta de Ajuste Curricular",
  "DOC.SEG.04": "Evidencia de Difusión",
  "DOC.SEG.01": "Reglamento / Normativa Institucional",
};
const EVIDENCIA_EF: Record<string, string> = {
  "DOC.SEG.03": "EF2",
  "DOC.SEG.04": "EF3",
  "DOC.SEG.01": "EF5",
};

const OPCIONES_LIKERT = ["Siempre", "Casi siempre", "Algunas veces", "Pocas veces", "Nunca"];

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function colorPorEscala(escala: string | null): RGB {
  switch (escala) {
    case "Satisfactorio": return [21, 128, 61];
    case "Cuasi Satisfactorio": return [202, 138, 4];
    case "Poco Satisfactorio": return [249, 115, 22];
    case "Deficiente": return [239, 68, 68];
    default: return [100, 116, 139];
  }
}

// Mismos cortes oficiales de CACES (≥0.75 / ≥0.50 / ≥0.25 / <0.25).
function colorPorValor(valor: number | null): RGB {
  if (valor === null) return [148, 163, 184];
  if (valor >= 75) return [21, 128, 61];
  if (valor >= 50) return [202, 138, 4];
  if (valor >= 25) return [249, 115, 22];
  return [239, 68, 68];
}

function opcionDominante(conteos: Record<string, number>, total: number): { label: string; pct: number } | null {
  if (total <= 0) return null;
  let mejorLabel = OPCIONES_LIKERT[0];
  let mejorConteo = -1;
  OPCIONES_LIKERT.forEach((op) => {
    const c = conteos[op] ?? 0;
    if (c > mejorConteo) { mejorConteo = c; mejorLabel = op; }
  });
  return { label: mejorLabel, pct: Math.round((mejorConteo / total) * 100) };
}

function polarPoint(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function drawRingSegment(doc: PdfDoc, cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number, rgb: RGB) {
  if (endDeg <= startDeg) return;
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const step = 3;
  for (let a = startDeg; a < endDeg; a += step) {
    const a2 = Math.min(a + step, endDeg);
    const [ox1, oy1] = polarPoint(cx, cy, rOuter, a);
    const [ox2, oy2] = polarPoint(cx, cy, rOuter, a2);
    const [ix1, iy1] = polarPoint(cx, cy, rInner, a);
    const [ix2, iy2] = polarPoint(cx, cy, rInner, a2);
    doc.triangle(ox1, oy1, ox2, oy2, ix1, iy1, "F");
    doc.triangle(ox2, oy2, ix2, iy2, ix1, iy1, "F");
  }
}

// Donut: pct 0-100, empieza arriba (12 en punto) y avanza en sentido horario.
function drawDonut(doc: PdfDoc, cx: number, cy: number, rOuter: number, rInner: number, pct: number, colorRgb: RGB) {
  const trackRgb: RGB = [226, 232, 240];
  const sweep = Math.max(0, Math.min(100, pct)) * 3.6;
  if (sweep < 360) drawRingSegment(doc, cx, cy, rOuter, rInner, sweep, 360, trackRgb);
  if (sweep > 0) drawRingSegment(doc, cx, cy, rOuter, rInner, 0, sweep, colorRgb);
}

function drawBarraHorizontal(doc: PdfDoc, x: number, y: number, w: number, h: number, pct: number, colorRgb: RGB) {
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  const anchoLleno = (w * Math.max(0, Math.min(100, pct))) / 100;
  if (anchoLleno > 0.6) {
    doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
    doc.roundedRect(x, y, anchoLleno, h, h / 2, h / 2, "F");
  }
}

function drawSectionHeader(doc: PdfDoc, titulo: string, subtitulo: string, x: number, y: number, contentW: number, navyDark: RGB, slate: RGB): number {
  doc.setFont("times", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.text(titulo, x, y);
  let yy = y + 4.5;
  if (subtitulo) {
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(slate[0], slate[1], slate[2]);
    const lineas = doc.splitTextToSize(subtitulo, contentW);
    doc.text(lineas, x, yy);
    yy += lineas.length * 3.6 + 2;
  }
  return yy + 1.5;
}

// Tabla genérica con encabezado de color y filas alternadas. Mide el alto
// real de cada fila (según el texto envuelto más largo de esa fila) ANTES
// de dibujarla, y repite el encabezado si la fila cae en una página nueva.
function dibujarTabla(
  doc: PdfDoc, xStart: number, yStart: number,
  columnas: { header: string; width: number }[],
  filas: string[][],
  colores: { navy: RGB; navyDark: RGB; slate: RGB },
  pageH: number,
): number {
  const marginBottom = 15;
  const headerH = 7.5;
  const anchoTotal = columnas.reduce((s, c) => s + c.width, 0);
  let y = yStart;

  function dibujarEncabezado() {
    doc.setFillColor(colores.navy[0], colores.navy[1], colores.navy[2]);
    doc.rect(xStart, y, anchoTotal, headerH, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    let cx = xStart;
    columnas.forEach((col) => {
      doc.text(col.header.toUpperCase(), cx + 2.5, y + 5);
      cx += col.width;
    });
    y += headerH;
  }

  dibujarEncabezado();

  filas.forEach((fila, i) => {
    const lineasPorCelda = fila.map((texto, ci) => doc.splitTextToSize(texto || "—", columnas[ci].width - 5));
    const maxLineas = Math.max(...lineasPorCelda.map((l: string[]) => l.length), 1);
    const rowH = maxLineas * 4 + 3;

    if (y + rowH > pageH - marginBottom) {
      doc.addPage();
      y = 15;
      dibujarEncabezado();
    }

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 253);
      doc.rect(xStart, y, anchoTotal, rowH, "F");
    }

    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(colores.navyDark[0], colores.navyDark[1], colores.navyDark[2]);
    let cx = xStart;
    fila.forEach((_texto, ci) => {
      doc.text(lineasPorCelda[ci], cx + 2.5, y + 4.3);
      cx += columnas[ci].width;
    });
    y += rowH;
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(xStart, y, xStart + anchoTotal, y);
  return y;
}

export interface ExportarPdfIndicador2Params {
  /** Resultado EF1-EF5 de la asignatura seleccionada (viene de resultado_cohorte.php / resultado_asignatura.php). */
  asignatura: ResultadoAsignatura;
  /** Etiqueta de cohorte tal como se muestra en la app, ej. "B2025". */
  cohortLabel: string;
  /** Número de PAO (1, 2, 3...). */
  paoNumero: number;
  /** Evidencias de la evaluación para el indicador I2: guardadas + compartidas (DOC.SYL.* heredadas de I1 no se usan acá, solo DOC.SEG.*). */
  evidencias: (EvidenciaGuardada | EvidenciaCompartida)[];
  /** Detalle de las 23 preguntas de la encuesta, filtrado por esta asignatura. */
  encuestaDetalle: EncuestaDetalle;
}

export async function exportarPdfIndicador2(params: ExportarPdfIndicador2Params): Promise<void> {
  const { asignatura, cohortLabel, paoNumero, evidencias, encuestaDetalle } = params;

  // jsPDF pesa ~300kB y solo se usa acá, así que se carga con import()
  // dinámico para que no forme parte del bundle inicial.
  const { default: jsPDF } = await import("jspdf");

  const doc: PdfDoc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const contentW = pageW - marginX * 2;
  let y = 0;

  const navy = hexToRgb(NAVY);
  const navyDark = hexToRgb(NAVY_DARK);
  const slate = hexToRgb(SLATE);
  const rojoSinEvidencia: RGB = [239, 68, 68];

  function checkPageBreak(alturaNecesaria: number) {
    if (y + alturaNecesaria > pageH - 15) {
      doc.addPage();
      y = 15;
    }
  }

  // ── Encabezado ──
  const tituloLineas = doc.splitTextToSize(asignatura.nombre_asignatura, contentW);
  const alturaEncabezado = 20 + tituloLineas.length * 6.5;
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageW, alturaEncabezado, "F");
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(190, 205, 225);
  doc.text("INDICADOR 11.2 · CACES — SEGUIMIENTO DE SYLLABUS", marginX, 9);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(tituloLineas, marginX, 18);
  y = alturaEncabezado + 9;

  // Fila de metadatos (DOCENTE / COHORTE / PAO / GENERADO)
  const metaColW = contentW / 4;
  const meta: [string, string][] = [
    ["DOCENTE", "—"], // el modelo actual no registra docente por asignatura todavía.
    ["COHORTE", `Cohorte ${cohortLabel}`],
    ["PAO", `PAO ${paoNumero}`],
    ["GENERADO", new Date().toLocaleString("es-EC", { day: "2-digit", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })],
  ];
  meta.forEach(([label, valor], i) => {
    const mx = marginX + i * metaColW;
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.setTextColor(slate[0], slate[1], slate[2]);
    doc.text(label, mx, y);
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    const lineasValor = doc.splitTextToSize(valor, metaColW - 4);
    doc.text(lineasValor, mx, y + 5);
  });
  y += 16;

  // ── Resumen general (donut + barras por EF) ──
  y = drawSectionHeader(
    doc, "Resultado general",
    "Puntaje agregado del indicador y desempeño individual de cada Elemento Fundamental (EF), ponderado según el modelo oficial de evaluación CACES.",
    marginX, y, contentW, navyDark, slate,
  );

  const bloqueAltura = 46;
  checkPageBreak(bloqueAltura);
  const yBloque = y;

  // Donut a la izquierda
  const donutCx = marginX + 26;
  const donutCy = yBloque + bloqueAltura / 2 - 2;
  const colorEscala = colorPorEscala(asignatura.escala);
  if (asignatura.valoracion_general !== null) {
    drawDonut(doc, donutCx, donutCy, 20, 13, asignatura.valoracion_general, colorEscala);
    doc.setFont("courier", "bold");
    doc.setFontSize(15);
    doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.text(`${asignatura.valoracion_general}%`, donutCx, donutCy + 2, { align: "center" });
  } else {
    drawDonut(doc, donutCx, donutCy, 20, 13, 0, [148, 163, 184]);
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Sin datos", donutCx, donutCy + 1.5, { align: "center" });
  }
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(colorEscala[0], colorEscala[1], colorEscala[2]);
  doc.text(asignatura.escala ?? "Falta evidencia", donutCx, donutCy + 27, { align: "center" });

  // Filas de EF a la derecha
  const efKeys: ("ef1" | "ef2" | "ef3" | "ef4" | "ef5")[] = ["ef1", "ef2", "ef3", "ef4", "ef5"];
  const efColX = marginX + 58;
  const efColW = contentW - 58;
  const textW = efColW * 0.55;
  const barX = efColX + textW + 3;
  const barW = efColW - textW - 3 - 15;
  const pctX = barX + barW + 3;
  const rowH = bloqueAltura / 5;

  efKeys.forEach((key, i) => {
    const info = EF_INFO[key];
    const valor = asignatura[key];
    const ry = yBloque + i * rowH;
    const colorBarra = colorPorValor(valor);

    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.text(`${info.titulo}  ${info.descripcion}`, efColX, ry + 4.5);
    doc.setFont("courier", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(slate[0], slate[1], slate[2]);
    doc.text(`peso ${info.peso}% del indicador`, efColX, ry + 8.3);

    const barY = ry + 3;
    drawBarraHorizontal(doc, barX, barY, barW, 3, valor ?? 0, colorBarra);
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(colorBarra[0], colorBarra[1], colorBarra[2]);
    doc.text(valor === null ? "—" : `${valor}%`, pctX, barY + 2.6);
  });
  y = yBloque + bloqueAltura + 4;

  // Nota metodológica
  checkPageBreak(20);
  const notaTexto =
    "Nota metodológica — este porcentaje es un proxy continuo de gestión interna que la carrera usa para prepararse antes de la visita del Comité Externo. El procedimiento oficial de CACES categoriza cada EF de forma discreta (Satisfactorio / Cuasi satisfactorio / Poco satisfactorio / Deficiente) mediante juicio de un evaluador humano sobre la evidencia presentada.";
  const notaLineas = doc.splitTextToSize(notaTexto, contentW - 8);
  const notaAltura = notaLineas.length * 3.6 + 6;
  doc.setFillColor(248, 250, 253);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, contentW, notaAltura, 2, 2, "FD");
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text(notaLineas, marginX + 4, y + 5);
  y += notaAltura + 8;

  // ── Fuentes de evidencia por elemento ──
  checkPageBreak(20);
  y = drawSectionHeader(doc, "Fuentes de evidencia por elemento", "Origen de la información que sustenta el resultado de cada Elemento Fundamental.", marginX, y, contentW, navyDark, slate);
  const filasFuentes = efKeys.map((key) => {
    const info = EF_INFO[key];
    const valor = asignatura[key];
    return [info.titulo, info.descripcion, info.fuente, valor === null ? "Sin datos" : `${valor}%`];
  });
  y = dibujarTabla(
    doc, marginX, y,
    [
      { header: "EF", width: 12 },
      { header: "Elemento fundamental", width: 48 },
      { header: "Fuente de evidencia", width: 85 },
      { header: "Resultado", width: contentW - 12 - 48 - 85 },
    ],
    filasFuentes,
    { navy, navyDark, slate },
    pageH,
  );
  y += 10;

  // ── Detalle de encuesta (EF1 y EF4) ──
  checkPageBreak(20);
  y = drawSectionHeader(
    doc, "Detalle de la encuesta de heteroevaluación",
    `Preguntas que alimentan EF1 y EF4 · respuestas consideradas para esta asignatura: ${encuestaDetalle.respuestas_totales_materia}.`,
    marginX, y, contentW, navyDark, slate,
  );

  const preguntasEF = encuestaDetalle.preguntas.filter((p) => p.es_ef1 || p.es_ef4);
  preguntasEF.forEach((p) => {
    const textoPregunta = p.texto ?? "(pregunta no encontrada en la encuesta actual)";
    const lineasTexto = doc.splitTextToSize(textoPregunta, contentW);
    const resumenConteo = p.total > 0
      ? OPCIONES_LIKERT.map((op) => `${op}: ${p.conteos[op] ?? 0} (${Math.round(((p.conteos[op] ?? 0) / p.total) * 100)}%)`).join("  ·  ")
      : "Sin respuestas para esta materia";
    const lineasConteo = doc.splitTextToSize(resumenConteo, contentW);
    const alturaBloque = 5 + lineasTexto.length * 4.2 + 2 + lineasConteo.length * 3.8 + 5;

    checkPageBreak(alturaBloque);
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`P${p.numero}  ${p.es_ef1 ? "EF1" : "EF4"}`, marginX, y);
    y += 5;

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.text(lineasTexto, marginX, y);
    y += lineasTexto.length * 4.2 + 2;

    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(slate[0], slate[1], slate[2]);
    doc.text(lineasConteo, marginX, y);
    y += lineasConteo.length * 3.8 + 5;
  });
  y += 4;

  // ── Evidencia documental (EF2, EF3, EF5) ──
  checkPageBreak(20);
  y = drawSectionHeader(doc, "Evidencia documental", "Archivos que sustentan EF2, EF3 y EF5.", marginX, y, contentW, navyDark, slate);
  const codigosEvidencia = Object.keys(EVIDENCIA_PDF_LABELS);
  const filasEvidencia = codigosEvidencia.map((codigo) => {
    const ev = evidencias.find((e) => e.codigo_evidencia === codigo);
    return [
      EVIDENCIA_EF[codigo],
      EVIDENCIA_PDF_LABELS[codigo],
      ev ? ev.nombre_archivo : "Sin evidencia subida",
      ev ? new Date(ev.fecha_subida).toLocaleDateString("es-EC") : "—",
      "—", // el modelo actual no registra "subido por" en los slots de carrera/evaluación.
    ];
  });
  y = dibujarTabla(
    doc, marginX, y,
    [
      { header: "EF", width: 12 },
      { header: "Tipo de evidencia", width: 48 },
      { header: "Archivo", width: 70 },
      { header: "Subido", width: 25 },
      { header: "Responsable", width: contentW - 12 - 48 - 70 - 25 },
    ],
    filasEvidencia,
    { navy, navyDark, slate },
    pageH,
  );

  // ── Anexo: las 23 preguntas, formato compacto ──
  doc.addPage();
  y = 15;
  y = drawSectionHeader(
    doc, "Anexo — Las 23 preguntas de la encuesta de heteroevaluación",
    "Distribución de respuestas por pregunta. Las preguntas marcadas con EF alimentan directamente el cálculo del indicador.",
    marginX, y, contentW, navyDark, slate,
  );

  encuestaDetalle.preguntas.forEach((p) => {
    const marcador = p.es_ef1 ? "  EF1" : p.es_ef4 ? "  EF4" : "";
    const textoPregunta = p.texto ?? "(pregunta no encontrada en la encuesta actual)";
    const lineasTexto = doc.splitTextToSize(textoPregunta, contentW);
    const dom = opcionDominante(p.conteos, p.total);
    const lineaResultado = dom ? `Respuesta registrada: ${dom.label} (${dom.pct}%)` : "Sin respuestas para esta materia";
    const alturaBloque = 4 + lineasTexto.length * 3.9 + 4.5 + 4;

    checkPageBreak(alturaBloque);
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`P${p.numero}${marcador}`, marginX, y);
    y += 4;

    doc.setFont("times", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.text(lineasTexto, marginX, y);
    y += lineasTexto.length * 3.9;

    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(dom ? slate[0] : rojoSinEvidencia[0], dom ? slate[1] : rojoSinEvidencia[1], dom ? slate[2] : rojoSinEvidencia[2]);
    doc.text(lineaResultado, marginX, y + 3.5);
    y += 4 + 4;
  });

  doc.save(`indicador_11.2_${asignatura.nombre_asignatura.replace(/\s+/g, "_")}.pdf`);
}