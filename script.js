const CONFIG = {
    NAME: "Sahib Virdee",
    EMAIL: "me@sahibvirdee.com",
    CONTACT_LINKS: [
        { label: "Email", url: "mailto:me@sahibvirdee.com", id: "email-link" }
    ],
    // Public Sheet (Everyone sees this)
    DATA_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7HtdJsNwYO8TkB4mem_IKZ-D8xNZ9DTAi-jgxpDM2HScpp9Tlz5DGFuBPd9TuMRwP16vUd-5h47Yz/pub?gid=1470188926&single=true&output=csv',
    
    // Private Sheet (Only logged in users fetch this)
    PRIVATE_DATA_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7HtdJsNwYO8TkB4mem_IKZ-D8xNZ9DTAi-jgxpDM2HScpp9Tlz5DGFuBPd9TuMRwP16vUd-5h47Yz/pub?gid=PRIVATE_GID_HERE&single=true&output=csv',
    
    // Subdomain Configuration
    FAMILY_SUBDOMAIN: 'family.sahibvirdee.com'
};

/**
 * Triggers a brief haptic feedback (1ms) on supported devices.
 */
function haptic() {
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(1);
    }
}


// State
let publicDb = [];
let privateDb = [];
let db = []; // Combined database
let currentView = 'grid';
let currentUser = null;
let isFamilyMode = window.location.hostname === CONFIG.FAMILY_SUBDOMAIN;
const DEFAULT_MODEL_CAMERA_RADIUS = "85%";
const DEFAULT_MODEL_CAMERA_ORBIT = `45deg 75deg ${DEFAULT_MODEL_CAMERA_RADIUS}`;
const modelOrbitBySrc = new Map();

// Elements
const grid = document.getElementById('grid');
const pageView = document.getElementById('page');
const siteName = document.getElementById('site-name');

// Click outside to go back
pageView.addEventListener('click', (e) => {
    if (e.target.closest('.page-back-layer')) {
        navigateTo('/');
    }
});

function initHeader() {
    siteName.textContent = isFamilyMode ? "Virdee Family" : CONFIG.NAME;
}
initHeader();

// Firebase Auth Logic
function initAuth() {
    if (window.firebase && firebase.auth) {
        const auth = firebase.auth();
        const db_fs = firebase.firestore();

        // If we are on the family subdomain and not logged in, trigger sign-in
        if (isFamilyMode && !currentUser) {
            signIn();
        }

        auth.onAuthStateChanged(async (user) => {
            currentUser = user;
            
            if (user) {
                try {
                    // Check Firestore if the user's email exists in the family collection
                    const doc = await db_fs.collection('family').doc(user.email).get();
                    
                    if (doc.exists) {
                        await fetchPrivateData();
                    } else {
                        console.log("User not authorized for private data.");
                        privateDb = [];
                        updateCombinedDb();
                    }
                } catch (e) {
                    console.error("Auth check failed:", e);
                    privateDb = [];
                    updateCombinedDb();
                }
            } else {
                privateDb = [];
                updateCombinedDb();
                // Re-trigger login if they logged out on the family subdomain
                if (isFamilyMode) signIn();
            }
        });
    }
}

async function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await firebase.auth().signInWithPopup(provider);
    } catch (e) {
        console.error("Sign-in failed:", e);
    }
}

function signOut() {
    firebase.auth().signOut();
}

function getYoutubeId(url) {
    if (!url || typeof url !== 'string') return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) return match[2];
    return (url.length === 11 && !url.includes('/') && !url.includes('.')) ? url : null;
}

/**
 * Parses a media line into a URL and a set of tags.
 * Example: "video.mp4 #loop #nocontrols" -> { url: "video.mp4", tags: Set { "loop", "nocontrols" } }
 */
