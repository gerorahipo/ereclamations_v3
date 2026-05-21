<?php
require 'backend/src/Config/Database.php';
$pdo = App\Config\Database::getConnection();
$stmt = $pdo->query("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'affectations_pilotes' AND c.contype = 'u'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
