<?php
// /php/reset-arrivals.php

header('Content-Type: application/json');
error_reporting(0);

// record-arrival.php와 동일한 파일 경로를 사용합니다.
$logFile = sys_get_temp_dir() . '/retreat_game_arrivals.txt';

$response = [];

// [수정] 파일이 존재하는 경우에만 삭제를 시도합니다.
if (file_exists($logFile)) {
    if (unlink($logFile)) {
        $response['success'] = true;
        $response['message'] = "도착 순위 기록이 성공적으로 초기화되었습니다.";
    } else {
        $response['success'] = false;
        $response['message'] = "오류: 도착 순위 기록 파일을 삭제할 수 없습니다. (파일 권한 확인 필요)";
    }
} else {
    // 파일이 원래 없었어도, 초기화는 '성공'한 것으로 간주합니다.
    $response['success'] = true;
    $response['message'] = "도착 순위 기록이 이미 비어있습니다.";
}

echo json_encode($response);
?>