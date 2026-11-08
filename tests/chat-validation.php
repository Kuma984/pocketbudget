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
// Ý định số dư / thu / ngân sách / câu mơ hồ
expect_result('{"intent":"balance","wallet_scope":"all","as_of":"current"}',
    ['intent' => 'balance', 'wallet_scope' => 'all', 'as_of' => 'current']);
expect_result('{"intent":"balance"}', ['intent' => 'balance', 'wallet_scope' => 'all', 'as_of' => 'current']);
expect_result('{"intent":"balance","wallet_scope":"named","wallet_name":"Tiền mặt"}',
    ['intent' => 'balance', 'wallet_scope' => 'named', 'wallet_name' => 'Tiền mặt', 'as_of' => 'current']);
expect_result('{"intent":"balance","wallet_scope":"named","wallet_name":" "}',
    ['intent' => 'balance', 'wallet_scope' => 'unclear', 'as_of' => 'current']);
expect_result('{"intent":"balance","as_of":"past"}', ['intent' => 'balance', 'wallet_scope' => 'all', 'as_of' => 'past']);
expect_result('{"intent":"income_summary","period":"this_month","category_code":"salary"}',
    ['intent' => 'income_summary', 'period' => 'this_month', 'category_code' => 'salary']);
expect_result('{"intent":"budget_remaining","period":"this_month"}', ['intent' => 'budget_remaining', 'period' => 'this_month']);
expect_result('{"intent":"clarify_remaining"}', ['intent' => 'clarify_remaining']);

$history = pb_ai_history(json_decode('[{"message":"Tôi còn bao nhiêu tiền?","result":{"intent":"balance","wallet_scope":"all"}},'
    . '{"message":"Ghi chi 45k","result":{"intent":"draft_transaction","draft":{"type":"expense","amount_vnd":45000}}}]'));
if ($history[0]['result']['as_of'] !== 'current' || array_key_exists('missing_fields', $history[1]['result'])) {
    throw new RuntimeException('Unexpected history sanitizing.');
}
foreach ([
    '[{"message":"x","result":{"intent":"delete_all"}}]',
    '[{"message":"x","result":{"intent":"balance"},"extra":1}]',
    '[{"message":"","result":{"intent":"balance"}}]',
    '[1,2,3,4]',
    '{"message":"x"}',
] as $badHistory) {
    try {
        pb_ai_history(json_decode($badHistory));
        throw new RuntimeException('Invalid history passed validation.');
    } catch (InvalidArgumentException) {
        // Rejected as expected.
    }
}

foreach ([
    '{"intent":"income_summary","category_code":"food"}',
    '{"intent":"expense_summary","category_code":"salary"}',
    '{"intent":"balance","wallet_scope":"everything"}',
    '{"intent":"balance","as_of":"tomorrow"}',
    '{"intent":"budget_remaining","category_code":"food"}',
    '{"intent":"clarify_remaining","period":"this_month"}',
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
