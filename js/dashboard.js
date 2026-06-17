/* ═══════════════════════════════════════════════════════
   GROVE DASHBOARD — Modular Workspace System
   ═══════════════════════════════════════════════════════ */

/* ──── STATE ──── */
function defaultState() {
  return {
    boards: [],
    activeBoardId: null,
    showStats: false,
    showTemplates: false,
    darkMode: false,
    theme: 'default',
  };
}

function applyTheme(theme) {
  if (theme && theme !== 'default') {
    document.documentElement.setAttribute('data-theme-variant', theme);
  } else {
    document.documentElement.removeAttribute('data-theme-variant');
  }
  state.theme = theme || 'default';
  saveState();
  // Update theme picker UI
  document.querySelectorAll('#themePicker .theme-option').forEach(function (opt) {
    opt.classList.toggle('active', opt.dataset.theme === state.theme);
  });
}

function applyDarkMode() {
  if (state.darkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  var toggleEl = document.getElementById('darkModeToggle');
  if (toggleEl) toggleEl.classList.toggle('active', state.darkMode);
}
let state = defaultState();

function loadState() {
  try {
    var saved = localStorage.getItem('grove_workspace');
    if (saved) { state = JSON.parse(saved); }
  } catch (_) {}
}
function saveState() {
  try { localStorage.setItem('grove_workspace', JSON.stringify(state)); } catch (_) {}
}

/* ──── UTILITY ──── */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function escUrl(s) { return (s || '').replace(/javascript:/gi,'').replace(/data:/gi,'').replace(/vbscript:/gi,''); }
function decodeEntities(s) { return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&amp;/g,'&'); }
function isValidHexColor(c) { return /^#[0-9a-fA-F]{6}$/.test(c); }
function fmtTime(sec) {
  var m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function fmtTimeFull(sec) {
  var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function fmtHours(sec) {
  var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? h+'h '+m+'m' : m+'m';
}
function dateKey(d) {
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function monthDays(y, m) { return new Date(y, m + 1, 0).getDate(); }
function monthStart(y, m) { return new Date(y, m, 1).getDay(); }

/* ──── NOTIFY ──── */
var toastTimer = null;
function notify(msg) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2000);
}

/* ──── CONFIRM MODAL ──── */
function showConfirm(msg, onConfirm) {
  var overlay = document.getElementById('confirmModal');
  var msgEl = document.getElementById('confirmMessage');
  var okBtn = document.getElementById('confirmOk');
  var cancelBtn = document.getElementById('confirmCancel');
  if (!overlay || !msgEl || !okBtn || !cancelBtn) return;
  msgEl.textContent = msg;
  overlay.classList.add('open');
  okBtn.onclick = function () { overlay.classList.remove('open'); if (onConfirm) onConfirm(); };
  cancelBtn.onclick = function () { overlay.classList.remove('open'); };
  overlay.onclick = function (e) { if (e.target === this) overlay.classList.remove('open'); };
}

/* ──── HELPERS: BOARD / WIDGET ──── */
function getActiveBoard() {
  return state.boards.find(function (b) { return b.id === state.activeBoardId; }) || null;
}
function getBoard(id) { return state.boards.find(function (b) { return b.id === id; }); }

function widgetDefaults(type) {
  switch (type) {
    case 'todo':     return { items: [] };
    case 'pomodoro': return { timeLeft: 25*60, mode:'focus', running:false, paused:false, focusDuration:25*60, breakDuration:5*60, sessionsCompleted:0, totalFocusSeconds:0 };
    case 'notes':    return { content: '' };
    case 'text':     return { content: '' };
    case 'calendar': return { year: new Date().getFullYear(), month: new Date().getMonth(), events: {} };
    case 'habits':   return { habits: [], log: {} };
    case 'links':    return { links: [] };
    case 'resources': return { categories: [] };
    case 'focus-timer': return { running: false, elapsed: 0, startTime: null, totalFocusSeconds: 0 };
    case 'daily-goals': return { goals: [] };
    case 'progress-tracker': return { items: [] };
    case 'image':    return { src: '', name: '' };
    default:         return {};
  }
}

function widgetIcon(type) {
  var icons = {
    todo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    pomodoro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    habits: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    links: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    'focus-timer': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>',
    resources: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    'daily-goals': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4m0 12v4M4 7l2 2m12 0l2-2M4 17l2-2m12 2l2 2"/><circle cx="12" cy="12" r="7"/></svg>',
    'progress-tracker': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  };
  return icons[type] || '';
}

function widgetLabel(type) {
  return { todo:'Task Board', pomodoro:'Pomodoro', notes:'Notes', text:'Text', calendar:'Calendar', habits:'Habits', links:'Links', 'focus-timer':'Focus Timer', resources:'Resources', 'daily-goals':'Daily Goals', 'progress-tracker':'Progress', image:'Image' }[type] || type;
}

/* ──── RENDER: SIDEBAR ──── */
function renderSidebar() {
  var list = document.getElementById('boardList');
  if (!list) return;
  var html = '';
  var iconMap = { default:'📋', star:'⭐', heart:'❤️', rocket:'🚀', bulb:'💡', target:'🎯', book:'✨', code:'💻', palette:'🎨', music:'🎵', trophy:'🏆', globe:'🪴' };
  state.boards.forEach(function (b) {
    var active = b.id === state.activeBoardId && !state.showStats ? ' active' : '';
    var color = b.color || '#3b8c5a';
    var icon = iconMap[b.icon] || iconMap['default'];
    html += '<div class="sidebar-item'+active+'" data-id="'+b.id+'" data-color="'+color+'" style="--item-color:'+color+'">' +
      '<span class="board-icon">'+icon+'</span>' +
      '<span class="board-name">'+esc(b.name)+'</span></div>';
  });
  list.innerHTML = html;

  // highlight stats + templates
  var statsLink = document.querySelector('.sidebar-nav a[data-view="stats"]');
  if (statsLink) statsLink.classList.toggle('active', state.showStats);
  var templatesLink = document.querySelector('.sidebar-nav a[data-view="templates"]');
  if (templatesLink) templatesLink.classList.toggle('active', state.showTemplates);
}

/* ──── RENDER: BOARD ──── */
function renderBoard() {
  var board = getActiveBoard();
  var container = document.getElementById('widgetGrid');
  var title = document.getElementById('boardTitle');
  var empty = document.getElementById('boardEmpty');

  if (!board) {
    if (title) title.textContent = 'No board selected';
    if (container) container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    if (document.getElementById('addWidgetBtn')) document.getElementById('addWidgetBtn').style.display = 'none';
    return;
  }

  if (title) {
    if (title.tagName !== 'INPUT') {
      title.outerHTML = '<input class="board-title-edit" id="boardTitle" value="'+esc(board.name)+'" />';
    } else {
      title.value = board.name;
    }
  }
  if (empty) empty.style.display = 'none';
  var addBtn = document.getElementById('addWidgetBtn');
  if (addBtn) addBtn.style.display = 'inline-flex';

  if (!container) return;
  if (board.widgets.length === 0) {
    container.innerHTML =
      '<div class="board-empty" style="grid-column:1/-1;padding:60px 40px;">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;opacity:0.2;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>' +
      '<h3>Your workspace is empty</h3>' +
      '<p>Add a widget to get started</p></div>';
    return;
  }

  // Migrate old todo widgets from small → medium
  board.widgets.forEach(function (w) {
    if (w.type === 'todo' && w.size === 'small') { w.size = 'medium'; }
  });
  container.innerHTML = board.widgets.map(function (w) {
    return renderWidget(w);
  }).join('');
}

function renderWidget(w) {
  var validSizes = w.type === 'todo' ? ['medium', 'large'] : ['small', 'medium', 'large'];
  var size = validSizes.indexOf(w.size) !== -1 ? w.size : validSizes[0];
  if (w.size !== size) { w.size = size; }
  var icon = widgetIcon(w.type);
  var label = widgetLabel(w.type);
  var body = renderWidgetBody(w);
  var extraBtns = '';
  if (w.type === 'pomodoro') {
    extraBtns += '<button class="pomo-settings-btn" data-id="'+w.id+'" title="Pomodoro Settings">&#9881;</button>';
  }
  var board = getActiveBoard();
  var color = w.color || (board ? board.color : null);
  var colorAttr = color ? ' data-color="'+color+'" style="--widget-color:'+color+';"' : '';
  return (
    '<div class="widget" data-id="'+w.id+'" data-size="'+size+'" draggable="true"'+colorAttr+'>' +
      '<div class="widget-header">' +
        '<div class="widget-header-left">' + icon + '<span>' + label + '</span></div>' +
        '<div class="widget-header-actions">' +
          '<button class="widget-color-btn" data-id="'+w.id+'" title="Widget Color">&#9679;</button>' +
          extraBtns +
          '<button class="resize-btn" data-id="'+w.id+'" title="Resize">&#8645;</button>' +
          '<button class="danger remove-btn" data-id="'+w.id+'" title="Remove">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="widget-body">' + body + '</div>' +
    '</div>'
  );
}

/* ──── RENDER: WIDGET BODY ──── */
function renderWidgetBody(w) {
  switch (w.type) {
    case 'todo':     return renderTodo(w);
    case 'pomodoro': return renderPomodoro(w);
    case 'notes':    return renderNotes(w);
    case 'text':     return renderText(w);
    case 'calendar': return renderCalendar(w);
    case 'habits':   return renderHabits(w);
    case 'links':    return renderLinks(w);
    case 'resources': return renderResources(w);
    case 'focus-timer': return renderFocusTimer(w);
    case 'daily-goals': return renderDailyGoals(w);
    case 'progress-tracker': return renderProgressTracker(w);
    case 'image':    return renderImage(w);
    default: return '<p style="color:var(--text-tertiary);font-size:13px;">Unknown widget</p>';
  }
}

/* ── TASK BOARD / KANBAN ── */
var KANBAN_COLS = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed' };
var COL_ICONS = { not_started: '\u25CB', in_progress: '\u25D0', completed: '\u2713' };
function normStatus(item) {
  var s = item.status || (item.done ? 'completed' : 'not_started');
  if (s === 'todo') return 'not_started';
  if (s === 'done') return 'completed';
  return s;
}
function renderTodo(w) {
  var items = w.data.items || [];
  var cols = '';
  for (var key in KANBAN_COLS) {
    var colItems = items.filter(function (it) {
      return normStatus(it) === key;
    });
    var cards = colItems.map(function (it) {
      var status = normStatus(it);
      var priority = it.priority || 'medium';
      var priorityBadge = '<span class="priority-badge '+priority+'">'+priority+'</span>';
      return '<div class="kanban-card" draggable="true" data-widget="'+w.id+'" data-item="'+it.id+'" data-status="'+status+'">' +
        priorityBadge +
        '<span class="kanban-card-text">'+esc(it.text)+'</span>' +
        '<button class="kanban-card-delete" data-widget="'+w.id+'" data-item="'+it.id+'">&times;</button>' +
        '</div>';
    }).join('');
    cols += '<div class="kanban-col" data-col="'+key+'" data-widget="'+w.id+'">' +
      '<div class="kanban-col-header">' +
        '<span class="col-icon">'+COL_ICONS[key]+'</span>' +
        '<span>'+KANBAN_COLS[key]+'</span>' +
        '<span class="kanban-col-count">'+colItems.length+'</span>' +
      '</div>' +
      '<div class="kanban-col-body">'+cards+'</div>' +
      '</div>';
  }
  return '<div class="kanban-board" data-widget="'+w.id+'">' + cols +
    '<div class="kanban-add">' +
      '<input placeholder="New task..." data-widget="'+w.id+'" />' +
      '<select class="priority-select" data-widget="'+w.id+'"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select>' +
      '<button class="btn btn-ghost btn-sm kanban-add-btn" data-widget="'+w.id+'">Add</button>' +
    '</div></div>';
}

/* ── POMODORO ── */
function renderPomodoro(w) {
  var d = w.data;
  var playDisplay = (d.running && !d.paused) ? 'style="display:none"' : '';
  var pauseDisplay = (d.running && !d.paused) ? '' : 'style="display:none"';
  return '<div class="pomodoro-widget">' +
    '<div class="pomodoro-time" id="pomo-time-'+w.id+'">'+fmtTime(d.timeLeft)+'</div>' +
    '<div class="pomodoro-label">'+(d.mode==='focus'?'Focus':'Break')+'</div>' +
    '<div class="pomodoro-actions">' +
      '<button class="secondary pomo-btn" data-widget="'+w.id+'" data-action="reset" title="Reset">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>' +
      '</button>' +
      '<button class="play-btn pomo-btn" data-widget="'+w.id+'" data-action="start" '+playDisplay+'>' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
      '</button>' +
      '<button class="pause-btn pomo-btn" data-widget="'+w.id+'" data-action="pause" '+pauseDisplay+'>' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="pomodoro-stats">'+d.sessionsCompleted+' sessions &middot; '+fmtHours(d.totalFocusSeconds)+'</div>' +
    '</div>';
}

/* ── FOCUS TIMER ── */
function renderFocusTimer(w) {
  var d = w.data;
  var display = fmtTimeFull(d.elapsed || 0);
  return '<div class="focus-timer-widget">' +
    '<div class="focus-timer-display" id="ft-display-'+w.id+'">'+display+'</div>' +
    '<div class="focus-timer-label">'+(d.running ? 'Running\u2026' : 'Stopped')+'</div>' +
    '<div class="focus-timer-actions">' +
      (!d.running
        ? '<button class="ft-btn" data-widget="'+w.id+'" data-action="start" style="width:44px;height:44px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--green);color:#fff;">'+
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>'
        : '<button class="ft-btn" data-widget="'+w.id+'" data-action="stop" style="width:44px;height:44px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--red);color:#fff;">'+
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>'
      ) +
      '<button class="ft-btn secondary" data-widget="'+w.id+'" data-action="reset" style="width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--bg);color:var(--text-secondary);">'+
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>' +
    '</div>' +
    '<div class="focus-timer-stats">Total: '+fmtHours(d.totalFocusSeconds)+'</div>' +
    '</div>';
}

/* ── NOTES ── */
function renderNotes(w) {
  return '<textarea class="notes-textarea" data-widget="'+w.id+'" placeholder="Write something...">'+esc(w.data.content)+'</textarea>';
}

/* ── TEXT ── */
function renderText(w) {
  return '<div class="text-widget">' +
    '<div class="text-widget-content" contenteditable="true" data-widget="'+w.id+'">'+esc(w.data.content)+'</div>' +
    '</div>';
}

/* ── CALENDAR ── */
function renderCalendar(w) {
  var y = w.data.year, m = w.data.month;
  var names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var todayDate = new Date();
  var daysInMonth = monthDays(y, m);
  var startDay = monthStart(y, m);
  var prevDays = monthDays(y, m - 1 < 0 ? y - 1 : y, m - 1 < 0 ? 11 : m - 1);
  var cells = '';
  var events = w.data.events || {};

  for (var i = startDay - 1; i >= 0; i--) {
    var pd = prevDays - i;
    var pkey = y+'-'+String(m < 1 ? 12 : m).padStart(2,'0')+'-'+String(pd).padStart(2,'0');
    if (m < 1) pkey = (y-1)+'-12-'+String(pd).padStart(2,'0');
    var hasEv = events[pkey] && events[pkey].length > 0;
    cells += '<div class="calendar-day other-month'+(hasEv?' has-event':'')+'" data-date="'+pkey+'">'+pd+'</div>';
  }
  for (var d = 1; d <= daysInMonth; d++) {
    var cls = 'calendar-day';
    if (y === todayDate.getFullYear() && m === todayDate.getMonth() && d === todayDate.getDate()) cls += ' today';
    var key = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    if (events[key] && events[key].length > 0) cls += ' has-event';
    cells += '<div class="'+cls+'" data-date="'+key+'" data-widget="'+w.id+'">'+d+'</div>';
  }
  var totalCells = startDay + daysInMonth;
  var remaining = (7 - (totalCells % 7)) % 7;
  for (var r = 1; r <= remaining; r++) {
    var nkey = y+'-'+String(m+2 > 12 ? 1 : m+2).padStart(2,'0')+'-'+String(r).padStart(2,'0');
    if (m+2 > 12) nkey = (y+1)+'-01-'+String(r).padStart(2,'0');
    var hasEv2 = events[nkey] && events[nkey].length > 0;
    cells += '<div class="calendar-day other-month'+(hasEv2?' has-event':'')+'" data-date="'+nkey+'">'+r+'</div>';
  }

  var monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return '<div class="calendar-widget">' +
    '<div class="calendar-header">' +
      '<span>'+monthName[m]+' '+y+'</span>' +
      '<div class="calendar-nav">' +
        '<button class="cal-nav" data-widget="'+w.id+'" data-dir="-1">&#8249;</button>' +
        '<button class="cal-nav" data-widget="'+w.id+'" data-dir="1">&#8250;</button>' +
      '</div>' +
    '</div>' +
    '<div class="calendar-weekdays">'+names.map(function(n){return'<span>'+n+'</span>';}).join('')+'</div>' +
    '<div class="calendar-days">'+cells+'</div>' +
    '</div>';
}

/* ── HABITS ── */
function renderHabits(w) {
  var d = w.data;
  var habits = (d.habits || []).map(function (h) {
    var done = d.log && d.log[h.id] && d.log[h.id][dateKey(new Date())] ? ' done' : '';
    var nameCls = done ? ' done' : '';
    return '<div class="habit-item">' +
      '<div class="habit-check'+done+'" data-widget="'+w.id+'" data-habit="'+h.id+'"></div>' +
      '<span class="habit-name'+nameCls+'">'+esc(h.name)+'</span>' +
      '<button class="habit-delete" data-widget="'+w.id+'" data-habit="'+h.id+'">&times;</button>' +
    '</div>';
  }).join('');
  return '<div class="habits-list">' + habits +
    '<div class="habit-add"><input placeholder="New habit..." data-widget="'+w.id+'" /><button class="btn btn-ghost btn-sm habit-add-btn" data-widget="'+w.id+'">Add</button></div>' +
    '</div>';
}

/* ── LINKS ── */
function renderLinks(w) {
  var items = (w.data.links || []).map(function (lk) {
    return '<div class="link-item">' +
      '<span class="link-name">'+esc(lk.name)+'</span>' +
      '<a href="'+esc(lk.url)+'" target="_blank" rel="noopener">'+esc(lk.url)+'</a>' +
      '<button class="link-delete" data-widget="'+w.id+'" data-link="'+lk.id+'">&times;</button>' +
    '</div>';
  }).join('');
  return '<div class="links-list">' + items +
    '<div class="links-add">' +
      '<input placeholder="Name..." class="link-name-input" data-widget="'+w.id+'" />' +
      '<input placeholder="URL..." class="link-url-input" data-widget="'+w.id+'" />' +
      '<button class="btn btn-ghost btn-sm link-add-btn" data-widget="'+w.id+'">Add</button>' +
    '</div></div>';
}

/* ── RESOURCES ── */
function renderResources(w) {
  var cats = (w.data.categories || []).map(function (cat) {
    var items = (cat.items || []).map(function (item) {
      return '<div class="resource-item">' +
        '<a href="'+esc(item.url)+'" target="_blank" rel="noopener">'+esc(item.name)+'</a>' +
        '<button class="resource-item-delete" data-widget="'+w.id+'" data-cat="'+cat.id+'" data-item="'+item.id+'">&times;</button>' +
        '</div>';
    }).join('');
    return '<div class="resource-category">' +
      '<div class="resource-category-header">' +
        '<span>'+esc(cat.name)+'</span>' +
        '<button class="resource-cat-delete" data-widget="'+w.id+'" data-cat="'+cat.id+'">&times;</button>' +
      '</div>' +
      '<div class="resource-items">'+items+'</div>' +
      '<div class="resource-add-form">' +
        '<input placeholder="Name..." class="resource-name-input" data-widget="'+w.id+'" data-cat="'+cat.id+'" />' +
        '<input placeholder="URL..." class="resource-url-input" data-widget="'+w.id+'" data-cat="'+cat.id+'" />' +
        '<button class="btn btn-ghost btn-sm resource-add-btn" data-widget="'+w.id+'" data-cat="'+cat.id+'">Add</button>' +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="resources-widget">' + cats +
    '<div class="resource-new-cat">' +
      '<input placeholder="New category..." class="resource-cat-input" data-widget="'+w.id+'" />' +
      '<button class="btn btn-ghost btn-sm resource-cat-add-btn" data-widget="'+w.id+'">Add Category</button>' +
    '</div>' +
    '</div>';
}

/* ── DAILY GOALS ── */
function renderDailyGoals(w) {
  var goals = (w.data.goals || []).map(function (g) {
    var done = g.done ? ' done' : '';
    return '<div class="daily-goal-item">' +
      '<div class="daily-goal-check'+done+'" data-widget="'+w.id+'" data-goal="'+g.id+'"></div>' +
      '<span class="daily-goal-text'+done+'">'+esc(g.text)+'</span>' +
      '<button class="daily-goal-delete" data-widget="'+w.id+'" data-goal="'+g.id+'">&times;</button>' +
    '</div>';
  }).join('');
  return '<div class="daily-goals-list">' + goals +
    '<div class="daily-goal-add"><input placeholder="New goal..." data-widget="'+w.id+'" /><button class="btn btn-ghost btn-sm daily-goal-add-btn" data-widget="'+w.id+'">Add</button></div>' +
    '</div>';
}

/* ── PROGRESS TRACKER ── */
function renderProgressTracker(w) {
  var items = (w.data.items || []).map(function (it) {
    var pct = Math.min(100, Math.max(0, it.progress || 0));
    var cls = pct >= 80 ? 'high' : pct >= 40 ? 'medium' : 'low';
    return '<div class="progress-item">' +
      '<div class="progress-header">' +
        '<span class="progress-name">'+esc(it.name)+'</span>' +
        '<span class="progress-delete" data-widget="'+w.id+'" data-item="'+it.id+'">&times;</span>' +
      '</div>' +
      '<div class="progress-bar-track"><div class="progress-bar-fill '+cls+'" style="width:'+pct+'%"></div></div>' +
      '<div class="progress-header">' +
        '<span class="progress-value">'+pct+'%</span>' +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="progress-tracker">' + items +
    '<div class="progress-add">' +
      '<input placeholder="Name..." class="progress-name-input" data-widget="'+w.id+'" />' +
      '<input type="number" placeholder="0" min="0" max="100" class="progress-pct-input" data-widget="'+w.id+'" />' +
      '<button class="btn btn-ghost btn-sm progress-add-btn" data-widget="'+w.id+'">Add</button>' +
    '</div></div>';
}

/* ──── DAILY GOALS ACTIONS ──── */
function addDailyGoal(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'daily-goals'; });
  if (!w) return;
  var input = document.querySelector('.daily-goal-add input[data-widget="'+widgetId+'"]');
  if (!input || !input.value.trim()) return;
  w.data.goals.push({ id: uid(), text: input.value.trim(), done: false });
  input.value = '';
  saveState(); renderBoard();
}
function toggleDailyGoal(widgetId, goalId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'daily-goals'; });
  if (!w) return;
  var g = w.data.goals.find(function (x) { return x.id === goalId; });
  if (!g) return;
  g.done = !g.done;
  saveState(); renderBoard();
}
function deleteDailyGoal(widgetId, goalId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'daily-goals'; });
  if (!w) return;
  w.data.goals = w.data.goals.filter(function (x) { return x.id !== goalId; });
  saveState(); renderBoard();
}

