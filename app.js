// Persistent keys
const KEY_INV = 'yl_inventory_v2';
const KEY_ORDER = 'yl_order_v2';
const KEY_ADMIN_CFG = 'yl_admin_cfg_v1';

// DOM
const qtyEl = document.getElementById('quantity');
const lengthEl = document.getElementById('calc-length');  // Length input for L × W auto-fill
const widthEl  = document.getElementById('calc-width');   // Width input for L × W auto-fill
const sqftEl = document.getElementById('sqft');
const depthEl = document.getElementById('depth');
const depthUnitEl = document.getElementById('depth-unit');
const flyerEl = document.getElementById('flyer');
// fixed tax rate (Pennsylvania 6%) — kept in calculations but not shown in UI
const TAX_RATE = 0.06;

// --- Compaction Factor (15% settling/compression allowance) ---
const COMPACTION_FACTOR = 1.15;
const KEY_COMPACTION = 'yl_compaction_v1';
const compactionToggle = document.getElementById('compaction-toggle');
const compactionBadge  = document.getElementById('compaction-badge');
let compactionEnabled = false;
try { compactionEnabled = localStorage.getItem(KEY_COMPACTION) === 'true'; } catch(e){}
if(compactionToggle){
  compactionToggle.checked = compactionEnabled;
  if(compactionBadge) compactionBadge.style.display = compactionEnabled ? 'inline' : 'none';
}

// --- Surcharge Modifier State ---
const surchargeState = { discount: false, fuel: false, cc: false, tax: false };
const SURCHARGE_RATES = { discount: -0.10, fuel: 0.05, cc: 0.03 }; // tax uses TAX_RATE

/** Apply surcharge modifiers to a base subtotal.
 *  Order: Discount → Fuel → Tax → CC Fee (tax after discounts, CC last) */
function applySurcharges(baseSubtotal){
  let amount = baseSubtotal;
  const breakdown = [];

  // 1) Discount (−10%)
  if(surchargeState.discount){
    const disc = Math.round(amount * Math.abs(SURCHARGE_RATES.discount) * 100) / 100;
    amount -= disc;
    breakdown.push({ key:'discount', label:'−10% Discount', value: -disc });
  }
  // 2) Fuel (+5%)
  if(surchargeState.fuel){
    const fuel = Math.round(amount * SURCHARGE_RATES.fuel * 100) / 100;
    amount += fuel;
    breakdown.push({ key:'fuel', label:'+5% Fuel', value: fuel });
  }
  // 3) Tax (after discounts & fuel, before CC)
  let taxAmt = 0;
  if(surchargeState.tax){
    taxAmt = Math.round(amount * TAX_RATE * 100) / 100;
    amount += taxAmt;
    breakdown.push({ key:'tax', label:`+${(TAX_RATE*100).toFixed(0)}% Tax`, value: taxAmt });
  }
  // 4) CC Fee (+3%) — last
  if(surchargeState.cc){
    const cc = Math.round(amount * SURCHARGE_RATES.cc * 100) / 100;
    amount += cc;
    breakdown.push({ key:'cc', label:'+3% CC', value: cc });
  }
  return { finalTotal: Math.round(amount * 100) / 100, taxAmt, breakdown };
}

function hasActiveSurcharges(){ return surchargeState.discount || surchargeState.fuel || surchargeState.cc || surchargeState.tax; }

// --- Default Scoop Bucket Capacities (yd³) — used as fallback when admin hasn't configured cy ---
const DEFAULT_BUCKET_CY = { small: 0.5, medium: 0.75, large: 1.0 };
const scoopsEl = document.getElementById('scoops');
const matcostEl = document.getElementById('matcost');
const taxamtEl = document.getElementById('taxamt');
const finalEl = document.getElementById('final');
const totalNoTaxEl = document.getElementById('total-notax');
const totalTaxEl = document.getElementById('total-tax');
const grandEl = document.getElementById('grand');
const favoritesEl = document.getElementById('favorites');
const invModal = document.getElementById('inv-modal');
const openInvBtn = document.getElementById('open-inv');
const invListEl = document.getElementById('inv-list');
const saveItemBtn = document.getElementById('save-item');
const closeInvBtn = document.getElementById('close-inv');
const backInvBtn = document.getElementById('back-inv');
const btnImport = document.getElementById('btn-import');
const btnAdd = document.getElementById('btn-add');
const importPanel = document.getElementById('import-panel');
const importText = document.getElementById('import-text');
const doImport = document.getElementById('do-import');
const cancelImport = document.getElementById('cancel-import');
const editPanel = document.getElementById('edit-panel');
const removeItemBtn = document.getElementById('remove-item');
const addBulkBtn = document.getElementById('add-bulk');
const btnBulkUpload = document.getElementById('btn-bulk-upload');
const bulkFile = document.getElementById('bulk-file');
const bulkPanel = document.getElementById('bulk-panel');
const bulkPreview = document.getElementById('bulk-preview');
const confirmBulk = document.getElementById('confirm-bulk');
const cancelBulk = document.getElementById('cancel-bulk');
const orderListEl = document.getElementById('order-list');
const addOrderBtn = document.getElementById('add-order');
const clearOrderBtn = document.getElementById('clear-order');
const searchEl = document.getElementById('search');
const invSearchEl = document.getElementById('inv-search');
const newOrderBtn = document.getElementById('new-order');
const deliveryEl = document.getElementById('delivery');
const clearInvModal = document.getElementById('clear-inv-modal');
const clearInvYesBtn = document.getElementById('clear-inv-yes');
const clearInvNoBtn = document.getElementById('clear-inv-no');

const outMaterialEl = document.getElementById('out-material');
const outScoopEl = document.getElementById('out-scoop');
const outSqftEl = document.getElementById('out-sqft');
const outDepthEl = document.getElementById('out-depth');
const outCyEl = document.getElementById('out-cy');
const outPriceScoopEl = document.getElementById('out-price-scoop');
const outWeightEl = document.getElementById('out-weight');
const outDensityEl = document.getElementById('out-density');

const adminConfigModal = document.getElementById('admin-config-modal');
const adminCloseBtn = document.getElementById('admin-close');
const adminCategoryInput = document.getElementById('admin-category-input');
const adminAddCategoryBtn = document.getElementById('admin-add-category');
const adminCategoryList = document.getElementById('admin-category-list');
const adminScoopList = document.getElementById('admin-scoop-list');
const adminItemCategory = document.getElementById('admin-item-category');
const adminItemName = document.getElementById('admin-item-name');
const adminItemType = document.getElementById('admin-item-type');
const adminItemCov2in = document.getElementById('admin-item-cov2in');
const adminItemPriceSmall = document.getElementById('admin-item-price-small');
const adminItemPriceMedium = document.getElementById('admin-item-price-medium');
const adminItemPriceLarge = document.getElementById('admin-item-price-large');
const adminSaveItemBtn = document.getElementById('admin-save-item');
const adminUploadFile = document.getElementById('admin-upload-file');
const adminProcessUploadBtn = document.getElementById('admin-process-upload');

// Form fields for item
const itemName = document.getElementById('item-name');
const covEl = document.getElementById('cov');
const pSmall = document.getElementById('price-small');
const pMed = document.getElementById('price-medium');
const pLarge = document.getElementById('price-large');
const stockEl = document.getElementById('stock');

let inventory = [];
let order = [];
let selected = null;
let addedMaterialIds = []; // IDs of materials shown in Material section
let adminConfig = { categories: [], scoopDefs: {} };

// --- PWA vs Browser Mode Detection ---
// Detect if running as installed PWA (standalone) or in a normal browser tab.
// Standalone mode is set when the user installs the app via "Add to Home Screen".
const IS_PWA_MODE = (function() {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.navigator.standalone === true) return true; // iOS Safari
    if (document.referrer.includes('android-app://')) return true; // Android TWA
    return false;
  } catch (e) {
    console.warn('[YL] PWA detection error:', e);
    return false;
  }
})();
console.log('[YL] Running in ' + (IS_PWA_MODE ? 'PWA (standalone)' : 'Browser') + ' mode.');

const KEY_ADDED_MATS = 'yl_added_materials_v1';
function saveAddedMats(){ localStorage.setItem(KEY_ADDED_MATS, JSON.stringify(addedMaterialIds)); }
function loadAddedMats(){
  const raw = localStorage.getItem(KEY_ADDED_MATS);
  if(!raw){ addedMaterialIds = []; return; }
  try{
    const parsed = JSON.parse(raw);
    addedMaterialIds = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  }catch(_e){
    addedMaterialIds = [];
  }
}
const KEY_DEL = 'yl_delivery_v1';
let deliveryLocations = [];
function saveDel(){ localStorage.setItem(KEY_DEL, JSON.stringify(deliveryLocations)); }
function loadDel(){
  const raw = localStorage.getItem(KEY_DEL);
  if(!raw){ deliveryLocations = []; return; }
  try{
    const parsed = JSON.parse(raw);
    deliveryLocations = Array.isArray(parsed) ? parsed : [];
  }catch(_e){
    deliveryLocations = [];
  }
}

function saveInv(){ localStorage.setItem(KEY_INV, JSON.stringify(inventory)); }
function loadInv(){
  const raw = localStorage.getItem(KEY_INV);
  if(!raw){ initSample(); return; }
  try{
    const parsed = JSON.parse(raw);
    inventory = Array.isArray(parsed) ? parsed : [];
  }catch(_e){
    inventory = [];
    saveInv();
  }
}
function saveOrder(){ localStorage.setItem(KEY_ORDER, JSON.stringify(order)); }
function loadOrder(){
  const raw = localStorage.getItem(KEY_ORDER);
  if(!raw){ order = []; return; }
  try{
    const parsed = JSON.parse(raw);
    order = Array.isArray(parsed) ? parsed : [];
  }catch(_e){
    order = [];
    saveOrder();
  }
}

function defaultAdminConfig(){
  return {
    categories: [],
    scoopDefs: {
      small: { name: 'Small', cy: 0, wt: 0, price: 0 },
      medium: { name: 'Medium', cy: 0, wt: 0, price: 0 },
      large: { name: 'Large', cy: 0, wt: 0, price: 0 },
      custom: { name: 'Custom', cy: 0, wt: 0, price: 0 }
    }
  };
}

function normalizeAdminConfig(cfg){
  const base = defaultAdminConfig();
  const data = cfg && typeof cfg === 'object' ? cfg : {};
  const categories = Array.isArray(data.categories) ? data.categories.filter(Boolean).map(s=>String(s).trim()).filter(Boolean) : [];
  const incomingDefs = data.scoopDefs && typeof data.scoopDefs === 'object' ? data.scoopDefs : {};
  const scoopDefs = { ...base.scoopDefs };
  ['small','medium','large','custom'].forEach(size=>{
    const src = incomingDefs[size] || {};
    scoopDefs[size] = {
      name: String(src.name || base.scoopDefs[size].name),
      cy: Math.max(0, Number(src.cy) || 0),
      wt: Math.max(0, Number(src.wt) || 0),
      price: Math.max(0, Number(src.price) || 0)
    };
  });
  return { categories, scoopDefs };
}

function saveAdminConfig(){ localStorage.setItem(KEY_ADMIN_CFG, JSON.stringify(adminConfig)); }
function loadAdminConfig(){
  const raw = localStorage.getItem(KEY_ADMIN_CFG);
  if(!raw){ adminConfig = defaultAdminConfig(); return; }
  try{ adminConfig = normalizeAdminConfig(JSON.parse(raw)); }
  catch(e){ adminConfig = defaultAdminConfig(); }
}

function initSample(){ inventory = []; saveInv(); }

function id(){ return Math.random().toString(36).slice(2,9); }

// No forced inventory reset — inventory starts empty; user adds materials via Import or Add Item
function ensureInventoryUpdated(){}

function renderFavorites(filter){ favoritesEl.innerHTML='';
  const f = (filter || '').toLowerCase();
  // Only show materials that have been added to the Material section
  const addedItems = inventory.filter(it => addedMaterialIds.includes(it.id));
  const filtered = f ? addedItems.filter(it => it.name.toLowerCase().includes(f)) : addedItems;
  if(filtered.length === 0){
    const empty = document.createElement('div'); empty.style.color='var(--muted)'; empty.style.fontSize='13px'; empty.textContent= f ? 'No matching materials.' : 'No materials added yet. Use Add Material to select items.';
    favoritesEl.appendChild(empty); return;
  }
  const scoopSizeSelected = (document.querySelector('input[name="scoop"]:checked') || {value:'small'}).value;
  filtered.forEach(it=>{
    const pricesSafe = getSafePrices(it);
    const tile = document.createElement('div'); tile.className='fav-item'; tile.dataset.id = it.id;
    const h = document.createElement('h4'); h.textContent = it.name; tile.appendChild(h);
    const prices = document.createElement('div'); prices.className='prices';
    const pS = document.createElement('span'); pS.innerHTML = `<strong>Small</strong><strong>$${pricesSafe.small.toFixed(2)}</strong>`;
    const pM = document.createElement('span'); pM.innerHTML = `<strong>Medium</strong><strong>$${pricesSafe.medium.toFixed(2)}</strong>`;
    const pL = document.createElement('span'); pL.innerHTML = `<strong>Large</strong><strong>$${pricesSafe.large.toFixed(2)}</strong>`;
      // mark price strongs with .price
      const psNode = Array.from(pS.querySelectorAll('strong')).pop(); psNode.className = 'price';
      const pmNode = Array.from(pM.querySelectorAll('strong')).pop(); pmNode.className = 'price';
      const plNode = Array.from(pL.querySelectorAll('strong')).pop(); plNode.className = 'price';
      // highlight active scoop price when this item is selected
      if(selected && selected.id === it.id){
        if(scoopSizeSelected === 'small') psNode.classList.add('active-price');
        if(scoopSizeSelected === 'medium') pmNode.classList.add('active-price');
        if(scoopSizeSelected === 'large') plNode.classList.add('active-price');
      }
    prices.appendChild(pS); prices.appendChild(pM); prices.appendChild(pL); tile.appendChild(prices);
    // remove edit from tiles (editing available in Inventory modal only)
    tile.onclick = ()=>{
      selected = it;
      console.log(`[YL] Material selected: ${it.name} (id: ${it.id})`);
      compute(); renderFavorites(); highlightSelected();
    };
    favoritesEl.appendChild(tile);
  });
}

function highlightSelected(){
  Array.from(favoritesEl.children).forEach(c=> c.classList.toggle('sel', selected && c.dataset.id === selected.id));
  // Auto-set Material Type dropdown based on inferred type (user can still override)
  if(selected && materialTypeEl && materialTypeEl.value === 'auto'){
    const inferred = inferMaterialType(selected);
    // Set dropdown to matching value if available, otherwise keep auto
    if(inferred === 'mulch' || inferred === 'topsoil' || inferred === 'stone'){
      materialTypeEl.value = inferred;
    }
  }
}

