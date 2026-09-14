<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';

$_SESSION = [];
session_destroy();

send_json(["ok" => true]);
