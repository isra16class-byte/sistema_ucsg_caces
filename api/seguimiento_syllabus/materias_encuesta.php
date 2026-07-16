<?php
require_once __DIR__ . '/_helpers.php';
iniciarEndpoint(['GET']);
require_once __DIR__ . '/_encuesta.php';

responderJson(true, null, ['datos' => obtenerMateriasDisponibles()]);