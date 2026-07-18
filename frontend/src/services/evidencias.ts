export interface PrepararPdfResponse {
  ok: boolean;
  mensaje: string;
  datos?: {
    id_catalogo: number;
    codigo_evidencia: string;
    descripcion: string;
    nombre_original: string;
    nombre_generado: string;
    tipo: string;
    tamano: number;
    url_archivo: string;
  };
}

interface PrepararPdfParams {
  archivo: File;
  idCatalogo: number;
  codigoCarrera: string;
  cohorte: string;
  criterio: number;
  indicador: number;
}

export async function prepararPdf({
  archivo,
  idCatalogo,
  codigoCarrera,
  cohorte,
  criterio,
  indicador,
}: PrepararPdfParams): Promise<PrepararPdfResponse> {
  const formulario = new FormData();

  formulario.append("archivo", archivo);
  formulario.append("id_catalogo", String(idCatalogo));
  formulario.append("codigo_carrera", codigoCarrera);
  formulario.append("cohorte", cohorte);
  formulario.append("criterio", String(criterio));
  formulario.append("indicador", String(indicador));

  const respuesta = await fetch(
    "http://localhost/sistemacaces/api/evidencias/preparar_pdf.php",
    {
      method: "POST",
      credentials: "include",
      body: formulario,
    },
  );

  const datos = (await respuesta.json()) as PrepararPdfResponse;

  if (!respuesta.ok || !datos.ok) {
    throw new Error(
      datos.mensaje || "No se pudo procesar el archivo.",
    );
  }

  return datos;
}

export interface CatalogoEvidencia {
  id_catalogo: number;
  codigo_evidencia: string;
  titulo_corto: string;
  descripcion: string;
  nombre_archivo_base: string;
  orden: number;
}

interface CatalogoResponse {
  ok: boolean;
  mensaje?: string;
  datos: CatalogoEvidencia[];
}

