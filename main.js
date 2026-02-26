// Diablo Mobile Clone - Step 3: Enemy sprites, attack effects, contact cooldown

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Constants
const TILE_SIZE = 32;
const MAP_W = 30;
const MAP_H = 20;
const HERO_SPEED = 150;
const ENEMY_SPEED = 60;
const HERO_RADIUS = 16;
const ENEMY_RADIUS = 14;
const ATTACK_RADIUS = 50;
const ATTACK_COOLDOWN = 0.2;
const ATTACK_EFFECT_DURATION = 0.1;
const ENEMY_DAMAGE = 10; // contact damage per hit
const ENEMY_CONTACT_COOLDOWN = 0.4; // seconds

// Load images
const images = {
  floor: new Image(),
  wall: new Image(),
  hero: new Image(),
  skeleton: new Image(),
  imp: new Image()
};
images.floor.src = 'assets/floor.svg';
images.wall.src = 'assets/wall.svg';
images.hero.src = 'assets/hero.svg';
images.skeleton.src = 'assets/skeleton.svg';
images.imp.src = 'assets/imp.svg';

// World
let map = [];
let worldWidth = MAP_W * TILE_SIZE;
let worldHeight = MAP_H * TILE_SIZE;
let camX = 0, camY = 0;

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
  facing: { x: 1, y: 0 },
  attackCooldown: 0,
  gameOver: false
};

// Enemies
let enemies = [];
function spawnEnemies() {
  enemies = [];
  for (let i = 0; i < 5; i++) {
    const type = i < 3 ? 'skeleton' : 'imp';
    let ex, ey, dist;
    do {
      ex = TILE_SIZE*2 + Math.random() * (worldWidth - 2*TILE_SIZE);
      ey = TILE_SIZE*2 + Math.random() * (worldHeight - 2*TILE_SIZE);
      dist = Math.hypot(ex - hero.x, ey - hero.y);
    } while (dist < 200);
    enemies.push({
      x: ex, y: ey,
      r: ENEMY_RADIUS,
      hp: type === 'skeleton' ? 30 : 20,
      maxHp: type === 'skeleton' ? 30 : 20,
      type: type,
      dead: false,
      flash: 0,
      lastContact: 0
    });
  }
}

function initGame() {
  initMap();
  hero.x = worldWidth / 2;
  hero.y = worldHeight / 2;
  hero.facing = { x: 1, y: 0 };
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

// Resize
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
attackBtn = document.getElementById('attack');
attackBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  if(hero.attackCooldown <= 0 && !hero.gameOver) {
    hero.attackCooldown = ATTACK_COOLDOWN;
    attackEffect = {
      x: hero.x,
      y: hero.y,
      angle: Math.atan2(hero.facing.y, hero.facing.x),
      timer: ATTACK_EFFECT_DURATION
    };
    for (const e of enemies) {
      if (e.dead) continue;
      const dist = Math.hypot(e.x - hero.x, e.y - hero.y);
      if (dist < HERO_RADIUS + e.r + ATTACK_RADIUS) {
        e.hp -= 25;
        e.flash = 0.1;
        if (e.hp <= 0) e.dead = true;
      }
    }
  }
}, {passive:false});

// Restart
document.getElementById('restart').addEventListener('click', initGame);

// Update
let attackEffect = null; // {x,y,angle,timer}
function update(dt) {
  if (hero.gameOver) return;

  if (hero.attackCooldown > 0) hero.attackCooldown -= dt;

  if (jActive && (Math.abs(jVec.x) > 0.1 || Math.abs(jVec.y) > 0.1)) {
    hero.facing.x = jVec.x;
    hero.facing.y = jVec.y;
  }

  // Hero collision-based movement
  if (jActive) {
    const speed = HERO_SPEED * dt;
    let dx = jVec.x * speed;
    let dy = jVec.y * speed;
    const newX = hero.x + dx;
    if (canMoveTo(newX, hero.y, hero.r)) hero.x = newX;
    const newY = hero.y + dy;
    if (canMoveTo(hero.x, newY, hero.r)) hero.y = newY;
  }

  // Attack effect timer
  if (attackEffect) {
    attackEffect.timer -= dt;
    if (attackEffect.timer <= 0) attackEffect = null;
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
    // Contact damage with cooldown
    if (dist < hero.r + e.r) {
      const now = performance.now() / 1000;
      if (now - e.lastContact > ENEMY_CONTACT_COOLDOWN) {
        hero.hp -= ENEMY_DAMAGE;
        e.lastContact = now;
        if (hero.hp <= 0) {
          hero.hp = 0;
          hero.gameOver = true;
          document.getElementById('restart').style.display = 'block';
        }
        updateHpDisplay();
      }
    }
    // Flash decay
    if (e.flash > 0) e.flash -= dt;
  }
}

// Draw
function drawShadow(x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r*0.8, r*1.2, r*0.4, 0, 0, Math.PI*2);
  ctx.fill();
}

function draw() {
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  ctx.clearRect(0, 0, cw, ch);

  camX = hero.x - cw/2;
  camY = hero.y - ch/2;
  camX = Math.max(0, Math.min(camX, worldWidth - cw));
  camY = Math.max(0, Math.min(camY, worldHeight - ch));

  const startCol = Math.floor(camX / TILE_SIZE);
  const endCol = Math.ceil((camX + cw) / TILE_SIZE);
  const startRow = Math.floor(camY / TILE_SIZE);
  const endRow = Math.ceil((camY + ch) / TILE_SIZE);

  // Tiles
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

  // Enemies with sprites
  for (const e of enemies) {
    if (e.dead) continue;
    const sx = e.x - camX;
    const sy = e.y - camY;
    drawShadow(sx, sy, e.r);
    const img = e.type === 'skeleton' ? images.skeleton : images.imp;
    if (img && img.complete) {
      ctx.drawImage(img, sx - e.r, sy - e.r, e.r*2, e.r*2);
    } else {
      ctx.fillStyle = e.type === 'skeleton' ? '#eee' : '#0a0';
      ctx.beginPath();
      ctx.arc(sx, sy, e.r, 0, Math.PI*2);
      ctx.fill();
    }
    if (e.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(sx - e.r, sy - e.r, e.r*2, e.r*2);
    }
  }

  // Attack wedge
  if (attackEffect) {
    const x = attackEffect.x - camX;
    const y = attackEffect.y - camY;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(attackEffect.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, ATTACK_RADIUS, -Math.PI/4, Math.PI/4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,0,0.4)';
    ctx.fill();
    ctx.restore();
  }

  // Hero with sprite
  const hx = hero.x - camX;
  const hy = hero.y - camY;
  drawShadow(hx, hy, hero.r);
  if (images.hero.complete) {
    ctx.save();
    ctx.translate(hx, hy);
    const angle = Math.atan2(hero.facing.y, hero.facing.x);
    ctx.rotate(angle);
    ctx.drawImage(images.hero, -hero.r, -hero.r, hero.r*2, hero.r*2);
    ctx.restore();
  } else {
    ctx.fillStyle = '#4af';
    ctx.beginPath();
    ctx.arc(hx, hy, hero.r, 0, Math.PI*2);
    ctx.fill();
  }

  // Vignette: radial gradient centered on hero, inner 0 alpha, outer 0.65
  {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const cx = hx; // already computed hero screen position
    const cy = hy;
    const radius = Math.hypot(cw, ch) / 1.5; // cover corners
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
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

initGame();
requestAnimationFrame(loop);
