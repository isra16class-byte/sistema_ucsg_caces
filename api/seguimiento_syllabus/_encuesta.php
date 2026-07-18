<?php
/**
 * Puerto de views.py (_descargar_csv, _buscar_columna, _calcular_ef_desde_csv,
 * obtener_detalle_encuesta) del módulo Django.
 *
 * CAMBIO DE FUENTE (ver memoria del proyecto): la encuesta ya NO se lee de un
 * CSV público publicado desde Google Sheets. Ahora se sube como evidencia del
 * slot DOC.SEG.05 (mismo mecanismo genérico de slots que DOC.SEG.01-04),
 * queda guardada en Google Drive, y este archivo la descarga desde ahí usando
 * el mismo cliente autorizado que ya usa la subida (api/google_drive).
 *
 * Requiere mysqli (para encontrar el archivo vigente en la tabla Evidencias)
 * y el cliente de Drive autorizado -- a diferencia de la versión anterior,
 * que no dependía de ninguno de los dos.
 */

const CODIGO_EVIDENCIA_ENCUESTA = 'DOC.SEG.05';

const PUNTAJE_MAP = [
    'Siempre'       => 5,
    'Casi siempre'  => 4,
    'Algunas veces' => 3,
    'Pocas veces'   => 2,
    'Nunca'         => 1,
];

/**
 * Busca en `evidencias` el archivo CSV vigente para esta evaluación (subido
 * vía el slot DOC.SEG.05) y devuelve su url_archivo de Drive (webViewLink),
 * o null si todavía no se ha subido ninguno para esta evaluación.
 */
function _buscarUrlCsvEncuesta(mysqli $conexion, int $idEvaluacion): ?string
{
    $sql = "SELECT url_archivo
            FROM evidencias
            WHERE codigo_evidencia = ?
              AND id_evaluacion = ?
            ORDER BY fecha_subida DESC
            LIMIT 1";

    $stmt = $conexion->prepare($sql);
    if (!$stmt) {
        error_log('seguimiento_syllabus: no se pudo preparar la búsqueda del CSV de encuesta: ' . $conexion->error);
        return null;
    }

    $codigo = CODIGO_EVIDENCIA_ENCUESTA;
    $stmt->bind_param('si', $codigo, $idEvaluacion);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();

    return $fila['url_archivo'] ?? null;
}

/**
 * Descarga el contenido del archivo de Drive dado su webViewLink
 * (https://drive.google.com/file/d/{ID}/view...), usando el cliente
 * autorizado que ya usa api/google_drive/subir_archivo.php. Si Drive no está
 * conectado o el token venció, cliente_autorizado.php lanza RuntimeException
 * -- se deja propagar y el llamador la atrapa (ver descargarCsvEncuesta).
 */
function _descargarContenidoDrive(string $urlArchivo): ?string
{
    if (!preg_match('#/d/([a-zA-Z0-9_-]+)#', $urlArchivo, $m)) {
        error_log("seguimiento_syllabus: no se pudo extraer el id de Drive de '{$urlArchivo}'.");
        return null;
    }
    $idArchivo = $m[1];

    require_once __DIR__ . '/../google_drive/drive_helpers.php';
    $cliente = require __DIR__ . '/../google_drive/cliente_autorizado.php';
    $drive = new Google\Service\Drive($cliente);

    $respuesta = $drive->files->get($idArchivo, ['alt' => 'media']);
    return $respuesta->getBody()->getContents();
}

function _rutaCacheCsv(int $idEvaluacion): string
{
    return sys_get_temp_dir() . '/seguimiento_syllabus_encuesta_cache_' . $idEvaluacion . '.csv';
}

// TTL del caché en disco, en segundos. Ya no hay descarga pública a Google
// Sheets, pero igual conviene no pegarle a la API de Drive en cada una de las
// ~8 llamadas por PAO que hace calcularResultadoGeneral() -- este caché por
// evaluación cubre eso, además de la memoización por petición de más abajo.
const TTL_CACHE_CSV_SEGUNDOS = 60;

