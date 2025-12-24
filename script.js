const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

// Variabel Global Asli
let globalData=[], myTeamData=[], globalHistory=[], sortState={col:'joinDate',dir:'asc'};
let vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
let achieverTxtContent = "";

// INISIALISASI (Dikembalikan ke struktur asli yang stabil)
document.addEventListener('DOMContentLoaded',async()=>{
    // Cek update Service Worker
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for(let reg of regs) reg.update();
        });
    }

    const path = window.location.pathname;
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');

    if(!isLoggedIn && !path.includes('index.html')){
        window.location.href='index.html';
        return;
    }

    if(isLoggedIn) await loadData();

    if(path.includes('index.html')) {
        const btn = document.getElementById('loginButton');
        if(btn) btn.addEventListener('click',doLogin);
    }
    else if(path.includes('dashboard.html')) renderDashboard();
    else if(path.includes('list.html')) { prepareMyTeamData(); initList(); }
    else if(path.includes('network.html')) { prepareMyTeamData(); initNetwork(); }
});

// LOAD DATA (Dengan tambahan History VIP)
async function loadData(){
    try{
        // 1. Ambil Data Member
        const{data:a,error:b}=await db.from('members').select('*');
        if(b)throw b;
        globalData=a.map(a=>({
            uid:String(a.UID||a.uid).trim(),
            name:(a.Nama||a.nama||a.name||'-').trim(),
            upline:a.Upline||a.upline?String(a.Upline||a.upline).trim():"",
            joinDate:new Date(a.TanggalBergabung||a.tanggalbergabung||a.joinDate)
        }));

        // 2. Ambil Data History Pangkat (FITUR BARU)
        const{data:h,error:he}=await db.from('vip_history').select('*');
        if(!he) globalHistory = h || [];

    }catch(a){
        console.error(a);
    }
}

// LOGIKA LOGIN ASLI
async function doLogin(){
    const a=document.getElementById('loginUid').value.trim();
    const b=document.getElementById('loginButton');
    const c=document.getElementById('error');
    
    if(!a) return void(c.innerText="Masukkan UID");
    
    b.innerText="..."; b.disabled=!0;
    await loadData();
    
    const d=globalData.find(m=>m.uid===a);
    if(d){
        sessionStorage.setItem('isLoggedIn','true');
        sessionStorage.setItem('userUid',d.uid);
        window.location.href='dashboard.html';
    } else {
        c.innerText="UID Tidak Terdaftar";
        b.innerText="MASUK";
        b.disabled=!1;
    }
}

function logout(){sessionStorage.clear(),window.location.href='index.html'}

// LOGIKA DASHBOARD ASLI (Tampilan & Grafik dikembalikan)
function renderDashboard(){
    const a=sessionStorage.getItem('userUid');
    if(!globalData.length) return; 
    
    const b=globalData.find(m=>m.uid===a);
    if(!b) return logout();
    
    document.getElementById('mName').innerText=b.name;
    document.getElementById('mUid').innerText=b.uid;
    const c=globalData.find(u=>u.uid===b.upline);
    document.getElementById('mRefUid').innerText=c?c.uid:'-';
    
    const d=getDownlinesRecursive(a);
    const e=1+d.length;
    document.getElementById('totalMembers').innerText=e;
    
    const f=globalData.filter(m=>m.upline===a).length;
    calculateMyRank(e,f,b.uid);
    
    const g=[b,...d];
    myTeamData = g; 
    
    countVipStats(g); // Hitung VIP & History
    
    // Hitung Periode & Grafik
    const h=new Date, i=h.getDate(), j=h.getMonth(), k=h.getFullYear();
    let l,m,n,o=!1;
    
    // Logika Periode (Sama seperti sebelumnya)
    if(i<=15) {
        l=new Date(k,j,1); m=new Date(k,j,15,23,59,59);
        n=`PERIODE 1 (${getMonthName(j)})`;
    } else {
        l=new Date(k,j,16); m=new Date(k,j+1,0,23,59,59);
        n=`PERIODE 2 (${getMonthName(j)})`;
        o=!0; // isPeriod2
    }
    
    document.getElementById('currentPeriodLabel').innerText=n;
    
    const p=g.filter(x=>x.joinDate<l).length; // Periode Lalu
    const q=g.filter(x=>{let z=new Date(x.joinDate); return z>=l && z<=m}).length; // Baru
    const r=Math.ceil(p/2); // Target
    let s=r-q; if(s<0)s=0; // Gap
    
    document.getElementById('prevPeriodCount').innerText=p;
    document.getElementById('targetCount').innerText=r;
    document.getElementById('newMemberCount').innerText=q;
    document.getElementById('gapCount').innerText=s;
    
    renderChart(g,k,j,o);
}