function renderDelivery(){ deliveryEl.innerHTML='';
  if(deliveryLocations.length === 0){
    const empty = document.createElement('div'); empty.style.color='var(--muted)'; empty.style.fontSize='13px'; empty.textContent='No delivery locations yet.';
    deliveryEl.appendChild(empty); return;
  }
  deliveryLocations.forEach(d=>{
    const b=document.createElement('div'); b.className='ditem' + (d.active ? ' ditem-active' : '');
    b.innerHTML = `<svg class="del-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
    const lbl = document.createElement('span'); lbl.className='del-label'; lbl.textContent = d.label;
    const pr = document.createElement('span'); pr.className = 'price'; pr.textContent = `$${Number(d.price).toFixed(2)}`;
    b.appendChild(lbl); b.appendChild(pr);
    b.onclick=()=>{
      deliveryLocations.forEach(x=>x.active=false); d.active=true; saveDel();
      console.log(`[YL] Delivery selected: ${d.label} — $${Number(d.price).toFixed(2)}`);
      compute(); computeTotals(); renderOrder(); renderDelivery();
    };
    deliveryEl.appendChild(b);
  });
}

// Material Density (lbs per cubic yard) — per user specs
// Mulch: 600–800 (avg 700)  |  Topsoil: 2,200  |  Crushed Stone/Gravel: 2,700
const MATERIAL_DENSITY_LBS_PER_CY = { mulch: 700, topsoil: 2200, soil: 2200, stone: 2700, custom: 2200 };
const materialTypeEl = document.getElementById('material-type');

function toMoney(value){ return `$${(Math.round((Number(value)||0) * 100) / 100).toFixed(2)}`; }
function roundUpQuarter(value){ return Math.ceil((Math.max(0, Number(value)||0) * 4)) / 4; }
function toNonNegativeNumber(value){ const n = Number(value); return Number.isFinite(n) ? Math.max(0, n) : 0; }

function getSafePrices(item){
  const prices = item && item.prices && typeof item.prices === 'object' ? item.prices : {};
  return {
    small: toNonNegativeNumber(prices.small),
    medium: toNonNegativeNumber(prices.medium),
    large: toNonNegativeNumber(prices.large)
  };
}

function inferMaterialType(item){
  if(item && item.materialType) return String(item.materialType).toLowerCase();
  const n = String(item && item.name || '').toLowerCase();
  if(/mulch|bark|wood/.test(n)) return 'mulch';
  if(/stone|gravel|rock|aggregate|crushed/.test(n)) return 'stone';
  if(/topsoil/.test(n)) return 'topsoil';
  if(/soil|dirt|fill/.test(n)) return 'soil';
  return 'custom';
}

function getScoopDef(size){
  const fromAdmin = adminConfig && adminConfig.scoopDefs ? adminConfig.scoopDefs[size] : null;
  const fromScov = scoopCovData && scoopCovData[size] ? scoopCovData[size] : null;
  // Use admin/scov cy if configured, otherwise fall back to default bucket capacity
  const cyVal = toNonNegativeNumber((fromAdmin && fromAdmin.cy) || (fromScov && fromScov.cy) || 0);
  return {
    name: fromAdmin && fromAdmin.name ? fromAdmin.name : (size.charAt(0).toUpperCase() + size.slice(1)),
    cy: cyVal > 0 ? cyVal : (DEFAULT_BUCKET_CY[size] || 0.75),
    wt: toNonNegativeNumber((fromAdmin && fromAdmin.wt) || (fromScov && fromScov.wt) || 0),
    price: toNonNegativeNumber((fromAdmin && fromAdmin.price) || 0)
  };
}

function getItemScoopPrice(item, scoopSize){
  const itemPrice = getSafePrices(item)[scoopSize] || 0;
  if(itemPrice > 0) return itemPrice;
  return getScoopDef(scoopSize).price;
}

function getBaseCoverage2In(item, scoopSize){
  const materialType = inferMaterialType(item);
  if(item && Number(item.cov2in) > 0) return Number(item.cov2in);
  if(item && Number(item.cov) > 0) return Number(item.cov);
  const sc = (scoopCovData && scoopCovData[scoopSize]) || {};
  if(materialType === 'stone') return toNonNegativeNumber(sc.ds);
  return toNonNegativeNumber(sc.mt);
}

function runUniversalCalculator(input){
  const sqft = toNonNegativeNumber(input.sqft);
  const qty = toNonNegativeNumber(input.qty);
  const depthIn = toNonNegativeNumber(input.depthIn);
  const depthFt = depthIn / 12;
  const requiredCubicYards = depthFt > 0 ? ((sqft * qty) * depthFt) / 27 : 0;

  const scoopCy = toNonNegativeNumber(input.scoopCy);
  const scoopsRequired = scoopCy > 0 ? roundUpQuarter(requiredCubicYards / scoopCy) : 0;

  const totalCubicYards = scoopsRequired * scoopCy;
  const coverageAtDepthSqFt = depthFt > 0 ? (totalCubicYards * 27) / depthFt : 0;

  const pricePerScoop = toNonNegativeNumber(input.pricePerScoop);
  const totalCost = Math.round((scoopsRequired * pricePerScoop) * 100) / 100;

  const estimatedWeight = toNonNegativeNumber(input.weightPerScoop) > 0
    ? scoopsRequired * toNonNegativeNumber(input.weightPerScoop)
    : totalCubicYards * toNonNegativeNumber(input.densityLbsPerCy);

  return {
    depthFt,
    requiredCubicYards,
    scoopsRequired,
    pricePerScoop,
    totalCost,
    coverageAtDepthSqFt,
    totalCubicYards,
    estimatedWeight
  };
}

function updateScoopAvailability(){
  const radios = Array.from(document.querySelectorAll('input[name="scoop"]'));
  let enabledCount = 0;
  radios.forEach(r=>{
    const hasPrice = selected ? getItemScoopPrice(selected, r.value) > 0 : false;
    r.disabled = !hasPrice;
    if(r.parentElement){ r.parentElement.style.opacity = hasPrice ? '1' : '.45'; }
    if(hasPrice) enabledCount++;
  });
  if(enabledCount === 0 && radios.length){ radios.forEach(r=>{ r.disabled = false; if(r.parentElement) r.parentElement.style.opacity = '1'; }); }
  const checked = document.querySelector('input[name="scoop"]:checked');
  if(checked && checked.disabled){
    const firstEnabled = radios.find(r=>!r.disabled);
    if(firstEnabled) firstEnabled.checked = true;
  }
}

function compute(){
  const scoopInput = (document.querySelector('input[name="scoop"]:checked') || { value: 'small' }).value;
  const qty = toNonNegativeNumber(qtyEl.value);
  const sqft = toNonNegativeNumber(sqftEl.value);
  const depthRaw = toNonNegativeNumber(depthEl.value);
  const depthIn = depthUnitEl.value === 'ft' ? depthRaw * 12 : depthRaw;

  // Length × Width auto-fill breakdown logging
  const lengthVal = toNonNegativeNumber(lengthEl ? lengthEl.value : 0);
  const widthVal  = toNonNegativeNumber(widthEl  ? widthEl.value  : 0);
  if(lengthVal > 0 && widthVal > 0){
    // Step 1: Area = Length × Width
    const computedArea = (lengthVal * widthVal).toFixed(2);
    console.log(`[YL] L×W Breakdown: ${lengthVal} ft × ${widthVal} ft = ${computedArea} sq ft`);
  }
  if(sqft > 0 && depthIn > 0){
    // Step 2: Volume = SqFt × (Depth / 12)  →  cubic feet
    const depthFt = (depthIn / 12).toFixed(4);
    const cubicFeet = (sqft * parseFloat(depthFt)).toFixed(2);
    // Step 3: Cubic Yards = Cubic Feet / 27
    const cubicYards = (parseFloat(cubicFeet) / 27).toFixed(2);
    console.log(`[YL] Volume Breakdown: ${sqft.toFixed(2)} sq ft × (${depthIn}" ÷ 12 = ${depthFt} ft) = ${cubicFeet} cu ft ÷ 27 = ${cubicYards} yd³`);
  }

  if(!selected){
    scoopsEl.textContent='0.00';
    matcostEl.textContent='$0.00';
    taxamtEl.textContent='$0.00';
    finalEl.textContent='$0.00';
    if(outMaterialEl) outMaterialEl.textContent='—';
    if(outScoopEl) outScoopEl.textContent='—';
    if(outSqftEl) outSqftEl.textContent='0.00 sq ft';
    if(outDepthEl) outDepthEl.textContent='0.00 in';
    if(outCyEl) outCyEl.textContent='0.00 yd³';
    if(outPriceScoopEl) outPriceScoopEl.textContent='$0.00';
    if(outWeightEl) outWeightEl.textContent='—';
    if(outDensityEl) outDensityEl.textContent='—';
    console.log('[YL] compute() — No material selected, display reset.');
    return;
  }

  updateScoopAvailability();
  const scoopSize = (document.querySelector('input[name="scoop"]:checked') || { value: scoopInput }).value;
  const scoopDef = getScoopDef(scoopSize);
  // Material type: use dropdown override if set, otherwise auto-detect from item name
  const dropdownType = materialTypeEl ? materialTypeEl.value : 'auto';
  const materialType = dropdownType !== 'auto' ? dropdownType : inferMaterialType(selected);
  const densityLbsPerCy = MATERIAL_DENSITY_LBS_PER_CY[materialType] || MATERIAL_DENSITY_LBS_PER_CY.custom;
  const pricePerScoop = getItemScoopPrice(selected, scoopSize);

  // Get coverage from saved Edit Scoop/Coverage values
  const baseCoverage2In = getBaseCoverage2In(selected, scoopSize);

  // --- Multi-mode calculation: quantity considers scoops, scoop size, sqft, and depth ---
  let scoopsResult = 0, costResult = 0, cubicYardsResult = 0, weightResult = 0, calcMode = 'none';
  // Base (pre-compaction) cubic yards for display
  let baseCubicYards = 0;

  try {
    if (sqft > 0 && depthIn > 0 && scoopDef.cy > 0) {
      // Mode A: Volume-based (sqft + depth provided)
      // Step 1: Area = SqFt (already computed from L×W or manual entry)
      // Step 2: CubicFeet = SqFt × (Depth / 12)
      // Step 3: BaseYards = CubicFeet / 27
      const calc = runUniversalCalculator({ sqft, qty: Math.max(1, qty), depthIn, scoopCy: scoopDef.cy, pricePerScoop, weightPerScoop: scoopDef.wt, densityLbsPerCy });
      baseCubicYards = calc.requiredCubicYards;

      // Apply 15% compaction factor if enabled: FinalYards = BaseYards × 1.15
      const finalYards = compactionEnabled ? baseCubicYards * COMPACTION_FACTOR : baseCubicYards;
      // Scoops = FinalYards / bucketCapacity, rounded up with Math.ceil (can't buy half a scoop)
      scoopsResult = scoopDef.cy > 0 ? Math.ceil(finalYards / scoopDef.cy) : 0;
      cubicYardsResult = finalYards;
      costResult = Math.round(scoopsResult * pricePerScoop * 100) / 100;
      weightResult = scoopDef.wt > 0 ? scoopsResult * scoopDef.wt : cubicYardsResult * densityLbsPerCy;
      calcMode = 'volume';
      console.log(`[YL] Volume calc: ${(sqft * Math.max(1,qty)).toFixed(2)} sq ft × ${depthIn}" depth → base ${baseCubicYards.toFixed(4)} yd³${compactionEnabled ? ' × 1.15 = ' + finalYards.toFixed(4) + ' yd³ (compacted)' : ''} → ${scoopsResult} scoops (${scoopSize}, bucket=${scoopDef.cy} yd³)`);

    } else if (sqft > 0 && depthIn === 0 && baseCoverage2In > 0) {
      // Mode B: Coverage-based (sqft only)
      const effectiveQty = Math.max(1, qty);
      const rawScoops = (sqft * effectiveQty) / baseCoverage2In;
      baseCubicYards = rawScoops * scoopDef.cy;
      // Apply compaction factor to cubic yards, then recalculate scoops
      const finalYards = compactionEnabled ? baseCubicYards * COMPACTION_FACTOR : baseCubicYards;
      scoopsResult = scoopDef.cy > 0 ? Math.ceil(finalYards / scoopDef.cy) : Math.ceil(rawScoops);
      cubicYardsResult = finalYards;
      costResult = Math.round(scoopsResult * pricePerScoop * 100) / 100;
      weightResult = scoopDef.wt > 0 ? scoopsResult * scoopDef.wt : cubicYardsResult * densityLbsPerCy;
      calcMode = 'coverage';
      console.log(`[YL] Coverage calc: ${(sqft * effectiveQty).toFixed(2)} sq ft → base ${baseCubicYards.toFixed(4)} yd³${compactionEnabled ? ' × 1.15 = ' + finalYards.toFixed(4) + ' yd³' : ''} → ${scoopsResult} scoops`);

    } else if (qty > 0 && sqft === 0 && depthIn === 0) {
      // Mode C: Direct scoops — quantity = number of scoops requested
      scoopsResult = qty;
      baseCubicYards = scoopsResult * scoopDef.cy;
      cubicYardsResult = baseCubicYards; // No compaction on direct scoops
      costResult = Math.round(scoopsResult * pricePerScoop * 100) / 100;
      weightResult = scoopDef.wt > 0 ? scoopsResult * scoopDef.wt : cubicYardsResult * densityLbsPerCy;
      calcMode = 'direct-scoops';
      console.log(`[YL] Direct scoops: qty=${qty} → ${scoopsResult} ${scoopSize} scoops, $${pricePerScoop.toFixed(2)}/scoop`);

    } else {
      // Fallback: run universal calculator
      const calc = runUniversalCalculator({ sqft, qty, depthIn, scoopCy: scoopDef.cy, pricePerScoop, weightPerScoop: scoopDef.wt, densityLbsPerCy });
      baseCubicYards = calc.requiredCubicYards;
      const finalYards = compactionEnabled ? baseCubicYards * COMPACTION_FACTOR : baseCubicYards;
      scoopsResult = scoopDef.cy > 0 ? Math.ceil(finalYards / scoopDef.cy) : calc.scoopsRequired;
      cubicYardsResult = finalYards;
      costResult = Math.round(scoopsResult * pricePerScoop * 100) / 100;
      weightResult = calc.estimatedWeight;
      calcMode = 'default';
      console.log(`[YL] Default calc: scoops=${scoopsResult}, cost=$${costResult.toFixed(2)}`);
    }
  } catch (err) {
    console.error('[YL] Calculation error:', err);
    scoopsResult = 0; costResult = 0; cubicYardsResult = 0; baseCubicYards = 0; weightResult = 0; calcMode = 'error';
  }

  const adjustedCoverage = depthIn > 0 ? baseCoverage2In * (2 / depthIn) : baseCoverage2In;

  // Debug summary log for every compute cycle
  console.log(`[YL] compute() — Material: ${selected.name}, Scoop: ${scoopSize}, Mode: ${calcMode}, Qty: ${qty}, SqFt: ${sqft}, Depth: ${depthIn}in, BaseYd³: ${baseCubicYards.toFixed(2)}, Compaction: ${compactionEnabled ? 'ON (+15%)' : 'OFF'}, FinalYd³: ${cubicYardsResult.toFixed(2)}, Bucket: ${scoopDef.cy} yd³, Scoops: ${scoopsResult}, Cost: $${costResult.toFixed(2)}`);

  const flyer = toNonNegativeNumber(flyerEl.value);
  const activeDel = deliveryLocations.find(d=>d.active);
  const delivery = activeDel ? toNonNegativeNumber(activeDel.price) : 0;
  const subtotal = costResult + flyer + delivery;

  // Apply surcharge modifiers if active, otherwise use legacy tax
  let taxAmt, final;
  if(hasActiveSurcharges()){
    const sur = applySurcharges(subtotal);
    taxAmt = sur.taxAmt;
    final = sur.finalTotal;
  } else {
    taxAmt = Math.round(subtotal * TAX_RATE * 100) / 100;
    final = Math.round((subtotal + taxAmt) * 100) / 100;
  }

  // Use Math.ceil for scoop display — can't buy half a scoop at most yards
  scoopsEl.textContent = scoopsResult;
  matcostEl.textContent = toMoney(costResult);
  taxamtEl.textContent = toMoney(taxAmt);
  finalEl.textContent = toMoney(final);

  if(outMaterialEl) outMaterialEl.textContent = selected.name || '—';
  if(outScoopEl) outScoopEl.textContent = `${scoopDef.name} (${scoopSize})`;
  if(outSqftEl) outSqftEl.textContent = `${(sqft * Math.max(1, qty)).toFixed(2)} sq ft`;
  if(outDepthEl) outDepthEl.textContent = `${depthIn.toFixed(2)} in`;
  // Show base yards and final yards separately when compaction is active
  const outBaseCyEl  = document.getElementById('out-base-cy');
  const outFinalCyEl = document.getElementById('out-final-cy');
  const outFinalCyRow = document.getElementById('out-final-cy-row');
  const outBucketEl   = document.getElementById('out-bucket');
  if(outBaseCyEl)  outBaseCyEl.textContent  = `${baseCubicYards.toFixed(2)} yd³`;
  if(outFinalCyRow) outFinalCyRow.style.display = compactionEnabled ? '' : 'none';
  if(outFinalCyEl) outFinalCyEl.textContent = `${cubicYardsResult.toFixed(2)} yd³`;
  if(outCyEl) outCyEl.textContent = `${cubicYardsResult.toFixed(2)} yd³`;
  if(outBucketEl) outBucketEl.textContent = `${scoopDef.cy} yd³ / scoop (${scoopSize})`;
  if(outPriceScoopEl) outPriceScoopEl.textContent = toMoney(pricePerScoop);
  // Density & Weight display — lbs + tons, .toFixed(2) for clean professional look
  if(outDensityEl) outDensityEl.textContent = `${densityLbsPerCy.toLocaleString()} lbs/yd³ (${materialType})`;
  const weightTons = weightResult / 2000;
  if(outWeightEl) outWeightEl.textContent = weightResult > 0 ? `${weightResult.toFixed(2)} lbs (${weightTons.toFixed(2)} tons)` : '—';

  totalNoTaxEl.textContent = toMoney(subtotal);
  totalTaxEl.textContent = toMoney(taxAmt);
  grandEl.textContent = toMoney(final);

  scoopsEl.title = `${calcMode} mode • Bucket: ${scoopDef.cy} yd³ • Coverage @ depth: ${adjustedCoverage.toFixed(2)} sq ft/scoop${compactionEnabled ? ' • +15% compaction' : ''}`;
}

function openInv(){ invModal.style.display='flex'; renderInvList(); }
function closeInv(){ invModal.style.display='none'; }

function renderInvList(filter=''){ invListEl.innerHTML='';
  // smart, tokenized search: split input into tokens and require all tokens be present
  const q = (filter||'').toLowerCase().trim();
  const tokens = q ? q.split(/\s+/) : [];
  inventory.filter(i=>{
    // always show every item (including archived) in the inventory modal
    if(!tokens.length) return true;
    const searchable = `${i.name} ${i.cov} ${i.prices && i.prices.small} ${i.prices && i.prices.medium} ${i.prices && i.prices.large}`.toLowerCase();
    return tokens.every(t=> searchable.includes(t));
  }).forEach(it=>{
    const pricesSafe = getSafePrices(it);
    const d=document.createElement('div'); d.className='inv-item';
    const title = document.createElement('div'); title.className='inv-title'; title.textContent = it.name;
    const prices = document.createElement('div'); prices.className='inv-prices';
    prices.innerHTML = `
      <div>Price Small: <span class="price">$${pricesSafe.small.toFixed(2)}</span></div>
      <div>Price Medium: <span class="price">$${pricesSafe.medium.toFixed(2)}</span></div>
      <div>Price Large: <span class="price">$${pricesSafe.large.toFixed(2)}</span></div>
    `;
    d.appendChild(title); d.appendChild(prices);
    d.onclick=()=>{ selected=it; compute(); highlightSelected(); closeInv(); };
    const edit=document.createElement('button'); edit.textContent='Edit'; edit.onclick=(e)=>{ e.stopPropagation(); loadToForm(it); editPanel.style.display='block'; importPanel.style.display='none'; };
    d.appendChild(edit);
    invListEl.appendChild(d);
  });
}

function loadToForm(it){
  const pricesSafe = getSafePrices(it);
  itemName.value=it.name;
  covEl.value=it.cov;
  pSmall.value=pricesSafe.small;
  pMed.value=pricesSafe.medium;
  pLarge.value=pricesSafe.large;
  stockEl.value=it.stock;
  saveItemBtn.onclick = ()=>{
    it.name = itemName.value || it.name;
    it.cov2in = toNonNegativeNumber(covEl.value);
    it.cov = it.cov2in;
    it.prices = {
      small: toNonNegativeNumber(pSmall.value),
      medium: toNonNegativeNumber(pMed.value),
      large: toNonNegativeNumber(pLarge.value)
    };
    it.stock = toNonNegativeNumber(stockEl.value);
    saveInv(); renderInvList(); renderFavorites(); clearForm();
  };
}

// Wire remove/add-bulk when editing
if(removeItemBtn) removeItemBtn.onclick = ()=>{
  // find if form currently corresponds to an item
  const name = itemName.value;
  const it = inventory.find(x=>x.name === name);
  if(!it) return alert('No matching item loaded to remove. Use Edit to load the item first.');
  if(!confirm('Remove "'+it.name+'" from inventory?')) return;
  inventory = inventory.filter(x=>x.id !== it.id);
  saveInv(); renderInvList(); renderFavorites(); closeInv();
};
if(addBulkBtn) addBulkBtn.onclick = ()=>{
  const name = itemName.value;
  const it = inventory.find(x=>x.name === name);
  if(!it) return alert('No matching item loaded to add bulk. Use Edit to load the item first.');
  const n = Number(prompt('Add how many to stock for '+it.name+'?', '10')) || 0;
  it.stock = (Number(it.stock)||0) + n;
  saveInv(); renderInvList(); renderFavorites(); alert('Added '+n+' to stock. New stock: '+it.stock);
};

function clearForm(){ itemName.value=''; covEl.value=''; pSmall.value=''; pMed.value=''; pLarge.value=''; stockEl.value=''; saveItemBtn.onclick = saveNewItem; }

/**
 * Clears inventory-related state and persists the empty state.
 * Keeps order and totals state intact while removing all inventory records.
 */
function clearInventoryData(){
  inventory = [];
  addedMaterialIds = [];
  selected = null;
  saveInv();
  saveAddedMats();
}

/**
 * Resets inventory-related UI after a clear action.
 * Refreshes lists, clears search/form inputs, and recomputes displayed values safely.
 */
function resetInventoryUIAfterClear(){
  if(invSearchEl) invSearchEl.value = '';
  if(searchEl) searchEl.value = '';
  clearForm();
  renderInvList();
  renderFavorites();
  compute();
  computeTotals();
}

/**
 * Handles user confirmation flow and safely clears the entire inventory list.
 * Opens a custom confirmation modal to prevent accidental deletion.
 */
function handleClearInventoryList(){
  if(clearInvModal) clearInvModal.style.display = 'flex';
}

/**
 * Closes the clear inventory confirmation modal.
 */
function closeClearInventoryModal(){
  if(clearInvModal) clearInvModal.style.display = 'none';
}

/**
 * Executes clear-inventory action after user explicitly confirms by clicking Yes.
 */
function confirmClearInventoryList(){
  closeClearInventoryModal();
  if(!Array.isArray(inventory) || inventory.length === 0){
    alert('Inventory list is already empty.');
    return;
  }
  clearInventoryData();
  resetInventoryUIAfterClear();
  alert('Inventory list cleared successfully.');
}

function saveNewItem(){
  const it = {
    id: id(),
    name: (itemName.value || '').trim() || 'Item',
    category: 'Uncategorized',
    materialType: 'custom',
    cov2in: toNonNegativeNumber(covEl.value),
    cov: toNonNegativeNumber(covEl.value),
    prices: {
      small: toNonNegativeNumber(pSmall.value),
      medium: toNonNegativeNumber(pMed.value),
      large: toNonNegativeNumber(pLarge.value)
    },
    stock: toNonNegativeNumber(stockEl.value)
  };
  inventory.unshift(it);
  if(!addedMaterialIds.includes(it.id)) addedMaterialIds.push(it.id);
  saveInv();
  saveAddedMats();
  renderInvList();
  renderFavorites();
  clearForm();
}

function renderOrder(){ orderListEl.innerHTML='';
  // Show delivery as a line item in the order list
  const activeDel = deliveryLocations.find(d=>d.active);
  if(activeDel){
    const dli=document.createElement('li'); dli.innerHTML=`<div>Delivery: ${activeDel.label} — <span class="price">$${Number(activeDel.price).toFixed(2)}</span></div>`;
    orderListEl.appendChild(dli);
  }
  order.forEach((o,idx)=>{
  const qty = Math.max(1, parseInt(o.qty, 10) || 1);
  const scoop = o.scoop || 'small';
  const scoopQty = toNonNegativeNumber(o.qtyScoops);
  const linePrice = toNonNegativeNumber(o.price);
  const li=document.createElement('li'); li.innerHTML=`<div>${o.name} x${qty} — ${scoop} — ${scoopQty} scoops — <span class="price">$${linePrice.toFixed(2)}</span></div>`;
  const controls=document.createElement('div'); const plus=document.createElement('button'); plus.textContent='+'; plus.onclick=()=>{ order[idx].qty = Math.max(1, (parseInt(order[idx].qty, 10) || 1) + 1); saveOrder(); renderOrder(); computeTotals(); };
  const minus=document.createElement('button'); minus.textContent='-'; minus.onclick=()=>{ const nextQty = Math.max(1, parseInt(order[idx].qty, 10) || 1); if(nextQty>1) order[idx].qty = nextQty - 1; else order.splice(idx,1); saveOrder(); renderOrder(); computeTotals(); };
  controls.appendChild(plus); controls.appendChild(minus); li.appendChild(controls); orderListEl.appendChild(li);
}); }

function computeTotals(){ // recompute totals of order
  const flyer = Number(flyerEl.value)||0; const activeDel = deliveryLocations.find(d=>d.active); const delivery = activeDel ? activeDel.price : 0;
  const itemsTotal = order.reduce((s,i)=> s + i.price * i.qty, 0);
  const subtotal = itemsTotal + flyer + delivery;
  let tax, grand;
  if(hasActiveSurcharges()){
    const sur = applySurcharges(subtotal);
    tax = sur.taxAmt; grand = sur.finalTotal;
  } else {
    tax = subtotal * TAX_RATE; grand = subtotal + tax;
  }
  const totalDelEl = document.getElementById('total-delivery');
  if(totalDelEl) totalDelEl.textContent=`$${delivery.toFixed(2)}`;
  totalNoTaxEl.textContent=`$${subtotal.toFixed(2)}`; totalTaxEl.textContent=`$${tax.toFixed(2)}`; grandEl.textContent=`$${grand.toFixed(2)}`;
}

function syncAdminScoopDefsToScov(){
  ['small','medium','large'].forEach(size=>{
    const def = (adminConfig.scoopDefs && adminConfig.scoopDefs[size]) || {};
    if(!scoopCovData[size]) scoopCovData[size] = { cy: 0, wt: 0, ds: 0, mt: 0 };
    scoopCovData[size].cy = toNonNegativeNumber(def.cy);
    scoopCovData[size].wt = toNonNegativeNumber(def.wt);
  });
  saveScov();
}

function populateAdminCategorySelect(){
  if(!adminItemCategory) return;
  adminItemCategory.innerHTML = '';
  const cats = adminConfig.categories.length ? adminConfig.categories : ['Uncategorized'];
  cats.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    adminItemCategory.appendChild(opt);
  });
}

