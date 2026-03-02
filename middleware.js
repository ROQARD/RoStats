const PROXIES = ["rotunnel.com", "roproxy.com", "rbxproxy.com"];

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    const apiHeaders = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
    const tryFetch = async (s, e) => {
      for (let p of PROXIES) {
        try {
          const r = await fetch(`https://${s}.${p}${e}`, { headers: { "User-Agent": "RoStats_Standard" }});
          if (r.status === 403) throw new Error("Private");
          if (r.ok) return await r.json();
        } catch (err) { if (err.message === "Private") throw err; continue; }
      }
      throw new Error("NotFound");
    };

    try {
      if (url.pathname === "/api/validate-id") {
        const id = url.searchParams.get("id");
        const d = await tryFetch('apis', `/universes/v1/places/${id}/universe`);
        return new Response(JSON.stringify({ universeId: d.universeId }), { headers: apiHeaders });
      }
      if (url.pathname === "/api/get-stats") {
        const u = url.searchParams.get("uid");
        const [g, v, f] = await Promise.all([
          tryFetch('games', `/v1/games?universeIds=${u}`),
          tryFetch('games', `/v1/games/votes?universeIds=${u}`),
          tryFetch('games', `/v1/games/${u}/favorites/count`)
        ]);
        return new Response(JSON.stringify({ game: g.data[0], votes: v.data[0], favorites: f.favoritesCount }), { headers: apiHeaders });
      }
    } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: apiHeaders }); }
  }

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

