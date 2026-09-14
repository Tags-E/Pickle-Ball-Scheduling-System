<?php
// ============================================================
// Shared helpers used across all backend/api/*.php endpoints.
// ============================================================

function send_json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function read_json_body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_login() {
    if (empty($_SESSION['user_id'])) {
        send_json(["error" => "You must be logged in."], 401);
    }
}

function mongo_id($value) {
    if ($value instanceof MongoDB\BSON\ObjectId) {
        return $value;
    }
    return new MongoDB\BSON\ObjectId((string)$value);
}

function mongo_ref($value): string {
    return $value instanceof MongoDB\BSON\ObjectId ? (string)$value : (string)$value;
}

function mongo_document(array|object $document): array {
    $document = (array)$document;
    if (isset($document['_id'])) {
        $document['id'] = (string)$document['_id'];
        unset($document['_id']);
    }
    return $document;
}

function mongo_date($value): string {
    if ($value instanceof MongoDB\BSON\UTCDateTime) {
        return $value->toDateTime()->format('Y-m-d H:i:s');
    }
    return (string)$value;
}
