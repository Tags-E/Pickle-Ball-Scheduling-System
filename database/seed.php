<?php
require_once __DIR__ . '/../vendor/autoload.php';

Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

$uri = getenv('MONGODB_URI');
$database = getenv('MONGODB_DATABASE') ?: 'kitchen_pickleball';
if (!$uri) {
    fwrite(STDERR, "MONGODB_URI is not configured.\n");
    exit(1);
}

$db = (new MongoDB\Client($uri))->selectDatabase($database);
$db->users->createIndex(['username' => 1], ['unique' => true]);
$db->bookings->createIndex([
    'court_id' => 1, 'booking_date' => 1, 'booking_time' => 1, 'status' => 1
]);
$db->notifications->createIndex(['user_id' => 1, 'created_at' => -1]);

$courts = [
    ['name' => 'Riverside Court A', 'location' => 'Riverside Park', 'address' => '210 River Rd', 'indoor' => false, 'fee' => 0.0],
    ['name' => 'Riverside Court B', 'location' => 'Riverside Park', 'address' => '210 River Rd', 'indoor' => false, 'fee' => 0.0],
    ['name' => 'Downtown Court 1', 'location' => 'Downtown Rec Center', 'address' => '88 Main St', 'indoor' => true, 'fee' => 12.0],
    ['name' => 'Downtown Court 2', 'location' => 'Downtown Rec Center', 'address' => '88 Main St', 'indoor' => true, 'fee' => 12.0],
    ['name' => 'Sunset Court A', 'location' => 'Sunset Fields', 'address' => '4 Sunset Ave', 'indoor' => false, 'fee' => 8.0],
    ['name' => 'Sunset Court B', 'location' => 'Sunset Fields', 'address' => '4 Sunset Ave', 'indoor' => false, 'fee' => 8.0]
];

foreach ($courts as $court) {
    $db->courts->updateOne(
        ['name' => $court['name'], 'location' => $court['location']],
        ['$setOnInsert' => $court],
        ['upsert' => true]
    );
}

fwrite(STDOUT, "MongoDB indexes and starter courts are ready.\n");