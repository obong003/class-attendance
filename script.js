// ─── State ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'classAttendance_students';

let students      = loadStudents();
let deleteTargetId = null;

// ─── DOM refs ───────────────────────────────────────────────────────────────
const inputName      = document.getElementById('inputName');
const inputSurname   = document.getElementById('inputSurname');
const inputReg       = document.getElementById('inputReg');
const btnAdd         = document.getElementById('btnAdd');
const formError      = document.getElementById('formError');

const searchInput    = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');

const studentList    = document.getElementById('studentList');
const totalBadge     = document.getElementById('totalBadge');

const modalOverlay   = document.getElementById('modalOverlay');
const modalMessage   = document.getElementById('modalMessage');
const btnCancel      = document.getElementById('btnCancel');
const btnConfirmDel  = document.getElementById('btnConfirmDelete');

// ─── Persistence ────────────────────────────────────────────────────────────
function loadStudents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveStudents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function initials(name, surname) {
  return (name.charAt(0) + surname.charAt(0)).toUpperCase();
}

function sortedStudents(list) {
  return [...list].sort((a, b) => {
    const sa = (a.surname + a.name).toLowerCase();
    const sb = (b.surname + b.name).toLowerCase();
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
}

function highlight(text, query) {
  if (!query) return escHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex   = new RegExp(`(${escaped})`, 'gi');
  return escHtml(text).replace(regex, '<mark>$1</mark>');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setError(msg) {
  formError.textContent = msg;
}

function clearError() {
  formError.textContent = '';
  [inputName, inputSurname, inputReg].forEach(el => el.classList.remove('input-error'));
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render() {
  const query   = searchInput.value.trim().toLowerCase();
  const sorted  = sortedStudents(students);
  const filtered = query
    ? sorted.filter(s =>
        s.name.toLowerCase().includes(query)    ||
        s.surname.toLowerCase().includes(query) ||
        s.reg.toLowerCase().includes(query)
      )
    : sorted;

  // Update badge
  const count = students.length;
  totalBadge.textContent = count === 1 ? '1 Student' : `${count} Students`;

  // Toggle clear button
  btnClearSearch.classList.toggle('visible', query.length > 0);

  // Build list HTML
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
      <div class="no-results">
        <span>🔍</span>
        No students match "<strong>${escHtml(query)}</strong>"
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
      <button class="btn-delete" data-id="${s.id}" title="Remove student" aria-label="Remove ${escHtml(s.name)} ${escHtml(s.surname)}">
        🗑️
      </button>
    </div>
  `).join('');
}

// ─── Add Student ─────────────────────────────────────────────────────────────
btnAdd.addEventListener('click', () => {
  clearError();

  const name    = inputName.value.trim();
  const surname = inputSurname.value.trim();
  const reg     = inputReg.value.trim();

  // Validation
  let hasError = false;
  if (!name)    { inputName.classList.add('input-error');    hasError = true; }
  if (!surname) { inputSurname.classList.add('input-error'); hasError = true; }
  if (!reg)     { inputReg.classList.add('input-error');     hasError = true; }

  if (hasError) {
    setError('Please fill in all fields before adding.');
    return;
  }

  // Duplicate reg check
  const duplicate = students.find(s => s.reg.toLowerCase() === reg.toLowerCase());
  if (duplicate) {
    inputReg.classList.add('input-error');
    setError(`Reg. No. "${reg}" already exists (${duplicate.name} ${duplicate.surname}).`);
    return;
  }

  students.push({ id: uid(), name, surname, reg });
  saveStudents();
  render();

  // Reset form
  inputName.value    = '';
  inputSurname.value = '';
  inputReg.value     = '';
  inputName.focus();
});

// Allow Enter key to submit from any field
[inputName, inputSurname, inputReg].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnAdd.click();
    if (e.key !== 'Tab')   clearError();
  });
});

// ─── Search ──────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', render);

btnClearSearch.addEventListener('click', () => {
  searchInput.value = '';
  btnClearSearch.classList.remove('visible');
  render();
  searchInput.focus();
});

// ─── Delete (open modal) ─────────────────────────────────────────────────────
studentList.addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;

  const id = btn.dataset.id;
  const student = students.find(s => s.id === id);
  if (!student) return;

  deleteTargetId = id;
  modalMessage.textContent =
    `Remove ${student.name} ${student.surname} (${student.reg}) from the list?`;
  modalOverlay.classList.add('open');
});

// ─── Delete Modal Controls ───────────────────────────────────────────────────
function closeModal() {
  modalOverlay.classList.remove('open');
  deleteTargetId = null;
}

btnCancel.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

btnConfirmDel.addEventListener('click', () => {
  if (!deleteTargetId) return;
  students = students.filter(s => s.id !== deleteTargetId);
  saveStudents();
  render();
  closeModal();
});

// ─── Init ────────────────────────────────────────────────────────────────────
render();

