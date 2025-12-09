// ================= 属性克制关系定义 =================
const RELATION_MAP = {
    '水': '火',
    '火': '金',
    '金': '木',
    '木': '土',
    '土': '水',
    '冰': '龙',
    '龙': '妖',
    '妖': '冰',
    '一般': null 
};

// ================= 交互与应用主逻辑 (V4.0 完整重构版) =================
const app = {
    // === 核心状态 ===
    currentFilteredList: [], // 存储当前筛选后的啾灵列表
    currentSpiritIndex: -1,  // 当前选中啾灵在列表中的索引
    cart: JSON.parse(localStorage.getItem('shanhai_cart_v1') || '{}'), // 购物车数据

    // 1. 初始化
    init: function() {
        this.hideLoader();
        this.renderHome();
        this.initDex();
        this.renderCraft();
        this.initShowcase(); // 原 initBreed 改为展示逻辑
        this.initParticles();
        this.initEffects();
        
        // 确保地图模块已加载
        if(typeof initMap === 'function') initMap();
    },

    hideLoader: function() {
        const gate = document.getElementById('intro-gate');
        if (!gate) return;
        if (sessionStorage.getItem('hasVisited')) {
            gate.style.display = 'none';
        } else {
            setTimeout(() => {
                gate.style.opacity = '0';
                setTimeout(() => {
                    gate.style.display = 'none';
                    sessionStorage.setItem('hasVisited', 'true');
                }, 800);
            }, 1000);
        }
    },

    // ================= 首页渲染 =================
    renderHome: function() {
        // 1. 渲染新闻
        if (typeof newsData !== 'undefined') {
            const newsBox = document.getElementById('news-container');
            if(newsBox) {
                newsBox.innerHTML = newsData.map(n => {
                    const color = n.type === 'update' ? '#d4af37' : (n.type === 'event' ? '#ff6b6b' : '#999');
                    return `
                    <div class="news-item" onclick="app.loadNews('${n.url}')" data-hover style="cursor:pointer; display:flex; align-items:center; padding: 5px 0;">
                        <span style="background:${color}; color:#fff; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:10px;">${n.label}</span>
                        <span style="font-size:14px; color:#555; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${n.title}</span>
                        <span style="font-size:12px; color:#ccc;">${n.date}</span>
                    </div>`;
                }).join('');
            }
        }

        // 2. 渲染攻略
        if (typeof guideData !== 'undefined') {
            const guideBox = document.getElementById('guide-container');
            if(guideBox) {
                guideBox.innerHTML = guideData.map(g => `
                    <div class="guide-card" onclick="app.loadNews('${g.url}')" data-hover>
                        <div style="font-size:24px; color:var(--accent); min-width:40px; text-align:center;">
                            <i class="fa-solid fa-${g.icon || 'star'}"></i>
                        </div>
                        <div>
                            <h4 style="margin:0 0 5px 0; color:var(--primary);">${g.title}</h4>
                            <p style="margin:0; font-size:12px; color:#888; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${g.desc}</p>
                        </div>
                    </div>`).join('');
            }
        }

        // 3. 统计数据
        if (typeof spirits !== 'undefined' && document.getElementById('stat-count')) {
            document.getElementById('stat-count').innerText = spirits.length;
        }
        
        // 统计文章数量 (新闻 + 攻略)
        if (document.getElementById('stat-article')) {
            const totalArticles = (typeof newsData !== 'undefined' ? newsData.length : 0) 
                                + (typeof guideData !== 'undefined' ? guideData.length : 0);
            document.getElementById('stat-article').innerText = totalArticles;
        }
    },

    // ================= 图鉴逻辑 =================
    initDex: function() {
        this.currentFilteredList = typeof spirits !== 'undefined' ? spirits : [];
        this.renderDexList(this.currentFilteredList);
    },

    renderDexList: function(data) {
        const listContainer = document.getElementById('dex-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        data.forEach((mon) => {
            const item = document.createElement('div');
            item.className = 'dex-item';
            
            // 优化：添加 loading="lazy" 和 decoding="async"
            const iconHtml = `<img src="assets/spirits/${mon.id}.png" class="dex-item-img" 
                                   alt="${mon.name}" 
                                   loading="lazy"
                                   decoding="async"
                                   onload="this.style.opacity=1"
                                   style="object-fit: contain; background: #fff; opacity:0; transition:opacity 0.3s;" 
                                   onerror="this.src='assets/none.png';this.style.opacity=1;">`; 
            
            item.innerHTML = `
                ${iconHtml}
                <div class="dex-item-info">
                    <div>
                        <div style="font-size:10px; color:#999;">NO.${mon.id}</div>
                        <div class="dex-item-name">${mon.name}</div>
                    </div>
                </div>`;
            
            item.onclick = () => this.selectDexItem(mon, item);
            listContainer.appendChild(item);
        });
    },

    filterDex: function() {
        const search = document.getElementById('dexSearch').value.toLowerCase();
        const filter = document.getElementById('dexFilter').value;
        if(typeof spirits === 'undefined') return;

        this.currentFilteredList = spirits.filter(s => {
            const matchName = s.name.toLowerCase().includes(search) || s.id.includes(search);
            const matchType = filter === 'all' || s.el.includes(filter);
            return matchName && matchType;
        });
        
        this.renderDexList(this.currentFilteredList);
    },

    selectDexItem: function(mon, domElement, animate = true) {
        this.currentSpiritIndex = this.currentFilteredList.indexOf(mon);

        document.querySelectorAll('.dex-item').forEach(el => el.classList.remove('active'));
        if (domElement) {
            domElement.classList.add('active');
        } else {
            const items = document.getElementById('dex-list').children;
            for (let item of items) {
                if (item.innerHTML.includes(`NO.${mon.id}`)) {
                    item.classList.add('active');
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    break;
                }
            }
        }

        const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerHTML = val; };
        setTxt('detail-id', mon.id);
        setTxt('detail-name', mon.name);
        setTxt('detail-desc', mon.desc || "暂无描述");
        
        // 渲染属性图标
        const elIconContainer = document.getElementById('detail-element');
        if(elIconContainer) {
            const types = mon.el.split(/、| /); 
            elIconContainer.innerHTML = types.map(type => {
                const icon = this.getElementIcon(type);
                return `<div title="点击筛选${type}系" onclick="app.filterByAttribute('${type}')" style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; background:#fff; border-radius:10px; box-shadow:0 3px 8px rgba(0,0,0,0.1); cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${icon}</div>`;
            }).join('');
        }
        
        // 加载高清大图
        const bigImg = document.getElementById('detail-img');
        if (bigImg) {
            bigImg.style.opacity = '0';
            bigImg.src = `assets/spirits/${mon.id}.png`; 
            bigImg.onload = function() { this.style.opacity = '1'; };
            bigImg.onerror = function() { this.src = 'assets/none.png'; this.style.opacity = '1'; };
        }

        // 工作适应性
        const workContainer = document.getElementById('detail-work');
        if(workContainer) {
            workContainer.innerHTML = (mon.tags || []).map(t => `<div class="work-item">${t}</div>`).join('') || '<div class="work-item" style="color:#999">无</div>';
        }

        // 评价
        const reviewContainer = document.getElementById('detail-drops');
        if(reviewContainer) {
            const reviewText = mon.review ? mon.review : "暂无锐评";
            reviewContainer.innerHTML = `<div style="font-size:14px; color:#555; font-style:italic; line-height:1.5;">“${reviewText}”</div>`;
        }

        this.renderDualRelations(mon.el);

        // 手机端动画逻辑
        const content = document.getElementById('detail-content');
        if(content) content.style.display = 'grid';
        const emptyState = document.querySelector('.dex-detail-card .empty-state');
        if(emptyState) emptyState.style.display = 'none';

        if (animate && window.innerWidth <= 768) {
            const layout = document.querySelector('.dex-layout-container');
            if(layout) layout.classList.add('show-detail');
        }
    },

    filterByAttribute: function(type) {
        if(!type) return;
        const select = document.getElementById('dexFilter');
        if(select) {
            select.value = type;
            if (select.value !== type && type === '一般') select.value = '无';
            this.filterDex();
        }
    },

    renderDualRelations: function(elString) {
        const relationContainer = document.getElementById('detail-relation-area');
        if (!relationContainer) return;

        const myTypes = elString.split(/、| /);
        let strongAgainst = new Set(); 
        let weakAgainst = new Set();   

        myTypes.forEach(myType => {
            if (RELATION_MAP[myType]) strongAgainst.add(RELATION_MAP[myType]);
            for (const [attacker, defender] of Object.entries(RELATION_MAP)) {
                if (defender === myType) weakAgainst.add(attacker);
            }
        });

        const renderBadges = (title, typeSet, color) => {
            if (typeSet.size === 0) return '';
            const badges = Array.from(typeSet).map(type => {
                const icon = this.getElementIcon(type);
                return `<div title="点击筛选${type}系" onclick="app.filterByAttribute('${type}')" style="display:inline-flex; align-items:center; gap:4px; background:#fff; padding:4px 10px; border-radius:15px; border:1px solid ${color}; font-size:12px; color:${color}; font-weight:bold; margin-right:5px; margin-bottom:5px; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <span style="display:flex; width:16px;">${icon}</span> ${type}
                </div>`;
            }).join('');
            
            return `<div style="margin-bottom:10px;">
                <div style="font-size:12px; color:#888; margin-bottom:5px;">${title}</div>
                <div style="display:flex; flex-wrap:wrap;">${badges}</div>
            </div>`;
        };

        relationContainer.innerHTML = `
            <div style="background:rgba(255,255,255,0.5); padding:15px; border-radius:12px; border:1px solid rgba(0,0,0,0.05);">
                ${renderBadges('<i class="fa-solid fa-gavel"></i> 克制属性', strongAgainst, '#e67e22')}
                ${strongAgainst.size > 0 && weakAgainst.size > 0 ? '<div style="height:1px; background:rgba(0,0,0,0.05); margin:8px 0;"></div>' : ''}
                ${renderBadges('<i class="fa-solid fa-shield-cat"></i> 被克属性', weakAgainst, '#c0392b')}
            </div>
        `;
    },

    switchSpirit: function(direction) {
        if (this.currentFilteredList.length === 0) return;
        let newIndex = this.currentSpiritIndex + direction;
        if (newIndex < 0) newIndex = this.currentFilteredList.length - 1;
        if (newIndex >= this.currentFilteredList.length) newIndex = 0;
        const nextSpirit = this.currentFilteredList[newIndex];
        if (nextSpirit) this.selectDexItem(nextSpirit, null, false);
    },

    jumpToLocation: function() {
        const currentSpirit = this.currentFilteredList[this.currentSpiritIndex];
        if (!currentSpirit) return alert("请先选择一只啾灵！");
        switchView('map');
        setTimeout(() => {
            if (window.highlightMapSpirit) window.highlightMapSpirit(currentSpirit.name);
            else alert("地图模块正在初始化，请稍后再试...");
        }, 300);
    },

    // ================= 文章加载逻辑 =================
    loadNews: function(url) {
        if(!url || url === '#') return;
        const container = document.getElementById('news-content-area');
        container.innerHTML = '<div style="text-align:center; padding:80px 0; color:#999;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i><br>正在读取卷宗...</div>';
        switchView('news-view');

        fetch(url).then(r => r.ok ? r.text() : Promise.reject())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const content = doc.querySelector('.article-wrapper');
                if(content) {
                    container.innerHTML = ''; 
                    container.appendChild(content);
                    document.getElementById('news-view').scrollTop = 0;
                } else {
                    container.innerHTML = '<p style="text-align:center;">内容解析失败。</p>';
                }
            })
            .catch(() => container.innerHTML = '<p style="text-align:center;">读取失败，请检查文件路径。</p>');
    },

    closeNews: function() {
        switchView('home'); 
        setTimeout(() => {
            const container = document.getElementById('news-content-area');
            if(container) container.innerHTML = '';
        }, 500); 
    },

    // ================= 社区展示逻辑 (替代融合) =================
    initShowcase: function() {
        this.renderShowcase();
    },

    renderShowcase: function() {
        const container = document.getElementById('showcase-list');
        if (!container || typeof SHOWCASE_DATA === 'undefined') return;

        if (SHOWCASE_DATA.length === 0) {
            container.innerHTML = '';
            document.getElementById('showcase-empty').style.display = 'block';
            return;
        }

        container.innerHTML = SHOWCASE_DATA.map(item => `
            <div class="showcase-card">
                <div class="card-img-box">
                    <img src="${item.image}" alt="${item.title}" loading="lazy">
                    <div class="card-user-tag">
                        <i class="fa-solid fa-user"></i> ${item.user}
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-title">${item.title}</div>
                    <div class="card-desc">${item.desc}</div>
                    <div class="card-footer">
                        <div class="contact-box" onclick="app.copyContact('${item.contact}')">
                            <i class="fa-regular fa-comment-dots"></i> 联系TA
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    copyContact: function(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert(`联系方式 [${text}] 已复制到剪贴板！`);
            }).catch(() => {
                alert(`联系方式: ${text}`);
            });
        } else {
            alert(`请手动复制联系方式: ${text}`);
        }
    },

    // ================= 天工造物逻辑 (重构版) =================
    
    // 渲染工坊（筛选+更新角标）
    renderCraft: function() {
        this.filterCraft(); 
        this.updateCartBadge();
    },

    // 模式切换（含手机端布局控制）
    switchCraftMode: function(mode) {
        document.querySelectorAll('.c-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('c-tab-' + mode).classList.add('active');
        
        document.querySelectorAll('.craft-view-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('view-craft-' + mode).classList.add('active');
        
        // 手机端布局控制
        const layout = document.querySelector('.craft-layout');
        if (mode === 'cart') {
            layout.classList.add('mode-cart'); // 购物车模式：隐藏列表，全屏显示右侧
            layout.classList.remove('show-detail'); // 重置详情状态
            this.renderCartView();
        } else {
            layout.classList.remove('mode-cart'); // 搜索模式：恢复列表
            layout.classList.remove('show-detail'); // 默认回列表
        }
    },

    // 筛选与列表渲染 (分组+折叠+图标)
    filterCraft: function() {
        const search = document.getElementById('craftSearch').value.toLowerCase();
        const container = document.getElementById('recipe-list');
        if(!container || typeof RECIPE_DB === 'undefined') return;

        container.innerHTML = '';
        
        // 1. 数据准备
        const list = Object.keys(RECIPE_DB).map(key => ({name: key, ...RECIPE_DB[key]}));
        
        // 2. 分组
        const groups = {};
        list.forEach(item => {
            if(search && !item.name.toLowerCase().includes(search) && !item.type.includes(search)) return;
            if(!groups[item.type]) groups[item.type] = [];
            groups[item.type].push(item);
        });

        // 3. 渲染
        const isSearching = search.length > 0;
        Object.keys(groups).forEach(type => {
            const items = groups[type];
            if(items.length === 0) return;

            const catWrapper = document.createElement('div');
            
            // 分类标题
            const header = document.createElement('div');
            header.className = `craft-cat-header ${isSearching ? 'active' : ''}`;
            header.innerHTML = `<span>${type} <span style="font-size:10px; color:#999; font-weight:normal;">(${items.length})</span></span> <i class="fa-solid fa-chevron-right"></i>`;
            
            // 列表容器
            const listDiv = document.createElement('div');
            listDiv.className = `craft-cat-list ${isSearching ? 'active' : ''}`;

            header.onclick = () => {
                header.classList.toggle('active');
                listDiv.classList.toggle('active');
            };

            // 列表项
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'craft-item';
                // 使用 assets/items/ 下的图标，失败则用默认
                div.innerHTML = `
                    <img src="assets/items/${item.name}.png" class="item-icon-sm" onerror="this.src='assets/orb.png'"> 
                    <div style="flex:1;">
                        <div style="font-weight:bold; color:var(--primary)">${item.name}</div>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color:#ccc; font-size:10px;"></i>
                `;
                
                div.onclick = () => { 
                    app.switchCraftMode('lookup'); 
                    app.selectCraftItem(item.name);
                    // 高亮处理
                    document.querySelectorAll('.craft-item').forEach(el => el.classList.remove('active'));
                    div.classList.add('active');
                };
                listDiv.appendChild(div);
            });

            catWrapper.appendChild(header);
            catWrapper.appendChild(listDiv);
            container.appendChild(catWrapper);
        });

        if(Object.keys(groups).length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">未找到相关配方</div>';
        }
    },

    // 选中物品详情
    selectCraftItem: function(name) {
        currentCraftItem = name;
        document.querySelector('.empty-state-craft').style.display = 'none';
        document.getElementById('craft-detail-content').style.display = 'block';
        
        // 头部详情填充 (带大图标)
        const data = RECIPE_DB[name];
        const headerContainer = document.querySelector('.blueprint-header');
        const yieldTag = data.yield > 1 ? `<span class="bp-tag warning">产量: ${data.yield}</span>` : '';
        
        headerContainer.innerHTML = `
            <img src="assets/items/${name}.png" class="item-icon-lg" onerror="this.src='assets/orb.png'">
            <div>
                <h2 style="margin:0; color:var(--primary); font-size:20px;">${name}</h2>
                <div style="margin-top:5px;">
                    <span class="bp-tag">${data.type}</span>
                    ${yieldTag}
                </div>
            </div>
        `;

        document.getElementById('calc-qty').value = 1;
        this.calcCraftMaterials();

        // 手机端：触发滑入动画
        if (window.innerWidth <= 768) {
            document.querySelector('.craft-layout').classList.add('show-detail');
        }
    },

    // 手机端关闭详情页
    closeCraftDetail: function() {
        document.querySelector('.craft-layout').classList.remove('show-detail');
    },

    // 计算材料
    updateCraftCalc: function(delta) {
        const input = document.getElementById('calc-qty');
        let val = parseInt(input.value) + delta;
        if(val < 1) val = 1;
        input.value = val;
        this.calcCraftMaterials();
    },

    calcCraftMaterials: function() {
        if(!currentCraftItem) return;
        const qty = parseInt(document.getElementById('calc-qty').value);
        const rawTotals = {};
        this.recursiveGetRaw(currentCraftItem, qty, rawTotals);
        // 渲染单件材料网格
        document.getElementById('raw-mat-list').innerHTML = this.renderMatGrid(rawTotals);
        // 渲染合成树
        document.getElementById('tree-container').innerHTML = this.renderTreeHTML(currentCraftItem, qty);
    },

    // 渲染材料格子 (带图标)
    renderMatGrid: function(matData) {
        return Object.entries(matData).map(([name, count]) => `
            <div class="mat-card">
                <div class="mat-icon">
                    <img src="assets/items/${name}.png" class="mat-icon-img" onerror="this.src='assets/orb.png'">
                </div>
                <div class="mat-qty">${Math.ceil(count)}</div> 
                <div class="mat-name">${name}</div>
            </div>`).join('');
    },

    // 渲染合成树 (支持点击折叠)
    renderTreeHTML: function(itemName, needQty, depth = 0) {
        const isBasic = BASIC_MATS.has(itemName) || !RECIPE_DB[itemName];
        const qtyDisplay = Number(needQty).toFixed(1).replace(/\.0$/, ''); 
        
        // 图标与点击事件
        const clickAction = isBasic ? '' : `onclick="app.toggleTreeNode(this)"`;
        const iconClass = isBasic ? 'hidden' : ''; 
        const contentType = isBasic ? 'basic' : 'inter';

        let html = `<div class="tree-node">
            <div class="tree-node-self node-content ${contentType}" ${clickAction}>
                <i class="fa-solid fa-caret-down tree-toggle-icon ${iconClass}"></i>
                <span style="font-weight:bold; margin-right:5px;">${qtyDisplay}</span>
                ${itemName}
            </div>`;

        if(!isBasic) {
            const recipe = RECIPE_DB[itemName];
            const craftTimes = needQty / recipe.yield;
            
            // 子节点容器 (默认展开)
            html += `<div class="tree-children">`;
            for(let [matName, matQty] of Object.entries(recipe.mat)) {
                html += app.renderTreeHTML(matName, matQty * craftTimes, depth + 1);
            }
            html += `</div>`;
        }

        html += `</div>`;
        return html;
    },

    // 合成树节点折叠逻辑
    toggleTreeNode: function(element) {
        element.classList.toggle('collapsed');
        const childrenContainer = element.nextElementSibling;
        if(childrenContainer && childrenContainer.classList.contains('tree-children')) {
            childrenContainer.classList.toggle('collapsed');
        }
    },

    recursiveGetRaw: function(itemName, needQty, accumulator) {
        if(BASIC_MATS.has(itemName) || !RECIPE_DB[itemName]) {
            accumulator[itemName] = (accumulator[itemName] || 0) + needQty;
            return;
        }
        const recipe = RECIPE_DB[itemName];
        const craftTimes = needQty / recipe.yield; 
        for(let [matName, matQty] of Object.entries(recipe.mat)) {
            this.recursiveGetRaw(matName, matQty * craftTimes, accumulator);
        }
    },

    // ================= 购物车逻辑 =================
    addToCart: function() {
        if(!currentCraftItem) return;
        const qty = parseInt(document.getElementById('calc-qty').value);
        if(this.cart[currentCraftItem]) this.cart[currentCraftItem] += qty;
        else this.cart[currentCraftItem] = qty;
        this.saveCart();
        this.updateCartBadge();
        const btn = document.querySelector('.btn-add-cart');
        const orgHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> 已添加';
        setTimeout(() => btn.innerHTML = orgHtml, 1000);
    },

    renderCartView: function() {
        const listContainer = document.getElementById('cart-list-container');
        const totalContainer = document.getElementById('cart-total-mats');
        if(Object.keys(this.cart).length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; color:#999; padding:40px;">清单是空的，快去左侧添加配方吧~</div>';
            totalContainer.innerHTML = '';
            return;
        }
        let listHtml = '';
        const grandTotalRaw = {};
        for(let [name, qty] of Object.entries(this.cart)) {
            listHtml += `
                <div class="cart-row">
                    <div class="cart-row-name">${name}</div>
                    <div class="cart-row-ctrl">
                        <span style="font-size:12px; color:#888;">数量:</span>
                        <input type="number" value="${qty}" min="1" 
                            style="width:50px; text-align:center; border:1px solid #ddd; border-radius:4px; padding:2px;"
                            onchange="app.updateCartItem('${name}', this.value)">
                        <i class="fa-solid fa-trash-can cart-del-btn" onclick="app.removeCartItem('${name}')"></i>
                    </div>
                </div>`;
            this.recursiveGetRaw(name, qty, grandTotalRaw);
        }
        listContainer.innerHTML = listHtml;
        totalContainer.innerHTML = this.renderMatGrid(grandTotalRaw);
    },

    updateCartItem: function(name, newQty) {
        const q = parseInt(newQty);
        if(q <= 0) this.removeCartItem(name);
        else {
            this.cart[name] = q;
            this.saveCart();
            this.renderCartView();
        }
    },

    removeCartItem: function(name) {
        delete this.cart[name];
        this.saveCart();
        this.updateCartBadge();
        this.renderCartView();
    },

    clearCart: function() {
        if(confirm('确定清空所有清单吗？')) {
            this.cart = {};
            this.saveCart();
            this.updateCartBadge();
            this.renderCartView();
        }
    },

    saveCart: function() { localStorage.setItem('shanhai_cart_v1', JSON.stringify(this.cart)); },
    
    updateCartBadge: function() {
        const count = Object.keys(this.cart).length;
        const badge = document.getElementById('cart-badge');
        if(count > 0) { badge.style.display = 'inline-block'; badge.innerText = count; } 
        else { badge.style.display = 'none'; }
    },

    switchBpTab: function(tabName) {
        document.querySelectorAll('.bp-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.bp-view').forEach(v => v.classList.remove('active'));
        document.getElementById('tab-' + tabName).classList.add('active');
        document.getElementById('view-' + tabName).classList.add('active');
    },

    // ================= 通用辅助函数 =================
    getElementIcon: function(type) {
        if (!type) return '';
        if (typeof ELEMENT_ICONS !== 'undefined') {
            for (let k in ELEMENT_ICONS) {
                if (type.includes(k)) return ELEMENT_ICONS[k];
            }
        }
        return '<i class="fa-solid fa-circle" style="color:#ccc"></i>';
    },

    initParticles: function() {
        const canvas = document.getElementById('particle-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        resize();
        
        const p = Array.from({length: 40}, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2,
            s: Math.random() * 0.5 + 0.1
        }));

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(212, 175, 55, 0.3)";
            p.forEach(pt => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
                ctx.fill();
                pt.y -= pt.s;
                if(pt.y < 0) pt.y = canvas.height;
            });
            requestAnimationFrame(draw);
        }
        draw();
    },

    initEffects: function() {
        window.switchView = function(viewId, btn) {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');
            
            document.querySelectorAll('.view-section').forEach(el => {
                if(el.id === viewId) {
                    el.classList.add('active');
                    if(viewId === 'map' && typeof map !== 'undefined' && map) {
                        setTimeout(() => map.invalidateSize(), 200);
                    }
                } else {
                    el.classList.remove('active');
                }
            });
        };
        
        window.backToDexList = function() {
            document.querySelector('.dex-layout-container').classList.remove('show-detail');
        };

        const craftSearch = document.getElementById('craftSearch');
        if(craftSearch) craftSearch.oninput = () => this.renderCraft();

        // 鼠标跟随
        const dot = document.getElementById('cursor-dot');
        const outline = document.getElementById('cursor-outline');
        if(dot && window.innerWidth > 768) {
            window.addEventListener('mousemove', e => {
                dot.style.left = e.clientX + 'px';
                dot.style.top = e.clientY + 'px';
                outline.animate({left: e.clientX + 'px', top: e.clientY + 'px'}, {duration: 500, fill: "forwards"});
            });
        }
    },

    toggleLandscape: function() {
        if (document.documentElement.requestFullscreen && screen.orientation && screen.orientation.lock) {
            if (document.fullscreenElement) {
                document.exitFullscreen()
                    .then(() => screen.orientation.unlock())
                    .catch(err => console.log(err));
            } else {
                document.documentElement.requestFullscreen()
                    .then(() => {
                        return screen.orientation.lock("landscape");
                    })
                    .catch(err => {
                        console.warn("横屏锁定失败:", err);
                        alert("您的设备暂不支持自动强制横屏，请尝试在系统设置中开启旋转后手动横屏。");
                    });
            }
        } else {
            alert("当前浏览器不支持自动横屏控制，请手动旋转手机。");
        }
    }
};

// 禁止右键
document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.addEventListener('selectstart', function(e) { e.preventDefault(); });

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});