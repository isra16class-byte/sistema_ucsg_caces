import { useEffect, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
} from "lucide-react";

import { toast } from "sonner";

import PdfZone from "../app/components/PdfZone";
import EvidenceHeader from "../app/components/EvidenceHeader";
import Breadcrumb from "../app/components/Breadcrumb";

import {
  prepararPdf,
  obtenerCatalogoEvidencias,
  obtenerEvaluacion,
  guardarEvidencia,
  obtenerEvidenciasGuardadas,
  obtenerEvidenciasCompartidas,
  subirPdfGoogleDrive,
  leerMatriculadosPdf,
  leerPdfTitulacion,
  guardarDatoTitulacion,
} from "../services/evidencias";

import {
  COHORT_OPTIONS,
  MATERIAS_BY_PAO_MODULE,
} from "../data/academic";

import type {
  Career,
  EvidStep,
  EvidenceSlot,
  IndicatorDef,
} from "../types";

export default function EvidenceUploadView({ career, indicators, onChange, onBack, preselectedCohort, preselectedIndicatorId }: {
  career: Career;
  indicators: IndicatorDef[];
  onChange: (inds: IndicatorDef[]) => void;
  onBack: () => void;
  preselectedCohort: string;
  preselectedIndicatorId?: string;
}) {
  const initialStep: EvidStep = preselectedIndicatorId
    ? (["I1", "I2", "I3"].includes(preselectedIndicatorId) ? "configSyllabus" : "configTitDes")
    : "selectIndicator";
  const [step, setStep] = useState<EvidStep>(initialStep);
  const [indicatorId, setIndicatorId] = useState<string>(preselectedIndicatorId ?? "");
  const [pao, setPao] = useState<string>("");
  const [module, setModule] = useState<string>("");
  const [materia, setMateria] = useState<string>("");
  const [cohort, setCohort] = useState<string>(preselectedCohort);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [catalogoError, setCatalogoError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const indicator = indicators.find((i) => i.id === indicatorId);
  const isSyllabus = ["I1", "I2", "I3"].includes(indicatorId);
  useEffect(() => {
  if (indicatorId !== "I5" || !cohort) {
    return;
  }

  let activo = true;

  async function cargarEvidenciasTitulacion() {
    setLoadingCatalogo(true);
    setCatalogoError("");

    try {
      const [catalogo, evaluacion] = await Promise.all([
        obtenerCatalogoEvidencias(5),
        obtenerEvaluacion(
          career.code,
          cohort.replace(/\s+/g, ""),
        ),
      ]);

      const guardadas = await obtenerEvidenciasGuardadas(
        evaluacion.id_evaluacion,
        5,
      );

      if (!activo) {
        return;
      }

      onChange(
        indicators.map((ind) => {
          if (ind.id !== "I5") {
            return ind;
          }

          const nuevosSlots: EvidenceSlot[] =
            catalogo.map((evidencia) => {
              const guardada = guardadas.find(
                (item) =>
                  item.id_catalogo ===
                    evidencia.id_catalogo ||
                  item.codigo_evidencia ===
                    evidencia.codigo_evidencia,
              );

              const slotAnterior =
                ind.slots.find(
                  (slot) =>
                    slot.codigoEvidencia ===
                    evidencia.codigo_evidencia,
                ) ??
                ind.slots.find(
                  (slot) =>
                    slot.sourceNum ===
                    evidencia.orden,
                );

              let sharedKey: string | undefined;

              if (
                evidencia.codigo_evidencia ===
                "DOC.TIT.02"
              ) {
                sharedKey = "matriculados";
              }

              if (
                evidencia.codigo_evidencia ===
                "DOC.TIT.04"
              ) {
                sharedKey = "malla_curricular";
              }

              return {
                sourceNum: evidencia.orden,
                label: evidencia.titulo_corto,
                idCatalogo: evidencia.id_catalogo,
                codigoEvidencia:
                  evidencia.codigo_evidencia,
                nombreArchivoBase:
                  evidencia.nombre_archivo_base,
                descripcionCompleta:
                  evidencia.descripcion,
                sharedKey,

                idEvidencia:
                  guardada?.id_evidencia ??
                  slotAnterior?.idEvidencia,

                file: guardada
                  ? {
                      fileName:
                        guardada.nombre_archivo,
                      originalName:
                        guardada.nombre_archivo,
                      url: guardada.url_archivo,
                      serverUrl:
                        guardada.url_archivo,
                      size: 0,
                    }
                  : slotAnterior?.file,

                error: slotAnterior?.error,
                sharedFrom:
                  slotAnterior?.sharedFrom,
              };
            });

          return {
            ...ind,
            slots: nuevosSlots,
          };
        }),
      );
    } catch (error) {
      if (!activo) {
        return;
      }

      setCatalogoError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las evidencias.",
      );
    } finally {
      if (activo) {
        setLoadingCatalogo(false);
      }
    }
  }

  cargarEvidenciasTitulacion();

  return () => {
    activo = false;
  };
}, [indicatorId, cohort]);

// Efecto unificado para I1 e I2.
// Para I1: trae el catálogo propio (Catalogo_Evidencias) y lo mezcla en los
// slots por `orden` -> `sourceNum`. Los slots sin fila de catálogo (p. ej.
// "Asignaturas" en I1) se dejan intactos.
// Para I2: trae el catálogo propio de I2 (slots 2,3,4), el catálogo de I1
// para obtener DOC.SYL.02 (slot 1), y las evidencias compartidas. Todo se
// combina en UNA SOLA llamada a onChange, eliminando la race condition entre
// los dos efectos anteriores.
const ID_INDICADOR_NUM: Record<string, number> = {
  I1: 1,
  I2: 2,
  I3: 3,
  I4: 4,
  I5: 5,
};

useEffect(() => {
  if (!["I1", "I2"].includes(indicatorId) || !cohort) {
    return;
  }

  const idIndicadorReal = ID_INDICADOR_NUM[indicatorId];

  let activo = true;

  async function cargarDatosIndicador() {
    setLoadingCatalogo(true);
    setCatalogoError("");

    try {
      if (indicatorId === "I2") {
        // --- I2: combina catálogo propio + syllabus compartido de I1 ---
        const [catalogoI2, catalogoI1, evaluacion] = await Promise.all([
          obtenerCatalogoEvidencias(2),
          obtenerCatalogoEvidencias(1),
          obtenerEvaluacion(
            career.code,
            cohort.replace(/\s+/g, ""),
          ),
        ]);

        const [guardadas, compartidas] = await Promise.all([
          obtenerEvidenciasGuardadas(
            evaluacion.id_evaluacion,
            2,
          ),
          obtenerEvidenciasCompartidas(
            evaluacion.id_evaluacion,
            2,
          ),
        ]);

        if (!activo) {
          return;
        }

        // Metadata del Syllabus desde catálogo de I1
        const syllabusCatalogo = catalogoI1.find(
          (item) => item.codigo_evidencia === "DOC.SYL.02",
        );

        // Evidencia compartida ya subida (desde I1 o antes desde I2)
        const syllabusCompartido = compartidas.find(
          (evidencia) => evidencia.codigo_evidencia === "DOC.SYL.02",
        );

        onChange(
          indicators.map((ind) => {
            if (ind.id !== "I2") {
              return ind;
            }

            return {
              ...ind,
              slots: ind.slots.map((slot) => {
                // Slot 1: se llena EXCLUSIVAMENTE desde DOC.SYL.02 de I1
                if (slot.sourceNum === 1) {
                  // Si no existe el syllabus en catálogo I1, dejar el slot como está
                  if (!syllabusCatalogo) {
                    return slot;
                  }

                  return {
                    ...slot,
                    label: syllabusCatalogo.titulo_corto || slot.label,
                    idCatalogo: syllabusCatalogo.id_catalogo,
                    codigoEvidencia: syllabusCatalogo.codigo_evidencia,
                    nombreArchivoBase: syllabusCatalogo.nombre_archivo_base,
                    descripcionCompleta: syllabusCatalogo.descripcion,

                    idEvidencia:
                      syllabusCompartido?.id_evidencia ?? slot.idEvidencia,
                    sharedFrom:
                      syllabusCompartido?.indicador_origen ?? slot.sharedFrom,

                    file: syllabusCompartido
                      ? {
                          fileName: syllabusCompartido.nombre_archivo,
                          originalName: syllabusCompartido.nombre_archivo,
                          url: syllabusCompartido.url_archivo,
                          serverUrl: syllabusCompartido.url_archivo,
                          size: 0,
                        }
                      : slot.file,
                  };
                }

                // Slots 2,3,4: se llenan desde el catálogo propio de I2
                const evidencia = catalogoI2.find(
                  (item) => item.orden === slot.sourceNum,
                );

                if (!evidencia) {
                  return slot;
                }

                const guardada = guardadas.find(
                  (item) =>
                    item.id_catalogo === evidencia.id_catalogo ||
                    item.codigo_evidencia === evidencia.codigo_evidencia,
                );

                return {
                  ...slot,
                  label: evidencia.titulo_corto || slot.label,
                  idCatalogo: evidencia.id_catalogo,
                  codigoEvidencia: evidencia.codigo_evidencia,
                  nombreArchivoBase: evidencia.nombre_archivo_base,
                  descripcionCompleta: evidencia.descripcion,

                  idEvidencia:
                    guardada?.id_evidencia ?? slot.idEvidencia,

                  file: guardada
                    ? {
                        fileName: guardada.nombre_archivo,
                        originalName: guardada.nombre_archivo,
                        url: guardada.url_archivo,
                        serverUrl: guardada.url_archivo,
                        size: 0,
                      }
                    : slot.file,
                };
              }),
            };
          }),
        );
      } else {
        // --- I1 (y cualquier otro indicador que no sea I2 en este branch) ---
        const [catalogo, evaluacion] = await Promise.all([
          obtenerCatalogoEvidencias(idIndicadorReal),
          obtenerEvaluacion(
            career.code,
            cohort.replace(/\s+/g, ""),
          ),
        ]);

        const guardadas = await obtenerEvidenciasGuardadas(
          evaluacion.id_evaluacion,
          idIndicadorReal,
        );

        if (!activo) {
          return;
        }

        onChange(
          indicators.map((ind) => {
            if (ind.id !== indicatorId) {
              return ind;
            }

            return {
              ...ind,
              slots: ind.slots.map((slot) => {
                const evidencia = catalogo.find(
                  (item) => item.orden === slot.sourceNum,
                );

                if (!evidencia) {
                  // No hay fila de catálogo para este slot (p. ej.
                  // "Asignaturas" en I1). Se deja tal como está.
                  return slot;
                }

                const guardada = guardadas.find(
                  (item) =>
                    item.id_catalogo === evidencia.id_catalogo ||
                    item.codigo_evidencia === evidencia.codigo_evidencia,
                );

                return {
                  ...slot,
                  label: evidencia.titulo_corto || slot.label,
                  idCatalogo: evidencia.id_catalogo,
                  codigoEvidencia: evidencia.codigo_evidencia,
                  nombreArchivoBase: evidencia.nombre_archivo_base,
                  descripcionCompleta: evidencia.descripcion,

                  idEvidencia:
                    guardada?.id_evidencia ?? slot.idEvidencia,

                  file: guardada
                    ? {
                        fileName: guardada.nombre_archivo,
                        originalName: guardada.nombre_archivo,
                        url: guardada.url_archivo,
                        serverUrl: guardada.url_archivo,
                        size: 0,
                      }
                    : slot.file,
                };
              }),
            };
          }),
        );
      }
    } catch (error) {
      if (!activo) {
        return;
      }

      setCatalogoError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catálogo de evidencias.",
      );
    } finally {
      if (activo) {
        setLoadingCatalogo(false);
      }
    }
  }

  cargarDatosIndicador();

  return () => {
    activo = false;
  };
}, [indicatorId, cohort]);

