<?php
header("Content-Type: application/json; charset=utf-8");

$dataFile = __DIR__ . "/../data/cars.js";
$dataDir = __DIR__ . "/../data";
$stockDir = __DIR__ . "/../assets/img/stock";

if (!is_dir($stockDir)) {
    @mkdir($stockDir, 0755, true);
}

echo json_encode([
    "ok" => true,
    "php" => PHP_VERSION,
    "carsFileExists" => file_exists($dataFile),
    "dataWritable" => is_writable($dataDir),
    "carsWritable" => file_exists($dataFile) ? is_writable($dataFile) : is_writable($dataDir),
    "stockWritable" => is_writable($stockDir)
    "gdLoaded" => extension_loaded("gd"),
    "webpSupport" => function_exists("imagewebp"),
    "maxUpload" => ini_get("upload_max_filesize"),
    "maxPost" => ini_get("post_max_size")
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
