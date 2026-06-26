<?php
header("Content-Type: text/html; charset=utf-8");
require __DIR__ . "/config.php";

set_time_limit(0);
ini_set("memory_limit", "512M");

function h($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, "UTF-8");
}

function safe_name($name) {
    $name = strtolower((string)$name);
    $converted = @iconv("UTF-8", "ASCII//TRANSLIT//IGNORE", $name);
    if ($converted !== false) {
        $name = $converted;
    }
    $name = preg_replace("/[^a-z0-9\-_]+/", "-", $name);
    $name = trim($name, "-");
    return $name ?: "imagem";
}

function is_remote_url($url) {
    return is_string($url) && preg_match("#^https?://#i", trim($url));
}

function create_image_from_file($path, $mime) {
    if ($mime === "image/jpeg") return @imagecreatefromjpeg($path);
    if ($mime === "image/png") return @imagecreatefrompng($path);
    if ($mime === "image/webp" && function_exists("imagecreatefromwebp")) return @imagecreatefromwebp($path);
    return false;
}

function fix_orientation_if_needed($image, $path, $mime) {
    if ($mime !== "image/jpeg" || !function_exists("exif_read_data")) return $image;
    $exif = @exif_read_data($path);
    if (!$exif || empty($exif["Orientation"])) return $image;

    switch ((int)$exif["Orientation"]) {
        case 3: return imagerotate($image, 180, 0);
        case 6: return imagerotate($image, -90, 0);
        case 8: return imagerotate($image, 90, 0);
        default: return $image;
    }
}

function resize_image($source, $maxWidth, $maxHeight) {
    $width = imagesx($source);
    $height = imagesy($source);
    if ($width <= 0 || $height <= 0) return false;

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
    $maxWidth = 1920;
    $maxHeight = 1440;
    $webpQuality = 82;
    $jpegQuality = 86;

    if (!extension_loaded("gd")) return [false, "A extensão GD não está ativa no servidor."];

    $source = create_image_from_file($tmp, $mime);
    if (!$source) return [false, "Formato de imagem não suportado: " . $mime];

    $source = fix_orientation_if_needed($source, $tmp, $mime);
    $resized = resize_image($source, $maxWidth, $maxHeight);
    if (!$resized) {
        imagedestroy($source);
        return [false, "Não foi possível redimensionar a imagem."];
    }

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
        return [false, "Falha ao gravar imagem otimizada."];
    }

    return [["path" => $savedPath, "ext" => $publicExt, "size" => filesize($savedPath)], ""];
}

function download_remote_image($url, $tmpPath) {
    $url = trim($url);
    if (!is_remote_url($url)) return [false, "URL inválido."];

    $fp = @fopen($tmpPath, "w");
    if (!$fp) return [false, "Sem permissão para criar ficheiro temporário."];

    if (function_exists("curl_init")) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_TIMEOUT => 90,
            CURLOPT_USERAGENT => "LVMOTORS image importer",
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FAILONERROR => true
        ]);
        $ok = curl_exec($ch);
        $err = curl_error($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        fclose($fp);

        if (!$ok || !file_exists($tmpPath) || filesize($tmpPath) < 1000) {
            @unlink($tmpPath);
            return [false, $err ?: "HTTP " . $code];
        }
        return [true, ""];
    }

    fclose($fp);
    $ctx = stream_context_create([
        "http" => ["timeout" => 90, "header" => "User-Agent: LVMOTORS image importer\r\n"],
        "ssl" => ["verify_peer" => true, "verify_peer_name" => true]
    ]);
    $content = @file_get_contents($url, false, $ctx);
    if ($content === false || strlen($content) < 1000) {
        @unlink($tmpPath);
        return [false, "Download falhou."];
    }
    file_put_contents($tmpPath, $content);
    return [true, ""];
}

function read_cars_file($carsFile) {
    $raw = file_get_contents($carsFile);
    if ($raw === false) return [false, "Não foi possível ler data/cars.js."];

    if (!preg_match('/window\.LVM_CARS\s*=\s*(\[.*?\]);/s', $raw, $m)) {
        return [false, "Não foi possível encontrar window.LVM_CARS dentro de data/cars.js."];
    }

    $cars = json_decode($m[1], true);
    if (!is_array($cars)) {
        return [false, "JSON do stock inválido: " . json_last_error_msg()];
    }

    return [$cars, ""];
}