function renderAdminCategoryList(){
  if(!adminCategoryList) return;
  adminCategoryList.innerHTML = '';
  if(!adminConfig.categories.length){
    adminCategoryList.innerHTML = '<div style="color:var(--muted);font-size:13px">No categories yet.</div>';
    return;
  }
  adminConfig.categories.forEach(cat=>{
    const row = document.createElement('div');
    row.className = 'admin-list-row';
    row.innerHTML = `<span>${cat}</span>`;
    const rm = document.createElement('button');
    rm.textContent = 'Remove';
    rm.onclick = ()=>{
      adminConfig.categories = adminConfig.categories.filter(c=>c!==cat);
      saveAdminConfig();
      renderAdminCategoryList();
      populateAdminCategorySelect();
    };
    row.appendChild(rm);
    adminCategoryList.appendChild(row);
  });
}

function renderAdminScoopList(){
  if(!adminScoopList) return;
  adminScoopList.innerHTML = '';
  ['small','medium','large','custom'].forEach(size=>{
    const def = adminConfig.scoopDefs[size] || { name: size, cy: 0, wt: 0, price: 0 };
    const row = document.createElement('div');
    row.className = 'admin-list-row';
    row.innerHTML = `<span style="min-width:80px">${def.name}</span>`;

    const cy = document.createElement('input');
    cy.type = 'number'; cy.min='0'; cy.step='0.01'; cy.value = def.cy;
    cy.style.width = '90px';
    const wt = document.createElement('input');
    wt.type = 'number'; wt.min='0'; wt.step='1'; wt.value = def.wt;
    wt.style.width = '90px';
    const pr = document.createElement('input');
    pr.type = 'number'; pr.min='0'; pr.step='0.01'; pr.value = def.price;
    pr.style.width = '90px';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.onclick = ()=>{
      adminConfig.scoopDefs[size] = {
        name: def.name,
        cy: toNonNegativeNumber(cy.value),
        wt: toNonNegativeNumber(wt.value),
        price: toNonNegativeNumber(pr.value)
      };
      saveAdminConfig();
      syncAdminScoopDefsToScov();
      renderAdminScoopList();
      compute();
    };

    row.appendChild(cy); row.appendChild(wt); row.appendChild(pr); row.appendChild(saveBtn);
    adminScoopList.appendChild(row);
  });
}

function openAdminConfigModal(){
  renderAdminCategoryList();
  renderAdminScoopList();
  populateAdminCategorySelect();
  if(adminConfigModal) adminConfigModal.style.display = 'flex';
}

function closeAdminConfigModal(){ if(adminConfigModal) adminConfigModal.style.display = 'none'; }

if(adminCloseBtn) adminCloseBtn.onclick = closeAdminConfigModal;
if(adminConfigModal) adminConfigModal.addEventListener('click', (e)=>{ if(e.target === adminConfigModal) closeAdminConfigModal(); });

if(adminAddCategoryBtn) adminAddCategoryBtn.onclick = ()=>{
  const category = (adminCategoryInput && adminCategoryInput.value || '').trim();
  if(!category) return;
  if(!adminConfig.categories.includes(category)) adminConfig.categories.push(category);
  if(adminCategoryInput) adminCategoryInput.value = '';
  saveAdminConfig();
  renderAdminCategoryList();
  populateAdminCategorySelect();
};

if(adminSaveItemBtn) adminSaveItemBtn.onclick = ()=>{
  const name = (adminItemName && adminItemName.value || '').trim();
  if(!name) return alert('Enter item name.');
  const category = (adminItemCategory && adminItemCategory.value) || 'Uncategorized';
  const materialType = (adminItemType && adminItemType.value) || 'custom';
  const cov2in = toNonNegativeNumber(adminItemCov2in && adminItemCov2in.value);
  const it = {
    id: id(),
    category,
    name,
    materialType,
    cov2in,
    cov: cov2in,
    prices: {
      small: toNonNegativeNumber(adminItemPriceSmall && adminItemPriceSmall.value),
      medium: toNonNegativeNumber(adminItemPriceMedium && adminItemPriceMedium.value),
      large: toNonNegativeNumber(adminItemPriceLarge && adminItemPriceLarge.value)
    },
    stock: 0
  };
  inventory.unshift(it);
  if(!addedMaterialIds.includes(it.id)) addedMaterialIds.push(it.id);
  if(category && !adminConfig.categories.includes(category)) adminConfig.categories.push(category);
  saveInv(); saveAddedMats(); saveAdminConfig();
  renderInvList(); renderFavorites(); renderAdminCategoryList(); populateAdminCategorySelect();
  if(adminItemName) adminItemName.value='';
  if(adminItemCov2in) adminItemCov2in.value='';
  if(adminItemPriceSmall) adminItemPriceSmall.value='';
  if(adminItemPriceMedium) adminItemPriceMedium.value='';
  if(adminItemPriceLarge) adminItemPriceLarge.value='';
};