export async function obtenerCatalogoEvidencias(
  idIndicador: number,
): Promise<CatalogoEvidencia[]> {
  const respuesta = await fetch(
    `http://localhost/sistemacaces/api/catalogo/obtener_evidencias.php?id_indicador=${idIndicador}`,
    {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const datos = (await respuesta.json()) as CatalogoResponse;

  if (!respuesta.ok || !datos.ok) {
    throw new Error(
      datos.mensaje ||
        "No se pudo cargar el catálogo de evidencias.",
    );
  }

  return datos.datos;
}

export interface EvaluacionResponse {
  id_evaluacion: number;
  nombre_evaluacion: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  id_carrera: number;
  codigo_carrera: string;
  carrera: string;
  id_cohorte: number;
  nombre_cohorte: string;
}

interface ObtenerEvaluacionResponse {
  ok: boolean;
  mensaje?: string;
  datos?: EvaluacionResponse;
}

export async function obtenerEvaluacion(
  codigoCarrera: string,
  cohorte: string,
): Promise<EvaluacionResponse> {
  const parametros = new URLSearchParams({
    codigo_carrera: codigoCarrera,
    cohorte,
  });

  const respuesta = await fetch(
    `http://localhost/sistemacaces/api/evaluaciones/obtener_evaluacion.php?${parametros.toString()}`,
    {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const datos =
    (await respuesta.json()) as ObtenerEvaluacionResponse;

  if (!respuesta.ok || !datos.ok || !datos.datos) {
    throw new Error(
      datos.mensaje ||
        "No se pudo obtener la evaluación.",
    );
  }

  return datos.datos;
}

interface GuardarEvidenciaParams {
  idCatalogo: number;
  idEvaluacion: number;
  codigoEvidencia: string;
  descripcion: string;
  nombreArchivo: string;
  tipo: string;
  urlArchivo: string;
}

interface GuardarEvidenciaResponse {
  ok: boolean;
  mensaje: string;
  id_evidencia?: number;
}

export async function guardarEvidencia({
  idCatalogo,
  idEvaluacion,
  codigoEvidencia,
  descripcion,
  nombreArchivo,
  tipo,
  urlArchivo,
}: GuardarEvidenciaParams): Promise<GuardarEvidenciaResponse> {
  const respuesta = await fetch(
    "http://localhost/sistemacaces/api/evidencias/guardar_evidencia.php",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id_catalogo: idCatalogo,
        id_evaluacion: idEvaluacion,
        codigo_evidencia: codigoEvidencia,
        descripcion,
        nombre_archivo: nombreArchivo,
        tipo,
        url_archivo: urlArchivo,
      }),
    },
  );

  const datos =
    (await respuesta.json()) as GuardarEvidenciaResponse;

  if (!respuesta.ok || !datos.ok) {
    throw new Error(
      datos.mensaje ||
        "No se pudo guardar la evidencia.",
    );
  }

  return datos;
}

export interface EvidenciaGuardada {
  id_evidencia: number;
  id_catalogo: number;
  id_evaluacion: number;
  codigo_evidencia: string;
  descripcion: string;
  nombre_archivo: string;
  tipo: string;
  url_archivo: string;
  fecha_subida: string;
  titulo_corto: string;
  nombre_archivo_base: string;
  orden: number;
}

interface EvidenciasGuardadasResponse {
  ok: boolean;
  mensaje?: string;
  datos: EvidenciaGuardada[];
}

export async function obtenerEvidenciasGuardadas(
  idEvaluacion: number,
  idIndicador: number,
): Promise<EvidenciaGuardada[]> {
  const parametros = new URLSearchParams({
    id_evaluacion: String(idEvaluacion),
    id_indicador: String(idIndicador),
  });

  const respuesta = await fetch(
    `http://localhost/sistemacaces/api/evidencias/obtener_evidencias_guardadas.php?${parametros.toString()}`,
    {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const datos =
    (await respuesta.json()) as EvidenciasGuardadasResponse;

  if (!respuesta.ok || !datos.ok) {
    throw new Error(
      datos.mensaje ||
        "No se pudieron consultar las evidencias guardadas.",
    );
  }

  return datos.datos;
}

export interface EvidenciaCompartida {
  id_evidencia: number;
  id_catalogo: number;
  id_evaluacion: number;
  codigo_evidencia: string;
  descripcion: string;
  nombre_archivo: string;
  tipo: string;
  url_archivo: string;
  fecha_subida: string;
  titulo_corto: string;
  nombre_archivo_base: string;
  orden: number;
  id_indicador_origen: number;
  indicador_origen: string;
}

interface EvidenciasCompartidasResponse {
  ok: boolean;
  mensaje?: string;
  datos: EvidenciaCompartida[];
}

export async function obtenerEvidenciasCompartidas(
  idEvaluacion: number,
  idIndicadorDestino: number,
): Promise<EvidenciaCompartida[]> {
  const parametros = new URLSearchParams({
    id_evaluacion: String(idEvaluacion),
    id_indicador_destino: String(
      idIndicadorDestino,
    ),
  });

  const respuesta = await fetch(
    `http://localhost/sistemacaces/api/evidencias/obtener_compartidas.php?${parametros.toString()}`,
    {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const datos =
    (await respuesta.json()) as EvidenciasCompartidasResponse;

  if (!respuesta.ok || !datos.ok) {
    throw new Error(
      datos.mensaje ||
        "No se pudieron consultar las evidencias compartidas.",
    );
  }

  return datos.datos;
}

export interface SubirDriveResponse {
  ok: boolean;
  mensaje: string;
  datos?: {
    id_archivo: string;
    nombre_archivo: string;
    url_archivo: string;
    url_descarga?: string | null;
    id_carpeta: string;
    codigo_carrera: string;
    nombre_carrera: string;
    cohorte: string;
    indicador: number;
  };
}

interface SubirDriveParams {
  archivo: File;
  codigoCarrera: string;
  nombreCarrera: string;
  cohorte: string;
  indicador: number;
  nombreArchivo: string;
  // "pdf" (default, retrocompatible con todos los slots existentes) o "csv"
  // para el slot de resultados de encuesta.
  tipoEsperado?: "pdf" | "csv";
}

export async function subirPdfGoogleDrive({
  archivo,
  codigoCarrera,
  nombreCarrera,
  cohorte,
  indicador,
  nombreArchivo,
  tipoEsperado = "pdf",
}: SubirDriveParams): Promise<SubirDriveResponse> {
  const formulario = new FormData();

  formulario.append("archivo", archivo);
  formulario.append("codigo_carrera", codigoCarrera);
  formulario.append("nombre_carrera", nombreCarrera);
  formulario.append("cohorte", cohorte);
  formulario.append("indicador", String(indicador));
  formulario.append("nombre_archivo", nombreArchivo);
  formulario.append("tipo_esperado", tipoEsperado);

  const respuesta = await fetch(
    "http://localhost/sistemacaces/api/google_drive/subir_archivo.php",
    {
      method: "POST",
      credentials: "include",
      body: formulario,
    },
  );

  const datos =
    (await respuesta.json()) as SubirDriveResponse;

  if (!respuesta.ok || !datos.ok || !datos.datos) {
    throw new Error(
      datos.mensaje ||
        "No se pudo subir el PDF a Google Drive.",
    );
  }

  return datos;
}

export interface LecturaMatriculadosResponse {
  ok: boolean;
  mensaje: string;
  datos?: {
    matriculados: number;
    periodo: string | null;
    cohorte_detectada: string | null;
  };
}

export async function leerMatriculadosPdf(
  archivo: File,
): Promise<LecturaMatriculadosResponse> {
  const formulario = new FormData();

  formulario.append("archivo", archivo);

  const respuesta = await fetch(
    "http://localhost/sistemacaces/api/evidencias/leer_matriculados.php",
    {
      method: "POST",
      credentials: "include",
      body: formulario,
    },
  );

  const datos =
    (await respuesta.json()) as LecturaMatriculadosResponse;

  if (
    !respuesta.ok ||
    !datos.ok ||
    !datos.datos
  ) {
    throw new Error(
      datos.mensaje ||
        "No se pudo leer el PDF de matriculados.",
    );
  }

  return datos;
}

export interface CohorteTitulacion {

  cohorte:string;

  matriculados:number;

  graduados:number;

  tasa:number;

}

export async function obtenerDatosTasa(
  idEvaluacion:number
):  Promise<CohorteTitulacion[]>{
  const respuesta=await fetch(
    `http://localhost/sistemacaces/api/tasa_titulacion/obtener.php?id_evaluacion=${idEvaluacion}`,
  {
    method: "GET",
    credentials:"include",
    headers: {
        Accept: "application/json",
    },
  }
);

const datos=await respuesta.json();

 if (!respuesta.ok || !datos.ok) {
    throw new Error(
      datos.mensaje ||
        "No se pudieron consultar los datos.",
    );
  }

  return datos.datos ?? [];

}

export type TipoDatoTitulacion =
  | "matriculados"
  | "graduados";

export interface LecturaPdfTitulacion {
  tipo_dato: TipoDatoTitulacion;
  total: number;
  metodo:
    | "total_reportado"
    | "identificaciones_unicas";
  cohorte_detectada: string | null;
  periodo_detectado: string | null;
  identificaciones_detectadas: number;
}

interface LeerPdfTitulacionResponse {
  ok: boolean;
  mensaje: string;
  datos?: LecturaPdfTitulacion;
}

export async function leerPdfTitulacion(
  archivo: File,
  tipoDato: TipoDatoTitulacion,
): Promise<LecturaPdfTitulacion> {
  const formulario = new FormData();

  formulario.append("archivo", archivo);
  formulario.append("tipo_dato", tipoDato);

  const respuesta = await fetch(
    "http://localhost/sistemacaces/api/tasa_titulacion/leer_pdf.php",
    {
      method: "POST",
      credentials: "include",
      body: formulario,
    },
  );

  const datos =
    (await respuesta.json()) as LeerPdfTitulacionResponse;

  if (
    !respuesta.ok ||
    !datos.ok ||
    !datos.datos
  ) {
    throw new Error(
      datos.mensaje ||
        "No se pudo leer el PDF.",
    );
  }

  return datos.datos;
}

interface GuardarDatoTitulacionParams {
  idEvaluacion: number;
  cohorte: string;
  matriculados?: number;
  graduados?: number;
}

export interface DatoTitulacionGuardado {
  id_evaluacion: number;
  cohorte: string;
  matriculados: number | null;
  graduados: number | null;
  tasa: number | null;
}

interface GuardarDatoTitulacionResponse {
  ok: boolean;
  mensaje: string;
  datos?: DatoTitulacionGuardado;
}

export async function guardarDatoTitulacion({
  idEvaluacion,
  cohorte,
  matriculados,
  graduados,
}: GuardarDatoTitulacionParams): Promise<DatoTitulacionGuardado> {
  const cuerpo: Record<string, string | number> = {
    id_evaluacion: idEvaluacion,
    cohorte,
  };

  if (matriculados !== undefined) {
    cuerpo.matriculados = matriculados;
  }

  if (graduados !== undefined) {
    cuerpo.graduados = graduados;
  }

  const respuesta = await fetch(
    "http://localhost/sistemacaces/api/tasa_titulacion/guardar.php",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(cuerpo),
    },
  );

  const datos =
    (await respuesta.json()) as GuardarDatoTitulacionResponse;

  if (
    !respuesta.ok ||
    !datos.ok ||
    !datos.datos
  ) {
    throw new Error(
      datos.mensaje ||
        "No se pudo guardar el cálculo.",
    );
  }

  return datos.datos;
}