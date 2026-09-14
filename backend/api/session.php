<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';

if (empty($_SESSION['user_id'])) {
    send_json(["user" => null]);
}

$user = $db->users->findOne(
    ['_id' => mongo_id($_SESSION['user_id'])],
    ['projection' => ['username' => 1, 'name' => 1, 'email' => 1, 'phone' => 1]]
);
$user = $user ? mongo_document($user) : null;

send_json(["user" => $user ?: null]);