function parseAdminCsv(text){
  const lines = String(text || '').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length) return [];
  const header = lines.shift().split(',').map(h=>h.trim().toLowerCase());
  return lines.map(line=>{
    const cols = line.split(',').map(c=>c.trim());
    const map = {};
    header.forEach((h,i)=>{ map[h] = cols[i] || ''; });
    const cov2in = toNonNegativeNumber(map.coverage_2in || map.cov);
    return {
      id: id(),
      category: (map.category || 'Uncategorized').trim() || 'Uncategorized',
      name: (map.name || 'Item').trim() || 'Item',
      materialType: (map.material_type || 'custom').toLowerCase(),
      cov2in,
      cov: cov2in,
      prices: {
        small: toNonNegativeNumber(map.price_small),
        medium: toNonNegativeNumber(map.price_medium),
        large: toNonNegativeNumber(map.price_large)
      },
      stock: toNonNegativeNumber(map.stock)
    };
  });
}

if(adminProcessUploadBtn) adminProcessUploadBtn.onclick = ()=>{
  const file = adminUploadFile && adminUploadFile.files && adminUploadFile.files[0];
  if(!file) return alert('Select a JSON or CSV file.');
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const text = String(ev.target.result || '');
      const isJson = file.name.toLowerCase().endsWith('.json');
      let items = [];
      if(isJson){
        const parsed = JSON.parse(text);
        if(Array.isArray(parsed)) items = parsed;
        else if(Array.isArray(parsed.items)) items = parsed.items;
        else throw new Error('JSON must be an array or { items: [] }');
        items = items.map(raw=>{
          const cov2in = toNonNegativeNumber(raw.cov2in || raw.coverage_2in || raw.cov);
          return {
            id: id(),
            category: (raw.category || 'Uncategorized').trim() || 'Uncategorized',
            name: (raw.name || 'Item').trim() || 'Item',
            materialType: (raw.materialType || raw.material_type || 'custom').toLowerCase(),
            cov2in,
            cov: cov2in,
            prices: {
              small: toNonNegativeNumber(raw.prices && raw.prices.small || raw.price_small),
              medium: toNonNegativeNumber(raw.prices && raw.prices.medium || raw.price_medium),
              large: toNonNegativeNumber(raw.prices && raw.prices.large || raw.price_large)
            },
            stock: toNonNegativeNumber(raw.stock)
          };
        });
      } else {
        items = parseAdminCsv(text);
      }

      items.forEach(it=>{
        if(!inventory.find(x=>x.name.toLowerCase() === it.name.toLowerCase())) inventory.unshift(it);
        if(!addedMaterialIds.includes(it.id)) addedMaterialIds.push(it.id);
        if(it.category && !adminConfig.categories.includes(it.category)) adminConfig.categories.push(it.category);
      });

      saveInv(); saveAddedMats(); saveAdminConfig();
      renderInvList(); renderFavorites(); renderAdminCategoryList(); populateAdminCategorySelect();
      alert(`Imported ${items.length} item(s).`);
    } catch(err){
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
};

// --- Add Material Picker ---
const addMatModal = document.getElementById('add-mat-modal');
const addMatSearch = document.getElementById('add-mat-search');
const addMatList = document.getElementById('add-mat-list');
const addMatDone = document.getElementById('add-mat-done');

function openAddMatPicker(){
  if(addMatModal){ addMatModal.style.display='flex'; if(addMatSearch) addMatSearch.value=''; renderAddMatList(); }
}
function closeAddMatPicker(){
  if(addMatModal) addMatModal.style.display='none';
}

function renderAddMatList(filter){
  if(!addMatList) return;
  addMatList.innerHTML='';
  const f = (filter || '').toLowerCase().trim();
  const tokens = f ? f.split(/\s+/) : [];
  const items = inventory.filter(it=>{
    if(!tokens.length) return true;
    const searchable = it.name.toLowerCase();
    return tokens.every(t=> searchable.includes(t));
  });
  if(items.length === 0){
    addMatList.innerHTML='<div style="padding:14px;color:var(--muted);font-size:13px">No materials in inventory. Use Edit &gt; Edit Bulk Material to add or import materials first.</div>';
    return;
  }
  items.forEach(it=>{
    const isAdded = addedMaterialIds.includes(it.id);
    const pricesSafe = getSafePrices(it);
    const row = document.createElement('div'); row.className='add-mat-item' + (isAdded ? ' added' : '');
    const info = document.createElement('div'); info.className='add-mat-info';
    info.innerHTML=`<strong>${it.name}</strong><span class="add-mat-prices">S: $${pricesSafe.small.toFixed(2)} &nbsp; M: $${pricesSafe.medium.toFixed(2)} &nbsp; L: $${pricesSafe.large.toFixed(2)}</span>`;
    const btn = document.createElement('button'); btn.className='add-mat-toggle' + (isAdded ? ' remove' : '');
    btn.textContent = isAdded ? 'Remove' : '+ Add';
    btn.onclick = (e)=>{
      e.stopPropagation();
      if(isAdded){
        addedMaterialIds = addedMaterialIds.filter(mid => mid !== it.id);
        // If removed material was selected, deselect
        if(selected && selected.id === it.id){ selected = null; compute(); }
      } else {
        addedMaterialIds.push(it.id);
      }
      saveAddedMats(); renderAddMatList(filter); renderFavorites();
    };
    row.appendChild(info); row.appendChild(btn);
    addMatList.appendChild(row);
  });
}

if(addMatSearch) addMatSearch.addEventListener('input', (e)=> renderAddMatList(e.target.value));
if(addMatDone) addMatDone.onclick = ()=>{ closeAddMatPicker(); };

// events
if(openInvBtn) openInvBtn.onclick = ()=>{ openAddMatPicker(); };
if(closeInvBtn) closeInvBtn.onclick = ()=>{ closeInv(); };
if(backInvBtn) backInvBtn.onclick = ()=>{ closeInv(); };
if(saveItemBtn) saveItemBtn.onclick = saveNewItem;

// Import / Add UI handlers
if(btnImport) btnImport.onclick = ()=>{ importPanel.style.display='block'; editPanel.style.display='none'; };
if(btnAdd) btnAdd.onclick = ()=>{ importPanel.style.display='none'; editPanel.style.display='block'; clearForm(); };
if(cancelImport) cancelImport.onclick = ()=>{ importPanel.style.display='none'; editPanel.style.display='block'; importText.value=''; };
if(doImport) doImport.onclick = ()=>{
  const text = importText.value || '';
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(lines.length<1) return alert('Paste CSV rows to import.');
  // if header present, detect
  const header = lines[0].toLowerCase().includes('name') ? lines.shift().split(',').map(h=>h.trim().toLowerCase()) : ['category','name','material_type','coverage_2in','price_small','price_medium','price_large','stock'];
  lines.forEach(line=>{
    const cols = line.split(',').map(c=>c.trim());
    const map = {};
    header.forEach((h,i)=> map[h]=cols[i] || '');
    const cov2in = toNonNegativeNumber(map.coverage_2in || map.cov);
    const it = {
      id: id(),
      category: (map.category || 'Uncategorized').trim() || 'Uncategorized',
      name: (map.name || 'Item').trim() || 'Item',
      materialType: (map.material_type || 'custom').toLowerCase(),
      cov2in,
      cov: cov2in,
      prices: { small: toNonNegativeNumber(map.price_small), medium: toNonNegativeNumber(map.price_medium), large: toNonNegativeNumber(map.price_large) },
      stock: toNonNegativeNumber(map.stock)
    };
    inventory.unshift(it);
    addedMaterialIds.push(it.id);
    if(it.category && !adminConfig.categories.includes(it.category)) adminConfig.categories.push(it.category);
  });
  saveInv(); saveAddedMats(); saveAdminConfig(); renderInvList(); renderFavorites(); importText.value=''; importPanel.style.display='none'; editPanel.style.display='block';
  alert('Imported '+lines.length+' items.');
};

// Bulk file upload handlers
if(btnBulkUpload) btnBulkUpload.onclick = ()=>{ bulkFile && bulkFile.click(); };
if(bulkFile) bulkFile.addEventListener('change', (e)=>{
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    const text = String(ev.target.result || '');
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(lines.length===0) return alert('Empty file');
    const header = lines[0].toLowerCase().includes('name') ? lines.shift().split(',').map(h=>h.trim().toLowerCase()) : ['category','name','material_type','coverage_2in','price_small','price_medium','price_large','stock'];
    // build preview rows with editable inputs
    bulkPreview.innerHTML = '';
    lines.forEach((ln,idx)=>{
      const cols = ln.split(',').map(c=>c.trim());
      const map = {}; header.forEach((h,i)=> map[h]=cols[i]||'');
      const row = document.createElement('div'); row.className='bulk-row'; row.style.display='grid'; row.style.gridTemplateColumns='1fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr'; row.style.gap='8px'; row.style.marginBottom='8px';
      const catIn = document.createElement('input'); catIn.value = map.category || 'Uncategorized'; catIn.style.padding='6px'; catIn.style.border='1px solid #222'; catIn.style.borderRadius='6px'; catIn.style.background='transparent'; catIn.style.color='var(--white)';
      const nameIn = document.createElement('input'); nameIn.value = map.name || ''; nameIn.style.padding='6px'; nameIn.style.border='1px solid #222'; nameIn.style.borderRadius='6px'; nameIn.style.background='transparent'; nameIn.style.color='var(--white)';
      const typeIn = document.createElement('input'); typeIn.value = map.material_type || 'custom'; typeIn.style.padding='6px'; typeIn.style.border='1px solid #222'; typeIn.style.borderRadius='6px'; typeIn.style.background='transparent'; typeIn.style.color='var(--white)';
      const covIn = document.createElement('input'); covIn.value=map.coverage_2in || map.cov || '0'; covIn.type='number'; covIn.style.padding='6px'; covIn.style.border='1px solid #222'; covIn.style.borderRadius='6px'; covIn.style.background='transparent'; covIn.style.color='var(--white)';
      const ps = document.createElement('input'); ps.value=map.price_small||'0'; ps.type='number'; ps.style.padding='6px'; ps.style.border='1px solid #222'; ps.style.borderRadius='6px'; ps.style.background='transparent'; ps.style.color='var(--white)';
      const pm = document.createElement('input'); pm.value=map.price_medium||'0'; pm.type='number'; pm.style.padding='6px'; pm.style.border='1px solid #222'; pm.style.borderRadius='6px'; pm.style.background='transparent'; pm.style.color='var(--white)';
      const pl = document.createElement('input'); pl.value=map.price_large||'0'; pl.type='number'; pl.style.padding='6px'; pl.style.border='1px solid #222'; pl.style.borderRadius='6px'; pl.style.background='transparent'; pl.style.color='var(--white)';
      const st = document.createElement('input'); st.value=map.stock||'0'; st.type='number'; st.style.padding='6px'; st.style.border='1px solid #222'; st.style.borderRadius='6px'; st.style.background='transparent'; st.style.color='var(--white)';
      row.appendChild(catIn); row.appendChild(nameIn); row.appendChild(typeIn); row.appendChild(covIn); row.appendChild(ps); row.appendChild(pm); row.appendChild(pl); row.appendChild(st);
      bulkPreview.appendChild(row);
    });
    bulkPanel.style.display='block'; importPanel.style.display='none'; editPanel.style.display='none';
  };
  reader.readAsText(f);
  bulkFile.value='';
});

if(cancelBulk) cancelBulk.onclick = ()=>{ bulkPreview.innerHTML=''; bulkPanel.style.display='none'; editPanel.style.display='block'; };
if(confirmBulk) confirmBulk.onclick = ()=>{
  const rows = Array.from(bulkPreview.querySelectorAll('.bulk-row'));
  if(rows.length===0) return alert('No rows to import');
  rows.forEach(r=>{
    const inputs = r.querySelectorAll('input');
    const category = (inputs[0].value || 'Uncategorized').trim() || 'Uncategorized';
    const name = (inputs[1].value || 'Item').trim() || 'Item';
    const materialType = (inputs[2].value || 'custom').toLowerCase();
    const cov2in = toNonNegativeNumber(inputs[3].value);
    const ps = toNonNegativeNumber(inputs[4].value);
    const pm = toNonNegativeNumber(inputs[5].value);
    const pl = toNonNegativeNumber(inputs[6].value);
    const st = toNonNegativeNumber(inputs[7].value);
    const it = { id: id(), category, name, materialType, cov2in, cov: cov2in, prices: { small: ps, medium: pm, large: pl }, stock: st };
    inventory.unshift(it);
    addedMaterialIds.push(it.id);
    if(category && !adminConfig.categories.includes(category)) adminConfig.categories.push(category);
  });
  saveInv(); saveAddedMats(); saveAdminConfig(); renderInvList(); renderFavorites(); bulkPreview.innerHTML=''; bulkPanel.style.display='none'; alert('Imported '+rows.length+' items');
};

if(clearInvNoBtn) clearInvNoBtn.onclick = closeClearInventoryModal;
if(clearInvYesBtn) clearInvYesBtn.onclick = confirmClearInventoryList;
if(clearInvModal) clearInvModal.addEventListener('click', (e)=>{ if(e.target === clearInvModal) closeClearInventoryModal(); });

// inventory modal now shows all items by default; search is live via input listener

if(addOrderBtn) addOrderBtn.onclick = ()=>{
  if(!selected) return alert('Select material');
  const scoop = document.querySelector('input[name="scoop"]:checked').value;
  const scoopsNeeded = toNonNegativeNumber(scoopsEl.textContent);
  const price = getItemScoopPrice(selected, scoop) * scoopsNeeded;
  // Add to current order and log the change
  order.push({id:selected.id,name:selected.name,qty:Number(qtyEl.value)||1,scoop,qtyScoops:scoopsNeeded,price}); saveOrder(); renderOrder(); computeTotals();
  console.log(`[YL] New order added. Material: ${selected.name}, Scoop: ${scoop}, Scoops: ${scoopsNeeded}, Price: $${price.toFixed(2)}`);
  console.log('[YL] Order updated — total items:', order.length);
};

if(clearOrderBtn) clearOrderBtn.onclick = ()=>{ order=[]; saveOrder(); renderOrder(); computeTotals(); if(typeof window.resetSurcharges === 'function') window.resetSurcharges(); };

[qtyEl,sqftEl,depthEl,depthUnitEl,flyerEl].forEach(el=>{
  if(!el) return;
  ['input','keyup','change'].forEach(evt=>el.addEventListener(evt,()=>{ compute(); computeTotals(); renderOrder(); }));
});

// --- Length × Width → auto-fill Square Footage (Automatic Toggle) ---
// When the user types into Length or Width, auto-compute area and fill sqft.
// Formula: area = lengthFeet × widthFeet
function autoFillSqFtFromLW(){
  const lengthVal = toNonNegativeNumber(lengthEl ? lengthEl.value : 0);
  const widthVal  = toNonNegativeNumber(widthEl  ? widthEl.value  : 0);
  if(lengthVal > 0 && widthVal > 0){
    // area = length × width  (both in feet)
    const area = lengthVal * widthVal;
    const areaRounded = Math.round(area * 100) / 100; // toFixed(2) precision
    if(sqftEl) sqftEl.value = areaRounded;
    console.log(`[YL] Auto-fill SqFt: ${lengthVal} × ${widthVal} = ${areaRounded} sq ft`);
  } else if(lengthVal === 0 && widthVal === 0 && sqftEl){
    // Both cleared → reset sqft only if it was auto-filled (value matches L×W)
    // Don't reset if user entered sqft directly via shape calc or manual entry
  }
  compute(); computeTotals(); renderOrder();
}
[lengthEl, widthEl].forEach(el=>{
  if(!el) return;
  ['input','keyup','change'].forEach(evt => el.addEventListener(evt, autoFillSqFtFromLW));
});
document.querySelectorAll('input[name="scoop"]').forEach(r=>r.addEventListener('change',()=>{ compute(); computeTotals(); renderOrder(); renderFavorites(); }));

