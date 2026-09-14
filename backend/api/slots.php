<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';

$courtId = (string)($_GET['court_id'] ?? '');
$date    = $_GET['date'] ?? '';

if (!$courtId || !$date) {
    send_json(["error" => "court_id and date are required."], 400);
}

$taken = [];
foreach ($db->bookings->find([
    'court_id' => mongo_id($courtId), 'booking_date' => $date, 'status' => 'confirmed'
], ['projection' => ['booking_time' => 1]]) as $booking) {
    $taken[] = $booking['booking_time'];
}

send_json(["taken" => $taken]);
