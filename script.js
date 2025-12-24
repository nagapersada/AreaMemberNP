const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let globalData = [], myTeamData = [], globalHistory = [], sortState = { col: 'joinDate', dir: 'asc' };
let vipLists = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] };
let achieverTxtContent = "";

// --- INISIALISASI HALAMAN ---
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');

    // Cek Login
    if (!isLoggedIn && !path.includes('index.html')) {
        window.location.href = 'index.html';
        return;
    }

    // Load Data jika sudah login
    if (isLoggedIn) {
        await loadData();
    }

    // Routing Fungsi per Halaman
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        const btn = document.getElementById('loginButton');
        if(btn) btn.addEventListener('click', doLogin);
    } 
    else if (path.includes('dashboard.html')) {
        renderDashboard();
    } 
    else if (path.includes('list.html')) {
        prepareMyTeamData();
        initList();
    } 
    else if (path.includes('network.html')) {
        prepareMyTeamData();
        initNetwork();
    }
});

// --- LOAD DATA DARI SUPABASE ---
async function loadData() {
    try {
        // 1. Ambil Data Member
        const { data: members, error: errMember } = await db.from('members').select('*');
        if (errMember) throw errMember;
        
        globalData = members.map(m => ({
            uid: String(m.UID || m.uid).trim(),
            name: (m.Nama || m.nama || m.name || '-').trim(),
            upline: m.Upline || m.upline ? String(m.Upline || m.upline).trim() : "",
            joinDate: new Date(m.TanggalBergabung || m.tanggalbergabung || m.joinDate)
        }));

        // 2. Ambil Data History Pangkat
        const { data: history, error: errHistory } = await db.from('vip_history').select('*');
        if (!errHistory) {
            globalHistory = history;
        } else {
            globalHistory = []; // Fallback jika gagal ambil history
        }

    } catch (err) {
        console.error("Gagal memuat data:", err);
        alert("Gagal memuat data database. Coba refresh.");
    }
}

// --- FUNGSI LOGIN ---
async function doLogin() {
    const inputUid = document.getElementById('loginUid').value.trim();
    const btn = document.getElementById('loginButton');
    const errEl = document.getElementById('error');

    if (!inputUid) return errEl.innerText = "Masukkan UID";

    btn.innerText = "...";
    btn.disabled = true;

    await loadData();

    const user = globalData.find(m => m.uid === inputUid);
    if (user) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userUid', user.uid);
        window.location.href = 'dashboard.html';
    } else {
        errEl.innerText = "UID Tidak Terdaftar";
        btn.innerText = "MASUK";
        btn.disabled = false;
    }
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// --- LOGIKA UTAMA DASHBOARD ---
function renderDashboard() {
    const myUid = sessionStorage.getItem('userUid');
    if (!globalData.length) return; // Tunggu data load
    
    const me = globalData.find(m => m.uid === myUid);
    if (!me) return logout();

    // Isi Info Header
    document.getElementById('mName').innerText = me.name;
    document.getElementById('mUid').innerText = me.uid;
    const upline = globalData.find(u => u.uid === me.upline);
    document.getElementById('mRefUid').innerText = upline ? upline.uid : '-';

    // Hitung Tim
    const downlines = getDownlinesRecursive(myUid);
    const totalTeam = 1 + downlines.length; // +1 diri sendiri
    document.getElementById('totalMembers').innerText = totalTeam;

    // Hitung Rank Saya
    const directDownlines = globalData.filter(m => m.upline === myUid).length;
    calculateMyRank(totalTeam, directDownlines, me.uid);

    // Siapkan Data untuk Grafik & VIP
    myTeamData = [me, ...downlines];
    countVipStats(myTeamData);

    // Hitung Periode & Target
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth();
    const y = now.getFullYear();
    
    let startP, endP, labelP, isP2 = false;

    // Logika Periode Berjalan (Dashboard)
    if (d > 15) {
        // Periode 2 (16 - Akhir Bulan)
        startP = new Date(y, m, 16);
        endP = new Date(y, m + 1, 0, 23, 59, 59); // Akhir bulan
        labelP = `PERIODE 2 (${getMonthName(m)})`;
        isP2 = true;
    } else {
        // Periode 1 (1 - 15)
        startP = new Date(y, m, 1);
        endP = new Date(y, m, 15, 23, 59, 59);
        labelP = `PERIODE 1 (${getMonthName(m)})`;
    }

    document.getElementById('currentPeriodLabel').innerText = labelP;

    // Hitung Angka Dashboard
    // 1. Periode Lalu (Full bulan kemarin atau 15 hari lalu)
    // Sederhana: Total tim sebelum periode ini dimulai
    const prevCount = myTeamData.filter(m => m.joinDate < startP).length;
    
    // 2. Target 50%
    const target = Math.ceil(prevCount / 2);

    // 3. Baru (Saat Ini)
    const newCount = myTeamData.filter(m => {
        const jd = new Date(m.joinDate);
        return jd >= startP && jd <= endP;
    }).length;

    // 4. Kurang
    let gap = target - newCount;
    if (gap < 0) gap = 0;

    document.getElementById('prevPeriodCount').innerText = prevCount;
    document.getElementById('targetCount').innerText = target;
    document.getElementById('newMemberCount').innerText = newCount;
    document.getElementById('gapCount').innerText = gap;

    // Render Grafik Growth
    renderChart(myTeamData, y, m, isP2);
}