// --- Compaction Factor Toggle ---
if(compactionToggle) compactionToggle.addEventListener('change', () => {
  compactionEnabled = compactionToggle.checked;
  try { localStorage.setItem(KEY_COMPACTION, String(compactionEnabled)); } catch(e){}
  if(compactionBadge) compactionBadge.style.display = compactionEnabled ? 'inline' : 'none';
  console.log(`[YL] Compaction factor ${compactionEnabled ? 'ENABLED (+15%)' : 'DISABLED'}`);
  compute(); computeTotals(); renderOrder();
});

// --- Material Type Dropdown ---
if(materialTypeEl) materialTypeEl.addEventListener('change', () => {
  console.log(`[YL] Material type changed to: ${materialTypeEl.value}`);
  compute(); computeTotals(); renderOrder();
});

if(searchEl) searchEl.addEventListener('input', (e)=> renderFavorites(e.target.value));
if(invSearchEl) invSearchEl.addEventListener('input', (e)=> renderInvList(e.target.value));
if(newOrderBtn) newOrderBtn.onclick = ()=>{
  if(!selected) return alert('Select a material first');
  const scoop = document.querySelector('input[name="scoop"]:checked').value;
  const scoopsNeeded = toNonNegativeNumber(scoopsEl.textContent);
  const price = getItemScoopPrice(selected, scoop) * scoopsNeeded;
  order.push({id:selected.id, name:selected.name, qty:Number(qtyEl.value)||1, scoop, qtyScoops:scoopsNeeded, price});
  saveOrder(); renderOrder(); computeTotals();
}

// initial
loadAdminConfig();
loadInv();
ensureInventoryUpdated();
loadDel();
loadAddedMats();
// If addedMaterialIds is empty but inventory has items, auto-add all existing items (migration)
if(addedMaterialIds.length === 0 && inventory.length > 0){
  addedMaterialIds = inventory.map(it => it.id);
  saveAddedMats();
}
loadOrder();

// --- Preset Management: clear on normal browser load, preserve in PWA mode ---
if (IS_PWA_MODE) {
  // PWA mode: preserve all presets, inventory, orders, and state across sessions
  console.log('[YL] Presets preserved in PWA mode.');
} else {
  // Normal browser load: clear temporary/session data (presets) for a fresh start
  console.log('[YL] Presets cleared on normal browser load.');
  try {
    order = [];
    selected = null;
    saveOrder();
    // Reset input fields to default values
    if (qtyEl) qtyEl.value = 0;
    if (lengthEl) lengthEl.value = 0;
    if (widthEl) widthEl.value = 0;
    if (sqftEl) sqftEl.value = 0;
    if (depthEl) depthEl.value = 0;
    // Deactivate all delivery selections (keep locations configured)
    deliveryLocations.forEach(d => d.active = false);
    saveDel();
  } catch (e) {
    console.error('[YL] Error clearing presets:', e);
  }
}

renderFavorites(); renderInvList(); renderOrder(); renderDelivery();
populateAdminCategorySelect();
// default activate first delivery if any exist (only in PWA mode, browser mode starts fresh)
if(IS_PWA_MODE && deliveryLocations.length && !deliveryLocations.find(d=>d.active)){ deliveryLocations[0].active=true; saveDel(); renderDelivery(); }
// select first added material by default (only in PWA mode)
const firstAdded = inventory.find(it => addedMaterialIds.includes(it.id));
if(IS_PWA_MODE && firstAdded) selected = firstAdded;
compute(); computeTotals();

// --- Number Pad (3-mode: Quantity / SqFt / Depth) ---
(function(){
  const overlay = document.getElementById('numpad-overlay');
  const labelEl = document.getElementById('numpad-label');
  const valueEl = document.getElementById('numpad-value');
  const doneBtn = document.getElementById('numpad-done');
  const clearBtn = document.getElementById('numpad-clear');
  if(!overlay) return;

  let activeInput = null;
  let buffer = '';
  /** Current mode: 'qty' | 'sqft' | 'depth' */
  let mode = 'qty';

  const numpadFields = [
    { el: qtyEl,    label: 'Quantity',        mode: 'qty'   },
    { el: lengthEl, label: 'Length (ft)',      mode: 'qty'   },
    { el: widthEl,  label: 'Width (ft)',       mode: 'qty'   },
    { el: sqftEl,   label: 'Square Footage',   mode: 'sqft'  },
    { el: depthEl,  label: 'Depth',            mode: 'depth' }
  ];

  /**
   * openNumpad – open the numpad overlay in the correct mode
   * Modes: qty (integer only), sqft (whole numbers, delete btn), depth (ft/in notation)
   */
  function openNumpad(input, label, fieldMode){
    activeInput = input;
    mode = fieldMode;
    buffer = input.value === '0' ? '' : input.value;
    labelEl.textContent = label;
    valueEl.textContent = buffer || '0';
    overlay.style.display = 'flex';

    const numpadDiv = overlay.querySelector('.numpad');
    // Remove all mode classes, then apply the current one
    numpadDiv.classList.remove('numpad-decimal','numpad-sqft','numpad-depth');
    if(mode === 'sqft')       numpadDiv.classList.add('numpad-sqft');
    else if(mode === 'depth') numpadDiv.classList.add('numpad-depth');
    // qty mode: no extra class needed — shows default np-qty row

    // Prevent native keyboard from appearing
    input.blur();
    console.log('[Numpad] Opened in mode:', mode, '| field:', label);
  }

  /**
   * closeNumpad – write buffer back to input, parse depth ft/in if needed
   */
  function closeNumpad(){
    if(activeInput){
      if(mode === 'depth'){
        // Parse ft/in notation → total inches stored as number
        // Accepted formats: "5ft6in", "5ft", "36in", "36", "5ft 6in"
        const raw = buffer.replace(/\s+/g, '');
        const ftMatch = raw.match(/(\d+)\s*ft/i);
        const inMatch = raw.match(/(\d+)\s*in/i);
        const feet = ftMatch ? parseInt(ftMatch[1], 10) : 0;
        const inches = inMatch ? parseInt(inMatch[1], 10) : 0;
        let total;
        if(ftMatch || inMatch){
          total = feet * 12 + inches;
          console.log(`[Numpad] Depth parsed: ${feet}ft ${inches}in = ${total} total inches`);
        } else {
          // plain number input — treat as inches
          total = parseInt(raw, 10) || 0;
          console.log(`[Numpad] Depth plain number: ${total} inches`);
        }
        activeInput.value = String(total);
      } else {
        // qty / sqft: strip commas, store as integer string
        activeInput.value = (buffer || '0').replace(/,/g, '');
      }
      // Fire events so compute() picks up the change
      activeInput.dispatchEvent(new Event('input', {bubbles:true}));
      activeInput.dispatchEvent(new Event('change', {bubbles:true}));
    }
    overlay.style.display = 'none';
    activeInput = null;
    buffer = '';
  }

  // Make inputs readonly and wire click→open numpad in correct mode
  numpadFields.forEach(({el, label, mode: m}) => {
    if(!el) return;
    el.setAttribute('readonly', 'true');
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      // Allow shape calculator to intercept sqft field clicks
      if(m === 'sqft' && typeof window._ylSqftInterceptor === 'function'){ window._ylSqftInterceptor(); return; }
      openNumpad(el, label, m);
    });
    el.addEventListener('focus', (e) => {
      e.preventDefault();
      if(m === 'sqft' && typeof window._ylSqftInterceptor === 'function'){ window._ylSqftInterceptor(); return; }
      openNumpad(el, label, m);
    });
  });

  // Expose openNumpad for external callers (shape calculator manual-entry fallback)
  window._ylOpenNumpad = openNumpad;

  // Key press handlers — behaviour changes per mode
  overlay.querySelectorAll('.numpad-key').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.dataset.key;

      if(key === 'back'){
        // Backspace: remove last character
        buffer = buffer.slice(0, -1);
      } else if(key === 'del'){
        // Delete (SqFt mode): clear entire buffer
        buffer = '';
        console.log('[Numpad] SqFt delete — cleared buffer');
      } else if(key === 'ft'){
        // Depth mode: append 'ft' if not already present
        if(!buffer.includes('ft')){
          buffer += 'ft';
          console.log('[Numpad] Appended ft → buffer:', buffer);
        }
      } else if(key === 'in'){
        // Depth mode: append 'in' if not already present
        if(!buffer.includes('in')){
          buffer += 'in';
          console.log('[Numpad] Appended in → buffer:', buffer);
        }
      } else if(key === '.'){
        // Period — should not appear in sqft/depth modes but guard anyway
        if(mode === 'qty' || mode === 'sqft' || mode === 'depth') return; // no decimals
        if(!buffer.includes('.')) buffer += buffer.length ? '.' : '0.';
      } else if(key === ','){
        // Comma — only in modes that allow it (currently none)
        if(mode === 'depth') return; // depth disallows commas
        if(buffer.length && /\d$/.test(buffer)) buffer += ',';
      } else {
        // Digit 0-9
        buffer += key;
      }
      valueEl.textContent = buffer || '0';
    });
  });

  // Back button in action bar (always backspace)
  const backActionBtn = document.getElementById('numpad-back-btn');
  if(backActionBtn) backActionBtn.addEventListener('click', (e) => {
    e.preventDefault();
    buffer = buffer.slice(0, -1);
    valueEl.textContent = buffer || '0';
  });

  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    buffer = '';
    valueEl.textContent = '0';
  });

  doneBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeNumpad();
  });

  // Close on backdrop click
  overlay.querySelector('.numpad-backdrop').addEventListener('click', (e) => {
    e.preventDefault();
    closeNumpad();
  });
})();

