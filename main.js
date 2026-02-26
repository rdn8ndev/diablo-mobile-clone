// Diablo Mobile Clone - Upgraded Step 1: Tile map, camera, and collision. Sprites still TBD.

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Constants
const TILE_SIZE = 32;
const MAP_W = 30;
const MAP_H = 20;
const HERO_SPEED = 150; // px/s
const ENEMY_SPEED = 60;
const HERO_RADIUS = 16;
const ENEMY_RADIUS = 14;
const ATTACK_RADIUS = 50;
const ATTACK_COOLDOWN = 0.2; // s
const ENEMY_DAMAGE = 10; // per second? we'll apply per dt

// Load floor/wall images
const images = {
  floor: new Image(),
  wall: new Image()
};
images.floor.src = 'assets/floor.svg';
images.wall.src = 'assets/wall.svg';

// World
let map = [];
let worldWidth = MAP_W * TILE_SIZE;
let worldHeight = MAP_H * TILE_SIZE;
let camX = 0, camY = 0;

// Initialize map: border walls, interior floor
function initMap() {
  map = [];
  for (let y = 0; y < MAP_H; y++) {
    let row = [];
    for (let x = 0; x < MAP_W; x++) {
      row.push((x===0 || y===0 || x===MAP_W-1 || y===MAP_H-1) ? 1 : 0);
    }
    map.push(row);
  }
}

// Collision
function isSolidTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return map[ty][tx] === 1;
}
function canMoveTo(x, y, r) {
  const left = Math.floor((x - r) / TILE_SIZE);
  const right = Math.floor((x + r) / TILE_SIZE);
  const top = Math.floor((y - r) / TILE_SIZE);
  const bottom = Math.floor((y + r) / TILE_SIZE);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (isSolidTile(tx, ty)) return false;
    }
  }
  return true;
}

// Hero
let hero = {
  x: 0, y: 0,
  r: HERO_RADIUS,
  hp: 100,
  maxHp: 100,
  attackCooldown: 0,
  gameOver: false
};

// Enemies
let enemies = []; // {x,y,r,hp,dead}

function spawnEnemies() {
  enemies = [];
  for (let i = 0; i < 5; i++) {
    let ex, ey, dist;
    do {
      ex = TILE_SIZE*2 + Math.random() * (worldWidth - 2*TILE_SIZE);
      ey = TILE_SIZE*2 + Math.random() * (worldHeight - 2*TILE_SIZE);
      dist = Math.hypot(ex - hero.x, ey - hero.y);
    } while (dist < 200);
    enemies.push({ x: ex, y: ey, r: ENEMY_RADIUS, hp: 30, dead: false });
  }
}

function initGame() {
  initMap();
  hero.x = worldWidth / 2;
  hero.y = worldHeight / 2;
  hero.hp = hero.maxHp;
  hero.attackCooldown = 0;
  hero.gameOver = false;
  spawnEnemies();
  document.getElementById('restart').style.display = 'none';
  updateHpDisplay();
}

function updateHpDisplay() {
  document.getElementById('hp').textContent = 'HP: ' + Math.ceil(hero.hp);
}

// Resize canvas
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}
resize();
window.addEventListener('resize', resize);

// Joystick
const joystickArea = document.getElementById('joystick-area');
const stick = document.getElementById('stick');
let jActive = false, jOrigin = {x:0,y:0}, jVec = {x:0,y:0}, jMax = 35;
joystickArea.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = joystickArea.getBoundingClientRect();
  jOrigin.x = rect.left + rect.width/2;
  jOrigin.y = rect.top + rect.height/2;
  jActive = true;
  moveJoystick(touch);
}, {passive:false});
joystickArea.addEventListener('touchmove', e => {
  e.preventDefault();
  moveJoystick(e.touches[0]);
}, {passive:false});
joystickArea.addEventListener('touchend', e => {
  e.preventDefault();
  jActive = false;
  jVec = {x:0,y:0};
  stick.style.transform = 'translate(-50%,-50%)';
}, {passive:false});
function moveJoystick(touch) {
  const dx = touch.clientX - jOrigin.x;
  const dy = touch.clientY - jOrigin.y;
  const d = Math.hypot(dx,dy);
  if(d > jMax) {
    jVec.x = dx/d * jMax;
    jVec.y = dy/d * jMax;
  } else {
    jVec.x = dx; jVec.y = dy;
  }
  stick.style.transform = `translate(calc(-50% + ${jVec.x}px), calc(-50% + ${jVec.y}px))`;
  if(d > 5) { jVec.x /= jMax; jVec.y /= jMax; }
  else { jVec = {x:0,y:0}; }
}

