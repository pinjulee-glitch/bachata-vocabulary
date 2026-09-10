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

  function createNewProfile(name, pin){
    const id = uid('u');
    Backend.createProfile(id, name.trim(), pin).catch((e) => console.error('createProfile failed', e));
    switchToProfile(id, name);
  }

  // A profile switch (from the known-names dropdown, or the "I already
  // have an account" picker) always goes through this — it checks the
  // PIN server-side before switching. Profiles made before the PIN
  // system existed have no PIN on file and are let straight through.
  let pendingProfileSwitch = null;
  function requestProfileSwitch(id, name){
    pendingProfileSwitch = { id, name };
    closeProfileSwitchMenu();
    document.getElementById('profileForm').classList.add('is-hidden');
    document.getElementById('profilePickerForm').classList.add('is-hidden');
    document.getElementById('profileRow').classList.add('is-hidden');
    const pinForm = document.getElementById('profilePinForm');
    document.getElementById('profilePinPrompt').textContent = `Enter ${name}'s PIN`;
    document.getElementById('profilePinError').classList.add('is-hidden');
    const pinInput = document.getElementById('profilePinVerifyInput');
    pinInput.value = '';
    pinForm.classList.remove('is-hidden');
    pinInput.focus();
  }
  function submitProfilePin(){
    if(!pendingProfileSwitch) return;
    const pinInput = document.getElementById('profilePinVerifyInput');
    const errorEl = document.getElementById('profilePinError');
    const pin = pinInput.value.trim();
    Backend.checkProfilePin(pendingProfileSwitch.id, pin).then((result) => {
      if(result.ok){
        const { id, name } = pendingProfileSwitch;
        pendingProfileSwitch = null;
        switchToProfile(id, name);
        closeProfileForm();
      } else {
        errorEl.textContent = result.reason === 'not_found' ? "Couldn't find that account." : 'Try again.';
        errorEl.classList.remove('is-hidden');
        pinInput.value = '';
        pinInput.focus();
      }
    });
  }

  let progressUnsubscribe = null;
  function connectProgress(){
    if(!profile) return;
    if(progressUnsubscribe) progressUnsubscribe();
    progressUnsubscribe = Backend.watchProgress(profile.id, (data) => {
      learned = (data && data.learned) || {};
      focusMoves = (data && data.focus) || {};
      renderProfileBar();
      repaintAllLearned();
      repaintAllFocus();
      applySearch();
    });
  }

  function logOutProfile(){
    if(progressUnsubscribe){ progressUnsubscribe(); progressUnsubscribe = null; }
    profile = null;
    try{ localStorage.removeItem('bachata-profile'); }catch(e){}
    learned = {};
    focusMoves = {};
    renderProfileBar();
    repaintAllLearned();
    repaintAllFocus();
    applySearch();
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

  function closeAllProfileForms(){
    ['profileForm', 'profilePickerForm', 'profilePinForm'].forEach(id => {
      document.getElementById(id).classList.add('is-hidden');
    });
    document.getElementById('profileRow').classList.remove('is-hidden');
    pendingProfileSwitch = null;
  }
  function closeProfileForm(){
    closeAllProfileForms();
  }
  function openProfileForm(){
    closeProfileSwitchMenu();
    closeAllProfileForms();
    document.getElementById('profileRow').classList.add('is-hidden');
    document.getElementById('profileForm').classList.remove('is-hidden');
    document.getElementById('profileFormError').classList.add('is-hidden');
    document.getElementById('profileNameInput').value = '';
    document.getElementById('profilePinInput').value = '';
    document.getElementById('profileNameInput').focus();
  }
  function openProfilePicker(){
    closeProfileSwitchMenu();
    closeAllProfileForms();
    document.getElementById('profileRow').classList.add('is-hidden');
    const form = document.getElementById('profilePickerForm');
    const list = document.getElementById('profilePickerList');
    form.classList.remove('is-hidden');
    list.innerHTML = '<p class="profile-picker-loading">Loading names…</p>';
    Backend.listProfiles().then((profiles) => {
      if(!profiles.length){
        list.innerHTML = '<p class="profile-picker-loading">No accounts yet.</p>';
        return;
      }
      list.innerHTML = profiles.map(p => `
        <button type="button" class="profile-switch-option" data-id="${p.id}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>
      `).join('');
      list.querySelectorAll('.profile-switch-option').forEach(btn => {
        btn.addEventListener('click', () => requestProfileSwitch(btn.dataset.id, btn.dataset.name));
      });
    });
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
      const known = loadKnownProfiles().filter(p => p.id !== profile.id);
      const menuItems = known.map(p => `
        <button type="button" class="profile-switch-option" data-id="${p.id}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>
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
            <button type="button" class="profile-switch-add" id="findAccountBtn">Log in to another account</button>
            <button type="button" class="profile-switch-add" id="addPersonBtn">+ Add new person</button>
            <button type="button" class="profile-switch-add profile-switch-logout" id="logOutBtn">Log out</button>
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
          requestProfileSwitch(btn.dataset.id, btn.dataset.name);
        });
      });
      document.getElementById('addPersonBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        openProfileForm();
      });
      document.getElementById('findAccountBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        openProfilePicker();
      });
      document.getElementById('logOutBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        closeProfileSwitchMenu();
        logOutProfile();
      });
    } else {
      row.innerHTML = `
        <div class="profile-text">Track which moves you've learned</div>
        <div class="profile-actions-row">
          <button type="button" class="profile-btn profile-btn-primary" id="startTrackingBtn">Create account</button>
          <button type="button" class="profile-btn" id="haveAccountBtn">Log in</button>
        </div>
      `;
      document.getElementById('startTrackingBtn').addEventListener('click', openProfileForm);
      document.getElementById('haveAccountBtn').addEventListener('click', openProfilePicker);
    }
  }

  document.getElementById('profileCancelBtn').addEventListener('click', closeProfileForm);
  document.getElementById('profileSaveBtn').addEventListener('click', () => {
    const nameInput = document.getElementById('profileNameInput');
    const pinInput = document.getElementById('profilePinInput');
    const errorEl = document.getElementById('profileFormError');
    const name = nameInput.value.trim();
    const pin = pinInput.value.trim();
    if(!name || !/^\d{4}$/.test(pin)){
      errorEl.classList.remove('is-hidden');
      if(!name) nameInput.focus(); else pinInput.focus();
      return;
    }
    createNewProfile(name, pin);
    closeProfileForm();
  });
  document.getElementById('profileNameInput').addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); document.getElementById('profilePinInput').focus(); }
    if(e.key === 'Escape'){ closeProfileForm(); }
  });
  document.getElementById('profilePinInput').addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); document.getElementById('profileSaveBtn').click(); }
    if(e.key === 'Escape'){ closeProfileForm(); }
  });
  document.getElementById('profilePickerCancelBtn').addEventListener('click', closeProfileForm);
  document.getElementById('profilePinSubmitBtn').addEventListener('click', submitProfilePin);
  document.getElementById('profilePinCancelBtn').addEventListener('click', () => {
    if(profile){ closeProfileForm(); } else { openProfilePicker(); }
  });
  document.getElementById('profilePinVerifyInput').addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); submitProfilePin(); }
    if(e.key === 'Escape'){ closeProfileForm(); }
  });

  // ---- Admin mode (gates add/edit/delete for the shared move library) ----
  // This is a shared password, not a real per-person login — it just
  // separates "anyone with the link can browse and track their own
  // progress" from "someone who's allowed to edit the library." Since the
  // database itself is open, this is a soft gate against casual editing,
  // not real security.
  const ADMIN_PASSWORD = 'kutalombokdance';
  let isAdmin = false;

  function loadIsAdmin(){
    try{ return localStorage.getItem('bachata-admin') === 'true'; }catch(e){ return false; }
  }
  function applyAdminState(){
    document.body.classList.toggle('is-admin', isAdmin);
  }

  function renderAdminRow(){
    const row = document.getElementById('adminRow');
    if(!row) return;
    if(isAdmin){
      row.innerHTML = `
        <div class="admin-actions-row">
          <button type="button" class="admin-link" id="manageAccountsBtn">Manage accounts</button>
          <button type="button" class="admin-link" id="adminLogoutBtn">Admin mode on · Log out</button>
        </div>
        <div class="admin-accounts-panel is-hidden" id="manageAccountsPanel"></div>
      `;
      document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        isAdmin = false;
        try{ localStorage.removeItem('bachata-admin'); }catch(e){}
        applyAdminState();
        renderAdminRow();
        renderAll();
      });
      document.getElementById('manageAccountsBtn').addEventListener('click', () => {
        const panel = document.getElementById('manageAccountsPanel');
        const nowHidden = !panel.classList.contains('is-hidden');
        if(nowHidden){ panel.classList.add('is-hidden'); return; }
        panel.classList.remove('is-hidden');
        renderManageAccountsPanel();
      });
    } else {
      row.innerHTML = `
        <button type="button" class="admin-link" id="adminLoginBtn">Admin</button>
        <div class="admin-form is-hidden" id="adminForm">
          <input type="password" id="adminPasswordInput" placeholder="Admin password" autocomplete="off">
          <button type="button" class="btn-save" id="adminSubmitBtn">Log in</button>
          <button type="button" class="btn-cancel" id="adminCancelBtn">Cancel</button>
          <p class="profile-form-error is-hidden" id="adminError">Try again.</p>
        </div>
      `;
      document.getElementById('adminLoginBtn').addEventListener('click', () => {
        document.getElementById('adminLoginBtn').classList.add('is-hidden');
        const form = document.getElementById('adminForm');
        form.classList.remove('is-hidden');
        document.getElementById('adminPasswordInput').focus();
      });
      document.getElementById('adminCancelBtn').addEventListener('click', renderAdminRow);
      const submit = () => {
        const input = document.getElementById('adminPasswordInput');
        const errorEl = document.getElementById('adminError');
        if(input.value === ADMIN_PASSWORD){
          isAdmin = true;
          try{ localStorage.setItem('bachata-admin', 'true'); }catch(e){}
          applyAdminState();
          renderAdminRow();
          renderAll();
        } else {
          errorEl.classList.remove('is-hidden');
          input.value = '';
          input.focus();
        }
      };
      document.getElementById('adminSubmitBtn').addEventListener('click', submit);
      document.getElementById('adminPasswordInput').addEventListener('keydown', (e) => {
        if(e.key === 'Enter'){ e.preventDefault(); submit(); }
      });
    }
  }

  function renderManageAccountsPanel(){
    const panel = document.getElementById('manageAccountsPanel');
    if(!panel) return;
    panel.innerHTML = '<p class="profile-picker-loading">Loading accounts…</p>';
    Backend.listProfiles().then((profiles) => {
      if(!profiles.length){
        panel.innerHTML = '<p class="profile-picker-loading">No accounts yet.</p>';
        return;
      }
      panel.innerHTML = profiles.map(p => `
        <div class="admin-account-row" data-id="${p.id}">
          <span class="admin-account-name">${escapeHtml(p.name)}</span>
          <button type="button" class="admin-account-delete" data-id="${p.id}" data-name="${escapeHtml(p.name)}">Remove</button>
        </div>
      `).join('');
      panel.querySelectorAll('.admin-account-delete').forEach(btn => {
        let armed = false;
        let resetTimer = null;
        const label = 'Remove';
        btn.addEventListener('click', () => {
          if(!armed){
            armed = true;
            btn.textContent = 'Click again to confirm';
            btn.classList.add('is-armed');
            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => {
              armed = false;
              btn.textContent = label;
              btn.classList.remove('is-armed');
            }, 3000);
            return;
          }
          clearTimeout(resetTimer);
          const id = btn.dataset.id;
          Backend.deleteProfile(id).then(() => {
            if(profile && profile.id === id) logOutProfile();
            renderManageAccountsPanel();
          }).catch((e) => console.error('deleteProfile failed', e));
        });
      });
    });
  }

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
  function deleteCategory(catId){
    const idx = categories.findIndex(c => c.id === catId);
    if(idx === -1) return;
    categories.splice(idx, 1);
    openCats.delete(catId);
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
  function reorderMove(catId, moveId, direction){
    const cat = categories.find(c => c.id === catId);
    if(!cat) return;
    const idx = cat.moves.findIndex(m => m.id === moveId);
    if(idx === -1) return;
    const swapWith = idx + direction;
    if(swapWith < 0 || swapWith >= cat.moves.length) return;
    const [mv] = cat.moves.splice(idx, 1);
    cat.moves.splice(swapWith, 0, mv);
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

  function buildMoveEl(mv, cat, mi){
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
            <div class="move-title-actions admin-only">
              <button type="button" class="move-reorder-btn" data-dir="-1" title="Move up">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <button type="button" class="move-reorder-btn" data-dir="1" title="Move down">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <button type="button" class="move-edit-btn" title="Edit move">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            </div>
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
      <div class="video-row admin-only">
        <input type="url" inputmode="url" placeholder="Paste clip link…" autocomplete="off">
      </div>
      <p class="sync-note admin-only">Saved</p>
      ${otherCats.length ? `
        <div class="move-to admin-only">
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

    li.querySelectorAll('.move-reorder-btn').forEach(btn => {
      const dir = parseInt(btn.dataset.dir, 10);
      if((dir === -1 && mi === 0) || (dir === 1 && mi === cat.moves.length - 1)) btn.disabled = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        reorderMove(cat.id, mv.id, dir);
      });
    });

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
    li.className = 'move add-move-tile admin-only';
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
          <button type="button" class="cat-reorder-btn admin-only" data-dir="-1" title="Move up">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
          <button type="button" class="cat-reorder-btn admin-only" data-dir="1" title="Move down">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <button type="button" class="cat-edit-btn admin-only" title="Rename category">
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
        <button type="button" class="btn-delete-move">Delete this category</button>
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
    cat.moves.forEach((mv, mi) => ul.appendChild(buildMoveEl(mv, cat, mi)));
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
      resetCatDeleteArm();
    });
    renameForm.querySelector('.btn-save').addEventListener('click', () => {
      const t = renameInput.value.trim();
      if(!t){ renameInput.focus(); return; }
      renameCategory(cat.id, t);
    });

    const deleteCatBtn = renameForm.querySelector('.btn-delete-move');
    const deleteCatLabel = cat.moves.length
      ? `Delete this category and its ${cat.moves.length} move${cat.moves.length === 1 ? '' : 's'}`
      : 'Delete this category';
    deleteCatBtn.textContent = deleteCatLabel;
    let catDeleteArmed = false;
    let catDeleteResetTimer = null;
    function resetCatDeleteArm(){
      catDeleteArmed = false;
      clearTimeout(catDeleteResetTimer);
      deleteCatBtn.textContent = deleteCatLabel;
      deleteCatBtn.classList.remove('is-armed');
    }
    deleteCatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(!catDeleteArmed){
        catDeleteArmed = true;
        deleteCatBtn.textContent = 'Click again to confirm delete';
        deleteCatBtn.classList.add('is-armed');
        clearTimeout(catDeleteResetTimer);
        catDeleteResetTimer = setTimeout(resetCatDeleteArm, 3000);
        return;
      }
      clearTimeout(catDeleteResetTimer);
      deleteCategory(cat.id);
    });

    renameInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){ e.preventDefault(); renameForm.querySelector('.btn-save').click(); }
      if(e.key === 'Escape'){ renameForm.classList.add('is-hidden'); }
    });

    return section;
  }

  function buildAddCategoryEl(){
    const wrap = document.createElement('div');
    wrap.className = 'add-category admin-only';
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

  isAdmin = loadIsAdmin();
  applyAdminState();
  renderAdminRow();

  Backend.watchStructure((data) => {
    categories = data;
    renderAll();
    if(profile) connectProgress();
  });
})();