// --- Shape Calculator for Square Footage ---
// Supports: Rectangle/Square, Circle, Triangle, L-Shape
// Converts feet+inches or yards → feet before computing area
(function(){
  if(!sqftEl) return;

  /**
   * Shape definitions
   * dims  – labels for required dimension inputs
   * calc  – function(dimsFeet[]) → area in sq ft
   */
  const SHAPES = {
    rectangle: {
      label: 'Rectangle / Square',
      dims: ['Length', 'Width'],
      // area = length × width
      calc: function(d){ return d[0] * d[1]; }
    },
    circle: {
      label: 'Circle',
      dims: ['Radius'],
      // area = π × radius²
      calc: function(d){ return Math.PI * d[0] * d[0]; }
    },
    triangle: {
      label: 'Triangle',
      dims: ['Base', 'Height'],
      // area = (base × height) ÷ 2
      calc: function(d){ return (d[0] * d[1]) / 2; }
    },
    lshape: {
      label: 'L-Shape',
      dims: ['Rect 1 Length', 'Rect 1 Width', 'Rect 2 Length', 'Rect 2 Width'],
      // totalArea = (length1 × width1) + (length2 × width2)
      calc: function(d){ return (d[0] * d[1]) + (d[2] * d[3]); }
    }
  };

  let currentShape = null;

  // --- Build modal DOM (reuses existing .modal / .modal-content / .card classes) ---
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'shape-calc-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const contentEl = document.createElement('div');
  contentEl.className = 'modal-content card';
  contentEl.style.maxWidth = '500px';
  modal.appendChild(contentEl);
  document.body.appendChild(modal);

  /** Open the shape calculator modal */
  function openShapeCalc(){
    currentShape = null;
    renderShapePicker();
    modal.style.display = 'flex';
    console.log('[ShapeCalc] Opened — pick a shape or Manual Entry.');
  }

  /** Close the shape calculator modal */
  function closeShapeCalc(){
    modal.style.display = 'none';
  }

  // Close on backdrop click
  modal.addEventListener('click', function(e){
    if(e.target === modal) closeShapeCalc();
  });

  // ─── Step 1: Shape Picker ───
  function renderShapePicker(){
    contentEl.innerHTML = '';

    var h = document.createElement('h3');
    h.textContent = 'Square Footage Calculator';
    contentEl.appendChild(h);

    var sub = document.createElement('div');
    sub.style.cssText = 'color:var(--muted);font-size:13px;margin-bottom:12px';
    sub.textContent = 'Select a shape to calculate area, or enter manually.';
    contentEl.appendChild(sub);

    // 2×2 grid of shape buttons
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px';

    Object.keys(SHAPES).forEach(function(key){
      var s = SHAPES[key];
      var btn = document.createElement('button');
      btn.style.cssText = 'padding:14px 8px;text-align:center;font-size:13px;font-weight:600';
      btn.textContent = s.label;
      btn.addEventListener('click', function(){
        currentShape = key;
        console.log('[ShapeCalc] Shape selected:', s.label);
        renderDimForm();
      });
      grid.appendChild(btn);
    });
    contentEl.appendChild(grid);

    // Actions row: Cancel | Manual Entry
    var actions = document.createElement('div');
    actions.className = 'modal-actions';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeShapeCalc);
    actions.appendChild(cancelBtn);

    var manualBtn = document.createElement('button');
    manualBtn.textContent = 'Manual Entry';
    manualBtn.style.cssText = 'background:linear-gradient(180deg,#ffe033,#ffc800);color:#111;font-weight:700;border:none';
    manualBtn.addEventListener('click', function(){
      closeShapeCalc();
      // Fall through to the standard numpad for sqft
      if(typeof window._ylOpenNumpad === 'function'){
        window._ylOpenNumpad(sqftEl, 'Square Footage', 'sqft');
      }
    });
    actions.appendChild(manualBtn);
    contentEl.appendChild(actions);
  }

  // ─── Step 2: Dimension Input Form ───
  function renderDimForm(){
    var shape = SHAPES[currentShape];
    contentEl.innerHTML = '';

    var h = document.createElement('h3');
    h.textContent = shape.label;
    contentEl.appendChild(h);

    var info = document.createElement('div');
    info.style.cssText = 'color:var(--muted);font-size:12px;margin-bottom:10px;line-height:1.4';
    info.textContent = 'Enter each dimension in feet + inches, or yards. (1 yd = 3 ft, 1 ft = 12 in)';
    contentEl.appendChild(info);

    // Input style matching existing app aesthetics (inline, no CSS file changes)
    var inputCSS = 'width:56px;padding:6px 8px;border-radius:6px;border:1px solid #292a2f;background:#1e1f23;color:var(--white);font-size:14px';
    var unitCSS  = 'font-size:12px;color:var(--muted)';
    // Inline error style for validation messages
    var errCSS   = 'color:#ff4444;font-size:11px;margin-top:2px;display:none';

    var dimInputs = []; // { ft, in, yd, errEl } per dimension

    shape.dims.forEach(function(dimLabel, i){
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin-bottom:10px';

      var lbl = document.createElement('label');
      lbl.style.cssText = 'display:block;margin-bottom:4px;font-size:13px;font-weight:600;color:var(--white)';
      lbl.textContent = dimLabel;
      wrapper.appendChild(lbl);

      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap';

      // Feet input
      var ftIn = document.createElement('input');
      ftIn.type = 'number'; ftIn.min = '0'; ftIn.step = 'any'; ftIn.placeholder = '0';
      ftIn.style.cssText = inputCSS;
      row.appendChild(ftIn);
      var ftL = document.createElement('span'); ftL.style.cssText = unitCSS; ftL.textContent = 'ft';
      row.appendChild(ftL);

      // Inches input (max 11)
      var inIn = document.createElement('input');
      inIn.type = 'number'; inIn.min = '0'; inIn.max = '11'; inIn.step = '1'; inIn.placeholder = '0';
      inIn.style.cssText = inputCSS;
      row.appendChild(inIn);
      var inL = document.createElement('span'); inL.style.cssText = unitCSS; inL.textContent = 'in';
      row.appendChild(inL);

      // Separator
      var sep = document.createElement('span');
      sep.style.cssText = 'font-size:11px;color:var(--muted);margin:0 2px';
      sep.textContent = 'or';
      row.appendChild(sep);

      // Yards input
      var ydIn = document.createElement('input');
      ydIn.type = 'number'; ydIn.min = '0'; ydIn.step = 'any'; ydIn.placeholder = '0';
      ydIn.style.cssText = inputCSS;
      row.appendChild(ydIn);
      var ydL = document.createElement('span'); ydL.style.cssText = unitCSS; ydL.textContent = 'yd';
      row.appendChild(ydL);

      wrapper.appendChild(row);

      // Per-field validation error message
      var errEl = document.createElement('div');
      errEl.style.cssText = errCSS;
      wrapper.appendChild(errEl);

      contentEl.appendChild(wrapper);

      dimInputs.push({ ft: ftIn, 'in': inIn, yd: ydIn, err: errEl });
    });

    // Actions: Back | Calculate
    var actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.style.marginTop = '12px';

    var backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', renderShapePicker);
    actions.appendChild(backBtn);

    var calcBtn = document.createElement('button');
    calcBtn.textContent = 'Calculate';
    calcBtn.style.cssText = 'background:linear-gradient(180deg,#ffe033,#ffc800);color:#111;font-weight:700;border:none';
    calcBtn.addEventListener('click', function(){

      // ── Input Validation ──
      var hasError = false;
      // Clear previous errors
      dimInputs.forEach(function(d){ d.err.style.display = 'none'; d.err.textContent = ''; });

      dimInputs.forEach(function(d, i){
        var ftVal  = parseFloat(d.ft.value)     || 0;
        var inVal  = parseFloat(d['in'].value)  || 0;
        var ydVal  = parseFloat(d.yd.value)     || 0;

        // Negative numbers not allowed
        if(ftVal < 0 || inVal < 0 || ydVal < 0){
          d.err.textContent = 'Negative numbers are not allowed.';
          d.err.style.display = 'block';
          hasError = true;
          console.warn('[ShapeCalc] Validation fail — negative value in ' + shape.dims[i]);
          return;
        }
        // Inches cannot exceed 11
        if(inVal > 11){
          d.err.textContent = 'Inches cannot exceed 11 (use feet for larger values).';
          d.err.style.display = 'block';
          hasError = true;
          console.warn('[ShapeCalc] Validation fail — inches > 11 in ' + shape.dims[i] + ': ' + inVal);
          return;
        }
        // At least one value must be provided
        if(ftVal === 0 && inVal === 0 && ydVal === 0){
          d.err.textContent = 'Enter a measurement (feet, inches, or yards).';
          d.err.style.display = 'block';
          hasError = true;
          console.warn('[ShapeCalc] Validation fail — empty dimension ' + shape.dims[i]);
          return;
        }
      });

      if(hasError) return;

      // ── Automatic Unit Conversion ──
      // Build breakdown strings and converted feet values
      var breakdownLines = [];   // human-readable conversion lines
      var feetValues = dimInputs.map(function(d, i){
        var ydVal = parseFloat(d.yd.value) || 0;
        if(ydVal > 0){
          // Yards to feet: feet = yards × 3
          var totalFt = ydVal * 3;
          breakdownLines.push(shape.dims[i] + ': ' + ydVal + ' yd × 3 = ' + totalFt + ' ft');
          console.log('[ShapeCalc] ' + shape.dims[i] + ': ' + ydVal + ' yd × 3 = ' + totalFt + ' ft');
          return totalFt;
        }
        var ftVal  = parseFloat(d.ft.value)  || 0;
        var inVal  = parseFloat(d['in'].value) || 0;
        // feetTotal = feet + (inches / 12)
        var totalFt = ftVal + (inVal / 12);

        // Build human-readable line
        if(inVal > 0){
          breakdownLines.push(shape.dims[i] + ': ' + ftVal + ' ft ' + inVal + ' in → ' + totalFt.toFixed(4) + ' ft');
        } else {
          breakdownLines.push(shape.dims[i] + ': ' + ftVal + ' ft');
        }
        console.log('[ShapeCalc] ' + shape.dims[i] + ': ' + ftVal + ' ft + ' + inVal + ' in = ' + totalFt.toFixed(6) + ' ft');
        return totalFt;
      });

      // ── Compute area using the shape's formula ──
      var area = shape.calc(feetValues);
      var areaRounded = Math.round(area * 100) / 100;

      // Build formula breakdown string based on shape type
      var formulaStr = '';
      if(currentShape === 'rectangle'){
        formulaStr = feetValues[0].toFixed(4) + ' × ' + feetValues[1].toFixed(4) + ' = ' + areaRounded + ' sq ft';
      } else if(currentShape === 'circle'){
        formulaStr = 'π × ' + feetValues[0].toFixed(4) + '² = π × ' + (feetValues[0]*feetValues[0]).toFixed(4) + ' = ' + areaRounded + ' sq ft';
      } else if(currentShape === 'triangle'){
        formulaStr = '(' + feetValues[0].toFixed(4) + ' × ' + feetValues[1].toFixed(4) + ') ÷ 2 = ' + areaRounded + ' sq ft';
      } else if(currentShape === 'lshape'){
        var a1 = Math.round(feetValues[0] * feetValues[1] * 100) / 100;
        var a2 = Math.round(feetValues[2] * feetValues[3] * 100) / 100;
        formulaStr = feetValues[0].toFixed(4) + ' × ' + feetValues[1].toFixed(4) + ' = ' + a1 + ' sq ft\n';
        formulaStr += feetValues[2].toFixed(4) + ' × ' + feetValues[3].toFixed(4) + ' = ' + a2 + ' sq ft\n';
        formulaStr += 'Total: ' + a1 + ' + ' + a2 + ' = ' + areaRounded + ' sq ft';
      }

      console.log('[ShapeCalc] Shape: ' + shape.label);
      console.log('[ShapeCalc] Converted measurements (ft): ' + feetValues.map(function(v){ return v.toFixed(6); }).join(', '));
      console.log('[ShapeCalc] Calculated area: ' + area.toFixed(6) + ' sq ft (displayed as ' + areaRounded + ')');

      // Show results step (breakdown + material conversions) before applying
      renderResultsStep(shape, breakdownLines, formulaStr, areaRounded);
    });
    actions.appendChild(calcBtn);
    contentEl.appendChild(actions);
  }

  // ─── Step 3: Results / Breakdown Display ───
  function renderResultsStep(shape, breakdownLines, formulaStr, areaRounded){
    contentEl.innerHTML = '';

    var h = document.createElement('h3');
    h.textContent = 'Calculation Breakdown';
    contentEl.appendChild(h);

    // ── Measurement Conversions ──
    var convSection = document.createElement('div');
    convSection.style.cssText = 'margin-bottom:12px';
    var convTitle = document.createElement('div');
    convTitle.style.cssText = 'font-size:12px;color:var(--muted);font-weight:600;margin-bottom:4px';
    convTitle.textContent = 'Measurements (converted to feet):';
    convSection.appendChild(convTitle);

    breakdownLines.forEach(function(line){
      var p = document.createElement('div');
      p.style.cssText = 'font-size:13px;color:var(--white);padding:2px 0;font-family:monospace';
      p.textContent = line;
      convSection.appendChild(p);
    });
    contentEl.appendChild(convSection);

    // ── Area Formula Breakdown ──
    var formulaSection = document.createElement('div');
    formulaSection.style.cssText = 'margin-bottom:12px;padding:10px;border-radius:6px;background:#1e1f23;border:1px solid #292a2f';
    var formulaTitle = document.createElement('div');
    formulaTitle.style.cssText = 'font-size:12px;color:var(--muted);font-weight:600;margin-bottom:4px';
    formulaTitle.textContent = 'Area (' + shape.label + '):';
    formulaSection.appendChild(formulaTitle);

    formulaStr.split('\n').forEach(function(line){
      var p = document.createElement('div');
      p.style.cssText = 'font-size:14px;color:var(--white);padding:1px 0;font-family:monospace';
      p.textContent = line;
      formulaSection.appendChild(p);
    });
    contentEl.appendChild(formulaSection);

    // ── Big result number ──
    var bigResult = document.createElement('div');
    bigResult.style.cssText = 'text-align:center;font-size:28px;font-weight:700;color:var(--accent);margin:8px 0 14px';
    bigResult.textContent = areaRounded + ' sq ft';
    contentEl.appendChild(bigResult);

    // ── Material Conversion Estimates ──
    // Show common landscaping coverage estimates at representative depths
    var matSection = document.createElement('div');
    matSection.style.cssText = 'margin-bottom:14px;padding:10px;border-radius:6px;background:#1e1f23;border:1px solid #292a2f';
    var matTitle = document.createElement('div');
    matTitle.style.cssText = 'font-size:12px;color:var(--muted);font-weight:600;margin-bottom:6px';
    matTitle.textContent = 'Estimated Material Needed:';
    matSection.appendChild(matTitle);

    // Common landscaping depth references for material estimates
    // Formula: cubic yards = (area sq ft × depth ft) / 27
    var depthRefs = [
      { label: '2 in depth',  depthFt: 2/12 },
      { label: '3 in depth',  depthFt: 3/12 },
      { label: '4 in depth',  depthFt: 4/12 },
      { label: '6 in depth',  depthFt: 6/12 }
    ];

    depthRefs.forEach(function(ref){
      // cubic yards = (area × depthFt) / 27  (27 cu ft per cu yd)
      var cy = (areaRounded * ref.depthFt) / 27;
      var cyRound = Math.round(cy * 100) / 100;
      // tons rough estimate: ~1.4 tons per cubic yard for stone, ~0.5 for mulch (show generic)
      var tonsStone = Math.round(cy * 1.4 * 100) / 100;
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;font-size:13px;color:var(--white);padding:3px 0;border-bottom:1px solid #222';
      row.innerHTML = '<span style="color:var(--muted)">' + ref.label + '</span>'
        + '<span>' + cyRound + ' yd³'
        + ' <span style="color:var(--muted);font-size:11px">(≈' + tonsStone + ' tons stone)</span></span>';
      matSection.appendChild(row);
      console.log('[ShapeCalc] Material est @ ' + ref.label + ': ' + cyRound + ' yd³, ~' + tonsStone + ' tons stone');
    });

    // Square yards conversion: 1 sq yd = 9 sq ft
    var sqYards = Math.round((areaRounded / 9) * 100) / 100;
    var sqydRow = document.createElement('div');
    sqydRow.style.cssText = 'font-size:12px;color:var(--muted);margin-top:6px';
    sqydRow.textContent = areaRounded + ' sq ft ÷ 9 = ' + sqYards + ' sq yd';
    matSection.appendChild(sqydRow);
    console.log('[ShapeCalc] Area in sq yards: ' + sqYards + ' sq yd');
    contentEl.appendChild(matSection);

    // ── Actions: Back | Apply ──
    var actions = document.createElement('div');
    actions.className = 'modal-actions';

    var backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', function(){ renderDimForm(); });
    actions.appendChild(backBtn);

    var applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply ' + areaRounded + ' sq ft';
    applyBtn.style.cssText = 'background:linear-gradient(180deg,#ffe033,#ffc800);color:#111;font-weight:700;border:none';
    applyBtn.addEventListener('click', function(){
      // Write result to the Square Footage field and trigger recalculation
      sqftEl.value = areaRounded;
      sqftEl.dispatchEvent(new Event('input',  { bubbles: true }));
      sqftEl.dispatchEvent(new Event('change', { bubbles: true }));
      closeShapeCalc();
      console.log('[ShapeCalc] ' + areaRounded + ' sq ft applied to Square Footage → compute() triggered.');
    });
    actions.appendChild(applyBtn);
    contentEl.appendChild(actions);
  }

  // Register as the sqft-field interceptor (checked by numpad IIFE before opening)
  window._ylSqftInterceptor = openShapeCalc;

  console.log('[ShapeCalc] Shape calculator initialized — Rectangle, Circle, Triangle, L-Shape.');
})();

// Delivery management UI in Edit Delivery modal
const delModal = document.getElementById('del-modal');
const closeDelBtn = document.getElementById('close-del');
const delNameIn = document.getElementById('del-name');
const delPriceIn = document.getElementById('del-price');
const saveDelBtn = document.getElementById('save-del');
const delListEl = document.getElementById('del-list');

function renderDelList(){
  if(!delListEl) return;
  delListEl.innerHTML='';
  deliveryLocations.forEach(d=>{
    const row=document.createElement('div'); row.className='del-row';
    const lbl=document.createElement('span'); lbl.className='del-row-label';
    lbl.innerHTML=`<svg class="del-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${d.label} — <span class="price">$${Number(d.price).toFixed(2)}</span>`;
    const editBtn=document.createElement('button'); editBtn.textContent='Edit'; editBtn.style.marginRight='4px';
    editBtn.onclick=()=>{
      const newLabel = prompt('Location name:', d.label);
      if(newLabel===null) return;
      const newPrice = prompt('Price:', d.price);
      if(newPrice===null) return;
      d.label = newLabel.trim() || d.label;
      d.price = Number(newPrice) || d.price;
      saveDel(); renderDelList(); renderDelivery();
    };
    const rm=document.createElement('button'); rm.textContent='✕'; rm.className='del-row-rm';
    rm.onclick=()=>{ deliveryLocations=deliveryLocations.filter(x=>x.id!==d.id); saveDel(); renderDelList(); renderDelivery(); compute(); computeTotals(); };
    row.appendChild(lbl); row.appendChild(editBtn); row.appendChild(rm); delListEl.appendChild(row);
  });
}

if(saveDelBtn) saveDelBtn.onclick = ()=>{
  const label = (delNameIn.value||'').trim();
  const price = Number(delPriceIn.value)||0;
  if(!label) return alert('Enter a location name.');
  deliveryLocations.push({id:id(), label, price, active:false});
  saveDel(); renderDelList(); renderDelivery();
  delNameIn.value=''; delPriceIn.value='';
};

if(closeDelBtn) closeDelBtn.onclick = ()=>{ delModal.style.display='none'; };

const clearDelBtn = document.getElementById('clear-del');
if(clearDelBtn) clearDelBtn.onclick = ()=>{
  if(!deliveryLocations.length) return;
  if(!confirm('Clear all delivery locations?')) return;
  deliveryLocations = [];
  saveDel(); renderDelList(); renderDelivery(); compute(); computeTotals(); renderOrder();
};

// Edit menu toggle
const editToggle = document.getElementById('edit-toggle');
const editMenu = document.getElementById('edit-menu');
const editBulkMatBtn = document.getElementById('edit-bulk-mat');
const editDeliveryBtn = document.getElementById('edit-delivery');
const editAdminConfigBtn = document.getElementById('edit-admin-config');
const editClearInventoryBtn = document.getElementById('edit-clear-inventory');

if(editToggle) editToggle.addEventListener('click', (e)=>{ e.stopPropagation(); editMenu.style.display = editMenu.style.display==='none' ? 'flex' : 'none'; });
// close menu when clicking outside
document.addEventListener('click', (e)=>{ if(editMenu && !editToggle.contains(e.target) && !editMenu.contains(e.target)) editMenu.style.display='none'; });

if(editBulkMatBtn) editBulkMatBtn.addEventListener('click', (e)=>{ e.stopPropagation(); editMenu.style.display='none'; openInv(); });
if(editDeliveryBtn) editDeliveryBtn.addEventListener('click', (e)=>{ e.stopPropagation(); editMenu.style.display='none'; if(delModal){ delModal.style.display='flex'; renderDelList(); } });
if(editAdminConfigBtn) editAdminConfigBtn.addEventListener('click', (e)=>{ e.stopPropagation(); editMenu.style.display='none'; openAdminConfigModal(); });
if(editClearInventoryBtn) editClearInventoryBtn.addEventListener('click', (e)=>{ e.stopPropagation(); editMenu.style.display='none'; handleClearInventoryList(); });