function write_cars_file($carsFile, $cars) {
    $backup = dirname($carsFile) . "/cars.backup-" . date("Ymd-His") . ".js";
    @copy($carsFile, $backup);

    $json = json_encode($cars, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) return [false, "Erro a gerar JSON: " . json_last_error_msg()];

    $content = "window.LVM_CARS=" . $json . ";\n\n";
    $content .= "/* ===== LVMOTORS STOCK COMPATIBILITY ===== */\n";
    $content .= "window.LVM_CARS = window.LVM_CARS || window.cars || window.CARS || [];\n";
    $content .= "window.cars = window.LVM_CARS;\n";
    $content .= "/* ===== END LVMOTORS STOCK COMPATIBILITY ===== */\n";

    if (file_put_contents($carsFile, $content, LOCK_EX) === false) {
        return [false, "Não foi possível gravar data/cars.js."];
    }

    return [true, basename($backup)];
}

function page_header() {
    echo '<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Importar fotos remotas | LVMOTORS</title><style>body{margin:0;background:#111;color:#fff;font-family:Arial,sans-serif}.wrap{max-width:900px;margin:0 auto;padding:38px 22px}.card{background:#1d1d1d;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:24px;box-shadow:0 20px 70px rgba(0,0,0,.35)}h1{margin:0 0 10px;font-size:28px}p{color:#cfcfcf;line-height:1.65}.btn{border:0;border-radius:999px;background:#d6b87c;color:#111;font-weight:800;padding:14px 22px;cursor:pointer}input{width:100%;max-width:360px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#111;color:#fff;margin:10px 0 16px}.ok{color:#b7ffca}.bad{color:#ffb3b3}.muted{color:#aaa}.log{background:#0b0b0b;border-radius:14px;padding:14px;max-height:420px;overflow:auto;font-size:13px;line-height:1.55}.row{border-bottom:1px solid rgba(255,255,255,.08);padding:8px 0}.small{font-size:13px}</style></head><body><div class="wrap"><div class="card">';
}
function page_footer() {
    echo '</div></div></body></html>';
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    page_header();
    echo '<h1>Importar fotos remotas</h1>';
    echo '<p>Esta ferramenta vai buscar as imagens que ainda estão em links externos, comprime para WEBP/JPG e atualiza o <strong>data/cars.js</strong> para usar imagens locais em <strong>assets/img/stock/</strong>.</p>';
    echo '<p class="muted small">Usa apenas uma vez depois de subires o site para o cPanel. Antes de alterar, é criado backup automático do cars.js.</p>';
    echo '<form method="post"><label>Password do painel</label><br><input type="password" name="password" autocomplete="current-password" required><br><button class="btn" type="submit">Importar e comprimir fotos</button></form>';
    page_footer();
    exit;
}

$password = $_POST["password"] ?? "";
if (!hash_equals($ADMIN_PASSWORD, $password)) {
    http_response_code(403);
    page_header();
    echo '<h1 class="bad">Password inválida</h1><p>Volta atrás e tenta novamente.</p>';
    page_footer();
    exit;
}

page_header();
echo '<h1>Importação em curso</h1>';
@ob_flush(); @flush();

$carsFile = __DIR__ . "/../data/cars.js";
$stockRoot = __DIR__ . "/../assets/img/stock";
if (!is_dir($stockRoot)) @mkdir($stockRoot, 0755, true);

if (!is_writable($stockRoot)) {
    echo '<p class="bad">Sem permissão para escrever em assets/img/stock.</p>';
    page_footer();
    exit;
}

list($cars, $readError) = read_cars_file($carsFile);
if ($cars === false) {
    echo '<p class="bad">' . h($readError) . '</p>';
    page_footer();
    exit;
}

