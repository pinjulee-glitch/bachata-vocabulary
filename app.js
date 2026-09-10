(function(){
  let categories = [];
  let currentQuery = '';
  let currentFilter = 'all';
  const openCats = new Set();
  const saveTimers = {};

  let profile = null;
  let learned = {};
  let focusMoves = {};

  const catsEl = document.getElementById('categories');
  const searchEl = document.getElementById('search');
  const noResultsEl = document.getElementById('noResults');

  function uid(prefix){
    return prefix + '-' + Math.random().toString(36).slice(2, 9);
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function plusIconSvg(){
    return '<svg class="plus-icon" viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  }
  function playIconSvg(){
    return '<svg class="play-icon" viewBox="0 0 24 24" width="14" height="14"><path d="M5 3l16 9-16 9V3z"/></svg>';
  }
  function openIconSvg(){
    return '<svg class="open-icon" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';
  }

  // ---- Video resolution ----
  // Every clip is stored either as a Google Drive file id (driveId) or a
  // generic videoUrl. Real pages (unlike a sandboxed Claude artifact) are
  // allowed to load external images/iframes, so Drive/YouTube/Vimeo clips
  // embed and play right on the page — nothing needs to be downloaded or
  // baked into this file ahead of time.
  function driveIdFromUrl(url){
    let m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if(m) return m[1];
    m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if(m) return m[1];
    return null;
  }

  function resolveVideo(mv){
    if(mv.driveId){
      return {
        kind: 'drive',
        thumb: `https://drive.google.com/thumbnail?id=${mv.driveId}&sz=w400`,
        embedUrl: `https://drive.google.com/file/d/${mv.driveId}/preview`,
        viewUrl: `https://drive.google.com/file/d/${mv.driveId}/view`
      };
    }
    const url = mv.videoUrl;
    if(!url) return null;

    if(/drive\.google\.com/.test(url)){
      const id = driveIdFromUrl(url);
      if(id) return { kind: 'drive', thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w400`, embedUrl: `https://drive.google.com/file/d/${id}/preview`, viewUrl: `https://drive.google.com/file/d/${id}/view` };
    }
    let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    if(m) return { kind: 'embed', embedUrl: `https://www.youtube.com/embed/${m[1]}`, thumb: `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`, source: 'YouTube' };
    m = url.match(/vimeo\.com\/(\d+)/);
    if(m) return { kind: 'embed', embedUrl: `https://player.vimeo.com/video/${m[1]}`, source: 'Vimeo' };
    if(/instagram\.com/.test(url)) return { kind: 'link', href: url, source: 'Instagram' };
    return { kind: 'link', href: url, source: 'Link' };
  }

  // What to store on the move object for a freshly pasted link.
  function videoFieldsFromInput(raw){
    const url = raw.trim();
    if(!url) return { driveId: null, videoUrl: null };
    if(/drive\.google\.com/.test(url)){
      const id = driveIdFromUrl(url);
      if(id) return { driveId: id, videoUrl: null };
    }
    return { driveId: null, videoUrl: url };
  }

  function inputValueFor(mv){
    if(mv.driveId) return `https://drive.google.com/file/d/${mv.driveId}/view`;
    return mv.videoUrl || '';
  }

  function paintPreview(li, preview, mv){
    const info = resolveVideo(mv);
    if(!info){
      li.classList.remove('has-video');
      preview.innerHTML = `<span class="clip-placeholder">${plusIconSvg()}</span>`;
      return;
    }
    li.classList.add('has-video');
    const embed = () => {
      preview.innerHTML = `<iframe class="clip-frame" src="${info.embedUrl}" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>`;
    };
    if(info.kind === 'drive'){
      // Drive's embeddable iframe has proven unreliable across devices
      // (renders as a black box on iOS Safari, sometimes errors outright
      // elsewhere). Show a looping GIF preview instead — nothing to load
      // or fail — and open the full clip in Drive's own viewer on tap.
      preview.innerHTML = `
        <a class="clip-thumb-btn" href="${info.viewUrl}" target="_blank" rel="noopener noreferrer" title="Open clip in Drive">
          <img class="clip-thumb-img" src="gifs/${mv.id}.gif" loading="lazy" alt="" onerror="this.onerror=null;this.src='${info.thumb}';">
          <span class="play-badge">${openIconSvg()}</span>
        </a>`;
    } else if(info.kind === 'embed' && info.thumb){
      preview.innerHTML = `
        <button type="button" class="clip-thumb-btn" title="Play clip">
          <img class="clip-thumb-img" src="${info.thumb}" loading="lazy" alt="">
          <span class="play-badge">${playIconSvg()}</span>
        </button>`;
      preview.querySelector('.clip-thumb-btn').addEventListener('click', embed);
    } else if(info.kind === 'embed'){
      preview.innerHTML = `
        <button type="button" class="clip-link" title="Play clip">
          <span class="play-badge">${playIconSvg()}</span>
          <span class="clip-source">${escapeHtml(info.source)}</span>
        </button>`;
      preview.querySelector('.clip-link').addEventListener('click', embed);
    } else {
      preview.innerHTML = `<a class="clip-link" href="${info.href}" target="_blank" rel="noopener noreferrer"><span class="play-badge">${playIconSvg()}</span><span class="clip-source">${escapeHtml(info.source)}</span></a>`;
    }
  }

  // ---- Practice profile (self-picked name, not a real account) ----
  function loadProfile(){
    try{
      const s = localStorage.getItem('bachata-profile');
      return s ? JSON.parse(s) : null;
    }catch(e){ return null; }
  }
  function loadKnownProfiles(){
    try{
      const s = localStorage.getItem('bachata-known-profiles');
      return s ? JSON.parse(s) : [];
    }catch(e){ return []; }
  }
  function saveKnownProfile(p){
    const known = loadKnownProfiles();
    const i = known.findIndex(k => k.id === p.id);
    if(i >= 0) known[i] = p; else known.push(p);
    try{ localStorage.setItem('bachata-known-profiles', JSON.stringify(known)); }catch(e){}
  }

  function totalMoveCount(){
    return categories.reduce((n, c) => n + c.moves.length, 0);
  }
  function learnedCount(){
    return Object.values(learned).filter(Boolean).length;
  }

  function switchToProfile(id, name){
    profile = { id, name: name.trim() };
    try{ localStorage.setItem('bachata-profile', JSON.stringify(profile)); }catch(e){}
    saveKnownProfile(profile);
    connectProgress();
    renderProfileBar();
  }

  function setProfile(name){
    const trimmed = name.trim();
    const match = loadKnownProfiles().find(p => p.name.toLowerCase() === trimmed.toLowerCase());
    const id = match ? match.id : uid('u');
    switchToProfile(id, trimmed);
  }

  function connectProgress(){
    if(!profile) return;
    Backend.watchProgress(profile.id, (data) => {
      learned = (data && data.learned) || {};
      focusMoves = (data && data.focus) || {};
      renderProfileBar();
      repaintAllLearned();
      repaintAllFocus();
      applySearch();
    });
  }

  function toggleLearned(moveId){
    if(!profile){ openProfileForm(); return; }
    const next = !learned[moveId];
    learned[moveId] = next;
    Backend.updateProgress(profile.id, { learned: { [moveId]: next } });
    paintLearnedById(moveId);
    renderProfileBar();
    applySearch();
  }
  function toggleFocus(moveId){
    if(!profile){ openProfileForm(); return; }
    const next = !focusMoves[moveId];
    focusMoves[moveId] = next;
    Backend.updateProgress(profile.id, { focus: { [moveId]: next } });
    paintFocusById(moveId);
    applySearch();
  }

  function paintLearnedById(moveId){
    const li = catsEl.querySelector(`.move[data-id="${moveId}"]`);
    if(!li) return;
    const btn = li.querySelector('.learned-toggle');
    if(!btn) return;
    const isLearned = !!learned[moveId];
    btn.classList.toggle('is-learned', isLearned);
    btn.querySelector('span').textContent = isLearned ? 'Learned' : 'Mark as learned';
  }
  function repaintAllLearned(){
    catsEl.querySelectorAll('.move[data-id]').forEach(li => paintLearnedById(li.dataset.id));
  }
  function paintFocusById(moveId){
    const li = catsEl.querySelector(`.move[data-id="${moveId}"]`);
    if(!li) return;
    const btn = li.querySelector('.focus-toggle');
    if(!btn) return;
    const isFocus = !!focusMoves[moveId];
    btn.classList.toggle('is-focus', isFocus);
    btn.title = isFocus ? 'Remove from focus' : 'Focus on this move';
  }
  function repaintAllFocus(){
    catsEl.querySelectorAll('.move[data-id]').forEach(li => paintFocusById(li.dataset.id));
  }

  function openProfileForm(){
    const form = document.getElementById('profileForm');
    const row = document.getElementById('profileRow');
    if(!form) return;
    closeProfileSwitchMenu();
    form.classList.remove('is-hidden');
    if(row) row.classList.add('is-hidden');
    const input = document.getElementById('profileNameInput');
    input.value = '';
    input.focus();
  }
  function closeProfileForm(){
    const form = document.getElementById('profileForm');
    const row = document.getElementById('profileRow');
    if(form) form.classList.add('is-hidden');
    if(row) row.classList.remove('is-hidden');
  }
  function closeProfileSwitchMenu(){
    const menu = document.getElementById('profileSwitchMenu');
    if(menu) menu.classList.add('is-hidden');
  }
  document.addEventListener('click', closeProfileSwitchMenu);

  function renderProfileBar(){
    const row = document.getElementById('profileRow');
    if(!row) return;
    if(profile){
      const total = totalMoveCount();
      const done = learnedCount();
      const pct = total ? Math.round((done / total) * 100) : 0;
      const known = loadKnownProfiles();
      const menuItems = known.map(p => `
        <button type="button" class="profile-switch-option${p.id === profile.id ? ' is-current' : ''}" data-id="${p.id}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>
      `).join('');
      row.innerHTML = `
        <div class="profile-text">
          Practicing as <strong>${escapeHtml(profile.name)}</strong>
          <span class="profile-count">· ${done}/${total} moves learned</span>
        </div>
        <div class="profile-switcher">
          <button type="button" class="profile-btn" id="switchProfileBtn">
            Switch friend
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div class="profile-switch-menu is-hidden" id="profileSwitchMenu">
            ${menuItems}
            <button type="button" class="profile-switch-add" id="addPersonBtn">+ Add new person</button>
          </div>
        </div>
      `;
      const track = document.getElementById('progressTrack');
      if(track) track.style.width = pct + '%';

      document.getElementById('switchProfileBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('profileSwitchMenu').classList.toggle('is-hidden');
      });
      row.querySelectorAll('.profile-switch-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeProfileSwitchMenu();
          if(btn.dataset.id === profile.id) return;
          switchToProfile(btn.dataset.id, btn.dataset.name);
        });
      });
      document.getElementById('addPersonBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        openProfileForm();
      });
    } else {
      row.innerHTML = `
        <div class="profile-text">Set your name to track which moves you've learned</div>
        <button type="button" class="profile-btn" id="changeNameBtn">Set your name</button>
      `;
      document.getElementById('changeNameBtn').addEventListener('click', openProfileForm);
    }
  }

  document.getElementById('profileCancelBtn').addEventListener('click', closeProfileForm);
  document.getElementById('profileSaveBtn').addEventListener('click', () => {
    const nameInput = document.getElementById('profileNameInput');
    const name = nameInput.value.trim();
    if(!name){ nameInput.focus(); return; }
    setProfile(name);
    closeProfileForm();
  });
  document.getElementById('profileNameInput').addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); document.getElementById('profileSaveBtn').click(); }
    if(e.key === 'Escape'){ closeProfileForm(); }
  });

  // ---- Structure CRUD ----
  function persistStructure(){
    Backend.setStructure(categories);
  }

  function addCategory(title){
    const cat = { id: uid('cat'), title: title.trim(), moves: [] };
    categories.push(cat);
    openCats.add(cat.id);
    persistStructure();
    renderAll();
  }
  function renameCategory(catId, title){
    const cat = categories.find(c => c.id === catId);
    if(!cat) return;
    cat.title = title.trim();
    persistStructure();
    renderAll();
  }
  function moveCategory(catId, direction){
    const idx = categories.findIndex(c => c.id === catId);
    if(idx === -1) return;
    const swapWith = idx + direction;
    if(swapWith < 0 || swapWith >= categories.length) return;
    const [cat] = categories.splice(idx, 1);
    categories.splice(swapWith, 0, cat);
    persistStructure();
    renderAll();
  }
  function editMoveDetails(catId, moveId, title, note){
    const cat = categories.find(c => c.id === catId);
    if(!cat) return;
    const mv = cat.moves.find(m => m.id === moveId);
    if(!mv) return;
    mv.title = title.trim();
    mv.note = (note || '').trim();
    persistStructure();
    renderAll();
  }
  function addMove(catId, title, note){
    const cat = categories.find(c => c.id === catId);
    if(!cat) return;
    cat.moves.push({ id: uid('mv'), title: title.trim(), note: (note || '').trim() });
    openCats.add(catId);
    persistStructure();
    renderAll();
  }
  function relocateMove(moveId, fromCatId, toCatId){
    const fromCat = categories.find(c => c.id === fromCatId);
    const toCat = categories.find(c => c.id === toCatId);
    if(!fromCat || !toCat) return;
    const idx = fromCat.moves.findIndex(m => m.id === moveId);
    if(idx === -1) return;
    const [mv] = fromCat.moves.splice(idx, 1);
    toCat.moves.push(mv);
    openCats.add(toCatId);
    persistStructure();
    renderAll();
  }
  function deleteMove(catId, moveId){
    const cat = categories.find(c => c.id === catId);
    if(!cat) return;
    const idx = cat.moves.findIndex(m => m.id === moveId);
    if(idx === -1) return;
    cat.moves.splice(idx, 1);
    openCats.add(catId);
    persistStructure();
    renderAll();
  }
  function saveVideoLink(catId, moveId, rawUrl, li, preview, syncNote){
    const cat = categories.find(c => c.id === catId);
    if(!cat) return;
    const mv = cat.moves.find(m => m.id === moveId);
    if(!mv) return;
    const fields = videoFieldsFromInput(rawUrl);
    mv.driveId = fields.driveId;
    mv.videoUrl = fields.videoUrl;
    paintPreview(li, preview, mv);
    li.classList.toggle('has-video', !!(mv.driveId || mv.videoUrl));
    persistStructure();
    if(syncNote){
      syncNote.textContent = 'Saved';
      syncNote.classList.add('show');
      clearTimeout(syncNote.__hideTimer);
      syncNote.__hideTimer = setTimeout(() => syncNote.classList.remove('show'), 1200);
    }
  }

  function findMoveById(id){
    for(const cat of categories){
      const mv = cat.moves.find(m => m.id === id);
      if(mv) return mv;
    }
    return null;
  }

  // ---- Rendering ----
  function closeAllMoveToMenus(){
    document.querySelectorAll('.move-to-menu').forEach(m => m.classList.add('is-hidden'));
  }
  document.addEventListener('click', closeAllMoveToMenus);

  function buildMoveEl(mv, cat){
    const li = document.createElement('li');
    li.className = 'move';
    li.dataset.id = mv.id;
    li.dataset.title = mv.title.toLowerCase();

    const noteHtml = mv.note
      ? `<p class="move-note">${escapeHtml(mv.note).replace(/\n/g, '<br>')}</p>`
      : '<p class="move-note"></p>';

    const otherCats = categories.filter(c => c.id !== cat.id);
    const optionsHtml = otherCats.map(c => `<button type="button" class="move-to-option" data-target="${c.id}">${escapeHtml(c.title)}</button>`).join('');

    li.innerHTML = `
      <div class="clip-wrap">
        <div class="clip-preview"><span class="clip-placeholder">${plusIconSvg()}</span></div>
        <button type="button" class="focus-toggle" title="Focus on this move">
          <svg class="star-icon" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l3.09 6.63L22 10.1l-5 5.05L18.18 22 12 18.53 5.82 22 7 15.15l-5-5.05 6.91-.97L12 2.5z"/></svg>
        </button>
      </div>
      <div class="move-info">
        <div class="move-display">
          <div class="move-title-row">
            <span class="move-title">${escapeHtml(mv.title)}</span>
            <button type="button" class="move-edit-btn" title="Edit move">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
          </div>
          <p class="move-category">${escapeHtml(cat.title)}</p>
          ${noteHtml}
        </div>
        <div class="move-edit-form add-form is-hidden">
          <input type="text" class="edit-title-input" placeholder="Move name…" autocomplete="off">
          <textarea class="edit-note-input" placeholder="Cue / description (optional)" rows="2"></textarea>
          <div class="add-actions">
            <button type="button" class="btn-save">Save</button>
            <button type="button" class="btn-cancel">Cancel</button>
          </div>
          <button type="button" class="btn-delete-move">Delete this move</button>
        </div>
        <button type="button" class="learned-toggle">
          <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          <span>Mark as learned</span>
        </button>
      </div>
      <div class="video-row">
        <input type="url" inputmode="url" placeholder="Paste clip link…" autocomplete="off">
      </div>
      <p class="sync-note">Saved</p>
      ${otherCats.length ? `
        <div class="move-to">
          <button type="button" class="move-to-trigger">Move to…</button>
          <div class="move-to-menu is-hidden">${optionsHtml}</div>
        </div>
      ` : ''}
    `;

    const preview = li.querySelector('.clip-preview');
    const input = li.querySelector('.video-row input');
    const syncNote = li.querySelector('.sync-note');
    const moveToTrigger = li.querySelector('.move-to-trigger');
    const moveToMenu = li.querySelector('.move-to-menu');
    const moveDisplay = li.querySelector('.move-display');
    const moveEditForm = li.querySelector('.move-edit-form');
    const moveEditBtn = li.querySelector('.move-edit-btn');
    const editTitleInput = li.querySelector('.edit-title-input');
    const editNoteInput = li.querySelector('.edit-note-input');
    const learnedBtn = li.querySelector('.learned-toggle');
    const focusBtn = li.querySelector('.focus-toggle');

    learnedBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleLearned(mv.id); });
    paintLearnedById(mv.id);

    focusBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFocus(mv.id); });
    paintFocusById(mv.id);

    moveEditBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editTitleInput.value = mv.title;
      editNoteInput.value = mv.note || '';
      moveDisplay.classList.add('is-hidden');
      moveEditForm.classList.remove('is-hidden');
      editTitleInput.focus();
    });

    const deleteMoveBtn = moveEditForm.querySelector('.btn-delete-move');
    let deleteArmed = false;
    let deleteResetTimer = null;
    function resetDeleteArm(){
      deleteArmed = false;
      clearTimeout(deleteResetTimer);
      deleteMoveBtn.textContent = 'Delete this move';
      deleteMoveBtn.classList.remove('is-armed');
    }
    deleteMoveBtn.addEventListener('click', () => {
      if(!deleteArmed){
        deleteArmed = true;
        deleteMoveBtn.textContent = 'Click again to confirm delete';
        deleteMoveBtn.classList.add('is-armed');
        clearTimeout(deleteResetTimer);
        deleteResetTimer = setTimeout(resetDeleteArm, 3000);
        return;
      }
      clearTimeout(deleteResetTimer);
      deleteMove(cat.id, mv.id);
    });

    moveEditForm.querySelector('.btn-cancel').addEventListener('click', () => {
      moveEditForm.classList.add('is-hidden');
      moveDisplay.classList.remove('is-hidden');
      resetDeleteArm();
    });
    moveEditForm.querySelector('.btn-save').addEventListener('click', () => {
      const t = editTitleInput.value.trim();
      if(!t){ editTitleInput.focus(); return; }
      editMoveDetails(cat.id, mv.id, t, editNoteInput.value);
    });
    editTitleInput.addEventListener('keydown', (e) => {
      if(e.key === 'Escape'){ moveEditForm.classList.add('is-hidden'); moveDisplay.classList.remove('is-hidden'); resetDeleteArm(); }
    });

    input.value = inputValueFor(mv);
    paintPreview(li, preview, mv);

    input.addEventListener('input', () => {
      clearTimeout(saveTimers[mv.id]);
      saveTimers[mv.id] = setTimeout(() => saveVideoLink(cat.id, mv.id, input.value.trim(), li, preview, syncNote), 500);
    });
    input.addEventListener('blur', () => {
      clearTimeout(saveTimers[mv.id]);
      saveVideoLink(cat.id, mv.id, input.value.trim(), li, preview, syncNote);
    });

    if(moveToTrigger && moveToMenu){
      moveToTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = moveToMenu.classList.contains('is-hidden');
        closeAllMoveToMenus();
        if(willOpen){
          const rect = moveToTrigger.getBoundingClientRect();
          const menuH = Math.min(200, moveToMenu.scrollHeight || 200);
          moveToMenu.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 178)) + 'px';
          moveToMenu.style.top = (rect.top > menuH + 12 ? rect.top - menuH - 4 : rect.bottom + 4) + 'px';
          moveToMenu.classList.remove('is-hidden');
        }
      });
      moveToMenu.querySelectorAll('.move-to-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          moveToMenu.classList.add('is-hidden');
          relocateMove(mv.id, cat.id, btn.dataset.target);
        });
      });
    }

    return li;
  }

  function buildAddMoveTile(cat){
    const li = document.createElement('li');
    li.className = 'move add-move-tile';
    li.innerHTML = `
      <button type="button" class="add-trigger">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <span>Add move</span>
      </button>
      <div class="add-form is-hidden">
        <input type="text" class="add-title" placeholder="Move name…" autocomplete="off">
        <textarea class="add-note" placeholder="Cue / description (optional)" rows="2"></textarea>
        <div class="add-actions">
          <button type="button" class="btn-save">Add</button>
          <button type="button" class="btn-cancel">Cancel</button>
        </div>
      </div>
    `;
    const trigger = li.querySelector('.add-trigger');
    const form = li.querySelector('.add-form');
    const titleInput = li.querySelector('.add-title');
    const noteInput = li.querySelector('.add-note');

    trigger.addEventListener('click', () => {
      trigger.classList.add('is-hidden');
      form.classList.remove('is-hidden');
      titleInput.focus();
    });
    form.querySelector('.btn-cancel').addEventListener('click', () => {
      form.classList.add('is-hidden');
      trigger.classList.remove('is-hidden');
      titleInput.value = '';
      noteInput.value = '';
    });
    form.querySelector('.btn-save').addEventListener('click', () => {
      const t = titleInput.value.trim();
      if(!t){ titleInput.focus(); return; }
      addMove(cat.id, t, noteInput.value);
    });
    titleInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){ e.preventDefault(); form.querySelector('.btn-save').click(); }
    });
    return li;
  }

  function buildCategoryEl(cat, ci){
    const section = document.createElement('section');
    section.className = 'category';
    section.dataset.catId = cat.id;
    section.dataset.title = cat.title.toLowerCase();
    const isOpen = openCats.has(cat.id);
    section.dataset.open = isOpen ? 'true' : 'false';

    // The category card's photo is the first move in it that has a Drive
    // clip — just a representative preview, like a course's cover image.
    const coverMove = cat.moves.find(m => m.driveId || m.videoUrl);
    const photoHtml = coverMove
      ? `<img class="cat-photo-img" src="gifs/${coverMove.id}.gif" loading="lazy" alt="" onerror="this.onerror=null;this.src='https://drive.google.com/thumbnail?id=${coverMove.driveId || ''}&sz=w400';">`
      : `<span class="cat-photo-placeholder">${plusIconSvg()}</span>`;

    section.innerHTML = `
      <button type="button" class="cat-photo-btn" title="${escapeHtml(cat.title)}">
        <div class="cat-photo">${photoHtml}</div>
      </button>
      <div class="cat-info">
        <button type="button" class="cat-head-toggle">
          <span class="cat-title-row">
            <span class="cat-num">${String(ci + 1).padStart(2, '0')}</span>
            <span class="cat-title"></span>
          </span>
          <span class="cat-meta"></span>
        </button>
        <div class="cat-utility-row">
          <button type="button" class="cat-reorder-btn" data-dir="-1" title="Move up">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
          <button type="button" class="cat-reorder-btn" data-dir="1" title="Move down">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <button type="button" class="cat-edit-btn" title="Rename category">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
      <div class="cat-rename-form add-form is-hidden">
        <input type="text" class="cat-rename-input" placeholder="Category name…" autocomplete="off">
        <div class="add-actions">
          <button type="button" class="btn-save">Save</button>
          <button type="button" class="btn-cancel">Cancel</button>
        </div>
      </div>
      <div class="cat-body">
        <div class="cat-body-inner">
          <ul class="moves"></ul>
        </div>
      </div>
    `;

    section.querySelector('.cat-title').textContent = cat.title;
    section.querySelector('.cat-meta').textContent = cat.moves.length + (cat.moves.length === 1 ? ' move' : ' moves');

    const ul = section.querySelector('.moves');
    cat.moves.forEach(mv => ul.appendChild(buildMoveEl(mv, cat)));
    ul.appendChild(buildAddMoveTile(cat));

    const toggleOpen = () => {
      const nowOpen = section.dataset.open !== 'true';
      section.dataset.open = nowOpen ? 'true' : 'false';
      if(nowOpen) openCats.add(cat.id); else openCats.delete(cat.id);
    };
    section.querySelector('.cat-head-toggle').addEventListener('click', toggleOpen);
    section.querySelector('.cat-photo-btn').addEventListener('click', toggleOpen);

    section.querySelectorAll('.cat-reorder-btn').forEach(btn => {
      const dir = parseInt(btn.dataset.dir, 10);
      if((dir === -1 && ci === 0) || (dir === 1 && ci === categories.length - 1)) btn.disabled = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveCategory(cat.id, dir);
      });
    });

    const editBtn = section.querySelector('.cat-edit-btn');
    const renameForm = section.querySelector('.cat-rename-form');
    const renameInput = section.querySelector('.cat-rename-input');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renameInput.value = cat.title;
      renameForm.classList.toggle('is-hidden');
      if(!renameForm.classList.contains('is-hidden')) renameInput.focus();
    });
    renameForm.querySelector('.btn-cancel').addEventListener('click', () => {
      renameForm.classList.add('is-hidden');
    });
    renameForm.querySelector('.btn-save').addEventListener('click', () => {
      const t = renameInput.value.trim();
      if(!t){ renameInput.focus(); return; }
      renameCategory(cat.id, t);
    });
    renameInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){ e.preventDefault(); renameForm.querySelector('.btn-save').click(); }
      if(e.key === 'Escape'){ renameForm.classList.add('is-hidden'); }
    });

    return section;
  }

  function buildAddCategoryEl(){
    const wrap = document.createElement('div');
    wrap.className = 'add-category';
    wrap.innerHTML = `
      <button type="button" class="add-trigger">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <span>Add key move category</span>
      </button>
      <div class="add-form is-hidden">
        <input type="text" class="add-title" placeholder="Category name…" autocomplete="off">
        <div class="add-actions">
          <button type="button" class="btn-save">Add</button>
          <button type="button" class="btn-cancel">Cancel</button>
        </div>
      </div>
    `;
    const trigger = wrap.querySelector('.add-trigger');
    const form = wrap.querySelector('.add-form');
    const titleInput = wrap.querySelector('.add-title');

    trigger.addEventListener('click', () => {
      trigger.classList.add('is-hidden');
      form.classList.remove('is-hidden');
      titleInput.focus();
    });
    form.querySelector('.btn-cancel').addEventListener('click', () => {
      form.classList.add('is-hidden');
      trigger.classList.remove('is-hidden');
      titleInput.value = '';
    });
    form.querySelector('.btn-save').addEventListener('click', () => {
      const t = titleInput.value.trim();
      if(!t){ titleInput.focus(); return; }
      addCategory(t);
    });
    titleInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){ e.preventDefault(); wrap.querySelector('.btn-save').click(); }
    });
    return wrap;
  }

  function renderAll(){
    catsEl.innerHTML = '';
    categories.forEach((cat, ci) => catsEl.appendChild(buildCategoryEl(cat, ci)));
    catsEl.appendChild(buildAddCategoryEl());
    repaintAllLearned();
    repaintAllFocus();
    renderProfileBar();
    applySearch();
  }

  function markMatch(el, text, query){
    if(!query){ el.innerHTML = escapeHtml(text); return; }
    const idx = text.toLowerCase().indexOf(query);
    if(idx === -1){ el.innerHTML = escapeHtml(text); return; }
    el.innerHTML = escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + query.length)) + '</mark>' + escapeHtml(text.slice(idx + query.length));
  }

  function applySearch(){
    const q = currentQuery.trim().toLowerCase();
    const filtering = currentFilter !== 'all';
    let anyVisible = false;

    catsEl.querySelectorAll('.category').forEach(section => {
      const catTitle = section.dataset.title;
      let anyMoveMatch = false;

      section.querySelectorAll('.move[data-id]').forEach(li => {
        const moveTitle = li.dataset.title;
        const searchMatch = !q || moveTitle.includes(q) || catTitle.includes(q);
        const isLearned = !!learned[li.dataset.id];
        const isFocus = !!focusMoves[li.dataset.id];
        const filterMatch = currentFilter === 'all' || (currentFilter === 'learned' && isLearned) || (currentFilter === 'todo' && !isLearned) || (currentFilter === 'focus' && isFocus);
        const match = searchMatch && filterMatch;
        li.style.display = match ? '' : 'none';
        if(match) anyMoveMatch = true;
        const titleEl = li.querySelector('.move-title');
        if(titleEl){
          if(!titleEl.__origTitle) titleEl.__origTitle = titleEl.textContent;
          markMatch(titleEl, titleEl.__origTitle, q && moveTitle.includes(q) ? q : '');
        }
      });

      const addTile = section.querySelector('.add-move-tile');
      if(addTile) addTile.style.display = (q || filtering) ? 'none' : '';

      const visible = anyMoveMatch || (!q && !filtering);
      section.style.display = visible ? '' : 'none';
      section.classList.toggle('has-match', (!!q || filtering) && visible);
      if((q || filtering) && visible){ section.dataset.open = 'true'; openCats.add(section.dataset.catId); }
      if(visible) anyVisible = true;
    });

    noResultsEl.style.display = ((q || filtering) && !anyVisible) ? 'block' : 'none';
  }

  searchEl.addEventListener('input', () => {
    currentQuery = searchEl.value;
    applySearch();
  });

  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      if(btn.dataset.filter !== 'all' && !profile){ openProfileForm(); return; }
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b === btn));
      applySearch();
    });
  });

  // ---- Boot ----
  profile = loadProfile();
  if(profile) saveKnownProfile(profile);

  Backend.watchStructure((data) => {
    categories = data;
    renderAll();
    if(profile) connectProgress();
  });
})();
