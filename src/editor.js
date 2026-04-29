import { EditorView, basicSetup } from 'codemirror';
import { rust } from '@codemirror/lang-rust';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';

let tabs = [];
let activeTab = -1;
let currentDir = '';
let editor = null;

function getLang(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  if (ext === 'md' || ext === 'markdown') return markdown();
  return rust();
}

function createState(doc = '', lang = rust()) {
  return EditorState.create({
    doc,
    extensions: [
      basicSetup,
      lang,
      oneDark,
      EditorView.lineWrapping,
      keymap.of([indentWithTab]),
    ],
  });
}

function initEditor(state) {
  const container = document.getElementById('editor');
  if (editor) {
    editor.setState(state);
  } else {
    editor = new EditorView({ state, parent: container });
  }
}

function renderTabs() {
  const list = document.getElementById('tab-list');
  list.innerHTML = '';
  tabs.forEach((tab, i) => {
    const el = document.createElement('div');
    el.className = 'tab' + (i === activeTab ? ' active' : '');

    const name = document.createElement('span');
    name.className = 'tab-name';
    name.textContent = tab.path.split('/').pop();
    name.onclick = () => switchToTab(i);

    const close = document.createElement('button');
    close.className = 'tab-close';
    close.textContent = '×';
    close.onclick = e => { e.stopPropagation(); closeTab(i); };

    el.appendChild(name);
    el.appendChild(close);
    list.appendChild(el);
  });

  document.title = activeTab >= 0
    ? tabs[activeTab].path.split('/').pop() + ' — Zero Editor'
    : 'Zero Editor';
}

function switchToTab(index) {
  if (activeTab >= 0) tabs[activeTab].state = editor.state;
  activeTab = index;
  initEditor(tabs[activeTab].state);
  renderTabs();
  document.getElementById('tab-list').children[index]?.scrollIntoView({ inline: 'nearest' });
}

function closeTab(index) {
  tabs.splice(index, 1);
  if (tabs.length === 0) {
    activeTab = -1;
    initEditor(createState('// Tryk på "Filer" for at åbne en fil\n'));
  } else {
    activeTab = Math.min(index, tabs.length - 1);
    initEditor(tabs[activeTab].state);
  }
  renderTabs();
}

async function loadFile(filePath) {
  try {
    const existing = tabs.findIndex(t => t.path === filePath);
    if (existing >= 0) {
      switchToTab(existing);
      closeFileTree();
      return;
    }
    const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error('Kunne ikke åbne fil');
    const { content } = await res.json();

    if (activeTab >= 0) tabs[activeTab].state = editor.state;
    tabs.push({ path: filePath, state: createState(content, getLang(filePath)) });
    activeTab = tabs.length - 1;
    initEditor(tabs[activeTab].state);
    renderTabs();
    closeFileTree();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveFile() {
  if (activeTab < 0 || !editor) return;
  try {
    const content = editor.state.doc.toString();
    const res = await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: tabs[activeTab].path, content }),
    });
    if (!res.ok) throw new Error('Gem fejlede');
    showToast('Gemt');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadDir(dirPath = '') {
  try {
    currentDir = dirPath;
    const res = await fetch(`/api/dir?path=${encodeURIComponent(dirPath)}`);
    if (!res.ok) throw new Error('Kan ikke læse mappe');
    const entries = await res.json();
    const list = document.getElementById('file-list');
    list.innerHTML = '';

    if (dirPath) {
      const up = document.createElement('div');
      up.className = 'file-entry dir';
      up.textContent = '↑  ..';
      const parentDir = dirPath.split('/').slice(0, -1).join('/');
      up.onclick = () => loadDir(parentDir);
      list.appendChild(up);
    }

    const sorted = entries.sort((a, b) => b.isDir - a.isDir || a.name.localeCompare(b.name));
    sorted.forEach(entry => {
      const el = document.createElement('div');
      el.className = `file-entry ${entry.isDir ? 'dir' : 'file'}`;
      el.textContent = (entry.isDir ? '▸ ' : '  ') + entry.name;
      el.onclick = () => (entry.isDir ? loadDir(entry.path) : loadFile(entry.path));
      list.appendChild(el);
    });

    document.getElementById('dir-path').textContent = dirPath || '~';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showToast(msg, type = 'ok') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'show ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = ''; }, 2000);
}

function openFileTree() {
  loadDir(currentDir);
  document.getElementById('filetree').classList.add('open');
  document.getElementById('overlay').style.display = 'block';
}

function closeFileTree() {
  document.getElementById('filetree').classList.remove('open');
  document.getElementById('overlay').style.display = 'none';
}

initEditor(createState('// Tryk på "Filer" for at åbne en fil\n'));

document.getElementById('btn-tree').addEventListener('click', openFileTree);
document.getElementById('btn-save').addEventListener('click', saveFile);
document.getElementById('overlay').addEventListener('click', closeFileTree);

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveFile();
  }
});
