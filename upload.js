// upload.js — client-side uploader and embedder for local static game hosting
(function () {
  const mimeMap = {
    html: 'text/html',
    htm: 'text/html',
    js: 'application/javascript',
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    json: 'application/json',
    txt: 'text/plain',
    wasm: 'application/wasm',
  };

  function ext(name) {
    const m = name.split('.');
    return m.length > 1 ? m.pop().toLowerCase() : '';
  }

  function setStatus(text, isError) {
    const s = document.getElementById('uploader-status');
    if (s) {
      s.textContent = text;
      s.style.color = isError ? '#ffb4b4' : '';
    }
  }

  function loadHtmlStringIntoIframe(htmlString, title) {
    const iframe = document.getElementById('game-frame');
    const playerTitle = document.getElementById('player-title');
    iframe.srcdoc = htmlString;
    iframe.removeAttribute('src');
    playerTitle.textContent = title || 'Uploaded game';
    // prepare open-in-new
    const openBtn = document.getElementById('open-in-new');
    openBtn.onclick = () => {
      const blob = new Blob([htmlString], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    };
  }

  async function handleHtmlFile(file) {
    const text = await file.text();
    loadHtmlStringIntoIframe(text, file.name);
    setStatus('Loaded HTML file: ' + file.name);
  }

  async function handleZipFile(file) {
    if (typeof JSZip === 'undefined') {
      setStatus('JSZip not loaded', true);
      return;
    }
    setStatus('Unzipping...');
    try {
      const zip = await JSZip.loadAsync(file);
      const files = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
      const blobMap = {};
      // create blob URLs for all files in zip
      await Promise.all(
        files.map(async (fileName) => {
          const f = zip.file(fileName);
          if (!f) return;
          const data = await f.async('uint8array');
          const extension = ext(fileName);
          const type = mimeMap[extension] || 'application/octet-stream';
          const blob = new Blob([data], { type });
          const url = URL.createObjectURL(blob);
          // store with normalized name
          blobMap[fileName.replace(/^[./]+/, '')] = url;
        }),
      );

      // pick index.html or first html file
      let indexName = files.find((n) => /index\.html?$/i.test(n));
      if (!indexName) indexName = files.find((n) => /\.html?$/i.test(n));
      if (!indexName) {
        setStatus('No HTML entry found in zip', true);
        return;
      }

      const indexFile = zip.file(indexName);
      let htmlText = await indexFile.async('string');

      // Try to rewrite references by replacing known filenames with blob URLs
      // This is a simple textual replace which covers most small bundles
      Object.keys(blobMap).forEach((name) => {
        const safeName = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        // replace href/src occurrences
        const reSrc = new RegExp(`(["'\(])${safeName}(["'\)])`, 'g');
        htmlText = htmlText.replace(reSrc, `$1${blobMap[name]}$2`);
        // replace absolute occurrences that start with ./ or /\n        const reSrc2 = new RegExp(`(["'\(])(?:\.\/?|\/?)+${safeName}(["'\)])`, 'g');
        htmlText = htmlText.replace(reSrc2, `$1${blobMap[name]}$2`);
      });

      // Final fallback: parse and replace element attributes (safer)
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const attrNodes = doc.querySelectorAll('[src], [href]');
        attrNodes.forEach((n) => {
          ['src', 'href'].forEach((a) => {
            if (n.hasAttribute(a)) {
              const val = n.getAttribute(a).replace(/^[./]+/, '');
              if (blobMap[val]) n.setAttribute(a, blobMap[val]);
            }
          });
        });
        htmlText = '<!doctype html>\n' + doc.documentElement.outerHTML;
      } catch (e) {
        // ignore parsing errors — textual replacement already applied
      }

      loadHtmlStringIntoIframe(htmlText, indexName);
      setStatus('Loaded game from zip: ' + file.name);
    } catch (err) {
      console.error(err);
      setStatus('Failed to load zip: ' + err.message, true);
    }
  }

  function setup() {
    const embedBtn = document.getElementById('embed-button');
    const embedUrl = document.getElementById('embed-url');
    const fileInput = document.getElementById('game-file');
    const uploadBtn = document.getElementById('upload-button');

    embedBtn.addEventListener('click', () => {
      const url = embedUrl.value.trim();
      if (!url) {
        setStatus('Please enter a valid URL', true);
        return;
      }
      const iframe = document.getElementById('game-frame');
      iframe.srcdoc = '';
      iframe.src = url;
      document.getElementById('player-title').textContent = url;
      setStatus('Attempting to embed: ' + url);
    });

    uploadBtn.addEventListener('click', async () => {
      const files = fileInput.files;
      if (!files || files.length === 0) {
        setStatus('Select a file first', true);
        return;
      }
      const f = files[0];
      const name = f.name.toLowerCase();
      if (name.endsWith('.zip')) {
        await handleZipFile(f);
      } else if (name.endsWith('.html') || name.endsWith('.htm')) {
        await handleHtmlFile(f);
      } else {
        setStatus('Unsupported file type', true);
      }
    });

    // drag and drop support
    const uploader = document.querySelector('.uploader-controls');
    if (uploader) {
      uploader.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploader.classList.add('dragover');
      });
      uploader.addEventListener('dragleave', () => {
        uploader.classList.remove('dragover');
      });
      uploader.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploader.classList.remove('dragover');
        const f = e.dataTransfer.files[0];
        if (!f) return;
        fileInput.files = e.dataTransfer.files;
        const name = f.name.toLowerCase();
        if (name.endsWith('.zip')) await handleZipFile(f);
        else if (name.endsWith('.html') || name.endsWith('.htm')) await handleHtmlFile(f);
        else setStatus('Unsupported file type', true);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', setup);
})();
