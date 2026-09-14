<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';
require_login();

$bookings = [];
foreach ($db->bookings->find(
    ['user_id' => mongo_id($_SESSION['user_id'])],
    ['sort' => ['booking_date' => 1, 'booking_time' => 1]]
) as $booking) {
    $booking = mongo_document($booking);
    $court = $db->courts->findOne(['_id' => mongo_id($booking['court_id'])]);
    $bookings[] = [
        'id' => $booking['id'], 'date' => $booking['booking_date'],
        'time' => $booking['booking_time'], 'status' => $booking['status'],
        'paid' => $booking['paid'], 'fee' => $booking['fee'] ?? 0,
        'court_name' => $court['name'] ?? 'Unknown court',
        'location' => $court['location'] ?? ''
    ];
}
send_json(["bookings" => $bookings]);