function parseMediaLine(line) {
    if (!line || typeof line !== 'string') return { url: '', tags: new Set() };
    const parts = line.trim().split(/\s+/);
    const url = parts[0];
    const tags = new Set(parts.slice(1).map(t => t.toLowerCase().replace(/^#/, '')));
    
    // Also check for hash-style tags inside the first part (e.g. video.mp4#loop)
    const [baseUrl, ...fragments] = url.split('#');
    fragments.forEach(f => tags.add(f.toLowerCase()));
    
    return { url: baseUrl, tags };
}

/**
 * Extracts a value from a tag set based on a prefix.
 * Example: getTagValue(tags, 'scale') for tag 'scale50' -> '50'
 */
function getTagValue(tags, prefix) {
    const tag = [...tags].find(t => t.startsWith(prefix));
    if (!tag) return null;
    return tag.replace(prefix, '');
}

function getModelSettings(tags, isThumb = false) {
    const autoRotate = !tags.has('norotate') && !isThumb;
    const cameraControls = !tags.has('nocontrols') && !isThumb;

    let rotationSpeed = "20%";
    if (tags.has('fast')) rotationSpeed = "50%";
    if (tags.has('faster')) rotationSpeed = "100%";

    const orientationParts = tags.has('zup') ? [-90, 0, 0] : [0, 0, 0];
    let tiltAxis = 0;
    let tiltDeg = null;

    tags.forEach((tag) => {
        const match = tag.match(/^tilt([xyz])?(-?\d+(?:\.\d+)?)?$/);
        if (!match) return;

        if (match[1]) tiltAxis = { x: 0, y: 1, z: 2 }[match[1]];
        tiltDeg = match[2] ? parseFloat(match[2]) : 22.5;
    });

    if (tiltDeg !== null) orientationParts[tiltAxis] -= tiltDeg;
    const orientation = `${orientationParts[0]}deg ${orientationParts[1]}deg ${orientationParts[2]}deg`;

    const scaleVal = getTagValue(tags, 'scale');
    const scaleAmount = scaleVal ? parseInt(scaleVal, 10) / 100 : 1;
    const scale = `${scaleAmount} ${scaleAmount} ${scaleAmount}`;

    const fovVal = getTagValue(tags, 'fov');
    const fov = fovVal ? `${fovVal}deg` : "15deg";

    const intensityVal = getTagValue(tags, 'intensity');
    const intensity = intensityVal ? intensityVal : "1";

    return { autoRotate, cameraControls, rotationSpeed, orientation, scale, fov, intensity };
}

function getModelKey(url) {
    return url.split(/[?#]/)[0];
}

function getModelOrbit(mv) {
    if (!mv || typeof mv.getCameraOrbit !== 'function') return null;

    const orbit = mv.getCameraOrbit();
    if (orbit && orbit.theta != null && orbit.phi != null && orbit.radius != null) {
        return `${orbit.theta}rad ${orbit.phi}rad ${DEFAULT_MODEL_CAMERA_RADIUS}`;
    }

    return null;
}

function rememberModelOrbit(mv, url) {
    const orbit = getModelOrbit(mv);
    if (orbit) modelOrbitBySrc.set(getModelKey(url), orbit);
}

function initModelOrbitTracking(container = document) {
    container.querySelectorAll('model-viewer[data-model-src]').forEach((mv) => {
        const url = mv.dataset.modelSrc;
        const savedOrbit = modelOrbitBySrc.get(getModelKey(url));

        if (savedOrbit) mv.setAttribute('camera-orbit', savedOrbit);

        mv.addEventListener('camera-change', () => rememberModelOrbit(mv, url));
        mv.addEventListener('load', () => rememberModelOrbit(mv, url), { once: true });
        modelViewerObserver.observe(mv);
    });
}

function rememberVisibleModelOrbits(container = document) {
    container.querySelectorAll('model-viewer[data-model-src]').forEach((mv) => {
        rememberModelOrbit(mv, mv.dataset.modelSrc);
    });
}

function cleanupModelViewers(container = document) {
    container.querySelectorAll('model-viewer[data-model-src]').forEach((mv) => {
        modelViewerObserver.unobserve(mv);
    });
}

function syncModelVisibility(mv, isVisible) {
    if (isVisible && !mv.getAttribute('src')) {
        mv.setAttribute('src', mv.dataset.modelSrc);
    }

    if (mv.dataset.autoRotate !== 'true') return;

    if (isVisible) {
        mv.setAttribute('auto-rotate', '');
    } else {
        mv.removeAttribute('auto-rotate');
    }
}

const modelViewerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        syncModelVisibility(entry.target, entry.isIntersecting);
    });
}, { rootMargin: '600px 0px', threshold: 0.01 });

// Media Extractor for Grid
function getFirstMedia(content) {
    if (!content) return null;
    
    // Split by newlines and filter out empty lines
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    
    for (let line of lines) {
        // 1. YouTube check
        if (getYoutubeId(line)) return line;
        
        // 2. Extension check (Internal or External)
        const { url } = parseMediaLine(line);
        const parts = url.split(/[?#]/)[0].split('.');
        const ext = parts.pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'glb'].includes(ext)) {
            return line;
        }
    }
    return null;
}

// Helper to render media blocks
function renderMediaBlock(line) {
    if (!line || typeof line !== 'string') return null;
    const { url, tags } = parseMediaLine(line);
    const youtubeId = getYoutubeId(url);
    
    // Get extension safely even with query params
    const parts = url.split(/[?#]/)[0].split('.');
    const ext = parts.pop().toLowerCase();

    if (youtubeId) {
        const loopAttr = tags.has('loop') ? `&playlist=${youtubeId}&loop=1` : '';
        const autoplay = tags.has('noautoplay') ? '0' : '1';
        const controls = tags.has('nocontrols') ? '0' : '1';
        const muted = tags.has('unmute') ? '0' : '1';

        // Aspect Ratio
        let aspect = "16 / 9";
        if (tags.has('portrait') || tags.has('9x16')) aspect = "9 / 16";
        if (tags.has('4x3')) aspect = "4 / 3";
        const ratioVal = getTagValue(tags, 'ratio');
        if (ratioVal) aspect = ratioVal.replace(':', ' / ');

        return `
            <div class="block-media">
                <iframe src="https://www.youtube.com/embed/${youtubeId}?autoplay=${autoplay}&mute=${muted}&controls=${controls}${loopAttr}" style="aspect-ratio: ${aspect};" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
    }
    
    if (ext === 'mp4') {
        const autoplay = !tags.has('noautoplay');
        const controls = !tags.has('nocontrols');
        const loop = tags.has('loop');
        const muted = !tags.has('unmute');

        return `
            <div class="block-media">
                <video ${controls ? 'controls' : ''} ${autoplay ? 'autoplay' : ''} ${muted ? 'muted' : ''} ${loop ? 'loop' : ''} playsinline style="width: 100%;" onerror="this.outerHTML='<div class=&quot;placeholder-404&quot;>404</div>'">
                    <source src="${url}" type="video/mp4">
                </video>
            </div>
        `;
    }

    if (ext === 'glb') {
        const isThumb = tags.has('thumb');
        const { autoRotate, cameraControls, rotationSpeed, orientation, scale, fov, intensity } = getModelSettings(tags, isThumb);

        return `
            <div class="block-media">
                <div class="model-container">
                    <model-viewer 
                        data-model-src="${url}"
                        data-auto-rotate="${autoRotate ? 'true' : 'false'}"
                        loading="lazy"
                        rotation-speed="${rotationSpeed}"
                        auto-rotate-delay="5000"
                        ${cameraControls ? 'camera-controls' : ''} 
                        ${cameraControls ? '' : 'interaction-prompt="none"'}
                        ${cameraControls ? 'disable-zoom' : ''}
                        orientation="${orientation}"
                        scale="${scale}"
                        field-of-view="${fov}"
                        shadow-intensity="${intensity}" 
                        shadow-softness="1"
                        exposure="1"
                        camera-orbit="${modelOrbitBySrc.get(getModelKey(url)) || DEFAULT_MODEL_CAMERA_ORBIT}"
                        style="width: 100%; height: 100%;"
                        draco-decoder-location="https://www.gstatic.com/draco/versioned/decoders/1.5.7/">
                    </model-viewer>
                    <button class="btn-mini fullscreen-btn" onclick="toggleFullscreen(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
        return `
            <div class="block-media">
                <img src="${url}" alt="media" onerror="this.outerHTML='<div class=&quot;placeholder-404&quot;>404</div>'">
            </div>
        `;
    }

    return null;
}

// Custom Markdown Renderer for Auto-Embeds
const renderer = new marked.Renderer();

// Helper to wrap text blocks
function wrapText(content) {
    return `<div class="block-text">${content}</div>`;
}

renderer.heading = (arg) => {
    const text = (typeof arg === 'object' && arg.text) ? arg.text : (typeof arg === 'string' ? arg : '');
    const level = (typeof arg === 'object' && arg.depth) ? arg.depth : 1;
    return wrapText(`<h${level}>${text}</h${level}>`);
};

renderer.list = (arg, ordered) => {
    // In newer marked versions, arg is a token object; in older ones, body is a string.
    const body = (typeof arg === 'object' && arg.items) 
        ? arg.items.map(item => `<li>${item.text}</li>`).join('') 
        : (typeof arg === 'string' ? arg : '');
    
    const isOrdered = (typeof arg === 'object') ? arg.ordered : ordered;
    const type = isOrdered ? 'ol' : 'ul';
    return wrapText(`<${type}>${body}</${type}>`);
};

renderer.blockquote = (arg) => {
    const text = (typeof arg === 'object' && arg.text) ? arg.text : (typeof arg === 'string' ? arg : '');
    return wrapText(`<blockquote>${text}</blockquote>`);
};

// Handle naked links in paragraphs
renderer.paragraph = (arg) => {
    const text = (typeof arg === 'object' && arg.text) ? arg.text : (typeof arg === 'string' ? arg : '');
    const trimmed = text.trim();
    
    // Check if it's a naked URL or internal path
    const mediaHtml = renderMediaBlock(trimmed);
    if (mediaHtml) return mediaHtml;

    // Otherwise, it's just regular text
    return wrapText(`<p>${text}</p>`);
};

marked.setOptions({ renderer });

// Router Logic (No-Hash)
function navigateTo(path, item = null) {
    if (item) {
        history.pushState({ path, item }, '', path);
        renderPage(item);
    } else {
        history.pushState({ path: '/' }, '', '/');
        showGrid();
    }
    
    if (window.firebase && firebase.analytics) {
        firebase.analytics().logEvent('page_view', { page_path: path });
    }
}

window.addEventListener('popstate', (e) => {
    const state = e.state;
    if (state && state.item) {
        renderPage(state.item);
    } else {
        showGrid();
    }
});

// Handle Home Click
siteName.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.location.pathname !== '/') {
        navigateTo('/');
    } else {
        window.scrollTo(0, 0);
    }
});