// Validate and normalize inventory prices for scoop sizes (small/medium/large)
function validateInventoryPrices(){
  let changed = false;
  inventory.forEach(it=>{
    if(!it.category){ it.category = 'Uncategorized'; changed = true; }
    if(!it.materialType){ it.materialType = inferMaterialType(it); changed = true; }
    if(!it.prices || typeof it.prices !== 'object'){
      it.prices = { small: 0, medium: 0, large: 0 };
      changed = true;
    }
    ['small','medium','large'].forEach(k=>{
      // coerce to number (handles strings) and ensure property exists
      if(it.prices[k] === undefined || it.prices[k] === null || it.prices[k] === ''){
        it.prices[k] = Number(it.prices[k]) || 0;
        changed = true;
      } else {
        const n = Number(it.prices[k]);
        if(Number.isNaN(n)){
          it.prices[k] = 0; changed = true;
        } else if(it.prices[k] !== n){
          it.prices[k] = n; changed = true;
        } else {
          it.prices[k] = n;
        }
      }
    });
    // ensure coverage is numeric
    const cov2 = toNonNegativeNumber(it.cov2in || it.cov);
    if(it.cov2in !== cov2){ it.cov2in = cov2; changed = true; }
    if(it.cov !== cov2){ it.cov = cov2; changed = true; }
  });
  if(changed){ saveInv(); console.warn('Inventory prices normalized for scoop sizes (small/medium/large).'); }
}

// run validation after loading inventory
validateInventoryPrices();

// --- Scoop Size / Coverage Reference (moved under Admin Configuration) ---
const KEY_SCOV = 'yl_scoopcov_v1';
const scovModal = document.getElementById('scoop-cov-modal');
// Button now lives in the Edit menu as "Edit Scoop Size/Coverage"
const openScovBtn = document.getElementById('edit-scoop-cov-menu');
const saveScovBtn = document.getElementById('save-scov');
const closeScovBtn = document.getElementById('close-scov');

const scovFields = ['cy','wt','ds','mt'];
const scovSizes = ['small','medium','large'];

function defaultScov(){ return {
  small:  { cy: 0, wt: 0, ds: 0, mt: 0 },
  medium: { cy: 0, wt: 0, ds: 0, mt: 0 },
  large:  { cy: 0, wt: 0, ds: 0, mt: 0 }
};}

let scoopCovData = defaultScov();

function saveScov(){ localStorage.setItem(KEY_SCOV, JSON.stringify(scoopCovData)); }
function loadScov(){
  const raw = localStorage.getItem(KEY_SCOV);
  if(raw){ try{ scoopCovData = JSON.parse(raw); }catch(e){ scoopCovData = defaultScov(); } }
  else { scoopCovData = defaultScov(); }
}

function populateScovModal(){
  scovSizes.forEach(sz=>{
    scovFields.forEach(f=>{
      const el = document.getElementById('scov-'+f+'-'+sz);
      if(el) el.value = scoopCovData[sz][f] || '';
    });
  });
}

function readScovModal(){
  scovSizes.forEach(sz=>{
    scovFields.forEach(f=>{
      const el = document.getElementById('scov-'+f+'-'+sz);
      if(el) scoopCovData[sz][f] = Number(el.value) || 0;
    });
  });
}

function syncScovToAdminScoopDefs(){
  if(!adminConfig.scoopDefs) adminConfig.scoopDefs = {};
  ['small','medium','large'].forEach(size=>{
    const existing = adminConfig.scoopDefs[size] || { name: size.charAt(0).toUpperCase() + size.slice(1), price: 0 };
    adminConfig.scoopDefs[size] = {
      name: existing.name,
      price: toNonNegativeNumber(existing.price),
      cy: toNonNegativeNumber(scoopCovData[size] && scoopCovData[size].cy),
      wt: toNonNegativeNumber(scoopCovData[size] && scoopCovData[size].wt)
    };
  });
  saveAdminConfig();
}

// Open from edit menu (legacy, kept for backward compat)
if(openScovBtn) openScovBtn.onclick = ()=>{
  const editDD = document.getElementById('edit-dropdown');
  if(editDD) editDD.style.display = 'none';
  loadScov(); populateScovModal(); scovModal.style.display='flex';
  console.log('[YL] Edit Scoop Size/Coverage opened from Edit menu');
};
// Open from Admin Configuration modal (feature #6)
const adminOpenScov = document.getElementById('admin-open-scov');
if(adminOpenScov) adminOpenScov.onclick = ()=>{
  loadScov(); populateScovModal(); scovModal.style.display='flex';
  console.log('[YL] Edit Scoop Size/Coverage opened from Admin Configuration');
};
if(saveScovBtn) saveScovBtn.onclick = ()=>{ readScovModal(); saveScov(); syncScovToAdminScoopDefs(); scovModal.style.display='none'; compute(); };
if(closeScovBtn) closeScovBtn.onclick = ()=>{ scovModal.style.display='none'; };

loadScov();
syncScovToAdminScoopDefs();

// CSV import/export removed per user request

// --- Floating Face Menu (Contracts + Maps) ---
(function(){
  const faceBtn = document.getElementById('face-btn');
  const faceMenuOpts = document.getElementById('face-menu-options');
  const faceMenuWrap = document.getElementById('face-menu-wrap');
  const contractorPage = document.getElementById('contractor-page');
  const contractorBack = document.getElementById('contractor-back');
  const contractorFab = document.getElementById('contractor-fab');
  const contractorActions = document.getElementById('contractor-actions');
  const appEl = document.querySelector('.app');
  if(!faceBtn) return;

  let faceMenuOpen = false;
  faceBtn.onclick = (e) => {
    e.stopPropagation();
    faceMenuOpen = !faceMenuOpen;
    if(faceMenuOpts) faceMenuOpts.style.display = faceMenuOpen ? 'flex' : 'none';
    faceBtn.classList.toggle('face-open', faceMenuOpen);
  };

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if(faceMenuOpen && faceMenuWrap && !faceMenuWrap.contains(e.target)){
      faceMenuOpen = false;
      if(faceMenuOpts) faceMenuOpts.style.display = 'none';
      faceBtn.classList.remove('face-open');
    }
  });

  // Contracts option — open contractor page
  const contractsOpt = document.getElementById('face-opt-contracts');
  if(contractsOpt && contractorPage) contractsOpt.onclick = () => {
    faceMenuOpen = false;
    if(faceMenuOpts) faceMenuOpts.style.display = 'none';
    faceBtn.classList.remove('face-open');
    appEl.style.display = 'none';
    if(faceMenuWrap) faceMenuWrap.style.display = 'none';
    contractorPage.style.display = 'flex';
  };

  if(contractorBack) contractorBack.onclick = () => {
    contractorPage.style.display = 'none';
    appEl.style.display = '';
    if(faceMenuWrap) faceMenuWrap.style.display = '';
    if(contractorActions) contractorActions.style.display = 'none';
    if(contractorFab) contractorFab.classList.remove('open');
  };

  if(contractorFab) contractorFab.onclick = () => {
    const isOpen = contractorActions.style.display !== 'none';
    contractorActions.style.display = isOpen ? 'none' : 'flex';
    contractorFab.classList.toggle('open', !isOpen);
  };

  // Action button placeholders
  document.getElementById('ca-new')?.addEventListener('click', ()=>{ alert('New contract'); });
  document.getElementById('ca-save')?.addEventListener('click', ()=>{ alert('Save'); });
  document.getElementById('ca-contracts')?.addEventListener('click', ()=>{ alert('My Contracts'); });
  document.getElementById('ca-send')?.addEventListener('click', ()=>{ alert('Send'); });
  document.getElementById('ca-print')?.addEventListener('click', ()=>{ alert('Print'); });
  document.getElementById('ca-edit')?.addEventListener('click', ()=>{ alert('Edit'); });
})();

// ═══ Surcharge Overlay Controller ═══
(function(){
  const surBtn   = document.getElementById('surcharge-btn');
  const surMenu  = document.getElementById('surcharge-menu');
  const surTicker = document.getElementById('surcharge-ticker');
  const btnDiscount = document.getElementById('sur-discount');
  const btnFuel    = document.getElementById('sur-fuel');
  const btnCC      = document.getElementById('sur-cc');
  const btnTax     = document.getElementById('sur-tax');
  const btnUndo    = document.getElementById('sur-undo');
  if(!surBtn) return;

  let menuOpen = false;

  surBtn.addEventListener('click', ()=>{
    menuOpen = !menuOpen;
    surMenu.style.display = menuOpen ? 'flex' : 'none';
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e)=>{
    if(menuOpen && !e.target.closest('#surcharge-wrap')){
      menuOpen = false;
      surMenu.style.display = 'none';
    }
  });

  function toggleMod(key, btn){
    surchargeState[key] = !surchargeState[key];
    btn.classList.toggle('active', surchargeState[key]);
    refreshSurchargeUI();
    compute();
    computeTotals();
  }

  btnDiscount.addEventListener('click', (e)=>{ e.stopPropagation(); toggleMod('discount', btnDiscount); });
  btnFuel.addEventListener('click', (e)=>{ e.stopPropagation(); toggleMod('fuel', btnFuel); });
  btnCC.addEventListener('click', (e)=>{ e.stopPropagation(); toggleMod('cc', btnCC); });
  btnTax.addEventListener('click', (e)=>{ e.stopPropagation(); toggleMod('tax', btnTax); });

  btnUndo.addEventListener('click', (e)=>{
    e.stopPropagation();
    resetSurcharges();
  });

  function refreshSurchargeUI(){
    const active = hasActiveSurcharges();
    surBtn.classList.toggle('has-mods', active);

    // Build ticker
    surTicker.innerHTML = '';
    if(surchargeState.discount) surTicker.innerHTML += '<span class="sur-tick discount">−10% Discount</span>';
    if(surchargeState.fuel)     surTicker.innerHTML += '<span class="sur-tick fuel">+5% Fuel</span>';
    if(surchargeState.tax)      surTicker.innerHTML += `<span class="sur-tick tax">+${(TAX_RATE*100).toFixed(0)}% Tax</span>`;
    if(surchargeState.cc)       surTicker.innerHTML += '<span class="sur-tick cc">+3% CC Fee</span>';
    surTicker.style.display = active ? 'flex' : 'none';

    // Sync button active states
    btnDiscount.classList.toggle('active', surchargeState.discount);
    btnFuel.classList.toggle('active', surchargeState.fuel);
    btnCC.classList.toggle('active', surchargeState.cc);
    btnTax.classList.toggle('active', surchargeState.tax);

    console.log('[Surcharge] State:', JSON.stringify(surchargeState));
  }

  // Expose reset globally
  window.resetSurcharges = function(){
    surchargeState.discount = false;
    surchargeState.fuel = false;
    surchargeState.cc = false;
    surchargeState.tax = false;
    refreshSurchargeUI();
    compute();
    computeTotals();
  };
  // Alias for clear-order handler (called before IIFE is available)
  window._surchargeRefreshUI = refreshSurchargeUI;
})();