if (!extension_loaded("gd")) {
    echo '<p class="bad">A extensão GD do PHP não está ativa. Ativa GD no cPanel/PHP Selector antes de continuar.</p>';
    page_footer();
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$urlMap = [];
$imported = 0;
$failed = 0;
$skipped = 0;
$totalOriginal = 0;
$totalOptimized = 0;
$logs = [];

foreach ($cars as $carIndex => &$car) {
    $carId = safe_name($car["id"] ?? ($car["titulo"] ?? ("viatura-" . ($carIndex + 1))));
    $carDir = $stockRoot . "/" . $carId;
    if (!is_dir($carDir)) @mkdir($carDir, 0755, true);

    $images = [];
    if (!empty($car["imagem"])) $images[] = $car["imagem"];
    if (!empty($car["imagens"]) && is_array($car["imagens"])) {
        foreach ($car["imagens"] as $img) $images[] = $img;
    }
    $images = array_values(array_unique(array_filter($images)));

    $localByUrl = [];
    $n = 1;
    foreach ($images as $url) {
        if (!is_remote_url($url)) {
            $skipped++;
            continue;
        }

        if (isset($urlMap[$url])) {
            $localByUrl[$url] = $urlMap[$url];
            continue;
        }

        $tmp = tempnam(sys_get_temp_dir(), "lvm_import_");
        list($okDownload, $downloadError) = download_remote_image($url, $tmp);
        if (!$okDownload) {
            $failed++;
            $logs[] = '<div class="row bad">Falhou download: ' . h($url) . ' — ' . h($downloadError) . '</div>';
            continue;
        }

        $mime = finfo_file($finfo, $tmp);
        if (!in_array($mime, ["image/jpeg", "image/png", "image/webp"], true)) {
            @unlink($tmp);
            $failed++;
            $logs[] = '<div class="row bad">Formato inválido: ' . h($url) . ' — ' . h($mime) . '</div>';
            continue;
        }

        $originalBytes = filesize($tmp);
        $baseName = $carId . "-" . str_pad((string)$n, 2, "0", STR_PAD_LEFT) . "-" . substr(sha1($url), 0, 8);
        $destinationNoExt = $carDir . "/" . $baseName;
        list($optimized, $optError) = save_optimized_image($tmp, $mime, $destinationNoExt);
        @unlink($tmp);

        if ($optimized === false) {
            $failed++;
            $logs[] = '<div class="row bad">Falhou compressão: ' . h($url) . ' — ' . h($optError) . '</div>';
            continue;
        }

        $publicPath = "assets/img/stock/" . $carId . "/" . $baseName . "." . $optimized["ext"];
        $urlMap[$url] = $publicPath;
        $localByUrl[$url] = $publicPath;
        $imported++;
        $n++;
        $totalOriginal += (int)$originalBytes;
        $totalOptimized += (int)$optimized["size"];
        $logs[] = '<div class="row ok">OK: ' . h(basename(parse_url($url, PHP_URL_PATH))) . ' → ' . h($publicPath) . '</div>';
        @ob_flush(); @flush();
    }

    if (!empty($car["imagem"]) && isset($localByUrl[$car["imagem"]])) {
        $car["imagem"] = $localByUrl[$car["imagem"]];
    }

    if (!empty($car["imagens"]) && is_array($car["imagens"])) {
        foreach ($car["imagens"] as $idx => $img) {
            if (isset($localByUrl[$img])) {
                $car["imagens"][$idx] = $localByUrl[$img];
            }
        }
    }
}
unset($car);

finfo_close($finfo);

list($writeOk, $writeMsg) = write_cars_file($carsFile, $cars);
if (!$writeOk) {
    echo '<p class="bad">' . h($writeMsg) . '</p>';
    page_footer();
    exit;
}

$saved = max(0, $totalOriginal - $totalOptimized);
function human_bytes($bytes) {
    $units = ["B", "KB", "MB", "GB"];
    $i = 0;
    while ($bytes >= 1024 && $i < count($units) - 1) { $bytes /= 1024; $i++; }
    return round($bytes, 2) . " " . $units[$i];
}

echo '<p class="ok"><strong>Concluído.</strong></p>';
echo '<p>Importadas/comprimidas: <strong>' . (int)$imported . '</strong><br>Falhadas: <strong>' . (int)$failed . '</strong><br>Já locais/ignoradas: <strong>' . (int)$skipped . '</strong><br>Backup criado: <strong>' . h($writeMsg) . '</strong></p>';
echo '<p>Peso original: <strong>' . human_bytes($totalOriginal) . '</strong><br>Peso otimizado: <strong>' . human_bytes($totalOptimized) . '</strong><br>Espaço poupado: <strong>' . human_bytes($saved) . '</strong></p>';
echo '<div class="log">' . implode("\n", $logs) . '</div>';
echo '<p class="muted small">Depois de confirmares que está tudo certo, podes apagar este ficheiro: <strong>admin/import-remote-images.php</strong>.</p>';
page_footer();
?>
