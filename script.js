/* Memory Master - Game Logic */

const GAME = {
  level: 1,
  lives: 3,
  hints: 3,
  sequence: [],
  selected: [],
  phase: 'memorize', // memorize | recall | result
  levelType: 1, // 1=letters, 2=animals, 3=words, 4=numbers
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ANIMALS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆'];
const WORDS = ['Doctor', 'Life', 'Teacher', 'Orange', 'River', 'Mountain', 'Sunset', 'Bridge', 'Forest', 'Window', 'Mirror', 'Garden', 'Pencil', 'Dragon', 'Silver', 'Puzzle', 'Castle', 'Thunder', 'Shadow', 'Crystal'];
const NUMBERS = [123, 565, 456, 454, 789, 321, 654, 987, 111, 222, 333, 444, 555, 666, 777, 888, 999, 101, 202, 303];

function getLevelType(level) {
  const t = ((level - 1) % 4) + 1;
  return t; // 1,2,3,4 repeating
}

function getCountForLevel(level) {
  const base = 3;
  const cycle = Math.floor((level - 1) / 4);
  const inCycle = ((level - 1) % 4);
  return Math.min(base + cycle * 1 + inCycle, 10);
}

function getLevelLabel(type) {
  const labels = { 1: 'Letters', 2: 'Animals', 3: 'Words', 4: 'Numbers' };
  return labels[type] || 'Letters';
}

function buildSequence(levelType, count) {
  const seq = [];
  if (levelType === 1) {
    const pool = [...LETTERS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) seq.push(pool[i]);
  } else if (levelType === 2) {
    const pool = [...ANIMALS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) seq.push(pool[i]);
  } else if (levelType === 3) {
    const pool = [...WORDS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) seq.push(pool[i]);
  } else {
    const pool = [...NUMBERS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) seq.push(pool[i]);
  }
  return seq;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const levelBadge = document.getElementById('level-badge');
const phaseHint = document.getElementById('phase-hint');
const memorizeTimerEl = document.getElementById('memorize-timer');
const sequenceArea = document.getElementById('sequence-area');
const selectedOrder = document.getElementById('selected-order');
const choicesGrid = document.getElementById('choices-grid');
const livesEl = document.getElementById('lives');
const checkBtn = document.getElementById('check-btn');
const nextBtn = document.getElementById('next-btn');
const hintAction = document.getElementById('hint-action');
const hintBtn = document.getElementById('hint-btn');
const hintsDotsEl = document.getElementById('hints-dots');
const resultMsg = document.getElementById('result-msg');
const playAgainBtn = document.getElementById('play-again-btn');

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function renderLives() {
  livesEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    if (i < GAME.lives) s.classList.add('on');
    livesEl.appendChild(s);
  }
}

function renderHintsDots() {
  hintsDotsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    if (i < GAME.hints) s.classList.add('on');
    hintsDotsEl.appendChild(s);
  }
}

let memorizeTimerId = null;
let hintTimeoutId = null;
let hintIntervalId = null;

function getSequenceItemClass() {
  const type = GAME.levelType;
  return type === 2 ? 'emoji' : type === 3 ? 'word' : type === 4 ? 'number' : '';
}

function renderSequenceInArea() {
  const cls = getSequenceItemClass();
  sequenceArea.innerHTML = '';
  GAME.sequence.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'sequence-item' + (cls ? ' ' + cls : '');
    el.textContent = item;
    sequenceArea.appendChild(el);
  });
}

function updateHintsUI() {
  renderHintsDots();
  hintBtn.disabled = GAME.hints <= 0;
  hintBtn.textContent = GAME.hints > 0 ? '💡 Show sequence again (5s)' : '💡 No hints left';
}

function useHint() {
  if (GAME.phase !== 'recall' || GAME.hints <= 0) return;
  if (hintTimeoutId) return;
  GAME.hints--;
  updateHintsUI();
  phaseHint.textContent = 'Hint: sequence visible for 5 seconds...';
  renderSequenceInArea();
  hintBtn.disabled = true;
  let left = 5;
  memorizeTimerEl.style.display = 'block';
  memorizeTimerEl.classList.add('last');
  memorizeTimerEl.textContent = left + 's';
  function hideHint() {
    if (hintTimeoutId) clearTimeout(hintTimeoutId);
    if (hintIntervalId) clearInterval(hintIntervalId);
    hintIntervalId = null;
    hintTimeoutId = null;
    memorizeTimerEl.style.display = 'none';
    memorizeTimerEl.classList.remove('warning', 'last');
    sequenceArea.innerHTML = '<span style="color: var(--muted);">Recall the order below.</span>';
    phaseHint.textContent = 'Click items in the same order.';
    if (GAME.hints > 0) hintBtn.disabled = false;
  }
  hintIntervalId = setInterval(() => {
    left--;
    memorizeTimerEl.textContent = left > 0 ? left + 's' : '';
    if (left <= 0) hideHint();
  }, 1000);
  hintTimeoutId = setTimeout(hideHint, 5000);
}

