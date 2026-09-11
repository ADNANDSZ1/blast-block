const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');

const GRID_SIZE = 8;
const CELL_SIZE = 46;
const OFFSET_X = 16;
const OFFSET_Y = 16;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE;

let score = 0;
let particles = [];
let isGameOver = false;

let board = [];
for (let i = 0; i < 64; i++) {
    board.push(0);
}

const SHAPE_COLORS = {
    1: { base: '#06b6d4', glow: 'rgba(6, 182, 212, 0.5)' },
    2: { base: '#ec4899', glow: 'rgba(236, 72, 153, 0.5)' },
    3: { base: '#eab308', glow: 'rgba(234, 179, 8, 0.5)' },
    4: { base: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' }
};

const SHAPES = [
    { blocks: [{x:0, y:0}, {x:1, y:0}, {x:0, y:1}, {x:1, y:1}], color: 1, width: 2, height: 2 },
    { blocks: [{x:0, y:0}, {x:1, y:0}, {x:2, y:0}], color: 2, width: 3, height: 1 },
    { blocks: [{x:0, y:0}, {x:0, y:1}, {x:1, y:1}], color: 3, width: 2, height: 2 },
    { blocks: [{x:0, y:0}], color: 4, width: 1, height: 1 },
    { blocks: [{x:0, y:0}, {x:1, y:0}, {x:2, y:0}, {x:1, y:1}], color: 2, width: 3, height: 2 }
];

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.radius = Math.random() * 3 + 2;
        this.color = color; this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.02;
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= this.decay; }
    draw() {
        ctx.save(); ctx.globalAlpha = this.alpha;
        ctx.shadowBlur = 10; ctx.shadowColor = this.color.glow;
        ctx.fillStyle = this.color.base; ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

function createExplosion(gridX, gridY, colorId) {
    const startX = OFFSET_X + gridX * CELL_SIZE + CELL_SIZE / 2;
    const startY = OFFSET_Y + gridY * CELL_SIZE + CELL_SIZE / 2;
    const color = SHAPE_COLORS[colorId] || { base: '#fff', glow: 'rgba(255,255,255,0.5)' };
    for (let i = 0; i < 8; i++) { particles.push(new Particle(startX, startY, color)); }
}

let dock = [];
function refillDock() {
    dock = [];
    for (let i = 0; i < 3; i++) {
        const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const dockX = 35 + i * 130;
        const dockY = BOARD_SIZE + 60;
        dock.push({
            blocks: randomShape.blocks, color: randomShape.color,
            width: randomShape.width, height: randomShape.height,
            x: dockX, y: dockY, origX: dockX, origY: dockY, isDragged: false
        });
    }
    cekGameOver(); // Cek kecocokan ruang setiap kali dock diisi baru
}

// MEKANIK DETEKSI GAME OVER OTOMATIS
function cekGameOver() {
    let adaBalokBisaMasuk = false;

    // Periksa setiap balok yang tersisa di bawah
    for (let block of dock) {
        if (!block) continue;
        
        // Cek semua kemungkinan koordinat di papan (8x8)
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                let muat = true;
                
                for (let poin of block.blocks) {
                    const tc = c + poin.x;
                    const tr = r + poin.y;
                    
                    if (tc < 0 || tc >= GRID_SIZE || tr < 0 || tr >= GRID_SIZE || board[tr * 8 + tc] > 0) {
                        muat = false;
                        break;
                    }
                }
                if (muat) { adaBalokBisaMasuk = true; break; }
            }
            if (adaBalokBisaMasuk) break;
        }
        if (adaBalokBisaMasuk) break;
    }

    // Jika tidak ada satu pun balok di bawah yang muat di grid, GAME OVER!
    if (!adaBalokBisaMasuk && dock.some(b => b !== null)) {
        isGameOver = true;
        finalScoreEl.innerText = score;
        gameOverScreen.style.display = 'flex';
    }
}

function resetGame() {
    board.fill(0);
    score = 0;
    scoreEl.innerText = score;
    isGameOver = false;
    gameOverScreen.style.display = 'none';
    refillDock();
}

let selectedBlock = null;
let startX, startY;

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches.clientX : e.clientX;
    const clientY = e.touches ? e.touches.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function checkCollision(mx, my) {
    for (let block of dock) {
        if (!block) continue;
        const size = CELL_SIZE * 0.7;
        if (mx >= block.x && mx <= block.x + block.width * size && my >= block.y && my <= block.y + block.height * size) {
            return block;
        }
    }
    return null;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#130b2e';
    ctx.fillRect(OFFSET_X, OFFSET_Y, BOARD_SIZE, BOARD_SIZE);

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const x = OFFSET_X + c * CELL_SIZE;
            const y = OFFSET_Y + r * CELL_SIZE;
            ctx.strokeStyle = '#23154c'; ctx.lineWidth = 1;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

            const isiPapan = board[r * 8 + c];
            if (isiPapan > 0) { drawNeonBlock(x, y, isiPapan); }
        }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, BOARD_SIZE + 35); ctx.lineTo(canvas.width - 10, BOARD_SIZE + 35); ctx.stroke();

    dock.forEach(block => {
        if (!block) return;
        block.blocks.forEach(poin => {
            const size = block.isDragged ? CELL_SIZE : CELL_SIZE * 0.7;
            drawNeonBlock(block.x + poin.x * size, block.y + poin.y * size, block.color, size);
        });
    });

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].alpha <= 0) { particles.splice(i, 1); } else { particles[i].draw(); }
    }
}

