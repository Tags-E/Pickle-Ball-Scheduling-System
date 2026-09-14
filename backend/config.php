<?php
require_once __DIR__ . '/../vendor/autoload.php';

use MongoDB\Client;
use MongoDB\Exception\RuntimeException;

Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

header('Content-Type: application/json');

$mongoUri = $_ENV['MONGODB_URI'] ?? getenv('MONGODB_URI');
$mongoDatabase = $_ENV['MONGODB_DATABASE'] ?? getenv('MONGODB_DATABASE') ?: 'kitchen_pickleball';

if (!$mongoUri) {
    http_response_code(500);
    echo json_encode(["error" => "MONGODB_URI is not configured. Copy .env.example to .env and configure the Atlas connection in your PHP environment."]);
    exit;
}

try {
    $mongoClient = new Client($mongoUri);
    $db = $mongoClient->selectDatabase($mongoDatabase);
    $db->command(['ping' => 1])->toArray();
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(["error" => "MongoDB connection failed. Check the Atlas URI, network access, and database user."]);
    exit;
}

session_start();
