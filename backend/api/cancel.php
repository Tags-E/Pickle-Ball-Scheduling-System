<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';
require_login();

$data      = read_json_body();
$bookingId = (string)($data['booking_id'] ?? '');

$booking = $db->bookings->findOne(['_id' => mongo_id($bookingId)]);
if ($booking) {
    $booking = mongo_document($booking);
    $court = $db->courts->findOne(['_id' => mongo_id($booking['court_id'])]);
    $booking['court_name'] = $court['name'] ?? 'Unknown court';
}

if (!$booking) {
    send_json(["error" => "Booking not found."], 404);
}
if (mongo_ref($booking['user_id']) !== (string)$_SESSION['user_id']) {
    send_json(["error" => "You can't cancel someone else's booking."], 403);
}

$db->bookings->updateOne(
    ['_id' => mongo_id($bookingId)],
    ['$set' => ['status' => 'cancelled']]
);

$dateLabel = date("D, M j", strtotime($booking['booking_date']));
$db->notifications->insertOne([
    'user_id' => mongo_id($_SESSION['user_id']),
    'message' => "Booking cancelled: {$booking['court_name']} on {$dateLabel} at {$booking['booking_time']}.",
    'is_read' => false, 'created_at' => new MongoDB\BSON\UTCDateTime()
]);

send_json(["ok" => true]);
