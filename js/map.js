// ================= js/map.js =================

let map;
let layerGroups = {};
let labelLayerGroup; 
let currentImageBase64 = "";
const ZOOM_THRESHOLD = 0; 

const MARKER_TYPES = {
    'orb': { label: '灵珠', img: 'assets/orb.png', class: 'icon-orb' },
    'chest': { label: '宝箱', img: 'assets/chest.png', class: 'icon-chest' },
    'teleport': { label: '传送点', img: 'assets/teleport.png', class: 'icon-teleport' },
    'user': { label: '野外boss', img: 'assets/user.png', class: 'icon-user' }
};
// ============ 标点数据库 ============
const initialMapData = [
    // ============ 传送点 ============
    {id: 'sys_t1', lat: 70, lng: 770, type: 'teleport', name: '三绝试炼', desc: '初始之地', img: ''},
    {id: 'sys_t2', lat: 145.5, lng: 599.5, type: 'teleport', name: '第一封印塔', desc: '', img: ''},
    {id: 'sys_t3', lat: 543.5, lng: 376.5, type: 'teleport', name: '第二封印塔', desc: '', img: ''},
    {id: 'sys_t4', lat: 680.5, lng: 589, type: 'teleport', name: '第三封印塔', desc: '', img: ''},
    {id: 'sys_t5', lat: 764, lng: 849, type: 'teleport', name: '第四封印塔', desc: '', img: ''},
    {id: 'sys_t6', lat: 138, lng: 714, type: 'teleport', name: '巨兽领地', desc: '', img: ''},
    {id: 'sys_t7', lat: 177.5, lng: 667, type: 'teleport', name: '金袖君外', desc: '', img: ''},
    {id: 'sys_t8', lat: 173, lng: 755, type: 'teleport', name: '未命名', desc: '', img: ''},
    {id: 'sys_t9', lat: 95.5, lng: 773.5, type: 'teleport', name: '新手村', desc: '', img: ''},

    // ============ 灵珠 ============
    {id: 'sys_orb1', lat: 251.5, lng: 716, type: 'orb', name: '山道2', desc: '', img: ''},

    // ============ 宝箱 ============
    {id: 'sys_chest1', lat: 98, lng: 744.5, type: 'chest', name: '草地', desc: '', img: ''},

    // ============ 野外BOSS ============
    {id: 'sys_boss1', lat: 169.5, lng: 718.5, type: 'user', name: '草猿山', desc: '', img: ''},
    {id: 'sys_boss2', lat: 179.5, lng: 632.5, type: 'user', name: '金袖君', desc: '', img: ''},
    {id: 'sys_boss3', lat: 231.5, lng: 743, type: 'user', name: '锦鹰卫', desc: '', img: ''}
];

// 文字标签数据
const mapLabels = [
    {id: 'sys_label1', lat: 190, lng:670, text: '号角之丘', fontSize: 24, color: '#8B4513', fontWeight: 'bold'},
    {id: 'sys_label2', lat: 370, lng: 560, text: '月升岛', fontSize: 23, color: '#44b4da', fontWeight: 'bold'},
    {id: 'sys_label3', lat: 460, lng: 370, text: '遗秋岛', fontSize: 26, color: '#375480', fontWeight: 'bold'},
    {id: 'sys_label4', lat: 610, lng: 570, text: '鲤跃泽', fontSize: 30, color: '#fabc82', fontWeight: 'bold'},
    {id: 'sys_label5', lat: 760, lng: 700, text: '银龙雪山', fontSize: 32, color: '#375480', fontWeight: 'bold'},
    {id: 'sys_label6', lat: 500, lng: 100, text: '溪舟屿',fontSize: 22, color: '#ff69b4', fontWeight: 'bold'},
    // 其他文字标签示例（根据需要取消注释）
];

const STORAGE_KEY = 'shanhai_full_v3';
const modalOverlay = document.getElementById('marker-modal-overlay');
const imgPreview = document.getElementById('marker-img-preview');
const imgInput = document.getElementById('marker-img-input');

