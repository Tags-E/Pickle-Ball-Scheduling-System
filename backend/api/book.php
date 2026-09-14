<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';
require_login();

$data    = read_json_body();
$courtId = (string)($data['court_id'] ?? '');
$date    = $data['date'] ?? '';
$time    = $data['time'] ?? '';

if (!$courtId || !$date || !$time) {
    send_json(["error" => "Missing booking details."], 400);
}

$court = $db->courts->findOne(['_id' => mongo_id($courtId)]);
if ($court) {
    $court = mongo_document($court);
}
if (!$court) {
    send_json(["error" => "Court not found."], 404);
}

// Re-check availability right before inserting, so two people can't grab
// the same slot at the same time (Court & Time Slot Management logic).
if ($db->bookings->findOne([
    'court_id' => mongo_id($courtId), 'booking_date' => $date,
    'booking_time' => $time, 'status' => 'confirmed'
])) {
    send_json(["error" => "That slot was just booked by someone else. Please choose another time."], 409);
}

$paid = $court['fee'] > 0 ? 1 : 0;

$bookingId = (string)$db->bookings->insertOne([
    'court_id' => mongo_id($courtId), 'user_id' => mongo_id($_SESSION['user_id']),
    'booking_date' => $date, 'booking_time' => $time, 'status' => 'confirmed',
    'paid' => (bool)$paid, 'fee' => (float)$court['fee'],
    'created_at' => new MongoDB\BSON\UTCDateTime()
])->getInsertedId();

$dateLabel = date("D, M j", strtotime($date));
$db->notifications->insertOne([
    'user_id' => mongo_id($_SESSION['user_id']),
    'message' => "Booking confirmed: {$court['name']} on {$dateLabel} at {$time}.",
    'is_read' => false, 'created_at' => new MongoDB\BSON\UTCDateTime()
]);

send_json(["ok" => true, "booking" => [
    "id" => $bookingId, "court_id" => $courtId, "court_name" => $court['name'],
    "location" => $court['location'], "date" => $date, "time" => $time,
    "status" => "confirmed", "paid" => (bool)$paid, "fee" => (float)$court['fee']
]]);
