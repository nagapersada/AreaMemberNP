const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let globalData=[], myTeamData=[], globalHistory=[], sortState={col:'joinDate',dir:'asc'};
let vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
let achieverTxtContent = "";

// VARIABEL GLOBAL UNTUK DATA GENERATOR PESAN
let currentGap = 0; 
let globalTarget = 0;

document.addEventListener('DOMContentLoaded',async()=>{const a=window.location.pathname,b=sessionStorage.getItem('isLoggedIn');if(!b&&!a.includes('index.html')){window.location.href='index.html';return}if(b)await loadData();if(a.includes('index.html'))document.getElementById('loginButton').addEventListener('click',doLogin);else if(a.includes('dashboard.html'))renderDashboard();else if(a.includes('list.html')){prepareMyTeamData();initList()}else if(a.includes('network.html')){prepareMyTeamData();initNetwork()}});

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

async function doLogin(){const a=document.getElementById('loginUid').value.trim(),b=document.getElementById('loginButton'),c=document.getElementById('error');if(!a)return void(c.innerText="Masukkan UID");b.innerText="...",b.disabled=!0,await loadData();const d=globalData.find(b=>b.uid===a);d?(sessionStorage.setItem('isLoggedIn','true'),sessionStorage.setItem('userUid',d.uid),window.location.href='dashboard.html'):(c.innerText="UID Tidak Terdaftar",b.innerText="MASUK",b.disabled=!1)}

function logout(){sessionStorage.clear(),window.location.href='index.html'}

function renderDashboard(){
    const a=sessionStorage.getItem('userUid');if(!globalData.length)return void location.reload();const b=globalData.find(b=>b.uid===a);if(!b)return logout();
    document.getElementById('mName').innerText=b.name,document.getElementById('mUid').innerText=b.uid;const c=globalData.find(a=>a.uid===b.upline);document.getElementById('mRefUid').innerText=c?c.uid:'-';
    const d=getDownlinesRecursive(a),e=1+d.length;
    document.getElementById('totalMembers').innerText=e;
    const f=globalData.filter(b=>b.upline===a).length;
    calculateMyRank(e,f,b.uid);
    const g=[b,...d];
    myTeamData = g; 
    countVipStats(g); 
    
    // LOGIKA PERIODE
    const h=new Date,i=h.getDate(),j=h.getMonth(),k=h.getFullYear();let l,m,n,o=!1;
    31===i?(l=new Date(k,j+1,1),m=new Date(k,j,30,23,59,59),n="PERIODE 1 (BLN DEPAN)"):i<=15?(l=new Date(k,j,1),m=new Date(k,j,0,23,59,59),n=`PERIODE 1 (${getMonthName(j)})`):(l=new Date(k,j,16),m=new Date(k,j,15,23,59,59),n=`PERIODE 2 (${getMonthName(j)})`,o=!0);
    document.getElementById('currentPeriodLabel').innerText=n;
    
    // LOGIKA COUNTDOWN REAL-TIME
    let countDownTarget;
    if(i <= 15) { countDownTarget = new Date(k, j, 15, 23, 59, 59); } 
    else { countDownTarget = new Date(k, j + 1, 0, 23, 59, 59); }
    startCountdown(countDownTarget);

    showMotivation(); // Motivasi Login

    // HITUNG DATA TARGET
    const p=g.filter(a=>a.joinDate<=m).length,q=g.filter(a=>{let b=new Date(a.joinDate);return b.setHours(0,0,0,0),b>=l}).length,r=Math.ceil(p/2);let s=r-q;s<0&&(s=0);
    
    // SIMPAN DATA KE GLOBAL (Agar bisa dibaca Generator Pesan)
    currentGap = s; 
    globalTarget = r;

    document.getElementById('prevPeriodCount').innerText=p,document.getElementById('targetCount').innerText=r,document.getElementById('newMemberCount').innerText=q,document.getElementById('gapCount').innerText=s,renderChart(g,k,j,o)
}

