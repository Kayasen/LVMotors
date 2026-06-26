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

$text = trim($_POST["text"] ?? "");
if ($text === "") {
    respond(true, "Texto vazio.", ["translated" => ""]);
}

if (!isset($DEEPL_API_KEY) || trim($DEEPL_API_KEY) === "") {
    http_response_code(400);
    respond(false, "A tradução automática precisa de uma chave DeepL em admin/config.php.");
}

$endpoint = $DEEPL_ENDPOINT ?? "https://api-free.deepl.com/v2/translate";

$postFields = http_build_query([
    "auth_key" => $DEEPL_API_KEY,
    "text" => $text,
    "source_lang" => "PT",
    "target_lang" => "EN-GB"
]);

$ch = curl_init($endpoint);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);

$response = curl_exec($ch);
$error = curl_error($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $status >= 400) {
    http_response_code(500);
    respond(false, "Erro na tradução automática: " . ($error ?: "HTTP " . $status));
}

$data = json_decode($response, true);
$translated = $data["translations"][0]["text"] ?? "";

if ($translated === "") {
    http_response_code(500);
    respond(false, "A API de tradução não devolveu texto.");
}

respond(true, "Traduzido com sucesso.", ["translated" => $translated]);
?>