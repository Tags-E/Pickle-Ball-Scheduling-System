<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';
require_login();

$items = [];
foreach ($db->notifications->find(
	['user_id' => mongo_id($_SESSION['user_id'])],
	['sort' => ['created_at' => -1]]
) as $notification) {
	$notification = mongo_document($notification);
	$notification['created_at'] = mongo_date($notification['created_at'] ?? '');
	$items[] = $notification;
}

$db->notifications->updateMany(
	['user_id' => mongo_id($_SESSION['user_id']), 'is_read' => false],
	['$set' => ['is_read' => true]]
);

send_json(["notifications" => $items]);