function renderChart(a,b,c,d){const e=document.getElementById('growthChart').getContext('2d'),f=new Date(b,c,1),g=new Date(b,c,15,23,59,59),h=new Date(b,c,16),i=new Date(b,c,30,23,59,59),j=a.filter(a=>a.joinDate>=f&&a.joinDate<=g).length,k=a.filter(a=>a.joinDate>=h&&a.joinDate<=i).length,l=d?'#333':'#D4AF37',m=d?'#D4AF37':'#333';window.myChart&&window.myChart.destroy(),window.myChart=new Chart(e,{type:'bar',data:{labels:['P1','P2'],datasets:[{label:'Growth',data:[j,k],backgroundColor:[l,m],borderColor:'#D4AF37',borderWidth:1}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{y:{beginAtZero:!0,grid:{color:'#333'},ticks:{display:!1}},x:{grid:{display:!1},ticks:{color:'#888',fontSize:9}}},plugins:{legend:{display:!1}}}})}

function countSpecificVipInTeam(teamMembers, targetLevel) {
    let count = 0;
    for (let i = 1; i < teamMembers.length; i++) {
        const downlineRank = getRankLevel(teamMembers[i].uid); 
        if (downlineRank >= targetLevel) { count++; }
    }
    return count;
}

// ---------------------------------------------------------------
// FUNGSI RANK CURRENT (Digunakan untuk Dashboard & Status Saat Ini)
// ---------------------------------------------------------------
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

// ---------------------------------------------------------------
// [BARU] FUNGSI RANK HISTORIS (MESIN WAKTU - KHUSUS DAFTAR PERAIH 50%)
// ---------------------------------------------------------------
function getHistoricalRankLevel(uid, cutoffDate) {
    // 1. Ambil semua downline, lalu filter yang join SEBELUM/PADA cutoffDate
    const allDownlines = getDownlinesRecursive(uid);
    const historicalDownlines = allDownlines.filter(m => new Date(m.joinDate) <= cutoffDate);
    const memberSelf = globalData.find(m => m.uid === uid);
    
    if(!memberSelf) return 0; // Jaga-jaga jika data kosong

    const teamMembers = [memberSelf, ...historicalDownlines]; // Struktur Tim PADA SAAT ITU

    const totalMembers = teamMembers.length; 
    
    // 2. Hitung direct downline PADA SAAT ITU
    const directDownlinesCount = globalData.filter(b => b.upline === uid && new Date(b.joinDate) <= cutoffDate).length;

    // 3. Helper untuk hitung VIP PADA SAAT ITU (Recursive)
    const countVipHist = (lvl) => countSpecificVipInTeamHistorical(teamMembers, lvl, cutoffDate);
    
    const vip2InTeam = countVipHist(2);
    const vip1InTeam = countVipHist(1);
    
    const rankTiers = [{level:9,min:3501,reqVip:2,reqLevel:2},{level:8,min:1601,reqVip:2,reqLevel:2},{level:7,min:901,reqVip:2,reqLevel:2},{level:6,min:501,reqVip:2,reqLevel:2},{level:5,min:351,reqVip:2,reqLevel:2},{level:4,min:201,reqVip:2,reqLevel:2},{level:3,min:101,reqVip:2,reqLevel:2},{level:2,min:31,reqVip:2,reqLevel:1}];

    for(const tier of rankTiers) {
        if (totalMembers >= tier.min) {
            let currentVips = (tier.level >= 3) ? vip2InTeam : vip1InTeam;
            if (currentVips >= tier.reqVip) return tier.level;
        }
    }
    // Syarat VIP 1 historis: Punya 5 direct pada saat itu
    return (directDownlinesCount >= 5) ? 1 : 0;
}

function countSpecificVipInTeamHistorical(teamMembers, targetLevel, cutoffDate) {
    let count = 0;
    for (let i = 1; i < teamMembers.length; i++) {
        // Panggil fungsi getHistoricalRankLevel secara rekursif
        const downlineRank = getHistoricalRankLevel(teamMembers[i].uid, cutoffDate); 
        if (downlineRank >= targetLevel) {
            count++;
        }
    }
    return count;
}
// ---------------------------------------------------------------

async function checkAndSaveHistory(uid, level) {
    const exists = globalHistory.find(h => h.uid === uid && h.vip_level === level);
    if (!exists) {
        const now = new Date().toISOString();
        globalHistory.push({ uid: uid, vip_level: level, achieved_at: now });
        db.from('vip_history').insert([{ uid: uid, vip_level: level, achieved_at: now }])
          .then(({ error }) => { if (error) console.log("Save Err:", error); });
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
            b[c]++;
            vipLists[c].push(m);
            checkAndSaveHistory(m.uid, c);
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

window.openVipModal = function(level) {
    const modal = document.getElementById('vipModal');
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    title.innerText = `DAFTAR V.I.P ${level}`;
    body.innerHTML = ''; 
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
            body.innerHTML += `<div class="v-item ${isNew ? 'new-name-alert' : ''}"><div style="display:flex; flex-direction:column;"><span class="v-n">${m.name} ${isNew ? '' : ''}</span><small style="color:#666; font-size:9px;">${dateStr}</small></div><span class="v-u">${m.uid}</span></div>`;
        });
    } else { body.innerHTML = '<div class="v-empty">Belum ada anggota.</div>'; }
    modal.style.display = 'flex';
}