function initMap() {
    if(!document.getElementById('map-container')) return;
    
    // 初始化地图
    map = L.map('map-container', { 
        crs: L.CRS.Simple, 
        minZoom: -0.5, 
        maxZoom: 2, 
        zoomControl: false, 
        attributionControl: false 
    });
    
    const bounds = [[0,0], [1000,1000]];
    L.imageOverlay('assets/山海大陆地图.png', bounds).addTo(map); 
    map.setView([140, 700], 0.8); 

    const thumbOverlay = L.imageOverlay('assets/山海大陆地图_thumb.png', bounds, {
        opacity: 1,
        zIndex: 1 // 层级较低
    }).addTo(map);  
    // 2. 预加载高清大图
    const highResUrl = 'assets/山海大陆地图.png';
    const highResImage = new Image();
    highResImage.src = highResUrl;

    highResImage.onload = () => {
        // 3. 高清图加载完毕后，将其叠加到地图上
        const fullOverlay = L.imageOverlay(highResUrl, bounds, {
            opacity: 0, // 先设为透明
            zIndex: 2   // 层级较高，盖在缩略图上面
        }).addTo(map);

        // 4. 执行平滑过渡动画：高清图淡入
        let op = 0;
        const fadeTimer = setInterval(() => {
            if (op >= 1) {
                clearInterval(fadeTimer);
                // 动画结束后，为了节省内存，可以把缩略图移除（可选）
                // map.removeLayer(thumbOverlay); 
            } else {
                op += 0.05; // 调节淡入速度
                fullOverlay.setOpacity(op);
            }
        }, 50); // 每50ms执行一次
    };
    // 初始化图层
    Object.keys(MARKER_TYPES).forEach(k => layerGroups[k] = L.layerGroup().addTo(map));
    labelLayerGroup = L.layerGroup().addTo(map);
    
    // 加载数据
    initialMapData.forEach(d => renderMarker(d)); 
    loadUserMarkers();
    renderMapLabels();
    
    // 缩放事件
    map.on('zoomend', handleZoomChange);
    handleZoomChange();

    // 点击事件
    map.on('click', (e) => openModal({lat: e.latlng.lat, lng: e.latlng.lng, id:'', name:'', type:'user', desc:'', img:''}));
}

// ... (handleZoomChange, renderMapLabels, renderMarker, removeMarkerFromMap, toggleLayer, toggleMapControls 等辅助函数保持不变，见上文或保持原样) ...
// 为节省篇幅，这里省略中间未修改的辅助函数，请保留你原有的即可
// 如果你如果不确定，可以把下面的函数都复制进去

function handleZoomChange() {
    const currentZoom = map.getZoom();
    if (currentZoom <= ZOOM_THRESHOLD) {
        Object.values(layerGroups).forEach(group => map.removeLayer(group));
        if (!map.hasLayer(labelLayerGroup)) map.addLayer(labelLayerGroup);
    } else {
        Object.values(layerGroups).forEach(group => { if (!map.hasLayer(group)) map.addLayer(group); });
        if (map.hasLayer(labelLayerGroup)) map.removeLayer(labelLayerGroup);
    }
}

function renderMapLabels() {
    labelLayerGroup.clearLayers();
    mapLabels.forEach(label => {
        const icon = L.divIcon({
            html: `<div style="color: ${label.color || '#000'}; font-size: ${label.fontSize || 12}px; font-weight: ${label.fontWeight || 'normal'}; text-shadow: 1px 1px 2px rgba(255,255,255,0.8); white-space: nowrap; pointer-events: none;">${label.text}</div>`,
            className: 'map-label', iconSize: null, iconAnchor: [0, 0]
        });
        L.marker([label.lat, label.lng], { icon: icon, interactive: false }).addTo(labelLayerGroup);
    });
}

function renderMarker(data) {
    removeMarkerFromMap(data.id);
    const config = MARKER_TYPES[data.type] || MARKER_TYPES['user'];
    const icon = L.divIcon({
        html: `<img src="${config.img}" style="width:100%; height:100%; object-fit:contain;">`,
        className: `icon-base ${config.class}`,
        iconSize: [40, 40], iconAnchor: [20, 20]
    });
    const marker = L.marker([data.lat, data.lng], { icon: icon }).addTo(layerGroups[data.type]);
    marker.meta = data; 
    marker.bindTooltip(`<div style="text-align:center"><div style="font-weight:bold; color:#d4af37;">${data.name}</div><div style="font-size:10px; color:#ddd;">${config.label}</div>${data.img ? '<i class="fa-regular fa-image" style="color:#ffd700"></i>' : ''}</div>`, { direction: 'top', className: 'custom-tooltip', offset: [0, -20], opacity: 1 });
    marker.on('click', (e) => { L.DomEvent.stopPropagation(e); openModal(data); });
    return marker;
}

