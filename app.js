const api = "api.php";
let isAdmin = false;
let callList = [];
let queryEnabled = true;
let certPrefix = "FMO-";
let currentCall = "";
let pendingImport = [];
let authToken = null;
let authExpiry = 0;
let currentCertData = null; // 当前证书配置（含模板）
let selectedTemplate = 'classic'; // 当前选中的模板

// ===================== XSS 防护 =====================
function safeText(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function safeAttr(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function(c) {
        return '&#' + c.charCodeAt(0) + ';';
    });
}

// ===================== Loading 状态管理 =====================
const loadingBtns = new Set();
function setBtnLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.origHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
        loadingBtns.add(btn);
    } else {
        btn.disabled = false;
        if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
        loadingBtns.delete(btn);
    }
}

// ===================== Toast =====================
function showToast(msg, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        container.id = "toastContainer";
        document.body.appendChild(container);
    }
    if (!document.getElementById("toastStyle")) {
        const s = document.createElement("style"); s.id = "toastStyle";
        s.textContent = ".toast-container{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:320px;}.toast{padding:12px 18px;border-radius:8px;color:#fff;font-size:13px;display:flex;align-items:center;gap:8px;animation:toastIn .3s ease;box-shadow:0 4px 12px rgba(0,0,0,.15);}.toast-success{background:#16a34a;}.toast-error{background:#dc2626;}.toast-info{background:#2563eb;}.toast-warning{background:#f59e0b;}@keyframes toastIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}";
        document.head.appendChild(s);
    }
    const icons = { success: "check-circle", error: "times-circle", info: "info-circle", warning: "exclamation-triangle" };
    const t = document.createElement("div");
    t.className = "toast toast-" + type;
    t.innerHTML = '<i class="fas fa-' + (icons[type] || "info-circle") + '"></i> ' + safeText(msg);
    container.appendChild(t);
    setTimeout(() => { t.remove(); }, 3000);
}

// ===================== Section Toggle =====================
function toggleSection(el) { el.classList.toggle("open"); }
var allSectionsExpanded=true;
function toggleAllSections(){allSectionsExpanded=!allSectionsExpanded;document.querySelectorAll("#adminContent .admin-section").forEach(s=>{if(allSectionsExpanded)s.classList.add("open");else s.classList.remove("open");});var tog=document.getElementById("collapseAllToggle");if(tog)tog.classList.toggle("on",allSectionsExpanded);}

function toggleCheckbox(id) {
    const cb = document.getElementById(id);
    cb.checked = !cb.checked;
    const toggle = document.getElementById(id + "Toggle");
    if (toggle) toggle.classList.toggle("on", cb.checked);
}
function syncToggle(id) {
    const cb = document.getElementById(id);
    const toggle = document.getElementById(id + "Toggle");
    if (toggle) toggle.classList.toggle("on", cb.checked);
}

// ===================== Logging =====================
function addLog(txt) {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const timeStr = now.getFullYear()+"-"+pad(now.getMonth()+1)+"-"+pad(now.getDate())+" "+pad(now.getHours())+":"+pad(now.getMinutes())+":"+pad(now.getSeconds());
    const logBox = document.getElementById("logBox");
    if (!logBox) return;
    logBox.textContent += "[" + timeStr + "] " + txt + "\n";
    logBox.scrollTop = logBox.scrollHeight;
}

// ===================== Load Functions =====================

// 名单缓存（防止刷新时数据丢失）
var CALLLIST_CACHE_KEY = 'fmo_calllist_cache';

function getCachedCallList() {
    try {
        var cached = sessionStorage.getItem(CALLLIST_CACHE_KEY);
        if (cached) return JSON.parse(cached);
    } catch(e) {}
    return null;
}

function setCachedCallList(list) {
    try {
        sessionStorage.setItem(CALLLIST_CACHE_KEY, JSON.stringify(list));
    } catch(e) {}
}

// 页面加载时立即从缓存恢复名单（秒级响应）
(function() {
    var cached = getCachedCallList();
    if (cached && cached.length > 0) {
        callList = cached;
    }
})();

async function loadServerState() {
    try { var d = await (await fetch(api+"?action=status")).json(); queryEnabled = !!d.enabled; }
    catch(e) { /* 网络错误时保持当前状态 */ }
}

// 带超时的fetch包装函数
function fetchWithTimeout(url, timeoutMs) {
    return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() { reject(new Error('timeout')); }, timeoutMs);
        fetch(url).then(function(resp) {
            clearTimeout(timer);
            resolve(resp);
        }, function(err) {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function reloadList(retryCount) {
    retryCount = retryCount || 0;
    var maxRetries = 3;
    try {
        // 如果已有缓存数据，先立即显示
        if (callList.length > 0) {
            refreshUI();
        }
        // 5秒超时
        var resp = await fetchWithTimeout(api+"?action=list", 5000);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var d = await resp.json();
        if (d.callList && d.callList.length > 0) {
            callList = d.callList;
            setCachedCallList(callList);
            refreshUI();
        } else if (d.callList && d.callList.length === 0 && callList.length === 0) {
            callList = d.callList;
            setCachedCallList(callList);
            refreshUI();
        }
    } catch(e) {
        if (retryCount < maxRetries) {
            await new Promise(function(r) { setTimeout(r, 300 * (retryCount + 1)); });
            return reloadList(retryCount + 1);
        }
        // 重试耗尽后，如果有缓存数据则不显示错误
        if (callList.length > 0) {
            // 静默失败，不打扰用户
            return;
        }
        var el = document.getElementById("totalCount");
        if (el) el.innerText = "加载失败";
        showToast("数据加载失败，请刷新页面重试","error");
    }
}

function refreshUI() {
    var totalCountEl = document.getElementById("totalCount");
    if (totalCountEl) totalCountEl.innerText = callList.length;
    var listCountBadgeEl = document.getElementById("listCountBadge");
    if (listCountBadgeEl) listCountBadgeEl.innerText = callList.length;
    var callListEl = document.getElementById("callList");
    if (callListEl) callListEl.value = callList.join("\n");
    renderListManage();
    renderExportList();
    refreshSwitch();
}

function refreshSwitch() {
    var toggle = document.getElementById("queryToggle");
    var label = document.getElementById("queryLabel");
    if (!toggle || !label) return;
    if (queryEnabled) {
        toggle.classList.add("on"); label.innerText = "已开启"; label.style.color = "var(--success)";
        var closedTip = document.getElementById("closedTip");
        if (closedTip) closedTip.style.display = "none";
    } else {
        toggle.classList.remove("on"); label.innerText = "已关闭"; label.style.color = "var(--text-secondary)";
        var closedTip2 = document.getElementById("closedTip");
        if (closedTip2) closedTip2.style.display = "block";
    }
}

async function loadNoticeConfig() {
    try {
        const d = await (await fetch(api+"?action=get_notice")).json();
        if (d.code===1) {
            document.getElementById("noticeEnable").checked = d.data.enable==="1";
            syncToggle("noticeEnable");
            document.getElementById("noticeContent").value = d.data.content||"";
            document.getElementById("noticeMode").value = d.data.mode||"daily";
            document.getElementById("noticeDelay").value = d.data.delay||"1";
        }
    } catch(e){}
}

async function loadCertConfig() {
    try {
        const d = await (await fetch(api+"?action=get_cert")).json();
        if (d.code===1) {
            currentCertData = d.data;
            document.getElementById("cTitle").value = d.data.title||"";
            document.getElementById("cSub").value = d.data.sub||"";
            document.getElementById("cLabel").value = d.data.label||"";
            document.getElementById("cDesc").value = d.data.desc||"";
            document.getElementById("certTitle").innerText = d.data.title||"";
            document.getElementById("certSubtitle").innerText = d.data.sub||"";
            document.getElementById("certLabel").innerText = d.data.label||"";
            document.getElementById("certDesc").innerText = d.data.desc||"";
            selectedTemplate = d.data.template || 'classic';
            renderTemplateGrid();
            applyTemplateToCert(selectedTemplate);
        }
    } catch(e){}
}

// ===================== Template System =====================
function renderTemplateGrid() {
    const grid = document.getElementById('templateGrid');
    if (!grid || !currentCertData) return;
    const templates = currentCertData.templates || {};
    let html = '';
    for (const [key, tpl] of Object.entries(templates)) {
        const isActive = key === selectedTemplate;
        html += '<div class="sstv-mode-card'+(isActive?' selected':'')+'" onclick="selectTemplate(\''+key+'\')" style="cursor:pointer;padding:14px;text-align:center;border:2px solid '+(isActive?tpl.borderColor:'var(--border)')+';'+(isActive?'box-shadow:0 0 0 3px '+tpl.borderColor+'33;':'')+'">';
        html += '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,'+tpl.borderColor+','+tpl.titleColor+');margin:0 auto 8px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-file-alt" style="color:#fff;font-size:16px;"></i></div>';
        html += '<div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:2px;">'+safeText(tpl.name)+'</div>';
        html += '<div style="display:flex;gap:4px;justify-content:center;margin-top:4px;">';
        html += '<span style="width:14px;height:14px;border-radius:50%;background:'+tpl.borderColor+';border:1px solid rgba(0,0,0,0.1);"></span>';
        html += '<span style="width:14px;height:14px;border-radius:50%;background:'+tpl.titleColor+';border:1px solid rgba(0,0,0,0.1);"></span>';
        html += '<span style="width:14px;height:14px;border-radius:50%;background:'+tpl.signColor+';border:1px solid rgba(0,0,0,0.1);"></span>';
        html += '</div>';
        if (isActive) html += '<div style="margin-top:6px;font-size:10px;color:'+tpl.borderColor+';font-weight:600;"><i class="fas fa-check-circle"></i> 当前使用</div>';
        html += '</div>';
    }
    grid.innerHTML = html;
}

function selectTemplate(key) {
    selectedTemplate = key;
    renderTemplateGrid();
    applyTemplateToCert(key);
    // 更新颜色选择器
    if (currentCertData && currentCertData.templates && currentCertData.templates[key]) {
        const tpl = currentCertData.templates[key];
        document.getElementById('tplBorderColor').value = tpl.borderColor;
        document.getElementById('tplTitleColor').value = tpl.titleColor;
    }
    showToast("已切换模板","info");
}

function applyTemplateToCert(key) {
    if (!currentCertData || !currentCertData.templates) return;
    const tpl = currentCertData.templates[key];
    if (!tpl) return;
    const cert = document.getElementById('cert');
    if (!cert) return;
    cert.style.borderColor = tpl.borderColor;
    cert.style.setProperty('--cert-border', tpl.borderColor);
    const title = document.getElementById('certTitle');
    if (title) title.style.color = tpl.titleColor;
    const sign = cert.querySelector('.sign');
    if (sign) sign.style.color = tpl.signColor;
    // 更新颜色选择器
    const bc = document.getElementById('tplBorderColor');
    const tc = document.getElementById('tplTitleColor');
    if (bc) bc.value = tpl.borderColor;
    if (tc) tc.value = tpl.titleColor;
}

async function applyTemplateColors() {
    const borderColor = document.getElementById('tplBorderColor').value;
    const titleColor = document.getElementById('tplTitleColor').value;
    // 应用到前台证书预览
    const cert = document.getElementById('cert');
    if (cert) cert.style.borderColor = borderColor;
    const title = document.getElementById('certTitle');
    if (title) title.style.color = titleColor;
    // 更新模板数据中的颜色
    if (currentCertData && currentCertData.templates && currentCertData.templates[selectedTemplate]) {
        currentCertData.templates[selectedTemplate].borderColor = borderColor;
        currentCertData.templates[selectedTemplate].titleColor = titleColor;
    }
    // 保存到后端
    if(!isAdmin){showToast("颜色已应用（登录后可保存）","info");return;}
    const auth=await getAuthParams();if(!auth)return;
    const title2=document.getElementById("cTitle").value,sub=document.getElementById("cSub").value,label=document.getElementById("cLabel").value,desc=document.getElementById("cDesc").value;
    try{const d=await(await fetch(api+"?action=save_cert",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,title:title2,sub,label,desc,template:selectedTemplate,templates:currentCertData.templates})})).json();
    if(d.code===1){showToast("颜色已保存","success");addLog("修改模板颜色");await loadCertConfig();}
    else{showToast(d.msg||"保存失败","error");}}catch(e){showToast("网络错误","error");}
}

function resetTemplateColors() {
    applyTemplateToCert(selectedTemplate);
    showToast("已重置为模板默认颜色","info");
}

// ===================== Date Wheel Picker =====================
function initWheelPicker() {
    const yearSel = document.getElementById("certYear");
    const monthSel = document.getElementById("certMonth");
    const daySel = document.getElementById("certDay");
    const thisYear = new Date().getFullYear();
    for (let y=thisYear-5;y<=thisYear+5;y++) { const o=document.createElement("option");o.value=String(y);o.textContent=y;yearSel.appendChild(o); }
    const numYearSel=document.getElementById("certNumYear"),numMonthSel=document.getElementById("certNumMonth");
    if(numYearSel){for(let y=thisYear-5;y<=thisYear+5;y++){const o=document.createElement("option");o.value=String(y);o.textContent=y;numYearSel.appendChild(o);}}
    if(numMonthSel){for(let m=1;m<=12;m++){const o=document.createElement("option");o.value=String(m).padStart(2,"0");o.textContent=m;numMonthSel.appendChild(o);}}
    for(let m=1;m<=12;m++){const o=document.createElement("option");o.value=String(m).padStart(2,"0");o.textContent=m;monthSel.appendChild(o);}
    function refreshDays(){const curDay=daySel.value,y=parseInt(yearSel.value),m=parseInt(monthSel.value),maxDay=(y&&m)?new Date(y,m,0).getDate():31;daySel.innerHTML='<option value="">日</option>';for(let d=1;d<=maxDay;d++){const o=document.createElement("option");o.value=String(d).padStart(2,"0");o.textContent=d;daySel.appendChild(o);}if(curDay&&parseInt(curDay)<=maxDay)daySel.value=curDay;}
    yearSel.addEventListener("change",refreshDays);monthSel.addEventListener("change",refreshDays);refreshDays();
    function refreshNumDays(){const ns=document.getElementById("certNumDay");if(!ns)return;const curDay=ns.value,y=parseInt(document.getElementById("certNumYear").value),m=parseInt(document.getElementById("certNumMonth").value),maxDay=(y&&m)?new Date(y,m,0).getDate():31;ns.innerHTML='<option value="">日</option>';for(let d=1;d<=maxDay;d++){const o=document.createElement("option");o.value=String(d).padStart(2,"0");o.textContent=d;ns.appendChild(o);}if(curDay&&parseInt(curDay)<=maxDay)ns.value=curDay;}
    const ns2=document.getElementById("certNumYear"),ns3=document.getElementById("certNumMonth");
    if(ns2)ns2.addEventListener("change",refreshNumDays);if(ns3)ns3.addEventListener("change",refreshNumDays);refreshNumDays();
}

function clearDateFields() {
    ["certYear","certMonth","certDay","certNumYear","certNumMonth","certNumDay"].forEach(id=>document.getElementById(id).value="");
    showToast("日期已清空","info");
}

// ===================== List Rendering =====================
function renderListManage() {
    const box=document.getElementById("listManageBox");
    if(!box)return;
    if(callList.length===0){box.innerHTML='<div class="list-empty"><i class="fas fa-inbox"></i>暂无呼号数据，请添加或导入</div>';return;}
    let html="";callList.forEach((item,idx)=>{
        html+='<div class="list-item"><div class="list-num">'+(idx+1)+'</div><input type="text" class="list-call" value="'+safeAttr(item)+'" data-idx="'+idx+'"><div class="list-actions"><input type="checkbox" class="list-check" data-idx="'+idx+'"><button class="btn-icon" title="删除" onclick="deleteSingle('+idx+')"><i class="fas fa-trash-alt"></i></button></div></div>';
    });
    box.innerHTML=html;const ca=document.getElementById("checkAll");if(ca)ca.checked=false;
}

function renderExportList() {
    const box=document.getElementById("exportManageBox");if(!box)return;
    if(callList.length===0){box.innerHTML='<div class="list-empty"><i class="fas fa-inbox"></i>暂无呼号数据</div>';return;}
    let html="";callList.forEach((item,idx)=>{
        html+='<div class="list-item"><div class="list-num">'+(idx+1)+'</div><div style="flex:1;font-family:Consolas,monospace;font-size:14px;font-weight:500;">'+safeText(item)+'</div><div class="list-actions"><input type="checkbox" class="export-check" data-idx="'+idx+'"></div></div>';
    });
    box.innerHTML=html;
    const ce=document.getElementById("checkAllExport");if(ce){ce.onchange=function(){document.querySelectorAll('.export-check').forEach(i=>i.checked=this.checked);};}
}

// ===================== CRUD Operations =====================
async function deleteSingle(idx) {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    if(!confirm('确定删除呼号 "'+callList[idx]+'" 吗？'))return;
    const auth=await getAuthParams();if(!auth)return;
    callList.splice(idx,1);refreshUI();
    try{const d=await(await fetch(api+"?action=save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,list:callList})})).json();
    if(d.code===1){showToast("删除成功","success");addLog("删除单条呼号 (索引"+(idx+1)+")");}
    else{showToast(d.msg||"保存失败","error");await reloadList();}}catch(e){showToast("网络错误","error");await reloadList();}
}

async function batchDelete() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    const checks=document.querySelectorAll(".list-check:checked");
    if(checks.length===0){showToast("请先勾选要删除的呼号","warning");return;}
    if(!confirm("确定删除选中的 "+checks.length+" 个呼号吗？"))return;
    const auth=await getAuthParams();if(!auth)return;
    Array.from(checks).map(c=>parseInt(c.dataset.idx)).sort((a,b)=>b-a).forEach(i=>callList.splice(i,1));
    refreshUI();
    try{const d=await(await fetch(api+"?action=save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,list:callList})})).json();
    if(d.code===1){showToast("已删除 "+checks.length+" 个呼号","success");addLog("批量删除 "+checks.length+" 条呼号");}
    else{showToast(d.msg||"保存失败","error");await reloadList();}}catch(e){showToast("网络错误","error");await reloadList();}
}

async function saveEdits() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    document.querySelectorAll(".list-call").forEach(inp=>{const idx=parseInt(inp.dataset.idx);callList[idx]=inp.value.trim().toUpperCase();});
    callList=callList.filter(v=>v);const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,list:callList})})).json();
    if(d.code===1){showToast("修改已保存","success");addLog("保存列表修改");refreshUI();}
    else{showToast(d.msg||"保存失败","error");}}catch(e){showToast("网络错误","error");}
}

