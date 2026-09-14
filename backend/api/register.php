<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';

$data     = read_json_body();
$username = strtolower(trim($data['username'] ?? ''));
$password = $data['password'] ?? '';
$name     = trim($data['name'] ?? '');
$email    = trim($data['email'] ?? '');
$phone    = trim($data['phone'] ?? '');

if ($username === '' || $password === '' || $name === '') {
    send_json(["error" => "Please fill in all required fields."], 400);
}

if ($db->users->findOne(['username' => $username], ['projection' => ['_id' => 1]])) {
    send_json(["error" => "That username is already taken."], 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$user = [
    'username' => $username, 'password' => $hash, 'name' => $name,
    'email' => $email, 'phone' => $phone, 'created_at' => new MongoDB\BSON\UTCDateTime()
];
$userId = (string)$db->users->insertOne($user)->getInsertedId();

$_SESSION['user_id']  = $userId;
$_SESSION['username'] = $username;
$_SESSION['name']     = $name;

$firstName = explode(' ', $name)[0];
$db->notifications->insertOne([
    'user_id' => mongo_id($userId),
    'message' => "Welcome to Kitchen, {$firstName}! Your account is ready.",
    'is_read' => false,
    'created_at' => new MongoDB\BSON\UTCDateTime()
]);

send_json(["ok" => true, "user" => [
    "id" => $userId, "username" => $username, "name" => $name, "email" => $email, "phone" => $phone
]]);
