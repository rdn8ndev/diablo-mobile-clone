// Game config
const CONFIG = {
  heroSpeed: 150,
  enemySpeed: 50,
  meleeRadius: 50,
  attackCooldown: 300,
  enemyContactCooldown: 500,
  enemyCount: 5,
  heroRadius: 20,
  enemyRadius: 18,
};

// Game state
const state = {
  hero: null,
  enemies: [],
  lastTime: 0,
  attackCooldown: 0,
  attackCooldownMax: CONFIG.attackCooldown,
  joystick: { active: false, x: 0, y: 0 },
  gameOver: false,
};

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Classes
class Hero {
  constructor() {
    this.x = canvas.width / (2 * (window.devicePixelRatio || 1));
    this.y = canvas.height / (2 * (window.devicePixelRatio || 1));
    this.radius = CONFIG.heroRadius;
    this.hp = 100;
    this.maxHp = 100;
  }

  update(dt, direction) {
    if (direction.x !== 0 || direction.y !== 0) {
      const len = Math.sqrt(direction.x**2 + direction.y**2);
      const nx = direction.x / len;
      const ny = direction.y / len;
      this.x += nx * CONFIG.heroSpeed * dt;
      this.y += ny * CONFIG.heroSpeed * dt;
    }
    // Clamp to canvas
    const maxX = canvas.width / (window.devicePixelRatio || 1);
    const maxY = canvas.height / (window.devicePixelRatio || 1);
    this.x = Math.max(this.radius, Math.min(maxX - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(maxY - this.radius, this.y));
  }

  draw(ctx) {
    ctx.fillStyle = '#4af';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      state.gameOver = true;
      document.getElementById('restart-btn').style.display = 'block';
    }
    updateHpDisplay();
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = CONFIG.enemyRadius;
    this.hp = 30;
    this.lastContact = 0;
  }