async function saveList() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    const t=document.getElementById("callList").value;const list=t.split("\n").map(x=>x.trim()).filter(x=>x).map(x=>x.toUpperCase());
    const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,list})})).json();
    if(d.code===1){showToast("名单保存成功","success");addLog("保存名单，共 "+list.length+" 条");callList=list;refreshUI();}
    else{showToast(d.msg||"保存失败","error");}}catch(e){showToast("网络错误","error");}
}

async function clearAll() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    if(callList.length===0){showToast("名单已经是空的","info");return;}
    if(!confirm("确定要清空所有 "+callList.length+" 个呼号吗？此操作不可恢复！"))return;
    const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=clear",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code===1){showToast("已清空所有呼号","success");addLog("清空全部名单");callList=[];refreshUI();}
    else{showToast(d.msg||"清空失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== File Import =====================
let pendingFileData=null;
function initFileImport() {
    const dropzone=document.getElementById("fileDropzone"),fileInput=document.getElementById("fileInput");
    if(!dropzone||!fileInput)return;
    dropzone.addEventListener("click",()=>fileInput.click());
    dropzone.addEventListener("dragover",(e)=>{e.preventDefault();dropzone.classList.add("dragover");});
    dropzone.addEventListener("dragleave",()=>dropzone.classList.remove("dragover"));
    dropzone.addEventListener("drop",(e)=>{e.preventDefault();dropzone.classList.remove("dragover");if(e.dataTransfer.files.length>0)handleFileSelect(e.dataTransfer.files[0]);});
    fileInput.addEventListener("change",()=>{if(fileInput.files.length>0)handleFileSelect(fileInput.files[0]);});
}

async function handleFileSelect(file) {
    const ext=file.name.split(".").pop().toLowerCase();
    document.getElementById("fileNameBar").style.display="flex";
    document.getElementById("fileNameText").innerText=file.name+" ("+(file.size/1024).toFixed(1)+"KB)";
    let text="";
    try{
        if(ext==="txt"||ext==="csv"){text=await new Promise((r,j)=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.onerror=j;rd.readAsText(file,"UTF-8");});}
        else if(ext==="docx"){const ab=await new Promise((r,j)=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.onerror=j;rd.readAsArrayBuffer(file);});text=(await mammoth.extractRawText({arrayBuffer:ab})).value;}
        else{showToast("不支持的文件格式","error");return;}
    }catch(e){showToast("文件读取失败："+e.message,"error");return;}
    const lines=text.split(/[\r\n]+/).map(line=>ext==="csv"?line.split(",").map(s=>s.trim().toUpperCase()).filter(s=>s):[line.trim().toUpperCase()]).flat().filter(s=>s&&s.length>=3&&s.length<=20);
    if(lines.length===0){showToast("未找到有效呼号","warning");return;}
    pendingFileData=lines;document.getElementById("importCount").innerText=lines.length;document.getElementById("importPreview").style.display="flex";
    showToast("已解析 "+lines.length+" 个呼号","info");
}

function confirmImport() {
    if(!pendingFileData||pendingFileData.length===0)return;
    const mode=document.querySelector('input[name="importMode"]:checked').value;
    if(mode==="replace"){callList=[...pendingFileData];}else{const s=new Set(callList);pendingFileData.forEach(c=>{if(!s.has(c))callList.push(c);});}
    refreshUI();showToast("已导入 "+pendingFileData.length+" 个呼号","success");addLog("文件导入 "+pendingFileData.length+" 个呼号");cancelImport();
}
function cancelImport(){pendingFileData=null;document.getElementById("importPreview").style.display="none";document.getElementById("fileNameBar").style.display="none";document.getElementById("fileInput").value="";}

// ===================== Auth =====================
function showLoginModal(){document.getElementById("loginModal").classList.add("show");setTimeout(()=>document.getElementById("loginPwd").focus(),100);}
function closeLoginModal(){document.getElementById("loginModal").classList.remove("show");document.getElementById("loginPwd").value="";}

function saveToken(t,e){authToken=t;authExpiry=e;localStorage.setItem("admin_token",t);localStorage.setItem("admin_token_expires",String(e));}
function clearToken(){authToken=null;authExpiry=0;localStorage.removeItem("admin_token");localStorage.removeItem("admin_token_expires");}
function getStoredToken(){return localStorage.getItem("admin_token")||"";}
function getStoredExpiry(){return parseInt(localStorage.getItem("admin_token_expires")||"0");}

async function restoreSession() {
    const stored=getStoredToken(),expires=getStoredExpiry();
    if(!stored)return false;if(expires*1000<Date.now()){clearToken();return false;}
    try{const d=await(await fetch(api+"?action=verify_token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:stored})})).json();
    if(d.code===1){authToken=stored;authExpiry=expires;return true;}else{clearToken();return false;}}catch(e){return false;}
}

async function getAuthParams() {
    if(authToken&&authExpiry*1000>Date.now())return{token:authToken};
    const pwd=prompt("请输入管理员密码：");if(!pwd)return null;return{pwd:md5(pwd)};
}

function applyLoginUI() {
    isAdmin=true;document.getElementById("adminArea").style.display="block";
    document.getElementById("loginBtn").innerHTML='<i class="fas fa-check-circle"></i> 已登录';
    document.getElementById("loginBtn").classList.remove("btn-primary");document.getElementById("loginBtn").classList.add("btn-success");
    document.getElementById("loginBtn").disabled=true;
    document.getElementById("logoutBtn").style.display="inline-flex";
    var apb=document.getElementById("adminPageBtn");if(apb)apb.style.display="none";
    var cow=document.getElementById("collapseAllWrap");if(cow)cow.style.display="flex";
    document.getElementById("statusDot").classList.remove("offline");document.getElementById("statusDot").classList.add("online");
    document.getElementById("loginStatusText").innerText="管理员已登录";
    document.getElementById("adminContent").style.display="block"; // 显示内嵌管理内容
    loadAbout();
    loadBasicConfig();
    loadSstvConfig();
    loadFeatures();
    loadActivity();
    loadFeedback();
}

function logout() {
    if(!confirm("确定要退出登录吗？"))return;clearToken();isAdmin=false;
    document.getElementById("loginBtn").innerHTML='<i class="fas fa-sign-in-alt"></i> 管理员登录';
    document.getElementById("loginBtn").classList.remove("btn-success");document.getElementById("loginBtn").classList.add("btn-primary");
    document.getElementById("loginBtn").disabled=false;document.getElementById("logoutBtn").style.display="none";
    var apb=document.getElementById("adminPageBtn");if(apb)apb.style.display="none";
    document.getElementById("statusDot").classList.remove("online");document.getElementById("statusDot").classList.add("offline");
    document.getElementById("loginStatusText").innerText="未登录";document.getElementById("adminContent").style.display="none";
    showToast("已退出登录","info");addLog("管理员退出登录");
}

async function login() {
    const pwd=document.getElementById("loginPwd").value;if(!pwd){showToast("请输入密码","warning");return;}
    const loginBtn = document.querySelector('#loginModal .modal-btn.btn-primary');
    setBtnLoading(loginBtn, true);
    try{const d=await(await fetch(api+"?action=check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pwd:md5(pwd)})})).json();
    if(d.code==1&&d.token){saveToken(d.token,d.expires);applyLoginUI();closeLoginModal();showToast("登录成功","success");addLog("管理员登录成功");}
    else{showToast(d.msg||"密码错误","error");addLog("登录失败");}}catch(e){showToast("网络错误","error");}
    finally{setBtnLoading(loginBtn, false);}
}

// ===================== Query Toggle =====================
async function toggleQuery() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    const newState=!queryEnabled;const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=toggle",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,enabled:newState})})).json();
    if(d.code==1){queryEnabled=newState;refreshSwitch();showToast(newState?"查询通道已开启":"查询通道已关闭","success");addLog(newState?"开启查询通道":"关闭查询通道");}
    else{showToast(d.msg||"操作失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Notice Config =====================
async function saveNoticeConfig() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    const enable=document.getElementById("noticeEnable").checked?"1":"0",content=document.getElementById("noticeContent").value,mode=document.getElementById("noticeMode").value,delay=document.getElementById("noticeDelay").value;
    const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=save_notice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,enable,content,mode,delay})})).json();
    if(d.code===1){showToast("公告设置已保存","success");addLog("修改公告配置");}else{showToast(d.msg||"保存失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Cert Text =====================
async function saveCertText() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    const title=document.getElementById("cTitle").value,sub=document.getElementById("cSub").value,label=document.getElementById("cLabel").value,desc=document.getElementById("cDesc").value;
    // 获取当前自定义颜色
    const templates = currentCertData ? (currentCertData.templates || {}) : {};
    const tpl = templates[selectedTemplate];
    if (tpl) {
        tpl.borderColor = document.getElementById('tplBorderColor').value;
        tpl.titleColor = document.getElementById('tplTitleColor').value;
    }
    const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=save_cert",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,title,sub,label,desc,template:selectedTemplate,templates:templates})})).json();
    if(d.code===1){showToast("证书设置已保存","success");addLog("修改证书设置");await loadCertConfig();}else{showToast(d.msg||"保存失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Change Password =====================
async function changePwd() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    const old=document.getElementById("oldPwd").value,n1=document.getElementById("newPwd").value,n2=document.getElementById("newPwd2").value;
    if(!old||!n1||!n2){showToast("请填写所有密码字段","warning");return;}
    if(n1!==n2){showToast("两次新密码不一致","warning");return;}
    if(n1.length<6){showToast("新密码不能少于6位","warning");return;}
    try{const d=await(await fetch(api+"?action=changepwd",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:authToken,old:md5(old),new:md5(n1)})})).json();
    if(d.code===1){showToast("密码修改成功","success");document.getElementById("oldPwd").value="";document.getElementById("newPwd").value="";document.getElementById("newPwd2").value="";clearToken();isAdmin=false;
    document.getElementById("loginBtn").innerHTML='<i class="fas fa-sign-in-alt"></i> 管理员登录';document.getElementById("loginBtn").classList.remove("btn-success");document.getElementById("loginBtn").classList.add("btn-primary");
    document.getElementById("loginBtn").disabled=false;document.getElementById("logoutBtn").style.display="none";document.getElementById("statusDot").classList.remove("online");document.getElementById("statusDot").classList.add("offline");
    document.getElementById("loginStatusText").innerText="未登录";document.getElementById("adminContent").style.display="none";addLog("密码已修改");}
    else{showToast(d.msg||"修改失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Basic Config =====================
async function loadBasicConfig() {
    try{const d=await(await fetch(api+"?action=get_basic&_t="+Date.now())).json();
    if(d.code===1){const c=d.data;document.getElementById("certYear").value=c.certYear||"";document.getElementById("certMonth").value=c.certMonth||"";document.getElementById("certDay").value=c.certDay||"";document.getElementById("certPrefix").value=c.certPrefix||"FMO-";certPrefix=c.certPrefix||"FMO-";
    document.getElementById("certNumYear").value=c.certNumYear||"";document.getElementById("certNumMonth").value=c.certNumMonth||"";document.getElementById("certNumDay").value=c.certNumDay||"";
    document.getElementById("certNumYear").dispatchEvent(new Event("change"));
    var mcEl=document.getElementById("masterCallsigns");if(mcEl&&c.masterCallsigns!==undefined)mcEl.value=c.masterCallsigns||"";
    var vsEl=document.getElementById("voiceStyleSelect");if(vsEl)vsEl.value=localStorage.getItem("fmo_voice_style")||"female";
    }}catch(e){}
}

async function saveBasicConfig() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    const certYear=document.getElementById("certYear").value,certMonth=document.getElementById("certMonth").value,certDay=document.getElementById("certDay").value,prefix=document.getElementById("certPrefix").value.trim()||"FMO-";
    const certNumYear=document.getElementById("certNumYear").value,certNumMonth=document.getElementById("certNumMonth").value,certNumDay=document.getElementById("certNumDay").value;
    const masterCallsignsEl=document.getElementById("masterCallsigns");
    const masterCallsigns=masterCallsignsEl?masterCallsignsEl.value.trim():"";
    const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=save_basic&_t="+Date.now(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,certYear,certMonth,certDay,certPrefix:prefix,certNumYear,certNumMonth,certNumDay,masterCallsigns})})).json();
    if(d.code===1){certPrefix=prefix;showToast("基本设置已保存","success");addLog("修改基本设置");}else{showToast(d.msg||"保存失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Search =====================
function search() {
    if(!queryEnabled){showToast("查询通道已关闭","warning");return;}
    const v=document.getElementById("call").value.trim().toUpperCase();if(!v){showToast("请输入呼号","warning");return;}
    const i=callList.indexOf(v);if(i===-1){showToast("未找到该呼号","error");return;}
    currentCall=v;document.getElementById("showCall").innerText=v;document.getElementById("cert").style.display="block";
    const now=new Date(),ny=now.getFullYear(),nm=String(now.getMonth()+1).padStart(2,"0"),nd=String(now.getDate()).padStart(2,"0");
    const numYear=document.getElementById("certNumYear").value,numMonth=document.getElementById("certNumMonth").value,numDay=document.getElementById("certNumDay").value;
    const selY=document.getElementById("certYear").value,selM=document.getElementById("certMonth").value,selD=document.getElementById("certDay").value;
    let numDateStr;if(numYear&&numMonth&&numDay)numDateStr=numYear+numMonth+numDay;else if(selY&&selM&&selD)numDateStr=selY+selM+selD;else numDateStr=ny+nm+nd;
    const no=certPrefix+numDateStr+String(i+1).padStart(2,"0");document.getElementById("certNo").innerText="编号："+no;
    let displayDate;if(selY&&selM&&selD)displayDate=selY+"年"+parseInt(selM)+"月"+parseInt(selD)+"日";else displayDate=ny+"年"+(now.getMonth()+1)+"月"+now.getDate()+"日";
    document.getElementById("showDate").innerText=displayDate;
    const userInfo=document.getElementById("userInfo");userInfo.style.display="block";userInfo.innerHTML='<i class="fas fa-check-circle"></i> 序号：'+(i+1)+' | 呼号：'+safeText(v)+' | 证书号：'+safeText(no);
    addSearchHistory(v);addLog("查询呼号："+v);showToast("证书查询成功","success");showShareArea();
    fetch(api+"?action=record_query",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({callsign:v})}).catch(()=>{});
    recordCallHistory(v);
    // AI语音播报
    speakCertVoice(v, i+1, no);
    // 自动生成音频贺卡
    if(featuresConfig.audio_card_enabled==='1') generateAudioCard();
}

// ===================== Unlock =====================
function bindUnlockInput() {
    document.getElementById("call").addEventListener("input",async function(){
        const val=this.value.trim();if(val.length<5)return;
        try{const d=await(await fetch(api+"?action=unlock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:val})})).json();
        if(d.code===1){document.getElementById("adminArea").style.display="block";showToast("后台管理面板已解锁","success");addLog("暗号解锁后台");this.value="";
        setTimeout(()=>document.getElementById("adminArea").scrollIntoView({behavior:"smooth",block:"start"}),200);}}catch(e){}
    });
}

// ===================== Print Certificate =====================
function printCert() {
    const cert=document.getElementById("cert");
    if(cert.style.display==="none"||!currentCall){showToast("请先查询证书","warning");return;}
    // 克隆证书元素并获取其计算后的样式
    const clone=cert.cloneNode(true);
    clone.style.cssText="display:block!important;margin:0 auto!important;position:relative!important;width:400px!important;max-width:400px!important;";
    // 获取当前页面中所有样式表的内容
    let cssText='';
    for(const sheet of document.styleSheets){
        try{for(const rule of sheet.cssRules){cssText+=rule.cssText+'\n';}}catch(e){}
    }
    const printWin=window.open('','','width=650,height=900');
    printWin.document.write('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>FMO点名证书-'+safeText(currentCall)+'</title>');
    printWin.document.write('<link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">');
    printWin.document.write('<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&display=swap" rel="stylesheet">');
    printWin.document.write('<style>'+cssText+'</style>');
    printWin.document.write('<style>');
    printWin.document.write('*{margin:0;padding:0;box-sizing:border-box;}');
    printWin.document.write('body{background:#fff;display:flex;justify-content:center;align-items:flex-start;padding:30px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;}');
    printWin.document.write('.certificate{display:block!important;margin:0 auto!important;}');
    printWin.document.write('@media print{body{padding:20px;}}');
    printWin.document.write('</style></head><body>');
    printWin.document.write(clone.outerHTML);
    printWin.document.write('</body></html>');
    printWin.document.close();
    // 等待字体和资源加载后再打印
    printWin.onload=function(){setTimeout(function(){printWin.print();},800);};
    addLog("打印证书："+currentCall);
    showToast("正在打开打印窗口...","info");
}

// ===================== Log Export =====================
async function exportLog() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}
    const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=export_log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code===1){
        const blob=new Blob(['\uFEFF'+d.csv],{type:'text/csv;charset=utf-8;'});
        const link=document.createElement('a');
        link.href=URL.createObjectURL(blob);
        link.download='FMO访问日志_'+new Date().toISOString().slice(0,10)+'.csv';
        link.click();
        showToast("日志已导出，共"+d.count+"条","success");
        addLog("导出访问日志");
    }else{showToast(d.msg||"导出失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Download Certificate =====================
async function downloadCert() {
    const cert=document.getElementById("cert");if(cert.style.display==="none"||!currentCall){showToast("请先查询证书","warning");return;}
    showToast("正在生成证书图片...","info");
    try{const canvas=await html2canvas(cert,{scale:2,useCORS:true});const link=document.createElement("a");link.download="FMO点名证书_"+currentCall+".png";link.href=canvas.toDataURL("image/png");link.click();
    showToast("证书已保存","success");fetch(api+"?action=record_download",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({callsign:currentCall})}).catch(()=>{});
    speakText("台站"+currentCall+"下载了证书");}catch(e){showToast("证书生成失败","error");}
}

// ===================== Notice =====================
async function showNotice() {
    try{const d=await(await fetch(api+"?action=get_notice")).json();if(d.code!==1)return;const cfg=d.data;if(cfg.enable!=="1")return;
    if(cfg.mode==="daily"){const today=new Date().toDateString();if(localStorage.getItem("notice_last_date")===today)return;}
    setTimeout(()=>{document.getElementById("noticeContentView").innerText=cfg.content;document.getElementById("noticeModal").style.display="flex";},(parseInt(cfg.delay)||1)*1000);}catch(e){}
}
function closeNotice(){document.getElementById("noticeModal").style.display="none";if(document.getElementById("noShowToday").checked)localStorage.setItem("notice_last_date",new Date().toDateString());}

// ===================== Visit Log =====================
async function loadVisitLog() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=get_log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code!==1){showToast(d.msg||"加载失败","error");return;}
    const list=(d.list||[]).slice().reverse();
    if(list.length===0){document.getElementById("visitLogBox").innerText="暂无访问记录";return;}
    let str="";for(const item of list){const typ=item.type==="front"?"🔍 前端访问":item.type==="admin"?"⚙️ 后台操作":item.type;
    str+="["+item.time+"] "+typ+"\n  IP："+item.ip+"\n  归属地："+item.location+"\n  设备："+item.agent+"\n────────────────────────────────\n";}
    document.getElementById("visitLogBox").innerText=str;}catch(e){showToast("加载日志失败","error");}
}
async function clearVisitLog() {
    if(!isAdmin){showToast("请先登录管理员","warning");return;}const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=clear_log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code===1){showToast("日志已清空","success");document.getElementById("visitLogBox").innerText="暂无访问记录";}else{showToast(d.msg||"清空失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Check All =====================
function bindCheckAll(){var ca=document.getElementById("checkAll");if(ca)ca.onchange=function(){document.querySelectorAll(".list-check").forEach(i=>i.checked=this.checked);};}

// ===================== SSTV Module =====================
let sstvEnabled=false,sstvCurrentCategory="all";
const sstvModes=[
    {name:"Scottie S1",cat:"scottie",speed:"slow",lines:128,pixels:320,time:"118s",color:"4",bw:false,desc:"Scottie S1 是最常用的SSTV模式之一，传输时间约118秒。图像分辨率为320×128像素，采用RGB色彩编码。"},
    {name:"Scottie S2",cat:"scottie",speed:"medium",lines:128,pixels:320,time:"71s",color:"4",bw:false,desc:"Scottie S2 是Scottie S1的快速版本，传输时间约71秒。"},
    {name:"Scottie DX",cat:"scottie",speed:"slow",lines:256,pixels:320,time:"257s",color:"4",bw:false,desc:"Scottie DX 专为远距离通信设计，分辨率320×256。"},
    {name:"Martin M1",cat:"classic",speed:"slow",lines:128,pixels:320,time:"114s",color:"4",bw:false,desc:"Martin M1 传输时间约114秒，分辨率320×128像素。"},
    {name:"Martin M2",cat:"classic",speed:"medium",lines:128,pixels:320,time:"57s",color:"4",bw:false,desc:"Martin M2 是Martin M1的快速版本。"},
    {name:"Martin M4",cat:"classic",speed:"fast",lines:128,pixels:320,time:"29s",color:"4",bw:false,desc:"Martin M4 仅需29秒完成传输。"},
    {name:"Robot 24",cat:"robot",speed:"slow",lines:120,pixels:320,time:"73s",color:"4",bw:false,desc:"Robot 24 使用YUV色彩空间编码。"},
    {name:"Robot 36",cat:"robot",speed:"medium",lines:240,pixels:320,time:"73s",color:"4",bw:false,desc:"Robot 36 提供更高垂直分辨率320×240。"},
    {name:"Robot 72",cat:"robot",speed:"slow",lines:240,pixels:320,time:"146s",color:"4",bw:false,desc:"Robot 72 是Robot系列中质量最高的模式。"},
    {name:"PD-120",cat:"pd",speed:"slow",lines:496,pixels:640,time:"120s",color:"4",bw:false,desc:"PD-120 提供640×496高分辨率。"},
    {name:"PD-160",cat:"pd",speed:"medium",lines:400,pixels:512,time:"160s",color:"4",bw:false,desc:"PD-160 分辨率512×400。"},
    {name:"PD-180",cat:"pd",speed:"slow",lines:400,pixels:640,time:"180s",color:"4",bw:false,desc:"PD-180 提供640×400高分辨率。"},
    {name:"PD-240",cat:"pd",speed:"slow",lines:496,pixels:640,time:"240s",color:"4",bw:false,desc:"PD-240 使用更慢扫描速率。"},
    {name:"PD-290",cat:"pd",speed:"slow",lines:496,pixels:640,time:"290s",color:"4",bw:false,desc:"PD-290 是PD系列中最慢的模式。"},
    {name:"PD-50",cat:"pd",speed:"fast",lines:128,pixels:320,time:"50s",color:"4",bw:false,desc:"PD-50 仅需50秒，适合快速传输。"},
    {name:"PD-90",cat:"pd",speed:"medium",lines:256,pixels:640,time:"90s",color:"4",bw:false,desc:"PD-90 在分辨率和速度间平衡。"},
    {name:"Wraase SC-1",cat:"wraase",speed:"slow",lines:128,pixels:320,time:"100s",color:"4",bw:false,desc:"Wraase SC-1 采用RGB色彩编码。"},
    {name:"Wraase SC-2",cat:"wraase",speed:"medium",lines:128,pixels:320,time:"71s",color:"4",bw:false,desc:"Wraase SC-2 是SC-1的改进版本。"},
    {name:"Wraase SC-2-180",cat:"wraase",speed:"slow",lines:256,pixels:640,time:"180s",color:"4",bw:false,desc:"Wraase SC-2-180 提供640×256高分辨率。"},
    {name:"AVT 24",cat:"classic",speed:"slow",lines:120,pixels:320,time:"72s",color:"4",bw:false,desc:"AVT 24 类似Robot 24。"},
    {name:"AVT 90",cat:"classic",speed:"slow",lines:240,pixels:320,time:"171s",color:"4",bw:false,desc:"AVT 90 提供320×240分辨率。"},
    {name:"Fax480",cat:"classic",speed:"slow",lines:480,pixels:640,time:"480s",color:"1",bw:true,desc:"Fax480 高分辨率黑白模式640×480。"},
];

function renderSstvModes(category) {
    const grid=document.getElementById("sstvModeGrid");const filtered=category==="all"?sstvModes:sstvModes.filter(m=>m.cat===category);
    let html="";filtered.forEach(mode=>{const gi=sstvModes.indexOf(mode);const bc=mode.speed==="slow"?"slow":mode.speed==="fast"?"fast":"medium";const sl=mode.speed==="slow"?"慢速":mode.speed==="fast"?"快速":"中速";
    html+='<div class="sstv-mode-card" data-idx="'+gi+'" onclick="selectSstvMode('+gi+')"><div class="sstv-mode-name">'+safeText(mode.name)+'</div><div class="sstv-mode-info">'+mode.pixels+'×'+mode.lines+' · '+mode.time+'</div><div class="sstv-mode-badge '+bc+'">'+sl+'</div></div>';});
    grid.innerHTML=html||'<div class="list-empty" style="grid-column:1/-1;">该分类下暂无模式</div>';
    document.getElementById("sstvModeCount").innerText=filtered.length+" 种模式";
}

function filterSstvModes(cat){sstvCurrentCategory=cat;document.querySelectorAll(".sstv-cat-tab").forEach(t=>t.classList.remove("active"));event.target.classList.add("active");renderSstvModes(cat);
    document.getElementById("sstvDescPanel").innerHTML='<div class="sstv-mode-desc-title"><i class="fas fa-info-circle"></i> 选择一个模式查看详情</div><div class="sstv-mode-desc-text">点击下方模式卡片查看详情。</div>';}

function selectSstvMode(idx){const mode=sstvModes[idx];if(!mode)return;
    document.querySelectorAll(".sstv-mode-card").forEach(c=>c.classList.remove("selected"));const card=document.querySelector('.sstv-mode-card[data-idx="'+idx+'"]');if(card)card.classList.add("selected");
    const sel=document.getElementById("sstvFormMode");for(let i=0;i<sel.options.length;i++){if(sel.options[i].value===mode.name){sel.selectedIndex=i;break;}}
    const sl=mode.speed==="slow"?"慢速":mode.speed==="fast"?"快速":"中速",ct=mode.bw?"黑白":"彩色("+mode.color+"色)";
    document.getElementById("sstvDescPanel").innerHTML='<div class="sstv-mode-desc-title"><i class="fas fa-broadcast-tower"></i> '+safeText(mode.name)+'</div><div class="sstv-mode-desc-text">'+safeText(mode.desc)+'</div><div class="sstv-mode-specs"><div class="sstv-mode-spec"><strong>分辨率</strong>'+mode.pixels+'×'+mode.lines+'</div><div class="sstv-mode-spec"><strong>时间</strong>'+mode.time+'</div><div class="sstv-mode-spec"><strong>速度</strong>'+sl+'</div><div class="sstv-mode-spec"><strong>色彩</strong>'+ct+'</div></div>';
}

function populateSstvModeSelect(){const sel=document.getElementById("sstvFormMode");sstvModes.forEach(m=>{const o=document.createElement("option");o.value=m.name;o.textContent=m.name+" ("+m.time+")";sel.appendChild(o);});}
function toggleSstvPanel(){document.getElementById("sstvPanel").classList.toggle("open");}

async function loadSstvConfig(){try{const d=await(await fetch(api+"?action=get_sstv")).json();if(d.code===1){sstvEnabled=d.data.enable==="1";refreshSstvSwitch();}}catch(e){}}
function refreshSstvSwitch(){const t=document.getElementById("sstvEnableToggle"),l=document.getElementById("sstvEnableLabel"),p=document.getElementById("sstvPanel");
    if(sstvEnabled){t.classList.add("on");l.innerText="已开启";l.style.color="var(--success)";p.style.display="block";}else{t.classList.remove("on");l.innerText="已关闭";l.style.color="var(--text-secondary)";p.style.display="none";}}

async function toggleSstvEnable(){if(!isAdmin){showToast("请先登录管理员","warning");return;}const ns=!sstvEnabled;const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=save_sstv",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,enable:ns?"1":"0"})})).json();
    if(d.code===1){sstvEnabled=ns;refreshSstvSwitch();showToast(ns?"SSTV已开启":"SSTV已关闭","success");}else{showToast(d.msg||"操作失败","error");}}catch(e){showToast("网络错误","error");}}

async function saveSstvRecord(){const mode=document.getElementById("sstvFormMode").value,freq=document.getElementById("sstvFormFreq").value.trim(),call=document.getElementById("sstvFormCall").value.trim().toUpperCase(),note=document.getElementById("sstvFormNote").value.trim();
    if(!mode){showToast("请选择模式","warning");return;}if(!freq){showToast("请输入频率","warning");return;}
    try{const d=await(await fetch(api+"?action=save_sstv_record",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,frequency:freq,callsign:call,note})})).json();
    if(d.code===1){showToast("记录已保存","success");addLog("SSTV记录："+mode+" "+freq);document.getElementById("sstvFormFreq").value="";document.getElementById("sstvFormCall").value="";document.getElementById("sstvFormNote").value="";loadSstvHistory();}else{showToast(d.msg||"保存失败","error");}}catch(e){showToast("网络错误","error");}}

async function loadSstvHistory(){try{const d=await(await fetch(api+"?action=get_sstv_history")).json();if(d.code===1)renderSstvHistory(d.list||[]);}catch(e){showToast("加载失败","error");}}

function renderSstvHistory(list){const c=document.getElementById("sstvHistoryList"),ce=document.getElementById("sstvHistoryCount");ce.innerText=list.length;
    if(list.length===0){c.innerHTML='<div class="sstv-history-empty"><i class="fas fa-satellite-dish"></i>暂无接收记录</div>';return;}
    let h="";[...list].reverse().forEach(item=>{
        h+='<div class="sstv-history-item"><div class="sstv-history-mode">'+safeText(item.mode)+'</div><div class="sstv-history-info"><div class="sstv-history-freq">'+safeText(item.frequency)+'</div>';
        if(item.callsign)h+='<div class="sstv-history-callsign">'+safeText(item.callsign)+'</div>';
        if(item.note)h+='<div class="sstv-history-note">'+safeText(item.note)+'</div>';
        h+='</div><div class="sstv-history-time">'+safeText(item.time)+'</div><div class="sstv-history-actions"><button class="sstv-history-delete" onclick="deleteSstvRecord(\''+safeAttr(item.id)+'\')"><i class="fas fa-trash-alt"></i></button></div></div>';
    });c.innerHTML=h;}

async function deleteSstvRecord(id){try{const d=await(await fetch(api+"?action=delete_sstv_record",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})})).json();if(d.code===1){showToast("已删除","success");loadSstvHistory();}else{showToast(d.msg||"删除失败","error");}}catch(e){showToast("网络错误","error");}}

