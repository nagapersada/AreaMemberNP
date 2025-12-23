const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let globalData=[], myTeamData=[], globalHistory=[], sortState={col:'joinDate',dir:'asc'};
let vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
let achieverTxtContent = "";

document.addEventListener('DOMContentLoaded',async()=>{const a=window.location.pathname,b=sessionStorage.getItem('isLoggedIn');if(!b&&!a.includes('index.html')){window.location.href='index.html';return}if(b)await loadData();if(a.includes('index.html'))document.getElementById('loginButton').addEventListener('click',doLogin);else if(a.includes('dashboard.html')){renderDashboard(); startCountdown();}else if(a.includes('list.html')){prepareMyTeamData();initList()}else if(a.includes('network.html')){prepareMyTeamData();initNetwork()}});

async function loadData(){
    try{
        const{data:a,error:b}=await db.from('members').select('*');
        if(b)throw b;
        globalData=a.map(a=>({uid:String(a.UID||a.uid).trim(),name:(a.Nama||a.nama||a.name||'-').trim(),upline:a.Upline||a.upline?String(a.Upline||a.upline).trim():"",joinDate:new Date(a.TanggalBergabung||a.tanggalbergabung||a.joinDate)}));
        const{data:h,error:he}=await db.from('vip_history').select('*');
        if(!he) globalHistory = h;
    }catch(a){console.error(a)}
}

function prepareMyTeamData(){const a=sessionStorage.getItem('userUid'),b=globalData.find(b=>b.uid===a);if(b){const c=getDownlinesRecursive(a);myTeamData=[b,...c]}}
function getDownlinesRecursive(a){let b=[];const c=globalData.filter(b=>b.upline===a);return c.forEach(a=>{b.push(a),b=b.concat(getDownlinesRecursive(a.uid))}),b}
function getTotalGroupCount(a){const b=getDownlinesRecursive(a);return 1+b.length}

async function doLogin(){
    const a=document.getElementById('loginUid').value.trim();
    const b=document.getElementById('loginButton');
    const c=document.getElementById('error');
    if(!a)return void(c.innerText="Masukkan UID");
    b.innerText="...",b.disabled=!0,await loadData();
    const d=globalData.find(b=>b.uid===a);
    if(d){
        sessionStorage.setItem('isLoggedIn','true');
        sessionStorage.setItem('userUid',d.uid);
        sessionStorage.setItem('realUserUid',d.uid); // SIMPAN UID ASLI
        window.location.href='dashboard.html';
    }else{
        c.innerText="UID Tidak Terdaftar",b.innerText="MASUK",b.disabled=!1;
    }
}

function logout(){sessionStorage.clear(),window.location.href='index.html'}

// [FITUR BARU] LIHAT UPLINE
function viewUpline() {
    const currentUid = sessionStorage.getItem('userUid');
    const currentUser = globalData.find(m => m.uid === currentUid);
    
    if (currentUser && currentUser.upline) {
        const uplineExists = globalData.find(m => m.uid === currentUser.upline);
        if(uplineExists) {
            sessionStorage.setItem('userUid', currentUser.upline);
            location.reload();
        } else {
            alert("Data upline tidak ditemukan.");
        }
    } else {
        alert("Anda sudah di posisi puncak atau upline tidak ada.");
    }
}

// [FITUR BARU] KEMBALI KE AKUN SENDIRI
function returnToMyDashboard() {
    const realUid = sessionStorage.getItem('realUserUid');
    if(realUid) {
        sessionStorage.setItem('userUid', realUid);
        location.reload();
    }
}

