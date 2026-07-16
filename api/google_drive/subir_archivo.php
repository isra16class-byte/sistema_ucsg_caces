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

require_once __DIR__ . "/drive_helpers.php";

try {
    $cliente = require __DIR__ . "/cliente_autorizado.php";
    $drive = new Google\Service\Drive($cliente);

    $codigoCarrera = strtoupper(
        preg_replace(
            "/[^A-Z0-9]/",
            "",
            trim($_POST["codigo_carrera"] ?? "")
        )
    );

    $nombreCarrera = trim(
        $_POST["nombre_carrera"] ?? ""
    );

    $cohorte = strtoupper(
        preg_replace(
            "/[^A-Z0-9]/",
            "",
            trim($_POST["cohorte"] ?? "")
        )
    );

    $indicador = intval(
        $_POST["indicador"] ?? 0
    );

    $nombreArchivo = trim(
        $_POST["nombre_archivo"] ?? ""
    );

    if (
        $codigoCarrera === "" ||
        $nombreCarrera === "" ||
        $cohorte === "" ||
        $indicador <= 0 ||
        $nombreArchivo === ""
    ) {
        http_response_code(400);

        echo json_encode([
            "ok" => false,
            "mensaje" =>
                "Faltan datos para subir el archivo."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    if (!isset($_FILES["archivo"])) {
        http_response_code(400);

        echo json_encode([
            "ok" => false,
            "mensaje" =>
                "No se recibió ningún archivo."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $archivo = $_FILES["archivo"];

    if ($archivo["error"] !== UPLOAD_ERR_OK) {
        http_response_code(400);

        echo json_encode([
            "ok" => false,
            "mensaje" =>
                "Ocurrió un error al recibir el archivo."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $tamanoMaximo = 25 * 1024 * 1024;

    if ($archivo["size"] > $tamanoMaximo) {
        http_response_code(400);

        echo json_encode([
            "ok" => false,
            "mensaje" =>
                "El archivo no debe superar los 25 MB."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $extension = strtolower(
        pathinfo(
            $archivo["name"],
            PATHINFO_EXTENSION
        )
    );

    $finfo = new finfo(FILEINFO_MIME_TYPE);

    $mime = $finfo->file(
        $archivo["tmp_name"]
    );

    if (
        $extension !== "pdf" ||
        $mime !== "application/pdf"
    ) {
        http_response_code(400);

        echo json_encode([
            "ok" => false,
            "mensaje" =>
                "Solo se aceptan archivos PDF válidos."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    /*
     * Estructura final:
     *
     * Sistema CACES
     * └── Desarrollo de Software
     *     └── B2025
     *         └── archivo.pdf
     */
    $estructura = obtenerEstructuraCaces(
        $drive,
        $nombreCarrera,
        $cohorte
    );

    $idCarpetaDestino =
        $estructura["cohorte"];

    /*
     * Busca un archivo con el mismo nombre
     * dentro de la carpeta de la cohorte.
     */
    $nombreSeguro =
        escaparConsultaDrive($nombreArchivo);

    $idCarpetaSeguro =
        escaparConsultaDrive($idCarpetaDestino);

    $consulta = sprintf(
        "name = '%s' and " .
        "'%s' in parents and " .
        "trashed = false",
        $nombreSeguro,
        $idCarpetaSeguro
    );

    $resultadoExistente =
        $drive->files->listFiles([
            "q" => $consulta,
            "spaces" => "drive",
            "fields" => "files(id,name)",
            "pageSize" => 10,
        ]);

    $existentes =
        $resultadoExistente->getFiles();

    $contenido = file_get_contents(
        $archivo["tmp_name"]
    );

    if ($contenido === false) {
        throw new RuntimeException(
            "No se pudo leer el PDF temporal."
        );
    }

    if (count($existentes) > 0) {
        /*
         * Si ya existe, reemplaza su contenido.
         */
        $idArchivo = $existentes[0]->getId();

        $archivoDrive =
            $drive->files->update(
                $idArchivo,
                new Google\Service\Drive\DriveFile([
                    "name" => $nombreArchivo,
                ]),
                [
                    "data" => $contenido,
                    "mimeType" => "application/pdf",
                    "uploadType" => "multipart",
                    "fields" =>
                        "id,name,webViewLink,webContentLink",
                ]
            );

        $accion = "actualizado";
    } else {
        /*
         * Si no existe, crea el archivo.
         */
        $metadata =
            new Google\Service\Drive\DriveFile([
                "name" => $nombreArchivo,
                "parents" => [
                    $idCarpetaDestino,
                ],
            ]);

        $archivoDrive =
            $drive->files->create(
                $metadata,
                [
                    "data" => $contenido,
                    "mimeType" => "application/pdf",
                    "uploadType" => "multipart",
                    "fields" =>
                        "id,name,webViewLink,webContentLink",
                ]
            );

        $accion = "creado";
    }

    /*
     * Permitir que cualquier persona con el enlace
     * pueda visualizar el documento.
     */
    $idArchivoDrive =
        $archivoDrive->getId();

    $permiso = new Google\Service\Drive\Permission([
        "type" => "anyone",
        "role" => "reader",
    ]);

    try {
        $drive->permissions->create(
            $idArchivoDrive,
            $permiso,
            [
                "fields" => "id",
            ]
        );
    } catch (Google\Service\Exception $errorPermiso) {
    $codigoPermiso =
        intval($errorPermiso->getCode());

    /*
     * Solo ignoramos 409 cuando el permiso ya existe.
     * Un error 403 debe mostrarse para poder corregirlo.
     */
    if ($codigoPermiso !== 409) {
        throw $errorPermiso;
    }
}
    /*
     * Volver a consultar el archivo para obtener
     * los enlaces después de asignar el permiso.
     */
    $archivoDrive = $drive->files->get(
        $idArchivoDrive,
        [
            "fields" =>
                "id,name,webViewLink,webContentLink",
        ]
    );

    echo json_encode([
        "ok" => true,
        "mensaje" =>
            "PDF {$accion} correctamente en Google Drive.",
        "datos" => [
            "id_archivo" =>
                $archivoDrive->getId(),

            "nombre_archivo" =>
                $archivoDrive->getName(),

            "url_archivo" =>
                $archivoDrive->getWebViewLink(),

            "url_descarga" =>
                $archivoDrive->getWebContentLink(),

            "id_carpeta" =>
                $idCarpetaDestino,

            "codigo_carrera" =>
                $codigoCarrera,

            "nombre_carrera" =>
                $nombreCarrera,

            "cohorte" =>
                $cohorte,

            "indicador" =>
                $indicador,
        ],
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        "ok" => false,
        "mensaje" =>
            "No se pudo subir el PDF a Google Drive.",
        "detalle" =>
            $error->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}