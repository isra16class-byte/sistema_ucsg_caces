<?php

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");

require_once __DIR__ . "/../conexion.php";

$sql = "
    SELECT
        id_carrera,
        codigo,
        nombre,
        area_conocimiento,
        modalidad
    FROM Carreras
    ORDER BY area_conocimiento, nombre
";

$resultado = $conexion->query($sql);

if (!$resultado) {
    http_response_code(500);

    echo json_encode([
        "ok" => false,
        "mensaje" => "No se pudieron consultar las carreras.",
        "detalle" => $conexion->error
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

$carreras = [];

while ($fila = $resultado->fetch_assoc()) {
    $carreras[] = [
        "id_carrera" => intval($fila["id_carrera"]),
        "codigo" => $fila["codigo"],
        "nombre" => $fila["nombre"],
        "area_conocimiento" => $fila["area_conocimiento"],
        "modalidad" => $fila["modalidad"]
    ];
}

echo json_encode([
    "ok" => true,
    "datos" => $carreras
], JSON_UNESCAPED_UNICODE);