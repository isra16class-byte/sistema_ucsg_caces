<?php
require_once __DIR__ . '/_helpers.php';
iniciarEndpoint(['GET']);
require_once __DIR__ . '/_encuesta.php';
require_once __DIR__ . '/../conexion.php';

$idEvaluacion = isset($_GET['id_evaluacion']) ? (int) $_GET['id_evaluacion'] : 0;

if ($idEvaluacion <= 0) {
    responderJson(false, 'Parámetro id_evaluacion es requerido.', [], 400);
}

responderJson(true, null, ['datos' => obtenerMateriasDisponibles($conexion, $idEvaluacion)]);