// GRAFIK ASLI
function renderChart(a,b,c,d){
    const e=document.getElementById('growthChart').getContext('2d');
    const f=new Date(b,c,1), g=new Date(b,c,15,23,59,59);
    const h=new Date(b,c,16), i=new Date(b,c+1,0,23,59,59);
    
    const j=a.filter(x=>x.joinDate>=f&&x.joinDate<=g).length;
    const k=a.filter(x=>x.joinDate>=h&&x.joinDate<=i).length;
    
    const l=d?'#333':'#D4AF37', m=d?'#D4AF37':'#333';
    
    if(window.myChart) window.myChart.destroy();
    window.myChart=new Chart(e,{
        type:'bar',
        data:{
            labels:['P1','P2'],
            datasets:[{label:'Growth',data:[j,k],backgroundColor:[l,m],borderColor:'#D4AF37',borderWidth:1}]
        },
        options:{
            responsive:!0, maintainAspectRatio:!1,
            scales:{
                y:{beginAtZero:!0,grid:{color:'#333'},ticks:{display:!1}},
                x:{grid:{display:!1},ticks:{color:'#888',fontSize:9}}
            },
            plugins:{legend:{display:!1}}
        }
    });
}

// LOGIKA RECURSIVE & RANK (ASLI)
function prepareMyTeamData(){
    const a=sessionStorage.getItem('userUid');
    const b=globalData.find(x=>x.uid===a);
    if(b){ myTeamData=[b,...getDownlinesRecursive(a)]; }
}

function getDownlinesRecursive(a){
    let b=[]; const c=globalData.filter(x=>x.upline===a);
    c.forEach(x=>{ b.push(x); b=b.concat(getDownlinesRecursive(x.uid)); });
    return b;
}

function countSpecificVipInTeam(tm, lvl) {
    let c=0;
    for(let i=1; i<tm.length; i++){
        if(getRankLevel(tm[i].uid) >= lvl) c++;
    }
    return c;
}

function getRankLevel(a){
    const directs = globalData.filter(x=>x.upline===a).length;
    if(directs < 5) return 0; // Syarat dasar VIP 1

    const tm = [globalData.find(x=>x.uid===a), ...getDownlinesRecursive(a)];
    const total = tm.length;
    
    // Syarat Tier (Sesuai kode asli)
    const tiers = [
        {l:9, m:3501, rv:2, rl:2}, {l:8, m:1601, rv:2, rl:2}, {l:7, m:901, rv:2, rl:2},
        {l:6, m:501, rv:2, rl:2}, {l:5, m:351, rv:2, rl:2}, {l:4, m:201, rv:2, rl:2},
        {l:3, m:101, rv:2, rl:2}, {l:2, m:31, rv:2, rl:1}
    ];

    // Optimasi perhitungan sub-VIP hanya jika total memenuhi syarat
    // (Agar tidak macet tapi tetap akurat)
    let v2=0, v1=0;
    if(total >= 31) {
        v1 = countSpecificVipInTeam(tm, 1);
        if(total >= 101) v2 = countSpecificVipInTeam(tm, 2);
    }

    for(const t of tiers){
        if(total >= t.m){
            let curr = (t.l >= 3) ? v2 : v1;
            if(curr >= t.rv) return t.l;
        }
    }
    return 1; // Default VIP 1 jika directs >= 5 & total >= 5
}