window.closeVipModal = function() { document.getElementById('vipModal').style.display = 'none'; }

function calculateMyRank(currentTeamSize, directDownlineCount, uid) {
    const rankTiers = [{ name: "V.I.P 9", level: 9, min: 3501, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 8", level: 8, min: 1601, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 7", level: 7, min: 901, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 6", level: 6, min: 501, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 5", level: 5, min: 351, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 4", level: 4, min: 201, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 3", level: 3, min: 101, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 2", level: 2, min: 31, reqVip: 2, reqLevelName: "V.I.P 1" },{ name: "V.I.P 1", level: 1, min: 5, reqVip: 0 }];
    const curLevel = getRankLevel(uid); 
    const curRank = rankTiers.find(r => r.level === curLevel) || { name: "MEMBER", level: 0 };
    const tm = [globalData.find(m => m.uid === uid), ...getDownlinesRecursive(uid)];
    const v2 = countSpecificVipInTeam(tm, 2), v1 = countSpecificVipInTeam(tm, 1);
    let gap = 0, next = rankTiers.find(r => r.level === curLevel + 1), sg = "";
    if (curLevel === 9) { sg = "Top Level"; } 
    else if (next) {
        let cv = (next.level >= 3) ? v2 : v1;
        if (cv < next.reqVip) sg = `Tambahan ${next.reqVip - cv} @${next.reqLevelName} dalam Tim`;
        else sg = `Menuju ${next.name}`;
        gap = (next.level === 1) ? next.min - directDownlineCount : next.min - currentTeamSize;
    }
    document.getElementById('rankName').innerText = curRank.name;
    const rg = document.getElementById('rankNextGoal');
    rg.innerText = sg; rg.style.color = sg.includes("Tambahan") ? '#ff4444' : '#ccc';
    document.getElementById('nextLevelGap').innerText = Math.max(0, gap);
}

function initList(){window.sortData=a=>{sortState.col===a?sortState.dir='asc'===sortState.dir?'desc':'asc':(sortState.col=a,sortState.dir='asc'),renderTable()},renderTable()}function renderTable(){const a=document.getElementById('membersTableBody'),{col:b,dir:c}=sortState,d=[...myTeamData].sort((a,d)=>{let e=a[b],f=d[b];return'joinDate'===b?'asc'===c?e-f:f-e:(e=e.toLowerCase(),f=f.toLowerCase(),'asc'===c?e<f?-1:1:e>f?1:-1)});let e='';d.forEach((a,b)=>{const c=a.joinDate,d=`${String(c.getDate()).padStart(2,'0')}/${String(c.getMonth()+1).padStart(2,'0')}/${c.getFullYear()}`,f=a.upline?a.upline:'-';e+=`<tr><td class="col-no">${b+1}</td><td class="col-name">${a.name}</td><td class="col-uid">${a.uid}</td><td class="col-ref">${f}</td><td class="col-date">${d}</td></tr>`}),a.innerHTML=e}
function initNetwork(){const a=sessionStorage.getItem('userUid'),b=go.GraphObject.make,c=b(go.Diagram,"networkDiagram",{padding:new go.Margin(150),scrollMode:go.Diagram.InfiniteScroll,layout:b(go.TreeLayout,{angle:0,layerSpacing:60,nodeSpacing:10}),undoManager:{isEnabled:!0},initialContentAlignment:go.Spot.Center,minScale:.1,maxScale:2});c.nodeTemplate=b(go.Node,"Horizontal",{selectionObjectName:"PANEL"},b(go.Panel,"Auto",{name:"PANEL"},b(go.Shape,"RoundedRectangle",{fill:"#000",strokeWidth:1},new go.Binding("stroke","strokeColor"),new go.Binding("strokeWidth","strokeWidth")),b(go.TextBlock,{margin:new go.Margin(2,6,2,6),stroke:"#fff",font:"11px sans-serif",textAlign:"center",maxLines:1,overflow:go.TextBlock.OverflowEllipsis},new go.Binding("text","label"))),b("TreeExpanderButton",{width:14,height:14,alignment:go.Spot.Right,margin:new go.Margin(0,0,0,4),"ButtonBorder.fill":"#222","ButtonBorder.stroke":"#D4AF37","ButtonIcon.stroke":"white"})),c.linkTemplate=b(go.Link,{routing:go.Link.Orthogonal,corner:5},b(go.Shape,{strokeWidth:1,stroke:"white"}));const d=myTeamData.map(a=>{const b=a.joinDate,c=`${String(b.getDate()).padStart(2,'0')}-${String(b.getMonth()+1).padStart(2,'0')}`,d=getTotalGroupCount(a.uid),e=globalData.filter(b=>b.upline===a.uid).length>=5;return{key:a.uid,label:`${a.uid} / ${a.name} / ${c}`,strokeColor:e?"#ffd700":"#ffffff",strokeWidth:e?2:1}}),e=myTeamData.filter(a=>a.upline&&""!==a.upline).map(a=>({from:a.upline,to:a.uid}));c.model=new go.GraphLinksModel(d,e);const f=c.findNodeForKey(a);f&&(c.centerRect(f.actualBounds),f.isSelected=!0),window.downloadNetworkImage=function(){const a=c.makeImage({scale:2,background:"#000",maxSize:new go.Size(Infinity,Infinity),padding:new go.Margin(50)}),b=document.createElement("a");b.href=a.src,b.download="jaringan_dvteam.png",document.body.appendChild(b),b.click(),document.body.removeChild(b)}};
function getMonthName(a){return["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"][a]}

function openAchieverModal() {
    const modal = document.getElementById('achieverModal'), body = document.getElementById('achieverBody'), title = document.getElementById('achieverTitle'), btnDl = document.getElementById('btnDlAchiever');
    modal.style.display = 'flex'; body.innerHTML = '<div class="v-empty">Sedang menghitung data...</div>'; btnDl.style.display = 'none'; achieverTxtContent = "";
    
    setTimeout(() => {
        const now = new Date(), d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
        let startP, endP, cutoff, plabel = "";

        if (d > 15) { 
            startP = new Date(y, m, 1); 
            endP = new Date(y, m, 15, 23, 59, 59); 
            cutoff = new Date(y, m, 1); 
            plabel = `PERIODE 1 (${getMonthName(m)} ${y})`; 
        } 
        else { 
            let pm = m - 1, py = y; 
            if (pm < 0) { pm = 11; py--; } 
            startP = new Date(py, pm, 16); 
            endP = new Date(py, pm + 1, 0, 23, 59, 59); 
            cutoff = new Date(py, pm, 16); 
            plabel = `PERIODE 2 (${getMonthName(pm)} ${py})`; 
        }

        title.innerText = `PERAIH 50% - ${plabel}`; achieverTxtContent = `醇 PERAIH GROWTH 50%\n套 ${plabel}\n================\n\n`;
        let achs = []; const myUid = sessionStorage.getItem('userUid');
        
        myTeamData.forEach(mem => {
            if (new Date(mem.joinDate) > endP) return;

            const dls = getDownlinesRecursive(mem.uid);
            const base = dls.filter(dl => new Date(dl.joinDate) < startP).length + 1;
            const grow = dls.filter(dl => {
                const jd = new Date(dl.joinDate);
                return jd >= startP && jd <= endP;
            }).length;
            
            const target = Math.floor(base / 2);
            
            // GUNAKAN RANK HISTORIS (RANK SAAT END PERIODE)
            // Agar member yang baru naik VIP di periode ini TIDAK MASUK daftar periode lalu
            const rank = getHistoricalRankLevel(mem.uid, endP);
            
            if (grow >= target && grow > 0 && rank >= 1) {
                achs.push({name: (mem.uid===myUid?mem.name+" (ANDA)":mem.name), uid: mem.uid, target, actual: grow, rank});
            }
        });

        achs.sort((a,b)=>b.actual-a.actual);
        
        if (achs.length === 0) body.innerHTML = '<div class="v-empty">Belum ada VIP yang mencapai target.</div>';
        else {
            btnDl.style.display = 'block'; let html = '';
            achs.forEach((a,i) => {
                html += `<div class="achiever-item"><div class="achiever-top"><span class="v-n">${i+1}. ${a.name} <small style="color:var(--gold)">(VIP ${a.rank})</small></span><span class="v-u">${a.uid}</span></div><div class="achiever-stats"><span>Target: <b class="val-target">${a.target}</b></span><span>Capaian: <b class="val-actual">${a.actual}</b></span></div></div>`;
                achieverTxtContent += `${i+1}. ${a.name} (${a.uid}) - VIP ${a.rank}\n   Target: ${a.target} | Capai: ${a.actual}\n\n`;
            });
            body.innerHTML = html;
        }
    }, 100);
}

function downloadAchieverData() { if(!achieverTxtContent) return; const blob=new Blob([achieverTxtContent],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='peraih_50_persen.txt'; a.click(); }
function closeAchieverModal() { document.getElementById('achieverModal').style.display = 'none'; }

let intervalId; 
function startCountdown(targetDate) {
    if (intervalId) clearInterval(intervalId);
    function updateTimer() {
        const now = new Date().getTime();
        const distance = targetDate.getTime() - now;
        if (distance < 0) {
            clearInterval(intervalId);
            document.getElementById("cdDays").textContent = "00";
            document.getElementById("cdHours").textContent = "00";
            document.getElementById("cdMin").textContent = "00";
            document.getElementById("cdSec").textContent = "00";
            return;
        }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById("cdDays").textContent = days < 10 ? "0" + days : days;
        document.getElementById("cdHours").textContent = hours < 10 ? "0" + hours : hours;
        document.getElementById("cdMin").textContent = minutes < 10 ? "0" + minutes : minutes;
        document.getElementById("cdSec").textContent = seconds < 10 ? "0" + seconds : seconds;
    }
    updateTimer(); 
    intervalId = setInterval(updateTimer, 1000);
}

// MOTIVASI LOGIN
const fieryQuotes = [
    "Jangan tidur nyenyak jika targetmu belum tercapai! Mimpimu butuh eksekusi!",
    "Sukses adalah balas dendam terbaik. BUKTIKAN SEKARANG!",
    "Hari ini Anda santai? Ingat, saingan Anda sedang berlari kencang!",
    "Kemiskinan itu menyakitkan. Berjuanglah sekarang atau menderita nanti!",
    "Ubah rasa lelahmu menjadi rupiah! Jangan cengeng!",
    "Jadilah SINGA! Singa tidak menoleh saat anjing menggonggong. MAJU!",
    "Rezeki tidak akan datang ke orang yang malas! REBUT MILIKMU!",
    "Apakah Anda puas hidup begini saja? BERUBAHLA detik ini!",
    "Penonton hanya bisa tepuk tangan. JANGAN JADI PENONTON!"
];
function showMotivation() {
    if (!sessionStorage.getItem('isLoggedIn')) return;
    const modal = document.getElementById('motivationModal');
    const textEl = document.getElementById('dailyMotivation');
    if (modal && textEl) {
        const randomQuote = fieryQuotes[Math.floor(Math.random() * fieryQuotes.length)];
        textEl.innerText = `"${randomQuote}"`;
        modal.style.display = 'flex';
    }
}
window.closeMotivation = function() {
    const modal = document.getElementById('motivationModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => { modal.style.display = 'none'; modal.style.opacity = '1'; }, 300);
    }
}

// ===============================================
// GENERATOR PESAN GRUP (UPDATE SEMANGAT - FORMAT FINAL)
// ===============================================
const emotionalQuotes = [
    "Keberhasilan tim bukan dinilai dari seberapa cepat kita berlari, tapi seberapa kuat kita saling menggandeng saat pasar sedang sulit.",
    "Jangan biarkan mimpi kita mati hanya karena kita malas bergerak hari ini. INGAT ALASAN KITA MEMULAI!",
    "Pemenang bukan orang yang tak pernah gagal, tapi orang yang tak pernah menyerah meski jatuh berkali-kali.",
    "Satu orang bisa berjalan cepat, tapi satu tim bisa berjalan jauh. RAPATKAN BARISAN!",
    "Rezeki besar butuh wadah yang besar, dan wadah itu adalah KESABARAN dan KERJA KERAS kita bersama.",
    "Tidak ada pelaut hebat yang lahir dari laut yang tenang. Badai ini akan membuat kita makin kuat!",
    "Fokus pada solusi, bukan pada keluhan. Kita adalah tim pemenang, bukan tim pengeluh!"
];

window.openShareModal = function() {
    generateShareText();
    document.getElementById('shareModal').style.display = 'flex';
}

window.generateShareText = function() {
    const txtArea = document.getElementById('shareText');
    const randomQuote = emotionalQuotes[Math.floor(Math.random() * emotionalQuotes.length)];
    
    // FORMAT TANGGAL INDONESIA
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const now = new Date();
    const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;

    // TEMPLATE PESAN (Sesuai Request)
    const finalTxt = `🔥 UPDATE SEMANGAT \nDVTEAM NP 🔥\n\n` +
                     `📅 ${dateStr}\n` +
                     `👥 Target 50%: *${globalTarget} Anggota*\n\n` +
                     `"${randomQuote}"\n\n` +
                     `🚀 Tetap fokus pada pertumbuhan 50% = sisa ${currentGap} anggota lagi..!! 🏆\n` +
                     `Gow .. Gaaaaass sampai tembus..!! 💪🏻\n` +
                     `#DVTeamNP #SatuVisi #SatuMisi #SatuKomando`;

    txtArea.value = finalTxt;
}

window.copyShareText = function() {
    const txtArea = document.getElementById('shareText');
    txtArea.select();
    txtArea.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(txtArea.value).then(() => {
        alert("✅ Teks berhasil disalin! Silakan tempel di Grup WhatsApp.");
    });
}

window.closeShareModal = function() {
    document.getElementById('shareModal').style.display = 'none';
}
