<!DOCTYPE html>
<html>
<head><title>알림 발송</title></head>
<body>
    <h1>수련회 알림 발송 제어판</h1>
    
    <h3>1. 천문대 이벤트 알림</h3>
    <form action="send-notification.php" method="post">
        <input type="hidden" name="event_name" value="observatory">
        <button type="submit">천문대 스토리 알림 보내기</button>
    </form>
    
    <h3>2. 펜션 이벤트 알림</h3>
    <form action="send-notification.php" method="post">
        <input type="hidden" name="event_name" value="pension">
        <button type="submit">펜션/예배 스토리 알림 보내기</button>
    </form>
    
    <!-- 필요하면 3번째, 4번째 이벤트도 추가 -->
</body>
</html>```

**`send-notification.php` (알림 발송기)**
*   이 파일을 작동시키려면, 이전에 안내 드렸던 **PHP 푸시 라이브러리**(`web-push-php`)를 `/retreat-game/php/` 폴더 안에 넣어두셔야 합니다.
```php
<?php
// send-notification.php
require '../php/web-push-php/autoload.php';
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

$config = require '../php/config.php';

$eventName = $_POST['event_name'] ?? 'default';

// 이벤트별로 다른 메시지와 링크 설정
$notificationData = [
    'observatory' => [
        'title' => '별의 침묵',
        'body' => '마침내 도착했지만, 무언가 이상하다...',
        'url' => '/retreat-game/index.html?event=observatory'
    ],
    'pension' => [
        'title' => '별의 노래 피날레',
        'body' => '별이 멈춘 곳, 왕께서 당신을 기다리십니다.',
        'url' => '/retreat-game/index.html?event=pension'
    ]
];

$payloadData = $notificationData[$eventName];
$payload = json_encode([
    'title' => $payloadData['title'],
    'body' => $payloadData['body'],
    'data' => [
        'url' => $payloadData['url']
    ]
]);

$subscriptions = file('../php/subscriptions.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$webPush = new WebPush(['VAPID' => $config['VAPID']]);

foreach ($subscriptions as $sub) {
    $subscription = Subscription::create(json_decode($sub, true));
    $webPush->queueNotification($subscription, $payload);
}

foreach ($webPush->flush() as $report) { /* ... (에러 처리 코드, 이전과 동일) ... */ }

echo "알림 발송이 완료되었습니다. <a href='index.php'>돌아가기</a>";