  update(dt, hero) {
    // Move toward hero
    const dx = hero.x - this.x;
    const dy = hero.y - this.y;
    const dist = Math.sqrt(dx**2 + dy**2);
    if (dist > 0) {
      this.x += (dx / dist) * CONFIG.enemySpeed * dt;
      this.y += (dy / dist) * CONFIG.enemySpeed * dt;
    }

    // Contact damage
    if (dist < this.radius + hero.radius) {
      const now = Date.now();
      if (now - this.lastContact > CONFIG.enemyContactCooldown) {
        hero.takeDamage(10);
        this.lastContact = now;
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#f44';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  takeDamage(amount) {
    this.hp -= amount;
  }
}

// Initialization
function initGame() {
  state.hero = new Hero();
  state.enemies = [];
  state.gameOver = false;
  state.attackCooldown = 0;
  document.getElementById('restart-btn').style.display = 'none';

  const maxX = canvas.width / (window.devicePixelRatio || 1);
  const maxY = canvas.height / (window.devicePixelRatio || 1);

  for (let i = 0; i < CONFIG.enemyCount; i++) {
    let ex, ey;
    // Spawn away from hero (at least 200px)
    do {
      ex = Math.random() * maxX;
      ey = Math.random() * maxY;
    } while (Math.hypot(ex - state.hero.x, ey - state.hero.y) < 200);
    state.enemies.push(new Enemy(ex, ey));
  }

  updateHpDisplay();
}

function updateHpDisplay() {
  document.getElementById('hp-value').textContent = state.hero.hp;
}

// Attack
function performAttack() {
  if (state.attackCooldown > 0) return;
  state.attackCooldown = state.attackCooldownMax;

  for (const enemy of state.enemies) {
    const dist = Math.hypot(enemy.x - state.hero.x, enemy.y - state.hero.y);
    if (dist <= CONFIG.meleeRadius + enemy.radius) {
      enemy.takeDamage(25);
    }
  }
}

// Remove dead enemies
function cleanupEnemies() {
  state.enemies = state.enemies.filter(e => e.hp > 0);
}

// Game loop
function gameLoop(timestamp) {
  const dt = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;

  // Cooldowns
  if (state.attackCooldown > 0) {
    state.attackCooldown -= dt * 1000;
  }

  if (!state.gameOver) {
    // Update
    state.hero.update(dt, state.joystick);
    state.enemies.forEach(e => e.update(dt, state.hero));
    cleanupEnemies();

    // Reset if all enemies dead
    if (state.enemies.length === 0) {
      initGame();
    }
  }

  // Draw
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw enemies first (behind hero)
  state.enemies.forEach(e => e.draw(ctx));

  // Draw hero
  if (!state.gameOver) {
    state.hero.draw(ctx);
    // Attack range indicator (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.hero.x, state.hero.y, CONFIG.meleeRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  requestAnimationFrame(gameLoop);
}

// Joystick
const joystickArea = document.getElementById('joystick-area');
const joystickStick = document.getElementById('joystick-stick');
let joystickCenter = { x: 0, y: 0 };
let joystickActive = false;

function handleJoystickStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = joystickArea.getBoundingClientRect();
  joystickCenter.x = rect.left + rect.width / 2;
  joystickCenter.y = rect.top + rect.height / 2;
  joystickActive = true;
}

function handleJoystickMove(e) {
  if (!joystickActive) return;
  e.preventDefault();

  const touch = e.touches[0];
  const dx = touch.clientX - joystickCenter.x;
  const dy = touch.clientY - joystickCenter.y;
  const distance = Math.sqrt(dx*dx + dy*dy);
  const maxDist = 35; // Stick movement limit

  let nx = dx;
  let ny = dy;
  if (distance > maxDist) {
    nx = (dx / distance) * maxDist;
    ny = (dy / distance) * maxDist;
  }

  joystickStick.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;

  if (distance > 5) {
    state.joystick.active = true;
    state.joystick.x = dx / maxDist;
    state.joystick.y = dy / maxDist;
  } else {
    state.joystick.active = false;
    state.joystick.x = 0;
    state.joystick.y = 0;
  }
}

function handleJoystickEnd(e) {
  e.preventDefault();
  joystickActive = false;
  state.joystick.active = false;
  state.joystick.x = 0;
  state.joystick.y = 0;
  joystickStick.style.transform = `translate(-50%, -50%)`;
}

joystickArea.addEventListener('touchstart', handleJoystickStart, { passive: false });
joystickArea.addEventListener('touchmove', handleJoystickMove, { passive: false });
joystickArea.addEventListener('touchend', handleJoystickEnd, { passive: false });
joystickArea.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

// Attack button
document.getElementById('attack-btn').addEventListener('click', () => {
  if (!state.gameOver) {
    performAttack();
  }
});
document.getElementById('attack-btn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!state.gameOver) {
    performAttack();
  }
});

// Restart
document.getElementById('restart-btn').addEventListener('click', initGame);

// Desktop fallback (WASD + click)
window.addEventListener('keydown', (e) => {
  if (state.gameOver) return;
  const speed = CONFIG.heroSpeed * 0.016;
  switch(e.key.toLowerCase()) {
    case 'w': state.joystick.y = -1; break;
    case 's': state.joystick.y = 1; break;
    case 'a': state.joystick.x = -1; break;
    case 'd': state.joystick.x = 1; break;
  }
});
window.addEventListener('keyup', (e) => {
  switch(e.key.toLowerCase()) {
    case 'w': if (state.joystick.y < 0) state.joystick.y = 0; break;
    case 's': if (state.joystick.y > 0) state.joystick.y = 0; break;
    case 'a': if (state.joystick.x < 0) state.joystick.x = 0; break;
    case 'd': if (state.joystick.x > 0) state.joystick.x = 0; break;
  }
});

// Start
state.lastTime = performance.now();
initGame();
requestAnimationFrame(gameLoop);