export const config = { matcher: '/:path*' };

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1937157010205619" crossorigin="anonymous"></script>
    <title>RoStats | Roblox Analytics</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        :root { --bg: #050505; --card: #0c0c0c; --border: #1a1a1a; --accent: #4ade80; --text: #fff; --dim: #71717a; --warn: #ff4444; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        
        .header { width: 100%; max-width: 650px; padding: 20px; display: flex; justify-content: flex-end; gap: 10px; }
        .modal-overlay { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:1000; align-items:center; justify-content:center; }
        .modal { background: #0f0f0f; border: 1px solid var(--border); padding: 30px; border-radius: 24px; width: 90%; max-width: 380px; text-align: center; }
        .modal input { width: 100%; background: #000; border: 1px solid var(--border); color: white; padding: 12px; border-radius: 12px; margin-bottom: 12px; outline: none; }
        
        .auth-btn { background: var(--accent); color: #000; border: none; padding: 8px 18px; border-radius: 10px; font-weight: 800; cursor: pointer; font-size: 0.8rem; }
        .auth-btn.secondary { background: #1a1a1a; color: #fff; border: 1px solid var(--border); }

        .container { width: 100%; max-width: 650px; padding: 0 20px 100px; }
        .search-area { background: var(--card); border: 1px solid var(--border); padding: 35px; border-radius: 28px; text-align: center; margin-bottom: 20px; }
        .input-box { display: flex; gap: 10px; background: #000; padding: 8px; border-radius: 16px; border: 1px solid var(--border); }
        input { flex: 1; background: transparent; border: none; color: white; padding: 10px 15px; font-size: 0.95rem; outline: none; }
        .scan-btn { background: var(--accent); color: #000; border: none; padding: 0 25px; border-radius: 12px; font-weight: 800; cursor: pointer; }
        
        .nav-label { font-size: 0.6rem; color: #444; text-transform: uppercase; font-weight: 900; letter-spacing: 1.5px; margin: 25px 0 10px; }
        .chip-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .nav-chip { background: var(--card); border: 1px solid var(--border); color: var(--dim); padding: 10px 16px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        
        .dashboard { display: none; flex-direction: column; gap: 15px; margin-top: 20px; }
        .box { background: var(--card); border: 1px solid var(--border); padding: 25px; border-radius: 20px; text-align: center; position: relative; }
        .fav-btn { position: absolute; top: 20px; right: 20px; font-size: 1.5rem; cursor: pointer; color: var(--dim); }
        .fav-btn.active { color: var(--warn); }
        
        .thumb-wrap { width: 110px; height: 110px; border-radius: 20px; margin: 0 auto 15px; overflow: hidden; border: 1px solid var(--border); }
        .thumb-wrap img { width: 100%; height: 100%; object-fit: cover; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .val { font-size: 1.3rem; font-weight: 800; display: block; }
        .label { font-size: 0.6rem; color: var(--dim); text-transform: uppercase; font-weight: 900; }

        .desc-container { text-align: left; background: #000; padding: 20px; border-radius: 15px; border: 1px solid var(--border); }
        #gDesc { font-size: 0.85rem; color: #ccc; line-height: 1.6; max-height: 250px; overflow-y: auto; white-space: pre-wrap; }
        
        .admin-tag { background: #ffdf00; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 900; margin-right: 8px; display: none; }
        .footer { position: fixed; bottom: 20px; right: 25px; opacity: 0.4; font-size: 0.65rem; font-weight: 800; }
    </style>
</head>
<body>
    <div id="authModal" class="modal-overlay" onclick="closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
            <h2 id="modalTitle" style="margin-bottom:20px;">Login</h2>
            <input type="text" id="modalUser" placeholder="Username">
            <input type="password" id="modalPass" placeholder="Password">
            <button class="auth-btn" style="width:100%; padding:14px;" id="modalSubmit">Continue</button>
        </div>
    </div>

    <div class="header">
        <div id="loggedOutUI">
            <button class="auth-btn secondary" onclick="openModal('signup')">Create Account</button>
            <button class="auth-btn" onclick="openModal('login')">Log In</button>
        </div>
        <div id="loggedInUI" style="display:none; align-items:center;">
            <span class="admin-tag" id="adminTag">ADMIN</span>
            <span id="displayUser" style="margin-right:12px; font-weight:700; font-size:0.8rem;"></span>
            <button id="adminBtn" class="auth-btn secondary" style="display:none; margin-right:8px;" onclick="toggleAdminPanel()">Panel</button>
            <button class="auth-btn" style="background:var(--warn); color:#fff;" onclick="logout()">Sign Out</button>
        </div>
    </div>

    <div class="container">
        <div class="search-area">
            <h1 style="font-size: 2.2rem; margin-bottom:20px; letter-spacing:-1px;">Ro<span style="color:var(--accent)">Stats</span></h1>
            <div class="input-box">
                <input type="text" id="placeId" placeholder="Paste Game ID here...">
                <button class="scan-btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div class="captcha-box" style="margin-top:15px;"><div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div></div>
        </div>

        <div id="navWrapper">
            <div class="nav-label">Popular Globally</div><div id="popContainer" class="chip-group"></div>
            <div id="favBlock" style="display:none;"><div class="nav-label">Your Favorites ❤️</div><div id="favContainer" class="chip-group"></div></div>
            <div class="nav-label">Recent Searches</div><div id="recentContainer" class="chip-group"></div>
        </div>

        <div id="results" class="dashboard">
            <div class="box">
                <div class="fav-btn" id="heartBtn" onclick="toggleFavorite()">❤</div>
                <div class="thumb-wrap"><img id="gThumb" src=""></div>
                <h2 id="gTitle" style="font-size: 1.6rem;">-</h2>
                <a id="gOwner" style="color:var(--accent); text-decoration:none; font-size:0.85rem; font-weight:600; margin-top:8px; display:inline-block;" target="_blank">-</a>
            </div>
            <div class="stats-grid">
                <div class="box"><span class="label">Active</span><span class="val" id="vPlay">-</span></div>
                <div class="box"><span class="label">Visits</span><span class="val" id="vVisit">-</span></div>
                <div class="box"><span class="label">Rating</span><span class="val" id="vRate">-</span></div>
            </div>
            <div class="desc-container">
                <div class="nav-label" style="margin: 0 0 10px 0; color:var(--text)">Full Description</div>
                <div id="gDesc"></div>
            </div>
        </div>
    </div>

    <div class="footer"><a href="https://www.roblox.com/users/9461867215/profile" style="color:inherit; text-decoration:none;" target="_blank">BY ROQARD</a></div>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, orderBy, limit, getDocs, increment } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyAm6HmeQsY8G1saKkZvrJpPApedPWJ60lU",
            authDomain: "rostats-afa40.firebaseapp.com",
            projectId: "rostats-afa40",
            storageBucket: "rostats-afa40.firebasestorage.app",
            messagingSenderId: "212222377382",
            appId: "1:212222377382:web:0c2d3e1a0c1ae18f1fe367"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        let currentUser = null, userData = null, currentGame = null;

        const fmt = x => {
            if (x >= 1e9) return (x / 1e9).toFixed(1) + 'B';
            if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M';
            if (x >= 1e3) return (x / 1e3).toFixed(1) + 'K';
            return x.toLocaleString();
        };

        window.openModal = (mode) => {
            document.getElementById('modalTitle').innerText = mode === 'signup' ? 'Create Account' : 'Login';
            document.getElementById('modalSubmit').onclick = () => handleAuth(mode);
            document.getElementById('authModal').style.display = 'flex';
        };
        window.closeModal = () => { document.getElementById('authModal').style.display = 'none'; };

        window.handleAuth = async (mode) => {
            const user = document.getElementById('modalUser').value;
            const pass = document.getElementById('modalPass').value;
            if(!user || pass.length < 6) return alert("Username required and password 6+ chars.");
            const email = user + "@rostats.internal";
            try {
                if(mode === 'signup') await createUserWithEmailAndPassword(auth, email, pass);
                else await signInWithEmailAndPassword(auth, email, pass);
                closeModal();
            } catch(e) { alert("Error: " + e.message); }
        };

        window.logout = () => signOut(auth);

        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            if(user) {
                const snap = await getDoc(doc(db, "users", user.uid));
                if(!snap.exists()) {
                    userData = { recents: [], favorites: [], role: 'user' };
                    await setDoc(doc(db, "users", user.uid), userData);
                } else { userData = snap.data(); }
                document.getElementById('loggedOutUI').style.display = 'none';
                document.getElementById('loggedInUI').style.display = 'flex';
                document.getElementById('displayUser').innerText = user.email.split('@')[0];
                if(userData.role === 'admin') { document.getElementById('adminBtn').style.display = 'block'; document.getElementById('adminTag').style.display = 'inline-block'; }
                renderUserCollections();
            } else {
                document.getElementById('loggedOutUI').style.display = 'flex';
                document.getElementById('loggedInUI').style.display = 'none';
            }
        });

        window.onCaptcha = (t) => { window.captchaToken = t; document.getElementById('scanBtn').disabled = false; };

        window.run = async () => {
            const raw = document.getElementById('placeId').value;
            const id = raw.match(/games\\/(\\d+)/) ? raw.match(/games\\/(\\d+)/)[1] : raw.replace(/\\D/g, '');
            const btn = document.getElementById('scanBtn');
            btn.innerText = '...';
            try {
                const r = await fetch("/api/validate-id?id=" + id).then(res => res.json());
                const d = await fetch("/api/get-stats?uid=" + r.universeId).then(res => res.json());
                const g = d.game;
                currentGame = { id, name: g.name };
                
                document.getElementById('navWrapper').style.display = 'none';
                document.getElementById('results').style.display = 'flex';
                document.getElementById('gTitle').innerText = g.name;
                document.getElementById('vPlay').innerText = fmt(g.playing);
                document.getElementById('vVisit').innerText = fmt(g.visits);
                document.getElementById('vRate').innerText = Math.round((d.votes.upVotes / (d.votes.upVotes + d.votes.downVotes)) * 100) + "%";
                document.getElementById('gDesc').innerText = g.description;
                document.getElementById('gThumb').src = "https://www.roblox.com/asset-thumbnail/image?assetId=" + id + "&width=420&height=420&format=png";
                document.getElementById('gOwner').innerText = "By " + g.creator.name;
                document.getElementById('gOwner').href = "https://www.roblox.com/users/" + g.creator.id;
                document.getElementById('heartBtn').classList.toggle('active', userData?.favorites?.some(x => x.id === id));
                
                if(currentUser) await updateDoc(doc(db, "users", currentUser.uid), { recents: arrayUnion(currentGame) });
                await setDoc(doc(db, "popular", id), { name: g.name, count: increment(1), hidden: false }, { merge: true });
                btn.innerText = 'Scan';
                loadPopular();
            } catch(e) { btn.innerText = 'Scan'; alert("Error loading game."); }
        };

        window.toggleFavorite = async () => {
            if(!currentUser) return openModal('login');
            const isFav = document.getElementById('heartBtn').classList.toggle('active');
            await updateDoc(doc(db, "users", currentUser.uid), { favorites: isFav ? arrayUnion(currentGame) : arrayRemove(userData.favorites.find(x => x.id === currentGame.id)) });
            const snap = await getDoc(doc(db, "users", currentUser.uid));
            userData = snap.data();
            renderUserCollections();
        };

        async function loadPopular() {
            const q = query(collection(db, "popular"), where("hidden", "==", false), orderBy("count", "desc"), limit(6));
            const snap = await getDocs(q);
            renderChips(snap.docs.map(d => ({id: d.id, name: d.data().name})), 'popContainer');
        }

        function renderUserCollections() {
            if(userData.favorites?.length) { document.getElementById('favBlock').style.display = 'block'; renderChips(userData.favorites, 'favContainer'); }
            if(userData.recents?.length) renderChips(userData.recents.slice(-5).reverse(), 'recentContainer');
        }

        function renderChips(list, target) {
            const container = document.getElementById(target);
            container.innerHTML = '';
            list.forEach(g => {
                const c = document.createElement('div');
                c.className = 'nav-chip';
                c.innerText = g.name;
                c.onclick = () => { document.getElementById('placeId').value = g.id; window.run(); };
                container.appendChild(c);
            });
        }

        loadPopular();
    </script>
</body></html>`;