function removeMarkerFromMap(id) {
    Object.values(layerGroups).forEach(group => {
        group.eachLayer(layer => { if (layer.meta && layer.meta.id === id) group.removeLayer(layer); });
    });
}

function toggleLayer(type, btn) {
    if (map.hasLayer(layerGroups[type])) { 
        map.removeLayer(layerGroups[type]); 
        btn.classList.remove('active'); btn.style.opacity = '0.5'; 
    } else { 
        map.addLayer(layerGroups[type]); 
        btn.classList.add('active'); btn.style.opacity = '1'; 
    }
}

function toggleMapControls() {
    const panel = document.getElementById('map-controls');
    panel.classList.toggle('open');
}

function openModal(data) {
    document.getElementById('marker-id').value = data.id;
    document.getElementById('marker-lat').value = data.lat;
    document.getElementById('marker-lng').value = data.lng;
    document.getElementById('marker-name').value = data.name;
    document.getElementById('marker-type').value = data.type;
    document.getElementById('marker-desc').value = data.desc || '';
    currentImageBase64 = data.img || '';
    if (currentImageBase64) { imgPreview.src = currentImageBase64; imgPreview.style.display = 'block'; } else { imgPreview.style.display = 'none'; }
    imgInput.value = ''; 
    document.getElementById('btn-delete').style.display = data.id ? 'block' : 'none';
    modalOverlay.classList.add('open');
}

function closeModal() { modalOverlay.classList.remove('open'); }

function handleImageUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageBase64 = e.target.result;
            imgPreview.src = currentImageBase64;
            imgPreview.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function saveMarkerData() {
    const id = document.getElementById('marker-id').value || 'u_' + Date.now();
    const data = {
        id: id,
        lat: parseFloat(document.getElementById('marker-lat').value),
        lng: parseFloat(document.getElementById('marker-lng').value),
        name: document.getElementById('marker-name').value,
        type: document.getElementById('marker-type').value,
        desc: document.getElementById('marker-desc').value,
        img: currentImageBase64
    };
    if(!data.name) return alert("请填写名称");
    saveToStorage(data);
    renderMarker(data);
    closeModal();
}

function deleteCurrentMarker() {
    const id = document.getElementById('marker-id').value;
    if(!id || !confirm("确定删除？")) return;
    removeMarkerFromMap(id);
    let saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    saved = saved.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    closeModal();
}

