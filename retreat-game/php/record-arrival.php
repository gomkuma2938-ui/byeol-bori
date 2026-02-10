<?php
// 어떤 오류도 사용자에게 직접 노출하지 않고, 응답은 항상 JSON 형식임을 보장합니다.
header('Content-Type: application/json');
error_reporting(0);

// --- 함수 정의 ---
function numberToKoreanOrdinal($num) {
    if (!is_numeric($num) || $num <= 0) return '알 수 없는';
    if ($num == 1) return '첫 번째';
    $units = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
    $digits = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
    $result = '';
    if ($num >= 100) return $num . ' 번째';
    $tens = floor($num / 10);
    if ($tens > 0) $result .= ($tens == 1) ? '열' : $units[$tens];
    $result .= $digits[$num % 10];
    return $result . ' 번째';
}

// --- 메인 로직 시작 ---
// [핵심 수정] Synology 보안을 우회하기 위해, 서버의 공용 임시 폴더에 파일을 저장합니다.
$logFile = sys_get_temp_dir() . '/retreat_game_arrivals.txt';

$rank = 0;
$response = [];

$inputData = json_decode(file_get_contents('php://input'), true);
$playerName = isset($inputData['name']) ? trim($inputData['name']) : '익명의 박사';

// 파일이 없으면 빈 파일을 생성합니다.
if (!file_exists($logFile)) {
    file_put_contents($logFile, '');
}

$arrivals = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$isAlreadyArrived = false;

if ($playerName !== '익명의 박사' && !empty($playerName)) {
    foreach ($arrivals as $line) {
        if (strpos($line, '. ' . $playerName) !== false) {
            $isAlreadyArrived = true;
            list($rank_str) = explode('.', $line);
            $rank = (int)$rank_str;
            break;
        }
    }
}

if (!$isAlreadyArrived) {
    $rank = count($arrivals) + 1;
    $newLine = $rank . '. ' . $playerName . PHP_EOL;
    file_put_contents($logFile, $newLine, FILE_APPEND);
}

$response['rank_text'] = numberToKoreanOrdinal($rank);
echo json_encode($response);

?>