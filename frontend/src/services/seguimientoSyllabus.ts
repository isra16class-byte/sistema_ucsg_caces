const BASE = "http://localhost/sistemacaces/api/seguimiento_syllabus";

async function getJson<T>(url: string): Promise<T> {
  const respuesta = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const datos = await respuesta.json();
  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No se pudo completar la solicitud.");
  }
  return datos.datos as T;
}

// ── Periodos académicos (PAO) ───────────────────────────────────────────
export interface PeriodoAcademico {
  id_periodoacademico: number;
  nombre: string;
  orden: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export function obtenerPeriodos(idCohorte: number): Promise<PeriodoAcademico[]> {
  return getJson(`${BASE}/periodos.php?id_cohorte=${idCohorte}`);
}

// ── Asignaturas ──────────────────────────────────────────────────────────
export interface AsignaturaReal {
  id_asignatura: number;
  nombre: string;
  docente: string | null;
}

export function obtenerAsignaturas(idPeriodo: number): Promise<AsignaturaReal[]> {
  return getJson(`${BASE}/asignaturas.php?id_periodo=${idPeriodo}`);
}

// ── Resultado EF1-EF5 ────────────────────────────────────────────────────
export interface EvidenciaInfo {
  subida: boolean;
  label: string;
}

export interface ResultadoAsignatura {
  id_asignatura: number;
  nombre_asignatura: string;
  valoracion_general: number | null;
  estado_general: "completo" | "parcial" | "sin_datos";
  escala: string | null;
  color_escala: string | null;
  evidencias_info: Record<string, EvidenciaInfo>;
  ef1: number | null; ef1_estado: string;
  ef2: number | null; ef2_estado: string;
  ef3: number | null; ef3_estado: string;
  ef4: number | null; ef4_estado: string;
  ef5: number | null; ef5_estado: string;
  respuestas: number;
  promedio_general: number;
}

export interface ResultadoCohorte extends Omit<ResultadoAsignatura, "id_asignatura" | "nombre_asignatura" | "evidencias_info"> {
  detalle_asignaturas: ResultadoAsignatura[];
}

export function obtenerResultadoAsignatura(idAsignatura: number, idEvaluacion: number): Promise<ResultadoAsignatura> {
  return getJson(`${BASE}/resultado_asignatura.php?id_asignatura=${idAsignatura}&id_evaluacion=${idEvaluacion}`);
}

export function obtenerResultadoCohorte(idCohorte: number, idEvaluacion: number, idPeriodo?: number): Promise<ResultadoCohorte> {
  const params = new URLSearchParams({
    id_cohorte: String(idCohorte),
    id_evaluacion: String(idEvaluacion),
  });
  if (idPeriodo) params.set("id_periodo", String(idPeriodo));
  return getJson(`${BASE}/resultado_cohorte.php?${params.toString()}`);
}

// ── Evidencia por asignatura (syllabus, actas, difusión) ────────────────
export type TipoEvidenciaAsignatura =
  | "syllabus"
  | "acta_retroalimentacion"
  | "acta_ajuste_curricular"
  | "evidencia_difusion";

export interface EvidenciaAsignaturaItem {
  tipo: TipoEvidenciaAsignatura;
  label: string;
  subida: boolean;
  archivo: {
    id_evidencia_asig: number;
    nombre_archivo: string;
    url_archivo: string;
    subido_por: string | null;
    fecha_subida: string;
  } | null;
}

export function obtenerEvidenciaAsignatura(idAsignatura: number): Promise<EvidenciaAsignaturaItem[]> {
  return getJson(`${BASE}/evidencia_asignatura_listar.php?id_asignatura=${idAsignatura}`);
}

export async function subirEvidenciaAsignatura(params: {
  idAsignatura: number;
  tipo: TipoEvidenciaAsignatura;
  archivo: File;
}): Promise<{ id_evidencia_asig: number; url_archivo: string }> {
  const formulario = new FormData();
  formulario.append("id_asignatura", String(params.idAsignatura));
  formulario.append("tipo", params.tipo);
  formulario.append("archivo", params.archivo);

  const respuesta = await fetch(`${BASE}/evidencia_asignatura_subir.php`, {
    method: "POST",
    credentials: "include",
    body: formulario,
  });

  const datos = await respuesta.json();
  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No se pudo subir la evidencia.");
  }
  return datos.datos;
}