async function clearSstvHistory(){if(!isAdmin){showToast("请先登录管理员","warning");return;}if(!confirm("确定清空SSTV历史？"))return;const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=clear_sstv_history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code===1){showToast("已清空","success");loadSstvHistory();}else{showToast(d.msg||"失败","error");}}catch(e){showToast("网络错误","error");}}

// ===================== Stats =====================
async function loadStats(){if(!isAdmin){showToast("请先登录管理员","warning");return;}const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=get_stats",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code===1){const s=d.data;document.getElementById("statQueryCount").innerText=s.query_count||0;document.getElementById("statDownloadCount").innerText=s.download_count||0;
    const qb=document.getElementById("queryHistoryBox"),ql=(s.query_history||[]).slice().reverse();qb.innerText=ql.length===0?"暂无查询记录":ql.map(i=>"["+i.time+"] 呼号: "+i.callsign+"  IP: "+i.ip+"\n").join("");
    const db=document.getElementById("downloadHistoryBox"),dl=(s.download_history||[]).slice().reverse();db.innerText=dl.length===0?"暂无下载记录":dl.map(i=>"["+i.time+"] 呼号: "+i.callsign+"  IP: "+i.ip+"\n").join("");
    showToast("统计已刷新","info");}else{showToast(d.msg||"失败","error");}}catch(e){showToast("加载失败","error");}
}