/* ──── PROGRESS TRACKER ACTIONS ──── */
function addProgressItem(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'progress-tracker'; });
  if (!w) return;
  var nameInput = document.querySelector('.progress-name-input[data-widget="'+widgetId+'"]');
  var pctInput = document.querySelector('.progress-pct-input[data-widget="'+widgetId+'"]');
  if (!nameInput || !nameInput.value.trim()) return;
  var pct = parseInt(pctInput ? pctInput.value : 0, 10) || 0;
  w.data.items.push({ id: uid(), name: nameInput.value.trim(), progress: pct });
  nameInput.value = '';
  if (pctInput) pctInput.value = '';
  saveState(); renderBoard();
}
function deleteProgressItem(widgetId, itemId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'progress-tracker'; });
  if (!w) return;
  w.data.items = w.data.items.filter(function (x) { return x.id !== itemId; });
  saveState(); renderBoard();
}

/* ── IMAGE ── */
function renderImage(w) {
  var src = w.data.src || '';
  var name = w.data.name || '';
  if (!src) {
    return '<div class="image-widget-empty" data-widget="'+w.id+'">' +
      '<div class="image-dropzone">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
        '<span>Drop an image, paste, or <a class="image-upload-link" data-widget="'+w.id+'" href="#">browse</a></span>' +
        '<input type="file" accept="image/*" class="image-file-input" data-widget="'+w.id+'" style="display:none" />' +
      '</div></div>';
  }
  return '<div class="image-widget-content" data-widget="'+w.id+'">' +
    '<img src="'+esc(src)+'" alt="'+esc(name)+'" class="image-widget-img" draggable="false" />' +
    '</div>';
}

