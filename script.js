const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let globalData = [], myTeamData = [], globalHistory = [];
let vipLists = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] };
let achieverTxtContent = "";

// --- INISIALISASI ---
document.addEventListener('DOMContentLoaded', async () => {
    // Paksa update SW jika ada
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) { registration.update(); }
        });
    }

    const path = window.location.pathname;
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');

    if (!isLoggedIn && !path.includes('index.html')) {
        window.location.href = 'index.html';
        return;
    }

    if (isLoggedIn) await loadData();

    if (path.includes('index.html')) {
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

// --- LOAD DATA ---
async function loadData() {
    try {
        const { data: members, error: errMember } = await db.from('members').select('*');
        if (errMember) throw errMember;
        
        globalData = members.map(m => ({
            uid: String(m.UID || m.uid).trim(),
            name: (m.Nama || m.nama || m.name || '-').trim(),
            upline: m.Upline || m.upline ? String(m.Upline || m.upline).trim() : "",
            joinDate: new Date(m.TanggalBergabung || m.tanggalbergabung || m.joinDate)
        }));

        const { data: history } = await db.from('vip_history').select('*');
        globalHistory = history || [];

    } catch (err) {
        console.log("Load error:", err);
    }
}

// --- DASHBOARD ---
function renderDashboard() {
    const myUid = sessionStorage.getItem('userUid');
    if (!globalData.length) return; 
    
    const me = globalData.find(m => m.uid === myUid);
    if (!me) return logout();

    // TANDA UPDATE BERHASIL: Nama user ada tambahan (V2.0)
    document.getElementById('mName').innerText = me.name; 
    document.getElementById('mUid').innerText = me.uid;
    
    const upline = globalData.find(u => u.uid === me.upline);
    document.getElementById('mRefUid').innerText = upline ? upline.uid : '-';

    const downlines = getDownlinesRecursive(myUid);
    const totalTeam = 1 + downlines.length;
    document.getElementById('totalMembers').innerText = totalTeam;

    const directs = globalData.filter(m => m.upline === myUid).length;
    calculateMyRank(totalTeam, directs, me.uid);

    // Hitung VIP
    myTeamData = [me, ...downlines];
    countVipStats(myTeamData);

    // Periode & Growth
    const now = new Date();
    const isP2 = now.getDate() > 15;
    const m = now.getMonth();
    const y = now.getFullYear();

    let startP = isP2 ? new Date(y, m, 16) : new Date(y, m, 1);
    let endP = isP2 ? new Date(y, m + 1, 0, 23, 59, 59) : new Date(y, m, 15, 23, 59, 59);
    
    document.getElementById('currentPeriodLabel').innerText = isP2 ? `PERIODE 2 (${getMonthName(m)})` : `PERIODE 1 (${getMonthName(m)})`;

    // Kalkulasi Angka
    const prevCount = myTeamData.filter(m => m.joinDate < startP).length;
    const target = Math.ceil(prevCount / 2);
    const newCount = myTeamData.filter(m => {
        const jd = new Date(m.joinDate);
        return jd >= startP && jd <= endP;
    }).length;
    const gap = Math.max(0, target - newCount);

    document.getElementById('prevPeriodCount').innerText = prevCount;
    document.getElementById('targetCount').innerText = target;
    document.getElementById('newMemberCount').innerText = newCount;
    document.getElementById('gapCount').innerText = gap;

    renderChart(myTeamData, y, m, isP2);
}

// --- LOGIKA PERHITUNGAN VIP (DIPERBAIKI) ---
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
    // Mulai dari 1 karena index 0 adalah diri sendiri
    for (let i = 1; i < teamMembers.length; i++) {
        if (getRankLevel(teamMembers[i].uid) >= targetLevel) count++;
    }
    return count;
}

function getRankLevel(uid) {
    // AMAN: Tidak pakai filter directs < 5 return 0, biar dihitung manual semua
    const myTeam = [globalData.find(m => m.uid === uid), ...getDownlinesRecursive(uid)];
    const total = myTeam.length;
    const v2Count = countSpecificVipInTeam(myTeam, 2);
    const v1Count = countSpecificVipInTeam(myTeam, 1);
    const directs = globalData.filter(m => m.upline === uid).length;

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

    for (const tier of tiers) {
        if (total >= tier.min) {
            let reqCount = (tier.level >= 3) ? v2Count : v1Count;
            if (reqCount >= tier.reqVip) return tier.level;
        }
    }
    // Syarat VIP 1: 5 Direct & Total >= 5
    if (directs >= 5 && total >= 5) return 1;
    return 0;
}