// --- Sales Sheet ---
(function(){
  const KEY_SALES = 'yl_sales_v1';
  const ssBtn      = document.getElementById('sales-sheet-btn');
  const ssPage     = document.getElementById('sales-sheet-page');
  const ssBack     = document.getElementById('ss-back');
  const ssBody     = document.getElementById('ss-body');
  const ssEmpty    = document.getElementById('ss-empty');
  const appEl      = document.querySelector('.app');
  const faceMenuWrap = document.getElementById('face-menu-wrap');

  // Checkout modal elements
  const ckModal   = document.getElementById('checkout-modal');
  const ckCustomer= document.getElementById('ck-customer');
  const ckCancel  = document.getElementById('ck-cancel');
  const ckConfirm = document.getElementById('ck-confirm');

  let salesHistory = [];
  function saveSales(){ localStorage.setItem(KEY_SALES, JSON.stringify(salesHistory)); }
  function loadSales(){ const r = localStorage.getItem(KEY_SALES); if(r) try{ salesHistory = JSON.parse(r); }catch(e){ salesHistory=[]; } }

  function formatDate(){
    const d = new Date();
    return String(d.getMonth()+1).padStart(2,'0') + '/' + String(d.getDate()).padStart(2,'0') + '/' + d.getFullYear();
  }

  // Open checkout modal — called when user wants to finalize order
  // prefilledName: optional customer name from QWERTY keyboard flow
  function openCheckout(prefilledName){
    if(!order.length) return alert('Add items to the order first.');
    if(ckCustomer) ckCustomer.value = prefilledName || '';
    // default radios
    const puRadio = document.querySelector('input[name="ck-delivery"][value="P/U"]');
    const delRadio = document.querySelector('input[name="ck-delivery"][value="Deliver"]');
    // auto-select based on whether a delivery location is active
    const activeDel = deliveryLocations.find(d => d.active);
    if(activeDel && delRadio) delRadio.checked = true;
    else if(puRadio) puRadio.checked = true;
    if(ckModal) ckModal.style.display = 'flex';
  }

  if(ckCancel) ckCancel.onclick = ()=>{ ckModal.style.display = 'none'; };

  if(ckConfirm) ckConfirm.onclick = ()=>{
    const customerName = (ckCustomer ? ckCustomer.value.trim() : '') || 'Walk-in';
    const deliveryMethod = (document.querySelector('input[name="ck-delivery"]:checked') || {}).value || 'P/U';
    const txnType = (document.querySelector('input[name="ck-txn"]:checked') || {}).value || 'Cash';
    const dateStr = formatDate();
    const taxRate = TAX_RATE;

    // Create a sales record for each order line item
    order.forEach(o => {
      const scoopSize = o.scoop || 'small';
      const matItem = inventory.find(x => x.id === o.id);
      const materialName = matItem ? matItem.name : o.name;
      const pricePerItem = matItem ? (getSafePrices(matItem)[scoopSize] || 0) : 0;
      // o.price already = pricePerScoop × scoopsNeeded (full line cost)
      const lineTotal = Number(o.price) || 0;
      const lineTax = Math.round(lineTotal * taxRate * 100) / 100;
      const lineGrand = Math.round((lineTotal + lineTax) * 100) / 100;

      salesHistory.push({
        customer:    customerName,
        date:        dateStr,
        delivery:    deliveryMethod,
        quantity:    o.qtyScoops || o.qty,
        material:    materialName + ' (' + scoopSize + ')',
        pricePerItem: pricePerItem,
        total:       lineTotal,
        tax:         lineTax,
        grandTotal:  lineGrand,
        txnType:     txnType
      });
    });

    saveSales();
    // Clear the current order
    order = []; saveOrder(); renderOrder(); computeTotals();
    if(ckModal) ckModal.style.display = 'none';
    alert('Order saved to Sales Sheet!');
  };

  // Wire the "New Order" button to open checkout
  if(typeof newOrderBtn !== 'undefined' && newOrderBtn){
    const originalNewOrder = newOrderBtn.onclick;
    newOrderBtn.onclick = ()=>{
      // First add current material to order (same as before)
      if(!selected) return alert('Select a material first');
      const scoop = document.querySelector('input[name="scoop"]:checked').value;
      const scoopsNeeded = Number(scoopsEl.textContent)||0;
      const quantity = toNonNegativeNumber(qtyEl.value) || 1;
      const price = getItemScoopPrice(selected, scoop) * scoopsNeeded;
      order.push({id:selected.id, name:selected.name, qty:quantity, scoop, qtyScoops:scoopsNeeded, price});
      saveOrder(); renderOrder(); computeTotals();
      // Then open checkout
      openCheckout('');
    };
  }

  // --- Complete Order button: triggers confirmation → QWERTY keyboard → save flow ---
  const clearOrderBtn2 = document.getElementById('clear-order');
  if(clearOrderBtn2){
    const checkoutBtn = document.createElement('button');
    checkoutBtn.textContent = 'Complete Order';
    checkoutBtn.style.cssText = 'background:linear-gradient(180deg,#ffe033,#ffc800);color:#111;font-weight:700;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;margin-left:4px';
    // Step 1: Show confirmation modal before completing
    checkoutBtn.onclick = ()=> {
      if(!order.length) return alert('Add items to the order first.');
      console.log('[YL] Complete Order clicked — showing confirmation.');
      openOrderConfirmation();
    };
    clearOrderBtn2.parentNode.insertBefore(checkoutBtn, clearOrderBtn2.nextSibling);
  }

  // --- Order Confirmation Modal (Step 1: "Are you sure?") ---
  const orderConfirmModal = document.getElementById('order-confirm-modal');
  const orderConfirmYes = document.getElementById('order-confirm-yes');
  const orderConfirmNo = document.getElementById('order-confirm-no');

  function openOrderConfirmation() {
    if(orderConfirmModal) orderConfirmModal.style.display = 'flex';
  }
  function closeOrderConfirmation() {
    if(orderConfirmModal) orderConfirmModal.style.display = 'none';
  }

  if(orderConfirmNo) orderConfirmNo.onclick = () => {
    console.log('[YL] Order confirmation: No — cancelled.');
    closeOrderConfirmation();
  };
  if(orderConfirmYes) orderConfirmYes.onclick = () => {
    console.log('[YL] Order confirmation: Yes — proceeding to customer name entry.');
    closeOrderConfirmation();
    openQwertyKeyboard();
  };
  // Close on backdrop click
  if(orderConfirmModal) orderConfirmModal.addEventListener('click', (e) => {
    if(e.target === orderConfirmModal) closeOrderConfirmation();
  });

  // --- QWERTY Keyboard Modal (Step 2: Customer Name) ---
  const qwertyModal = document.getElementById('qwerty-modal');
  const qwertyText = document.getElementById('qwerty-text');
  const qwertyRows = document.getElementById('qwerty-rows');
  const qwertySave = document.getElementById('qwerty-save');
  const qwertyClear = document.getElementById('qwerty-clear');

  let qwertyBuffer = '';
  let qwertyShift = false;

  // Build QWERTY keyboard layout dynamically using app's fonts and graphics
  const QWERTY_LAYOUT = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['shift','z','x','c','v','b','n','m','backspace'],
    ['space']
  ];

  function buildQwertyKeyboard() {
    if(!qwertyRows) return;
    qwertyRows.innerHTML = '';
    QWERTY_LAYOUT.forEach((row, ri) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'qwerty-row';
      // Indent second row slightly like a real keyboard
      if(ri === 1) rowDiv.style.paddingLeft = '16px';
      row.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'qwerty-key';
        if(key === 'shift') {
          btn.classList.add('qwerty-key-shift');
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
          btn.title = 'Shift';
          if(qwertyShift) btn.classList.add('qwerty-shift-active');
          btn.onclick = (e) => { e.preventDefault(); qwertyShift = !qwertyShift; buildQwertyKeyboard(); };
        } else if(key === 'backspace') {
          btn.classList.add('qwerty-key-back');
          btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>';
          btn.title = 'Backspace';
          btn.onclick = (e) => { e.preventDefault(); qwertyBuffer = qwertyBuffer.slice(0, -1); updateQwertyDisplay(); };
        } else if(key === 'space') {
          btn.classList.add('qwerty-key-space');
          btn.textContent = 'Space';
          btn.onclick = (e) => { e.preventDefault(); qwertyBuffer += ' '; updateQwertyDisplay(); };
        } else {
          const displayChar = qwertyShift ? key.toUpperCase() : key;
          btn.textContent = displayChar;
          btn.onclick = (e) => {
            e.preventDefault();
            qwertyBuffer += displayChar;
            if(qwertyShift) { qwertyShift = false; buildQwertyKeyboard(); }
            updateQwertyDisplay();
          };
        }
        rowDiv.appendChild(btn);
      });
      qwertyRows.appendChild(rowDiv);
    });
  }

  function updateQwertyDisplay() {
    if(qwertyText) qwertyText.textContent = qwertyBuffer || '';
  }

  function openQwertyKeyboard() {
    qwertyBuffer = '';
    qwertyShift = true; // Start with shift for capital first letter
    updateQwertyDisplay();
    buildQwertyKeyboard();
    // Auto-select delivery toggle based on active delivery location
    const activeDel = deliveryLocations.find(d => d.active);
    const delRadio = document.querySelector('input[name="qw-delivery"][value="Deliver"]');
    const puRadio  = document.querySelector('input[name="qw-delivery"][value="P/U"]');
    if(activeDel && delRadio) delRadio.checked = true;
    else if(puRadio) puRadio.checked = true;
    if(qwertyModal) qwertyModal.style.display = 'flex';
    console.log('[YL] QWERTY keyboard opened for customer name entry.');
  }

  function closeQwertyKeyboard() {
    if(qwertyModal) qwertyModal.style.display = 'none';
  }

  // Clear button: undo/clear the name input
  if(qwertyClear) qwertyClear.onclick = () => {
    console.log('[YL] QWERTY Clear — input cleared.');
    qwertyBuffer = '';
    updateQwertyDisplay();
  };

  // Save button: finalize order → push sales records to localStorage → navigate to Sales Sheet
  if(qwertySave) qwertySave.onclick = () => {
    const customerName = (qwertyBuffer || '').trim() || 'Walk-in';
    console.log(`Customer name saved: ${customerName}`);
    closeQwertyKeyboard();

    // Read inline delivery / transaction type from QWERTY modal options
    const deliveryMethod = (document.querySelector('input[name="qw-delivery"]:checked') || {}).value || 'P/U';
    const txnType = (document.querySelector('input[name="qw-txn"]:checked') || {}).value || 'Cash';
    const dateStr = formatDate();
    const taxRate = TAX_RATE;

    try {
      // Capture surcharge state at time of order
      const surActive = hasActiveSurcharges();
      const surSnap = JSON.parse(JSON.stringify(surchargeState));

      // Package each order line item into a salesRecord object
      order.forEach(o => {
        const scoopSize = o.scoop || 'small';
        const matItem = inventory.find(x => x.id === o.id);
        const materialName = matItem ? matItem.name : o.name;
        const pricePerItem = matItem ? (getSafePrices(matItem)[scoopSize] || 0) : 0;
        // o.price = pricePerScoop × scoopsNeeded (full line cost)
        const lineTotal = Number(o.price) || 0;

        let lineTax, lineGrand, modifiers;
        if(surActive){
          const sur = applySurcharges(lineTotal);
          lineTax = sur.taxAmt;
          lineGrand = sur.finalTotal;
          modifiers = sur.breakdown.map(b => b.label + ' ($' + Math.abs(b.value).toFixed(2) + ')').join(', ');
        } else {
          lineTax = Math.round(lineTotal * taxRate * 100) / 100;
          lineGrand = Math.round((lineTotal + lineTax) * 100) / 100;
          modifiers = '';
        }

        salesHistory.push({
          customer:    customerName,
          date:        dateStr,
          delivery:    deliveryMethod,
          quantity:    o.qtyScoops || o.qty,
          material:    materialName + ' (' + scoopSize + ')',
          pricePerItem: pricePerItem,
          total:       lineTotal,
          tax:         lineTax,
          grandTotal:  lineGrand,
          txnType:     txnType,
          modifiers:   modifiers
        });
      });

      saveSales();
      console.log('[YL] Full order data pushed to localStorage (salesRecords).');

      // Clear the current order and reset surcharges
      order = []; saveOrder(); renderOrder(); computeTotals();
      if(typeof window.resetSurcharges === 'function') window.resetSurcharges();

      // Navigate to Sales Sheet so the new record is visible immediately
      loadSales();
      renderSalesTable();
      if(appEl) appEl.style.display = 'none';
      if(faceMenuWrap) faceMenuWrap.style.display = 'none';
      const _surWrap = document.getElementById('surcharge-wrap');
      const _surTick = document.getElementById('surcharge-ticker');
      if(_surWrap) _surWrap.style.display = 'none';
      if(_surTick) _surTick.style.display = 'none';
      if(ssPage) ssPage.style.display = 'flex';
      console.log('[YL] Redirected to Sales Sheet.');
    } catch (err) {
      console.error('[YL] Error saving order:', err);
      alert('Error saving order: ' + err.message);
    }
  };

  // Close QWERTY on backdrop click
  if(qwertyModal) qwertyModal.addEventListener('click', (e) => {
    if(e.target === qwertyModal) closeQwertyKeyboard();
  });

  // Sales Sheet page navigation
  const surWrap = document.getElementById('surcharge-wrap');
  const surTick = document.getElementById('surcharge-ticker');
  if(ssBtn) ssBtn.onclick = ()=>{
    loadSales();
    renderSalesTable();
    if(appEl) appEl.style.display = 'none';
    if(faceMenuWrap) faceMenuWrap.style.display = 'none';
    if(surWrap) surWrap.style.display = 'none';
    if(surTick) surTick.style.display = 'none';
    ssPage.style.display = 'flex';
  };

  if(ssBack) ssBack.onclick = ()=>{
    ssPage.style.display = 'none';
    if(appEl) appEl.style.display = '';
    if(faceMenuWrap) faceMenuWrap.style.display = '';
    if(surWrap) surWrap.style.display = '';
    // Re-show ticker if there are active surcharges
    if(surTick && hasActiveSurcharges()) surTick.style.display = 'flex';
  };

  // --- Sales Sheet Edit Flow ---
  // Modal elements for edit confirmation (red warning)
  const ssEditModal   = document.getElementById('ss-edit-confirm-modal');
  const ssEditYes     = document.getElementById('ss-edit-confirm-yes');
  const ssEditNo      = document.getElementById('ss-edit-confirm-no');
  /** Index of the record currently pending edit confirmation */
  let pendingEditIdx  = null;

  /**
   * renderSalesTable – render each sales record with an Edit button column
   * The Edit button (pencil icon) triggers the red warning confirmation first.
   */
  function renderSalesTable(){
    if(!ssBody) return;
    ssBody.innerHTML = '';
    if(!salesHistory.length){
      if(ssEmpty) ssEmpty.style.display = 'block';
      return;
    }
    if(ssEmpty) ssEmpty.style.display = 'none';
    salesHistory.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.idx = idx;
      tr.innerHTML = `
        <td class="ss-edit-col">
          <button class="ss-edit-btn" data-edit-idx="${idx}" title="Edit record">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </td>
        <td>${esc(s.customer)}</td>
        <td>${esc(s.date)}</td>
        <td>${esc(s.delivery)}</td>
        <td>${s.quantity}</td>
        <td>${esc(s.material)}</td>
        <td class="ss-price">$${Number(s.pricePerItem).toFixed(2)}</td>
        <td class="ss-price">$${Number(s.total).toFixed(2)}</td>
        <td class="ss-price">$${Number(s.tax).toFixed(2)}</td>
        <td class="ss-mods">${esc(s.modifiers || '—')}</td>
        <td class="ss-price">$${Number(s.grandTotal).toFixed(2)}</td>
        <td class="ss-txn">${esc(s.txnType)}</td>
      `;
      ssBody.appendChild(tr);
    });

    // Wire edit buttons to open confirmation modal
    ssBody.querySelectorAll('.ss-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        pendingEditIdx = parseInt(btn.dataset.editIdx, 10);
        console.log(`[SS] Edit button clicked for record #${pendingEditIdx}`);
        if(ssEditModal) ssEditModal.style.display = 'flex';
      });
    });
  }

  // --- Edit confirmation modal handlers ---
  if(ssEditNo) ssEditNo.onclick = () => {
    console.log('[SS] Edit confirmation: No — cancelled.');
    pendingEditIdx = null;
    if(ssEditModal) ssEditModal.style.display = 'none';
  };

  if(ssEditYes) ssEditYes.onclick = () => {
    console.log(`[SS] Edit confirmation: Yes — entering edit mode for record #${pendingEditIdx}`);
    if(ssEditModal) ssEditModal.style.display = 'none';
    if(pendingEditIdx !== null) enterEditMode(pendingEditIdx);
  };

  // Close edit confirm on backdrop click
  if(ssEditModal) ssEditModal.addEventListener('click', (e) => {
    if(e.target === ssEditModal){ pendingEditIdx = null; ssEditModal.style.display = 'none'; }
  });

  /**
   * enterEditMode – convert a table row to inline editable inputs
   * Shows Save (checkmark) and Undo (revert) icons in the Edit column.
   * @param {number} idx – index into salesHistory
   */
  function enterEditMode(idx){
    const s = salesHistory[idx];
    if(!s) return;
    // Snapshot for undo
    const snapshot = JSON.parse(JSON.stringify(s));

    const row = ssBody.querySelector(`tr[data-idx="${idx}"]`);
    if(!row) return;
    row.classList.add('ss-row-editing');

    // Editable fields and their keys
    const editableFields = [
      { key: 'customer',     label: 'Customer',   type: 'text' },
      { key: 'date',         label: 'Date',        type: 'text' },
      { key: 'delivery',     label: 'Delivery',    type: 'text' },
      { key: 'quantity',     label: 'Qty',         type: 'number' },
      { key: 'material',     label: 'Material',    type: 'text' },
      { key: 'pricePerItem', label: 'Price/Item',  type: 'number' },
      { key: 'total',        label: 'Total',       type: 'number' },
      { key: 'tax',          label: 'Tax',         type: 'number' },
      { key: 'modifiers',    label: 'Modifiers',   type: 'text' },
      { key: 'grandTotal',   label: 'Grand Total', type: 'number' },
      { key: 'txnType',      label: 'Txn Type',    type: 'text' }
    ];

    // Build new row HTML with inputs
    let editHTML = `<td class="ss-edit-col">
      <div class="ss-row-actions">
        <button class="ss-row-action ss-row-action-save" title="Save changes">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="ss-row-action ss-row-action-undo" title="Undo changes">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h10a5 5 0 0 1 0 10H9"/><polyline points="3 10 7 6"/><polyline points="3 10 7 14"/></svg>
        </button>
      </div>
    </td>`;

    editableFields.forEach(f => {
      const val = f.type === 'number' ? Number(s[f.key]).toFixed(2) : (s[f.key] || '');
      editHTML += `<td><input type="${f.type}" data-field="${f.key}" value="${esc(String(val))}" placeholder="${f.label}" ${f.type === 'number' ? 'step="0.01" min="0"' : ''}></td>`;
    });

    row.innerHTML = editHTML;

    // Wire Save button
    row.querySelector('.ss-row-action-save').addEventListener('click', (e) => {
      e.preventDefault();
      const changes = [];
      row.querySelectorAll('input[data-field]').forEach(inp => {
        const field = inp.dataset.field;
        const newVal = inp.type === 'number' ? parseFloat(inp.value) || 0 : inp.value.trim();
        const oldVal = snapshot[field];
        if(String(newVal) !== String(oldVal)){
          changes.push({ field, oldVal, newVal });
        }
        salesHistory[idx][field] = newVal;
      });
      saveSales();
      console.log(`[SS] Record #${idx} saved. Changes:`, changes.length ? changes : 'none');
      renderSalesTable();
    });

    // Wire Undo button — revert to snapshot and re-render
    row.querySelector('.ss-row-action-undo').addEventListener('click', (e) => {
      e.preventDefault();
      salesHistory[idx] = snapshot;
      console.log(`[SS] Record #${idx} reverted to snapshot.`);
      renderSalesTable();
    });

    console.log(`[SS] Entered edit mode for record #${idx}: ${s.customer} / ${s.date}`);
  }

  function esc(str){ const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

  loadSales();
})();
