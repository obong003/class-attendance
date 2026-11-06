// ─── State ──────────────────────────────────────────────────────────────────
const STORAGE_KEY_STUDENTS = 'classAttendance_students';
const STORAGE_KEY_SESSIONS = 'classAttendance_sessions';

let students = loadStudents();
let sessions = loadSessions();

let activeSessionId = null;
let deleteTarget = null; // { type: 'student' | 'session', id: string }

// ─── DOM refs ───────────────────────────────────────────────────────────────
const tabs = document.querySelectorAll('.tab');
const views = {
  students: document.getElementById('view-students'),
  sessions: document.getElementById('view-sessions'),
  mark: document.getElementById('view-mark')
};

// Students refs
const inputName = document.getElementById('inputName');
const inputSurname = document.getElementById('inputSurname');
const inputReg = document.getElementById('inputReg');
const btnAdd = document.getElementById('btnAdd');
const formError = document.getElementById('formError');
const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const studentList = document.getElementById('studentList');
const totalBadge = document.getElementById('totalBadge');

// Sessions refs
const inputSessionDate = document.getElementById('inputSessionDate');
const inputSessionTitle = document.getElementById('inputSessionTitle');
const btnAddSession = document.getElementById('btnAddSession');
const sessionError = document.getElementById('sessionError');
const sessionList = document.getElementById('sessionList');

// Mark Attendance refs
const btnBackToSessions = document.getElementById('btnBackToSessions');
const markSessionTitle = document.getElementById('markSessionTitle');
const markSessionDate = document.getElementById('markSessionDate');
const markStatsBar = document.getElementById('markStatsBar');
const markList = document.getElementById('markList');

// Modal refs
const modalOverlay = document.getElementById('modalOverlay');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const btnCancel = document.getElementById('btnCancel');
const btnConfirmDel = document.getElementById('btnConfirmDelete');

// ─── Persistence ────────────────────────────────────────────────────────────
function loadStudents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
  } catch {
    return [];
  }
}

function saveStudents() {
  localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS)) || [];
  } catch {
    return [];
  }
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function initials(name, surname) {
  return ((name ? name.charAt(0) : '') + (surname ? surname.charAt(0) : '')).toUpperCase() || 'ST';
}

function sortedStudents(list) {
  return [...list].sort((a, b) => {
    const sa = (a.surname + ' ' + a.name).toLowerCase();
    const sb = (b.surname + ' ' + b.name).toLowerCase();
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
}

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(text, query) {
  if (!query) return escHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return escHtml(text).replace(regex, '<mark>$1</mark>');
}

// ─── View Switching ──────────────────────────────────────────────────────────
function switchView(viewName) {
  Object.keys(views).forEach(v => {
    views[v].classList.toggle('active', v === viewName);
  });

  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });

  if (viewName === 'students') renderStudents();
  if (viewName === 'sessions') renderSessions();
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    switchView(tab.dataset.view);
  });
});

btnBackToSessions.addEventListener('click', () => {
  switchView('sessions');
});

// ─── Student Operations ─────────────────────────────────────────────────────
function renderStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const sorted = sortedStudents(students);
  const filtered = query
    ? sorted.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.surname.toLowerCase().includes(query) ||
        s.reg.toLowerCase().includes(query)
      )
    : sorted;

  const count = students.length;
  totalBadge.textContent = count === 1 ? '1 Student' : `${count} Students`;

  btnClearSearch.classList.toggle('visible', query.length > 0);

  if (students.length === 0) {
    studentList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎓</div>
        <h3>No students yet!</h3>
        <p>Use the form above to add your first student.<br>They'll appear here in alphabetical order.</p>
      </div>`;
    return;
  }

  if (filtered.length === 0) {
    studentList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No matching students</h3>
        <p>No students match "<strong>${escHtml(query)}</strong>"</p>
      </div>`;
    return;
  }

  studentList.innerHTML = filtered.map(s => `
    <div class="student-item" data-id="${s.id}">
      <div class="avatar">${initials(s.name, s.surname)}</div>
      <div class="student-info">
        <div class="student-name">
          ${highlight(s.surname, query)}, ${highlight(s.name, query)}
        </div>
        <div class="student-reg">${highlight(s.reg, query)}</div>
      </div>
      <button class="btn-delete" data-type="student" data-id="${s.id}" title="Remove student" aria-label="Remove student">
        🗑️
      </button>
    </div>
  `).join('');
}