function descargarCsvEncuesta(mysqli $conexion, int $idEvaluacion): ?array
{
    // Memoización por petición: calcularResultadoGeneral() llama a esta función
    // una vez por cada asignatura del PAO (vía calcularEfDesdeCsv). El static
    // está indexado por evaluación por si en algún flujo se llegara a consultar
    // más de una evaluación en la misma petición PHP.
    static $cache = [];

    if (array_key_exists($idEvaluacion, $cache)) {
        return $cache[$idEvaluacion];
    }

    $rutaCache = _rutaCacheCsv($idEvaluacion);

    if (is_readable($rutaCache) && (time() - filemtime($rutaCache)) < TTL_CACHE_CSV_SEGUNDOS) {
        $cacheContenido = file_get_contents($rutaCache);
        if ($cacheContenido !== false) {
            $cache[$idEvaluacion] = ['filas' => parseCsvString($cacheContenido), 'degradado' => false];
            return $cache[$idEvaluacion];
        }
    }

    $urlArchivo = _buscarUrlCsvEncuesta($conexion, $idEvaluacion);

    if ($urlArchivo === null) {
        // Todavía no se subió el CSV de la encuesta para esta evaluación.
        // No es un error -- calcularResultadoAsignatura() ya sabe tratar
        // "sin datos de encuesta" como EF1/EF4 pendientes.
        $cache[$idEvaluacion] = null;
        return null;
    }

    try {
        $contenido = _descargarContenidoDrive($urlArchivo);
    } catch (Throwable $e) {
        error_log('seguimiento_syllabus: no se pudo descargar el CSV de encuesta desde Drive: ' . $e->getMessage());
        $contenido = null;
    }

    if ($contenido !== null) {
        @file_put_contents($rutaCache, $contenido);
        $cache[$idEvaluacion] = ['filas' => parseCsvString($contenido), 'degradado' => false];
        return $cache[$idEvaluacion];
    }

    // Descarga fallida (p.ej. Drive desconectado): como último recurso se usa
    // el caché en disco aunque esté vencido -- mejor datos "degradados" que
    // ninguno.
    if (is_readable($rutaCache)) {
        $cacheContenido = file_get_contents($rutaCache);
        if ($cacheContenido !== false) {
            $cache[$idEvaluacion] = ['filas' => parseCsvString($cacheContenido), 'degradado' => true];
            return $cache[$idEvaluacion];
        }
    }

    $cache[$idEvaluacion] = null;
    return null;
}

function parseCsvString(string $contenido): array
{
    $filas = [];
    $handle = fopen('php://temp', 'r+');
    fwrite($handle, $contenido);
    rewind($handle);
    while (($fila = fgetcsv($handle)) !== false) {
        $filas[] = $fila;
    }
    fclose($handle);
    return $filas;
}

function detectarIndiceMateria(array $headers): ?int
{
    for ($i = 0; $i < min(3, count($headers)); $i++) {
        if (str_contains(mb_strtolower(trim($headers[$i])), 'materia')) {
            return $i;
        }
    }
    return count($headers) > 1 ? 1 : null;
}

function buscarColumnasPregunta(array $preguntas, int $numero): array
{
    $patron = '/\[P' . $numero . '[\.\]]/i';
    return array_values(array_filter($preguntas, fn($p) => preg_match($patron, $p) === 1));
}

function textoPregunta(string $header, int $numero): string
{
    if (preg_match('/\[P' . $numero . '\.?\s*(.*?)\]/i', $header, $m) && trim($m[1]) !== '') {
        return trim($m[1]);
    }
    return trim($header);
}

function calcularEfDesdeCsv(mysqli $conexion, int $idEvaluacion, ?string $materia = null): ?array
{
    $csv = descargarCsvEncuesta($conexion, $idEvaluacion);
    if ($csv === null) {
        return null;
    }

    $filas = $csv['filas'];
    if (empty($filas)) {
        return null;
    }

    $headers = array_shift($filas);
    $idxMateria = detectarIndiceMateria($headers);
    $preguntas = array_slice($headers, 3);

    $totales = array_fill_keys($preguntas, 0);
    $conteos = array_fill_keys($preguntas, 0);
    $totalFilas = 0;

    foreach ($filas as $fila) {
        if (count($fila) < 4) {
            continue;
        }
        if ($materia !== null && $idxMateria !== null) {
            if (!isset($fila[$idxMateria]) || mb_strtolower(trim($fila[$idxMateria])) !== mb_strtolower(trim($materia))) {
                continue;
            }
        }
        $totalFilas++;
        $respuestas = array_slice($fila, 3);
        foreach ($respuestas as $i => $valor) {
            if (!isset($preguntas[$i])) {
                continue;
            }
            $valor = trim($valor);
            if (isset(PUNTAJE_MAP[$valor])) {
                $totales[$preguntas[$i]] += PUNTAJE_MAP[$valor];
                $conteos[$preguntas[$i]]++;
            }
        }
    }

    $promedios = [];
    foreach ($preguntas as $p) {
        $promedios[$p] = $conteos[$p] > 0
            ? round(($totales[$p] / $conteos[$p] / 5) * 100, 1)
            : 0;
    }

    $ef1Pregs = array_merge(
        buscarColumnasPregunta($preguntas, 5),
        buscarColumnasPregunta($preguntas, 8),
        buscarColumnasPregunta($preguntas, 13),
    );
    $ef4Pregs = buscarColumnasPregunta($preguntas, 6);

    foreach ([[5, buscarColumnasPregunta($preguntas, 5), 'EF1 (P5)'],
              [8, buscarColumnasPregunta($preguntas, 8), 'EF1 (P8)'],
              [13, buscarColumnasPregunta($preguntas, 13), 'EF1 (P13)'],
              [6, $ef4Pregs, 'EF4 (P6)']] as [$numero, $cols, $nombreEf]) {
        if (empty($cols)) {
            error_log("seguimiento_syllabus: no se encontró la columna P{$numero} en el CSV (esperada para {$nombreEf}). ¿Cambió el formulario?");
        }
    }

    $promedioEfDecimal = function (array $pregList) use ($promedios): float {
        $vals = array_values(array_intersect_key($promedios, array_flip($pregList)));
        if (empty($vals)) {
            return 0.0;
        }
        return round((array_sum($vals) / count($vals)) / 100, 4);
    };

    return [
        'ef1' => $promedioEfDecimal($ef1Pregs),
        'ef4' => $promedioEfDecimal($ef4Pregs),
        'respuestas' => $totalFilas,
        'promedio_general' => !empty($promedios) ? round(array_sum($promedios) / count($promedios), 1) : 0,
        'degradado' => $csv['degradado'],
    ];
}

