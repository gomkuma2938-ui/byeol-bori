// [최종 수정] 모든 타입을 하나의 규칙으로 통일하고, 모든 '당신'을 이름으로 교체하는 최종 버전
export default function() {
    // 1. 필요한 데이터와 DOM 요소들을 가져옵니다.
    const type = localStorage.getItem('mbti_type');
    const name = localStorage.getItem('player_name');

    const typeNameElement = document.getElementById('result-type-name');
    const descriptionElement = document.getElementById('result-description');
    const imageElement = document.getElementById('result-image');
    const startButton = document.getElementById('start-game-btn');

    // --- 추가할 JavaScript 코드 시작 (이전 코드에서 #dynamic-content 부분은 이미 반영되었다고 가정) ---
    // #dynamic-content에 'no-scroll-on-result-page' 클래스 추가 (필요하다면 유지)
    const dynamicContentElement = document.getElementById('dynamic-content');
    if (dynamicContentElement) {
        dynamicContentElement.classList.add('no-scroll-on-result-page'); // CSS는 이 클래스에 overflow-y: hidden; 적용
    }

    // ★★★ 이 부분이 html 태그의 스크롤을 막는 핵심입니다. ★★★
    // 원래 HTML의 overflow 스타일을 저장합니다.
    const originalHtmlOverflow = document.documentElement.style.overflowY;
    // 결과 페이지에서는 스크롤을 hidden으로 강제합니다.
    document.documentElement.style.overflowY = 'hidden';
    // --- 추가할 JavaScript 코드 끝 ---

    const resultData = {
        A: { 
            name: "황금의 박사", 
            // [수정 1] 지시하신 대로 A타입 설명에도 '당신'을 추가하여 모든 타입을 통일합니다.
            desc: "당신은 예수님의 왕 되심을 상징하는 황금을 드린 박사입니다. 현실적이고 책임감이 강하며, 뛰어난 계획성으로 공동체를 실질적으로 이끌어가는 리더의 기질을 가졌습니다...",
            image: "images/wise_man_A.png"
        },
        B: { 
            name: "유향의 박사", 
            desc: "당신은 예수님의 신성(神性)을 상징하는 유향을 드린 박사입니다. 어떤 상황에서도 신앙의 본질과 삶의 의미를 찾으려는 영적인 통찰력을 가졌습니다...",
            image: "images/wise_man_B.png"
        },
        C: { 
            name: "몰약의 박사", 
            desc: "당신은 예수님의 고난과 치유를 상징하는 몰약을 드린 박사입니다. 다른 사람의 아픔에 깊이 공감하고, 자신의 것을 내어주며 상처를 감싸 안는 따뜻한 마음을 가졌습니다...",
            image: "images/wise_man_C.png"
        }
    };

    // 2. 안정성 검사 (기존과 동일)
    if (!type || !name || !resultData[type] || !typeNameElement || !descriptionElement || !imageElement || !startButton) {
        console.error("결과 표시에 필요한 데이터나 HTML 요소가 없습니다.");
        if(typeNameElement) typeNameElement.innerText = "결과를 불러올 수 없습니다.";
        if(descriptionElement) descriptionElement.innerText = "데이터가 올바르지 않습니다. 처음부터 다시 시도해주세요.";
        if(startButton) startButton.style.display = 'none';

        if (dynamicContentElement) {
            dynamicContentElement.classList.remove('no-scroll-on-result-page');
        }
        // ★★★ 오류 발생 시에도 HTML overflow를 원래대로 돌려놓습니다. ★★★
        document.documentElement.style.overflowY = originalHtmlOverflow;

        return;
    }

    // --- 3. 화면에 결과 표시 (리더님 지시사항 적용) ---
    typeNameElement.innerHTML = `[ ${resultData[type].name} ]<br>${name} 님`;
    const personalizedDesc = resultData[type].desc.replaceAll('당신', `${name}님`);
    descriptionElement.innerText = personalizedDesc;
    imageElement.src = resultData[type].image;

    // --- 4. 버튼 이벤트 리스너 추가 (기존과 동일) ---
    startButton.addEventListener('click', () => {
        window.startGame();
    });
    
    return {
        destroy: () => {
            if (dynamicContentElement) {
                dynamicContentElement.classList.remove('no-scroll-on-result-page');
            }
            // ★★★ 페이지 언로드 시 HTML overflow를 원래대로 돌려놓습니다. ★★★
            document.documentElement.style.overflowY = originalHtmlOverflow;
        }
    }
}