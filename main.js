// Minimal Diablo-like touch game
// Hero movement via joystick, attack enemies within melee radius, HP bar/restart

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
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

let hero = { x: window.innerWidth/2, y: window.innerHeight/2, r: 20, hp:100, maxHp:100 };
const enemies = []; // 5 enemies
let attackCooldown = 0;

// Spawn 5 enemies away from hero
function spawnEnemies() {
  enemies.length = 0;
  for(let i=0;i<5;i++) {
    let x,y,d;
    do {
      x = Math.random() * window.innerWidth;
      y = Math.random() * window.innerHeight;
      d = Math.hypot(x-hero.x, y-hero.y);
    } while(d < 200);
    enemies.push({ x, y, r: 18, hp: 30, dead: false });
  }
}
spawnEnemies();

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
  if(attackCooldown <= 0) doAttack();
}, {passive:false});
function doAttack() {
  attackCooldown = 12; // ~200ms at 60fps
  for(const e of enemies) {
    if(!e.dead && Math.hypot(e.x-hero.x, e.y-hero.y) < hero.r + e.r + 20) {
      e.hp -= 25;
      if(e.hp <= 0) e.dead = true;
    }
  }
}

// Restart
document.getElementById('restart').addEventListener('click', () => {
  hero.x = window.innerWidth/2; hero.y = window.innerHeight/2; hero.hp = hero.maxHp;
  spawnEnemies();
  document.getElementById('restart').style.display = 'none';
});

// Update
function update() {
  // Move hero
  if(jActive) {
    hero.x += jVec.x * 5;
    hero.y += jVec.y * 5;
  }
  // Clamp to viewport
  hero.x = Math.max(hero.r, Math.min(window.innerWidth-hero.r, hero.x));
  hero.y = Math.max(hero.r, Math.min(window.innerHeight-hero.r, hero.y));
  // Enemies move toward hero
  for(const e of enemies) {
    if(e.dead) continue;
    const dx = hero.x - e.x;
    const dy = hero.y - e.y;
    const dist = Math.hypot(dx,dy);
    if(dist>0) {
      e.x += (dx/dist) * 2; // enemy speed
      e.y += (dy/dist) * 2;
    }
    // Contact damage
    if(dist < hero.r + e.r) {
      hero.hp -= 0.3; // per frame
    }
  }
  // Cooldown
  if(attackCooldown>0) attackCooldown--;
  // Hero death
  if(hero.hp <= 0) {
    hero.hp = 0;
    document.getElementById('restart').style.display = 'block';
  }
  // Update UI
  document.getElementById('hp').textContent = 'HP: ' + Math.ceil(hero.hp);
}

// Draw
function draw() {
  const w = window.innerWidth, h = window.innerHeight;
  ctx.clearRect(0,0,w,h);
  // Hero
  ctx.fillStyle = '#4af';
  ctx.beginPath();
  ctx.arc(hero.x, hero.y, hero.r, 0, Math.PI*2);
  ctx.fill();
  // Enemies
  ctx.fillStyle = '#f44';
  for(const e of enemies) {
    if(!e.dead) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