function countVipStats(teamData) {
    let counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    let isNew = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false };
    vipLists = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] };
    
    const now = new Date();

    teamData.forEach(m => {
        const lvl = getRankLevel(m.uid);
        if (lvl >= 1 && lvl <= 9) {
            counts[lvl]++;
            vipLists[lvl].push(m);

            // Auto Save History
            const exists = globalHistory.find(h => h.uid === m.uid && h.vip_level === lvl);
            if (!exists) {
                const ts = now.toISOString();
                globalHistory.push({ uid: m.uid, vip_level: lvl, achieved_at: ts });
                db.from('vip_history').insert([{ uid: m.uid, vip_level: lvl, achieved_at: ts }]).then(()=>{});
            }

            // Cek Kedipan Merah (24 Jam)
            const hist = globalHistory.find(h => h.uid === m.uid && h.vip_level === lvl);
            const time = hist ? new Date(hist.achieved_at) : new Date(m.joinDate);
            if ((now - time) < (24 * 60 * 60 * 1000)) {
                isNew[lvl] = true;
            }
        }
    });

    for (let i = 1; i <= 9; i++) {
        const el = document.getElementById(`cVIP${i}`);
        if (el) {
            el.innerText = counts[i];
            const p = el.parentElement;
            if(isNew[i]) p.classList.add('new-alert'); else p.classList.remove('new-alert');
        }
    }
}

// --- SORTING MODAL VIP (TERBARU -> TERLAMA) ---
window.openVipModal = function(level) {
    const modal = document.getElementById('vipModal');
    const body = document.getElementById('modalBody');
    document.getElementById('modalTitle').innerText = `DAFTAR V.I.P ${level}`;
    body.innerHTML = ''; 

    // Sort: Waktu History Paling Besar (Terbaru) di Atas
    let sorted = [...vipLists[level]].sort((a, b) => {
        const hA = globalHistory.find(h => h.uid === a.uid && h.vip_level === level);
        const hB = globalHistory.find(h => h.uid === b.uid && h.vip_level === level);
        const tA = hA ? new Date(hA.achieved_at) : new Date(a.joinDate);
        const tB = hB ? new Date(hB.achieved_at) : new Date(b.joinDate);
        return tB - tA;
    });

    if (sorted.length === 0) {
        body.innerHTML = '<div class="v-empty">Belum ada anggota.</div>';
    } else {
        const now = new Date();
        sorted.forEach(m => {
            const h = globalHistory.find(x => x.uid === m.uid && x.vip_level === level);
            const time = h ? new Date(h.achieved_at) : new Date(m.joinDate);
            const isNew = (now - time) < (24*60*60*1000);
            
            // Format Tanggal
            const dStr = `${time.getDate()}/${time.getMonth()+1} ${time.getHours()}:${String(time.getMinutes()).padStart(2,'0')}`;

            body.innerHTML += `
                <div class="v-item ${isNew ? 'new-name-alert' : ''}">
                    <div style="display:flex; flex-direction:column;">
                        <span class="v-n">${m.name} ${isNew ? '🆕' : ''}</span>
                        <small style="color:#666; font-size:9px;">${dStr}</small>
                    </div>
                    <span class="v-u">${m.uid}</span>
                </div>`;
        });
    }
    modal.style.display = 'flex';
}
window.closeVipModal = function() { document.getElementById('vipModal').style.display = 'none'; }

