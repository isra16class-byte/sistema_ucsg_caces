<?php
/**
 * Puerto de views.py (_descargar_csv, _buscar_columna, _calcular_ef_desde_csv,
 * obtener_detalle_encuesta) del módulo Django. Misma fuente de datos: un CSV
 * público publicado desde Google Sheets (Google Forms).
 *
 * No depende de mysqli/BD -- por eso este archivo no cambió respecto a la
 * versión anterior. Cache de respaldo en disco (sys_get_temp_dir()) porque
 * PHP-FPM/Apache no comparte memoria de proceso entre requests como sí
 * hacía el _CSV_CACHE en memoria de Django.
 */

const URL_CSV_ENCUESTA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9YX0N26YnO5pUAYc2U7JchenIAEasrpq0gs79Up0fOLrayn6JX-FmuolcXSkIL0MReJ7j0jpXPtC/pub?output=csv';

const PUNTAJE_MAP = [
    'Siempre'       => 5,
    'Casi siempre'  => 4,
    'Algunas veces' => 3,
    'Pocas veces'   => 2,
    'Nunca'         => 1,
];

function _rutaCacheCsv(): string
{
    return sys_get_temp_dir() . '/seguimiento_syllabus_encuesta_cache.csv';
}

function descargarCsvEncuesta(): ?array
{
    $ctx = stream_context_create([
        'http' => ['timeout' => 10, 'header' => "User-Agent: Mozilla/5.0\r\n"],
    ]);

    $contenido = @file_get_contents(URL_CSV_ENCUESTA, false, $ctx);

    if ($contenido !== false) {
        @file_put_contents(_rutaCacheCsv(), $contenido);
        return ['filas' => parseCsvString($contenido), 'degradado' => false];
    }

    error_log('seguimiento_syllabus: no se pudo descargar el CSV de la encuesta, intentando cache.');

    $rutaCache = _rutaCacheCsv();
    if (is_readable($rutaCache)) {
        $cacheContenido = file_get_contents($rutaCache);
        return ['filas' => parseCsvString($cacheContenido), 'degradado' => true];
    }

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

function calcularEfDesdeCsv(?string $materia = null): ?array
{
    $csv = descargarCsvEncuesta();
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

function obtenerDetalleEncuesta(?string $materia = null): ?array
{
    $csv = descargarCsvEncuesta();
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

function obtenerMateriasDisponibles(): array
{
    $csv = descargarCsvEncuesta();
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