// Attack
const attackBtn = document.getElementById('attack');
attackBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  if(hero.attackCooldown <= 0 && !hero.gameOver) {
    // Damage all enemies within ATTACK_RADIUS
    for (const e of enemies) {
      if (e.dead) continue;
      const dist = Math.hypot(e.x - hero.x, e.y - hero.y);
      if (dist < HERO_RADIUS + e.r + ATTACK_RADIUS) {
        e.hp -= 25;
        if (e.hp <= 0) e.dead = true;
      }
    }
    hero.attackCooldown = ATTACK_COOLDOWN;
  }
}, {passive:false});

// Restart
document.getElementById('restart').addEventListener('click', initGame);

// Update
function update(dt) {
  if (hero.gameOver) return;

  // Cooldown
  if (hero.attackCooldown > 0) hero.attackCooldown -= dt;

  // Hero movement with collision
  if (jActive) {
    const speed = HERO_SPEED * dt;
    let dx = jVec.x * speed;
    let dy = jVec.y * speed;
    const newX = hero.x + dx;
    if (canMoveTo(newX, hero.y, hero.r)) hero.x = newX;
    const newY = hero.y + dy;
    if (canMoveTo(hero.x, newY, hero.r)) hero.y = newY;
  }

  // Enemies
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = hero.x - e.x;
    const dy = hero.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      const speed = ENEMY_SPEED * dt;
      const nx = dx / dist;
      const ny = dy / dist;
      const newX = e.x + nx * speed;
      const newY = e.y + ny * speed;
      if (canMoveTo(newX, e.y, e.r)) e.x = newX;
      if (canMoveTo(e.x, newY, e.r)) e.y = newY;
    }
    // Contact damage (every frame while overlapping)
    if (dist < hero.r + e.r) {
      hero.hp -= ENEMY_DAMAGE * dt;
      if (hero.hp <= 0) {
        hero.hp = 0;
        hero.gameOver = true;
        document.getElementById('restart').style.display = 'block';
      }
      updateHpDisplay();
    }
  }
}

// Draw shadow helper
function drawShadow(x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r*0.8, r*1.2, r*0.4, 0, 0, Math.PI*2);
  ctx.fill();
}

// Draw
function draw() {
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  ctx.clearRect(0, 0, cw, ch);

  // Update camera
  camX = hero.x - cw/2;
  camY = hero.y - ch/2;
  camX = Math.max(0, Math.min(camX, worldWidth - cw));
  camY = Math.max(0, Math.min(camY, worldHeight - ch));

  // Visible tile range
  const startCol = Math.floor(camX / TILE_SIZE);
  const endCol = Math.ceil((camX + cw) / TILE_SIZE);
  const startRow = Math.floor(camY / TILE_SIZE);
  const endRow = Math.ceil((camY + ch) / TILE_SIZE);

  // Draw tiles
  for (let y = startRow; y <= endRow; y++) {
    for (let x = startCol; x <= endCol; x++) {
      if (y < 0 || y >= MAP_H || x < 0 || x >= MAP_W) continue;
      const tile = map[y][x];
      const img = tile === 1 ? images.wall : images.floor;
      if (img.complete) {
        ctx.drawImage(img, x*TILE_SIZE - camX, y*TILE_SIZE - camY, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = tile===1 ? '#222' : '#444';
        ctx.fillRect(x*TILE_SIZE - camX, y*TILE_SIZE - camY, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Draw enemies (red circles)
  for (const e of enemies) {
    if (e.dead) continue;
    const sx = e.x - camX;
    const sy = e.y - camY;
    drawShadow(sx, sy, e.r);
    ctx.fillStyle = '#f44';
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI*2);
    ctx.fill();
  }

  // Draw hero (blue circle)
  {
    const sx = hero.x - camX;
    const sy = hero.y - camY;
    drawShadow(sx, sy, hero.r);
    ctx.fillStyle = '#4af';
    ctx.beginPath();
    ctx.arc(sx, sy, hero.r, 0, Math.PI*2);
    ctx.fill();
  }
}

// Loop
let lastTime = performance.now();
function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// Start
initGame();
requestAnimationFrame(loop);