function toggleFullscreen(btn) {
    const container = btn.closest('.model-container');
    if (!container) return;
    const mv = container.querySelector('model-viewer');
    
    if (!document.fullscreenElement) {
        if (mv) mv.removeAttribute('disable-zoom');
        container.requestFullscreen().then(() => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        });
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
    } else {
        if (mv) mv.setAttribute('disable-zoom', '');
        document.exitFullscreen();
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
    }
}

document.addEventListener('fullscreenchange', () => {
    document.querySelectorAll('.model-container model-viewer[camera-controls]').forEach((mv) => {
        if (mv.closest('.model-container') === document.fullscreenElement) {
            mv.removeAttribute('disable-zoom');
        } else {
            mv.setAttribute('disable-zoom', '');
        }
    });
});

// CSV Parser
function parseCSV(text) {
    const p = [[]];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '"' && inQuotes && next === '"') {
            cur += '"'; i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            p[p.length - 1].push(cur.trim()); cur = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i++;
            p[p.length - 1].push(cur.trim()); cur = '';
            p.push([]);
        } else {
            cur += char;
        }
    }
    if (cur || p[p.length - 1].length) p[p.length - 1].push(cur.trim());
    const rows = p.filter(r => r.length > 1);
    
    if (rows.length < 2) return [];
    const header = rows[0].map(h => h.trim());
    return rows.slice(1).map(row => {
        const obj = {};
        header.forEach((key, idx) => {
            obj[key] = row[idx] || '';
        });
        return obj;
    });
}

