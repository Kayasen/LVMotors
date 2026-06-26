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

function safe_name($name) {
    $name = strtolower($name);
    $converted = @iconv("UTF-8", "ASCII//TRANSLIT//IGNORE", $name);
    if ($converted !== false) {
        $name = $converted;
    }
    $name = preg_replace("/[^a-z0-9\.\-_]+/", "-", $name);
    $name = trim($name, "-");
    return $name ?: "imagem";
}

function create_image_from_file($path, $mime) {
    if ($mime === "image/jpeg") {
        return @imagecreatefromjpeg($path);
    }

    if ($mime === "image/png") {
        return @imagecreatefrompng($path);
    }

    if ($mime === "image/webp" && function_exists("imagecreatefromwebp")) {
        return @imagecreatefromwebp($path);
    }

    return false;
}

function fix_orientation_if_needed($image, $path, $mime) {
    if ($mime !== "image/jpeg" || !function_exists("exif_read_data")) {
        return $image;
    }

    $exif = @exif_read_data($path);
    if (!$exif || empty($exif["Orientation"])) {
        return $image;
    }

    switch ((int)$exif["Orientation"]) {
        case 3:
            return imagerotate($image, 180, 0);
        case 6:
            return imagerotate($image, -90, 0);
        case 8:
            return imagerotate($image, 90, 0);
        default:
            return $image;
    }
}

function resize_image($source, $maxWidth, $maxHeight) {
    $width = imagesx($source);
    $height = imagesy($source);

    if ($width <= 0 || $height <= 0) {
        return false;
    }

    $ratio = min($maxWidth / $width, $maxHeight / $height, 1);
    $newWidth = max(1, (int)round($width * $ratio));
    $newHeight = max(1, (int)round($height * $ratio));

    $target = imagecreatetruecolor($newWidth, $newHeight);

    imagealphablending($target, false);
    imagesavealpha($target, true);

    $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
    imagefilledrectangle($target, 0, 0, $newWidth, $newHeight, $transparent);

    imagecopyresampled($target, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    return $target;
}

function save_optimized_image($tmp, $mime, $destinationNoExt) {
    /*
      Definições pensadas para cPanel com pouco espaço:
      - largura máxima: 1920px
      - altura máxima: 1440px
      - WebP qualidade 82: muito leve e com qualidade visual alta
      - fallback JPG qualidade 86 se WebP não existir no servidor
    */
    $maxWidth = 1920;
    $maxHeight = 1440;
    $webpQuality = 82;
    $jpegQuality = 86;

    if (!extension_loaded("gd")) {
        return false;
    }

    $source = create_image_from_file($tmp, $mime);

    if (!$source) {
        return false;
    }

    $source = fix_orientation_if_needed($source, $tmp, $mime);
    $resized = resize_image($source, $maxWidth, $maxHeight);

    if (!$resized) {
        imagedestroy($source);
        return false;
    }

    $savedPath = "";
    $publicExt = "";

    if (function_exists("imagewebp")) {
        $savedPath = $destinationNoExt . ".webp";
        $publicExt = "webp";
        $ok = imagewebp($resized, $savedPath, $webpQuality);
    } else {
        $savedPath = $destinationNoExt . ".jpg";
        $publicExt = "jpg";
        $white = imagecreatetruecolor(imagesx($resized), imagesy($resized));
        $bg = imagecolorallocate($white, 255, 255, 255);
        imagefill($white, 0, 0, $bg);
        imagecopy($white, $resized, 0, 0, 0, 0, imagesx($resized), imagesy($resized));
        $ok = imagejpeg($white, $savedPath, $jpegQuality);
        imagedestroy($white);
    }

    imagedestroy($source);
    imagedestroy($resized);

    if (!$ok || !file_exists($savedPath)) {
        return false;
    }

    return [
        "path" => $savedPath,
        "ext" => $publicExt,
        "size" => filesize($savedPath)
    ];
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

if (!isset($_FILES["images"])) {
    http_response_code(400);
    respond(false, "Nenhuma imagem recebida.");
}

$stockDir = __DIR__ . "/../assets/img/stock";
if (!is_dir($stockDir)) {
    @mkdir($stockDir, 0755, true);
}

if (!is_writable($stockDir)) {
    http_response_code(500);
    respond(false, "Sem permissão para escrever em assets/img/stock.");
}

$allowed = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp"
];

$files = $_FILES["images"];
$uploaded = [];
$details = [];
$count = is_array($files["name"]) ? count($files["name"]) : 1;
$finfo = finfo_open(FILEINFO_MIME_TYPE);

for ($i = 0; $i < $count; $i++) {
    $name = is_array($files["name"]) ? $files["name"][$i] : $files["name"];
    $tmp = is_array($files["tmp_name"]) ? $files["tmp_name"][$i] : $files["tmp_name"];
    $error = is_array($files["error"]) ? $files["error"][$i] : $files["error"];
    $size = is_array($files["size"]) ? $files["size"][$i] : $files["size"];

    if ($error !== UPLOAD_ERR_OK) {
        continue;
    }

    if ($size > 35 * 1024 * 1024) {
        continue;
    }

    $mime = finfo_file($finfo, $tmp);

    if (!isset($allowed[$mime])) {
        continue;
    }

    $base = pathinfo($name, PATHINFO_FILENAME);
    $safe = safe_name($base);
    $finalBase = $safe . "-" . date("Ymd-His") . "-" . bin2hex(random_bytes(3));
    $destinationNoExt = $stockDir . "/" . $finalBase;

    $optimized = save_optimized_image($tmp, $mime, $destinationNoExt);

    if ($optimized !== false) {
        $publicPath = "assets/img/stock/" . $finalBase . "." . $optimized["ext"];
        $uploaded[] = $publicPath;
        $details[] = [
            "file" => $publicPath,
            "originalBytes" => (int)$size,
            "optimizedBytes" => (int)$optimized["size"],
            "savedBytes" => max(0, (int)$size - (int)$optimized["size"])
        ];
    }
}

finfo_close($finfo);

if (count($uploaded) === 0) {
    http_response_code(400);
    respond(false, "Não foi possível carregar/comprimir as imagens. Usa JPG, PNG ou WEBP.");
}

respond(true, "Imagens carregadas e comprimidas com sucesso.", [
    "images" => $uploaded,
    "details" => $details
]);
?>