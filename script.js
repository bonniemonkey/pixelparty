const modal = document.querySelector('#game-modal');
const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#game-overlay');
const overlayLabel = document.querySelector('#overlay-label');
const scoreOutput = document.querySelector('#modal-score');
const titleOutput = document.querySelector('#modal-title');
const kickerOutput = document.querySelector('#modal-kicker');
const instructionsOutput = document.querySelector('#modal-instructions');
const controlsOutput = document.querySelector('#modal-controls');
const startButton = document.querySelector('#start-game');

const games = {
  chef: { title: 'Fast Food Chef', kicker: '// ORDER UP', instructions: 'Click the matching food before the order expires.', controls: 'MOUSE / CLICK' },
  drive: { title: 'Drive Boss', kicker: '// PICK YOUR RISK', instructions: 'Switch between three lanes. Tap a lane or use A / D.', controls: 'A / D / ARROWS / TAP' },
  meteor: { title: 'Meteor Shooter', kicker: '// CLEAR THE SKY', instructions: 'Move with A / D and press SPACE or click to fire.', controls: 'A / D + SPACE / CLICK' }
};

let activeGame = null;
let running = false;
let animationId = 0;
let lastFrame = 0;
let score = 0;
let keys = {};
let gameState = {};

document.querySelectorAll('[data-game]').forEach((button) => {
  button.addEventListener('click', () => openGame(button.dataset.game));
});
document.querySelectorAll('[data-close-game]').forEach((button) => button.addEventListener('click', closeGame));
document.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
  if (event.key === 'Escape' && modal.classList.contains('is-open')) closeGame();
  if (activeGame === 'drive' && running && !event.repeat) {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') moveDriveLane(-1);
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') moveDriveLane(1);
  }
  if (event.code === 'Space' && activeGame === 'meteor' && running) { event.preventDefault(); shootMeteor(); }
});
document.addEventListener('keyup', (event) => { keys[event.key.toLowerCase()] = false; });
startButton.addEventListener('click', startGame);
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  if (activeGame === 'chef' && running) chefClick(point.x, point.y);
  if (activeGame === 'drive' && running) selectDriveLane(point.x);
  if (activeGame === 'meteor' && running) { gameState.ship.x = point.x; shootMeteor(); }
});
window.addEventListener('resize', drawDemos);

function openGame(type) {
  activeGame = type;
  const game = games[type];
  titleOutput.textContent = game.title;
  kickerOutput.textContent = game.kicker;
  instructionsOutput.textContent = game.instructions;
  controlsOutput.textContent = game.controls;
  score = 0;
  scoreOutput.textContent = '0000';
  overlayLabel.textContent = 'READY?';
  startButton.innerHTML = 'START GAME <span>→</span>';
  overlay.style.display = 'flex';
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  drawGame(0);
  startButton.focus();
}

function closeGame() {
  running = false;
  cancelAnimationFrame(animationId);
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  keys = {};
}

