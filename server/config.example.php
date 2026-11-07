<?php
declare(strict_types=1);

// Copy to config.local.php (ignored by Git). Backend code must load it explicitly.
return [
    'db' => [
        'dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=pocketbudget;charset=utf8mb4',
        'user' => 'CHANGE_ME',
        'password' => 'CHANGE_ME',
    ],
    'ollama' => [
        'base_url' => 'http://127.0.0.1:11434/api',
        'model' => 'CHANGE_ME_LOCAL_MODEL',
        'timeout_seconds' => 30,
    ],
];