async function clearStats(){if(!isAdmin){showToast("请先登录管理员","warning");return;}if(!confirm("确定清空统计数据？"))return;const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=clear_stats",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code===1){showToast("已清空","success");document.getElementById("statQueryCount").innerText="0";document.getElementById("statDownloadCount").innerText="0";addLog("清空统计数据");}else{showToast(d.msg||"失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Feature Switches =====================
let featuresConfig={verify_enabled:'1',honor_wall_enabled:'1',chart_enabled:'1'};
async function loadFeatures(){try{const d=await(await fetch(api+"?action=get_features")).json();if(d.code===1){featuresConfig=d.data;applyFeatureSwitches();}}catch(e){}}

function applyFeatureSwitches(){
    const types=['verify','honor_wall','chart','share','voice','monthly_rank','batch_export','webhook','audio_card','bigscreen','ecard'];
    types.forEach(t=>{const key=t+'_enabled',enabled=featuresConfig[key]==='1';const tog=document.getElementById(t+'Toggle'),lbl=document.getElementById(t+'Label');
    if(tog)tog.classList.toggle('on',enabled);if(lbl){lbl.innerText=enabled?'已开启':'已关闭';lbl.style.color=enabled?'var(--success)':'var(--text-secondary)';}});
    const whUrl=document.getElementById('webhookUrl'),whType=document.getElementById('webhookType');
    if(whUrl)whUrl.value=featuresConfig.webhook_url||'';if(whType)whType.value=featuresConfig.webhook_type||'wechat';
    var vc=document.getElementById('verifyCard');if(vc)vc.style.display=featuresConfig.verify_enabled==='1'?'block':'none';
    var hc=document.getElementById('honorWallCard');if(hc)hc.style.display=featuresConfig.honor_wall_enabled==='1'?'block':'none';
    var mc=document.getElementById('monthlyRankCard');if(mc)mc.style.display=featuresConfig.monthly_rank_enabled==='1'?'block':'none';
    var ac=document.getElementById('audioCardSection');if(ac)ac.style.display=featuresConfig.audio_card_enabled==='1'?'block':'none';
    var bl=document.getElementById('bigscreenLink');if(bl)bl.style.display=featuresConfig.bigscreen_enabled==='1'?'block':'none';
    var ec=document.getElementById('ecardSection');if(ec)ec.style.display=featuresConfig.ecard_enabled==='1'?'block':'none';
    if(featuresConfig.honor_wall_enabled==='1')loadHonorWall();if(featuresConfig.monthly_rank_enabled==='1')initMonthlyRank();
    // 地图和勋章系统跟随荣誉墙开关
    var cmc=document.getElementById('chinaMapCard');if(cmc)cmc.style.display=featuresConfig.honor_wall_enabled==='1'?'block':'none';
    var acc=document.getElementById('achievementCard');if(acc)acc.style.display=featuresConfig.honor_wall_enabled==='1'?'block':'none';
    if(featuresConfig.honor_wall_enabled==='1' && callList.length > 0) loadChinaMap();
}

function toggleFeature(name){if(!isAdmin){showToast("请先登录管理员","warning");return;}const key=name+'_enabled';featuresConfig[key]=featuresConfig[key]==='1'?'0':'1';applyFeatureSwitches();}

async function saveFeatures(){if(!isAdmin){showToast("请先登录管理员","warning");return;}const auth=await getAuthParams();if(!auth)return;
    const whUrl=document.getElementById('webhookUrl'),whType=document.getElementById('webhookType');
    if(whUrl)featuresConfig.webhook_url=whUrl.value.trim();if(whType)featuresConfig.webhook_type=whType.value;
    try{const d=await(await fetch(api+"?action=save_features",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,...featuresConfig})})).json();
    if(d.code===1){showToast("功能开关已保存","success");addLog("保存功能开关");}else{showToast(d.msg||"保存失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Webhook测试 =====================
async function testWebhook(){if(!isAdmin){showToast("请先登录管理员","warning");return;}const auth=await getAuthParams();if(!auth)return;
    const whUrl=document.getElementById('webhookUrl').value.trim(),whType=document.getElementById('webhookType').value;
    if(!whUrl){showToast("请先填写Webhook URL","warning");return;}
    featuresConfig.webhook_url=whUrl;featuresConfig.webhook_type=whType;
    try{await fetch(api+"?action=save_features",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,...featuresConfig})});
    const d=await(await fetch(api+"?action=test_webhook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code===1){showToast("测试消息已发送","success");addLog("Webhook测试成功");}else{showToast(d.msg||"发送失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Monthly Rank =====================
function initMonthlyRank(){const sel=document.getElementById('rankMonth');if(!sel)return;sel.innerHTML='';const now=new Date();
    for(let i=0;i<6;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const o=document.createElement('option');o.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');o.textContent=o.value;sel.appendChild(o);}loadMonthlyRank();}

async function loadMonthlyRank(){const sel=document.getElementById('rankMonth');const month=sel?sel.value:new Date().toISOString().substring(0,7);
    try{const d=await(await fetch(api+"?action=get_monthly_rank",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({month})})).json();
    const ld=document.getElementById('monthlyRankList');
    if(d.code!==1){ld.innerHTML='<div style="text-align:center;color:var(--text-secondary);padding:20px;">'+safeText(d.msg||'暂无数据')+'</div>';return;}
    if(d.data.length===0){ld.innerHTML='<div style="text-align:center;color:var(--text-secondary);padding:20px;">该月暂无数据</div>';return;}
    const mc=['#f59e0b','#94a3b8','#cd7f32'];let html='<div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;">';
    d.data.forEach(item=>{const medal=item.rank<=3?mc[item.rank-1]:'transparent';const icon=item.rank===1?'🥇':item.rank===2?'🥈':item.rank===3?'🥉':item.rank;
    html+='<div style="display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);gap:12px;"><div style="width:32px;text-align:center;font-size:'+(item.rank<=3?'20px':'14px')+';font-weight:700;color:'+medal+';">'+icon+'</div><div style="flex:1;font-weight:600;font-family:Consolas,monospace;font-size:14px;">'+safeText(item.callsign)+'</div><div style="font-size:12px;color:var(--text-secondary);">查询:'+item.queries+' 下载:'+item.downloads+'</div><div style="background:var(--primary);color:#fff;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;">'+item.total+'</div></div>';});
    html+='</div>';ld.innerHTML=html;}catch(e){document.getElementById('monthlyRankList').innerHTML='<div style="text-align:center;color:var(--danger);padding:20px;">加载失败</div>';}}

// ===================== Voice / AI语音播报 =====================
var voiceStyle = localStorage.getItem('fmo_voice_style') || 'female'; // male/female/broadcast

function speakText(text){
    try{
        if(!('speechSynthesis' in window))return;
        if((featuresConfig||{}).voice_enabled!=='1')return;
        speechSynthesis.cancel();
        const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=1.1;u.volume=0.8;
        u.onerror=function(e){console.warn('TTS error:',e.error);};
        speechSynthesis.speak(u);
    }catch(e){console.warn('Speech synthesis not supported:',e);}
}

function speakCertVoice(callsign, sequence, certNo) {
    var msg = "恭喜台站 " + splitCallsign(callsign) + "，成功参与湖北FMO中继例行点名活动，您的证书编号为 " + splitCertNo(certNo) + "，祝您通联愉快，73";
    // 实时读取语音风格设置（从select或localStorage）
    var style = voiceStyle;
    try { var sel = document.getElementById('voiceStyleSelect'); if (sel) style = sel.value; } catch(e) {}
    try {
        if (!('speechSynthesis' in window)) { fallbackVoice(msg); return; }
        if ((featuresConfig||{}).voice_enabled !== '1') return;
        speechSynthesis.cancel();
        function doSpeak() {
            var u = new SpeechSynthesisUtterance(msg);
            u.lang = 'zh-CN';
            if (style === 'male') { u.rate = 0.95; u.pitch = 0.8; u.volume = 1; }
            else if (style === 'broadcast') { u.rate = 0.85; u.pitch = 1.1; u.volume = 1; }
            else { u.rate = 1.0; u.pitch = 1.2; u.volume = 1; }
            var voices = speechSynthesis.getVoices();
            var zhVoice = null;
            for (var i = 0; i < voices.length; i++) {
                if (voices[i].lang.indexOf('zh') >= 0) { zhVoice = voices[i]; break; }
            }
            if (zhVoice) u.voice = zhVoice;
            u.onerror = function() { fallbackVoice(msg); };
            speechSynthesis.speak(u);
        }
        // 某些浏览器需要等待voices加载
        if (speechSynthesis.getVoices().length === 0) {
            speechSynthesis.onvoiceschanged = function() { doSpeak(); };
            setTimeout(doSpeak, 500);
        } else {
            setTimeout(doSpeak, 100);
        }
    } catch(e) { fallbackVoice(msg); }
}

function splitCallsign(call) {
    // 将呼号拆分为单个字母便于语音引擎朗读
    return call.split('').join(' ');
}

function splitCertNo(no) {
    // 将证书编号拆分便于朗读
    return no.replace(/-/g, ' ').split('').join(' ');
}

function fallbackVoice(text) {
    // Google TTS降级方案
    var url = "https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=" + encodeURIComponent(text);
    var audio = new Audio(url);
    audio.play().catch(function(){});
}

function setVoiceStyle(style) {
    voiceStyle = style;
    localStorage.setItem('fmo_voice_style', style);
    showToast("语音风格已切换为" + (style==='male'?'男声':style==='broadcast'?'电台播报':'女声'), "info");
}

// 获取主控呼号列表
function getMasterCallsigns() {
    try {
        var el = document.getElementById('masterCallsigns');
        if (el) {
            return el.value.split(',').map(function(s){ return s.trim().toUpperCase(); }).filter(function(s){ return s.length >= 3; });
        }
    } catch(e) {}
    return [];
}

function isMasterCallsign(call) {
    var masters = getMasterCallsigns();
    return masters.indexOf(call.toUpperCase()) >= 0;
}

// ===================== Certificate Verify =====================
async function verifyCert(){const certNo=document.getElementById("verifyInput").value.trim();if(!certNo){showToast("请输入证书编号","warning");return;}
    try{const d=await(await fetch(api+"?action=verify_cert",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cert_no:certNo})})).json();
    const rd=document.getElementById("verifyResult");rd.style.display="block";
    if(d.code===1){rd.innerHTML='<div style="background:var(--success-light);border:1px solid #86efac;padding:16px;border-radius:var(--radius-sm);"><div style="font-size:20px;font-weight:700;color:var(--success);margin-bottom:8px;">'+safeText(d.msg)+'</div><div style="font-size:14px;"><p><strong>证书编号：</strong>'+safeText(d.data.cert_no)+'</p><p><strong>呼号：</strong>'+safeText(d.data.callsign)+'</p><p><strong>序号：</strong>第'+d.data.sequence+'位</p><p><strong>发证日期：</strong>'+safeText(d.data.date)+'</p></div></div>';
    fetch(api+"?action=record_verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cert_no:certNo,callsign:d.data.callsign,result:'valid'})}).catch(()=>{});}
    else{rd.innerHTML='<div style="background:var(--danger-light);border:1px solid #fca5a5;padding:16px;border-radius:var(--radius-sm);"><div style="font-size:20px;font-weight:700;color:var(--danger);margin-bottom:8px;">'+safeText(d.msg)+'</div><div style="font-size:14px;">证书编号：'+safeText(certNo)+'</div></div>';
    fetch(api+"?action=record_verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cert_no:certNo,callsign:'',result:'invalid'})}).catch(()=>{});}}catch(e){showToast("验证失败","error");}
}

// ===================== Honor Wall =====================
async function loadHonorWall(){try{const d=await(await fetch(api+"?action=get_honor_wall")).json();
    if(d.code===1){const data=d.data;document.getElementById("honorTotalCalls").innerText=data.total_calls;document.getElementById("honorTotalQueries").innerText=data.total_queries;
    document.getElementById("honorTotalDownloads").innerText=data.total_downloads;document.getElementById("honorTodayQueries").innerText=data.today_queries;
    const ld=document.getElementById("honorCallsList");
    if(data.recent_calls.length===0){ld.innerHTML='<span style="color:var(--text-secondary);font-size:13px;">暂无活跃台站</span>';}
    else{ld.innerHTML=data.recent_calls.map(c=>'<span style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;font-family:Consolas,monospace;">'+safeText(c)+'</span>').join('');}}}catch(e){}}

// ===================== China Map Heatmap (功能二) =====================

// 呼号前缀 → 省份映射表（基于ITU分配给中国的呼号段）
var CALLSIGN_PROVINCE_MAP = {
    'BH': '湖北', 'BI': '湖北', 'BJ': '湖北',
    'BV': '台湾', 'BW': '台湾', 'BX': '台湾',
    'VR': '香港', 'VS': '香港',
    'XX': '澳门', 'CR': '澳门',
    'BA': '北京', 'BD': '北京', 'BE': '北京',
    'BY': '上海', 'BZ': '上海',
    'BT': '天津',
    'B3': '河北',
    'B4': '山西',
    'B6': '内蒙古',
    'B5': '辽宁',
    'B7': '吉林',
    'B8': '黑龙江',
    'B9': '江苏',
    'B2': '浙江',
    'B1': '安徽',
    'BA4': '福建',
    'BG4': '福建',
    'BG': '江西',
    'BA6': '山东',
    'BG6': '山东',
    'B4': '河南',
    'BA7': '湖南',
    'BG7': '湖南',
    'B8': '广东',
    'BR': '广东',
    'BS': '广东',
    'BT': '广西',
    'BU': '广西',
    'BV2': '海南',
    'BQ': '四川',
    'BQ9': '重庆',
    'BY6': '重庆',
    'BH8': '贵州',
    'BG8': '云南',
    'BY7': '西藏',
    'B9': '陕西',
    'BA9': '陕西',
    'BG9': '陕西',
    'B0': '甘肃',
    'BA8': '宁夏',
    'BG8': '新疆'
};

// 省份中心坐标（用于ECharts地图标注）
var PROVINCE_COORDS = {
    '湖北': [112.34, 30.55], '台湾': [121.51, 25.05], '香港': [114.17, 22.28],
    '澳门': [113.54, 22.20], '北京': [116.41, 39.90], '上海': [121.47, 31.23],
    '天津': [117.20, 39.08], '河北': [114.48, 38.03], '山西': [112.55, 37.87],
    '内蒙古': [111.75, 40.84], '辽宁': [123.43, 41.80], '吉林': [125.32, 43.90],
    '黑龙江': [126.66, 45.74], '江苏': [118.78, 32.06], '浙江': [120.15, 30.26],
    '安徽': [117.28, 31.86], '福建': [119.30, 26.08], '江西': [115.89, 28.68],
    '山东': [117.00, 36.67], '河南': [113.65, 34.76], '湖南': [112.94, 28.23],
    '广东': [113.26, 23.13], '广西': [108.33, 22.84], '海南': [110.35, 20.02],
    '四川': [104.07, 30.67], '重庆': [106.55, 29.56], '贵州': [106.71, 26.57],
    '云南': [102.71, 25.04], '西藏': [91.12, 29.65], '陕西': [108.95, 34.27],
    '甘肃': [103.83, 36.06], '宁夏': [106.27, 38.47], '青海': [101.78, 36.62],
    '新疆': [87.62, 43.79]
};

function resolveCallsignProvince(call) {
    call = call.toUpperCase().trim();
    // 尝试精确匹配前缀（如 BH6, BV2, VR2）
    for (var len = 3; len >= 2; len--) {
        var prefix = call.substring(0, len);
        if (CALLSIGN_PROVINCE_MAP[prefix]) return CALLSIGN_PROVINCE_MAP[prefix];
    }
    // 尝试2字母前缀
    var prefix2 = call.substring(0, 2);
    if (CALLSIGN_PROVINCE_MAP[prefix2]) return CALLSIGN_PROVINCE_MAP[prefix2];
    return null;
}

var chinaMapChart = null;
var chinaMapLoaded = false;

async function loadChinaMap() {
    var mapCard = document.getElementById('chinaMapCard');
    if (!mapCard) return;
    mapCard.style.display = 'block';
    
    // 加载中国地图GeoJSON（多CDN备选）
    if (!chinaMapLoaded) {
        var mapUrls = [
            'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
            'https://cdn.jsdelivr.net/npm/echarts@5.5.0/map/json/china.json',
            'https://unpkg.com/echarts@5.5.0/map/json/china.json'
        ];
        var loaded = false;
        for (var ui = 0; ui < mapUrls.length && !loaded; ui++) {
            try {
                var resp = await fetchWithTimeout(mapUrls[ui], 8000);
                if (!resp.ok) continue;
                var geoJson = await resp.json();
                if (geoJson && geoJson.features && geoJson.features.length > 0) {
                    echarts.registerMap('china', geoJson);
                    chinaMapLoaded = true;
                    loaded = true;
                }
            } catch(e) { /* try next CDN */ }
        }
        if (!loaded) {
            document.getElementById('chinaMapContainer').innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:40px;"><i class="fas fa-map-marked-alt" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.5;"></i><div style="font-weight:600;margin-bottom:8px;">地图数据加载失败</div><div style="font-size:12px;">请检查网络连接或刷新页面重试</div><button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="chinaMapLoaded=false;loadChinaMap();"><i class="fas fa-redo"></i> 重试加载</button></div>';
            return;
        }
    }
    
    // 统计各省份台站数
    var provinceData = {};
    var masterCalls = getMasterCallsigns();
    var masterSet = {};
    masterCalls.forEach(function(c) { masterSet[c] = true; });
    
    callList.forEach(function(call) {
        var province = resolveCallsignProvince(call);
        if (province) {
            if (!provinceData[province]) provinceData[province] = { count: 0, calls: [], hasMaster: false };
            provinceData[province].count++;
            provinceData[province].calls.push(call);
            if (masterSet[call]) provinceData[province].hasMaster = true;
        }
    });
    
    // 构建ECharts数据
    var mapData = [];
    var scatterData = [];
    for (var province in provinceData) {
        var pd = provinceData[province];
        mapData.push({ name: province, value: pd.count });
        var coord = PROVINCE_COORDS[province];
        if (coord) {
            scatterData.push({
                name: province,
                value: [coord[0], coord[1], pd.count],
                calls: pd.calls,
                hasMaster: pd.hasMaster
            });
        }
    }
    
    // 初始化ECharts
    var container = document.getElementById('chinaMapContainer');
    if (!container) return;
    chinaMapChart = echarts.init(container);
    
    var option = {
        backgroundColor: 'transparent',
        title: { show: false },
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                if (params.seriesType === 'scatter') {
                    var calls = params.data.calls || [];
                    var masterFlag = params.data.hasMaster ? ' ⭐' : '';
                    return '<b>' + params.name + masterFlag + '</b><br/>台站数：<b>' + params.data.value[2] + '</b><br/>呼号：' + calls.slice(0, 10).join(', ') + (calls.length > 10 ? '...' : '');
                }
                return params.name + '：' + (params.value || 0) + ' 个台站';
            }
        },
        visualMap: {
            min: 0,
            max: Math.max(10, Math.max.apply(null, mapData.map(function(d) { return d.value; }))),
            left: 'left',
            top: 'bottom',
            text: ['多', '少'],
            textStyle: { color: '#94a3b8' },
            inRange: { color: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a5f'] },
            calculable: true
        },
        geo: {
            map: 'china',
            roam: true,
            zoom: 1.2,
            label: { show: false },
            itemStyle: {
                areaColor: '#1e293b',
                borderColor: '#334155',
                borderWidth: 1
            },
            emphasis: {
                label: { show: true, color: '#fff', fontSize: 12 },
                itemStyle: { areaColor: '#2563eb' }
            }
        },
        series: [
            {
                name: '台站分布',
                type: 'map',
                geoIndex: 0,
                data: mapData
            },
            {
                name: '台站标注',
                type: 'scatter',
                coordinateSystem: 'geo',
                data: scatterData,
                symbolSize: function(val) { return Math.max(8, Math.min(30, val[2] * 5 + 8)); },
                itemStyle: {
                    color: function(params) {
                        return params.data.hasMaster ? '#f59e0b' : '#3b82f6';
                    },
                    shadowBlur: function(params) {
                        return params.data.hasMaster ? 15 : 5;
                    },
                    shadowColor: function(params) {
                        return params.data.hasMaster ? 'rgba(245,158,11,0.6)' : 'rgba(59,130,246,0.4)';
                    }
                },
                label: {
                    show: true,
                    formatter: '{b}',
                    position: 'right',
                    color: '#e2e8f0',
                    fontSize: 11
                }
            }
        ]
    };
    
    chinaMapChart.setOption(option);
    
    // 窗口大小变化时重绘
    window.addEventListener('resize', function() {
        if (chinaMapChart) chinaMapChart.resize();
    });
}

// ===================== Achievement System (功能三) =====================

var ACHIEVEMENT_DEFINITIONS = [
    { id: 'first', name: '首次参与', icon: '🏅', desc: '第一次参与点名活动', color: '#2563eb', check: function(stats) { return stats.queryCount >= 1; } },
    { id: 'streak3', name: '连续3期', icon: '🔥', desc: '连续参与3期不缺席', color: '#ef4444', check: function(stats) { return stats.streak >= 3; } },
    { id: 'streak5', name: '连续5期', icon: '🔥🔥', desc: '连续参与5期不缺席', color: '#dc2626', check: function(stats) { return stats.streak >= 5; } },
    { id: 'streak10', name: '连续10期', icon: '🔥🔥🔥', desc: '连续参与10期不缺席', color: '#991b1b', check: function(stats) { return stats.streak >= 10; } },
    { id: 'early', name: '早期参与', icon: '⚡', desc: '查询序号在前10名', color: '#f59e0b', check: function(stats) { return stats.sequence <= 10; } },
    { id: 'share10', name: '分享达人', icon: '📤', desc: '分享链接被查看超10次', color: '#8b5cf6', check: function(stats) { return stats.shareViews >= 10; } },
    { id: 'collector', name: '收藏家', icon: '🏆', desc: '查询次数超过5次', color: '#0d9488', check: function(stats) { return stats.queryCount >= 5; } },
    { id: 'veteran', name: '老台站', icon: '🎖️', desc: '查询次数超过20次', color: '#7c3aed', check: function(stats) { return stats.queryCount >= 20; } }
];

function getCallLevel(queryCount) {
    if (queryCount >= 50) return { name: '钻石', color: '#06b6d4', icon: '💎' };
    if (queryCount >= 20) return { name: '金牌', color: '#f59e0b', icon: '🥇' };
    if (queryCount >= 10) return { name: '银牌', color: '#94a3b8', icon: '🥈' };
    if (queryCount >= 3) return { name: '铜牌', color: '#cd7f32', icon: '🥉' };
    return { name: '新手', color: '#64748b', icon: '🌱' };
}

function getCallStats(callsign) {
    callsign = callsign.toUpperCase();
    var stats = {
        queryCount: 0,
        downloadCount: 0,
        firstDate: '',
        sequence: 999,
        streak: 0,
        shareViews: 0,
        isMaster: isMasterCallsign(callsign)
    };
    
    // 从callList获取序号
    var idx = callList.indexOf(callsign);
    if (idx >= 0) stats.sequence = idx + 1;
    
    // 从统计历史获取查询/下载次数
    // 使用当前会话可用的数据
    try {
        var statsEl = document.getElementById('statQueryCount');
        // 这些数据需要从API获取，这里使用前端可获取的信息
    } catch(e) {}
    
    // 模拟查询次数（基于sessionStorage中的记录）
    var historyKey = 'fmo_call_history_' + callsign;
    var history = [];
    try { history = JSON.parse(sessionStorage.getItem(historyKey)) || []; } catch(e) {}
    stats.queryCount = history.length;
    if (history.length > 0) stats.firstDate = history[0];
    
    return stats;
}

function showAchievements() {
    var call = document.getElementById('achievementInput').value.trim().toUpperCase();
    if (!call) { showToast("请输入呼号", "warning"); return; }
    if (callList.indexOf(call) === -1) { showToast("未找到该呼号", "error"); return; }
    
    var stats = getCallStats(call);
    var level = getCallLevel(stats.queryCount);
    var achievements = ACHIEVEMENT_DEFINITIONS.filter(function(a) { return a.check(stats); });
    
    var html = '';
    
    // 等级卡片
    html += '<div style="background:linear-gradient(135deg,' + level.color + ',' + level.color + 'cc);color:#fff;padding:20px;border-radius:var(--radius);margin-bottom:16px;text-align:center;">';
    html += '<div style="font-size:48px;margin-bottom:8px;">' + level.icon + '</div>';
    html += '<div style="font-size:24px;font-weight:800;">' + safeText(call) + '</div>';
    html += '<div style="font-size:16px;opacity:0.9;margin-top:4px;">' + level.name + ' 台站</div>';
    if (stats.isMaster) html += '<div style="margin-top:8px;background:rgba(255,255,255,0.2);display:inline-block;padding:4px 16px;border-radius:20px;font-size:12px;">⭐ 主控台站</div>';
    html += '</div>';
    
    // 统计数据
    html += '<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">';
    html += '<div style="flex:1;min-width:100px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:var(--primary);">' + stats.queryCount + '</div><div style="font-size:11px;color:var(--text-secondary);">查询次数</div></div>';
    html += '<div style="flex:1;min-width:100px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#f59e0b;">' + stats.sequence + '</div><div style="font-size:11px;color:var(--text-secondary);">参与序号</div></div>';
    html += '<div style="flex:1;min-width:100px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#8b5cf6;">' + achievements.length + '</div><div style="font-size:11px;color:var(--text-secondary);">勋章数</div></div>';
    html += '</div>';
    
    // 勋章展示
    html += '<div style="font-weight:600;margin-bottom:10px;font-size:14px;"><i class="fas fa-medal" style="color:#f59e0b;margin-right:6px;"></i>已获得勋章</div>';
    if (achievements.length === 0) {
        html += '<div style="text-align:center;color:var(--text-secondary);padding:20px;">暂无勋章，继续努力！</div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">';
        achievements.forEach(function(a) {
            html += '<div style="background:#f8fafc;border:2px solid ' + a.color + ';border-radius:var(--radius-sm);padding:14px;text-align:center;position:relative;overflow:hidden;">';
            html += '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:' + a.color + ';"></div>';
            html += '<div style="font-size:28px;margin-bottom:6px;">' + a.icon + '</div>';
            html += '<div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:2px;">' + safeText(a.name) + '</div>';
            html += '<div style="font-size:11px;color:var(--text-secondary);">' + safeText(a.desc) + '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    
    // 未获得勋章
    var locked = ACHIEVEMENT_DEFINITIONS.filter(function(a) { return !a.check(stats); });
    if (locked.length > 0) {
        html += '<div style="font-weight:600;margin:16px 0 10px;font-size:14px;"><i class="fas fa-lock" style="color:var(--text-secondary);margin-right:6px;"></i>待解锁勋章</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">';
        locked.forEach(function(a) {
            html += '<div style="background:#f1f5f9;border:1px dashed var(--border);border-radius:var(--radius-sm);padding:14px;text-align:center;opacity:0.6;">';
            html += '<div style="font-size:28px;margin-bottom:6px;filter:grayscale(1);">' + a.icon + '</div>';
            html += '<div style="font-weight:700;font-size:13px;color:var(--text-secondary);">' + safeText(a.name) + '</div>';
            html += '<div style="font-size:11px;color:#94a3b8;">' + safeText(a.desc) + '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    
    document.getElementById('achievementContent').innerHTML = html;
    showToast("勋章信息已加载", "info");
}

// 在search函数中记录查询历史
var _originalSearch = typeof search === 'function' ? search : null;

// 记录查询到sessionStorage
function recordCallHistory(callsign) {
    var key = 'fmo_call_history_' + callsign.toUpperCase();
    var history = [];
    try { history = JSON.parse(sessionStorage.getItem(key)) || []; } catch(e) {}
    var today = new Date().toISOString().slice(0, 10);
    if (history.indexOf(today) === -1) {
        history.push(today);
        sessionStorage.setItem(key, JSON.stringify(history));
    }
}

// ===================== Trend Chart =====================
let chartDays=7;
async function loadTrendChart(){if(!isAdmin)return;const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=get_stats_trend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,days:chartDays})})).json();
    if(d.code===1)drawChart(d.data);}catch(e){}}

function drawChart(data){const canvas=document.getElementById("trendCanvas");if(!canvas)return;const ctx=canvas.getContext("2d");
    const W=canvas.width=canvas.parentElement.clientWidth,H=canvas.height=220;ctx.clearRect(0,0,W,H);if(data.length===0)return;
    const p={top:20,right:20,bottom:40,left:50},cW=W-p.left-p.right,cH=H-p.top-p.bottom;
    const maxV=Math.max(1,...data.map(d=>Math.max(d.query,d.download,d.verify))),sX=cW/(data.length-1||1);
    ctx.strokeStyle='#e2e8f0';ctx.lineWidth=1;for(let i=0;i<=5;i++){const y=p.top+(cH/5)*i;ctx.beginPath();ctx.moveTo(p.left,y);ctx.lineTo(W-p.right,y);ctx.stroke();ctx.fillStyle='#94a3b8';ctx.font='11px sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(maxV*(1-i/5)),p.left-8,y+4);}
    ctx.fillStyle='#94a3b8';ctx.font='11px sans-serif';ctx.textAlign='center';data.forEach((item,i)=>{ctx.fillText(item.date.substring(5),p.left+i*sX,H-p.bottom+20);});
    function drawLine(v,c){ctx.strokeStyle=c;ctx.lineWidth=2.5;ctx.beginPath();v.forEach((val,i)=>{const x=p.left+i*sX,y=p.top+cH*(1-val/maxV);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.stroke();v.forEach((val,i)=>{const x=p.left+i*sX,y=p.top+cH*(1-val/maxV);ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();});}
    drawLine(data.map(d=>d.query),'#2563eb');drawLine(data.map(d=>d.download),'#f59e0b');drawLine(data.map(d=>d.verify),'#16a34a');
    [{l:'查询',c:'#2563eb'},{l:'下载',c:'#f59e0b'},{l:'验证',c:'#16a34a'}].forEach((leg,i)=>{const lx=p.left+i*70;ctx.fillStyle=leg.c;ctx.fillRect(lx,2,14,10);ctx.fillStyle='#475569';ctx.font='12px sans-serif';ctx.textAlign='left';ctx.fillText(leg.l,lx+18,12);});
}

// ===================== WeChat Detection =====================
function isWechatBrowser(){return /MicroMessenger/i.test(navigator.userAgent);}

// ===================== Share Link =====================
const SHARE_BASE_URL='https://www.bh6rgq.v6.navy';
function getShareBaseUrl(){return window.location.protocol==='https:'?window.location.origin+window.location.pathname:SHARE_BASE_URL;}

async function createShareLink(){if(!currentCall){showToast("请先查询证书","warning");return;}
    const expiry=parseInt(document.getElementById("shareExpiry").value);
    try{const d=await(await fetch(api+"?action=create_share",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({callsign:currentCall,expires_in:expiry})})).json();
    if(d.code===1){const url=getShareBaseUrl()+'?share='+d.token;
    document.getElementById("shareLinkInput").value=url;document.getElementById("shareLinkBox").style.display="block";
    if(isWechatBrowser()){document.getElementById("wechatTip").style.display="block";document.getElementById("normalTip").style.display="none";document.getElementById("wechatLinkText").innerText=url;
    const qb=document.getElementById("qrcodeBox");qb.innerHTML='';try{const qr=qrcode(0,'M');qr.addData(url);qr.make();qb.innerHTML=qr.createSvgTag(5,0);const svg=qb.querySelector('svg');if(svg){svg.style.width='160px';svg.style.height='160px';}}catch(e){qb.innerHTML='<div style="font-size:12px;">二维码生成失败</div>';}}
    else{document.getElementById("wechatTip").style.display="none";document.getElementById("normalTip").style.display="block";}
    showToast("分享链接已生成","success");addLog("生成分享链接："+currentCall);}else{showToast(d.msg||"失败","error");}}catch(e){showToast("网络错误","error");}
}

function copyShareLink(){const inp=document.getElementById("shareLinkInput");if(!inp.value)return;
    navigator.clipboard.writeText(inp.value).then(()=>showToast("已复制","success")).catch(()=>{inp.select();document.execCommand("copy");showToast("已复制","success");});}

// ===================== Share Page =====================
function encodeShareUrl(url){try{return btoa(encodeURIComponent(url));}catch(e){return'';}}
function decodeShareUrl(enc){try{return decodeURIComponent(atob(enc));}catch(e){return'';}}

async function handleSharePage(){const params=new URLSearchParams(window.location.search);const token=params.get('share');if(!token)return false;
    if(isWechatBrowser()&&window.location.port&&window.location.port!=='80'&&window.location.port!=='443'){const rk='share_retry_'+token;if(!sessionStorage.getItem(rk)){sessionStorage.setItem(rk,'1');try{window.location.assign(window.location.href);}catch(e){}}}
    try{const d=await(await fetch(api+"?action=get_share",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})})).json();
    const card=document.getElementById("shareViewCard"),content=document.getElementById("shareViewContent");card.style.display="block";
    if(d.code===1){content.innerHTML='<div style="background:var(--success-light);border:1px solid #86efac;padding:20px;border-radius:var(--radius-sm);margin-bottom:14px;"><div style="font-size:24px;font-weight:800;color:var(--primary);margin-bottom:8px;">'+safeText(d.callsign)+'</div><div style="font-size:13px;color:var(--text-secondary);">该台站已成功参与湖北FMO中继点名活动</div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">分享时间：'+safeText(d.created)+'</div></div><p style="font-size:13px;color:var(--text-secondary);">可访问 <a href="'+window.location.origin+window.location.pathname+'" style="color:var(--primary);">证书查询系统</a> 查询完整证书</p>';}
    else{content.innerHTML='<div style="background:var(--danger-light);border:1px solid #fca5a5;padding:20px;border-radius:var(--radius-sm);"><div style="font-size:20px;font-weight:700;color:var(--danger);margin-bottom:8px;">'+safeText(d.msg||'链接无效')+'</div><div style="font-size:14px;">分享链接可能已过期</div></div>';}return true;}catch(e){return false;}}

// ===================== Batch Export =====================
async function batchExport(){if(!isAdmin){showToast("请先登录管理员","warning");return;}
    let checks=document.querySelectorAll(".export-check:checked");if(checks.length===0)checks=document.querySelectorAll(".list-check:checked");
    let selectedCalls=[];if(checks.length>0){selectedCalls=Array.from(checks).map(c=>callList[parseInt(c.dataset.idx)]);}
    else{if(callList.length===0){showToast("名单为空","warning");return;}if(!confirm("导出全部 "+callList.length+" 个证书？"))return;selectedCalls=[...callList];}
    if(selectedCalls.length===0){showToast("请选择呼号","warning");return;}
    showToast("正在准备 "+selectedCalls.length+" 个证书...","info");const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=batch_export",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,callsigns:selectedCalls})})).json();
    if(d.code!==1){showToast(d.msg||"导出失败","error");return;}
    showToast("正在生成 "+d.count+" 个证书...","info");
    const container=document.createElement("div");container.style.cssText="position:fixed;left:-9999px;top:0;z-index:-1;";document.body.appendChild(container);
    let sc=0;for(let i=0;i<d.data.length;i++){const cd=d.data[i];const ce=document.createElement("div");ce.className="certificate";ce.style.cssText="display:block;margin:0;position:relative;width:400px;height:560px;";
    ce.innerHTML='<div class="security-bg"></div><div class="cert-no">编号：'+safeText(cd.cert_no)+'</div><div class="cert-title">'+safeText(cd.title)+'</div><div class="cert-subtitle">'+safeText(cd.sub)+'</div><div class="cert-label">'+safeText(cd.label)+'</div><div class="cert-call">'+safeText(cd.callsign)+'</div><div class="cert-desc">'+safeText(cd.desc||'').replace(/\n/g,'<br>')+'</div><div class="date" style="position:absolute;right:20px;bottom:68px;font-size:14px;">'+safeText(cd.date)+'</div><div class="sign">BH6RGQ</div>';
    container.appendChild(ce);try{const canvas=await html2canvas(ce,{scale:2,useCORS:true});const link=document.createElement("a");link.download="FMO证书_"+cd.callsign+".png";link.href=canvas.toDataURL("image/png");link.click();sc++;}catch(err){console.error(err);}ce.remove();await new Promise(r=>setTimeout(r,500));}
    container.remove();showToast("导出完成："+sc+"/"+d.data.length,"success");addLog("批量导出 "+sc+" 个证书");}catch(e){showToast("导出失败","error");}
}

async function batchExportAll(){if(!isAdmin){showToast("请先登录管理员","warning");return;}if(callList.length===0){showToast("名单为空","warning");return;}
    if(!confirm("导出全部 "+callList.length+" 个证书？"))return;
    showToast("正在准备...","info");const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=batch_export",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,callsigns:callList})})).json();
    if(d.code!==1){showToast(d.msg||"失败","error");return;}
    showToast("正在生成 "+d.count+" 个证书...","info");
    const container=document.createElement("div");container.style.cssText="position:fixed;left:-9999px;top:0;z-index:-1;";document.body.appendChild(container);let sc=0;
    for(let i=0;i<d.data.length;i++){const cd=d.data[i];const ce=document.createElement("div");ce.className="certificate";ce.style.cssText="display:block;margin:0;position:relative;width:400px;height:560px;";
    ce.innerHTML='<div class="security-bg"></div><div class="cert-no">编号：'+safeText(cd.cert_no)+'</div><div class="cert-title">'+safeText(cd.title)+'</div><div class="cert-subtitle">'+safeText(cd.sub)+'</div><div class="cert-label">'+safeText(cd.label)+'</div><div class="cert-call">'+safeText(cd.callsign)+'</div><div class="cert-desc">'+safeText(cd.desc||'').replace(/\n/g,'<br>')+'</div><div class="date" style="position:absolute;right:20px;bottom:68px;font-size:14px;">'+safeText(cd.date)+'</div><div class="sign">BH6RGQ</div>';
    container.appendChild(ce);try{const canvas=await html2canvas(ce,{scale:2,useCORS:true});const link=document.createElement("a");link.download="FMO证书_"+cd.callsign+".png";link.href=canvas.toDataURL("image/png");link.click();sc++;}catch(err){console.error(err);}ce.remove();await new Promise(r=>setTimeout(r,500));}
    container.remove();showToast("导出完成："+sc+"/"+d.data.length,"success");addLog("批量导出全部 "+sc+" 个证书");}catch(e){showToast("导出失败","error");}
}

// ===================== Search History =====================
const SEARCH_HISTORY_KEY = 'fmo_search_history';
const MAX_SEARCH_HISTORY = 8;

function getSearchHistory() {
    try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || []; } catch(e) { return []; }
}
function addSearchHistory(callsign) {
    let history = getSearchHistory();
    history = history.filter(c => c !== callsign);
    history.unshift(callsign);
    if (history.length > MAX_SEARCH_HISTORY) history = history.slice(0, MAX_SEARCH_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}
function renderSearchHistory() {
    const history = getSearchHistory();
    if (history.length === 0) return;
    const box = document.getElementById('suggestionsBox'), list = document.getElementById('suggestionsList');
    let html = '<div style="padding:8px 14px;font-size:11px;color:var(--text-secondary);font-weight:600;border-bottom:1px solid #e2e8f0;background:#f8fafc;">最近查询</div>';
    history.forEach(c => {
        html += '<div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-family:Consolas,monospace;font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;" onmousedown="selectSuggestion(\''+safeAttr(c)+'\')"><i class="fas fa-history" style="color:var(--text-secondary);font-size:11px;"></i>'+safeText(c)+'</div>';
    });
    list.innerHTML = html;
    box.style.display = 'block';
}

// ===================== Search Autocomplete (Fuzzy) =====================
async function onSearchInput(val){const keyword=val.trim().toUpperCase();const box=document.getElementById('suggestionsBox'),list=document.getElementById('suggestionsList');
    if(keyword.length<1){renderSearchHistory();return;}
    // 前缀匹配优先，再模糊匹配
    const prefixMatch=callList.filter(c=>c.startsWith(keyword)).slice(0,8);
    const fuzzyMatch=callList.filter(c=>!c.startsWith(keyword)&&c.includes(keyword)).slice(0,8-Math.min(prefixMatch.length,5));
    const m=[...prefixMatch,...fuzzyMatch].slice(0,8);
    if(m.length>0){
        list.innerHTML=m.map(c=>{
            const highlighted=c.replace(new RegExp('('+keyword.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<strong style="color:var(--primary);">$1</strong>');
            return '<div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-family:Consolas,monospace;font-size:14px;font-weight:500;" onmousedown="selectSuggestion(\''+safeAttr(c)+'\')">'+highlighted+'</div>';
        }).join('');
        box.style.display='block';
    }else{box.style.display='none';}}
function selectSuggestion(val){document.getElementById('call').value=val;hideSuggestions();}
function hideSuggestions(){document.getElementById('suggestionsBox').style.display='none';}

// ===================== Backup/Restore =====================
async function backupData(){if(!isAdmin){showToast("请先登录管理员","warning");return;}const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=backup_data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code===1){showToast("备份已生成："+d.file,"success");addLog("一键备份："+d.file);loadBackupList();}else{showToast(d.msg||"失败","error");}}catch(e){showToast("网络错误","error");}
}
async function loadBackupList(){if(!isAdmin)return;const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=list_backups",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    const box=document.getElementById('backupList');
    if(d.code!==1||!d.list||d.list.length===0){box.innerHTML='<div style="color:var(--text-secondary);font-size:13px;">暂无备份</div>';return;}
    let html='<div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;">';
    d.list.forEach(b=>{html+='<div style="display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid #f1f5f9;gap:10px;"><div style="flex:1;font-size:13px;"><div style="font-weight:600;font-family:Consolas,monospace;">'+safeText(b.file)+'</div><div style="font-size:12px;color:var(--text-secondary);">'+safeText(b.time)+' · '+(b.size/1024).toFixed(1)+'KB</div></div><button class="btn btn-success btn-sm" onclick="restoreBackup(\''+safeAttr(b.file)+'\')"><i class="fas fa-undo"></i> 恢复</button><button class="btn btn-secondary btn-sm" onclick="downloadBackup(\''+safeAttr(b.file)+'\')"><i class="fas fa-download"></i> 下载</button></div>';});
    html+='</div>';box.innerHTML=html;}catch(e){document.getElementById('backupList').innerHTML='<div style="color:var(--danger);">加载失败</div>';}
}
async function restoreBackup(file){if(!confirm("确定恢复 "+file+"？当前数据将被覆盖！"))return;const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=restore_backup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,file})})).json();
    if(d.code===1){showToast("已恢复，页面将刷新","success");setTimeout(()=>location.reload(),1500);}else{showToast(d.msg||"失败","error");}}catch(e){showToast("网络错误","error");}
}
async function downloadBackup(file){const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=download_backup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...auth,file})})).json();
    if(d.code===1){const b=new Blob([d.content],{type:'application/json'});const l=document.createElement('a');l.href=URL.createObjectURL(b);l.download=file;l.click();showToast("已下载","success");}else{showToast(d.msg||"失败","error");}}catch(e){showToast("网络错误","error");}
}