function startGame() {
  running = true;
  score = 0;
  scoreOutput.textContent = '0000';
  overlay.style.display = 'none';
  gameState = activeGame === 'chef' ? newChefState() : activeGame === 'drive' ? newDriveState() : newMeteorState();
  lastFrame = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function gameLoop(now) {
  if (!running) return;
  const dt = Math.min((now - lastFrame) / 1000, 0.04);
  lastFrame = now;
  updateGame(dt);
  drawGame(now);
  animationId = requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
  if (activeGame === 'chef') updateChef(dt);
  if (activeGame === 'drive') updateDrive(dt);
  if (activeGame === 'meteor') updateMeteor(dt);
}

function drawGame(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (activeGame === 'chef') drawChef(ctx, canvas.width, canvas.height, gameState, now, true);
  if (activeGame === 'drive') drawDrive(ctx, canvas.width, canvas.height, gameState, now, true);
  if (activeGame === 'meteor') drawMeteor(ctx, canvas.width, canvas.height, gameState, now, true);
}

function newChefState() { return { order: 0, timer: 4, foods: [], spawn: 0, flash: 0 }; }
function updateChef(dt) {
  const s = gameState; s.timer -= dt; s.spawn -= dt; s.flash = Math.max(0, s.flash - dt);
  if (s.spawn <= 0) { s.spawn = .85; s.foods.push({ type: Math.floor(Math.random() * 3), x: 110 + Math.random() * 680, y: 420 + Math.random() * 45, size: 30, drift: Math.random() * 2 }); }
  s.foods.forEach((food) => { food.y -= dt * 38; food.drift += dt; food.x += Math.sin(food.drift) * dt * 10; });
  s.foods = s.foods.filter((food) => food.y > -50);
  if (s.timer <= 0) endGame('KITCHEN CLOSED');
}
function chefClick(x, y) {
  const s = gameState; const hit = s.foods.findIndex((food) => Math.hypot(food.x - x, food.y - y) < 42);
  if (hit > -1) { s.foods.splice(hit, 1); s.order += 1; score += 100; s.timer = Math.min(4.5, s.timer + .7); s.flash = .2; scoreOutput.textContent = String(score).padStart(4, '0'); }
}
function drawChef(c, w, h, s, now, full) {
  c.fillStyle = '#ff9a73'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(17,17,20,.08)';
  for (let x = 0; x < w; x += 32) for (let y = 0; y < h; y += 32) c.fillRect(x + ((y / 32) % 2) * 16, y, 16, 16);
  c.fillStyle = '#c84d38'; c.fillRect(0, h - 105, w, 105); c.fillStyle = '#111114'; c.fillRect(0, h - 105, w, 3);
  c.fillStyle = '#252129'; c.beginPath(); c.ellipse(w / 2, h - 82, 130, 28, -.1, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3f3a42'; c.beginPath(); c.ellipse(w / 2, h - 92, 84, 18, -.1, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffd45a'; c.font = '500 15px DM Mono, monospace'; c.fillText('ORDER ' + String(s?.order || 0).padStart(2, '0'), 28, 42); c.fillText('TIME ' + Math.max(0, s?.timer || 4).toFixed(1), w - 170, 42);
  (s?.foods || []).forEach((food) => { drawFood(c, food.x, food.y, food.type, food.size); });
  if (s?.flash) { c.fillStyle = 'rgba(255,212,90,.25)'; c.fillRect(0, 0, w, h); }
  if (!full) { c.fillStyle = '#ff704a'; c.fillRect(w * .56, h * .55, 5, 5); }
}
function drawFood(c, x, y, type, size) { c.save(); c.translate(x, y); c.fillStyle = type === 0 ? '#ffd45a' : type === 1 ? '#7bd8ed' : '#bd91ff'; c.strokeStyle = '#111114'; c.lineWidth = 5; c.beginPath(); if (type === 0) c.arc(0, 0, size, 0, Math.PI * 2); if (type === 1) { c.moveTo(0, -size); c.lineTo(size, size); c.lineTo(-size, size); c.closePath(); } if (type === 2) { for (let i = 0; i < 8; i++) { const a = (Math.PI * 2 / 8) * i; c.lineTo(Math.cos(a) * size, Math.sin(a) * size); } c.closePath(); } c.fill(); c.stroke(); c.restore(); }

const DRIVE_LANES = [
  { multiplier: 5, label: 'RAINBOW', color: '#ff704a' },
  { multiplier: 2, label: 'RUSH', color: '#7bd8ed' },
  { multiplier: 1, label: 'SAFE', color: '#6cff57' }
];

function driveLaneX(width, lane) { return width * (0.25 + lane * 0.25); }
function chooseDriveLane() {
  const roll = Math.random();
  if (roll < 0.52) return 0;
  if (roll < 0.82) return 1;
  return 2;
}
function newDriveState() {
  return { lane: 1, targetLane: 1, carX: 450, roadOffset: 0, obstacles: [], spawn: .35, speed: 220, time: 0, distance: 0 };
}
function moveDriveLane(direction) {
  if (!gameState || activeGame !== 'drive') return;
  gameState.targetLane = Math.max(0, Math.min(2, gameState.targetLane + direction));
}
function selectDriveLane(x) {
  if (!gameState || activeGame !== 'drive') return;
  gameState.targetLane = Math.max(0, Math.min(2, Math.floor(x / (canvas.width / 3))));
}
function updateDrive(dt) {
  const s = gameState;
  s.time += dt;
  s.roadOffset = (s.roadOffset + s.speed * dt) % 88;
  s.carX += (driveLaneX(canvas.width, s.targetLane) - s.carX) * Math.min(1, dt * 14);
  s.lane = Math.abs(s.carX - driveLaneX(canvas.width, s.targetLane)) < 18 ? s.targetLane : s.lane;
  s.spawn -= dt;
  if (s.spawn <= 0) {
    s.spawn = Math.max(.48, 1.05 - s.time / 75);
    const lane = chooseDriveLane();
    s.obstacles.push({ lane, y: -72, color: lane === 0 ? '#ff9c40' : Math.random() > .5 ? '#bd91ff' : '#7bd8ed', width: lane === 0 ? 36 : 30 });
    if (lane === 0 && Math.random() < .34) s.obstacles.push({ lane: 0, y: -240, color: '#ef3838', width: 34 });
  }
  for (const obstacle of s.obstacles) obstacle.y += s.speed * dt;
  s.obstacles = s.obstacles.filter((obstacle) => obstacle.y < canvas.height + 90);
  for (const obstacle of s.obstacles) {
    const obstacleX = driveLaneX(canvas.width, obstacle.lane);
    if (Math.abs(obstacleX - s.carX) < obstacle.width + 25 && Math.abs(obstacle.y - (canvas.height - 88)) < 74) {
      endGame('CRASHED OUT');
      return;
    }
  }
  s.distance += s.speed * dt;
  score = Math.floor(s.distance * DRIVE_LANES[s.lane].multiplier / 10);
  scoreOutput.textContent = String(score).padStart(4, '0');
}
function drawDrive(c, w, h, s, now, full) {
  const roadLeft = w * .08;
  const roadRight = w * .92;
  const laneWidth = (roadRight - roadLeft) / 3;
  const lane = s?.lane ?? 1;
  c.fillStyle = '#8cdded'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#e9f0c8'; c.fillRect(0, h * .28, w, h * .72);
  const rainbow = c.createLinearGradient(0, h * .28, 0, h);
  rainbow.addColorStop(0, '#ff704a'); rainbow.addColorStop(.22, '#ffd45a'); rainbow.addColorStop(.45, '#6cff57'); rainbow.addColorStop(.68, '#7bd8ed'); rainbow.addColorStop(1, '#bd91ff');
  c.fillStyle = rainbow; c.fillRect(roadLeft, h * .28, laneWidth, h * .72);
  c.fillStyle = '#30333e'; c.fillRect(roadLeft + laneWidth, h * .28, laneWidth, h * .72);
  c.fillStyle = '#294735'; c.fillRect(roadLeft + laneWidth * 2, h * .28, laneWidth, h * .72);
  c.strokeStyle = '#111114'; c.lineWidth = 4; c.strokeRect(roadLeft, h * .28, roadRight - roadLeft, h * .72);
  c.strokeStyle = 'rgba(242,240,233,.72)'; c.lineWidth = 3; c.setLineDash([24, 26]);
  for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(roadLeft + laneWidth * i, h * .28); c.lineTo(roadLeft + laneWidth * i, h); c.stroke(); }
  c.setLineDash([]);
  c.fillStyle = 'rgba(17,17,20,.12)'; c.fillRect(roadLeft, h * .28, roadRight - roadLeft, 4);
  c.fillStyle = '#111114'; c.font = '500 13px Courier New, monospace';
  c.textAlign = 'center';
  DRIVE_LANES.forEach((driveLane, index) => {
    const x = roadLeft + laneWidth * (index + .5);
    c.fillStyle = index === 0 ? '#111114' : driveLane.color;
    c.fillText(driveLane.multiplier + 'X ' + driveLane.label, x, 34);
    if (index === lane) { c.strokeStyle = driveLane.color; c.lineWidth = 5; c.strokeRect(roadLeft + laneWidth * index + 7, h * .31, laneWidth - 14, h * .64); }
  });
  c.textAlign = 'left'; c.fillStyle = '#111114'; c.fillText('SCORE ' + String(score).padStart(4, '0'), 28, 34);
  (s?.obstacles || []).forEach((obstacle) => drawCar(c, driveLaneX(w, obstacle.lane), obstacle.y, obstacle.color, false));
  drawCar(c, s?.carX ?? driveLaneX(w, 1), h - 88, '#ff704a', true);
}
function drawCar(c, x, y, color, player) { c.save(); c.translate(x, y); c.fillStyle = color; c.strokeStyle = '#111114'; c.lineWidth = 4; c.fillRect(-27, -42, 54, 84); c.strokeRect(-27, -42, 54, 84); c.fillStyle = player ? '#7bd8ed' : '#f2f0e9'; c.fillRect(-18, -26, 36, 24); c.strokeRect(-18, -26, 36, 24); c.fillStyle = '#111114'; c.fillRect(-34, -31, 7, 20); c.fillRect(27, -31, 7, 20); c.fillRect(-34, 13, 7, 20); c.fillRect(27, 13, 7, 20); c.restore(); }

function newMeteorState() { return { ship: { x: 450 }, rocks: [], shots: [], spawn: 0, time: 0 }; }
function updateMeteor(dt) { const s = gameState; s.time += dt; if (keys.a || keys.arrowleft) s.ship.x -= 330 * dt; if (keys.d || keys.arrowright) s.ship.x += 330 * dt; s.ship.x = Math.max(35, Math.min(865, s.ship.x)); s.spawn -= dt; if (s.spawn <= 0) { s.spawn = Math.max(.32, .75 - s.time / 80); s.rocks.push({ x: 35 + Math.random() * 830, y: -35, size: 18 + Math.random() * 18, speed: 100 + Math.random() * 70, spin: Math.random() * 6 }); } s.rocks.forEach((rock) => { rock.y += rock.speed * dt; rock.spin += dt; }); s.shots.forEach((shot) => shot.y -= 500 * dt); for (let i = s.shots.length - 1; i >= 0; i--) { const shot = s.shots[i]; let hit = -1; for (let j = 0; j < s.rocks.length; j++) if (Math.hypot(shot.x - s.rocks[j].x, shot.y - s.rocks[j].y) < s.rocks[j].size + 8) { hit = j; break; } if (hit > -1) { s.rocks.splice(hit, 1); s.shots.splice(i, 1); score += 125; scoreOutput.textContent = String(score).padStart(4, '0'); } } s.shots = s.shots.filter((shot) => shot.y > -30); for (const rock of s.rocks) if (rock.y > 550) endGame('SKY OVERRUN'); }
function shootMeteor() { if (gameState.shots && gameState.shots.length < 8) gameState.shots.push({ x: gameState.ship.x, y: 445 }); }
function drawMeteor(c, w, h, s) { c.fillStyle = '#24204f'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2f0e9'; for (let i = 0; i < 45; i++) { const x = (i * 197) % w; const y = (i * 83) % h; c.fillRect(x, y, 2, 2); } c.fillStyle = '#ffd45a'; c.font = '500 15px DM Mono, monospace'; c.fillText('TARGETS ' + String(s?.rocks?.length || 0).padStart(2, '0'), 28, 42); (s?.shots || []).forEach((shot) => { c.fillStyle = '#ffd45a'; c.fillRect(shot.x - 3, shot.y - 13, 6, 22); }); (s?.rocks || []).forEach((rock) => { c.save(); c.translate(rock.x, rock.y); c.rotate(rock.spin); c.fillStyle = '#ff704a'; c.strokeStyle = '#ffd45a'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -rock.size); c.lineTo(rock.size, 0); c.lineTo(0, rock.size); c.lineTo(-rock.size, 0); c.closePath(); c.fill(); c.stroke(); c.restore(); }); c.save(); c.translate(s?.ship?.x || 450, 458); c.fillStyle = '#7bd8ed'; c.strokeStyle = '#111114'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -30); c.lineTo(26, 24); c.lineTo(0, 15); c.lineTo(-26, 24); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ff704a'; c.fillRect(-5, 24, 10, 19); c.restore(); }

function endGame(message) { running = false; cancelAnimationFrame(animationId); overlayLabel.textContent = message; startButton.innerHTML = 'PLAY AGAIN <span>↗</span>'; overlay.style.display = 'flex'; }
function canvasPoint(event) { const box = canvas.getBoundingClientRect(); return { x: (event.clientX - box.left) * canvas.width / box.width, y: (event.clientY - box.top) * canvas.height / box.height }; }

const demoContexts = {
  chef: document.querySelector('#demo-chef').getContext('2d'),
  drive: document.querySelector('#demo-drive').getContext('2d'),
  meteor: document.querySelector('#demo-meteor').getContext('2d')
};
function drawDemos() { const now = performance.now(); drawDemoChef(demoContexts.chef, now); drawDemoDrive(demoContexts.drive, now); drawDemoMeteor(demoContexts.meteor, now); }
function loopDemos(now) {
  if (!modal.classList.contains('is-open') && !document.hidden) {
    drawDemoChef(demoContexts.chef, now); drawDemoDrive(demoContexts.drive, now); drawDemoMeteor(demoContexts.meteor, now);
  }
  requestAnimationFrame(loopDemos);
}
function drawDemoChef(c, now) { const w=c.canvas.width,h=c.canvas.height; drawChef(c,w,h,{order:Math.floor(now/1000)%5,timer:3.4,foods:[{type:Math.floor(now/650)%3,x:160+(now/10)%210,y:145,size:25,drift:now/800},{type:2,x:360-(now/16)%160,y:175,size:22,drift:now/900}]},now,false); }
function drawDemoDrive(c, now) { const w=c.canvas.width,h=c.canvas.height; const obs=[{lane:0,y:(now/4)%350-60,color:'#ff9c40',width:32},{lane:1,y:(now/5+130)%350-60,color:'#bd91ff',width:28},{lane:2,y:(now/6+220)%350-60,color:'#7bd8ed',width:28}]; const lane=Math.floor(now / 1700) % 3; drawDrive(c,w,h,{lane,targetLane:lane,carX:driveLaneX(w,lane),roadOffset:(now/5)%90,obstacles:obs},now,false); }
function drawDemoMeteor(c, now) { const w=c.canvas.width,h=c.canvas.height; const rocks=[...Array(5)].map((_,i)=>({x:(i*113+80+(now/18)%(w-80))%w,y:(i*67+(now/5)%(h+100))-50,size:12+(i%3)*5,spin:now/900+i})); drawMeteor(c,w,h,{ship:{x:w/2+Math.sin(now/700)*130},rocks,shots:[{x:w/2,y:(now/2)%h}]},now,false); }
drawDemos(); requestAnimationFrame(loopDemos);
