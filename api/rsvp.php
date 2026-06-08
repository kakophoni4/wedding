<?php
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Method not allowed"]);
    exit;
}

$configFile = __DIR__ . "/config.php";
if (!is_file($configFile)) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Telegram is not configured"]);
    exit;
}

$config = require $configFile;
$token = $config["TELEGRAM_BOT_TOKEN"] ?? "";
$chatId = $config["TELEGRAM_CHAT_ID"] ?? "";

if ($token === "" || $chatId === "") {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Telegram is not configured"]);
    exit;
}

$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) {
    $body = [];
}

function clean_value($value)
{
    return mb_substr(trim((string) ($value ?? "")), 0, 500);
}

$comment = clean_value($body["comment"] ?? "");
$message = implode("\n", [
    "Подтверждение присутствия на свадьбе Егора и Анастасии",
    "Имя: " . clean_value($body["name"] ?? ""),
    "Контакт: " . clean_value($body["contact"] ?? ""),
    "Гостей: " . clean_value($body["guests"] ?? ""),
    "Комментарий: " . ($comment !== "" ? $comment : "без комментария"),
]);

$payload = json_encode([
    "chat_id" => $chatId,
    "text" => $message,
    "disable_web_page_preview" => true,
]);

$ch = curl_init("https://api.telegram.org/bot{$token}/sendMessage");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
]);

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    echo json_encode(["ok" => false, "error" => "Cannot reach Telegram API"]);
    curl_close($ch);
    exit;
}

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$json = json_decode($response, true);
if ($httpCode >= 400 || !is_array($json) || empty($json["ok"])) {
    http_response_code(502);
    echo json_encode(["ok" => false, "error" => $json["description"] ?? "Telegram error"]);
    exit;
}

echo json_encode(["ok" => true]);
