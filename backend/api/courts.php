<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers.php';

$courts = [];
foreach ($db->courts->find([], ['sort' => ['location' => 1, 'name' => 1]]) as $court) {
	$courts[] = mongo_document($court);
}
send_json(["courts" => $courts]);