function saveToStorage(data) {
    let saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = saved.findIndex(m => m.id === data.id);
    if (idx > -1) saved[idx] = data; else saved.push(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (e) { alert("存储空间已满"); }
}

function loadUserMarkers() {
    let saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    saved.forEach(d => renderMarker(d));
}

function exportMapData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data || data === '[]') return alert("没有数据可导出");
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `山海寻灵_地图备份_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function triggerImport() { document.getElementById('import-input').click(); }

function importMapData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = e.target.result;
            const parsedData = JSON.parse(json);
            if (!Array.isArray(parsedData)) throw new Error("格式错误");
            if (!confirm(`将覆盖当前数据，确定吗？`)) return;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData));
            Object.values(layerGroups).forEach(group => group.clearLayers());
            loadUserMarkers();
            initialMapData.forEach(d => renderMarker(d));
            alert("导入成功！");
        } catch (err) { alert("导入失败"); }
        input.value = '';
    };
    reader.readAsText(file);
}

// ================= 新增功能：地图搜索与独显 =================

// 1. 地图内搜索功能
function searchMapLocation(keyword) {
    if (!map || !keyword) return;
    
    // 移除之前的搜索高亮（如果有的话，比如移除临时的大图标类，这里简化处理）
    
    let found = false;
    
    // 遍历所有图层组
    Object.keys(layerGroups).forEach(type => {
        const group = layerGroups[type];
        
        // 只有当前图层是显示状态，或者为了搜索我们强制开启它？
        // 策略：搜索时，如果搜到了隐藏图层的东西，自动把该图层打开
        
        group.eachLayer(layer => {
            if (found) return; // 只定位第一个匹配项，避免乱飞

            if (layer.meta && layer.meta.name && layer.meta.name.includes(keyword)) {
                // 1. 确保该图层是开启的
                if (!map.hasLayer(group)) {
                    map.addLayer(group);
                    // 更新UI按钮状态
                    updateLayerButtonState(type, true);
                }

                // 2. 飞过去
                map.flyTo(layer.getLatLng(), 1.5);
                layer.openTooltip();
                
                // 3. 视觉反馈
                if(layer._icon) {
                    const orgTransform = layer._icon.style.transform;
                    layer._icon.style.transition = '0.3s';
                    layer._icon.style.transform += ' scale(1.5)';
                    setTimeout(() => {
                        // 也就是复原
                        // 注意：这里简单替换可能会有bug，严谨做法是移除scale
                        // 但由于Leaflet会频繁重绘，简单的视觉提示足矣
                        layer._icon.style.transform = layer._icon.style.transform.replace(' scale(1.5)', '');
                    }, 1000);
                }
                
                found = true;
            }
        });
    });
}

// 2. 双击“只看此项”功能
function isolateLayer(targetType) {
    // 防止双击触发单击的 toggle，先强制显示目标
    if (!map.hasLayer(layerGroups[targetType])) {
        map.addLayer(layerGroups[targetType]);
    }

    // 遍历所有定义的图层类型
    Object.keys(MARKER_TYPES).forEach(type => {
        if (type === targetType) {
            // 目标图层：确保显示
            if (!map.hasLayer(layerGroups[type])) map.addLayer(layerGroups[type]);
            updateLayerButtonState(type, true);
        } else {
            // 其他图层：全部隐藏
            if (map.hasLayer(layerGroups[type])) map.removeLayer(layerGroups[type]);
            updateLayerButtonState(type, false);
        }
    });
}

// 辅助：更新按钮样式的函数
function updateLayerButtonState(type, isActive) {
    // 找到包含 onclick="toggleLayer('type',...)" 的按钮
    // 这是一个简单的查找方式，根据 onclick 属性内容
    const buttons = document.querySelectorAll('.layer-toggle');
    buttons.forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(`'${type}'`)) {
            if (isActive) {
                btn.classList.add('active');
                btn.style.opacity = '1';
            } else {
                btn.classList.remove('active');
                btn.style.opacity = '0.5';
            }
        }
    });
}

// ================= ★★★ 核心修复：地图跳转接口 ★★★ =================
window.highlightMapSpirit = function(spiritName) {
    if (!map) return;

    // 1. 只显示野外BOSS图层 (假设你要找的是BOSS)
    // 也可以不做这一步，保持当前图层状态
    Object.values(layerGroups).forEach(group => map.removeLayer(group));
    if (layerGroups['user']) map.addLayer(layerGroups['user']); // 显示BOSS
    if (layerGroups['teleport']) map.addLayer(layerGroups['teleport']); // 显示传送点做参考

    let found = false;
    let targetLatLng = null;

    // 2. 遍历所有图层寻找匹配项
    // 这里我们遍历 'user' (BOSS) 图层，如果你有其他分类也要遍历
    layerGroups['user'].eachLayer(layer => {
        // 模糊匹配：例如图鉴叫"草猿山"，地图标记叫"草猿山" 或 "野生草猿山" 都能匹配
        if (layer.meta && layer.meta.name && layer.meta.name.includes(spiritName)) {
            found = true;
            targetLatLng = layer.getLatLng();
            
            // 打开气泡
            layer.openTooltip();
            
            // 动画特效
            if(layer._icon) {
                layer._icon.style.transition = 'all 0.5s';
                layer._icon.style.transform += ' scale(1.5)';
                layer._icon.style.filter = 'drop-shadow(0 0 10px #ff0000)'; // 加个发光
                setTimeout(() => {
                    // 复原
                    layer._icon.style.transform = layer._icon.style.transform.replace(' scale(1.5)', '');
                    layer._icon.style.filter = ''; 
                }, 1500);
            }
        }
    });

    // 3. 结果处理
    if (found && targetLatLng) {
        map.flyTo(targetLatLng, 1.2); // 飞过去，缩放1.2
        
        // 如果手机侧边栏开着，关掉它
        const controls = document.getElementById('map-controls');
        if(controls) controls.classList.remove('open');
        
    } else {
        // ★★★ 这里修改为你想要的提示 ★★★
        alert("数据缺失中。。。");
        
        // 既然没找到，就把常用图层都恢复，不然用户看到空地图会懵
        Object.values(layerGroups).forEach(group => map.addLayer(group));
    }
};