btnAdd.addEventListener('click', () => {
  formError.textContent = '';
  [inputName, inputSurname, inputReg].forEach(el => el.classList.remove('input-error'));

  const name = inputName.value.trim();
  const surname = inputSurname.value.trim();
  const reg = inputReg.value.trim();

  let hasError = false;
  if (!name) { inputName.classList.add('input-error'); hasError = true; }
  if (!surname) { inputSurname.classList.add('input-error'); hasError = true; }
  if (!reg) { inputReg.classList.add('input-error'); hasError = true; }

  if (hasError) {
    formError.textContent = 'Please fill in all fields before adding.';
    return;
  }

  const duplicate = students.find(s => s.reg.toLowerCase() === reg.toLowerCase());
  if (duplicate) {
    inputReg.classList.add('input-error');
    formError.textContent = `Reg. No. "${reg}" already exists (${duplicate.name} ${duplicate.surname}).`;
    return;
  }

  students.push({ id: uid(), name, surname, reg });
  saveStudents();
  renderStudents();

  inputName.value = '';
  inputSurname.value = '';
  inputReg.value = '';
  inputName.focus();
});

[inputName, inputSurname, inputReg].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnAdd.click();
    if (e.key !== 'Tab') {
      formError.textContent = '';
      el.classList.remove('input-error');
    }
  });
});

searchInput.addEventListener('input', renderStudents);
btnClearSearch.addEventListener('click', () => {
  searchInput.value = '';
  btnClearSearch.classList.remove('visible');
  renderStudents();
  searchInput.focus();
});

