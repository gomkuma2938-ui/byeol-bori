// /service-worker.js

// 1. 푸시 알림을 받았을 때 실행되는 이벤트
self.addEventListener('push', function(event) {
    // 푸시 알림으로 전달된 데이터를 JSON 형태로 파싱합니다.
    const payload = event.data ? event.data.json() : {
        title: '별보리',
        body: '새로운 소식이 도착했습니다.',
        url: 'index.html' // 데이터가 없을 경우의 기본값
    };

    const title = payload.title;
    const options = {
        body: payload.body,
        icon: 'images/icon.png',
        badge: 'images/badge.png',
        data: {
            url: payload.url
        },

        // ▼▼▼▼▼ [핵심 추가] 진동과 소리 옵션 ▼▼▼▼▼

        // 진동 패턴: [진동시간(ms), 정지시간(ms), 진동시간(ms), ...]
        // 예: 200ms 진동, 100ms 정지, 200ms 진동
        vibrate: [200, 100, 200],

        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// 2. 사용자가 알림을 클릭했을 때 실행되는 이벤트 (수정된 버전)
self.addEventListener('notificationclick', function(event) {
    // 알림창을 닫습니다.
    event.notification.close();

    // 서버에서 보낸 notificationData 객체에서 url 값을 가져옵니다. (예: 'index.html#phase=2')
    const urlFromPush = event.notification.data.url || 'index.html';

    // 1. 서비스 워커의 기준 경로(Scope)를 가져옵니다.
    // 이것이 가장 중요합니다. 보통 'https://.../retreat-game/' 와 같은 주소가 됩니다.
    const scope = self.registration.scope;

    // 2. 기준 경로와 서버에서 받은 url을 조합하여 완전한 최종 주소를 생성합니다.
    const finalUrl = new URL(urlFromPush, scope);

    // ★★★★★ [핵심] 강제 새로고침을 위한 코드 ★★★★★
    // URL 주소에 현재 시간을 꼬리표(?t=...)로 붙여,
    // 브라우저가 항상 새로운 페이지로 인식하게 만듭니다.
    finalUrl.searchParams.set('t', Date.now());

    // [디버깅용] 혹시 문제가 계속되면 이 로그를 확인하세요.
    console.log('최종적으로 열려는 URL:', finalUrl.href);

    // 현재 열려 있는 모든 창(탭)들을 확인합니다.
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
        }).then((clientList) => {
            // 이미 열려있는 탭이 있는지 확인합니다.
            // 같은 경로의 탭이 있다면, 새 탭을 열지 않고 기존 탭을 활성화하고 주소만 변경합니다.
            for (const client of clientList) {
                // URL의 # 뒷부분을 제외한 주소가 같은지 비교합니다.
                if (new URL(client.url).origin + new URL(client.url).pathname === finalUrl.origin + finalUrl.pathname) {
                    // ★★★★★ [핵심 수정] ★★★★★
                    // 1. 페이지에 직접 "이 화면을 로드하라"는 명령 메시지를 보냅니다.
                    client.postMessage({
                        action: 'loadPhase',
                        url: finalUrl.href
                    });
                    
                    // 2. 기존처럼 URL 변경 및 화면 앞으로 가져오기를 실행합니다.
                    return client.navigate(finalUrl.href).then(c => c.focus());
                }
            }
            
            // 열려 있는 탭이 하나도 없다면, 새 탭으로 해당 URL을 엽니다.
            return clients.openWindow(finalUrl.href);
        })
    );
});