function calculateMyRank(size, direct, uid){
    const lvl = getRankLevel(uid);
    const tiers = [
        {n:"V.I.P 9", l:9, m:3501, rv:2, rn:"V.I.P 2"},
        {n:"V.I.P 8", l:8, m:1601, rv:2, rn:"V.I.P 2"},
        {n:"V.I.P 7", l:7, m:901, rv:2, rn:"V.I.P 2"},
        {n:"V.I.P 6", l:6, m:501, rv:2, rn:"V.I.P 2"},
        {n:"V.I.P 5", l:5, m:351, rv:2, rn:"V.I.P 2"},
        {n:"V.I.P 4", l:4, m:201, rv:2, rn:"V.I.P 2"},
        {n:"V.I.P 3", l:3, m:101, rv:2, rn:"V.I.P 2"},
        {n:"V.I.P 2", l:2, m:31, rv:2, rn:"V.I.P 1"},
        {n:"V.I.P 1", l:1, m:5, rv:0}
    ];
    
    const cur = tiers.find(t=>t.l===lvl) || {n:"MEMBER", l:0};
    document.getElementById('rankName').innerText = cur.n;
    
    const next = tiers.find(t=>t.l === lvl+1);
    let gap=0, msg="Top Level";
    
    if(next){
        gap = (next.l===1) ? next.m - direct : next.m - size;
        if(gap<0) gap=0;
        
        // Cek struktur untuk pesan motivasi
        if(next.l >= 2) {
            const tm = [globalData.find(x=>x.uid===uid), ...getDownlinesRecursive(uid)];
            const reqVal = (next.l>=3) ? countSpecificVipInTeam(tm,2) : countSpecificVipInTeam(tm,1);
            if(reqVal < next.rv) msg = `Kurang ${next.rv - reqVal} ${next.rn}`;
            else msg = `Menuju ${next.n}`;
        } else {
            msg = `Menuju ${next.n}`;
        }
    }
    
    const elMsg = document.getElementById('rankNextGoal');
    elMsg.innerText = msg;
    elMsg.style.color = msg.includes("Kurang") ? '#ff4444' : '#ccc';
    document.getElementById('nextLevelGap').innerText = gap;
}

