import animateText from './text-animator.js';

export default function init(config) {
    // [추가] 페이지가 로드되면 즉시 표준 애니메이션을 실행합니다.
    animateText('.fade-up-container');

    // --- 1. DOM 요소 가져오기 ---
    const rankElement = document.getElementById('arrival-rank');
    const replayButton = document.getElementById('replay-mission-btn');

    // --- 2. 함수 정의 ---
    async function updateArrivalRank() {
        if (!rankElement) return;
        try {
            // [수정] 이 playerName 변수를 사용합니다.
            const playerName = localStorage.getItem('player_name') || '익명의 박사';
            
            const response = await fetch('php/record-arrival.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playerName })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`서버 응답 오류: ${response.status} ${errorText}`);
            }
            const data = await response.json();
            if (data && data.rank_text) {
                // [수정 1] '당신은'을 이름으로 교체
                rankElement.innerHTML = `${playerName}님은 이곳에<br>${data.rank_text}로<br>발을 디뎠습니다.`;
            } else {
                throw new Error("서버로부터 유효한 순위 텍스트를 받지 못했습니다.");
            }
        } catch (error) {
            // [수정] 에러 발생 시에도 playerName을 사용하도록 변경합니다.
            const playerName = localStorage.getItem('player_name') || '익명의 박사';
            console.error("도착 순위를 불러오는 데 실패했습니다:", error);
            // [수정 2] '당신의'를 이름으로 교체
            rankElement.textContent = `${playerName}님의 발자취가 이곳에 새겨졌습니다.`;
        }
    }

    // [핵심 수정] 자체적인 loadNewMission 함수를 완전히 삭제합니다.

    // --- 3. 초기화 실행 및 이벤트 연결 ---
    updateArrivalRank();
    if (replayButton) {
        // main.js에 정의된 전역(window) 함수를 직접 연결합니다.
        replayButton.addEventListener('click', window.loadNewMission);
    }

    // --- 4. destroy 함수 반환 ---
    return {
        destroy: () => {
            if (replayButton) {
                // 연결했던 것과 동일한 전역 함수를 제거합니다.
                replayButton.removeEventListener('click', window.loadNewMission);
            }
        }
    };
}