// --- FUNGSI CHART (GRAFIK) ---
function renderChart(teamData, year, month, isPeriod2) {
    const ctx = document.getElementById('growthChart');
    if(!ctx) return;
    
    // Tentukan Rentang Tanggal P1 dan P2
    const p1Start = new Date(year, month, 1);
    const p1End = new Date(year, month, 15, 23, 59, 59);
    
    const p2Start = new Date(year, month, 16);
    const p2End = new Date(year, month + 1, 0, 23, 59, 59);

    const countP1 = teamData.filter(m => m.joinDate >= p1Start && m.joinDate <= p1End).length;
    const countP2 = teamData.filter(m => m.joinDate >= p2Start && m.joinDate <= p2End).length;

    // Warna: Period aktif = Emas, Period mati = Gelap
    const colorP1 = isPeriod2 ? '#333' : '#D4AF37';
    const colorP2 = isPeriod2 ? '#D4AF37' : '#333';

    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['P1', 'P2'],
            datasets: [{
                label: 'Growth',
                data: [countP1, countP2],
                backgroundColor: [colorP1, colorP2],
                borderColor: '#D4AF37',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#222' }, ticks: { display: false } },
                x: { grid: { display: false }, ticks: { color: '#888', font: { size: 9 } } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- FUNGSI HITUNG PANGKAT (CORE LOGIC) ---
function getDownlinesRecursive(uid) {
    let list = [];
    const directs = globalData.filter(m => m.upline === uid);
    directs.forEach(d => {
        list.push(d);
        list = list.concat(getDownlinesRecursive(d.uid));
    });
    return list;
}

function countSpecificVipInTeam(teamMembers, targetLevel) {
    let count = 0;
    // Mulai dari index 1 karena index 0 adalah diri sendiri (upline)
    for (let i = 1; i < teamMembers.length; i++) {
        if (getRankLevel(teamMembers[i].uid) >= targetLevel) {
            count++;
        }
    }
    return count;
}

function getRankLevel(uid) {
    // Optimasi: Jangan panggil getDownlinesRecursive berlebihan jika tidak perlu
    // Tapi karena struktur rank butuh total, mau tidak mau harus hitung
    const directs = globalData.filter(m => m.upline === uid).length;
    
    // Syarat paling dasar: VIP 1 butuh 5 direct
    if (directs < 5) return 0;

    const myTeam = [globalData.find(m => m.uid === uid), ...getDownlinesRecursive(uid)];
    const total = myTeam.length;

    // Syarat VIP tiers
    const tiers = [
        { level: 9, min: 3501, reqVip: 2, reqLvl: 2 },
        { level: 8, min: 1601, reqVip: 2, reqLvl: 2 },
        { level: 7, min: 901, reqVip: 2, reqLvl: 2 },
        { level: 6, min: 501, reqVip: 2, reqLvl: 2 },
        { level: 5, min: 351, reqVip: 2, reqLvl: 2 },
        { level: 4, min: 201, reqVip: 2, reqLvl: 2 },
        { level: 3, min: 101, reqVip: 2, reqLvl: 2 },
        { level: 2, min: 31, reqVip: 2, reqLvl: 1 }
    ];

    // Cek VIP 1 dulu
    // Jika directs >= 5 dan total >= 5, minimal VIP 1
    let currentLevel = 1;

    // Cek Level Tinggi
    const v2Count = countSpecificVipInTeam(myTeam, 2);
    const v1Count = countSpecificVipInTeam(myTeam, 1);

    for (const tier of tiers) {
        if (total >= tier.min) {
            // Jika butuh VIP 2
            if (tier.level >= 3) {
                if (v2Count >= tier.reqVip) return tier.level;
            } 
            // Jika butuh VIP 1 (untuk case VIP 2)
            else {
                if (v1Count >= tier.reqVip) return tier.level;
            }
        }
    }

    return currentLevel;
}

function calculateMyRank(teamSize, directCount, uid) {
    const level = getRankLevel(uid);
    const rankNames = ["MEMBER", "V.I.P 1", "V.I.P 2", "V.I.P 3", "V.I.P 4", "V.I.P 5", "V.I.P 6", "V.I.P 7", "V.I.P 8", "V.I.P 9"];
    
    document.getElementById('rankName').innerText = rankNames[level];

    // Hitung Target Next
    let nextLvl = level + 1;
    let msg = "Top Level";
    let gap = 0;

    // Definisi ulang tiers untuk display target
    const tiers = [
        { lvl: 1, min: 5, req: 0, type: 'direct' },
        { lvl: 2, min: 31, req: 2, type: 'vip1' },
        { lvl: 3, min: 101, req: 2, type: 'vip2' },
        { lvl: 4, min: 201, req: 2, type: 'vip2' },
        { lvl: 5, min: 351, req: 2, type: 'vip2' },
        { lvl: 6, min: 501, req: 2, type: 'vip2' },
        { lvl: 7, min: 901, req: 2, type: 'vip2' },
        { lvl: 8, min: 1601, req: 2, type: 'vip2' },
        { lvl: 9, min: 3501, req: 2, type: 'vip2' }
    ];

    if (nextLvl <= 9) {
        const nextReq = tiers.find(t => t.lvl === nextLvl);
        
        // Gap Anggota
        const currentCount = (nextLvl === 1) ? directCount : teamSize;
        gap = nextReq.min - currentCount;
        if (gap < 0) gap = 0;

        // Pesan Syarat
        if (nextReq.type === 'direct') {
            msg = `Menuju V.I.P 1`;
        } else {
            // Cek kebutuhan struktur
            const myTeam = [globalData.find(m => m.uid === uid), ...getDownlinesRecursive(uid)];
            const vCount = (nextLvl >= 3) ? countSpecificVipInTeam(myTeam, 2) : countSpecificVipInTeam(myTeam, 1);
            const reqName = (nextLvl >= 3) ? "V.I.P 2" : "V.I.P 1";
            
            if (vCount < nextReq.req) {
                msg = `Kurang ${nextReq.req - vCount} ${reqName} di Tim`;
            } else {
                msg = `Menuju ${rankNames[nextLvl]}`;
            }
        }
    }

    document.getElementById('rankNextGoal').innerText = msg;
    document.getElementById('rankNextGoal').style.color = msg.includes("Kurang") ? '#ff4444' : '#ccc';
    document.getElementById('nextLevelGap').innerText = gap;
}

// --- VIP STATS & HISTORY (DENGAN AUTO SAVE) ---
async function checkAndSaveHistory(uid, level) {
    // Cek di memory dulu
    const exists = globalHistory.find(h => h.uid === uid && h.vip_level === level);
    if (!exists) {
        const now = new Date().toISOString();
        // Push ke memory agar tidak double request
        globalHistory.push({ uid, vip_level: level, achieved_at: now });
        // Kirim ke DB background
        db.from('vip_history').insert([{ uid, vip_level: level, achieved_at: now }])
          .then(({ error }) => { if (error) console.log("Auto-save VIP history:", error); });
    }
}

function countVipStats(teamData) {
    // Reset hitungan
    let counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    let isNew = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false };
    
    // Reset list global
    vipLists = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] };

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    teamData.forEach(m => {
        const lvl = getRankLevel(m.uid);
        if (lvl >= 1 && lvl <= 9) {
            counts[lvl]++;
            vipLists[lvl].push(m);
            
            // Auto Save ke History
            checkAndSaveHistory(m.uid, lvl);

            // Cek Status "Baru" untuk kedipan merah
            const hist = globalHistory.find(h => h.uid === m.uid && h.vip_level === lvl);
            // Gunakan tanggal history jika ada, jika tidak pakai joinDate (fallback)
            const achieveTime = hist ? new Date(hist.achieved_at) : new Date(m.joinDate);
            
            if ((now - achieveTime) < oneDay) {
                isNew[lvl] = true;
            }
        }
    });

    // Update Tampilan Kotak VIP
    for (let i = 1; i <= 9; i++) {
        const el = document.getElementById(`cVIP${i}`);
        if (el) {
            el.innerText = counts[i];
            const parent = el.parentElement;
            if (isNew[i]) parent.classList.add('new-alert');
            else parent.classList.remove('new-alert');
        }
    }
}

// --- MODAL VIP (SORT TERBARU -> TERLAMA) ---
window.openVipModal = function(level) {
    const modal = document.getElementById('vipModal');
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    
    title.innerText = `DAFTAR V.I.P ${level}`;
    body.innerHTML = '';

    let list = [...vipLists[level]];
    
    // Sort Descending by Achieved Date
    list.sort((a, b) => {
        const hA = globalHistory.find(h => h.uid === a.uid && h.vip_level === level);
        const hB = globalHistory.find(h => h.uid === b.uid && h.vip_level === level);
        
        const tA = hA ? new Date(hA.achieved_at).getTime() : new Date(a.joinDate).getTime();
        const tB = hB ? new Date(hB.achieved_at).getTime() : new Date(b.joinDate).getTime();
        
        return tB - tA; // Besar (Baru) ke Kecil (Lama)
    });

    if (list.length === 0) {
        body.innerHTML = '<div class="v-empty">Belum ada anggota.</div>';
    } else {
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        list.forEach(m => {
            const hist = globalHistory.find(h => h.uid === m.uid && h.vip_level === level);
            const time = hist ? new Date(hist.achieved_at) : new Date(m.joinDate);
            
            const isNew = (now - time) < oneDay;
            const dateStr = `${time.getDate()}/${time.getMonth()+1} ${time.getHours()}:${String(time.getMinutes()).padStart(2,'0')}`;

            body.innerHTML += `
                <div class="v-item ${isNew ? 'new-name-alert' : ''}">
                    <div style="display:flex; flex-direction:column;">
                        <span class="v-n">${m.name} ${isNew ? '🆕' : ''}</span>
                        <small style="color:#666; font-size:9px;">${dateStr}</small>
                    </div>
                    <span class="v-u">${m.uid}</span>
                </div>
            `;
        });
    }

    modal.style.display = 'flex';
}

window.closeVipModal = function() {
    document.getElementById('vipModal').style.display = 'none';
}

// --- FITUR PIALA (ACHIEVER) - REVISI ANTI-ERROR ---
window.openAchieverModal = function() {
    const modal = document.getElementById('achieverModal');
    const body = document.getElementById('achieverBody');
    const title = document.getElementById('achieverTitle');
    const btnDl = document.getElementById('btnDlAchiever');

    modal.style.display = 'flex';
    body.innerHTML = '<div class="v-empty">Sedang menghitung data...</div>';
    btnDl.style.display = 'none';
    achieverTxtContent = "";

    // Gunakan setTimeout agar UI sempat render 'Sedang menghitung'
    setTimeout(() => {
        try {
            const now = new Date();
            const d = now.getDate();
            const m = now.getMonth();
            const y = now.getFullYear();
            
            let startP, endP, labelP;

            // Tentukan Periode LALU (yang sudah lewat/selesai)
            if (d > 15) {
                // Jika hari ini tgl 16+, periode lalu = Tgl 1-15 bulan ini
                startP = new Date(y, m, 1);
                endP = new Date(y, m, 15, 23, 59, 59);
                labelP = `PERIODE 1 (${getMonthName(m)} ${y})`;
            } else {
                // Jika hari ini tgl 1-15, periode lalu = Tgl 16-30 bulan KEMARIN
                let pm = m - 1;
                let py = y;
                if (pm < 0) { pm = 11; py--; }
                startP = new Date(py, pm, 16);
                endP = new Date(py, pm + 1, 0, 23, 59, 59);
                labelP = `PERIODE 2 (${getMonthName(pm)} ${py})`;
            }

            title.innerText = `PERAIH 50% - ${labelP}`;
            achieverTxtContent = `🏆 PERAIH GROWTH 50%\n📅 ${labelP}\n================\n\n`;

            const myUid = sessionStorage.getItem('userUid');
            let achievers = [];

            // Loop semua anggota tim
            myTeamData.forEach(mem => {
                // 1. Abaikan yang bergabung SETELAH periode berakhir
                if (new Date(mem.joinDate) > endP) return;

                const dls = getDownlinesRecursive(mem.uid);

                // 2. Hitung Base (Tim SEBELUM periode mulai)
                // +1 menghitung dirinya sendiri agar target adil
                const base = dls.filter(d => new Date(d.joinDate) < startP).length + 1;

                // 3. Hitung Growth (Tim DALAM periode)
                const grow = dls.filter(d => {
                    const jd = new Date(d.joinDate);
                    return jd >= startP && jd <= endP;
                }).length;

                // 4. Hitung Target
                const target = Math.floor(base / 2);

                // 5. Cek Pangkat SAAT INI
                const rank = getRankLevel(mem.uid);

                // 6. VALIDASI KHUSUS: Cek jumlah referral PADA SAAT periode berakhir
                // Agar member baru yg baru naik pangkat hari ini TIDAK masuk list masa lalu
                const directAtTime = globalData.filter(g => 
                    g.upline === mem.uid && new Date(g.joinDate) <= endP
                ).length;

                // SYARAT LOLOS FINAL
                // - Growth >= Target
                // - Growth > 0 (Ada kerja nyata)
                // - Rank >= 1 (Sudah VIP)
                // - Direct >= 5 (Saat itu sudah punya minimal 5 referral / indikator VIP)
                if (grow >= target && grow > 0 && rank >= 1 && directAtTime >= 5) {
                    achievers.push({
                        name: (mem.uid === myUid ? mem.name + " (ANDA)" : mem.name),
                        uid: mem.uid,
                        target: target,
                        actual: grow,
                        rank: rank
                    });
                }
            });

            // Urutkan pencapaian tertinggi
            achievers.sort((a, b) => b.actual - a.actual);

            if (achievers.length === 0) {
                body.innerHTML = '<div class="v-empty">Belum ada VIP yang mencapai target di periode ini.</div>';
            } else {
                btnDl.style.display = 'block';
                let html = '';
                achievers.forEach((a, i) => {
                    html += `
                        <div class="achiever-item">
                            <div class="achiever-top">
                                <span class="v-n">${i+1}. ${a.name} <small style="color:var(--gold)">(VIP ${a.rank})</small></span>
                                <span class="v-u">${a.uid}</span>
                            </div>
                            <div class="achiever-stats">
                                <span>Target: <b class="val-target">${a.target}</b></span>
                                <span>Capaian: <b class="val-actual">${a.actual}</b></span>
                            </div>
                        </div>
                    `;
                    achieverTxtContent += `${i+1}. ${a.name} (${a.uid}) - VIP ${a.rank}\n   Target: ${a.target} | Capai: ${a.actual}\n\n`;
                });
                body.innerHTML = html;
            }

        } catch (e) {
            console.error(e);
            body.innerHTML = '<div class="v-empty" style="color:red">Terjadi kesalahan perhitungan.</div>';
        }
    }, 100);
}

window.downloadAchieverData = function() {
    if (!achieverTxtContent) return;
    const blob = new Blob([achieverTxtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'peraih_50_persen.txt';
    a.click();
}

window.closeAchieverModal = function() {
    document.getElementById('achieverModal').style.display = 'none';
}

// --- FUNGSI HALAMAN LAIN (List & Network) ---
function prepareMyTeamData() {
    const myUid = sessionStorage.getItem('userUid');
    if(!globalData.length) return; // Data belum siap
    
    const me = globalData.find(m => m.uid === myUid);
    if (me) {
        myTeamData = [me, ...getDownlinesRecursive(myUid)];
    }
}

function initList() {
    window.sortData = (col) => {
        if (sortState.col === col) {
            sortState.dir = (sortState.dir === 'asc') ? 'desc' : 'asc';
        } else {
            sortState.col = col;
            sortState.dir = 'asc';
        }
        renderTable();
    };
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('membersTableBody');
    if(!tbody) return;

    const { col, dir } = sortState;
    
    let sorted = [...myTeamData].sort((a, b) => {
        let valA = a[col];
        let valB = b[col];

        if (col === 'joinDate') {
            return (dir === 'asc') ? valA - valB : valB - valA;
        } else {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
            if (valA < valB) return (dir === 'asc') ? -1 : 1;
            if (valA > valB) return (dir === 'asc') ? 1 : -1;
            return 0;
        }
    });

    let html = '';
    sorted.forEach((m, i) => {
        const d = m.joinDate;
        const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        const ref = m.upline ? m.upline : '-';
        
        html += `
            <tr>
                <td class="col-no">${i + 1}</td>
                <td class="col-name">${m.name}</td>
                <td class="col-uid">${m.uid}</td>
                <td class="col-ref">${ref}</td>
                <td class="col-date">${dateStr}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function initNetwork() {
    // Pastikan library GoJS sudah load di HTML
    if (typeof go === 'undefined') return;

    const myUid = sessionStorage.getItem('userUid');
    const $ = go.GraphObject.make;
    
    const diagram = $(go.Diagram, "networkDiagram", {
        padding: new go.Margin(50),
        scrollMode: go.Diagram.InfiniteScroll,
        layout: $(go.TreeLayout, { angle: 90, layerSpacing: 40 }), // Vertical layout lebih rapi
        initialContentAlignment: go.Spot.Center,
        "undoManager.isEnabled": true,
        minScale: 0.1,
        maxScale: 2.0
    });

    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { fill: "#111", stroke: "#333", strokeWidth: 1 },
            new go.Binding("stroke", "highlight", h => h ? "#D4AF37" : "#333"),
            new go.Binding("strokeWidth", "highlight", h => h ? 2 : 1)
        ),
        $(go.TextBlock, { margin: 8, stroke: "#fff", font: "10px sans-serif", textAlign: "center" },
            new go.Binding("text", "label")
        ),
        $("TreeExpanderButton", { alignment: go.Spot.Bottom, alignmentFocus: go.Spot.Top })
    );

    diagram.linkTemplate = $(go.Link, 
        { routing: go.Link.Orthogonal, corner: 5 },
        $(go.Shape, { strokeWidth: 1, stroke: "#555" })
    );

    const nodeDataArray = myTeamData.map(m => {
        const d = m.joinDate;
        const dateStr = `${d.getDate()}/${d.getMonth()+1}`;
        const isVip = getRankLevel(m.uid) >= 1;
        
        return {
            key: m.uid,
            label: `${m.name}\n(${m.uid})\nJoin: ${dateStr}`,
            highlight: isVip
        };
    });

    const linkDataArray = myTeamData
        .filter(m => m.upline && m.upline !== "")
        .map(m => ({ from: m.upline, to: m.uid }));

    diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    
    // Zoom ke user saat ini
    const rootNode = diagram.findNodeForKey(myUid);
    if (rootNode) {
        diagram.select(rootNode);
        diagram.commandHandler.scrollToPart(rootNode);
    }

    // Fungsi Download Gambar
    window.downloadNetworkImage = function() {
        const imgBlob = diagram.makeImageData({ 
            scale: 2, 
            background: "#000", 
            returnType: "blob",
            maxSize: new go.Size(Infinity, Infinity)
        });
        
        const url = URL.createObjectURL(imgBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "jaringan_dvteam.png";
        a.click();
    };
}

function getMonthName(idx) {
    return ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"][idx];
}