// ===================== Certificate Preview =====================
function previewCert(){const pc=document.getElementById('previewCall').value.trim().toUpperCase();if(!pc){showToast("请输入测试呼号","warning");return;}
    const title=document.getElementById('cTitle').value||'点名参与证书',sub=document.getElementById('cSub').value||'湖北FMO中继节点',label=document.getElementById('cLabel').value||'兹证明',desc=document.getElementById('cDesc').value||'';
    const now=new Date(),dd=now.getFullYear()+"年"+(now.getMonth()+1)+"月"+now.getDate()+"日",no=certPrefix+now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+'01';
    // 获取模板颜色
    let borderColor='#8b0000',titleColor='#8b0000',signColor='#1a1a6c';
    const tpl=document.getElementById('tplBorderColor').value;
    const ttl=document.getElementById('tplTitleColor').value;
    if(tpl)borderColor=tpl;if(ttl)titleColor=ttl;
    if(currentCertData&&currentCertData.templates&&currentCertData.templates[selectedTemplate]){
        signColor=currentCertData.templates[selectedTemplate].signColor||signColor;
    }
    const pc2=document.getElementById('previewCertContainer');
    pc2.innerHTML='<div class="certificate" style="display:block;margin:0 auto;border-color:'+borderColor+';"><div class="security-bg"></div><div class="cert-no">编号：'+safeText(no)+'</div><div class="cert-title" style="color:'+titleColor+';">'+safeText(title)+'</div><div class="cert-subtitle">'+safeText(sub)+'</div><div class="cert-label">'+safeText(label)+'</div><div class="cert-call">'+safeText(pc)+'</div><div class="cert-desc">'+safeText(desc).replace(/\n/g,'<br>')+'</div><div class="date" style="position:absolute;right:20px;bottom:68px;font-size:14px;">'+safeText(dd)+'</div><div class="sign" style="color:'+signColor+';">BH6RGQ</div></div>';
    showToast("预览已生成","info");}

