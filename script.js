document.addEventListener('DOMContentLoaded', () => {
    const workspace = document.getElementById('workspace');
    const textInput = document.getElementById('textInput');
    const sizeSlider = document.getElementById('sizeSlider');
    const renderArea = document.getElementById('renderArea');
    const xrayContainer = document.getElementById('xrayContainer');
    const xrayLens = document.getElementById('xrayLens');
    const lensResize = document.getElementById('lensResize'); // 추가됨
    
    const layerFolders = {
        'base': 'Base',
        'fills': 'Fills',
        'joint': 'Joint',
        'weight': 'Skin Weight',
        'skeleton': 'Skeleton'
    };

    function renderText(text) {
        document.querySelectorAll('.font-layer').forEach(layer => layer.innerHTML = '');
        const chars = text.split('');
        
        chars.forEach(char => {
            if (char === ' ') {
                document.querySelectorAll('.font-layer').forEach(layer => {
                    const space = document.createElement('div');
                    space.className = 'char-space';
                    layer.appendChild(space);
                });
                return;
            }

            let folderName = '';
            if (/[A-Z]/.test(char)) folderName = 'capital';
            else if (/[a-z]/.test(char)) folderName = 'small letter';
            else return; 

            const fileName = `${char}.svg`;

            for (const [layerType, folderPath] of Object.entries(layerFolders)) {
                const svgUrl = `${folderPath}/${folderName}/${fileName}`;
                
                document.querySelectorAll(`.font-layer[data-type="${layerType}"]`).forEach(layer => {
                    const charDiv = document.createElement('div');
                    charDiv.className = 'char-svg';
                    charDiv.style.webkitMaskImage = `url('${svgUrl}')`;
                    charDiv.style.maskImage = `url('${svgUrl}')`;
                    layer.appendChild(charDiv);
                });
            }
        });
    }

    textInput.addEventListener('input', (e) => renderText(e.target.value));
    renderText(textInput.value);

    // 슬라이더 및 UI 컬러 동기화
    sizeSlider.addEventListener('input', (e) => {
        renderArea.style.fontSize = `${e.target.value}px`;
    });

    document.querySelectorAll('.layer-label').forEach(label => {
        label.addEventListener('click', (e) => {
            const targetType = e.target.getAttribute('data-layer');
            const isVisible = e.target.getAttribute('data-visible') === 'true';
            e.target.setAttribute('data-visible', !isVisible);
            document.querySelectorAll(`.font-layer[data-type="${targetType}"]`).forEach(layer => {
                layer.style.opacity = !isVisible ? '1' : '0';
            });
        });
    });

    document.querySelectorAll('.color-picker').forEach(picker => {
        picker.addEventListener('input', (e) => {
            const targetType = e.target.getAttribute('data-layer');
            document.querySelectorAll(`.font-layer[data-type="${targetType}"]`).forEach(layer => {
                layer.style.color = e.target.value;
            });
        });
    });

    // ==========================================
    // [추가 2] 다크 테마 제어 함수
    // Package 또는 X-ray 중 하나라도 켜져 있으면 블랙 배경으로 변경
    // ==========================================
    function updateTheme() {
        if (workspace.classList.contains('is-packaged') || workspace.classList.contains('is-xray')) {
            workspace.classList.add('theme-dark');
        } else {
            workspace.classList.remove('theme-dark');
        }
    }

    const btnPackage = document.getElementById('btnPackage');
    btnPackage.addEventListener('click', () => {
        workspace.classList.toggle('is-packaged');
        btnPackage.setAttribute('data-selected', workspace.classList.contains('is-packaged'));
        updateTheme();
    });

    const btnXray = document.getElementById('btnXray');
    btnXray.addEventListener('click', () => {
        workspace.classList.toggle('is-xray');
        btnXray.setAttribute('data-selected', workspace.classList.contains('is-xray'));
        updateTheme();
        updateXrayMask();
    });

    // ==========================================
    // [수정] X-ray 스캐너 드래그 & "크기 조절(Resize)" 로직
    // ==========================================
    let isDragging = false;
    let isResizing = false;
    let startX, startY, initialLeft, initialTop, startWidth, startHeight;

    // 크기 조절 손잡이를 클릭했을 때 (이동 방지)
    lensResize.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // 스캐너 렌즈의 드래그 이벤트가 실행되지 않게 막음
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = xrayLens.offsetWidth;
        startHeight = xrayLens.offsetHeight;
        
        // 크기 조절 시 중앙 정렬 기준이 틀어지지 않도록 위치 고정
        lockLensPosition(); 
    });

    // 스캐너 몸체를 클릭했을 때 (이동)
    xrayLens.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        lockLensPosition();
    });

    // transform(-50%, -50%)을 해제하고 left/top 절대 좌표로 변환하는 함수
    function lockLensPosition() {
        if (xrayLens.style.transform !== 'none') {
            const rect = xrayLens.getBoundingClientRect();
            const parentRect = renderArea.getBoundingClientRect();
            initialLeft = rect.left - parentRect.left;
            initialTop = rect.top - parentRect.top;
            
            xrayLens.style.transform = 'none';
            xrayLens.style.left = `${initialLeft}px`;
            xrayLens.style.top = `${initialTop}px`;
        } else {
            initialLeft = parseInt(xrayLens.style.left || 0, 10);
            initialTop = parseInt(xrayLens.style.top || 0, 10);
        }
    }

    window.addEventListener('mousemove', (e) => {
        // 크기 조절 중일 때
        if (isResizing) {
            // 최소 크기를 가로 100px, 세로 50px로 제한
            const newWidth = Math.max(100, startWidth + (e.clientX - startX));
            const newHeight = Math.max(50, startHeight + (e.clientY - startY));
            
            xrayLens.style.width = `${newWidth}px`;
            xrayLens.style.height = `${newHeight}px`;
            updateXrayMask();
            return;
        }

        // 스캐너 이동 중일 때
        if (isDragging) {
            let newLeft = initialLeft + (e.clientX - startX);
            let newTop = initialTop + (e.clientY - startY);

            const maxX = renderArea.clientWidth - xrayLens.offsetWidth;
            const maxY = renderArea.clientHeight - xrayLens.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxX));
            newTop = Math.max(0, Math.min(newTop, maxY));

            xrayLens.style.left = `${newLeft}px`;
            xrayLens.style.top = `${newTop}px`;
            updateXrayMask();
        }
    });

    window.addEventListener('mouseup', () => { 
        isDragging = false; 
        isResizing = false;
    });

    function updateXrayMask() {
        if (!workspace.classList.contains('is-xray')) return;

        const lensRect = xrayLens.getBoundingClientRect();
        const areaRect = renderArea.getBoundingClientRect();

        const top = lensRect.top - areaRect.top;
        const left = lensRect.left - areaRect.left;
        const right = areaRect.width - (left + lensRect.width);
        const bottom = areaRect.height - (top + lensRect.height);

        xrayContainer.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
    }
});