function obtenerDetalleEncuesta(mysqli $conexion, int $idEvaluacion, ?string $materia = null): ?array
{
    $csv = descargarCsvEncuesta($conexion, $idEvaluacion);
    if ($csv === null) {
        return null;
    }

    $filas = $csv['filas'];
    $headers = array_shift($filas);
    $idxMateria = detectarIndiceMateria($headers);
    $preguntas = array_slice($headers, 3);
    $opciones = array_keys(PUNTAJE_MAP);

    $conteos = [];
    foreach ($preguntas as $p) {
        $conteos[$p] = array_fill_keys($opciones, 0);
    }
    $totalFilasMateria = 0;

    foreach ($filas as $fila) {
        if (count($fila) < 4) {
            continue;
        }
        if ($materia !== null && $idxMateria !== null) {
            if (!isset($fila[$idxMateria]) || mb_strtolower(trim($fila[$idxMateria])) !== mb_strtolower(trim($materia))) {
                continue;
            }
        }
        $totalFilasMateria++;
        $respuestas = array_slice($fila, 3);
        foreach ($respuestas as $i => $valor) {
            if (!isset($preguntas[$i])) {
                continue;
            }
            $valor = trim($valor);
            if (in_array($valor, $opciones, true)) {
                $conteos[$preguntas[$i]][$valor]++;
            }
        }
    }

    $ef1Cols = array_merge(
        buscarColumnasPregunta($preguntas, 5),
        buscarColumnasPregunta($preguntas, 8),
        buscarColumnasPregunta($preguntas, 13),
    );
    $ef4Cols = buscarColumnasPregunta($preguntas, 6);

    $detalle = [];
    for ($numero = 1; $numero <= 23; $numero++) {
        $cols = buscarColumnasPregunta($preguntas, $numero);
        if (empty($cols)) {
            $detalle[] = [
                'numero' => $numero,
                'texto' => null,
                'es_ef1' => false,
                'es_ef4' => false,
                'conteos' => array_fill_keys($opciones, 0),
                'total' => 0,
            ];
            continue;
        }
        $col = $cols[0];
        $detalle[] = [
            'numero' => $numero,
            'texto' => textoPregunta($col, $numero),
            'es_ef1' => in_array($col, $ef1Cols, true),
            'es_ef4' => in_array($col, $ef4Cols, true),
            'conteos' => $conteos[$col],
            'total' => array_sum($conteos[$col]),
        ];
    }

    return [
        'materia_filtrada' => $materia,
        'respuestas_totales_materia' => $totalFilasMateria,
        'preguntas' => $detalle,
    ];
}

function obtenerMateriasDisponibles(mysqli $conexion, int $idEvaluacion): array
{
    $csv = descargarCsvEncuesta($conexion, $idEvaluacion);
    if ($csv === null) {
        return [];
    }
    $filas = $csv['filas'];
    $headers = array_shift($filas);
    $idxMateria = detectarIndiceMateria($headers);
    if ($idxMateria === null) {
        return [];
    }
    $materias = [];
    foreach ($filas as $fila) {
        if (isset($fila[$idxMateria]) && trim($fila[$idxMateria]) !== '') {
            $materias[trim($fila[$idxMateria])] = true;
        }
    }
    $lista = array_keys($materias);
    sort($lista);
    return $lista;
}