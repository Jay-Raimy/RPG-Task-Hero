// --- 0. ENREGISTREMENT DU SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('Service Worker enregistré !', reg))
    .catch(err => console.error('Erreur Service Worker :', err));
}

// --- 1. CHEMINS VERS TES IMAGES LOCALES (Dossier images/) ---
const AVATAR_IMAGES = [
  'images/avatar_homme.png',
  'images/avatar_femme.png'
];

// --- 2. ÉTAT DU JEU ---
let state = JSON.parse(localStorage.getItem('rpg_todo_state')) || {
  className: 'Novice',
  avatarIndex: 0,
  level: 1,
  xp: 0,
  xpMax: 100,
  gold: 0,
  lastCheckDate: new Date().toDateString(),
  tasks: []
};

// Fonction pour basculer d'avatar (Homme <-> Femme)
function toggleAvatarGender() {
  state.avatarIndex = ((state.avatarIndex || 0) + 1) % AVATAR_IMAGES.length;
  saveState();
}

// --- 3. NOTIFICATIONS & RAPPELS ---

// Vérifie le statut des notifications et ajuste le bouton d'activation
function checkNotificationStatus() {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;

  if (Notification.permission === 'granted') {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'block';
    if (Notification.permission === 'denied') {
      btn.innerText = '⚠️ Notifications bloquées (Cliquer pour régler)';
    } else {
      btn.innerText = '🔔 Activer les notifications';
    }
  }
}

// Demande l'autorisation ou explique comment débloquer en cas de refus
function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("Ce navigateur ne supporte pas les notifications.");
    return;
  }

  if (Notification.permission === 'denied') {
    alert("Les notifications sont actuellement bloquées pour ce site.\n\nPour les réactiver :\n1. Clique sur l'icône de cadenas ou de réglages à côté de l'adresse du site (en haut).\n2. Va dans 'Autorisations' et débloque les 'Notifications'.");
    return;
  }

  Notification.requestPermission().then(permission => {
    checkNotificationStatus();
    if (permission === "granted") {
      alert("Notifications activées avec succès ! ⚔️");
    }
  });
}

// Déclenche l'envoi d'une notification via le Service Worker
function triggerNotification(title, body) {
  if (Notification.permission === 'granted') {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: title,
        body: body
      });
    } else {
      new Notification(title, { body: body });
    }
  }
}

// Réinitialisation automatique des quêtes quotidiennes
function checkDailyReset() {
  const today = new Date().toDateString();
  if (state.lastCheckDate !== today) {
    state.lastCheckDate = today;
    state.tasks.forEach(task => {
      if (task.isDaily) {
        task.completedToday = false;
        task.notifiedToday = false;
      }
    });
    saveState();
  }
}

// Vérification continue de l'heure des quêtes
function checkTaskNotifications() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const currentHour = String(now.getHours()).padStart(2, '0');
  const currentMinute = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMinute}`;

  let stateChanged = false;

  state.tasks.forEach(task => {
    if (task.time && !task.completedToday && !task.notifiedToday) {
      const taskTimePart = task.time.split('T')[1];

      if (taskTimePart === currentTimeStr) {
        triggerNotification(
          `⚔️ Quête : ${task.text}`,
          task.note ? `📝 ${task.note}` : "C'est l'heure d'accomplir cette quête !"
        );
        
        task.notifiedToday = true;
        stateChanged = true;
      }
    }
  });

  if (stateChanged) saveState();
}

// --- 4. RÉCOMPENSES & GESTION DES TÂCHES ---
function saveState() {
  localStorage.setItem('rpg_todo_state', JSON.stringify(state));
  render();
}

function getRandomReward() {
  const isCritical = Math.random() < 0.10; // 10% de chance de coup critique

  let xpGained = Math.floor(Math.random() * 16); // 0 à 15 XP
  let goldGained = Math.floor(Math.random() * 6);  // 0 à 5 Or

  if (isCritical) {
    xpGained = Math.max(10, xpGained * 2);
    goldGained = Math.max(5, goldGained * 2);
  }

  return { xpGained, goldGained, isCritical };
}

function completeTask(index) {
  const task = state.tasks[index];
  const reward = getRandomReward();

  state.xp += reward.xpGained;
  state.gold += reward.goldGained;

  let levelUp = false;
  if (state.xp >= state.xpMax) {
    state.level += 1;
    state.xp -= state.xpMax;
    state.xpMax = Math.floor(state.xpMax * 1.4);
    levelUp = true;
  }

  showPopup(`
    ${reward.isCritical ? '🔥 <strong>COUP CRITIQUE !</strong><br>' : ''}
    +${reward.xpGained} XP | +${reward.goldGained} 🪙 Or
    ${levelUp ? '<br>🎉 <strong>NIVEAU SUPÉRIEUR !</strong>' : ''}
  `);

  if (task.isDaily) {
    task.completedToday = true;
  } else {
    state.tasks.splice(index, 1);
  }

  saveState();

  if (state.level >= 2 && state.className === 'Novice') {
    document.getElementById('class-modal').style.display = 'flex';
  }
}

function selectClass(className, icon) {
  state.className = className;
  document.getElementById('class-modal').style.display = 'none';
  saveState();
}

function addTask() {
  const input = document.getElementById('task-input');
  const noteInput = document.getElementById('task-note');
  const timeInput = document.getElementById('task-time');
  const isDailyInput = document.getElementById('task-is-daily');
  
  if (!input.value.trim()) return;

  state.tasks.push({
    id: Date.now(),
    text: input.value.trim(),
    note: noteInput.value.trim() || null,
    time: timeInput.value || null,
    isDaily: isDailyInput.checked,
    completedToday: false,
    notifiedToday: false
  });

  input.value = '';
  noteInput.value = '';
  timeInput.value = '';
  isDailyInput.checked = false;

  saveState();
}

function deleteTask(index) {
  state.tasks.splice(index, 1);
  saveState();
}

function showPopup(text) {
  const popup = document.getElementById('popup');
  popup.innerHTML = text;
  popup.style.display = 'block';
  setTimeout(() => { popup.style.display = 'none'; }, 2200);
}

// --- 5. RENDU ET MISE À JOUR DE L'INTERFACE