function renderDashboard(){
    const a=sessionStorage.getItem('userUid');
    const realUid = sessionStorage.getItem('realUserUid'); 
    
    // Tampilkan tombol kembali jika bukan di akun asli
    if(realUid && a !== realUid) {
        const btnReturn = document.getElementById('returnToMeBtn');
        if(btnReturn) btnReturn.style.display = 'block';
    }

    if(!globalData.length)return void location.reload();
    const b=globalData.find(b=>b.uid===a);
    if(!b)return logout();
    
    document.getElementById('mName').innerText=b.name;
    document.getElementById('mUid').innerText=b.uid;
    const c=globalData.find(a=>a.uid===b.upline);
    document.getElementById('mRefUid').innerText=c?c.uid:'-';
    
    const d=getDownlinesRecursive(a),e=1+d.length;
    document.getElementById('totalMembers').innerText=e;
    const f=globalData.filter(b=>b.upline===a).length;
    calculateMyRank(e,f,b.uid);
    const g=[b,...d]; myTeamData = g; countVipStats(g); 
    
    renderTargetChart(e);

    const h=new Date,i=h.getDate(),j=h.getMonth(),k=h.getFullYear();let l,m,n,o=!1;31===i?(l=new Date(k,j+1,1),m=new Date(k,j,30,23,59,59),n="PERIODE 1 (BLN DEPAN)"):i<=15?(l=new Date(k,j,1),m=new Date(k,j,0,23,59,59),n=`PERIODE 1 (${getMonthName(j)})`):(l=new Date(k,j,16),m=new Date(k,j,15,23,59,59),n=`PERIODE 2 (${getMonthName(j)})`,o=!0),document.getElementById('currentPeriodLabel').innerText=n;const p=g.filter(a=>a.joinDate<=m).length,q=g.filter(a=>{let b=new Date(a.joinDate);return b.setHours(0,0,0,0),b>=l}).length,r=Math.ceil(p/2);
    
    let gap = r - q; if (gap < 0) gap = 0;
    
    document.getElementById('prevPeriodCount').innerText=p;
    document.getElementById('targetCount').innerText=r;
    document.getElementById('newMemberCount').innerText=q;
    document.getElementById('gapCount').innerText=gap; 
    
    renderChart(g,k,j,o)
}