function showShareArea(){const sa=document.getElementById("shareArea");if(featuresConfig.share_enabled==='1'&&currentCall){sa.style.display="block";document.getElementById("shareLinkBox").style.display="none";}}

// ===================== Dark Mode =====================
function toggleDarkMode(){document.body.classList.toggle('dark-mode');const d=document.body.classList.contains('dark-mode');document.getElementById('darkModeIcon').className=d?'fas fa-sun':'fas fa-moon';localStorage.setItem('fmo_dark_mode',d?'1':'0');}
function loadDarkMode(){if(localStorage.getItem('fmo_dark_mode')==='1'){document.body.classList.add('dark-mode');document.getElementById('darkModeIcon').className='fas fa-sun';}}

// ===================== Health Check =====================
async function loadHealth(){if(!isAdmin){showToast("请先登录管理员","warning");return;}const auth=await getAuthParams();if(!auth)return;
    try{const d=await(await fetch(api+"?action=get_health",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(auth)})).json();
    if(d.code===1){const h=d.data;let html='<div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;">';
    html+='<div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">PHP版本</span><span style="font-weight:600;">'+safeText(h.php_version)+'</span></div>';
    html+='<div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">服务器</span><span style="font-weight:600;">'+safeText(h.server_software)+'</span></div>';
    html+='<div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">时间</span><span style="font-weight:600;">'+safeText(h.server_time)+'</span></div>';
    html+='<div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">磁盘</span><span style="font-weight:600;color:var(--success);">'+safeText(h.disk_free)+' / '+safeText(h.disk_total)+'</span></div>';
    html+='<div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;"><span style="color:var(--text-secondary);">数据大小</span><span style="font-weight:600;">'+safeText(h.data_size)+'</span></div>';
    html+='</div><div style="margin-top:14px;font-weight:600;margin-bottom:8px;"><i class="fas fa-file-alt" style="color:var(--primary);margin-right:4px;"></i>文件权限</div><div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;">';
    for(const[f,info] of Object.entries(h.file_permissions)){const sc=info.writable?'var(--success)':'var(--danger)',si=info.writable?'fa-check-circle':'fa-times-circle';
    html+='<div style="padding:8px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><span style="font-family:Consolas,monospace;font-size:12px;">'+safeText(f)+'</span><span style="color:'+sc+';font-size:13px;"><i class="fas '+si+'" style="margin-right:4px;"></i>'+(info.exists?(info.writable?'可读写':'只读'):'不存在')+'</span></div>';}
    html+='</div>';document.getElementById('healthContent').innerHTML=html;showToast("系统状态已刷新","info");addLog("查看系统状态");}else{showToast(d.msg||"失败","error");}}catch(e){showToast("加载失败","error");}
}

// ===================== System Info & About =====================
async function loadSystemInfo() {
    try {
        const d = await (await fetch(api+"?action=get_system_info")).json();
        if (d.code === 1) {
            const v = d.data;
            document.getElementById("footerVersion").innerText = "FMO证书系统 v" + v.version + " " + v.version_name;
        }
    } catch(e) {
        document.getElementById("footerVersion").innerText = "FMO证书系统 v2.5.0";
    }
}

async function loadAbout() {
    const box = document.getElementById("aboutContent");
    if (!box) return;
    try {
        const d = await (await fetch(api+"?action=get_about")).json();
        if (d.code !== 1) { box.innerHTML = '<div style="color:var(--danger);">加载失败</div>'; return; }
        const a = d.data;
        let html = '';
        // 系统信息卡片
        html += '<div style="background:linear-gradient(135deg,#0f172a,#1e3a5f,#1d4ed8);color:#fff;padding:20px;border-radius:var(--radius-sm);margin-bottom:16px;text-align:center;">';
        html += '<div style="font-size:11px;opacity:0.7;margin-bottom:4px;">FMO CERTIFICATE SYSTEM</div>';
        html += '<div style="font-size:22px;font-weight:800;margin-bottom:4px;">v' + safeText(a.version) + '</div>';
        html += '<div style="font-size:13px;opacity:0.9;">' + safeText(a.version_name) + '</div>';
        html += '<div style="margin-top:12px;font-size:12px;opacity:0.7;">开发者：' + safeText(a.developer) + ' · ' + safeText(a.platform) + '</div>';
        html += '</div>';
        // 系统简介
        html += '<div style="margin-bottom:16px;">';
        html += '<div style="font-weight:700;font-size:14px;margin-bottom:8px;color:var(--text);"><i class="fas fa-book" style="color:var(--primary);margin-right:6px;"></i>系统简介</div>';
        html += '<div style="color:var(--text-secondary);line-height:1.8;font-size:13px;">' + safeText(a.description) + '</div>';
        html += '</div>';
        // 功能列表
        html += '<div style="margin-bottom:16px;">';
        html += '<div style="font-weight:700;font-size:14px;margin-bottom:8px;color:var(--text);"><i class="fas fa-star" style="color:#f59e0b;margin-right:6px;"></i>功能特性</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;">';
        a.features.forEach(f => {
            html += '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#f8fafc;border-radius:6px;font-size:12px;"><i class="fas fa-check-circle" style="color:var(--success);font-size:11px;"></i>' + safeText(f) + '</div>';
        });
        html += '</div></div>';
        // 技术栈
        html += '<div style="margin-bottom:16px;">';
        html += '<div style="font-weight:700;font-size:14px;margin-bottom:8px;color:var(--text);"><i class="fas fa-cogs" style="color:var(--primary);margin-right:6px;"></i>技术栈</div>';
        a.tech_stack.forEach(t => {
            html += '<div style="padding:4px 0;font-size:12px;color:var(--text-secondary);"><i class="fas fa-angle-right" style="color:var(--primary);margin-right:6px;"></i>' + safeText(t) + '</div>';
        });
        html += '</div>';
        // 更新日志
        html += '<div style="margin-bottom:16px;">';
        html += '<div style="font-weight:700;font-size:14px;margin-bottom:8px;color:var(--text);"><i class="fas fa-history" style="color:var(--primary);margin-right:6px;"></i>更新日志</div>';
        a.changelog.forEach(c => {
            html += '<div style="padding:10px;background:#f8fafc;border-radius:6px;margin-bottom:6px;border-left:3px solid ' + (c.version === a.version ? 'var(--primary)' : 'var(--border)') + ';">';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
            html += '<span style="font-weight:700;font-size:13px;font-family:Consolas,monospace;">v' + safeText(c.version) + '</span>';
            html += '<span style="font-size:11px;color:var(--text-secondary);">' + safeText(c.date) + '</span>';
            if (c.version === a.version) html += '<span style="background:var(--primary);color:#fff;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;">当前</span>';
            html += '</div>';
            html += '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">' + safeText(c.note) + '</div>';
            html += '</div>';
        });
        html += '</div>';
        // 版权信息
        html += '<div style="text-align:center;padding-top:12px;border-top:1px solid var(--border);font-size:11px;color:var(--text-secondary);">';
        html += safeText(a.copyright) + ' | ' + safeText(a.license);
        html += '</div>';
        box.innerHTML = html;
    } catch(e) {
        box.innerHTML = '<div style="color:var(--danger);">加载关于信息失败</div>';
    }
}

// ===================== Audio Card (音频贺卡) =====================
let audioCardData = null;

function playAudioCard() {
    if (!audioCardData) { showToast("请先查询证书","warning"); return; }
    // 多种方案兼容移动端
    if ('speechSynthesis' in window) {
        try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance("恭喜台站" + audioCardData.callsign.split('').join(" ") + "，成功参与湖北FMO中继第" + audioCardData.sequence + "期例行点名活动。您的证书编号是" + audioCardData.certNo.split('').join(" ") + "，特此发证，祝您通联愉快！");
            u.lang = 'zh-CN'; u.rate = 0.9; u.volume = 1;
            u.onerror = function(){fallbackTTS(audioCardData);};
            // 某些移动端需要延迟触发
            setTimeout(function(){speechSynthesis.speak(u);},100);
            showToast("正在播放语音贺卡...","info");
        } catch(e) {
            fallbackTTS(audioCardData);
        }
    } else {
        fallbackTTS(audioCardData);
    }
}

function fallbackTTS(data) {
    // 使用Google TTS作为备选方案
    var text = "恭喜台站" + data.callsign + "，成功参与湖北FMO中继例行点名活动";
    var url = "https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=" + encodeURIComponent(text);
    var audio = new Audio(url);
    audio.onerror = function(){
        // 最终备选：直接显示贺卡文字
        showToast("当前浏览器不支持语音，贺卡文字已展示","info");
    };
    audio.play().catch(function(){
        showToast("请点击贺卡图片后长按保存分享","info");
    });
}

