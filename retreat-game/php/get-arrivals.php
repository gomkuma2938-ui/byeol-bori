<?php
// /php/get-arrivals.php

header('Content-Type: application/json');
error_reporting(0);

// record-arrival.php와 동일한 파일 경로를 사용해야 합니다.
$logFile = sys_get_temp_dir() . '/retreat_game_arrivals.txt';

$arrivalsData = [];
$response = ['success' => false, 'arrivals' => []];

try {
    if (file_exists($logFile)) {
        // 파일을 읽어와 한 줄씩 처리합니다.
        $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // "순위. 이름" 형식에서 순위와 이름을 분리합니다.
            list($rank, $name) = explode('. ', $line, 2);
            // 분리된 데이터를 배열에 추가합니다.
            $arrivalsData[] = ['rank' => (int)$rank, 'name' => trim($name)];
        }
        $response['success'] = true;
        $response['arrivals'] = $arrivalsData;
    } else {
        // 파일이 아직 없는 경우 (아무도 도착하지 않음)
        $response['success'] = true;
        $response['message'] = "아직 도착 기록이 없습니다.";
    }
} catch (Exception $e) {
    $response['message'] = '순위 기록을 읽는 중 오류가 발생했습니다: ' . $e->getMessage();
}

// 최종적으로 JSON 형태로 응답합니다.
echo json_encode($response);
?>