/* ──── IMAGE ACTIONS ──── */
function imageUpload(widgetId, file) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'image'; });
  if (!w) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    w.data.src = e.target.result;
    w.data.name = file.name;
    saveState(); renderBoard();
  };
  reader.readAsDataURL(file);
}

function createImageWidgetFromData(dataUrl, fileName) {
  var board = getActiveBoard();
  if (!board) { notify('Select a board first'); return; }
  board.widgets.push({
    id: uid(),
    type: 'image',
    size: 'medium',
    data: { src: dataUrl, name: fileName || 'Pasted image' },
  });
  saveState();
  renderBoard();
  notify('Image added');
}

/* ──── RENDER: STATISTICS ──── */
function renderStats() {
  var container = document.getElementById('statsContainer');
  var filter = document.getElementById('statsFilter');
  if (!container || !filter) return;

  var boardId = filter.value;
  var boards = boardId === '__all' ? state.boards : [getBoard(boardId)].filter(Boolean);

  var totalFocus = 0, totalSessions = 0, totalTasks = 0, doneTasks = 0, totalFocusTimer = 0;
  var boardMetrics = [];
  var allHabits = [], allHabitLog = {};
  var allDailyGoals = [];
  var allProgressItems = [];

  boards.forEach(function (b) {
    var bFocus = 0, bSessions = 0, bTasks = 0, bDone = 0;
    b.widgets.forEach(function (w) {
      if (w.type === 'pomodoro') {
        totalFocus += w.data.totalFocusSeconds || 0;
        totalSessions += w.data.sessionsCompleted || 0;
        bFocus += w.data.totalFocusSeconds || 0;
        bSessions += w.data.sessionsCompleted || 0;
      }
      if (w.type === 'focus-timer') {
        totalFocusTimer += w.data.totalFocusSeconds || 0;
        bFocus += w.data.totalFocusSeconds || 0;
      }
      if (w.type === 'todo') {
        (w.data.items || []).forEach(function (it) {
          totalTasks++; bTasks++;
          if (normStatus(it) === 'completed') { doneTasks++; bDone++; }
        });
      }
      if (w.type === 'habits') {
        (w.data.habits || []).forEach(function (h) { allHabits.push(h); });
        Object.keys(w.data.log || {}).forEach(function (hid) {
          if (!allHabitLog[hid]) allHabitLog[hid] = {};
          Object.keys(w.data.log[hid]).forEach(function (dk) {
            allHabitLog[hid][dk] = true;
          });
        });
      }
      if (w.type === 'daily-goals') {
        (w.data.goals || []).forEach(function (g) { allDailyGoals.push(g); });
      }
      if (w.type === 'progress-tracker') {
        (w.data.items || []).forEach(function (it) {
          allProgressItems.push({ item: it, board: b.name, boardId: b.id });
        });
      }
    });
    boardMetrics.push({ id: b.id, name: b.name, icon: b.icon || '\ud83d\udccb', color: b.color || 'var(--green)', focus: bFocus, sessions: bSessions, tasks: bTasks, done: bDone });
  });

  var combinedFocus = totalFocus + totalFocusTimer;
  var rate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  var pomoPct = combinedFocus > 0 ? Math.round(totalFocus / combinedFocus * 100) : 0;
  var timerPct = combinedFocus > 0 ? Math.round(totalFocusTimer / combinedFocus * 100) : 0;

  /* compute habits streak */
  var maxStreak = 0;
  allHabits.forEach(function (h) {
    var streak = 0;
    var d = new Date();
    while (true) {
      var k = dateKey(d);
      if (allHabitLog[h.id] && allHabitLog[h.id][k]) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    if (streak > maxStreak) maxStreak = streak;
  });

  /* daily goals */
  var goalsDone = allDailyGoals.filter(function (g) { return g.done; }).length;
  var goalsTotal = allDailyGoals.length;
  var goalsPct = goalsTotal > 0 ? Math.round(goalsDone / goalsTotal * 100) : 0;

  /* achievements */
  var hours = Math.floor(combinedFocus / 3600);
  var achievements = [];
  [1, 5, 10, 25, 50, 100].forEach(function (t) { if (hours >= t) achievements.push({ icon: '\ud83e\uddd8', name: t+'h Focus', desc: t+' hours of deep work' }); });
  [10, 50, 100, 500].forEach(function (t) { if (totalSessions >= t) achievements.push({ icon: '\ud83c\udf45', name: t+' Sessions', desc: t+' pomodoro sessions' }); });
  [10, 50, 100, 500].forEach(function (t) { if (doneTasks >= t) achievements.push({ icon: '\u2705', name: t+' Tasks', desc: t+' tasks completed' }); });

  /* summary cards */
  var S = function (n, l, h, svg) {
    return '<div class="stat-card'+(h?' highlight':'')+'">'+
      svg+'<div class="stat-number">'+n+'</div><div class="stat-label">'+l+'</div></div>';
  };
  var sumHtml =
    S(fmtHours(combinedFocus), 'Focus Time', true,
      '<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>') +
    S(totalSessions, 'Pomodoro Sessions', true,
      '<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>') +
    S(doneTasks+'/'+totalTasks, 'Tasks Completed', true,
      '<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>') +
    S(rate+'%', 'Completion Rate', true,
      '<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>') +
    S(state.boards.length, 'Boards', false,
      '<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>') +
    S(totalTasks - doneTasks, 'Tasks Pending', false,
      '<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>');

  /* focus breakdown */
  var focusHtml = combinedFocus > 0
    ? '<div class="focus-total">'+fmtHours(combinedFocus)+'</div>'+
      '<div class="focus-breakdown-bar">'+
        '<div class="focus-bar-pomo" style="width:'+pomoPct+'%"></div>'+
        '<div class="focus-bar-timer" style="width:'+timerPct+'%"></div>'+
      '</div>'+
      '<div class="focus-breakdown-labels">'+
        '<span><span class="dot green"></span> Pomodoro: '+fmtHours(totalFocus)+'</span>'+
        '<span><span class="dot blue"></span> Focus Timer: '+fmtHours(totalFocusTimer)+'</span>'+
      '</div>'
    : '<div class="stats-empty">No focus data yet</div>';

  /* circular task completion */
  var circR = 42, circ = 2 * Math.PI * circR;
  var offset = circ * (1 - rate / 100);
  var tasksHtml = totalTasks > 0
    ? '<div class="circular-progress">'+
        '<div class="circular-progress-ring">'+
          '<svg width="100" height="100" viewBox="0 0 100 100">'+
            '<circle class="bg" cx="50" cy="50" r="'+circR+'"/>'+
            '<circle class="fill" cx="50" cy="50" r="'+circR+'" stroke-dasharray="'+circ+'" stroke-dashoffset="'+offset+'"/>'+
          '</svg>'+
          '<div class="circular-progress-pct">'+rate+'%</div>'+
        '</div>'+
        '<div class="circular-progress-info">'+
          '<strong>'+doneTasks+'</strong> of '+totalTasks+' tasks completed'+
          '<br><span style="font-size:12px;color:var(--text-tertiary)">'+(totalTasks - doneTasks)+' remaining</span>'+
        '</div>'+
      '</div>'
    : '<div class="stats-empty">No tasks yet</div>';

  /* habits streak */
  var habitsHtml = allHabits.length > 0
    ? '<div class="habits-streak-display">'+
        '<div class="streak-fire">\ud83d\udd25</div>'+
        '<div><div class="streak-number">'+maxStreak+'</div><div class="streak-label">day streak</div></div>'+
      '</div>'+
      '<div class="habits-data">'+allHabits.length+' habit'+(allHabits.length !== 1 ? 's' : '')+' tracked</div>'
    : '<div class="stats-empty">No habits tracked</div>';

  /* daily goals */
  var goalsHtml = goalsTotal > 0
    ? '<div class="goals-progress">'+
        '<div class="goals-fraction">'+goalsDone+'<span>/'+goalsTotal+'</span></div>'+
        '<div style="flex:1">'+
          '<div class="goals-bar-track"><div class="goals-bar-fill" style="width:'+goalsPct+'%"></div></div>'+
          '<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">'+goalsPct+'% of today\'s goals done</div>'+
        '</div>'+
      '</div>'
    : '<div class="stats-empty">No goals set for today</div>';

  /* board insights table */
  var boardRows = boardMetrics.map(function (bm) {
    var bRate = bm.tasks > 0 ? Math.round(bm.done / bm.tasks * 100) : 0;
    return '<tr>'+
      '<td>'+esc(bm.icon)+' '+esc(bm.name)+'</td>'+
      '<td class="num">'+(bm.focus > 0 ? fmtHours(bm.focus) : '\u2014')+'</td>'+
      '<td class="num">'+bm.sessions+'</td>'+
      '<td class="num">'+bm.done+'/'+bm.tasks+'</td>'+
      '<td class="num">'+bRate+'%</td>'+
    '</tr>';
  }).join('');
  var boardHtml = boardMetrics.length > 0
    ? '<div class="board-insights-wrapper"><table class="board-insights-table">'+
        '<thead><tr><th>Board</th><th>Focus</th><th>Sessions</th><th>Tasks</th><th>Rate</th></tr></thead>'+
        '<tbody>'+boardRows+'</tbody></table></div>'
    : '<div class="stats-empty">No boards to compare</div>';

  /* progress items */
  var progressItemsHtml = allProgressItems.length > 0
    ? '<div class="stats-progress-items">'+
      allProgressItems.map(function (pi) {
        var pct = Math.min(100, Math.max(0, pi.item.progress || 0));
        var cls = pct >= 80 ? 'high' : pct >= 40 ? 'medium' : 'low';
        return '<div class="stats-progress-item">'+
          '<span class="stats-progress-name">'+esc(pi.item.name)+'</span>'+
          '<div class="stats-progress-track"><div class="stats-progress-fill '+cls+'" style="width:'+pct+'%"></div></div>'+
          '<span class="stats-progress-pct">'+pct+'%</span>'+
          '<span class="stats-progress-board">'+esc(pi.board)+'</span>'+
        '</div>';
      }).join('')+'</div>'
    : '<div class="stats-empty">No progress items yet</div>';

  /* achievements */
  var achHtml = achievements.length > 0
    ? '<div class="achievements-grid">'+
      achievements.map(function (a) {
        return '<div class="achievement-badge unlocked">'+
          '<div class="achievement-icon">'+a.icon+'</div>'+
          '<div class="achievement-name">'+esc(a.name)+'</div>'+
          '<div class="achievement-desc">'+esc(a.desc)+'</div>'+
        '</div>';
      }).join('')+'</div>'
    : '<div class="stats-empty">Complete tasks and focus sessions to unlock achievements</div>';

  /* assemble */
  var user = getUser();
  var welcomeHtml = '';
  if (user && user.name) {
    welcomeHtml = '<div class="stats-welcome">'+
      '<h2 class="stats-welcome-title">Welcome back! :D, '+esc(user.name)+'</h2>'+
      '<p class="stats-welcome-subtitle">Here\u2019s an overview of your productivity across all boards.</p>'+
      '</div>';
  }

  container.innerHTML = welcomeHtml + sumHtml +
    '<div class="stats-insights" style="grid-column: 1 / -1;">'+
      '<div class="stats-insight-card"><div class="stats-insight-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg><h3>Focus Breakdown</h3></div>'+focusHtml+'</div>'+
      '<div class="stats-insight-card"><div class="stats-insight-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><h3>Task Completion</h3></div>'+tasksHtml+'</div>'+
      '<div class="stats-insight-card"><div class="stats-insight-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><h3>Habits Streak</h3></div>'+habitsHtml+'</div>'+
      '<div class="stats-insight-card"><div class="stats-insight-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4m0 12v4M4 7l2 2m12 0l2-2M4 17l2-2m12 2l2 2"/><circle cx="12" cy="12" r="7"/></svg><h3>Daily Goals</h3></div>'+goalsHtml+'</div>'+
    '</div>'+
    '<div class="stats-section" style="grid-column: 1 / -1;"><div class="stats-section-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg><h3>Board Insights</h3></div>'+boardHtml+'</div>'+
    '<div class="stats-section" style="grid-column: 1 / -1;"><div class="stats-section-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><h3>Progress Tracker</h3></div>'+progressItemsHtml+'</div>'+
    '<div class="stats-section" style="grid-column: 1 / -1;"><div class="stats-section-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3c.5 2 2.5 4 5 4 0 3-1 6-3 8l-2 2-2-2c-2-2-3-5-3-8 2.5 0 4.5-2 5-4z"/></svg><h3>Achievements</h3></div>'+achHtml+'</div>';
}

function renderStatsFilter() {
  var filter = document.getElementById('statsFilter');
  if (!filter) return;
  var html = '<option value="__all">All Boards</option>';
  state.boards.forEach(function (b) {
    html += '<option value="'+b.id+'">'+esc(b.name)+'</option>';
  });
  filter.innerHTML = html;
}

/* ──── RENDER: TEMPLATES ──── */
var TEMPLATES = [
  {
    id: 'student',
    name: 'Student',
    desc: 'Study tracker, Pomodoro & class notes',
    icon: '\u270f\ufe0f',
    tags: ['study', 'pomodoro', 'notes'],
    widgets: [
      { type: 'todo', size: 'small', data: { items: [
        { id: uid(), text: 'Review lecture notes', done: false },
        { id: uid(), text: 'Complete homework', done: false },
        { id: uid(), text: 'Read chapter 5', done: false },
      ]}},
      { type: 'pomodoro', size: 'small', data: { timeLeft: 25*60, mode:'focus', running:false, paused:false, focusDuration:25*60, breakDuration:5*60, sessionsCompleted:0, totalFocusSeconds:0 }},
      { type: 'notes', size: 'medium', data: { content: '' }},
      { type: 'calendar', size: 'small', data: { year: new Date().getFullYear(), month: new Date().getMonth() }},
    ]
  },
  {
    id: 'work',
    name: 'Work',
    desc: 'Project tasks, meetings & resources',
    icon: '\uD83D\uDCBC',
    tags: ['tasks', 'meetings', 'links'],
    widgets: [
      { type: 'todo', size: 'small', data: { items: [
        { id: uid(), text: 'Project proposal draft', done: false },
        { id: uid(), text: 'Team sync preparation', done: false },
        { id: uid(), text: 'Review deliverables', done: false },
      ]}},
      { type: 'pomodoro', size: 'small', data: { timeLeft: 25*60, mode:'focus', running:false, paused:false, focusDuration:25*60, breakDuration:5*60, sessionsCompleted:0, totalFocusSeconds:0 }},
      { type: 'notes', size: 'medium', data: { content: '' }},
      { type: 'links', size: 'small', data: { links: [] }},
    ]
  },
  {
    id: 'personal',
    name: 'Personal',
    desc: 'Goals, habits & journal',
    icon: '\uD83C\uDF31',
    tags: ['habits', 'goals', 'journal'],
    widgets: [
      { type: 'todo', size: 'small', data: { items: [
        { id: uid(), text: 'Read 30 minutes', done: false },
        { id: uid(), text: 'Exercise', done: false },
        { id: uid(), text: 'Practice guitar', done: false },
      ]}},
      { type: 'habits', size: 'small', data: { habits: [
        { id: uid(), name: 'Meditate' },
        { id: uid(), name: 'Drink water' },
      ], log: {} }},
      { type: 'notes', size: 'medium', data: { content: '' }},
    ]
  },
  {
    id: 'focus',
    name: 'Deep Focus',
    desc: 'Pomodoro, focus timer & task list',
    icon: '\uD83C\uDFAF',
    tags: ['focus', 'pomodoro', 'timer'],
    widgets: [
      { type: 'pomodoro', size: 'small', data: { timeLeft: 50*60, mode:'focus', running:false, paused:false, focusDuration:50*60, breakDuration:10*60, sessionsCompleted:0, totalFocusSeconds:0 }},
      { type: 'focus-timer', size: 'small', data: { running: false, elapsed: 0, startTime: null, totalFocusSeconds: 0 }},
      { type: 'todo', size: 'small', data: { items: [
        { id: uid(), text: 'Priority task 1', done: false },
        { id: uid(), text: 'Priority task 2', done: false },
      ]}},
    ]
  },
  {
    id: 'empty',
    name: 'Blank Canvas',
    desc: 'Start from scratch',
    icon: '\uD83C\uDFA8',
    tags: ['empty'],
    widgets: []
  },
  {
    id: 'ai-workspace',
    name: 'AI Workspace Generator',
    desc: 'Describe your goal, Grove builds your workspace',
    icon: '\u2728',
    tags: ['ai', 'premium'],
    comingSoon: true,
    widgets: []
  },
];

function renderTemplates() {
  var grid = document.getElementById('templatesGrid');
  if (!grid) return;
  grid.innerHTML = TEMPLATES.map(function (t) {
    var widgetCount = t.widgets.length;
    var types = t.widgets.map(function (w) { return widgetLabel(w.type); }).join(', ');
    return '<div class="template-card'+(t.comingSoon ? ' template-card--soon' : '')+'" data-template="'+t.id+'">' +
      '<div class="template-card-icon">'+t.icon+'</div>' +
      (t.comingSoon ? '<span class="soon-badge">Coming Soon</span>' : '') +
      '<h3>'+esc(t.name)+'</h3>' +
      '<p>'+esc(t.desc)+'</p>' +
      '<div class="template-card-tags">' +
        t.tags.map(function (tag) { return '<span>'+esc(tag)+'</span>'; }).join('') +
      '</div>' +
      (t.comingSoon ? '' : '<div style="font-size:12px;color:var(--text-tertiary);margin-top:10px;">'+widgetCount+' widgets: '+esc(types)+'</div>') +
    '</div>';
  }).join('');
}

function applyTemplate(templateId) {
  var tmpl = TEMPLATES.find(function (t) { return t.id === templateId; });
  if (!tmpl) return;
  if (tmpl.comingSoon) {
    var modal = document.getElementById('aiWorkspaceModal');
    if (modal) modal.classList.add('open');
    return;
  }
  var colors = ['#3b8c5a','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316'];
  var color = colors[state.boards.length % colors.length];
  var widgets = tmpl.widgets.map(function (w) {
    var data = JSON.parse(JSON.stringify(w.data));
    return { id: uid(), type: w.type, size: w.size, data: data };
  });
  var board = { id: uid(), name: tmpl.name, color: color, widgets: widgets };
  state.boards.push(board);
  state.activeBoardId = board.id;
  state.showStats = false;
  state.showTemplates = false;
  saveState();
  renderSidebar();
  switchView('board');
  notify('Template "'+tmpl.name+'" applied');
}

/* ──── VIEW SWITCHING ──── */
function switchView(view) {
  state.showStats = view === 'stats';
  state.showTemplates = view === 'templates';
  if (!state.showStats && !state.showTemplates) {
    var board = getActiveBoard();
    if (!board && state.boards.length > 0) {
      state.activeBoardId = state.boards[0].id;
    }
  }
  document.querySelectorAll('.view').forEach(function (el) {
    el.classList.toggle('active', el.id === 'view-' + view);
  });
  var addBtn = document.getElementById('addWidgetBtn');
  if (addBtn) addBtn.style.display = view === 'board' && getActiveBoard() ? 'inline-flex' : 'none';
  if (view === 'stats') {
    renderStatsFilter();
    renderStats();
  }
  if (view === 'board') {
    renderBoard();
  }
  if (view === 'templates') {
    renderTemplates();
  }
  renderSidebar();
  saveState();
}

/* ──── BOARD CRUD ──── */
function createBoard(name) {
  var colors = ['#3b8c5a','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316'];
  var color = colors[state.boards.length % colors.length];
  var board = { id: uid(), name: name || 'Untitled', color: color, widgets: [] };
  state.boards.push(board);
  state.activeBoardId = board.id;
  state.showStats = false;
  state.showTemplates = false;
  saveState();
  renderSidebar();
  switchView('board');
  notify('Board created');
}

function renameBoard(id, newName) {
  var board = getBoard(id);
  if (!board || !newName.trim()) return;
  board.name = newName.trim();
  saveState();
  var title = document.getElementById('boardTitle');
  if (title) title.value = board.name;
  renderSidebar();
}

function deleteBoard(id) {
  if (state.boards.length <= 1) { notify('Keep at least one board'); return; }
  showConfirm('Delete "'+(getBoard(id)||{}).name+'" and all its widgets?', function () {
    state.boards = state.boards.filter(function (b) { return b.id !== id; });
    if (state.activeBoardId === id) {
      state.activeBoardId = state.boards[0] ? state.boards[0].id : null;
    }
    saveState();
    renderSidebar();
    switchView('board');
    notify('Board deleted');
  });
}

/* ──── WIDGET CRUD ──── */
function addWidget(type) {
  var board = getActiveBoard();
  if (!board) { notify('Select a board first'); return; }
  if (type === 'pomodoro') {
    showPomodoroConfig();
    return;
  }
  board.widgets.push({
    id: uid(),
    type: type,
    size: type === 'todo' ? 'medium' : 'small',
    data: widgetDefaults(type),
  });
  saveState();
  renderBoard();
  notify('Widget added');
}

function removeWidget(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId; });
  if (!w) return;
  showConfirm('Remove this "'+widgetLabel(w.type)+'" widget?', function () {
    board.widgets = board.widgets.filter(function (x) { return x.id !== widgetId; });
    saveState();
    renderBoard();
  });
}