function downloadAudioCard() {
    const canvas = document.getElementById("audioCardCanvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "FMO音频贺卡_" + (audioCardData ? audioCardData.callsign : "card") + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("贺卡图片已保存","success");
}

function drawAudioCard(data) {
    const canvas = document.getElementById("audioCardCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 480, H = 640;
    canvas.width = W; canvas.height = H;
    // 背景：模拟无线电波频谱风格
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a'); grad.addColorStop(0.3, '#0d1b3e'); grad.addColorStop(0.6, '#1a0a2e'); grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // 频谱波形背景
    for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = 'rgba(96,165,250,' + (0.06 - i * 0.008) + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < W; x += 2) {
            const y = H / 2 + Math.sin((x + i * 50) / (40 + i * 10)) * (60 + i * 20) + Math.sin((x + i * 80) / 25) * 15;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    // 顶部emoji
    ctx.font = '44px serif'; ctx.textAlign = 'center';
    ctx.fillText('\uD83C\uDF89', W / 2, 55);
    // 标题
    ctx.font = 'bold 26px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#fbbf24';
    ctx.fillText('通 联 纪 念', W / 2, 105);
    // 电台呼号（大号醒目）
    ctx.font = 'bold 60px Consolas, monospace';
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(96,165,250,0.5)'; ctx.shadowBlur = 20;
    ctx.fillText(data.callsign || '---', W / 2, 180);
    ctx.shadowBlur = 0;
    // 通联信息卡片
    const cardY = 210, cardH = 200, cardW = W - 80;
    // 卡片背景
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.roundRect(40, cardY, cardW, cardH, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(96,165,250,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(40, cardY, cardW, cardH, 12); ctx.stroke();
    // 卡片标题
    ctx.font = 'bold 13px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#60a5fa'; ctx.textAlign = 'left';
    ctx.fillText('\u25B6 \u6D3B\u52A8\u4FE1\u606F', 60, cardY + 28);
    // 活动信息列表
    ctx.font = '14px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#94a3b8';
    const infoLines = [
        '\u{1F4E1} \u6D3B\u52A8\uFF1A\u6E56\u5317FMO\u4E2D\u7EE7\u4F8B\u884C\u70B9\u540D',
        '\u{1F4C5} \u65E5\u671F\uFF1A' + (data.cert_date || '\u2014'),
        '\u{1F3AF} \u5E8F\u53F7\uFF1A\u7B2C ' + (data.sequence || '?') + ' \u4F4D',
        '\u{1F310} \u9891\u7387\uFF1A439.975 MHz',
        '\u{1F4AC} \u6A21\u5F0F\uFF1AFM \u00B7 \u8BED\u97F3\u901A\u4FE1'
    ];
    infoLines.forEach(function(line, i) {
        ctx.fillText(line, 60, cardY + 58 + i * 28);
    });
    // 统计数据
    const statY = cardY + cardH + 20;
    const statW = (cardW - 16) / 3;
    const stats = [
        { num: data.query_count || 0, label: '\u67E5\u8BE2\u6B21\u6570' },
        { num: data.download_count || 0, label: '\u4E0B\u8F7D\u6B21\u6570' },
        { num: data.total_stations || 0, label: '\u603B\u53C2\u4E0E\u4EBA\u6570' }
    ];
    stats.forEach(function(s, i) {
        const sx = 40 + i * (statW + 8);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.beginPath(); ctx.roundRect(sx, statY, statW, 70, 8); ctx.fill();
        ctx.font = 'bold 24px Consolas, monospace'; ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center';
        ctx.fillText(String(s.num), sx + statW / 2, statY + 32);
        ctx.font = '11px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#64748b';
        ctx.fillText(s.label, sx + statW / 2, statY + 55);
    });
    // 无线电波段装饰
    ctx.strokeStyle = 'rgba(96,165,250,0.15)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const r = 80 + i * 25;
        ctx.beginPath(); ctx.arc(W / 2, H - 80, r, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    // 底部
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Microsoft YaHei", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('\u4E1A\u4F59\u65E0\u7EBF\u7535 \u00B7 \u8FDE\u63A5\u4F60\u6211', W / 2, H - 55);
    ctx.font = '11px "Microsoft YaHei", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('BH6RGQ \u00B7 \u6E56\u5317FMO\u4E2D\u7EE7\u53F0', W / 2, H - 30);
    // 边框
    ctx.strokeStyle = 'rgba(96,165,250,0.15)'; ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, W - 16, H - 16);
}

async function generateAudioCard() {
    if (!currentCall) return;
    try {
        const d = await (await fetch(api + "?action=get_ecard", {
            method: "POST", headers: {"Content-Type":"application/json"},
            body: JSON.stringify({callsign: currentCall})
        })).json();
        if (d.code === 1) {
            audioCardData = d.data;
            audioCardData.certNo = document.getElementById("certNo").innerText.replace("编号：","");
            drawAudioCard(audioCardData);
            document.getElementById("audioCardEmpty").style.display = "none";
            document.getElementById("audioCardContent").style.display = "block";
        }
    } catch(e) { showToast("生成贺卡失败","error"); }
}

// ===================== E-Card (电子名片) =====================
async function generateECard() {
    const call = document.getElementById("ecardInput").value.trim().toUpperCase();
    if (!call) { showToast("请输入呼号","warning"); return; }
    const style = document.getElementById("ecardStyle").value;
    try {
        const d = await (await fetch(api + "?action=get_ecard", {
            method: "POST", headers: {"Content-Type":"application/json"},
            body: JSON.stringify({callsign: call})
        })).json();
        if (d.code !== 1) { showToast(d.msg || "未找到","error"); return; }
        drawECard(d.data, style);
        document.getElementById("ecardCanvas").style.display = "block";
        document.getElementById("ecardActions").style.display = "block";
        showToast("名片已生成","success");
    } catch(e) { showToast("生成失败","error"); }
}

function downloadECard() {
    const canvas = document.getElementById("ecardCanvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "FMO电子名片_" + (document.getElementById("ecardInput").value.trim().toUpperCase() || "card") + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("名片已保存","success");
}

function drawECard(data, style) {
    const canvas = document.getElementById("ecardCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 480, H = 300;
    canvas.width = W; canvas.height = H;
    const colors = data.colors || {borderColor:'#8b0000', titleColor:'#8b0000', signColor:'#1a1a6c'};
    // 背景
    if (style === 'tech') {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        // 网格线
        ctx.strokeStyle = 'rgba(37,99,235,0.1)'; ctx.lineWidth = 0.5;
        for (let i = 0; i < W; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
        for (let i = 0; i < H; i += 20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }
        ctx.fillStyle = '#60a5fa'; ctx.font = '11px Consolas, monospace';
        ctx.fillText('// FMO_CERTIFICATE_SYSTEM', 20, 25);
        ctx.fillStyle = '#94a3b8'; ctx.fillText('callsign: ' + data.callsign, 20, 50);
        ctx.fillText('sequence: ' + data.sequence, 20, 68);
        ctx.fillText('cert_no:  ' + data.cert_no, 20, 86);
        ctx.fillText('date:     ' + data.cert_date, 20, 104);
        ctx.fillText('first:    ' + data.first_date, 20, 122);
        ctx.fillText('queries:  ' + data.query_count, 20, 140);
        ctx.fillText('downloads:' + data.download_count, 20, 158);
        // 呼号大字
        ctx.font = 'bold 56px Consolas, monospace'; ctx.fillStyle = '#fff';
        ctx.textAlign = 'right'; ctx.fillText(data.callsign, W - 30, 100);
        ctx.font = '14px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#94a3b8';
        ctx.fillText('湖北FMO中继台', W - 30, 125);
        // 统计圆圈
        ctx.textAlign = 'center';
        ctx.beginPath(); ctx.arc(W - 100, 200, 35, 0, Math.PI * 2);
        ctx.strokeStyle = colors.borderColor; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Consolas';
        ctx.fillText(data.query_count, W - 100, 205);
        ctx.fillStyle = '#94a3b8'; ctx.font = '11px "Microsoft YaHei"';
        ctx.fillText('查询次数', W - 100, 225);
        ctx.beginPath(); ctx.arc(W - 180, 200, 35, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Consolas';
        ctx.fillText(data.download_count, W - 180, 205);
        ctx.fillStyle = '#94a3b8'; ctx.font = '11px "Microsoft YaHei"';
        ctx.fillText('下载次数', W - 180, 225);
        // 底部
        ctx.textAlign = 'left';
        ctx.fillStyle = '#475569'; ctx.font = '10px Consolas';
        ctx.fillText('v2.5.0 | bh6rgq.v6.navy', 20, H - 15);
        // 边框
        ctx.strokeStyle = colors.borderColor; ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, W - 4, H - 4);
    } else if (style === 'classic') {
        // 古典风格
        ctx.fillStyle = '#fdf6e3'; ctx.fillRect(0, 0, W, H);
        // 花边
        ctx.strokeStyle = colors.borderColor; ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, W - 16, H - 16);
        ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1;
        ctx.strokeRect(14, 14, W - 28, H - 28);
        // 标题
        ctx.textAlign = 'center'; ctx.font = 'bold 24px KaiTi, serif';
        ctx.fillStyle = colors.titleColor;
        ctx.fillText('台 站 名 片', W / 2, 55);
        // 呼号
        ctx.font = 'bold 48px KaiTi, serif'; ctx.fillStyle = '#000';
        ctx.fillText(data.callsign, W / 2, 120);
        // 信息
        ctx.font = '15px "Microsoft YaHei", serif'; ctx.fillStyle = '#444';
        ctx.fillText('证书编号：' + data.cert_no, W / 2, 160);
        ctx.fillText('参与日期：' + data.cert_date, W / 2, 185);
        ctx.fillText('首次参与：' + data.first_date, W / 2, 210);
        // 统计
        ctx.fillText('查询 ' + data.query_count + ' 次  |  下载 ' + data.download_count + ' 次', W / 2, 245);
        // 底部
        ctx.font = '13px "Microsoft YaHei", serif'; ctx.fillStyle = '#888';
        ctx.fillText('湖北FMO中继台 · 点名参与纪念', W / 2, 275);
        // 印章
        ctx.beginPath(); ctx.arc(W - 60, 55, 25, 0, Math.PI * 2);
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = 'bold 11px "Microsoft YaHei"'; ctx.fillStyle = '#c0392b';
        ctx.fillText('FMO', W - 60, 52);
        ctx.fillText('认证', W - 60, 66);
    } else {
        // 简约风格
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        // 左侧色条
        ctx.fillStyle = colors.borderColor; ctx.fillRect(0, 0, 6, H);
        // 呼号
        ctx.textAlign = 'left'; ctx.font = 'bold 44px Consolas, monospace';
        ctx.fillStyle = '#1e293b'; ctx.fillText(data.callsign, 30, 70);
        // 下划线
        ctx.strokeStyle = colors.borderColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(30, 82); ctx.lineTo(250, 82); ctx.stroke();
        // 副标题
        ctx.font = '14px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#64748b';
        ctx.fillText('湖北FMO中继台 · ' + data.cert_sub, 30, 105);
        // 信息列表
        ctx.font = '13px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#475569';
        const items = [
            '证书编号  ' + data.cert_no,
            '参与日期  ' + data.cert_date,
            '首次参与  ' + data.first_date,
            '参与序号  第 ' + data.sequence + ' 位',
            '查询次数  ' + data.query_count + ' 次',
            '下载次数  ' + data.download_count + ' 次'
        ];
        items.forEach((item, i) => { ctx.fillText(item, 30, 140 + i * 22); });
        // 右侧大数字
        ctx.textAlign = 'right'; ctx.font = 'bold 80px Consolas';
        ctx.fillStyle = 'rgba(37,99,235,0.06)';
        ctx.fillText('#' + data.sequence, W - 20, 260);
        // 底部
        ctx.textAlign = 'left'; ctx.font = '10px Consolas';
        ctx.fillStyle = '#cbd5e1'; ctx.fillText('FMO CERT SYSTEM v2.5.0', 30, H - 12);
    }
}

// ===================== Big Screen (大屏模式) =====================
let bigScreenInterval = null;

function openBigScreen() {
    const win = window.open('', '_blank', 'width=1280,height=800,fullscreen=yes');
    if (!win) { showToast("请允许弹出窗口","warning"); return; }
    win.document.write('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>FMO实时大屏</title>');
    win.document.write('<link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">');
    win.document.write('<style>');
    win.document.write('*{margin:0;padding:0;box-sizing:border-box;}');
    win.document.write('body{background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;overflow:hidden;height:100vh;}');
    win.document.write('.bs-header{text-align:center;padding:20px;background:linear-gradient(135deg,#0f172a,#1e3a5f,#1d4ed8);border-bottom:2px solid rgba(37,99,235,0.3);}');
    win.document.write('.bs-header h1{font-size:28px;letter-spacing:4px;color:#fff;}');
    win.document.write('.bs-header .sub{font-size:13px;color:#94a3b8;margin-top:4px;}');
    win.document.write('.bs-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:16px;height:calc(100vh - 100px);}');
    win.document.write('.bs-card{background:#1e293b;border-radius:12px;padding:20px;border:1px solid #334155;}');
    win.document.write('.bs-card h3{font-size:14px;color:#94a3b8;margin-bottom:12px;display:flex;align-items:center;gap:8px;}');
    win.document.write('.bs-big-num{font-size:64px;font-weight:800;background:linear-gradient(135deg,#2563eb,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}');
    win.document.write('.bs-stat-row{display:flex;gap:16px;margin-bottom:16px;}');
    win.document.write('.bs-stat{flex:1;background:#1e293b;border-radius:12px;padding:16px;text-align:center;border:1px solid #334155;}');
    win.document.write('.bs-stat .num{font-size:36px;font-weight:800;color:#fff;}');
    win.document.write('.bs-stat .label{font-size:12px;color:#94a3b8;margin-top:4px;}');
    win.document.write('.bs-danmu{position:relative;height:40px;overflow:hidden;margin-bottom:12px;}');
    win.document.write('.bs-danmu-item{position:absolute;white-space:nowrap;padding:6px 16px;background:rgba(37,99,235,0.15);border:1px solid rgba(37,99,235,0.3);border-radius:20px;font-family:Consolas,monospace;font-size:14px;color:#60a5fa;animation:danmu 8s linear;}');
    win.document.write('@keyframes danmu{from{transform:translateX(100vw);}to{transform:translateX(-200px);}}');
    win.document.write('.bs-city-item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;}');
    win.document.write('.bs-city-item .name{color:#e2e8f0;}');
    win.document.write('.bs-city-item .count{color:#60a5fa;font-weight:700;font-family:Consolas;}');
    win.document.write('.bs-top-item{display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid #1e293b;}');
    win.document.write('.bs-top-item .rank{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;}');
    win.document.write('.bs-top-item .call{font-family:Consolas;font-weight:600;font-size:16px;color:#fff;}');
    win.document.write('.bs-top-item .cnt{margin-left:auto;font-family:Consolas;color:#60a5fa;font-weight:700;}');
    win.document.write('.bs-time{text-align:center;font-size:11px;color:#475569;margin-top:8px;}');
    win.document.write('</style></head><body>');
    win.document.write('<div class="bs-header"><h1>FMO 实时在线大屏</h1><div class="sub">Hubei FMO Repeater Real-time Dashboard</div></div>');
    win.document.write('<div class="bs-grid" id="bsGrid">');
    win.document.write('<div><div class="bs-stat-row"><div class="bs-stat"><div class="num" id="bsTotal">0</div><div class="label">参与台站总数</div></div><div class="bs-stat"><div class="num" id="bsTodayQ">0</div><div class="label">今日查询</div></div></div>');
    win.document.write('<div class="bs-stat-row"><div class="bs-stat"><div class="num" id="bsTotalQ">0</div><div class="label">累计查询</div></div><div class="bs-stat"><div class="num" id="bsTotalD">0</div><div class="label">累计下载</div></div></div>');
    win.document.write('<div class="bs-time" id="bsTime"></div></div>');
    win.document.write('<div><div class="bs-card" style="height:100%;"><h3><i class="fas fa-broadcast-tower" style="color:#06b6d4;"></i> 最近查询动态</h3><div class="bs-danmu" id="bsDanmu"></div><div id="bsRecent" style="overflow-y:auto;max-height:calc(100% - 80px);font-size:13px;"></div></div></div>');
    win.document.write('<div><div class="bs-card" style="height:48%;margin-bottom:16px;overflow-y:auto;"><h3><i class="fas fa-medal" style="color:#f59e0b;"></i> 今日活跃 TOP 5</h3><div id="bsTop5"></div></div>');
    win.document.write('<div class="bs-card" style="height:48%;overflow-y:auto;"><h3><i class="fas fa-map-marker-alt" style="color:#ef4444;"></i> 地区分布 TOP 10</h3><div id="bsCities"></div></div></div>');
    win.document.write('</div>');
    win.document.write('<script src="app.js"><\/script>');
    win.document.write('</body></html>');
    win.document.close();
    // 启动数据轮询
    setTimeout(() => {
        if (win.closed) return;
        loadBigScreenData(win);
        bigScreenInterval = setInterval(() => { if (!win.closed) loadBigScreenData(win); }, 5000);
        win.onbeforeunload = () => { clearInterval(bigScreenInterval); };
    }, 1000);
}

async function loadBigScreenData(win) {
    try {
        const resp = await fetch(api + "?action=get_bigscreen");
        const d = await resp.json();
        if (d.code !== 1) return;
        const bd = d.data;
        const doc = win.document;
        doc.getElementById("bsTotal").textContent = bd.total_calls;
        doc.getElementById("bsTodayQ").textContent = bd.today_queries;
        doc.getElementById("bsTotalQ").textContent = bd.total_queries;
        doc.getElementById("bsTotalD").textContent = bd.total_downloads;
        doc.getElementById("bsTime").textContent = bd.server_time;
        // 弹幕
        const danmu = doc.getElementById("bsDanmu");
        if (bd.recent_queries.length > 0) {
            const rq = bd.recent_queries[Math.floor(Math.random() * bd.recent_queries.length)];
            const item = doc.createElement("div");
            item.className = "bs-danmu-item";
            item.textContent = "📡 " + rq.callsign + " 查询了证书 · " + rq.time.split(" ")[1];
            item.style.top = Math.random() * 20 + "px";
            danmu.appendChild(item);
            setTimeout(() => item.remove(), 8000);
        }
        // 最近列表
        const recent = doc.getElementById("bsRecent");
        recent.innerHTML = bd.recent_queries.map(q =>
            '<div style="padding:6px 0;border-bottom:1px solid #334155;display:flex;justify-content:space-between;"><span style="font-family:Consolas;font-weight:600;color:#fff;">' + q.callsign + '</span><span style="color:#64748b;font-size:12px;">' + q.time + '</span></div>'
        ).join('');
        // TOP5
        const top5 = doc.getElementById("bsTop5");
        const medals = ['#f59e0b','#94a3b8','#cd7f32','#475569','#475569'];
        const icons = ['🥇','🥈','🥉','4','5'];
        top5.innerHTML = bd.top_stations.map((s, i) =>
            '<div class="bs-top-item"><div class="rank" style="background:' + (medals[i] || '#475569') + ';color:#fff;">' + (icons[i] || (i+1)) + '</div><div class="call">' + s.callsign + '</div><div class="cnt">' + s.count + ' 次</div></div>'
        ).join('') || '<div style="text-align:center;color:#64748b;padding:20px;">暂无数据</div>';
        // 城市
        const cities = doc.getElementById("bsCities");
        const cEntries = Object.entries(bd.top_cities);
        cities.innerHTML = cEntries.map(([city, cnt]) =>
            '<div class="bs-city-item"><span class="name">' + city + '</span><span class="count">' + cnt + ' 次</span></div>'
        ).join('') || '<div style="text-align:center;color:#64748b;padding:20px;">暂无数据</div>';
    } catch(e) { console.error("大屏数据加载失败", e); }
}

// ===================== Activity Notification (活动通知) =====================
let activityData = null;
let activityEnabled = false;

async function loadActivity() {
    try {
        const d = await (await fetch(api + "?action=get_activity")).json();
        if (d.code === 1) {
            activityData = d.data;
            activityEnabled = d.data.enabled === '1';
            const el = (id) => document.getElementById(id);
            el('actTitle').value = d.data.title || '';
            el('actContent').value = d.data.content || '';
            el('actDate').value = d.data.date || '';
            el('actTime').value = d.data.time || '';
            el('actFrequency').value = d.data.frequency || '';
            el('actLocation').value = d.data.location || '';
            el('actNotes').value = d.data.notes || '';
            refreshActivitySwitch();
            showToast("活动配置已加载", "info");
        }
    } catch(e) { showToast("加载失败", "error"); }
}

function refreshActivitySwitch() {
    const tog = document.getElementById('activityEnableToggle');
    const lbl = document.getElementById('activityEnableLabel');
    if (tog) tog.classList.toggle('on', activityEnabled);
    if (lbl) { lbl.innerText = activityEnabled ? '已开启' : '已关闭'; lbl.style.color = activityEnabled ? 'var(--success)' : 'var(--text-secondary)'; }
}

function toggleActivityEnable() {
    if (!isAdmin) { showToast("请先登录管理员", "warning"); return; }
    activityEnabled = !activityEnabled;
    refreshActivitySwitch();
}

async function saveActivity() {
    if (!isAdmin) { showToast("请先登录管理员", "warning"); return; }
    const auth = await getAuthParams(); if (!auth) return;
    const el = (id) => document.getElementById(id).value;
    try {
        const d = await (await fetch(api + "?action=save_activity", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                ...auth,
                enabled: activityEnabled ? '1' : '0',
                title: el('actTitle'),
                content: el('actContent'),
                date: el('actDate'),
                time: el('actTime'),
                frequency: el('actFrequency'),
                location: el('actLocation'),
                notes: el('actNotes')
            })
        })).json();
        if (d.code === 1) { showToast("活动通知已保存", "success"); addLog("保存活动通知"); }
        else { showToast(d.msg || "保存失败", "error"); }
    } catch(e) { showToast("网络错误", "error"); }
}

function openActivityPage() {
    const baseUrl = window.location.origin + window.location.pathname;
    window.open(baseUrl + '?page=activity', '_blank');
}

// ===================== Admin Page (管理后台独立页面) =====================
async function handleAdminPage() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') !== 'admin') return false;
    
    // 验证登录状态
    const stored = getStoredToken();
    const expires = getStoredExpiry();
    if (!stored || expires * 1000 < Date.now()) {
        // 未登录，跳转到主页
        window.location.href = window.location.pathname;
        return true;
    }
    
    try {
        const d = await (await fetch(api + "?action=verify_token", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({token: stored})
        })).json();
        if (d.code !== 1) {
            window.location.href = window.location.pathname;
            return true;
        }
    } catch(e) {
        window.location.href = window.location.pathname;
        return true;
    }
    
    // 设置管理员状态
    authToken = stored;
    authExpiry = expires;
    isAdmin = true;
    
    // 替换页面为管理后台
    document.title = 'FMO证书系统 - 管理后台';
    renderAdminPage();
    return true;
}

function renderAdminPage() {
    const container = document.createElement('div');
    container.id = 'adminPageContainer';
    container.style.cssText = 'min-height:100vh;background:var(--bg);';
    
    // 顶部导航栏
    const navbar = document.createElement('div');
    navbar.style.cssText = 'background:linear-gradient(135deg,#0f172a,#1e3a5f,#1d4ed8);color:#fff;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 10px rgba(0,0,0,0.2);';
    navbar.innerHTML = '<div style="display:flex;align-items:center;gap:12px;"><i class="fas fa-cogs" style="font-size:20px;"></i><div><div style="font-weight:700;font-size:16px;">FMO证书系统管理后台</div><div style="font-size:11px;opacity:0.7;">v2.8.0 · 管理后台优化版</div></div></div><div style="display:flex;align-items:center;gap:12px;"><a href="' + window.location.pathname + '" style="color:#fff;text-decoration:none;padding:8px 16px;background:rgba(255,255,255,0.15);border-radius:8px;font-size:13px;"><i class="fas fa-home" style="margin-right:6px;"></i>返回主页</a><button onclick="adminLogout()" style="color:#fff;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;"><i class="fas fa-sign-out-alt" style="margin-right:6px;"></i>退出登录</button></div>';
    
    // 主内容区
    const main = document.createElement('div');
    main.style.cssText = 'max-width:1200px;margin:0 auto;padding:20px;';
    
    // 加载管理后台内容
    main.innerHTML = document.getElementById('adminContent').innerHTML;
    
    container.appendChild(navbar);
    container.appendChild(main);
    document.body.innerHTML = '';
    document.body.appendChild(container);
    
    // 重新初始化管理后台功能
    initAdminPage();
}

function adminLogout() {
    clearToken();
    window.location.href = window.location.pathname;
}

async function initAdminPage() {
    initWheelPicker();
    await loadServerState();
    await reloadList();
    await loadNoticeConfig();
    await loadCertConfig();
    await loadBasicConfig();
    await loadSstvConfig();
    refreshSwitch();
    bindCheckAll();
    initFileImport();
    populateSstvModeSelect();
    renderSstvModes("all");
    loadSstvHistory();
    await loadFeatures();
    loadAbout();
    loadActivity();
    loadSystemInfo();
    bindKeyboardShortcuts();
    addLog("管理后台页面加载完成");
}

function openAdminPage() {
    const baseUrl = window.location.origin + window.location.pathname;
    window.open(baseUrl + '?page=admin', '_blank');
}

// ===================== Activity Bubble (活动通知悬浮气泡) =====================
async function loadActivityBubble() {
    try {
        const d = await (await fetch(api + "?action=get_activity")).json();
        if (d.code === 1 && d.data.enabled === '1') {
            showActivityBubble(d.data);
        }
    } catch(e) {}
}

function showActivityBubble(data) {
    // 移除已存在的气泡
    const existing = document.getElementById('activityBubble');
    if (existing) existing.remove();
    
    const bubble = document.createElement('div');
    bubble.id = 'activityBubble';
    bubble.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:998;animation:bubbleIn 0.5s ease;';
    
    // 折叠状态
    bubble.innerHTML = `
        <div id="bubbleCollapsed" style="width:60px;height:60px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 15px rgba(245,158,11,0.4);transition:all 0.3s ease;" onclick="toggleActivityBubble()">
            <i class="fas fa-bullhorn" style="color:#fff;font-size:24px;"></i>
            <div style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;background:#ef4444;border-radius:50%;border:2px solid #fff;"></div>
        </div>
        <div id="bubbleExpanded" style="display:none;width:320px;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.15);overflow:hidden;">
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:16px;color:#fff;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-weight:700;font-size:15px;"><i class="fas fa-bullhorn" style="margin-right:6px;"></i>FMO活动通知</div>
                    <div style="cursor:pointer;font-size:18px;" onclick="toggleActivityBubble()"><i class="fas fa-times"></i></div>
                </div>
                <div style="font-size:13px;opacity:0.9;margin-top:4px;">湖北FMO中继台</div>
            </div>
            <div style="padding:16px;">
                <div style="font-weight:700;font-size:16px;color:#1e293b;margin-bottom:12px;">${safeText(data.title || 'FMO活动通知')}</div>
                ${data.date ? '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;color:#475569;"><i class="fas fa-calendar" style="color:#2563eb;width:16px;"></i>' + safeText(data.date) + '</div>' : ''}
                ${data.time ? '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;color:#475569;"><i class="fas fa-clock" style="color:#f59e0b;width:16px;"></i>' + safeText(data.time) + '</div>' : ''}
                ${data.frequency ? '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;color:#475569;"><i class="fas fa-broadcast-tower" style="color:#16a34a;width:16px;"></i>' + safeText(data.frequency) + '</div>' : ''}
                <div style="text-align:center;margin-top:12px;">
                    <a href="${window.location.pathname}?page=activity" style="display:inline-block;padding:8px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">查看完整通知</a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(bubble);
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bubbleIn {
            from { transform: scale(0) translateY(20px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes bubblePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        #bubbleCollapsed:hover {
            transform: scale(1.1) !important;
            box-shadow: 0 6px 20px rgba(245,158,11,0.5) !important;
        }
    `;
    document.head.appendChild(style);
    
    // 3秒后开始脉冲动画
    setTimeout(() => {
        const collapsed = document.getElementById('bubbleCollapsed');
        if (collapsed) {
            collapsed.style.animation = 'bubblePulse 2s ease infinite';
        }
    }, 3000);
}

function toggleActivityBubble() {
    const collapsed = document.getElementById('bubbleCollapsed');
    const expanded = document.getElementById('bubbleExpanded');
    if (!collapsed || !expanded) return;
    
    if (expanded.style.display === 'none') {
        collapsed.style.display = 'none';
        expanded.style.display = 'block';
    } else {
        collapsed.style.display = 'flex';
        expanded.style.display = 'none';
    }
}

async function handleActivityPage() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') !== 'activity') return false;
    try {
        const d = await (await fetch(api + "?action=get_activity")).json();
        if (d.code !== 1 || d.data.enabled !== '1') {
            document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;"><h2>活动通知未开启</h2><p>管理员暂未发布活动通知</p><a href="' + window.location.pathname + '">返回首页</a></div>';
            return true;
        }
        const a = d.data;
        const lines = (a.content || '').replace(/\n/g, '<br>');
        const notes = (a.notes || '').replace(/\n/g, '<br>');
        document.title = a.title || 'FMO活动通知';
        document.body.innerHTML = '<div style="min-height:100vh;background:linear-gradient(135deg,#0f172a,#1e3a5f,#1d4ed8);display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'Microsoft YaHei\',sans-serif;">' +
            '<div style="max-width:600px;width:100%;background:rgba(255,255,255,0.95);border-radius:16px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
            '<div style="text-align:center;margin-bottom:24px;">' +
            '<div style="font-size:48px;margin-bottom:8px;">📡</div>' +
            '<h1 style="font-size:24px;color:#1e293b;margin:0 0 8px;">' + safeText(a.title || 'FMO活动通知') + '</h1>' +
            '<div style="font-size:13px;color:#64748b;">湖北FMO中继台 · 业余无线电</div>' +
            '</div>' +
            (a.date ? '<div style="background:#dbeafe;border-radius:8px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">📅</span><span style="font-weight:600;color:#1d4ed8;">活动日期：' + safeText(a.date) + '</span></div>' : '') +
            (a.time ? '<div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">⏰</span><span style="font-weight:600;color:#92400e;">活动时间：' + safeText(a.time) + '</span></div>' : '') +
            (a.frequency ? '<div style="background:#dcfce7;border-radius:8px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">📡</span><span style="font-weight:600;color:#15803d;">使用频率：' + safeText(a.frequency) + '</span></div>' : '') +
            (a.location ? '<div style="background:#f3e8ff;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">📍</span><span style="font-weight:600;color:#7c3aed;">活动地点：' + safeText(a.location) + '</span></div>' : '') +
            (a.content ? '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;line-height:1.8;font-size:14px;color:#475569;">' + lines + '</div>' : '') +
            (a.notes ? '<div style="border-top:1px dashed #e2e8f0;padding-top:12px;margin-top:12px;"><div style="font-weight:600;font-size:13px;color:#64748b;margin-bottom:6px;">📝 备注说明</div><div style="font-size:13px;color:#64748b;line-height:1.6;">' + notes + '</div></div>' : '') +
            '<div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">' +
            '<a href="' + window.location.pathname + '" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">返回证书查询系统</a>' +
            '</div>' +
            (a.updated ? '<div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:12px;">最后更新：' + safeText(a.updated) + '</div>' : '') +
            '</div></div>';
        return true;
    } catch(e) { return false; }
}