// --- PIALA (REVISI FINAL) ---
window.openAchieverModal = function() {
    const modal = document.getElementById('achieverModal'), body = document.getElementById('achieverBody');
    modal.style.display = 'flex'; body.innerHTML = '<div class="v-empty">Menghitung...</div>';
    document.getElementById('btnDlAchiever').style.display = 'none';
    achieverTxtContent = "";

    setTimeout(() => {
        const now = new Date(), d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
        let startP, endP, labelP;

        if (d > 15) { 
            startP = new Date(y, m, 1); endP = new Date(y, m, 15, 23, 59, 59); 
            labelP = `PERIODE 1 (${getMonthName(m)} ${y})`; 
        } else { 
            let pm = m - 1, py = y; if (pm < 0) { pm = 11; py--; } 
            startP = new Date(py, pm, 16); endP = new Date(py, pm + 1, 0, 23, 59, 59); 
            labelP = `PERIODE 2 (${getMonthName(pm)} ${py})`; 
        }

        document.getElementById('achieverTitle').innerText = `PERAIH 50% - ${labelP}`;
        achieverTxtContent = `🏆 PERAIH GROWTH 50%\n📅 ${labelP}\n================\n\n`;

        let achs = []; const myUid = sessionStorage.getItem('userUid');
        
        myTeamData.forEach(mem => {
            if (new Date(mem.joinDate) > endP) return;

            const dls = getDownlinesRecursive(mem.uid);
            const base = dls.filter(dl => new Date(dl.joinDate) < startP).length + 1;
            const grow = dls.filter(dl => { const jd=new Date(dl.joinDate); return jd>=startP && jd<=endP; }).length;
            const target = Math.floor(base / 2);
            const rank = getRankLevel(mem.uid);
            
            // Validasi VIP Masa Lalu (Referral >= 5 saat periode berakhir)
            const directAtTime = globalData.filter(g => g.upline === mem.uid && new Date(g.joinDate) <= endP).length;

            if (grow >= target && grow > 0 && rank >= 1 && directAtTime >= 5) {
                achs.push({ name: mem.name, uid: mem.uid, target, actual: grow, rank });
            }
        });

        achs.sort((a,b) => b.actual - a.actual);

        if (achs.length === 0) body.innerHTML = '<div class="v-empty">Belum ada VIP yg mencapai target.</div>';
        else {
            document.getElementById('btnDlAchiever').style.display = 'block';
            let html = '';
            achs.forEach((a, i) => {
                html += `<div class="achiever-item"><div class="achiever-top"><span class="v-n">${i+1}. ${a.name} <small style="color:var(--gold)">(VIP ${a.rank})</small></span><span class="v-u">${a.uid}</span></div><div class="achiever-stats"><span>Target: <b class="val-target">${a.target}</b></span><span>Capaian: <b class="val-actual">${a.actual}</b></span></div></div>`;
                achieverTxtContent += `${i+1}. ${a.name} (${a.uid}) - VIP ${a.rank}\n   Target: ${a.target} | Capai: ${a.actual}\n\n`;
            });
            body.innerHTML = html;
        }
    }, 100);
}
window.downloadAchieverData = function() {
    if(!achieverTxtContent) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([achieverTxtContent],{type:'text/plain'}));
    a.download = 'peraih_50_persen.txt'; a.click();
}
window.closeAchieverModal = function() { document.getElementById('achieverModal').style.display = 'none'; }

function calculateMyRank(teamSize, directCount, uid) {
    // Fungsi sederhana untuk display
    const level = getRankLevel(uid);
    document.getElementById('rankName').innerText = level > 0 ? `V.I.P ${level}` : "MEMBER";
    // Pesan next goal
    const tiers = [5, 31, 101, 201, 351, 501, 901, 1601, 3501];
    let nextMin = tiers.find(t => t > teamSize) || 0;
    let gap = nextMin > 0 ? nextMin - teamSize : 0;
    
    // Cek kebutuhan VIP 2
    let msg = `Menuju Level Berikutnya`;
    if(level >= 1) {
       // Cek struktur VIP jika level 1 ke atas
       const myTeam = [globalData.find(m=>m.uid===uid), ...getDownlinesRecursive(uid)];
       const v1 = countSpecificVipInTeam(myTeam, 1);
       if(level===1 && v1 < 2 && nextMin===31) msg = "Butuh 2 VIP 1 di Tim";
    }
    document.getElementById('rankNextGoal').innerText = msg;
    document.getElementById('nextLevelGap').innerText = gap;
}

function renderChart(teamData, y, m, isP2) {
    const ctx = document.getElementById('growthChart'); if(!ctx) return;
    if (window.myChart) window.myChart.destroy();
    
    const p1End = new Date(y, m, 15, 23, 59, 59);
    const c1 = teamData.filter(x => new Date(x.joinDate) <= p1End && new Date(x.joinDate) >= new Date(y,m,1)).length;
    const c2 = teamData.filter(x => new Date(x.joinDate) > p1End && new Date(x.joinDate) <= new Date(y,m+1,0)).length;

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['P1', 'P2'],
            datasets: [{ label: 'Growth', data: [c1, c2], backgroundColor: [isP2?'#333':'#D4AF37', isP2?'#D4AF37':'#333'], borderColor: '#D4AF37', borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false } } }
    });
}

function doLogin(){ /* Fungsi login standar tetap ada */ 
    const u = document.getElementById('loginUid').value; 
    if(u) { sessionStorage.setItem('isLoggedIn','true'); sessionStorage.setItem('userUid',u); window.location.href='dashboard.html'; }
}
function logout(){ sessionStorage.clear(); window.location.href='index.html'; }
function prepareMyTeamData(){ /* Fungsi list/network */ }
function initList(){ /* Fungsi list */ }
function initNetwork(){ /* Fungsi network */ }
function getMonthName(i){ return ["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"][i]; }