function renderTargetChart(currentTotal) {
    const milestones = [5, 31, 101, 201, 351, 501, 901, 1601, 3501];
    let nextTarget = milestones.find(m => m > currentTotal);
    if (!nextTarget) { nextTarget = Math.ceil((currentTotal + 1) / 1000) * 1000; }
    const remaining = Math.max(0, nextTarget - currentTotal);
    
    document.getElementById('nextTargetNum').innerText = nextTarget;
    document.getElementById('targetGap').innerText = remaining;

    const ctx = document.getElementById('targetChart').getContext('2d');
    if(window.donutChart) window.donutChart.destroy();

    window.donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Tercapai', 'Sisa'],
            datasets: [{
                data: [currentTotal, remaining],
                backgroundColor: ['#D4AF37', '#222222'],
                borderWidth: 0,
                cutout: '80%' 
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
}

function startCountdown() {
    const now = new Date(); const d = now.getDate(); const m = now.getMonth(); const y = now.getFullYear();
    let targetDate;
    if (d <= 15) { targetDate = new Date(y, m, 15, 23, 59, 59); } 
    else { targetDate = new Date(y, m + 1, 0, 23, 59, 59); }

    const timerEl = document.getElementById('countdownTimer');
    
    setInterval(() => {
        const nowLoop = new Date().getTime();
        const distance = targetDate.getTime() - nowLoop;
        if (distance < 0) { timerEl.innerText = "PERIODE SELESAI"; return; }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        timerEl.innerText = `${days}H ${hours}J ${minutes}M ${seconds}D`;
    }, 1000);
}

function openBroadcastModal() {
    const total = document.getElementById('totalMembers').innerText;
    const gapGrowth = document.getElementById('gapCount').innerText; 
    const date = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    const timer = document.getElementById('countdownTimer').innerText;
    
    const text = `🔥 *UPDATE TIM DV NAGA PERSADA* 🔥\n\n` +
                 `📅 ${date}\n` +
                 `⏳ Sisa Waktu: ${timer}\n` +
                 `👥 Total Pasukan: *${total} Anggota*\n\n` +
                 `"Disiplin adalah jembatan antara tujuan dan pencapaian."\n\n` +
                 `🚀 *MISI KITA:* Kurang ${gapGrowth} anggota lagi untuk capai target pertumbuhan 50%!\n` +
                 `#DVTeamNP #SatuVisi #Gaspol`;
    document.getElementById('broadcastText').value = text;
    document.getElementById('broadcastModal').style.display = 'flex';
}

function copyBroadcast() {
    const copyText = document.getElementById("broadcastText");
    copyText.select();
    document.execCommand("copy");
    alert("Teks berhasil disalin!");
    document.getElementById('broadcastModal').style.display = 'none';
}

function renderChart(a,b,c,d){const e=document.getElementById('growthChart').getContext('2d'),f=new Date(b,c,1),g=new Date(b,c,15,23,59,59),h=new Date(b,c,16),i=new Date(b,c,30,23,59,59),j=a.filter(a=>a.joinDate>=f&&a.joinDate<=g).length,k=a.filter(a=>a.joinDate>=h&&a.joinDate<=i).length,l=d?'#333':'#D4AF37',m=d?'#D4AF37':'#333';window.myChart&&window.myChart.destroy(),window.myChart=new Chart(e,{type:'bar',data:{labels:['P1','P2'],datasets:[{label:'Growth',data:[j,k],backgroundColor:[l,m],borderColor:'#D4AF37',borderWidth:1}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{y:{beginAtZero:!0,grid:{color:'#333'},ticks:{display:!1}},x:{grid:{display:!1},ticks:{color:'#888',fontSize:8}}},plugins:{legend:{display:!1}}}})}

function countSpecificVipInTeam(teamMembers, targetLevel) {
    let count = 0;
    for (let i = 1; i < teamMembers.length; i++) {
        const downlineRank = getRankLevel(teamMembers[i].uid); 
        if (downlineRank >= targetLevel) count++;
    }
    return count;
}

function getRankLevel(a){
    const teamMembers = [globalData.find(member => member.uid === a), ...getDownlinesRecursive(a)];
    const totalMembers = teamMembers.length;
    const directDownlinesCount = globalData.filter(b=>b.upline===a).length;
    const vip2InTeam = countSpecificVipInTeam(teamMembers, 2); 
    const vip1InTeam = countSpecificVipInTeam(teamMembers, 1);
    const rankTiers = [{level:9,min:3501,reqVip:2,reqLevel:2},{level:8,min:1601,reqVip:2,reqLevel:2},{level:7,min:901,reqVip:2,reqLevel:2},{level:6,min:501,reqVip:2,reqLevel:2},{level:5,min:351,reqVip:2,reqLevel:2},{level:4,min:201,reqVip:2,reqLevel:2},{level:3,min:101,reqVip:2,reqLevel:2},{level:2,min:31,reqVip:2,reqLevel:1}];
    for(const tier of rankTiers) {
        if (totalMembers >= tier.min) {
            let currentVips = (tier.level >= 3) ? vip2InTeam : vip1InTeam;
            if (currentVips >= tier.reqVip) return tier.level;
        }
    }
    return (directDownlinesCount >= 5) ? 1 : 0; 
}

async function checkAndSaveHistory(uid, level) {
    const exists = globalHistory.find(h => h.uid === uid && h.vip_level === level);
    if (!exists) {
        const now = new Date().toISOString();
        globalHistory.push({ uid: uid, vip_level: level, achieved_at: now });
        db.from('vip_history').insert([{ uid: uid, vip_level: level, achieved_at: now }]).then(({ error }) => { if (error) console.log("Save Err:", error); });
    }
}

function countVipStats(a){
    let b={1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
    let alertStatus = {1:false,2:false,3:false,4:false,5:false,6:false,7:false,8:false,9:false};
    vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    a.forEach(m=>{
        let c=getRankLevel(m.uid);
        if(c>=1&&c<=9){
            b[c]++; vipLists[c].push(m); checkAndSaveHistory(m.uid, c);
            const history = globalHistory.find(h => h.uid === m.uid && h.vip_level === c);
            let achievementTime = history ? new Date(history.achieved_at) : new Date(m.joinDate);
            const is24h = (now - achievementTime) < oneDayInMs;
            const isSameDay = achievementTime.toDateString() === now.toDateString();
            if(is24h || isSameDay) alertStatus[c] = true;
        }
    });

    for(let i=1;i<=9;i++){
        const el=document.getElementById(`cVIP${i}`);
        if(el){
            el.innerText=b[i];
            const parent = el.parentElement;
            if(alertStatus[i]) parent.classList.add('new-alert');
            else parent.classList.remove('new-alert');
        }
    }
}

// [RESTORED] Logika Tampilan Kartu Cantik untuk Peraih 50%
window.openVipModal = function(level) {
    const modal = document.getElementById('vipModal'), body = document.getElementById('modalBody'), title = document.getElementById('modalTitle');
    const now = new Date(); const oneDayInMs = 24 * 60 * 60 * 1000;
    title.innerText = `DAFTAR V.I.P ${level}`; body.innerHTML = ''; 
    let sorted = [...vipLists[level]].sort((a, b) => {
        const histA = globalHistory.find(h => h.uid === a.uid && h.vip_level === level);
        const histB = globalHistory.find(h => h.uid === b.uid && h.vip_level === level);
        const timeA = histA ? new Date(histA.achieved_at).getTime() : new Date(a.joinDate).getTime();
        const timeB = histB ? new Date(histB.achieved_at).getTime() : new Date(b.joinDate).getTime();
        return timeB - timeA; 
    });

    if (sorted.length > 0) {
        sorted.forEach(m => {
            const hist = globalHistory.find(h => h.uid === m.uid && h.vip_level === level);
            const achievementTime = hist ? new Date(hist.achieved_at) : new Date(m.joinDate);
            const is24h = (now - achievementTime) < oneDayInMs;
            const isSameDay = achievementTime.toDateString() === now.toDateString();
            const isNew = is24h || isSameDay;
            const dateStr = `${achievementTime.getDate()}/${achievementTime.getMonth()+1} ${achievementTime.getHours()}:${String(achievementTime.getMinutes()).padStart(2,'0')}`;
            // [FIXED] Menggunakan Emoji API
            body.innerHTML += `<div class="v-item ${isNew ? 'new-name-alert' : ''}"><div style="display:flex; flex-direction:column;"><span class="v-n">${m.name} ${isNew ? '🔥' : ''}</span><small style="color:#666; font-size:9px;">${dateStr}</small></div><span class="v-u">${m.uid}</span></div>`;
        });
    } else { body.innerHTML = '<div class="v-empty">Belum ada anggota.</div>'; }
    modal.style.display = 'flex';
}

window.closeVipModal = function() { document.getElementById('vipModal').style.display = 'none'; }

function openAchieverModal() {
    const modal = document.getElementById('achieverModal'), body = document.getElementById('achieverBody'), title = document.getElementById('achieverTitle'), btnDl = document.getElementById('btnDlAchiever');
    modal.style.display = 'flex'; body.innerHTML = '<div class="v-empty">Sedang menghitung data...</div>'; btnDl.style.display = 'none'; achieverTxtContent = "";
    
    setTimeout(() => {
        const now = new Date(), d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
        let startP, endP, cutoff, plabel = "";
        if (d > 15) { startP = new Date(y, m, 1); endP = new Date(y, m, 15, 23, 59, 59); plabel = `PERIODE 1 (${getMonthName(m)} ${y})`; } 
        else { let pm = m - 1, py = y; if (pm < 0) { pm = 11; py--; } startP = new Date(py, pm, 16); endP = new Date(py, pm + 1, 0, 23, 59, 59); plabel = `PERIODE 2 (${getMonthName(pm)} ${py})`; }

        title.innerText = `PERAIH 50% - ${plabel}`; achieverTxtContent = `醇 PERAIH GROWTH 50%\n套 ${plabel}\n================\n\n`;
        let achs = []; const myUid = sessionStorage.getItem('userUid');
        myTeamData.forEach(mem => {
            if (new Date(mem.joinDate) > endP) return;
            const dls = getDownlinesRecursive(mem.uid);
            const base = dls.filter(dl => new Date(dl.joinDate) < startP).length + 1;
            const grow = dls.filter(dl => { const jd = new Date(dl.joinDate); return jd >= startP && jd <= endP; }).length;
            const target = Math.floor(base / 2); const rank = getRankLevel(mem.uid);
            if (grow >= target && grow > 0 && rank >= 1) achs.push({name: (mem.uid===myUid?mem.name+" (ANDA)":mem.name), uid: mem.uid, target, actual: grow, rank});
        });
        achs.sort((a,b)=>b.actual-a.actual);
        if (achs.length === 0) body.innerHTML = '<div class="v-empty">Belum ada VIP yang mencapai target.</div>';
        else {
            btnDl.style.display = 'block'; let html = '';
            achs.forEach((a,i) => {
                // [RESTORED] Struktur Kartu Cantik
                html += `<div class="achiever-item"><div class="achiever-top"><span class="v-n">${i+1}. ${a.name} <small style="color:var(--gold)">(VIP ${a.rank})</small></span><span class="v-u">${a.uid}</span></div><div class="achiever-stats"><span>Target: <b class="val-target">${a.target}</b></span><span>Capaian: <b class="val-actual">${a.actual}</b></span></div></div>`;
                achieverTxtContent += `${i+1}. ${a.name} (${a.uid}) - VIP ${a.rank}\n   Target: ${a.target} | Capai: ${a.actual}\n\n`;
            });
            body.innerHTML = html;
        }
    }, 100);
}

function downloadAchieverData() { if(!achieverTxtContent) return; const blob=new Blob([achieverTxtContent],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='peraih_50_persen.txt'; a.click(); }
function closeAchieverModal() { document.getElementById('achieverModal').style.display = 'none'; }