function drawNeonBlock(x, y, colorId, size = CELL_SIZE) {
    const color = SHAPE_COLORS[colorId];
    ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = color.glow;
    ctx.fillStyle = color.base; ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, size - 4, size - 4, 6); ctx.fill(); ctx.restore();
}

function checkBlast() {
    let rowsToBlast = []; let colsToBlast = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        let barisPenuh = true;
        for (let c = 0; c < GRID_SIZE; c++) { if (board[r * 8 + c] === 0) barisPenuh = false; }
        if (barisPenuh) rowsToBlast.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
        let kolomPenuh = true;
        for (let r = 0; r < GRID_SIZE; r++) { if (board[r * 8 + c] === 0) kolomPenuh = false; }
        if (kolomPenuh) colsToBlast.push(c);
    }

    if (rowsToBlast.length > 0 || colsToBlast.length > 0) {
        rowsToBlast.forEach(r => {
            for (let c = 0; c < GRID_SIZE; c++) { const idx = r * 8 + c; createExplosion(c, r, board[idx]); board[idx] = 0; }
        });
        colsToBlast.forEach(c => {
            for (let r = 0; r < GRID_SIZE; r++) { const idx = r * 8 + c; if (board[idx] > 0) createExplosion(c, r, board[idx]); board[idx] = 0; }
        });
        score += (rowsToBlast.length + colsToBlast.length) * 100;
        scoreEl.innerText = score;
    }
}

function startDrag(e) {
    if (isGameOver) return;
    const pos = getMousePos(e);
    const clickedBlock = checkCollision(pos.x, pos.y);
    if (clickedBlock) {
        selectedBlock = clickedBlock; selectedBlock.isDragged = true;
        startX = pos.x - selectedBlock.x; startY = pos.y - selectedBlock.y;
    }
}

function moveDrag(e) {
    if (!selectedBlock || isGameOver) return;
    const pos = getMousePos(e);
    selectedBlock.x = pos.x - startX; selectedBlock.y = pos.y - startY;
}

function endDrag() {
    if (!selectedBlock || isGameOver) return;
    const gridC = Math.round((selectedBlock.x - OFFSET_X) / CELL_SIZE);
    const gridR = Math.round((selectedBlock.y - OFFSET_Y) / CELL_SIZE);
    let canPlace = true;

    for (let i = 0; i < selectedBlock.blocks.length; i++) {
        const poin = selectedBlock.blocks[i];
        const tc = gridC + poin.x; const tr = gridR + poin.y;
        if (tc < 0 || tc >= GRID_SIZE || tr < 0 || tr >= GRID_SIZE || board[tr * 8 + tc] > 0) { canPlace = false; }
    }

    if (canPlace) {
        for (let i = 0; i < selectedBlock.blocks.length; i++) {
            const poin = selectedBlock.blocks[i];
            board[(gridR + poin.y) * 8 + (gridC + poin.x)] = selectedBlock.color;
        }
        score += 10; scoreEl.innerText = score;
        dock[dock.indexOf(selectedBlock)] = null;
        checkBlast();
        if (dock.every(b => b === null)) { refillDock(); } else { cekGameOver(); }
    } else {
        selectedBlock.x = selectedBlock.origX; selectedBlock.y = selectedBlock.origY; selectedBlock.isDragged = false;
    }
    selectedBlock = null;
}

canvas.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', moveDrag);
window.addEventListener('mouseup', endDrag);
canvas.addEventListener('touchstart', startDrag, {passive: true});
window.addEventListener('touchmove', moveDrag, {passive: true});
window.addEventListener('touchend', endDrag);

refillDock();
function gameLoop() { draw(); requestAnimationFrame(gameLoop); }
gameLoop();

// ... kode game Anda yang sudah ada ...

function gameLoop() { 
    draw(); 
    requestAnimationFrame(gameLoop); 
}
gameLoop(); // Ini akhir kode lama Anda

// ==========================================
// SENSOR HP BARU: LANGSUNG SINKRON MOUSE
// ==========================================

function triggerMouseEvent(touchEvent, mouseEventType) {
    if (touchEvent.touches.length === 0 && mouseEventType !== 'mouseup') return;
    
    const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    
    // Konversi koordinat layar HP biar pas ke dalam kotak game
    const mouseX = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((touch.clientY - rect.top) / rect.height) * canvas.height;
    
    // Membuat event mouse buatan agar dibaca oleh fungsi laptop lu
    const mouseEvent = new MouseEvent(mouseEventType, {
        clientX: mouseX,
        clientY: mouseY,
        bubbles: true,
        cancelable: true
    });
    
    // Kirim event ke canvas game
    canvas.dispatchEvent(mouseEvent);
}

// Hubungkan sensor sentuh HP ke fungsi mouse laptop
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    triggerMouseEvent(e, 'mousedown');
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    triggerMouseEvent(e, 'mousemove');
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    triggerMouseEvent(e, 'mouseup');
}, { passive: false });