function showMemorizePhase() {
  if (hintTimeoutId) { clearTimeout(hintTimeoutId); hintTimeoutId = null; }
  if (hintIntervalId) { clearInterval(hintIntervalId); hintIntervalId = null; }
  GAME.phase = 'memorize';
  phaseHint.textContent = 'Watch the sequence...';
  sequenceArea.innerHTML = '';
  selectedOrder.innerHTML = '';
  choicesGrid.innerHTML = '';
  checkBtn.style.display = 'none';
  nextBtn.style.display = 'none';
  hintAction.style.display = 'none';
  memorizeTimerEl.style.display = 'none';
  if (memorizeTimerId) clearInterval(memorizeTimerId);

  const type = GAME.levelType;
  const cls = type === 2 ? 'emoji' : type === 3 ? 'word' : type === 4 ? 'number' : '';
  GAME.sequence.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'sequence-item' + (cls ? ' ' + cls : '');
    el.textContent = item;
    sequenceArea.appendChild(el);
  });

  const totalMs = 2500 + GAME.sequence.length * 400;
  let remainingMs = totalMs;
  memorizeTimerEl.style.display = 'block';
  memorizeTimerEl.classList.remove('warning', 'last');

  function tick() {
    const sec = Math.ceil(remainingMs / 1000);
    memorizeTimerEl.textContent = sec > 0 ? sec + 's' : '';
    if (sec <= 2) memorizeTimerEl.classList.add('last');
    else if (sec <= 3) memorizeTimerEl.classList.add('warning');
    remainingMs -= 100;
    if (remainingMs <= 0) {
      clearInterval(memorizeTimerId);
      memorizeTimerId = null;
      memorizeTimerEl.style.display = 'none';
      sequenceArea.innerHTML = '<span style="color: var(--muted);">Recall the order below.</span>';
      phaseHint.textContent = 'Click items in the same order.';
      GAME.phase = 'recall';
      GAME.selected = [];
      const choices = shuffle(GAME.sequence);
      choicesGrid.innerHTML = '';
      choices.forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-btn' + (cls ? ' ' + cls : '');
        btn.textContent = item;
        btn.dataset.value = item;
        btn.addEventListener('click', () => onChoiceClick(btn));
        choicesGrid.appendChild(btn);
      });
      checkBtn.style.display = 'inline-block';
      hintAction.style.display = 'block';
      updateHintsUI();
      updateSelectedOrder();
    }
  }

  tick();
  memorizeTimerId = setInterval(tick, 100);
}

function updateSelectedOrder() {
  selectedOrder.innerHTML = '';
  GAME.selected.forEach((v, i) => {
    const s = document.createElement('span');
    s.className = 'seq';
    s.textContent = `${i + 1}. ${v}`;
    selectedOrder.appendChild(s);
  });
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (GAME.selected.includes(btn.dataset.value)) btn.classList.add('selected');
  });
}

function onChoiceClick(btn) {
  if (GAME.phase !== 'recall') return;
  const v = btn.dataset.value;
  if (GAME.selected.includes(v)) {
    GAME.selected = GAME.selected.filter(x => x !== v);
  } else {
    GAME.selected.push(v);
  }
  updateSelectedOrder();
}

function checkAnswer() {
  const correct = GAME.sequence.length === GAME.selected.length &&
    GAME.sequence.every((s, i) => String(s) === String(GAME.selected[i]));
  if (correct) {
    phaseHint.textContent = 'Correct! Well done.';
    phaseHint.style.color = 'var(--success)';
    document.querySelectorAll('.choice-btn').forEach(b => b.classList.add('correct'));
    checkBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
    GAME.phase = 'result';
  } else {
    GAME.lives--;
    renderLives();
    phaseHint.textContent = 'Wrong order. Try again or lose a life.';
    phaseHint.style.color = 'var(--error)';
    GAME.sequence.forEach((s, i) => {
      const btn = [...choicesGrid.querySelectorAll('.choice-btn')].find(b => b.dataset.value === s);
      if (btn) btn.classList.add('correct');
    });
    GAME.selected.forEach((s, i) => {
      if (s !== GAME.sequence[i]) {
        const btn = [...choicesGrid.querySelectorAll('.choice-btn')].find(b => b.dataset.value === s);
        if (btn) btn.classList.add('wrong');
      }
    });
    if (GAME.lives <= 0) {
      setTimeout(() => endGame(false), 1500);
    } else {
      setTimeout(() => {
        GAME.selected = [];
        phaseHint.style.color = '';
        phaseHint.textContent = 'Click items in the same order.';
        document.querySelectorAll('.choice-btn').forEach(b => {
          b.classList.remove('correct', 'wrong');
        });
        updateSelectedOrder();
      }, 2000);
    }
  }
}

function nextLevel() {
  GAME.level++;
  GAME.levelType = getLevelType(GAME.level);
  const count = getCountForLevel(GAME.level);
  GAME.sequence = buildSequence(GAME.levelType, count);
  levelBadge.textContent = `Level ${GAME.level} — ${getLevelLabel(GAME.levelType)}`;
  phaseHint.style.color = '';
  showMemorizePhase();
}

function endGame(won) {
  showScreen('result-screen');
  resultMsg.textContent = won ? `You won! Level ${GAME.level}.` : 'Game Over. You ran out of lives.';
  resultMsg.className = 'result-msg ' + (won ? 'success' : 'fail');
}

function startGame() {
  GAME.level = 1;
  GAME.lives = 3;
  GAME.hints = 3;
  GAME.levelType = 1;
  GAME.sequence = buildSequence(1, getCountForLevel(1));
  levelBadge.textContent = 'Level 1 — Letters';
  renderLives();
  renderHintsDots();
  showScreen('game-screen');
  showMemorizePhase();
}

document.getElementById('start-btn').addEventListener('click', startGame);
checkBtn.addEventListener('click', checkAnswer);
nextBtn.addEventListener('click', nextLevel);
hintBtn.addEventListener('click', useHint);
playAgainBtn.addEventListener('click', () => {
  showScreen('start-screen');
});