function resizeWidget(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId; });
  if (!w) return;
  var sizes = w.type === 'todo' ? ['medium', 'large'] : ['small', 'medium', 'large'];
  var idx = sizes.indexOf(w.size);
  if (idx === -1) idx = 0;
  w.size = sizes[(idx + 1) % sizes.length];
  saveState();
  renderBoard();
}

/* ──── TODO / KANBAN ACTIONS ──── */
function addTodoItem(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'todo'; });
  if (!w) return;
  var input = document.querySelector('.kanban-add input[data-widget="'+widgetId+'"]');
  if (!input || !input.value.trim()) return;
  var prioritySelect = document.querySelector('.priority-select[data-widget="'+widgetId+'"]');
  var priority = prioritySelect ? prioritySelect.value : 'medium';
  w.data.items.push({ id: uid(), text: input.value.trim(), status: 'not_started', priority: priority });
  input.value = '';
  saveState(); renderBoard();
}
function toggleTodoItem(widgetId, itemId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'todo'; });
  if (!w) return;
  var item = w.data.items.find(function (x) { return x.id === itemId; });
  if (!item) return;
  var order = ['not_started', 'in_progress', 'completed'];
  var cur = normStatus(item);
  var idx = order.indexOf(cur);
  item.status = order[(idx + 1) % order.length];
  delete item.done;
  saveState(); renderBoard();
}
function deleteTodoItem(widgetId, itemId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'todo'; });
  if (!w) return;
  w.data.items = w.data.items.filter(function (x) { return x.id !== itemId; });
  saveState(); renderBoard();
}
function kanbanMoveItem(widgetId, itemId, newStatus) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'todo'; });
  if (!w) return;
  var item = w.data.items.find(function (x) { return x.id === itemId; });
  if (!item) return;
  item.status = newStatus;
  delete item.done;
  saveState(); renderBoard();
}

