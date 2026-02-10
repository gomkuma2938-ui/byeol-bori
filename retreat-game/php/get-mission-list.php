<?php
// 1. JSON 파일의 경로를 지정합니다. (현재 파일 위치 기준)
$json_file_path = '../data/missions.json';

// 2. JSON 파일을 읽어옵니다.
$json_data = file_get_contents($json_file_path);

// 3. JSON 문자열을 PHP 배열/객체로 변환합니다.
$missions = json_decode($json_data, true);

// 4. [중요] 기존 main.js 코드는 파일 이름의 배열을 기대하므로,
//    객체 배열에서 'file' 값만 추출하여 새로운 배열을 만듭니다.
$mission_files = array_map(function($mission) {
    return $mission['file'];
}, $missions);

// 5. 최종 결과를 JSON 형태로 출력합니다.
header('Content-Type: application/json');
echo json_encode($mission_files);
?>