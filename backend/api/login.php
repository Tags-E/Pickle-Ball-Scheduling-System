<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';

$data     = read_json_body();
$username = strtolower(trim($data['username'] ?? ''));
$password = $data['password'] ?? '';

if ($username === '' || $password === '') {
    send_json(["error" => "Please enter your username and password."], 400);
}

$user = $db->users->findOne(['username' => $username]);

if ($user) {
    $user = mongo_document($user);
}

if (!$user) {
    send_json(["error" => "No account found with that username."], 404);
}
if (!password_verify($password, $user['password'])) {
    send_json(["error" => "Incorrect password."], 401);
}

$_SESSION['user_id']  = $user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['name']     = $user['name'];

send_json(["ok" => true, "user" => [
    "id" => $user['id'], "username" => $user['username'], "name" => $user['name'],
    "email" => $user['email'], "phone" => $user['phone']
]]);