/* ──── POMODORO ACTIONS ──── */
var pomoIntervals = {};
function pomoStart(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'pomodoro'; });
  if (!w) return;
  var d = w.data;
  if (d.running && !d.paused) return;
  d.running = true; d.paused = false;
  if (!pomoIntervals[widgetId]) {
    pomoIntervals[widgetId] = setInterval(function () { pomoTick(widgetId); }, 1000);
  }
  renderBoard();
}
function pomoPause(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'pomodoro'; });
  if (!w) return;
  w.data.paused = true;
  renderBoard();
}
function pomoReset(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'pomodoro'; });
  if (!w) return;
  clearInterval(pomoIntervals[widgetId]);
  delete pomoIntervals[widgetId];
  var d = w.data;
  d.running = false; d.paused = false; d.mode = 'focus';
  d.timeLeft = d.focusDuration;
  renderBoard();
}
function pomoTick(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'pomodoro'; });
  if (!w) return;
  var d = w.data;
  if (d.paused) return;
  d.timeLeft--;
  var el = document.getElementById('pomo-time-'+widgetId);
  if (el) el.textContent = fmtTime(d.timeLeft);

  if (d.timeLeft <= 0) {
    clearInterval(pomoIntervals[widgetId]);
    delete pomoIntervals[widgetId];
    if (d.mode === 'focus') {
      d.sessionsCompleted++;
      d.totalFocusSeconds += d.focusDuration;
      d.mode = 'break';
      d.timeLeft = d.breakDuration;
      notify('Focus complete! Take a break.');
    } else {
      d.mode = 'focus';
      d.timeLeft = d.focusDuration;
      notify('Break over. Time to focus!');
    }
    d.running = false; d.paused = false;
    saveState();
    renderBoard();
  } else if (d.timeLeft % 30 === 0) {
    saveState();
  }
}

/* ──── POMODORO CONFIG ──── */
function showPomodoroConfig() {
  var overlay = document.getElementById('pomodoroConfigModal');
  if (!overlay) return;
  // Load saved prefs
  var saved;
  try { saved = JSON.parse(localStorage.getItem('grove_pomo_prefs')); } catch (_) {}
  var f = document.getElementById('pomoFocusDuration');
  var b = document.getElementById('pomoBreakDuration');
  if (f) f.value = (saved && saved.focus) || 25;
  if (b) b.value = (saved && saved.break) || 5;
  overlay.classList.add('open');
  var inp = document.getElementById('pomoFocusDuration');
  if (inp) setTimeout(function () { inp.focus(); }, 50);
}

function hidePomodoroConfig() {
  var overlay = document.getElementById('pomodoroConfigModal');
  if (overlay) overlay.classList.remove('open');
}

function confirmPomodoroConfig() {
  var f = document.getElementById('pomoFocusDuration');
  var b = document.getElementById('pomoBreakDuration');
  var focusMin = parseInt((f && f.value) || 25);
  var breakMin = parseInt((b && b.value) || 5);
  if (focusMin < 1) focusMin = 1;
  if (breakMin < 1) breakMin = 1;
  // Save prefs
  try { localStorage.setItem('grove_pomo_prefs', JSON.stringify({ focus: focusMin, break: breakMin })); } catch (_) {}

  var board = getActiveBoard();
  if (!board) { hidePomodoroConfig(); return; }
  board.widgets.push({
    id: uid(),
    type: 'pomodoro',
    size: 'small',
    data: {
      timeLeft: focusMin * 60,
      mode: 'focus',
      running: false,
      paused: false,
      focusDuration: focusMin * 60,
      breakDuration: breakMin * 60,
      sessionsCompleted: 0,
      totalFocusSeconds: 0,
    },
  });
  hidePomodoroConfig();
  saveState();
  renderBoard();
  notify('Pomodoro widget added');
}

/* ──── FOCUS TIMER ACTIONS ──── */
var focusTimerIntervals = {};
function focusTimerStart(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'focus-timer'; });
  if (!w) return;
  if (w.data.running) return;
  w.data.running = true;
  w.data.startTime = Date.now() - (w.data.elapsed * 1000);
  if (!focusTimerIntervals[widgetId]) {
    focusTimerIntervals[widgetId] = setInterval(function () { focusTimerTick(widgetId); }, 1000);
  }
  renderBoard();
}

function focusTimerStop(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'focus-timer'; });
  if (!w) return;
  if (!w.data.running) return;
  w.data.running = false;
  clearInterval(focusTimerIntervals[widgetId]);
  delete focusTimerIntervals[widgetId];
  w.data.totalFocusSeconds += w.data.elapsed;
  w.data.elapsed = 0;
  w.data.startTime = null;
  saveState();
  renderBoard();
}

function focusTimerReset(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'focus-timer'; });
  if (!w) return;
  clearInterval(focusTimerIntervals[widgetId]);
  delete focusTimerIntervals[widgetId];
  w.data.running = false;
  w.data.elapsed = 0;
  w.data.startTime = null;
  renderBoard();
}

function focusTimerTick(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'focus-timer'; });
  if (!w) return;
  if (!w.data.running) {
    clearInterval(focusTimerIntervals[widgetId]);
    delete focusTimerIntervals[widgetId];
    return;
  }
  var elapsed = Math.floor((Date.now() - w.data.startTime) / 1000);
  w.data.elapsed = elapsed;
  var el = document.getElementById('ft-display-'+widgetId);
  if (el) el.textContent = fmtTimeFull(elapsed);
  // Auto-save every 30s
  if (elapsed % 30 === 0) {
    w.data.totalFocusSeconds += w.data.elapsed;
    w.data.elapsed = 0;
    w.data.startTime = Date.now();
    saveState();
  }
}

/* ──── NOTES ACTIONS ──── */
var notesTimers = {};
function notesUpdate(widgetId) {
  clearTimeout(notesTimers[widgetId]);
  notesTimers[widgetId] = setTimeout(function () {
    var board = getActiveBoard();
    if (!board) return;
    var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'notes'; });
    if (!w) return;
    var ta = document.querySelector('.notes-textarea[data-widget="'+widgetId+'"]');
    if (ta) { w.data.content = ta.value; saveState(); }
  }, 400);
}

/* ──── TEXT ACTIONS ──── */
var textTimers = {};
function textUpdate(widgetId) {
  clearTimeout(textTimers[widgetId]);
  textTimers[widgetId] = setTimeout(function () {
    var board = getActiveBoard();
    if (!board) return;
    var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'text'; });
    if (!w) return;
    var el = document.querySelector('.text-widget-content[data-widget="'+widgetId+'"]');
    if (el) { w.data.content = decodeEntities(el.innerHTML); saveState(); }
  }, 400);
}

/* ──── HABITS ACTIONS ──── */
function addHabit(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'habits'; });
  if (!w) return;
  var input = document.querySelector('.habit-add input[data-widget="'+widgetId+'"]');
  if (!input || !input.value.trim()) return;
  var h = { id: uid(), name: input.value.trim() };
  w.data.habits.push(h);
  if (!w.data.log) w.data.log = {};
  w.data.log[h.id] = {};
  input.value = '';
  saveState(); renderBoard();
}
function toggleHabit(widgetId, habitId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'habits'; });
  if (!w) return;
  if (!w.data.log) w.data.log = {};
  if (!w.data.log[habitId]) w.data.log[habitId] = {};
  var key = dateKey(new Date());
  if (w.data.log[habitId][key]) {
    delete w.data.log[habitId][key];
  } else {
    w.data.log[habitId][key] = true;
  }
  saveState(); renderBoard();
}
function deleteHabit(widgetId, habitId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'habits'; });
  if (!w) return;
  w.data.habits = w.data.habits.filter(function (h) { return h.id !== habitId; });
  if (w.data.log) delete w.data.log[habitId];
  saveState(); renderBoard();
}

/* ──── LINKS ACTIONS ──── */
function addLink(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'links'; });
  if (!w) return;
  var nameInput = document.querySelector('.link-name-input[data-widget="'+widgetId+'"]');
  var urlInput = document.querySelector('.link-url-input[data-widget="'+widgetId+'"]');
  if (!nameInput || !urlInput || !nameInput.value.trim() || !urlInput.value.trim()) return;
  var url = escUrl(urlInput.value.trim());
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  w.data.links.push({ id: uid(), name: nameInput.value.trim(), url: url });
  nameInput.value = ''; urlInput.value = '';
  saveState(); renderBoard();
}
function deleteLink(widgetId, linkId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'links'; });
  if (!w) return;
  w.data.links = w.data.links.filter(function (l) { return l.id !== linkId; });
  saveState(); renderBoard();
}

/* ──── RESOURCES ACTIONS ──── */
function addResourceCategory(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'resources'; });
  if (!w) return;
  var input = document.querySelector('.resource-cat-input[data-widget="'+widgetId+'"]');
  if (!input || !input.value.trim()) return;
  w.data.categories.push({ id: uid(), name: input.value.trim(), items: [] });
  input.value = '';
  saveState(); renderBoard();
}
function addResourceItem(widgetId, catId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'resources'; });
  if (!w) return;
  var nameInput = document.querySelector('.resource-name-input[data-widget="'+widgetId+'"][data-cat="'+catId+'"]');
  var urlInput = document.querySelector('.resource-url-input[data-widget="'+widgetId+'"][data-cat="'+catId+'"]');
  if (!nameInput || !urlInput || !nameInput.value.trim() || !urlInput.value.trim()) return;
  var cat = w.data.categories.find(function (c) { return c.id === catId; });
  if (!cat) return;
  var url = escUrl(urlInput.value.trim());
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  cat.items.push({ id: uid(), name: nameInput.value.trim(), url: url });
  nameInput.value = ''; urlInput.value = '';
  saveState(); renderBoard();
}
function deleteResourceCategory(widgetId, catId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'resources'; });
  if (!w) return;
  w.data.categories = w.data.categories.filter(function (c) { return c.id !== catId; });
  saveState(); renderBoard();
}
function deleteResourceItem(widgetId, catId, itemId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'resources'; });
  if (!w) return;
  var cat = w.data.categories.find(function (c) { return c.id === catId; });
  if (!cat) return;
  cat.items = cat.items.filter(function (it) { return it.id !== itemId; });
  saveState(); renderBoard();
}

/* ──── CALENDAR EVENTS ──── */
function calendarShowEventPopup(widgetId, dateStr) {
  var popup = document.getElementById('calendarEventPopup');
  if (!popup) return;
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'calendar'; });
  if (!w) return;
  var events = (w.data.events && w.data.events[dateStr]) || [];
  var eventList = events.map(function (ev) {
    return '<div class="cal-event-item">' +
      '<div class="cal-event-info"><strong>'+esc(ev.title)+'</strong>' +
      (ev.description ? '<span class="cal-event-desc">'+esc(ev.description)+'</span>' : '') +
      '</div>' +
      '<button class="cal-event-delete" data-widget="'+widgetId+'" data-date="'+dateStr+'" data-event="'+ev.id+'">&times;</button>' +
      '</div>';
  }).join('') || '<div class="cal-event-empty">No events on this day</div>';
  popup.style.display = 'block';
  popup.innerHTML =
    '<div class="cal-event-popup-header">' +
      '<span class="cal-event-popup-title">Events — '+esc(dateStr)+'</span>' +
      '<button class="cal-event-popup-close">&times;</button>' +
    '</div>' +
    '<div class="cal-event-popup-body">' +
      '<div class="cal-event-list">'+eventList+'</div>' +
      '<div class="cal-event-add-form">' +
        '<input class="cal-event-title-input" placeholder="Event title..." />' +
        '<input class="cal-event-desc-input" placeholder="Description (optional)" />' +
        '<button class="btn btn-primary btn-sm cal-event-save" data-widget="'+widgetId+'" data-date="'+dateStr+'">Add Event</button>' +
      '</div>' +
    '</div>';
  // Position near the clicked day
  // Close on outside click handled by delegation
}
function calendarAddEvent(widgetId, dateStr) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'calendar'; });
  if (!w) return;
  var titleInput = document.querySelector('.cal-event-title-input');
  if (!titleInput || !titleInput.value.trim()) { notify('Enter an event title'); return; }
  if (!w.data.events) w.data.events = {};
  if (!w.data.events[dateStr]) w.data.events[dateStr] = [];
  var descInput = document.querySelector('.cal-event-desc-input');
  w.data.events[dateStr].push({ id: uid(), title: titleInput.value.trim(), description: (descInput && descInput.value.trim()) || '' });
  titleInput.value = '';
  if (descInput) descInput.value = '';
  saveState(); renderBoard();
  // Refresh popup
  calendarShowEventPopup(widgetId, dateStr);
}
function calendarDeleteEvent(widgetId, dateStr, eventId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'calendar'; });
  if (!w) return;
  if (!w.data.events || !w.data.events[dateStr]) return;
  w.data.events[dateStr] = w.data.events[dateStr].filter(function (e) { return e.id !== eventId; });
  if (w.data.events[dateStr].length === 0) delete w.data.events[dateStr];
  saveState(); renderBoard();
  // Refresh or close popup
  var remaining = 0;
  for (var k in w.data.events) { remaining += w.data.events[k].length; }
  if (remaining === 0) {
    var popup = document.getElementById('calendarEventPopup');
    if (popup) popup.style.display = 'none';
  } else {
    calendarShowEventPopup(widgetId, dateStr);
  }
}

