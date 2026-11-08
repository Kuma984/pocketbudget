<?php
declare(strict_types=1);

const PB_AI_INCOME = ['allowance', 'salary', 'scholarship', 'other_income'];
const PB_AI_EXPENSE = ['food', 'transport', 'study', 'shopping', 'entertainment', 'health', 'other_expense'];
const PB_AI_INTENTS = ['balance', 'expense_summary', 'income_summary', 'budget_remaining', 'clarify_remaining',
    'simulate_purchase', 'draft_transaction', 'unsupported'];

function pb_ai_period(mixed $value): string
{
    if (!is_string($value) || !preg_match('/^(this_month|last_month|[1-9][0-9]{3}-(0[1-9]|1[0-2]))$/D', $value)) {
        throw new InvalidArgumentException('Invalid period.');
    }
    return $value;
}

function pb_ai_object(mixed $value): array
{
    if (!$value instanceof stdClass) {
        throw new InvalidArgumentException('Expected a JSON object.');
    }
    return get_object_vars($value);
}

function pb_ai_keys(array $value, array $allowed): void
{
    if (array_diff(array_keys($value), $allowed) !== []) {
        throw new InvalidArgumentException('Unexpected JSON field.');
    }
}

function pb_ai_text(mixed $value, int $limit, bool $allowEmpty = false): string
{
    $length = is_string($value) && strlen($value) <= $limit * 4 ? preg_match_all('/./us', $value) : false;
    if ($length === false || $length > $limit ||
        preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value) || (!$allowEmpty && trim($value) === '')) {
        throw new InvalidArgumentException('Invalid text.');
    }
    return trim($value);
}

function pb_ai_money(mixed $value): int
{
    if (!is_int($value) || $value < 1 || $value > 9007199254740991) {
        throw new InvalidArgumentException('Invalid amount.');
    }
    return $value;
}

function pb_ai_date(mixed $value): string
{
    if (!is_string($value) || !preg_match('/^([1-9][0-9]{3})-([0-9]{2})-([0-9]{2})$/D', $value, $parts)
        || !checkdate((int)$parts[2], (int)$parts[3], (int)$parts[1])) {
        throw new InvalidArgumentException('Invalid date.');
    }
    return $value;
}

function pb_ai_enum(mixed $value, array $choices): string
{
    if (!in_array($value, $choices, true)) {
        throw new InvalidArgumentException('Invalid enum.');
    }
    return $value;
}

function pb_ai_result(mixed $raw): array
{
    $data = pb_ai_object($raw);
    $intent = pb_ai_enum($data['intent'] ?? null, PB_AI_INTENTS);
    $result = ['intent' => $intent];
    switch ($intent) {
        case 'balance':
            // Số dư theo sổ: app tự tính. Model chỉ cho biết phạm vi ví và có phải hỏi thời điểm quá khứ không.
            pb_ai_keys($data, ['intent', 'wallet_scope', 'wallet_name', 'as_of']);
            $scope = array_key_exists('wallet_scope', $data) ? pb_ai_enum($data['wallet_scope'], ['all', 'named', 'unclear']) : 'all';
            $name = array_key_exists('wallet_name', $data) ? pb_ai_text($data['wallet_name'], 60, true) : '';
            if ($scope === 'named' && $name === '') {
                $scope = 'unclear';
            }
            $result['wallet_scope'] = $scope;
            if ($scope === 'named') {
                $result['wallet_name'] = $name;
            }
            $result['as_of'] = array_key_exists('as_of', $data) ? pb_ai_enum($data['as_of'], ['current', 'past']) : 'current';
            break;
        case 'expense_summary':
        case 'income_summary':
            pb_ai_keys($data, ['intent', 'period', 'category_code']);
            if (array_key_exists('period', $data)) {
                $result['period'] = pb_ai_period($data['period']);
            }
            if (array_key_exists('category_code', $data)) {
                $result['category_code'] = pb_ai_enum($data['category_code'], $intent === 'income_summary' ? PB_AI_INCOME : PB_AI_EXPENSE);
            }
            break;
        case 'budget_remaining':
            pb_ai_keys($data, ['intent', 'period']);
            if (array_key_exists('period', $data)) {
                $result['period'] = pb_ai_period($data['period']);
            }
            break;
        case 'clarify_remaining':
            pb_ai_keys($data, ['intent']);
            break;
        case 'simulate_purchase':
            pb_ai_keys($data, ['intent', 'item_name', 'price_vnd']);
            if (array_key_exists('item_name', $data)) {
                $result['item_name'] = pb_ai_text($data['item_name'], 120);
            }
            if (array_key_exists('price_vnd', $data)) {
                $result['price_vnd'] = pb_ai_money($data['price_vnd']);
            }
            break;
        case 'draft_transaction':
            pb_ai_keys($data, ['intent', 'draft']);
            $draft = pb_ai_object(array_key_exists('draft', $data) ? $data['draft'] : new stdClass());
            pb_ai_keys($draft, ['type', 'amount_vnd', 'category_code', 'occurred_on', 'note']);
            $safe = [];
            if (array_key_exists('type', $draft)) {
                $safe['type'] = pb_ai_enum($draft['type'], ['income', 'expense', 'transfer']);
            }
            if (array_key_exists('amount_vnd', $draft)) {
                $safe['amount_vnd'] = pb_ai_money($draft['amount_vnd']);
            }
            if (array_key_exists('category_code', $draft)) {
                $categories = match ($safe['type'] ?? null) {
                    'income' => PB_AI_INCOME, 'expense' => PB_AI_EXPENSE,
                    'transfer' => [], default => [...PB_AI_INCOME, ...PB_AI_EXPENSE],
                };
                $safe['category_code'] = pb_ai_enum($draft['category_code'], $categories);
            }
            if (array_key_exists('occurred_on', $draft)) {
                $safe['occurred_on'] = pb_ai_date($draft['occurred_on']);
            }
            if (array_key_exists('note', $draft)) {
                $safe['note'] = pb_ai_text($draft['note'], 500, true);
            }
            $required = ['type', 'amount_vnd', 'wallet_id', 'occurred_on'];
            $required[] = ($safe['type'] ?? null) === 'transfer' ? 'destination_wallet_id' : 'category_code';
            $result['draft'] = (object)$safe;
            $result['missing_fields'] = array_values(array_diff($required, array_keys($safe)));
            break;
        case 'unsupported':
            pb_ai_keys($data, ['intent']);
            break;
    }
    return $result;
}

/**
 * Ngữ cảnh hội thoại gửi kèm để model hiểu câu nối tiếp ("Còn ví Tiền mặt?", "Còn tháng trước?").
 * Chỉ gồm câu người dùng đã hỏi và kết quả phân loại đã qua kiểm tra; không có số tiền hay dữ liệu sổ.
 * Mỗi kết quả cũ được kiểm tra lại bằng pb_ai_result, nên client không thể chèn ý định ngoài danh sách.
 */
function pb_ai_history(mixed $value): array
{
    if (!is_array($value) || count($value) > 3) {
        throw new InvalidArgumentException('Invalid history.');
    }
    $turns = [];
    foreach ($value as $turn) {
        $item = pb_ai_object($turn);
        pb_ai_keys($item, ['message', 'result']);
        $result = pb_ai_result($item['result'] ?? null);
        unset($result['missing_fields']);
        $turns[] = ['message' => pb_ai_text($item['message'] ?? null, 500), 'result' => $result];
    }
    return $turns;
}
