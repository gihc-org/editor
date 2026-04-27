import { EditorView, basicSetup } from 'codemirror';
import { rust } from '@codemirror/lang-rust';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';

let currentFile = null;
let currentDir = '';
let editor = null;

function initEditor(doc = '') {
  const container = document.getElementById('editor');
  if (editor) editor.destroy();
  editor = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        rust(),
        oneDark,
        EditorView.lineWrapping,
        keymap.of([indentWithTab]),
      ],
    }),
    parent: container,
  });
}

async function loadFile(filePath) {
  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error('Kunne ikke åbne fil');
    const { content } = await res.json();
    currentFile = filePath;
    document.getElementById('filename').textContent = filePath.split('/').pop();
    document.title = filePath.split('/').pop() + ' — Rust Editor';
    initEditor(content);
    closeFileTree();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveFile() {
  if (!currentFile || !editor) return;
  try {
    const content = editor.state.doc.toString();
    const res = await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentFile, content }),
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

initEditor('// Tryk på "Filer" for at åbne en fil\n');

document.getElementById('btn-tree').addEventListener('click', openFileTree);
document.getElementById('btn-save').addEventListener('click', saveFile);
document.getElementById('overlay').addEventListener('click', closeFileTree);

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveFile();
  }
});
