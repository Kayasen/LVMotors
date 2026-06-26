<?php
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . "/config.php";

function respond($ok, $message, $extra = []) {
    echo json_encode(array_merge([
        "ok" => $ok,
        "message" => $message
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    respond(false, "Método inválido.");
}

$password = $_POST["password"] ?? "";
if (!hash_equals($ADMIN_PASSWORD, $password)) {
    http_response_code(403);
    respond(false, "Password inválida.");
}

$carsRaw = $_POST["cars"] ?? "";
if ($carsRaw === "") {
    http_response_code(400);
    respond(false, "Não foram recebidos dados.");
}

$cars = json_decode($carsRaw, true);
if (!is_array($cars)) {
    http_response_code(400);
    respond(false, "JSON inválido.");
}

foreach ($cars as $index => &$car) {
    if (!is_array($car)) {
        http_response_code(400);
        respond(false, "Estrutura inválida na viatura " . ($index + 1) . ".");
    }

    $car["order"] = $index;

    if (!isset($car["id"]) || trim((string)$car["id"]) === "") {
        $car["id"] = "viatura-" . ($index + 1);
    }

    if (!isset($car["status"]) || trim((string)$car["status"]) === "") {
        $car["status"] = "published";
    }

    if (!isset($car["images"]) || !is_array($car["images"])) {
        $car["images"] = [];
    }

    if (!isset($car["equipment"]) || !is_array($car["equipment"])) {
        $car["equipment"] = [];
    }
}
unset($car);

$dataDir = __DIR__ . "/../data";
$targetFile = $dataDir . "/cars.js";
$backupDir = $dataDir . "/backups";

if (!is_dir($dataDir)) {
    http_response_code(500);
    respond(false, "Pasta data não encontrada.");
}

if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0755, true);
}

if (!is_writable($dataDir) && (!file_exists($targetFile) || !is_writable($targetFile))) {
    http_response_code(500);
    respond(false, "Sem permissão para escrever em data/cars.js. No cPanel, confirma permissões da pasta data e do ficheiro cars.js.");
}

if (file_exists($targetFile)) {
    @copy($targetFile, $backupDir . "/cars-" . date("Ymd-His") . ".js");
}

$json = json_encode($cars, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($json === false) {
    http_response_code(500);
    respond(false, "Erro ao gerar JSON.");
}

$content = "window.LVM_CARS = " . $json . ";\nwindow.cars = window.LVM_CARS;\n";

$result = file_put_contents($targetFile, $content, LOCK_EX);
if ($result === false) {
    http_response_code(500);
    respond(false, "Não foi possível escrever em data/cars.js.");
}

respond(true, "Stock guardado com sucesso.", [
    "file" => "data/cars.js",
    "count" => count($cars),
    "bytes" => $result
]);
?>