// LOGIKA VIP & HISTORY (YANG PENTING)
function countVipStats(tm){
    let c={1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
    let alertStatus={}; 
    vipLists={1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
    
    const now = new Date();
    
    tm.forEach(m=>{
        let lvl = getRankLevel(m.uid);
        if(lvl>=1 && lvl<=9){
            c[lvl]++;
            vipLists[lvl].push(m);
            
            // 1. Auto Save History
            const exist = globalHistory.find(h=>h.uid===m.uid && h.vip_level===lvl);
            if(!exist){
                const ts = now.toISOString();
                globalHistory.push({uid:m.uid, vip_level:lvl, achieved_at:ts});
                db.from('vip_history').insert([{uid:m.uid, vip_level:lvl, achieved_at:ts}]).then(()=>{});
            }
            
            // 2. Cek Notifikasi (Berdasarkan History)
            const h = globalHistory.find(x=>x.uid===m.uid && x.vip_level===lvl);
            const time = h ? new Date(h.achieved_at) : new Date(m.joinDate);
            if((now - time) < 86400000) alertStatus[lvl] = true; // 24 jam
        }
    });
    
    for(let i=1;i<=9;i++){
        const el=document.getElementById(`cVIP${i}`);
        if(el){
            el.innerText=c[i];
            const p=el.parentElement;
            if(alertStatus[i]) p.classList.add('new-alert');
            else p.classList.remove('new-alert');
        }
    }
}

// MODAL VIP: SORTING TERBARU (YANG ANDA MINTA)
window.openVipModal = function(level) {
    const m=document.getElementById('vipModal');
    const b=document.getElementById('modalBody');
    document.getElementById('modalTitle').innerText = `DAFTAR V.I.P ${level}`;
    b.innerHTML = ''; 
    
    // Sort Descending berdasarkan Achieved Date
    let list = [...vipLists[level]].sort((a, b) => {
        const hA = globalHistory.find(h=>h.uid===a.uid && h.vip_level===level);
        const hB = globalHistory.find(h=>h.uid===b.uid && h.vip_level===level);
        const tA = hA ? new Date(hA.achieved_at) : new Date(a.joinDate);
        const tB = hB ? new Date(hB.achieved_at) : new Date(b.joinDate);
        return tB - tA; // Besar (Baru) ke Kecil (Lama)
    });

    if(!list.length) {
        b.innerHTML = '<div class="v-empty">Belum ada anggota.</div>';
    } else {
        const now = new Date();
        list.forEach(m => {
            const h = globalHistory.find(x=>x.uid===m.uid && x.vip_level===level);
            const t = h ? new Date(h.achieved_at) : new Date(m.joinDate);
            const isNew = (now - t) < 86400000;
            const dStr = `${t.getDate()}/${t.getMonth()+1} ${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
            
            b.innerHTML += `
                <div class="v-item ${isNew ? 'new-name-alert' : ''}">
                    <div style="display:flex; flex-direction:column;">
                        <span class="v-n">${m.name} ${isNew ? '🆕' : ''}</span>
                        <small style="color:#666; font-size:9px;">${dStr}</small>
                    </div>
                    <span class="v-u">${m.uid}</span>
                </div>`;
        });
    }
    m.style.display = 'flex';
}
window.closeVipModal = function(){ document.getElementById('vipModal').style.display='none'; }

// PIALA / ACHIEVER (VERSI FINAL - LOGIKA GROWTH 50% YANG SUDAH DIPERBAIKI)
window.openAchieverModal = function() {
    const m = document.getElementById('achieverModal'), b = document.getElementById('achieverBody');
    m.style.display = 'flex'; b.innerHTML = '<div class="v-empty">Menghitung...</div>';
    document.getElementById('btnDlAchiever').style.display = 'none';
    achieverTxtContent = "";

    setTimeout(() => {
        const now = new Date(), d = now.getDate(), mo = now.getMonth(), y = now.getFullYear();
        let startP, endP, labelP;

        // Tentukan Periode LALU
        if (d > 15) { 
            startP = new Date(y, mo, 1); endP = new Date(y, mo, 15, 23, 59, 59); 
            labelP = `PERIODE 1 (${getMonthName(mo)} ${y})`; 
        } else { 
            let pm = mo - 1, py = y; if (pm < 0) { pm = 11; py--; } 
            startP = new Date(py, pm, 16); endP = new Date(py, pm + 1, 0, 23, 59, 59); 
            labelP = `PERIODE 2 (${getMonthName(pm)} ${py})`; 
        }

        document.getElementById('achieverTitle').innerText = `PERAIH 50% - ${labelP}`;
        achieverTxtContent = `PERAIH 50% - ${labelP}\n\n`;

        let achs = []; const myUid = sessionStorage.getItem('userUid');
        
        myTeamData.forEach(mem => {
            if(new Date(mem.joinDate) > endP) return;

            const dls = getDownlinesRecursive(mem.uid);
            
            // Base: Tim SEBELUM periode
            const base = dls.filter(x => new Date(x.joinDate) < startP).length + 1;
            
            // Growth: Tim DALAM periode
            const grow = dls.filter(x => { let j=new Date(x.joinDate); return j>=startP && j<=endP }).length;
            
            // Target: 50%
            const target = Math.floor(base / 2);
            
            // Cek Pangkat Saat Ini
            const rank = getRankLevel(mem.uid);
            
            // VALIDASI VIP SAAT ITU: Referral >= 5 pada tanggal akhir periode
            const dirAtTime = globalData.filter(g => g.upline === mem.uid && new Date(g.joinDate) <= endP).length;

            // SYARAT LOLOS (REVISI ANDA): Growth > 0 (Target 0 gapapa asal grow) & Rank >= 1 & Direct >= 5
            if (grow >= target && grow > 0 && rank >= 1 && dirAtTime >= 5) {
                achs.push({name: (mem.uid===myUid?mem.name+" (ANDA)":mem.name), uid: mem.uid, target, actual: grow, rank});
            }
        });

        achs.sort((a,b)=>b.actual-a.actual);
        
        if(!achs.length) b.innerHTML = '<div class="v-empty">Belum ada VIP yang mencapai target.</div>';
        else {
            document.getElementById('btnDlAchiever').style.display = 'block';
            let html = '';
            achs.forEach((a, i) => {
                html += `<div class="achiever-item"><div class="achiever-top"><span class="v-n">${i+1}. ${a.name} <small style="color:var(--gold)">(VIP ${a.rank})</small></span><span class="v-u">${a.uid}</span></div><div class="achiever-stats"><span>Target: <b class="val-target">${a.target}</b></span><span>Capai: <b class="val-actual">${a.actual}</b></span></div></div>`;
                achieverTxtContent += `${i+1}. ${a.name} (${a.uid}) - T:${a.target} C:${a.actual}\n`;
            });
            b.innerHTML = html;
        }
    }, 100);
}
window.downloadAchieverData = function() {
    if(!achieverTxtContent) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([achieverTxtContent],{type:'text/plain'}));
    a.download = 'peraih_50_persen.txt'; a.click();
}
window.closeAchieverModal = function() { document.getElementById('achieverModal').style.display = 'none'; }

// FUNGSI LIST & NETWORK & UTILS (DIKEMBALIKAN KE ASAL)
function initList(){
    window.sortData=a=>{sortState.col===a?sortState.dir='asc'===sortState.dir?'desc':'asc':(sortState.col=a,sortState.dir='asc'),renderTable()},renderTable()}function renderTable(){const a=document.getElementById('membersTableBody'),{col:b,dir:c}=sortState,d=[...myTeamData].sort((a,d)=>{let e=a[b],f=d[b];return'joinDate'===b?'asc'===c?e-f:f-e:(e=e.toLowerCase(),f=f.toLowerCase(),'asc'===c?e<f?-1:1:e>f?1:-1)});let e='';d.forEach((a,b)=>{const c=a.joinDate,d=`${String(c.getDate()).padStart(2,'0')}/${String(c.getMonth()+1).padStart(2,'0')}/${c.getFullYear()}`,f=a.upline?a.upline:'-';e+=`<tr><td class="col-no">${b+1}</td><td class="col-name">${a.name}</td><td class="col-uid">${a.uid}</td><td class="col-ref">${f}</td><td class="col-date">${d}</td></tr>`}),a.innerHTML=e}

function initNetwork(){const a=sessionStorage.getItem('userUid'),b=go.GraphObject.make,c=b(go.Diagram,"networkDiagram",{padding:new go.Margin(150),scrollMode:go.Diagram.InfiniteScroll,layout:b(go.TreeLayout,{angle:0,layerSpacing:60,nodeSpacing:10}),undoManager:{isEnabled:!0},initialContentAlignment:go.Spot.Center,minScale:.1,maxScale:2});c.nodeTemplate=b(go.Node,"Horizontal",{selectionObjectName:"PANEL"},b(go.Panel,"Auto",{name:"PANEL"},b(go.Shape,"RoundedRectangle",{fill:"#000",strokeWidth:1},new go.Binding("stroke","strokeColor"),new go.Binding("strokeWidth","strokeWidth")),b(go.TextBlock,{margin:new go.Margin(2,6,2,6),stroke:"#fff",font:"11px sans-serif",textAlign:"center",maxLines:1,overflow:go.TextBlock.OverflowEllipsis},new go.Binding("text","label"))),b("TreeExpanderButton",{width:14,height:14,alignment:go.Spot.Right,margin:new go.Margin(0,0,0,4),"ButtonBorder.fill":"#222","ButtonBorder.stroke":"#D4AF37","ButtonIcon.stroke":"white"})),c.linkTemplate=b(go.Link,{routing:go.Link.Orthogonal,corner:5},b(go.Shape,{strokeWidth:1,stroke:"white"}));const d=myTeamData.map(a=>{const b=a.joinDate,c=`${String(b.getDate()).padStart(2,'0')}-${String(b.getMonth()+1).padStart(2,'0')}`,d=1+getDownlinesRecursive(a.uid).length,e=globalData.filter(b=>b.upline===a.uid).length>=5;return{key:a.uid,label:`${a.uid} / ${a.name} / ${c}`,strokeColor:e?"#ffd700":"#ffffff",strokeWidth:e?2:1}}),e=myTeamData.filter(a=>a.upline&&""!==a.upline).map(a=>({from:a.upline,to:a.uid}));c.model=new go.GraphLinksModel(d,e);const f=c.findNodeForKey(a);f&&(c.centerRect(f.actualBounds),f.isSelected=!0),window.downloadNetworkImage=function(){const a=c.makeImage({scale:2,background:"#000",maxSize:new go.Size(Infinity,Infinity),padding:new go.Margin(50)}),b=document.createElement("a");b.href=a.src,b.download="jaringan_dvteam.png",document.body.appendChild(b),b.click(),document.body.removeChild(b)}};

function getMonthName(a){return["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"][a]}
