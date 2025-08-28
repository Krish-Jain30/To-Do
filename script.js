    const STORAGE_KEY = 'minimal-todos-v1';
    let todos = [];

    const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

    function save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
      updateCount();
    }
    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        todos = raw ? JSON.parse(raw) : [];
      } catch { todos = []; }
    }

    const listEl = document.getElementById('list');
    const emptyEl = document.getElementById('empty');
    const addForm = document.getElementById('addForm');
    const newTaskInput = document.getElementById('newTask');
    const clearCompletedBtn = document.getElementById('clearCompleted');
    const countEl = document.getElementById('count');
    const itemTpl = document.getElementById('itemTemplate');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');

    function render() {
      listEl.innerHTML = '';
      if (!todos.length) {
        emptyEl.hidden = false;
        updateCount();
        return;
      }
      emptyEl.hidden = true;

      for (const t of todos) {
        const node = itemTpl.content.firstElementChild.cloneNode(true);
        const checkbox = node.querySelector('.toggle');
        const title = node.querySelector('.title');
        const editBtn = node.querySelector('.edit');
        const delBtn = node.querySelector('.delete');

        checkbox.checked = t.completed;
        title.textContent = t.text;
        title.classList.toggle('completed', t.completed);

        checkbox.addEventListener('change', () => {
          t.completed = checkbox.checked;
          title.classList.toggle('completed', t.completed);
          save();
        });

        editBtn.addEventListener('click', () => startEdit(node, t));
        delBtn.addEventListener('click', () => remove(t.id));

        title.addEventListener('dblclick', () => startEdit(node, t));

        listEl.appendChild(node);
      }
      updateCount();
    }

    function updateCount() {
      const open = todos.filter(t => !t.completed).length;
      countEl.textContent = String(open);
      saveDebounced();
    }

    function add(text) {
      const clean = text.trim();
      if (!clean) return;
      todos.unshift({ id: uid(), text: clean, completed: false, created: Date.now() });
      save();
      render();
    }

    function remove(id) {
      todos = todos.filter(t => t.id !== id);
      save();
      render();
    }

    function update(id, newText) {
      const t = todos.find(x => x.id === id);
      if (!t) return;
      const clean = newText.trim();
      t.text = clean || t.text; 
      save();
      render();
    }

    function startEdit(itemNode, t) {
      const title = itemNode.querySelector('.title');
      const actions = itemNode.querySelector('.actions');
      const input = document.createElement('input');
      input.type = 'text';
      input.value = t.text;
      input.setAttribute('aria-label', 'Edit task');
      input.style.border = '1px solid var(--line)';
      input.style.borderRadius = '10px';
      input.style.padding = '8px 10px';
      input.style.fontSize = '14px';
      input.style.width = '100%';

      title.replaceWith(input);
      input.focus();
      input.select();

      const prev = [...actions.children];
      actions.innerHTML = '';
      const saveBtn = document.createElement('button');
      saveBtn.className = 'primary';
      saveBtn.textContent = 'Save';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'ghost';
      cancelBtn.textContent = 'Cancel';
      actions.append(saveBtn, cancelBtn);

      const finish = (keep) => {
        const newTitle = document.createElement('div');
        newTitle.className = 'title' + (t.completed ? ' completed' : '');
        newTitle.textContent = keep ? input.value : t.text;
        input.replaceWith(newTitle);
        actions.innerHTML = '';
        for (const b of prev) actions.appendChild(b);
        if (keep) update(t.id, input.value);
        newTitle.addEventListener('dblclick', () => startEdit(itemNode, t));
      };

      saveBtn.addEventListener('click', () => finish(true));
      cancelBtn.addEventListener('click', () => finish(false));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      });
    }

    exportBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'todos.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            todos = data.filter(x => x && typeof x.text === 'string').map(x => ({
              id: x.id || uid(),
              text: String(x.text).slice(0, 200),
              completed: !!x.completed,
              created: Number(x.created) || Date.now(),
            }));
            save();
            render();
          }
        } catch (e) { alert('Invalid JSON'); }
      });
      input.click();
    });

    clearCompletedBtn.addEventListener('click', () => {
      const before = todos.length;
      todos = todos.filter(t => !t.completed);
      if (todos.length !== before) { save(); render(); }
    });

    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      add(newTaskInput.value);
      newTaskInput.value = '';
      newTaskInput.focus();
    });

    let saveTimer = null;
    function saveDebounced() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 300);
    }

    load();
    render();