// ─── Session Operations ─────────────────────────────────────────────────────
function renderSessions() {
  if (sessions.length === 0) {
    sessionList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No sessions created yet!</h3>
        <p>Pick a date and create your first attendance session above.</p>
      </div>`;
    return;
  }

  // Sort sessions by date descending
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

  sessionList.innerHTML = sorted.map(sess => {
    const records = sess.attendance || {};
    const totalMarked = Object.keys(records).length;
    const presentCount = Object.values(records).filter(v => v === 'present').length;
    
    return `
      <div class="session-item" data-id="${sess.id}">
        <div class="avatar" style="background: linear-gradient(135deg, #10b981, #059669);">📅</div>
        <div class="session-info">
          <div class="session-title">
            ${escHtml(sess.title || 'Attendance Session')}
            <span class="session-badge">${sess.date}</span>
          </div>
          <div class="session-meta">
            ${totalMarked} / ${students.length} students marked (${presentCount} present)
          </div>
        </div>
        <div class="session-actions">
          <button class="btn-action-sm btn-open-mark" data-id="${sess.id}">
            Take Attendance
          </button>
          <button class="btn-delete" data-type="session" data-id="${sess.id}" title="Remove session">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

btnAddSession.addEventListener('click', () => {
  sessionError.textContent = '';
  inputSessionDate.classList.remove('input-error');

  const date = inputSessionDate.value;
  const title = inputSessionTitle.value.trim();

  if (!date) {
    inputSessionDate.classList.add('input-error');
    sessionError.textContent = 'Please choose a date for the session.';
    return;
  }

  const newSession = {
    id: uid(),
    date,
    title: title || `Session - ${date}`,
    attendance: {} // studentId -> 'present' | 'absent' | 'late'
  };

  sessions.unshift(newSession);
  saveSessions();
  renderSessions();

  inputSessionTitle.value = '';
  // Keep date or clear it:
  // inputSessionDate.value = '';
});

// Open Mark Attendance View
sessionList.addEventListener('click', e => {
  const openBtn = e.target.closest('.btn-open-mark');
  if (openBtn) {
    const id = openBtn.dataset.id;
    openMarkView(id);
    return;
  }

  const delBtn = e.target.closest('.btn-delete');
  if (delBtn) {
    const id = delBtn.dataset.id;
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    deleteTarget = { type: 'session', id };
    modalIcon.textContent = '📅';
    modalTitle.textContent = 'Delete Session?';
    modalMessage.textContent = `Are you sure you want to remove the session "${session.title}" (${session.date})?`;
    modalOverlay.classList.add('open');
  }
});

function openMarkView(sessionId) {
  activeSessionId = sessionId;
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  markSessionTitle.textContent = session.title || 'Attendance Session';
  markSessionDate.textContent = `📅 ${session.date}`;

  renderMarkList();
  switchView('mark');
}

function renderMarkList() {
  const session = sessions.find(s => s.id === activeSessionId);
  if (!session) return;

  const records = session.attendance || {};
  const sorted = sortedStudents(students);

  // Compute stats
  let present = 0, absent = 0, late = 0, unmarked = 0;
  students.forEach(s => {
    const status = records[s.id];
    if (status === 'present') present++;
    else if (status === 'absent') absent++;
    else if (status === 'late') late++;
    else unmarked++;
  });

  markStatsBar.innerHTML = `
    <div class="mark-stats-summary">
      <span class="stat-tag stat-present">✓ Present: ${present}</span>
      <span class="stat-tag stat-absent">✗ Absent: ${absent}</span>
      <span class="stat-tag stat-late">⏱ Late: ${late}</span>
      <span class="stat-tag stat-unmarked">○ Unmarked: ${unmarked}</span>
    </div>
  `;

  if (students.length === 0) {
    markList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No students registered!</h3>
        <p>Go to the Students tab to add students before marking attendance.</p>
      </div>`;
    return;
  }

  markList.innerHTML = sorted.map(s => {
    const status = records[s.id] || '';
    return `
      <div class="student-item" data-id="${s.id}">
        <div class="avatar">${initials(s.name, s.surname)}</div>
        <div class="student-info">
          <div class="student-name">${escHtml(s.surname)}, ${escHtml(s.name)}</div>
          <div class="student-reg">${escHtml(s.reg)}</div>
        </div>
        <div class="attendance-options">
          <button class="btn-status ${status === 'present' ? 'selected-present' : ''}" 
                  data-student-id="${s.id}" data-status="present">
            ✓ Present
          </button>
          <button class="btn-status ${status === 'absent' ? 'selected-absent' : ''}" 
                  data-student-id="${s.id}" data-status="absent">
            ✗ Absent
          </button>
          <button class="btn-status ${status === 'late' ? 'selected-late' : ''}" 
                  data-student-id="${s.id}" data-status="late">
            ⏱ Late
          </button>
        </div>
      </div>
    `;
  }).join('');
}

markList.addEventListener('click', e => {
  const btn = e.target.closest('.btn-status');
  if (!btn) return;

  const studentId = btn.dataset.studentId;
  const status = btn.dataset.status;
  const session = sessions.find(s => s.id === activeSessionId);
  if (!session) return;

  if (!session.attendance) session.attendance = {};

  // If already clicked, toggle off (unmarked)
  if (session.attendance[studentId] === status) {
    delete session.attendance[studentId];
  } else {
    session.attendance[studentId] = status;
  }

  saveSessions();
  renderMarkList();
});

// ─── Delete Modal Handlers ───────────────────────────────────────────────────
studentList.addEventListener('click', e => {
  const delBtn = e.target.closest('.btn-delete');
  if (!delBtn) return;

  const id = delBtn.dataset.id;
  const student = students.find(s => s.id === id);
  if (!student) return;

  deleteTarget = { type: 'student', id };
  modalIcon.textContent = '🗑️';
  modalTitle.textContent = 'Remove Student?';
  modalMessage.textContent = `Are you sure you want to remove ${student.name} ${student.surname} (${student.reg})?`;
  modalOverlay.classList.add('open');
});

function closeModal() {
  modalOverlay.classList.remove('open');
  deleteTarget = null;
}

btnCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

btnConfirmDel.addEventListener('click', () => {
  if (!deleteTarget) return;

  if (deleteTarget.type === 'student') {
    students = students.filter(s => s.id !== deleteTarget.id);
    saveStudents();
    renderStudents();
  } else if (deleteTarget.type === 'session') {
    sessions = sessions.filter(s => s.id !== deleteTarget.id);
    saveSessions();
    renderSessions();
  }

  closeModal();
});

// ─── Initialization ──────────────────────────────────────────────────────────
// Set today's date as default in session date picker
const today = new Date().toISOString().split('T')[0];
if (inputSessionDate) inputSessionDate.value = today;

renderStudents();