useEffect(() => {
  if (indicatorId !== "I4" || !cohort) {
    return;
  }

  let activo = true;

  async function cargarCompartidasDesercion() {
    setLoadingCatalogo(true);
    setCatalogoError("");

    try {
      const evaluacion = await obtenerEvaluacion(
        career.code,
        cohort.replace(/\s+/g, ""),
      );

      const compartidas =
        await obtenerEvidenciasCompartidas(
          evaluacion.id_evaluacion,
          4,
        );

      if (!activo) {
        return;
      }

      onChange(
        indicators.map((ind) => {
          if (ind.id !== "I4") {
            return ind;
          }

          const evidenciaMatriculados =
            compartidas.find(
              (evidencia) =>
                evidencia.codigo_evidencia ===
                "DOC.TIT.02",
            );

          if (!evidenciaMatriculados) {
            return ind;
          }

          return {
            ...ind,
            slots: ind.slots.map((slot) => {
              if (slot.sourceNum !== 1) {
                return slot;
              }

              return {
                ...slot,
                label:
                  evidenciaMatriculados.titulo_corto,
                idCatalogo:
                  evidenciaMatriculados.id_catalogo,
                codigoEvidencia:
                  evidenciaMatriculados.codigo_evidencia,
                nombreArchivoBase:
                  evidenciaMatriculados.nombre_archivo_base,
                descripcionCompleta:
                  evidenciaMatriculados.descripcion,
                idEvidencia:
                  evidenciaMatriculados.id_evidencia,

                sharedKey: "matriculados",
                sharedFrom:
                  evidenciaMatriculados.indicador_origen,

                file: {
                  fileName:
                    evidenciaMatriculados.nombre_archivo,
                  originalName:
                    evidenciaMatriculados.nombre_archivo,
                  url:
                    evidenciaMatriculados.url_archivo,
                  serverUrl:
                    evidenciaMatriculados.url_archivo,
                  size: 0,
                },

                error: undefined,
              };
            }),
          };
        }),
      );
    } catch (error) {
      if (!activo) {
        return;
      }

      setCatalogoError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las evidencias compartidas.",
      );
    } finally {
      if (activo) {
        setLoadingCatalogo(false);
      }
    }
  }

  cargarCompartidasDesercion();

  return () => {
    activo = false;
  };
}, [indicatorId, cohort]);

  function handleSelectIndicator(id: string) {
    setIndicatorId(id);
    setPao(""); setModule(""); setMateria("");
    if (["I1", "I2", "I3"].includes(id)) {
      setCohort(preselectedCohort);
      setStep("configSyllabus");
    } else {
      setCohort(preselectedCohort);
      setStep("configTitDes");
    }
  }

  function updateSlot(indId: string, updated: EvidenceSlot) {
    onChange(indicators.map((ind) => {
      if (ind.id !== indId) {
        if (!updated.sharedKey) return ind;
        const matchSlot = ind.slots.find((s) => s.sharedKey === updated.sharedKey);
        if (!matchSlot) return ind;
        const syncedSlot: EvidenceSlot = { ...matchSlot, file: updated.file, error: updated.error, sharedFrom: updated.file ? indId : undefined };
        return { ...ind, slots: ind.slots.map((s) => s.sharedKey === updated.sharedKey ? syncedSlot : s) };
      }
      const newSlots = ind.slots.map((s) => s.sourceNum === updated.sourceNum ? updated : s);
      return { ...ind, slots: newSlots};
    }));
  }
  
  async function procesarPdf(
  slot: EvidenceSlot,
  archivo: File,
) {
  if (!slot.idCatalogo) {
    toast.error(
      "La evidencia no está relacionada con el catálogo.",
    );
    return;
  }

  if (!slot.codigoEvidencia) {
    toast.error(
      "La evidencia no tiene código asignado.",
    );
    return;
  }

  if (!indicator) {
    toast.error(
      "No se encontró el indicador seleccionado.",
    );
    return;
  }

  try {
    /*
     * 1. Validar el PDF y generar el nombre técnico.
     */
    const preparacion = await prepararPdf({
      archivo,
      idCatalogo: slot.idCatalogo,
      codigoCarrera: career.code,
      cohorte: cohort.replace(/\s+/g, ""),
      criterio: career.criterionNum,
      indicador: indicator.num,
    });

    if (!preparacion.datos) {
      throw new Error(
        "El servidor no devolvió la información del PDF.",
      );
    }

    let matriculadosDetectados: number | null = null;

if (slot.codigoEvidencia === "DOC.TIT.02") {
  const lectura = await leerMatriculadosPdf(
    archivo,
  );

  matriculadosDetectados =
    lectura.datos?.matriculados ?? null;

  if (
    lectura.datos?.cohorte_detectada &&
    lectura.datos.cohorte_detectada !==
      cohort.replace(/\s+/g, "")
  ) {
    throw new Error(
      `El PDF corresponde a la cohorte ${lectura.datos.cohorte_detectada}, pero seleccionó ${cohort}.`,
    );
  }
}
    /*
     * 2. Subir o reemplazar el archivo en Google Drive.
     */
    const drive = await subirPdfGoogleDrive({
      archivo,
      codigoCarrera: career.code,
      nombreCarrera: career.name,
      cohorte: cohort.replace(/\s+/g, ""),
      indicador: indicator.num,
      nombreArchivo:
        preparacion.datos.nombre_generado,
    });

    const urlDrive =
      drive.datos?.url_archivo?.trim() ?? "";

    if (
      !urlDrive.startsWith(
        "https://drive.google.com/",
      )
    ) {
      throw new Error(
        "Google Drive no devolvió una URL válida.",
      );
    }

    /*
     * 3. Obtener la evaluación correspondiente.
     */
    const evaluacion = await obtenerEvaluacion(
      career.code,
      cohort.replace(/\s+/g, ""),
    );
    let resultadoTitulacion:
  | {
      total: number;
      tipo:
        | "matriculados"
        | "graduados";
      tasa: number | null;
    }
  | null = null;

if (
  indicator.id === "I5" &&
  (
    slot.codigoEvidencia === "DOC.TIT.01" ||
    slot.codigoEvidencia === "DOC.TIT.02"
  )
) {
  /*
   * Según tu catálogo:
   * DOC.TIT.01 = estudiantes graduados
   * DOC.TIT.02 = estudiantes matriculados.
   */
  const tipoDato =
    slot.codigoEvidencia === "DOC.TIT.01"
      ? "graduados"
      : "matriculados";

  const lectura = await leerPdfTitulacion(
    archivo,
    tipoDato,
  );

  const cohorteNormalizada =
    cohort.replace(/\s+/g, "").toUpperCase();

  if (
    lectura.cohorte_detectada &&
    lectura.cohorte_detectada !==
      cohorteNormalizada
  ) {
    throw new Error(
      `El PDF corresponde a la cohorte ${lectura.cohorte_detectada}, pero está seleccionada la cohorte ${cohorteNormalizada}.`,
    );
  }

  const guardadoTitulacion =
    await guardarDatoTitulacion({
      idEvaluacion:
        evaluacion.id_evaluacion,
      cohorte: cohorteNormalizada,
      ...(tipoDato === "matriculados"
        ? {
            matriculados:
              lectura.total,
          }
        : {
            graduados:
              lectura.total,
          }),
    });

  resultadoTitulacion = {
    total: lectura.total,
    tipo: tipoDato,
    tasa:
      guardadoTitulacion.tasa,
  };
}
    /*
     * 4. Registrar o actualizar inmediatamente
     * la URL de Google Drive en MySQL.
     */
    const guardado = await guardarEvidencia({
      idCatalogo: slot.idCatalogo,
      idEvaluacion:
        evaluacion.id_evaluacion,
      codigoEvidencia:
        slot.codigoEvidencia,
      descripcion:
        slot.descripcionCompleta ??
        slot.label,
      nombreArchivo:
        preparacion.datos.nombre_generado,
      tipo: "application/pdf",
      urlArchivo: urlDrive,
    });

    if (!guardado.id_evidencia) {
      throw new Error(
        "MySQL no devolvió el identificador de la evidencia.",
      );
    }

    /*
     * 5. Actualizar la interfaz.
     */
    updateSlot(indicator.id, {
      ...slot,
      idEvidencia:
        guardado.id_evidencia,
      error: undefined,
      file: {
        fileName:
          preparacion.datos.nombre_generado,
        originalName: archivo.name,
        url: urlDrive,
        serverUrl: urlDrive,
        size: archivo.size,
      },
    });

    toast.success(
      "PDF guardado correctamente",
      {
      description: resultadoTitulacion
      ? resultadoTitulacion.tasa !== null
        ? `${
            resultadoTitulacion.tipo ===
            "matriculados"
              ? "Matriculados"
              : "Graduados"
          } detectados: ${
            resultadoTitulacion.total
          }. Tasa calculada: ${
            resultadoTitulacion.tasa
          }%.`
        : `${
            resultadoTitulacion.tipo ===
            "matriculados"
              ? "Matriculados"
              : "Graduados"
          } detectados: ${
            resultadoTitulacion.total
          }. Falta el otro PDF para calcular la tasa.`
      : "El documento se subió a Google Drive y su URL se actualizó en MySQL.",  
      },
    );
  } catch (error) {
    updateSlot(indicator.id, {
      ...slot,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo procesar el PDF.",
    });

    toast.error(
      "No se pudo guardar el archivo",
      {
        description:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      },
    );
  }
}

  async function guardarEvidenciasSeleccionadas() {
  if (!indicator) {
    toast.error(
      "No se encontró el indicador seleccionado.",
    );
    return;
  }

  const cargadas =
    indicator.slots.filter(
      (slot) => slot.idEvidencia && slot.file,
    ).length;

  if (cargadas === 0) {
    toast.error(
      "Debe cargar al menos una evidencia.",
    );
    return;
  }

  toast.success(
    "Cambios guardados correctamente",
  );

  onBack();
}

  // Step 1: Select indicator
  if (step === "selectIndicator") {
    const INDICATOR_ICONS = ["I1","I2","I3","I4","I5"];
    const COLORS = { I1: "#2563EB", I2: "#7C3AED", I3: "#0891B2", I4: "#DC2626", I5: "#16A34A" };
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#EEF2F7", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <EvidenceHeader title="Carga de Evidencias" subtitle={career.name} backLabel="Panel principal" onBackClick={onBack} />
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <Breadcrumb items={["Seleccionar indicador"]} />
            <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'Libre Baskerville',serif", color: "#0F1E3C" }}>¿Para qué indicador desea cargar evidencias?</h2>
            <p className="text-sm mb-6" style={{ color: "#5A7295" }}>Seleccione el indicador al que pertenecen los documentos que va a subir.</p>
            <div className="grid grid-cols-1 gap-3">
              {indicators.map((ind) => {
                const done = ind.slots.filter((s) => s.file).length;
                const total = ind.slots.length;
                const complete = done === total;
                const color = COLORS[ind.id as keyof typeof COLORS] || "#1B3A6B";
                return (
                  <button key={ind.id} onClick={() => handleSelectIndicator(ind.id)}
                    className="bg-white rounded-xl px-4 py-2.5 text-left flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
                    style={{ border: `1.5px solid ${complete ? "#16A34A" : "rgba(27,58,107,0.12)"}`, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs"
                      style={{ background: `${color}18`, color }}>
                      {ind.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ fontFamily: "'Libre Baskerville',serif", color: "#0F1E3C" }}>{ind.name}</p>
                      <p className="text-xs truncate" style={{ color: "#5A7295" }}>
                        {["I1","I2","I3"].includes(ind.id) ? "Requiere selección de período · módulo · materia" : "Requiere selección de cohorte"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: complete ? "#DCFCE7" : "#F3F4F6", color: complete ? "#16A34A" : "#6B7280" }}>
                        {done}/{total}
                      </span>
                      {complete && <CheckCircle2 size={14} style={{ color: "#16A34A" }} />}
                      <span className="text-blue-600 text-xs font-semibold group-hover:text-blue-700">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2a: Config for Syllabus indicators (I1/I2/I3)
  if (step === "configSyllabus") {
    const canContinue = cohort && pao && module && materia;
    const materias = (pao && module) ? (MATERIAS_BY_PAO_MODULE[pao]?.[module] ?? []) : [];
    const selectCls = "w-full px-3 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer";
    const selectStyle = { background: "#F4F7FB", borderColor: "rgba(27,58,107,0.2)", color: "#0F1E3C" };

    function BtnGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
      return (
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#5A7295" }}>{label}</label>
          <div className="flex gap-2">
            {options.map((opt) => (
              <button key={opt} type="button" onClick={() => onChange(opt)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all"
                style={{
                  background: value === opt ? "#1B3A6B" : "#F4F7FB",
                  color: value === opt ? "#fff" : "#374151",
                  borderColor: value === opt ? "#1B3A6B" : "rgba(27,58,107,0.2)",
                }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#EEF2F7", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <EvidenceHeader title={indicator?.name || ""} subtitle="Configurar período" backLabel="Indicadores" onBackClick={() => preselectedIndicatorId ? onBack() : setStep("selectIndicator")} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-lg">
            <Breadcrumb items={["Seleccionar indicador", indicator?.name || "", "Configurar período"]} />
            <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'Libre Baskerville',serif", color: "#0F1E3C" }}>Seleccionar período</h2>
            <p className="text-sm mb-5" style={{ color: "#5A7295" }}>Indique el período, módulo y materia correspondientes a los sílabos que va a cargar.</p>

            <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1px solid rgba(27,58,107,0.09)" }}>
              {/* Cohorte dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#5A7295" }}>Cohorte</label>
                <div className="relative">
                  <select value={cohort} onChange={(e) => setCohort(e.target.value)} className={selectCls} style={selectStyle}>
                    <option value="">— Seleccionar cohorte —</option>
                    {COHORT_OPTIONS.map((c) => <option key={c} value={c}>Cohorte {c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#5A7295" }} />
                </div>
              </div>

              {/* PAO buttons */}
              <BtnGroup label="Período (PAO)" options={["PAO 1", "PAO 2", "PAO 3"]} value={pao} onChange={setPao} />

              {/* Module buttons */}
              <BtnGroup label="Módulo" options={["A", "B", "C"]} value={module} onChange={(v) => { setModule(v); setMateria(""); }} />

              {/* Materia */}
              <div style={{ opacity: module ? 1 : 0.45, pointerEvents: module ? "auto" : "none" }}>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#5A7295" }}>Materia</label>
                <div className="relative">
                  <select value={materia} onChange={(e) => setMateria(e.target.value)} className={selectCls} style={selectStyle}>
                    <option value="">— Seleccionar materia —</option>
                    {materias.map((mat) => <option key={mat} value={mat}>{mat}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#5A7295" }} />
                </div>
              </div>
            </div>

            <button onClick={() => canContinue && setStep("upload")} disabled={!canContinue}
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: canContinue ? "#1B3A6B" : "#E5E7EB", color: canContinue ? "#fff" : "#9CA3AF", cursor: canContinue ? "pointer" : "not-allowed" }}>
              Continuar a carga de archivos →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2b: Config for Titulación/Deserción (I4/I5)
  if (step === "configTitDes") {
    const canContinue = !!cohort;
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#EEF2F7", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <EvidenceHeader title={indicator?.name || ""} subtitle="Seleccionar cohorte" backLabel="Indicadores" onBackClick={() => preselectedIndicatorId ? onBack() : setStep("selectIndicator")} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <Breadcrumb items={["Seleccionar indicador", indicator?.name || "", "Seleccionar cohorte"]} />
            <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'Libre Baskerville',serif", color: "#0F1E3C" }}>Seleccionar cohorte</h2>
            <p className="text-sm mb-5" style={{ color: "#5A7295" }}>Seleccione la cohorte a la que pertenecen los documentos que va a cargar.</p>

            <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: "1px solid rgba(27,58,107,0.09)" }}>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "#5A7295" }}>Cohorte</label>
              <div className="relative">
                <select value={cohort} onChange={(e) => setCohort(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer"
                  style={{ background: "#F4F7FB", borderColor: "rgba(27,58,107,0.2)", color: "#0F1E3C" }}>
                  <option value="">— Seleccionar cohorte —</option>
                  {COHORT_OPTIONS.map((c) => <option key={c} value={c}>Cohorte {c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#5A7295" }} />
              </div>
            </div>

            <button onClick={() => canContinue && setStep("upload")} disabled={!canContinue}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: canContinue ? "#1B3A6B" : "#E5E7EB", color: canContinue ? "#fff" : "#9CA3AF", cursor: canContinue ? "pointer" : "not-allowed" }}>
              Continuar a carga de archivos →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Upload files
  if (step === "upload" && indicator) {
    const contextLabel = isSyllabus ? `${pao} · Módulo ${module} · ${materia}` : `Cohorte ${cohort}`;
    const done = indicator.slots.filter((s) => s.file).length;
    const total = indicator.slots.length;

    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#EEF2F7", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div className="flex-shrink-0 border-b" style={{ background: "#fff", borderColor: "rgba(27,58,107,0.1)" }}>
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(isSyllabus ? "configSyllabus" : "configTitDes")}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors" style={{ color: "#1B3A6B" }}>
                <ArrowLeft size={13} /> Configuración
              </button>
              <div className="h-4 w-px" style={{ background: "rgba(27,58,107,0.15)" }} />
              <span className="text-sm font-bold" style={{ fontFamily: "'Libre Baskerville',serif", color: "#0F1E3C" }}>{indicator.name}</span>
            </div>
            <span className="text-xs font-mono" style={{ color: done === total ? "#16A34A" : "#5A7295" }}>{done}/{total}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <Breadcrumb items={["Seleccionar indicador", indicator.name, "Configuración", "Cargar archivos"]} />

            {/* Context info */}
            <div className="rounded-xl px-4 py-3 mb-5 flex items-center gap-3"
              style={{ background: "#EEF2F7", border: "1px solid rgba(27,58,107,0.12)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#1B3A6B" }}>
                <FileText size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "#0F1E3C" }}>{indicator.code} · {indicator.name}</p>
                <p className="text-xs" style={{ color: "#5A7295" }}>{contextLabel}</p>
              </div>
            </div>

            <h3 className="text-sm font-bold mb-3" style={{ color: "#0F1E3C" }}>Fuentes de información requeridas</h3>
            {loadingCatalogo && (
              <div
                className="rounded-xl px-4 py-3 mb-3 text-xs"
                style={{
                  background: "#EEF5FF",
                  color: "#1B3A6B",
                  border: "1px solid rgba(37,99,235,0.15)",
                }}
              >
                Cargando fuentes de información desde la base de datos...
              </div>
            )}

            {catalogoError && (
              <div
                className="rounded-xl px-4 py-3 mb-3 text-xs"
                style={{
                  background: "#FEE2E2",
                  color: "#DC2626",
                  border: "1px solid rgba(220,38,38,0.15)",
                }}
              >
                {catalogoError}
              </div>
            )}
            <div className={`grid gap-3 ${indicator.slots.length <= 2 ? "grid-cols-2" : indicator.slots.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {indicator.slots.map((slot) => (
                <PdfZone
                  key={slot.sourceNum}
                  slot={slot}
                  fileName={`${career.code}.${cohort.replace(/\s+/g, "")}.C${career.criterionNum}.${indicator.num}.${slot.sourceNum}.${slot.nombreArchivoBase ?? "Evidencia"}.pdf`}
                  onChange={(updated) =>
                    updateSlot(indicator.id, updated)
                  }
                  onFileSelected={(selectedSlot, archivo) =>
                    procesarPdf(selectedSlot, archivo)
                  }
                  disabled={!!slot.sharedFrom}
                />
              ))}
            </div>

            {/* Guardar y volver at bottom */}
            <div className="flex justify-end mt-5">
            <button
              type="button"
              onClick={guardarEvidenciasSeleccionadas}
              disabled={guardando}
              className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95"
              style={{
              background: guardando ? "#94A3B8" : "#1B3A6B",
              color: "#fff",
              cursor: guardando ? "not-allowed" : "pointer",
            }}
            >
              {guardando
                ? "Guardando..."
                : "Guardar y volver →"}
            </button>    
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}