async function fetchData() {
    try {
        const res = await fetch(CONFIG.DATA_URL);
        const text = await res.text();
        publicDb = parseCSV(text);
        updateCombinedDb();
        
        // Initial Route Handling
        const path = window.location.pathname;
        if (path !== '/') {
            const item = db.find(i => {
                const itemPath = '/' + (i.Page || "").toLowerCase().replace(/\s+/g, '-');
                return itemPath === path.toLowerCase();
            });
            if (item) renderPage(item);
        }
    } catch (e) {
        console.error("Public fetch failed:", e);
    }
}

async function fetchPrivateData() {
    if (CONFIG.PRIVATE_DATA_URL.includes('PRIVATE_GID_HERE')) return;
    try {
        const res = await fetch(CONFIG.PRIVATE_DATA_URL);
        const text = await res.text();
        privateDb = parseCSV(text);
        updateCombinedDb();
    } catch (e) {
        console.error("Private fetch failed:", e);
    }
}

function updateCombinedDb() {
    if (isFamilyMode) {
        db = [...privateDb]; // Only show private family work
    } else {
        db = [...publicDb, ...privateDb]; // Show everything
    }
    
    if (currentView === 'grid') initGrid();
}

function initGrid() {
    currentView = 'grid';
    cleanupModelViewers(grid);
    grid.innerHTML = '';
    grid.style.display = 'grid';
    pageView.style.display = 'none';
    
    const items = db.filter(item => item.Page);

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item loading';
        
        const pagePath = item.Page || "";
        const title = pagePath.split('/').pop() || pagePath;
        const thumbnail = getFirstMedia(item.Content);

        if (!thumbnail) {
            div.innerHTML = `<div class="placeholder-404">404</div>`;
        } else {
            const { url: thumbnailUrl, tags } = parseMediaLine(thumbnail);
            const isVideo = thumbnailUrl.endsWith('.mp4');
            const isModel = thumbnailUrl.endsWith('.glb');
            const youtubeId = getYoutubeId(thumbnailUrl);
            
            if (isVideo && !youtubeId) {
                div.innerHTML = `
                    <video muted playsinline class="thumb-video" onloadeddata="this.parentElement.classList.remove('loading')" onerror="this.parentElement.classList.remove('loading'); this.outerHTML='<div class=&quot;placeholder-404&quot;>404</div>'">
                        <source src="${thumbnailUrl}" type="video/mp4">
                    </video>
                `;
                const videoEl = div.querySelector('video');
                mediaObserver.observe(videoEl);
            } else if (isModel) {
                const { rotationSpeed, orientation, scale, fov, intensity } = getModelSettings(tags, true);
                div.innerHTML = `
                    <model-viewer 
                        data-model-src="${thumbnailUrl}"
                        data-auto-rotate="false"
                        loading="lazy"
                        rotation-speed="${rotationSpeed}"
                        camera-controls="false"
                        interaction-prompt="none"
                        orientation="${orientation}"
                        scale="${scale}"
                        field-of-view="${fov}"
                        camera-orbit="${modelOrbitBySrc.get(getModelKey(thumbnailUrl)) || DEFAULT_MODEL_CAMERA_ORBIT}"
                        exposure="1"
                        shadow-intensity="${intensity}"
                        shadow-softness="1"
                        style="width: 100%; height: 100%; pointer-events: none;">
                    </model-viewer>
                `;
                const mv = div.querySelector('model-viewer');
                mv.addEventListener('load', () => div.classList.remove('loading'));
                mv.addEventListener('error', () => div.classList.remove('loading'));
            } else {
                const thumbUrl = youtubeId 
                    ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` 
                    : thumbnailUrl;
                div.innerHTML = `<img src="${thumbUrl}" alt="${title}" onload="this.parentElement.classList.remove('loading')" onerror="this.parentElement.classList.remove('loading'); this.outerHTML='<div class=&quot;placeholder-404&quot;>404</div>'">`;
            }
        }

        div.addEventListener('click', () => {
            rememberVisibleModelOrbits(div);
            const path = '/' + pagePath.toLowerCase().replace(/\s+/g, '-');
            navigateTo(path, item);
        });
        grid.appendChild(div);
        initModelOrbitTracking(div);
    });
}

const mediaObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
            if (!video.ended) video.play();
        } else {
            video.pause();
        }
    });
}, { threshold: 0.1 });

function renderPage(item) {
    currentView = 'page';
    document.documentElement.classList.add('page-open');
    document.body.classList.add('page-open');
    grid.style.display = 'none';
    pageView.style.display = 'block';
    window.scrollTo(0, 0);

    const title = item.Page || "";
    const contentMarkdown = item.Content || "";
    const content = contentMarkdown ? marked.parse(contentMarkdown) : '';

    pageView.innerHTML = `
        <div class="page-back-layer" aria-hidden="true"></div>
        <div class="page-content">
            <div class="block-text">
                <h1>${title}</h1>
            </div>
            ${content}
        </div>
    `;
    initModelOrbitTracking(pageView);
}

function showGrid() {
    rememberVisibleModelOrbits(pageView);
    cleanupModelViewers(pageView);
    currentView = 'grid';
    document.documentElement.classList.remove('page-open');
    document.body.classList.remove('page-open');
    grid.style.display = 'grid';
    pageView.style.display = 'none';
    pageView.innerHTML = ''; // Kill all playing videos/iframes
    window.scrollTo(0, 0);
}

// Global Exports
window.signIn = signIn;
window.signOut = signOut;

// Global Haptic Trigger
document.addEventListener('click', (e) => {
    const isActivator = e.target.closest('.item, .btn, .btn-mini, .header-name, a');
    const isPageBack = !!e.target.closest('.page-back-layer');

    if (isActivator || isPageBack) haptic();
});

initAuth();

fetchData();
