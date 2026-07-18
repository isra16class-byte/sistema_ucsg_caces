<?php
require_once __DIR__ . '/_helpers.php';
iniciarEndpoint(['GET']);
require_once __DIR__ . '/_encuesta.php';
require_once __DIR__ . '/../conexion.php';

$idAsignatura = isset($_GET['id_asignatura']) ? (int) $_GET['id_asignatura'] : 0;
$idEvaluacion = isset($_GET['id_evaluacion']) ? (int) $_GET['id_evaluacion'] : 0;
$materia = null;

if ($idEvaluacion <= 0) {
    responderJson(false, 'Parámetro id_evaluacion es requerido.', [], 400);
}

if ($idAsignatura > 0) {
    $stmt = $conexion->prepare('SELECT nombre FROM asignatura WHERE id_asignatura = ?');
    $stmt->bind_param('i', $idAsignatura);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    if (!$fila) {
        responderJson(false, 'Asignatura no encontrada.', [], 404);
    }
    $materia = $fila['nombre'];
}

$detalle = obtenerDetalleEncuesta($conexion, $idEvaluacion, $materia);

if ($detalle === null) {
    responderJson(false, 'No se pudo obtener la encuesta (sin datos y sin cache disponible).', [], 502);
}

responderJson(true, null, ['datos' => $detalle]);