// ===================== Feedback =====================
var selectedFeedbackType = 'suggestion';

function showFeedbackModal() {
    document.getElementById('feedbackModal').classList.add('show');
    document.getElementById('feedbackContent').value = '';
    document.getElementById('feedbackContact').value = '';
    document.getElementById('feedbackCharCount').innerText = '0';
    selectedFeedbackType = 'suggestion';
    document.querySelectorAll('.feedback-type-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.type === 'suggestion');
    });
    setTimeout(function(){ document.getElementById('feedbackContent').focus(); }, 200);
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').classList.remove('show');
}

function selectFeedbackType(btn) {
    selectedFeedbackType = btn.dataset.type;
    document.querySelectorAll('.feedback-type-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    btn.classList.add('active');
}

// 字数计数
document.addEventListener('DOMContentLoaded', function() {
    var fc = document.getElementById('feedbackContent');
    if (fc) {
        fc.addEventListener('input', function() {
            document.getElementById('feedbackCharCount').innerText = this.value.length;
        });
    }
});

async function submitFeedback() {
    var content = document.getElementById('feedbackContent').value.trim();
    if (!content) { showToast("请输入反馈内容", "warning"); return; }
    if (content.length < 5) { showToast("反馈内容至少5个字", "warning"); return; }
    var contact = document.getElementById('feedbackContact').value.trim();
    try {
        var d = await (await fetch(api + "?action=submit_feedback", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ type: selectedFeedbackType, content: content, contact: contact })
        })).json();
        if (d.code === 1) {
            showToast(d.msg || "感谢您的反馈！", "success");
            closeFeedbackModal();
        } else {
            showToast(d.msg || "提交失败", "error");
        }
    } catch(e) { showToast("网络错误", "error"); }
}

async function loadFeedback() {
    if (!isAdmin) { showToast("请先登录管理员", "warning"); return; }
    var auth = await getAuthParams(); if (!auth) return;
    try {
        var d = await (await fetch(api + "?action=get_feedback", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify(auth)
        })).json();
        if (d.code !== 1) { showToast(d.msg || "加载失败", "error"); return; }
        renderFeedbackList(d.list || []);
    } catch(e) { showToast("加载反馈失败", "error"); }
}

function renderFeedbackList(list) {
    var box = document.getElementById('feedbackListContainer');
    var badge = document.getElementById('feedbackUnreadBadge');
    if (!box) return;
    var unread = list.filter(function(f) { return !f.read; }).length;
    if (badge) {
        if (unread > 0) {
            badge.style.display = 'inline';
            badge.innerText = unread;
        } else {
            badge.style.display = 'none';
        }
    }
    if (list.length === 0) {
        box.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:30px;"><i class="fas fa-inbox" style="font-size:28px;display:block;margin-bottom:8px;"></i>暂无反馈记录</div>';
        return;
    }
    var typeIcons = { suggestion: 'fa-lightbulb', bug: 'fa-bug', praise: 'fa-heart', other: 'fa-comment' };
    var typeLabels = { suggestion: '功能建议', bug: '问题反馈', praise: '好评鼓励', other: '其他' };
    var typeColors = { suggestion: '#2563eb', bug: '#dc2626', praise: '#16a34a', other: '#94a3b8' };
    var html = '';
    list.forEach(function(f) {
        var icon = typeIcons[f.type] || 'fa-comment';
        var label = typeLabels[f.type] || '其他';
        var color = typeColors[f.type] || '#94a3b8';
        var borderLeft = f.read ? '3px solid var(--border)' : '3px solid ' + color;
        html += '<div style="background:' + (f.read ? '#f8fafc' : '#fff') + ';border:1px solid var(--border);border-left:' + borderLeft + ';border-radius:var(--radius-sm);padding:14px;margin-bottom:10px;position:relative;">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
        html += '<span style="background:' + color + ';color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;"><i class="fas ' + icon + '"></i> ' + safeText(label) + '</span>';
        if (!f.read) html += '<span style="background:var(--danger);color:#fff;padding:1px 8px;border-radius:10px;font-size:10px;">未读</span>';
        html += '<span style="margin-left:auto;font-size:11px;color:var(--text-secondary);">' + safeText(f.time) + '</span>';
        html += '</div>';
        html += '<div style="font-size:14px;color:var(--text);line-height:1.7;margin-bottom:8px;white-space:pre-wrap;word-break:break-all;">' + safeText(f.content) + '</div>';
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
        if (f.contact) html += '<span style="font-size:12px;color:var(--text-secondary);"><i class="fas fa-envelope" style="margin-right:4px;"></i>联系方式：' + safeText(f.contact) + '</span>';
        html += '<span style="font-size:12px;color:var(--text-secondary);"><i class="fas fa-globe" style="margin-right:4px;"></i>IP：' + safeText(f.ip) + '</span>';
        html += '<div style="margin-left:auto;display:flex;gap:6px;">';
        if (!f.read) html += '<button class="btn btn-primary btn-sm" onclick="markFeedbackRead(\'' + safeAttr(f.id) + '\')"><i class="fas fa-check"></i> 标为已读</button>';
        html += '<button class="btn btn-danger btn-sm" onclick="deleteFeedbackItem(\'' + safeAttr(f.id) + '\')"><i class="fas fa-trash"></i> 删除</button>';
        html += '</div></div></div>';
    });
    box.innerHTML = html;
}

async function markFeedbackRead(id) {
    if (!isAdmin) return;
    var auth = await getAuthParams(); if (!auth) return;
    try {
        var d = await (await fetch(api + "?action=mark_feedback_read", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ ...auth, id: id })
        })).json();
        if (d.code === 1) loadFeedback();
    } catch(e) {}
}

async function deleteFeedbackItem(id) {
    if (!isAdmin) return;
    if (!confirm("确定删除这条反馈？")) return;
    var auth = await getAuthParams(); if (!auth) return;
    try {
        var d = await (await fetch(api + "?action=delete_feedback", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ ...auth, id: id })
        })).json();
        if (d.code === 1) { showToast("已删除", "success"); loadFeedback(); }
    } catch(e) { showToast("删除失败", "error"); }
}

async function clearAllFeedback() {
    if (!isAdmin) return;
    if (!confirm("确定清空所有反馈？此操作不可恢复！")) return;
    var auth = await getAuthParams(); if (!auth) return;
    try {
        var d = await (await fetch(api + "?action=clear_feedback", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify(auth)
        })).json();
        if (d.code === 1) { showToast("已清空", "success"); loadFeedback(); }
    } catch(e) { showToast("清空失败", "error"); }
}

// ===================== Loading =====================
function hideLoading(){const o=document.getElementById('loadingOverlay');if(o){o.classList.add('hide');setTimeout(()=>o.remove(),600);}}

// ===================== Keyboard Shortcuts =====================
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+S 保存列表（仅在管理员登录时）
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (isAdmin) saveList();
        }
        // Esc 关闭弹窗
        if (e.key === 'Escape') {
            closeLoginModal();
            closeNotice();
            closeFeedbackModal();
        }
        // Enter 查询（搜索框获得焦点时）
        if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'call') {
            e.preventDefault();
            search();
        }
        // Enter 登录（密码框获得焦点时）
        if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'loginPwd') {
            e.preventDefault();
            login();
        }
    });
}

// ===================== Init =====================
window.onload = async () => {
    // 检查是否为管理后台页面
    const isAdminPage = await handleAdminPage();
    if (isAdminPage) return;
    
    const sessionRestored = await restoreSession();
    if (sessionRestored) { applyLoginUI(); addLog("会话已恢复"); showToast("会话已恢复","success"); }
    initWheelPicker();
    // 并行加载所有配置，提升首页加载速度
    // 使用allSettled避免单个请求失败导致全部中断
    await Promise.allSettled([
        loadServerState(),
        reloadList(),
        loadNoticeConfig(),
        loadCertConfig(),
        loadBasicConfig(),
        loadSstvConfig(),
        loadFeatures()
    ]);
    refreshSwitch();bindCheckAll();initFileImport();bindUnlockInput();populateSstvModeSelect();renderSstvModes("all");loadSstvHistory();
    bindKeyboardShortcuts();
    loadSystemInfo();
    addLog("页面加载完成");showNotice();
    if (sessionRestored && featuresConfig.chart_enabled==='1') loadTrendChart();
    const isSharePage = await handleSharePage();
    const isActivityPage = await handleActivityPage();
    if (isSharePage || isActivityPage) document.getElementById("searchCard").style.display = "none";
    loadDarkMode();hideLoading();
    // 加载活动通知悬浮气泡
    loadActivityBubble();
};
