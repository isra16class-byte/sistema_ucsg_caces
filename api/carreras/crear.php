<?php

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    echo json_encode([
        "ok" => false,
        "mensaje" => "Método no permitido."
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

session_start();

if (!isset($_SESSION["id_usuario"])) {
    http_response_code(401);

    echo json_encode([
        "ok" => false,
        "mensaje" => "La sesión no está activa."
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

require_once __DIR__ . "/../conexion.php";

$datos = json_decode(
    file_get_contents("php://input"),
    true
);

$codigo = strtoupper(
    preg_replace(
        "/[^A-Z0-9]/",
        "",
        trim($datos["codigo"] ?? "")
    )
);

$nombre = trim($datos["nombre"] ?? "");
$area = trim($datos["area_conocimiento"] ?? "");
$modalidad = trim($datos["modalidad"] ?? "");

if (
    $codigo === "" ||
    $nombre === "" ||
    $area === ""
) {
    http_response_code(400);

    echo json_encode([
        "ok" => false,
        "mensaje" => "Código, nombre y área son obligatorios."
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

$sql = "
    INSERT INTO Carreras (
        codigo,
        nombre,
        area_conocimiento,
        modalidad
    )
    VALUES (?, ?, ?, ?)
";

$stmt = $conexion->prepare($sql);

if (!$stmt) {
    http_response_code(500);

    echo json_encode([
        "ok" => false,
        "mensaje" => "No se pudo preparar la consulta.",
        "detalle" => $conexion->error
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

$stmt->bind_param(
    "ssss",
    $codigo,
    $nombre,
    $area,
    $modalidad
);

if (!$stmt->execute()) {
    http_response_code(500);

    echo json_encode([
        "ok" => false,
        "mensaje" => "No se pudo crear la carrera.",
        "detalle" => $stmt->error
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

echo json_encode([
    "ok" => true,
    "mensaje" => "Carrera creada correctamente.",
    "datos" => [
        "id_carrera" => intval($stmt->insert_id),
        "codigo" => $codigo,
        "nombre" => $nombre,
        "area_conocimiento" => $area,
        "modalidad" => $modalidad
    ]
], JSON_UNESCAPED_UNICODE);