/* ──── CALENDAR ACTIONS ──── */
function calendarNav(widgetId, dir) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'calendar'; });
  if (!w) return;
  w.data.month += dir;
  if (w.data.month > 11) { w.data.month = 0; w.data.year++; }
  if (w.data.month < 0) { w.data.month = 11; w.data.year--; }
  saveState(); renderBoard();
}

/* ──── WIDGET COLOR ──── */
function changeWidgetColor(widgetId, color) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId; });
  if (!w) return;
  if (color) {
    w.color = isValidHexColor(color) ? color : '#3b8c5a';
  } else {
    delete w.color;
  }
  saveState(); renderBoard();
}

/* ──── POMODORO INLINE SETTINGS ──── */
function pomoToggleSettings(widgetId) {
  var el = document.getElementById('pomo-inline-settings-'+widgetId);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
    return;
  }
  var panel = document.createElement('div');
  panel.id = 'pomo-inline-settings-'+widgetId;
  panel.className = 'pomo-inline-settings';
  var board = getActiveBoard();
  var w = board ? board.widgets.find(function (x) { return x.id === widgetId && x.type === 'pomodoro'; }) : null;
  var focus = w ? Math.floor(w.data.focusDuration / 60) : 25;
  var brk = w ? Math.floor(w.data.breakDuration / 60) : 5;
  panel.innerHTML =
    '<div class="pomo-inline-form">' +
      '<label>Focus (min): <input class="pomo-inline-focus" data-id="'+widgetId+'" type="number" min="1" max="120" value="'+focus+'" /></label>' +
      '<label>Break (min): <input class="pomo-inline-break" data-id="'+widgetId+'" type="number" min="1" max="60" value="'+brk+'" /></label>' +
      '<div class="pomo-inline-actions">' +
        '<button class="btn btn-ghost btn-sm pomo-inline-save" data-id="'+widgetId+'">Save</button>' +
        '<button class="btn btn-ghost btn-sm pomo-inline-cancel" data-id="'+widgetId+'">Cancel</button>' +
      '</div>' +
    '</div>';
  var body = document.querySelector('.widget[data-id="'+widgetId+'"] .widget-body');
  if (body) body.appendChild(panel);
}
function pomoSaveSettings(widgetId) {
  var board = getActiveBoard();
  if (!board) return;
  var w = board.widgets.find(function (x) { return x.id === widgetId && x.type === 'pomodoro'; });
  if (!w) return;
  var focusInput = document.querySelector('.pomo-inline-focus[data-id="'+widgetId+'"]');
  var breakInput = document.querySelector('.pomo-inline-break[data-id="'+widgetId+'"]');
  if (!focusInput || !breakInput) return;
  var f = parseInt(focusInput.value, 10) || 25;
  var b = parseInt(breakInput.value, 10) || 5;
  w.data.focusDuration = f * 60;
  w.data.breakDuration = b * 60;
  if (!w.data.running) {
    w.data.timeLeft = w.data.mode === 'focus' ? f * 60 : b * 60;
  }
  saveState(); renderBoard();
}

