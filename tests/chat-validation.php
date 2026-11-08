<?php
declare(strict_types=1);
require_once __DIR__ . '/../server/ai/validation.php';

function expect_result(string $json, array $expected): void
{
    $result = pb_ai_result(json_decode($json, false, 16, JSON_THROW_ON_ERROR));
    if ($result !== $expected) {
        throw new RuntimeException('Unexpected sanitized result.');
    }
}
expect_result('{"intent":"simulate_purchase","item_name":"Tai nghe","price_vnd":400000}',
    ['intent' => 'simulate_purchase', 'item_name' => 'Tai nghe', 'price_vnd' => 400000]);
expect_result('{"intent":"expense_summary","period":"last_month","category_code":"food"}',
    ['intent' => 'expense_summary', 'period' => 'last_month', 'category_code' => 'food']);
$draft = pb_ai_result(json_decode('{"intent":"draft_transaction","draft":{"type":"expense","amount_vnd":45000,"category_code":"food"}}'));
if ($draft['draft']->amount_vnd !== 45000 || $draft['missing_fields'] !== ['wallet_id', 'occurred_on']) {
    throw new RuntimeException('Unexpected draft or missing fields.');
}
foreach ([
    '{"intent":"delete_transaction"}',
    '{"intent":"simulate_purchase","price_vnd":0}',
    '{"intent":"simulate_purchase","price_vnd":4000.5}',
    '{"intent":"draft_transaction","draft":{"wallet_id":"made-up"}}',
    '{"intent":"draft_transaction","draft":{"occurred_on":"2026-02-30"}}',
    '{"intent":"draft_transaction","draft":{"type":"income","category_code":"food"}}',
    '{"intent":"expense_summary","period":"2026-99"}',
] as $bad) {
    try {
        pb_ai_result(json_decode($bad));
        throw new RuntimeException('Invalid payload passed validation.');
    } catch (InvalidArgumentException) {
        // Rejected as expected.
    }
}
echo "PASS chat intent validation\n";