/* ──── SETTINGS ──── */
function getSettings() {
  try { return JSON.parse(localStorage.getItem('grove_settings')) || {}; } catch (_) { return {}; }
}
function saveSettingsToStorage(s) {
  try { localStorage.setItem('grove_settings', JSON.stringify(s)); } catch (_) {}
}
function showSettings() {
  var overlay = document.getElementById('settingsModal');
  if (!overlay) return;
  var settings = getSettings();
  var df = document.getElementById('settingsDefaultFocus');
  var db = document.getElementById('settingsDefaultBreak');
  if (df) df.value = settings.defaultFocus || 25;
  if (db) db.value = settings.defaultBreak || 5;
  overlay.classList.add('open');
}
function hideSettings() {
  var overlay = document.getElementById('settingsModal');
  if (overlay) overlay.classList.remove('open');
}
function confirmSettings() {
  var df = document.getElementById('settingsDefaultFocus');
  var db = document.getElementById('settingsDefaultBreak');
  var settings = getSettings();
  settings.defaultFocus = parseInt(df.value, 10) || 25;
  settings.defaultBreak = parseInt(db.value, 10) || 5;
  saveSettingsToStorage(settings);

  // Apply to existing pomodoro widgets that are not running
  state.boards.forEach(function (b) {
    b.widgets.forEach(function (w) {
      if (w.type === 'pomodoro' && !w.data.running) {
        var f = settings.defaultFocus * 60;
        var br = settings.defaultBreak * 60;
        var wasFocus = w.data.mode === 'focus';
        w.data.focusDuration = f;
        w.data.breakDuration = br;
        w.data.timeLeft = wasFocus ? f : br;
      }
    });
  });

  hideSettings();
  renderBoard();
  notify('Settings saved');
}
function exportData() {
  var data = JSON.stringify(state, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'grove-backup-'+dateKey(new Date())+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  notify('Data exported');
}
function importData() {
  var input = document.getElementById('importFileInput');
  if (!input) return;
  input.click();
}
function handleImportFile(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (data && Array.isArray(data.boards) && data.boards.every(function(b) {
        return b && typeof b.id === 'string' && typeof b.name === 'string' && Array.isArray(b.widgets);
      })) {
        state = data;
        saveState();
        renderSidebar();
        switchView('board');
        notify('Data imported successfully');
      } else {
        notify('Invalid backup file');
      }
    } catch (_) { notify('Invalid backup file'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ──── USER ACCOUNT ──── */
function getUser() {
  return AuthService ? AuthService.getUser() : null;
}

function setUser(u) {
  if (AuthService) AuthService._setSession(u);
}

function clearUser() {
  if (AuthService) AuthService.logOut();
}

function renderUserArea() {
  var area = document.getElementById('userArea');
  if (!area) return;
  var user = getUser();
  if (user && user.name) {
    var initials = user.name.split(' ').map(function (s) { return s[0]; }).join('').toUpperCase().slice(0, 2);
    area.innerHTML =
      '<div class="user-avatar" id="userAvatar">'+esc(initials)+'</div>' +
      '<span class="user-name" id="userName">'+esc(user.name)+'</span>' +
      '<div class="user-menu" id="userMenu">' +
        '<div class="user-menu-item" data-action="profile">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
          'Account</div>' +
        '<div class="dark-mode-toggle" id="darkModeToggle">' +
          '<span class="dark-mode-toggle-track"><span class="dark-mode-toggle-knob"></span></span>' +
          '<span style="font-size:13px;font-weight:500;color:var(--text-secondary);">Dark Mode</span>' +
        '</div>' +
        '<div class="user-menu-item danger" data-action="logout">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
          'Sign Out</div>' +
      '</div>';
  } else {
    area.innerHTML =
      '<button class="user-btn user-btn-login" id="btnLogin">Log in</button>' +
      '<button class="user-btn user-btn-signup" id="btnSignup">Sign Up</button>';
  }
}

function logout() {
  showConfirm('Sign out of Grove?', function () {
    clearUser();
    window.location.href = '../index.html';
  });
}

/* ──── PROFILE VIEW ──── */
function renderProfileView() {
  var user = getUser();
  if (!user) { notify('No account found'); return; }
  var menu = document.getElementById('userMenu');
  if (!menu) return;
  menu.innerHTML =
    '<div class="user-menu-profile">' +
      '<div class="user-menu-avatar">'+esc((user.name||'?')[0].toUpperCase())+'</div>' +
      '<div class="user-menu-name">'+esc(user.name)+'</div>' +
      '<div class="user-menu-email">'+esc(user.email)+'</div>' +
    '</div>' +
    '<div class="user-menu-item" data-action="back-profile" style="margin-top:8px;border-top:1px solid var(--border);padding-top:10px;">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>' +
      'Back</div>';
  menu.classList.add('open');
}

/* ──── WIDGET COLOR POPUP ──── */
function showWidgetColorPopup(e, widgetId) {
  e.stopPropagation();
  var existing = document.getElementById('widget-color-popup-'+widgetId);
  if (existing) { existing.remove(); return; }
  var popup = document.createElement('div');
  popup.id = 'widget-color-popup-'+widgetId;
  popup.className = 'widget-color-popup';
  var colors = ['#3b8c5a','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#6b7280','#a855f7'];
  var board = getActiveBoard();
  var w = board ? board.widgets.find(function (x) { return x.id === widgetId; }) : null;
  var current = w ? w.color : null;
  var html = '<div class="widget-color-popup-title">Accent Color</div><div class="color-picker">';
  colors.forEach(function (c) {
    var active = c === current ? ' active' : '';
    html += '<div class="color-swatch'+active+'" style="background:'+c+';" data-widget="'+widgetId+'" data-color="'+c+'"></div>';
  });
  html += '</div><button class="color-clear-btn" data-widget="'+widgetId+'">Clear</button>';
  popup.innerHTML = html;
  var body = document.querySelector('.widget[data-id="'+widgetId+'"] .widget-body');
  if (body) body.appendChild(popup);

  var closer = function (ev) {
    if (!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('click', closer); }
  };
  setTimeout(function () { document.addEventListener('click', closer); }, 10);
}

/* ──── DRAG & DROP: WIDGET REORDER ──── */
function initWidgetDrag() {
  var grid = document.getElementById('widgetGrid');
  if (!grid) return;

  document.addEventListener('dragstart', function (e) {
    var w = e.target.closest('.widget');
    if (!w) return;
    w.classList.add('dragging');
    e.dataTransfer.setData('text/plain', w.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragend', function (e) {
    document.querySelectorAll('.widget.dragging').forEach(function (el) { el.classList.remove('dragging'); });
    document.querySelectorAll('.widget-grid').forEach(function (el) { el.classList.remove('drag-over'); });
  });

  document.addEventListener('dragover', function (e) {
    var target = e.target.closest('.widget') || e.target.closest('.widget-grid');
    if (!target) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var g = target.closest('.widget-grid');
    if (g) g.classList.add('drag-over');
  });

  document.addEventListener('dragleave', function (e) {
    var g = e.target.closest('.widget-grid');
    if (g && !g.contains(e.relatedTarget)) g.classList.remove('drag-over');
  });

  document.addEventListener('drop', function (e) {
    var g = e.target.closest('.widget-grid');
    if (g) g.classList.remove('drag-over');

    var targetWidget = e.target.closest('.widget');
    var draggedId = e.dataTransfer.getData('text/plain');
    if (!targetWidget || !draggedId || draggedId === targetWidget.dataset.id) return;

    var board = getActiveBoard();
    if (!board) return;

    var fromIdx = board.widgets.findIndex(function (w) { return w.id === draggedId; });
    var toIdx = board.widgets.findIndex(function (w) { return w.id === targetWidget.dataset.id; });
    if (fromIdx === -1 || toIdx === -1) return;

    var moved = board.widgets.splice(fromIdx, 1)[0];
    board.widgets.splice(toIdx, 0, moved);
    saveState();
    renderBoard();
  });
}

/* ──── DRAG & DROP: KANBAN CARDS ──── */
function initKanbanDrag() {
  document.addEventListener('dragstart', function (e) {
    var card = e.target.closest('.kanban-card');
    if (!card) return;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', JSON.stringify({ widgetId: card.dataset.widget, itemId: card.dataset.item, fromStatus: card.dataset.status }));
    e.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragend', function (e) {
    document.querySelectorAll('.kanban-card.dragging').forEach(function (el) { el.classList.remove('dragging'); });
    document.querySelectorAll('.kanban-col.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
  });
  document.addEventListener('dragover', function (e) {
    var col = e.target.closest('.kanban-col');
    if (!col) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    col.classList.add('drag-over');
  });
  document.addEventListener('dragleave', function (e) {
    var col = e.target.closest('.kanban-col');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('drag-over');
  });
  document.addEventListener('drop', function (e) {
    document.querySelectorAll('.kanban-col.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
    var col = e.target.closest('.kanban-col');
    if (!col) return;
    var raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch(_) { return; }
    if (!data || !data.widgetId || !data.itemId || !data.fromStatus) return;
    var newStatus = col.dataset.col;
    if (newStatus === data.fromStatus) return;
    kanbanMoveItem(data.widgetId, data.itemId, newStatus);
  });
}

/* ──── BOARD CONTEXT MENU ──── */
function showBoardContextMenu(e, boardId) {
  e.preventDefault();
  var menu = document.getElementById('boardContextMenu');
  if (!menu) return;
  menu.style.display = 'block';
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
  menu.dataset.boardId = boardId;
}
function hideBoardContextMenu() {
  var menu = document.getElementById('boardContextMenu');
  if (menu) menu.style.display = 'none';
}

/* ──── MODAL: ADD WIDGET PICKER ──── */
function showWidgetPicker() {
  var overlay = document.getElementById('widgetPicker');
  if (overlay) overlay.classList.add('open');
}
function hideWidgetPicker() {
  var overlay = document.getElementById('widgetPicker');
  if (overlay) overlay.classList.remove('open');
}

/* ──── MODAL: NEW BOARD ──── */
function showNewBoardModal() {
  var overlay = document.getElementById('newBoardModal');
  if (overlay) overlay.classList.add('open');
  var inp = document.getElementById('newBoardName');
  if (inp) { inp.value = ''; setTimeout(function () { inp.focus(); }, 50); }
}
function hideNewBoardModal() {
  var overlay = document.getElementById('newBoardModal');
  if (overlay) overlay.classList.remove('open');
}

/* ──── EVENT BINDING ──── */
function bindEvents() {
  // Sidebar: board selection
  document.getElementById('boardList').addEventListener('click', function (e) {
    var item = e.target.closest('.sidebar-item');
    if (!item) return;
    state.activeBoardId = item.dataset.id;
    state.showStats = false;
    state.showTemplates = false;
    saveState();
    renderSidebar();
    switchView('board');
  });

  // Sidebar: right-click context menu
  document.getElementById('boardList').addEventListener('contextmenu', function (e) {
    var item = e.target.closest('.sidebar-item');
    if (!item) return;
    showBoardContextMenu(e, item.dataset.id);
  });

  // Right-click on empty board space → Add Widget
  document.getElementById('widgetGrid').addEventListener('contextmenu', function (e) {
    if (!e.target.closest('.widget')) {
      e.preventDefault();
      showWidgetPicker();
    }
  });

  // Context menu: close on outside click + handle actions (merged)
  document.addEventListener('click', function (e) {
    var menu = document.getElementById('boardContextMenu');
    var menuVisible = menu && menu.style.display !== 'none';

    // If clicking on a context menu item, handle action
    var ctxItem = e.target.closest('.board-context-item');
    if (ctxItem && menuVisible) {
      var boardId = menu.dataset.boardId;
      var action = ctxItem.dataset.action;
      if (!boardId) return;
      hideBoardContextMenu();
      if (action === 'delete') { deleteBoard(boardId); return; }
      if (action === 'rename') {
        var board = getBoard(boardId);
        if (!board) return;
        var name = prompt('Rename board:', board.name);
        if (name && name.trim()) { renameBoard(boardId, name.trim()); }
        return;
      }
      if (action === 'color' || action === 'icon') {
        var board = getBoard(boardId);
        if (!board) return;
        state.activeBoardId = boardId;
        state.showStats = false;
        state.showTemplates = false;
        var customizeOverlay = document.getElementById('boardCustomizeModal');
        var customizeTitle = document.getElementById('boardCustomizeTitle');
        if (customizeTitle) customizeTitle.textContent = 'Customize "'+esc(board.name)+'"';
        var swatches = document.querySelectorAll('#boardColorPicker .color-swatch');
        swatches.forEach(function (s) { s.classList.toggle('active', s.dataset.color === board.color); });
        var iconOptions = document.querySelectorAll('#boardIconPicker .board-icon-option');
        iconOptions.forEach(function (io) { io.classList.toggle('active', io.dataset.icon === (board.icon || 'default')); });
        if (customizeOverlay) {
          customizeOverlay.classList.add('open');
          customizeOverlay.dataset.boardId = boardId;
        }
        saveState();
        renderSidebar();
        switchView('board');
        return;
      }
      return;
    }

    // If clicking outside a visible context menu, close it
    if (menuVisible && !menu.contains(e.target)) {
      hideBoardContextMenu();
    }
  });

  // Sidebar: stats link
  document.querySelector('.sidebar-nav a[data-view="stats"]').addEventListener('click', function () {
    switchView('stats');
  });

  // Sidebar: templates link
  document.querySelector('.sidebar-nav a[data-view="templates"]').addEventListener('click', function () {
    switchView('templates');
  });

  // New board
  document.getElementById('newBoardBtn').addEventListener('click', showNewBoardModal);
  document.getElementById('newBoardConfirm').addEventListener('click', function () {
    var inp = document.getElementById('newBoardName');
    if (inp && inp.value.trim()) { createBoard(inp.value.trim()); hideNewBoardModal(); }
  });
  document.getElementById('newBoardCancel').addEventListener('click', hideNewBoardModal);
  document.getElementById('newBoardModal').addEventListener('click', function (e) {
    if (e.target === this) hideNewBoardModal();
  });
  document.getElementById('newBoardName').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('newBoardConfirm').click();
  });

  // Delete board
  document.getElementById('deleteBoardBtn').addEventListener('click', function () {
    if (state.activeBoardId) deleteBoard(state.activeBoardId);
  });

  // Add widget
  document.getElementById('addWidgetBtn').addEventListener('click', showWidgetPicker);
  document.getElementById('widgetPicker').addEventListener('click', function (e) {
    var item = e.target.closest('.picker-item');
    if (item) { addWidget(item.dataset.type); hideWidgetPicker(); }
    if (e.target === this) hideWidgetPicker();
  });

  // Board title rename (delegated)
  document.addEventListener('change', function (e) {
    var title = e.target.closest('#boardTitle.board-title-edit');
    if (title && state.activeBoardId) {
      renameBoard(state.activeBoardId, title.value);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var title = e.target.closest('#boardTitle.board-title-edit');
      if (title) { title.blur(); }
    }
  });

  // Templates: click to apply
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.template-card');
    if (card) { applyTemplate(card.dataset.template); return; }
  });

    // Widget actions (delegated)
  document.addEventListener('click', function (e) {
    // Remove widget
    var removeBtn = e.target.closest('.remove-btn');
    if (removeBtn) { removeWidget(removeBtn.dataset.id); return; }

    // Resize widget
    var resizeBtn = e.target.closest('.resize-btn');
    if (resizeBtn) { resizeWidget(resizeBtn.dataset.id); return; }

    // Kanban: add
    var kanbanAdd = e.target.closest('.kanban-add-btn');
    if (kanbanAdd) { addTodoItem(kanbanAdd.dataset.widget); return; }

    // Kanban: card click (toggle status)
    var kanbanCard = e.target.closest('.kanban-card');
    if (kanbanCard && !e.target.closest('.kanban-card-delete')) {
      toggleTodoItem(kanbanCard.dataset.widget, kanbanCard.dataset.item);
      return;
    }

    // Kanban: delete
    var kanbanDel = e.target.closest('.kanban-card-delete');
    if (kanbanDel) { deleteTodoItem(kanbanDel.dataset.widget, kanbanDel.dataset.item); return; }

    // Kanban: add on Enter is handled in keydown

    // Pomodoro: start/pause/reset
    var pomoBtn = e.target.closest('.pomo-btn');
    if (pomoBtn) {
      var action = pomoBtn.dataset.action;
      var wid = pomoBtn.dataset.widget;
      if (action === 'start') pomoStart(wid);
      else if (action === 'pause') pomoPause(wid);
      else if (action === 'reset') pomoReset(wid);
      return;
    }

    // Focus Timer: start/stop/reset
    var ftBtn = e.target.closest('.ft-btn');
    if (ftBtn) {
      var action = ftBtn.dataset.action;
      var wid = ftBtn.dataset.widget;
      if (action === 'start') focusTimerStart(wid);
      else if (action === 'stop') focusTimerStop(wid);
      else if (action === 'reset') focusTimerReset(wid);
      return;
    }

    // Habits: add
    var habitAdd = e.target.closest('.habit-add-btn');
    if (habitAdd) { addHabit(habitAdd.dataset.widget); return; }

    // Habits: toggle
    var habitCheck = e.target.closest('.habit-check');
    if (habitCheck) { toggleHabit(habitCheck.dataset.widget, habitCheck.dataset.habit); return; }

    // Habits: delete
    var habitDel = e.target.closest('.habit-delete');
    if (habitDel) { deleteHabit(habitDel.dataset.widget, habitDel.dataset.habit); return; }

    // Links: add
    var linkAdd = e.target.closest('.link-add-btn');
    if (linkAdd) { addLink(linkAdd.dataset.widget); return; }

    // Links: delete
    var linkDel = e.target.closest('.link-delete');
    if (linkDel) { deleteLink(linkDel.dataset.widget, linkDel.dataset.link); return; }

    // Calendar: nav
    var calNav = e.target.closest('.cal-nav');
    if (calNav) { calendarNav(calNav.dataset.widget, parseInt(calNav.dataset.dir)); return; }

    // Calendar: event popup close
    var calPopupClose = e.target.closest('.cal-event-popup-close');
    if (calPopupClose) { document.getElementById('calendarEventPopup').style.display = 'none'; return; }

    // Calendar: event save
    var calEventSave = e.target.closest('.cal-event-save');
    if (calEventSave) { calendarAddEvent(calEventSave.dataset.widget, calEventSave.dataset.date); return; }

    // Calendar: event delete
    var calEventDelete = e.target.closest('.cal-event-delete');
    if (calEventDelete) { calendarDeleteEvent(calEventDelete.dataset.widget, calEventDelete.dataset.date, calEventDelete.dataset.event); return; }

    // Calendar: day click → show event popup
    var calDay = e.target.closest('.calendar-day:not(.other-month)');
    if (calDay && calDay.dataset.widget && calDay.dataset.date) {
      calendarShowEventPopup(calDay.dataset.widget, calDay.dataset.date);
      return;
    }

    // Widget: color button
    var wColorBtn = e.target.closest('.widget-color-btn');
    if (wColorBtn) { showWidgetColorPopup(e, wColorBtn.dataset.id); return; }

    // Widget: color swatch (in widget color popup)
    var wSwatch = e.target.closest('.color-swatch[data-widget]');
    if (wSwatch) {
      changeWidgetColor(wSwatch.dataset.widget, wSwatch.dataset.color);
      var pup = document.getElementById('widget-color-popup-'+wSwatch.dataset.widget);
      if (pup) pup.remove();
      return;
    }

    // Widget: color clear
    var wClear = e.target.closest('.color-clear-btn');
    if (wClear) {
      changeWidgetColor(wClear.dataset.widget, null);
      var pup2 = document.getElementById('widget-color-popup-'+wClear.dataset.widget);
      if (pup2) pup2.remove();
      return;
    }

    // Pomodoro: inline settings toggle
    var pomoSettingsBtn = e.target.closest('.pomo-settings-btn');
    if (pomoSettingsBtn) { pomoToggleSettings(pomoSettingsBtn.dataset.id); return; }

    // Pomodoro: inline settings save
    var pomoInlineSave = e.target.closest('.pomo-inline-save');
    if (pomoInlineSave) { pomoSaveSettings(pomoInlineSave.dataset.id); return; }

    // Pomodoro: inline settings cancel
    var pomoInlineCancel = e.target.closest('.pomo-inline-cancel');
    if (pomoInlineCancel) {
      var pnl = document.getElementById('pomo-inline-settings-'+pomoInlineCancel.dataset.id);
      if (pnl) pnl.style.display = 'none';
      return;
    }

    // Resources: add category
    var resCatAdd = e.target.closest('.resource-cat-add-btn');
    if (resCatAdd) { addResourceCategory(resCatAdd.dataset.widget); return; }

    // Resources: add item
    var resItemAdd = e.target.closest('.resource-add-btn');
    if (resItemAdd) { addResourceItem(resItemAdd.dataset.widget, resItemAdd.dataset.cat); return; }

    // Resources: delete category
    var resCatDel = e.target.closest('.resource-cat-delete');
    if (resCatDel) { deleteResourceCategory(resCatDel.dataset.widget, resCatDel.dataset.cat); return; }

    // Resources: delete item
    var resItemDel = e.target.closest('.resource-item-delete');
    if (resItemDel) { deleteResourceItem(resItemDel.dataset.widget, resItemDel.dataset.cat, resItemDel.dataset.item); return; }

    // Daily Goals: add
    var dgAdd = e.target.closest('.daily-goal-add-btn');
    if (dgAdd) { addDailyGoal(dgAdd.dataset.widget); return; }
    // Daily Goals: toggle
    var dgCheck = e.target.closest('.daily-goal-check');
    if (dgCheck) { toggleDailyGoal(dgCheck.dataset.widget, dgCheck.dataset.goal); return; }
    // Daily Goals: delete
    var dgDel = e.target.closest('.daily-goal-delete');
    if (dgDel) { deleteDailyGoal(dgDel.dataset.widget, dgDel.dataset.goal); return; }

    // Progress Tracker: add
    var progAdd = e.target.closest('.progress-add-btn');
    if (progAdd) { addProgressItem(progAdd.dataset.widget); return; }
    // Progress Tracker: delete
    var progDel = e.target.closest('.progress-item .progress-delete');
    if (progDel) { deleteProgressItem(progDel.dataset.widget, progDel.dataset.item); return; }

    // User area: login/signup/logout
    var loginBtn = e.target.closest('#btnLogin');
    if (loginBtn) { window.location.href = '../pages/login.html'; return; }
    var signupBtn = e.target.closest('#btnSignup');
    if (signupBtn) { window.location.href = '../pages/signup.html'; return; }

    // User avatar/menu toggle
    var avatar = e.target.closest('#userAvatar');
    var userNameEl = e.target.closest('#userName');
    if (avatar || userNameEl) {
      var menu = document.getElementById('userMenu');
      if (menu) menu.classList.toggle('open');
      return;
    }

    // User menu items
    var menuItem = e.target.closest('.user-menu-item');
    if (menuItem) {
      var action = menuItem.dataset.action;
      var m = document.getElementById('userMenu');
      if (action === 'logout') { logout(); if (m) m.classList.remove('open'); return; }
      if (action === 'settings') { showSettings(); if (m) m.classList.remove('open'); return; }
      if (action === 'profile') { renderProfileView(); if (m) m.classList.remove('open'); return; }
      if (action === 'back-profile') { renderUserArea(); return; }
    }

    // Dark mode toggle in user menu
    var darkToggle = e.target.closest('#darkModeToggle');
    if (darkToggle) {
      state.darkMode = !state.darkMode;
      applyDarkMode();
      saveState();
      return;
    }

    // Close user menu when clicking outside
    var userMenu = document.getElementById('userMenu');
    if (userMenu && userMenu.classList.contains('open') && !e.target.closest('#userArea')) {
      userMenu.classList.remove('open');
    }
  });

  // Enter key on inputs
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var target = e.target;
    if (target.matches('.kanban-add input')) {
      var wid = target.dataset.widget;
      if (wid) { addTodoItem(wid); e.preventDefault(); }
    }
    if (target.matches('.habit-add input')) {
      var wid = target.dataset.widget;
      if (wid) { addHabit(wid); e.preventDefault(); }
    }
    if (target.matches('.link-url-input')) {
      var wid = target.dataset.widget;
      if (wid) { addLink(wid); e.preventDefault(); }
    }
    if (target.matches('.resource-name-input') || target.matches('.resource-url-input')) {
      var wid = target.dataset.widget;
      var cat = target.dataset.cat;
      if (wid && cat) { addResourceItem(wid, cat); e.preventDefault(); }
    }
    if (target.matches('.resource-cat-input')) {
      var wid = target.dataset.widget;
      if (wid) { addResourceCategory(wid); e.preventDefault(); }
    }
    if (target.matches('.daily-goal-add input')) {
      var wid = target.dataset.widget;
      if (wid) { addDailyGoal(wid); e.preventDefault(); }
    }
    if (target.matches('.progress-name-input') || target.matches('.progress-pct-input')) {
      var wid = target.dataset.widget;
      if (wid) { addProgressItem(wid); e.preventDefault(); }
    }
  });

  // Auto-save on input (notes + text)
  document.addEventListener('input', function (e) {
    var ta = e.target.closest('.notes-textarea');
    if (ta && ta.dataset.widget) notesUpdate(ta.dataset.widget);
    var te = e.target.closest('.text-widget-content');
    if (te && te.dataset.widget) textUpdate(te.dataset.widget);
  });

  // Stats filter
  document.getElementById('statsFilter').addEventListener('change', renderStats);

  // Pomodoro config modal
  document.getElementById('pomoConfigConfirm').addEventListener('click', confirmPomodoroConfig);
  document.getElementById('pomoConfigCancel').addEventListener('click', hidePomodoroConfig);
  document.getElementById('pomodoroConfigModal').addEventListener('click', function (e) {
    if (e.target === this) hidePomodoroConfig();
  });
  // Pomodoro preset buttons
  document.querySelectorAll('.pomo-config-presets button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = document.getElementById('pomoFocusDuration');
      var b = document.getElementById('pomoBreakDuration');
      if (f) f.value = this.dataset.focus;
      if (b) b.value = this.dataset.break;
    });
  });
  // Pomodoro config: enter key
  document.getElementById('pomoFocusDuration').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('pomoConfigConfirm').click();
  });
  document.getElementById('pomoBreakDuration').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('pomoConfigConfirm').click();
  });

  // Settings modal
  var settingsConfirm = document.getElementById('settingsConfirm');
  var settingsCancel = document.getElementById('settingsCancel');
  var settingsModal = document.getElementById('settingsModal');
  if (settingsConfirm) settingsConfirm.addEventListener('click', confirmSettings);
  if (settingsCancel) settingsCancel.addEventListener('click', hideSettings);
  if (settingsModal) {
    settingsModal.addEventListener('click', function (e) {
      if (e.target === this) hideSettings();
    });
  }

  // Theme picker
  document.querySelectorAll('#themePicker .theme-option').forEach(function (opt) {
    opt.addEventListener('click', function () {
      applyTheme(this.dataset.theme);
      notify('Theme: ' + (this.dataset.theme === 'default' ? 'Default' : this.dataset.theme));
    });
  });

  // Board customize modal
  var boardCustomizeModal = document.getElementById('boardCustomizeModal');
  var boardCustomizeSave = document.getElementById('boardCustomizeSave');
  var boardCustomizeCancel = document.getElementById('boardCustomizeCancel');
  if (boardCustomizeCancel) {
    boardCustomizeCancel.addEventListener('click', function () {
      if (boardCustomizeModal) boardCustomizeModal.classList.remove('open');
    });
  }
  if (boardCustomizeModal) {
    boardCustomizeModal.addEventListener('click', function (e) {
      if (e.target === this) this.classList.remove('open');
    });
  }
  if (boardCustomizeSave) {
    boardCustomizeSave.addEventListener('click', function () {
      var boardId = boardCustomizeModal ? boardCustomizeModal.dataset.boardId : null;
      if (!boardId) return;
      var board = getBoard(boardId);
      if (!board) return;
      var activeSwatch = document.querySelector('#boardColorPicker .color-swatch.active');
      if (activeSwatch) board.color = activeSwatch.dataset.color;
      var activeIcon = document.querySelector('#boardIconPicker .board-icon-option.active');
      if (activeIcon) board.icon = activeIcon.dataset.icon;
      saveState();
      renderSidebar();
      if (boardId === state.activeBoardId) renderBoard();
      if (boardCustomizeModal) boardCustomizeModal.classList.remove('open');
      notify('Board updated');
    });
  }
  // Color/icon picker selection
  document.addEventListener('click', function (e) {
    var swatch = e.target.closest('#boardColorPicker .color-swatch');
    if (swatch) {
      document.querySelectorAll('#boardColorPicker .color-swatch').forEach(function (s) { s.classList.remove('active'); });
      swatch.classList.add('active');
      return;
    }
    var iconOpt = e.target.closest('#boardIconPicker .board-icon-option');
    if (iconOpt) {
      document.querySelectorAll('#boardIconPicker .board-icon-option').forEach(function (o) { o.classList.remove('active'); });
      iconOpt.classList.add('active');
      return;
    }
  });

  // AI Workspace modal
  var aiModal = document.getElementById('aiWorkspaceModal');
  var aiClose = document.getElementById('aiWorkspaceClose');
  if (aiClose && aiModal) {
    aiClose.addEventListener('click', function () { aiModal.classList.remove('open'); });
  }
  if (aiModal) {
    aiModal.addEventListener('click', function (e) {
      if (e.target === this) this.classList.remove('open');
    });
  }

  // Export / Import
  var exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  var importBtn = document.getElementById('importDataBtn');
  if (importBtn) importBtn.addEventListener('click', importData);
  var importInput = document.getElementById('importFileInput');
  if (importInput) importInput.addEventListener('change', handleImportFile);

  // Settings: Enter key on inputs
  var setFocus = document.getElementById('settingsDefaultFocus');
  var setBreak = document.getElementById('settingsDefaultBreak');
  if (setFocus) setFocus.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && settingsConfirm) settingsConfirm.click();
  });
  if (setBreak) setBreak.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && settingsConfirm) settingsConfirm.click();
  });

  // Image: upload link click
  document.addEventListener('click', function (e) {
    var link = e.target.closest('.image-upload-link');
    if (link) {
      e.preventDefault();
      var input = document.querySelector('.image-file-input[data-widget="'+link.dataset.widget+'"]');
      if (input) input.click();
      return;
    }
  });

  // Image: file input change (delegated)
  document.addEventListener('change', function (e) {
    var inp = e.target.closest('.image-file-input');
    if (inp && inp.files && inp.files[0]) {
      imageUpload(inp.dataset.widget, inp.files[0]);
      inp.value = '';
    }
  });

  // Image: drag & drop on board
  var widgetGrid = document.getElementById('widgetGrid');
  if (widgetGrid) {
    widgetGrid.addEventListener('dragover', function (e) {
      if (e.dataTransfer.types && Array.from(e.dataTransfer.types).indexOf('Files') !== -1) {
        e.preventDefault();
        widgetGrid.classList.add('drag-over');
      }
    });
    widgetGrid.addEventListener('dragleave', function (e) {
      if (!widgetGrid.contains(e.relatedTarget)) widgetGrid.classList.remove('drag-over');
    });
    widgetGrid.addEventListener('drop', function (e) {
      widgetGrid.classList.remove('drag-over');
      if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
      var files = Array.from(e.dataTransfer.files).filter(function (f) { return f.type.startsWith('image/'); });
      if (files.length === 0) return;
      e.preventDefault();
      files.forEach(function (f) {
        var reader = new FileReader();
        reader.onload = function (ev) { createImageWidgetFromData(ev.target.result, f.name); };
        reader.readAsDataURL(f);
      });
    });
  }

  // Image: paste support (Ctrl+V)
  document.addEventListener('paste', function (e) {
    var items = Array.from(e.clipboardData.items || []);
    var imageItem = items.find(function (it) { return it.type && it.type.startsWith('image/'); });
    if (!imageItem) return;
    // Don't intercept if focus is in an input
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    var file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    var reader = new FileReader();
    reader.onload = function (ev) { createImageWidgetFromData(ev.target.result, 'Pasted image'); };
    reader.readAsDataURL(file);
  });

  // Mobile menu toggle
  var mobileToggle = document.getElementById('mobileMenuBtn');
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (mobileToggle && sidebar && overlay) {
    mobileToggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
    overlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
}

/* ──── INIT ──── */
function init() {
  loadState();

  // Ensure at least one board
  if (state.boards.length === 0) {
    state.boards.push({
      id: uid(), name: 'My Board', color: '#3b8c5a', widgets: []
    });
    state.activeBoardId = state.boards[0].id;
    state.showStats = false;
    state.showTemplates = false;
    saveState();
  }

  // If no active board, pick first
  if (!state.activeBoardId && state.boards.length > 0) {
    state.activeBoardId = state.boards[0].id;
  }

  // Migrate stored data: fix todo widgets that still have small size
  state.boards.forEach(function (b) {
    b.widgets.forEach(function (w) {
      if (w.type === 'todo' && w.size === 'small') w.size = 'medium';
      if (w.type && !w.data) w.data = widgetDefaults(w.type);
    });
  });

  applyDarkMode();
  applyTheme(state.theme);
  bindEvents();
  renderSidebar();
  renderUserArea();
  switchView(state.showStats ? 'stats' : 'board');
  initWidgetDrag();
  initKanbanDrag();

  notify('Welcome to Grove');
}

document.addEventListener('DOMContentLoaded', init);
