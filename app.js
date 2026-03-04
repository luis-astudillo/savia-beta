/**
 * Savia App v3.3 - Sin Login / Con Parámetros y Cuotas
 */

const getInitialState = () => ({
    insumos: [],
    productos: [],
    formulas: {},
    transacciones: [],
    config: {
        recargoBase: 10,
        recargo3: 15,
        recargo6: 25,
        descMax: 15,
        costeoDef: 'PPP'
    }
});

let state = JSON.parse(localStorage.getItem('savia_db')) || getInitialState();

// --- RESET PILOTO (Borrar para producción real si se desea mantener datos) ---
if (!localStorage.getItem('savia_pilot_reset_v4')) {
    state = getInitialState();
    localStorage.setItem('savia_db', JSON.stringify(state));
    localStorage.setItem('savia_pilot_reset_v4', 'true');
    localStorage.removeItem('savia_guide_seen'); // Permitir que la guía aparezca de nuevo
}

if (!state.config) state.config = getInitialState().config;

const saveState = () => localStorage.setItem('savia_db', JSON.stringify(state));

let salesAreaChart = null;
let stockRadialChart = null;

const app = {
    init() {
        this.loadConfigUI();
        this.initDashboardCharts();
        this.renderAll();
        this.addFormulaItem();
        if (!localStorage.getItem('savia_guide_seen')) {
            setTimeout(() => this.startGuide(), 500);
        }
    },

    toggleMenu() {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('menu-toggle');
        sidebar.classList.toggle('active');
        toggle.classList.toggle('active');
    },

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        notification.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    },

    // --- PARÁMETROS ---
    loadConfigUI() {
        if (!state.config) state.config = getInitialState().config;
        const c = state.config;
        document.getElementById('cfg-recargo-base').value = c.recargoBase;
        document.getElementById('cfg-recargo-3cuotas').value = c.recargo3;
        document.getElementById('cfg-recargo-6cuotas').value = c.recargo6;
        document.getElementById('cfg-desc-max').value = c.descMax;
        document.getElementById('cfg-costeo-def').value = c.costeoDef;
    },

    saveConfig() {
        state.config = {
            recargoBase: parseFloat(document.getElementById('cfg-recargo-base').value),
            recargo3: parseFloat(document.getElementById('cfg-recargo-3cuotas').value),
            recargo6: parseFloat(document.getElementById('cfg-recargo-6cuotas').value),
            descMax: parseFloat(document.getElementById('cfg-desc-max').value),
            costeoDef: document.getElementById('cfg-costeo-def').value
        };
        saveState();
        this.showNotification("Parámetros guardados con éxito", "success");
    },

    // --- LOGICA DE COMPRAS ---
    calcImpuestosCompra() {
        const qty = parseFloat(document.getElementById('compra-qty').value) || 0;
        const unitPrice = parseFloat(document.getElementById('compra-precio-unit').value) || 0;

        if (qty > 0 && unitPrice > 0) {
            document.getElementById('compra-neto').value = (qty * unitPrice).toFixed(2);
        }

        const neto = parseFloat(document.getElementById('compra-neto').value) || 0;
        const tipo = document.getElementById('compra-tipo-factura').value;
        const perc = parseFloat(document.getElementById('compra-percepcion').value) || 0;

        if (tipo === 'A') {
            const iva = neto * 0.21;
            document.getElementById('compra-iva').value = iva.toFixed(2);
            document.getElementById('compra-total').value = (neto + iva + perc).toFixed(2);
        } else {
            document.getElementById('compra-total').value = (neto + perc).toFixed(2);
            document.getElementById('compra-iva').value = "0.00";
        }
    },

    calcTotalFromTaxes() {
        const neto = parseFloat(document.getElementById('compra-neto').value) || 0;
        const iva = parseFloat(document.getElementById('compra-iva').value) || 0;
        const perc = parseFloat(document.getElementById('compra-percepcion').value) || 0;
        document.getElementById('compra-total').value = (neto + iva + perc).toFixed(2);
    },

    calcManualNeto() {
        const neto = parseFloat(document.getElementById('compra-neto').value) || 0;
        const qty = parseFloat(document.getElementById('compra-qty').value) || 0;
        if (qty > 0) {
            document.getElementById('compra-precio-unit').value = (neto / qty).toFixed(2);
        }
        this.calcImpuestosCompra();
    },

    calcNetoCompra() {
        const total = parseFloat(document.getElementById('compra-total').value) || 0;
        const tipo = document.getElementById('compra-tipo-factura').value;
        const qty = parseFloat(document.getElementById('compra-qty').value) || 0;
        const perc = parseFloat(document.getElementById('compra-percepcion').value) || 0;

        let neto = 0;
        if (tipo === 'A') {
            neto = (total - perc) / 1.21;
            document.getElementById('compra-neto').value = neto.toFixed(2);
            document.getElementById('compra-iva').value = ((total - perc) - neto).toFixed(2);
        } else {
            neto = total - perc;
            document.getElementById('compra-neto').value = neto.toFixed(2);
            document.getElementById('compra-iva').value = "0.00";
        }

        if (qty > 0) {
            document.getElementById('compra-precio-unit').value = (neto / qty).toFixed(2);
        }
    },

    toggleNuevoInsumo(v) {
        const fields = document.getElementById('new-insumo-fields');
        const unitLabel = document.getElementById('compra-unit-label');
        if (v === 'new') {
            fields.style.display = 'block';
            unitLabel.innerText = "(nuevo)";
        } else {
            fields.style.display = 'none';
            const ins = state.insumos.find(i => i.id === parseInt(v));
            if (ins) unitLabel.innerText = `(${ins.unidad})`;
        }
    },

    toggleIvaField(tipo) {
        const ivaInput = document.getElementById('compra-iva');
        if (tipo === 'A') {
            ivaInput.readOnly = false;
            ivaInput.style.background = "white";
        } else {
            ivaInput.readOnly = true;
            ivaInput.style.background = "#eee";
            ivaInput.value = "0.00";
            this.calcNetoCompra();
        }
    },

    registrarCompra() {
        const selectId = document.getElementById('compra-insumo-select').value;
        const qtySancionada = parseFloat(document.getElementById('compra-qty').value);
        const neto = parseFloat(document.getElementById('compra-neto').value);
        const metodo = state.config.costeoDef || 'PPP';
        const log = document.getElementById('compra-log');

        if (isNaN(qtySancionada) || qtySancionada <= 0 || isNaN(neto)) return this.notify(log, "Datos inválidos", "red");

        let insumo;
        if (selectId === 'new') {
            const nombre = document.getElementById('new-insumo-nombre').value;
            const unidad = document.getElementById('new-insumo-unidad').value;
            if (!nombre) return this.notify(log, "Falta nombre", "red");
            const nuevoId = state.insumos.length > 0 ? Math.max(...state.insumos.map(i => i.id)) + 1 : 1;
            insumo = { id: nuevoId, nombre, unidad, stock: 0, minimo: 0, costo: 0 };
            state.insumos.push(insumo);
        } else {
            insumo = state.insumos.find(i => i.id === parseInt(selectId));
        }

        if (metodo === 'PPP') {
            const costoTotalActual = insumo.stock * insumo.costo;
            insumo.costo = (costoTotalActual + neto) / (insumo.stock + qtySancionada);
        } else {
            insumo.costo = neto / qtySancionada;
        }

        insumo.stock += qtySancionada;
        const factTipo = document.getElementById('compra-tipo-factura').value;
        const factNro = document.getElementById('compra-nro').value;
        const factFecha = document.getElementById('compra-fecha').value;
        const factProv = document.getElementById('compra-proveedor').value;
        const factIva = parseFloat(document.getElementById('compra-iva').value) || 0;
        const factPerc = parseFloat(document.getElementById('compra-percepcion').value) || 0;
        const factTotal = parseFloat(document.getElementById('compra-total').value) || 0;

        state.transacciones.unshift({
            tipo: 'COMPRA',
            detalle: `Compra ${qtySancionada}${insumo.unidad} ${insumo.nombre}`,
            monto: -factTotal,
            neto: neto,
            iva: factIva,
            percepciones: factPerc,
            comprobante: factNro,
            fechaComprobante: factFecha,
            proveedor: factProv,
            tipoComprobante: factTipo,
            insumo: insumo.nombre,
            cantidad: qtySancionada,
            fecha: new Date().toLocaleString(),
            timestamp: Date.now()
        });
        this.recalcularPreciosSugeridos();
        saveState();
        this.renderAll();
        this.showNotification("Compra registrada correctamente", "success");
    },

    // --- VENTAS Y CUOTAS ---
    uiToggleCuotas(metodo) {
        document.getElementById('pago-cuotas-div').style.display = (metodo === 'Tarjeta de Crédito') ? 'block' : 'none';
    },

    calcTotalVenta() {
        const id = parseInt(document.getElementById('venta-select').value);
        const qty = parseInt(document.getElementById('venta-qty').value) || 0;
        const pago = document.getElementById('venta-pago').value;
        const cuotas = parseInt(document.getElementById('venta-cuotas').value) || 1;
        const descPct = parseFloat(document.getElementById('venta-descuento').value) || 0;
        const maxDesc = state.config.descMax || 100;

        // Aplicar tope de parámetros si existe
        const actualDesc = Math.min(descPct, maxDesc);

        const prod = state.productos.find(p => p.id === id);
        if (!prod) return;

        const subtotal = prod.precio * qty;
        const bonif = subtotal * (actualDesc / 100);

        let recargoPct = 0;
        if (pago === 'Tarjeta de Crédito') {
            if (cuotas === 3) recargoPct = state.config.recargo3 / 100;
            else if (cuotas === 6) recargoPct = state.config.recargo6 / 100;
            else recargoPct = state.config.recargoBase / 100;
        }

        const baseParaRecargo = subtotal - bonif;
        const recargo = baseParaRecargo * recargoPct;
        const total = baseParaRecargo + recargo;

        document.getElementById('venta-subtotal').innerText = `$${subtotal.toFixed(2)}`;
        document.getElementById('venta-bonif').innerText = `-$${bonif.toFixed(2)}`;
        document.getElementById('venta-recargo-monto').innerText = `+$${recargo.toFixed(2)}`;
        document.getElementById('venta-total').innerText = `$${total.toFixed(2)}`;

        return { total, prod, qty, bonif, recargo, pago, cuotas };
    },

    registrarVenta() {
        const c = this.calcTotalVenta();
        if (!c) return;
        if (c.prod.stock < c.qty) return alert("Stock insuficiente");

        c.prod.stock -= c.qty;
        const detCuotas = (c.pago === 'Tarjeta de Crédito') ? ` en ${c.cuotas} cuotas` : '';

        const cliente = document.getElementById('venta-cliente').value;
        const nroRecibo = document.getElementById('venta-comprobante').value;

        state.transacciones.unshift({
            tipo: 'VENTA',
            detalle: `Venta: ${c.qty}x ${c.prod.nombre} [${c.pago}${detCuotas}]`,
            monto: c.total,
            subtotal: c.prod.precio * c.qty,
            bonif: c.bonif,
            recargo: c.recargo,
            cliente: cliente,
            comprobante: nroRecibo,
            producto: c.prod.nombre,
            cantidad: c.qty,
            pago: c.pago,
            cuotas: c.cuotas,
            fecha: new Date().toLocaleString(),
            timestamp: Date.now()
        });

        saveState();
        this.renderAll();
        this.updateChart();
        this.showNotification("Venta registrada: $" + c.total.toFixed(2), "success");
    },

    // --- RECETAS ---
    addFormulaItem(insumoId = null, qty = null) {
        const container = document.getElementById('formula-items');
        const div = document.createElement('div');
        div.className = 'formula-row';
        div.style.display = 'flex'; div.style.gap = '5px'; div.style.marginBottom = '5px';
        const opts = state.insumos.map(i => `<option value="${i.id}" ${insumoId == i.id ? 'selected' : ''}>${i.nombre} (${i.unidad})</option>`).join('');
        div.innerHTML = `
            <select class="formula-insumo-id" style="flex: 2;">${opts}</select>
            <input type="number" class="formula-qty" placeholder="Cant" style="flex: 1;" value="${qty || ''}">
            <button onclick="this.parentElement.remove()" style="border:none; cursor:pointer; background:none;">🗑️</button>
        `;
        container.appendChild(div);
    },

    crearProducto() {
        const idEdit = document.getElementById('edit-prod-id').value;
        const nombre = document.getElementById('new-prod-nombre').value;
        const margen = parseFloat(document.getElementById('new-prod-margen').value);
        const temporada = document.getElementById('new-prod-temporada').value;
        const rows = document.querySelectorAll('.formula-row');
        const formulaItems = [];
        let unitCost = 0;

        rows.forEach(r => {
            const iId = parseInt(r.querySelector('.formula-insumo-id').value);
            const qty = parseFloat(r.querySelector('.formula-qty').value);
            if (iId && qty) {
                formulaItems.push({ insumoId: iId, qty });
                unitCost += (state.insumos.find(i => i.id === iId).costo * qty);
            }
        });

        if (!nombre || formulaItems.length === 0) return;
        const pSugerido = unitCost * (1 + (margen / 100));

        if (idEdit) {
            let p = state.productos.find(p => p.id === parseInt(idEdit));
            p.nombre = nombre; p.precio = pSugerido; p.margen = margen; p.temporada = temporada;
            state.formulas[idEdit] = formulaItems;
        } else {
            const nuevoId = state.productos.length > 0 ? Math.max(...state.productos.map(p => p.id)) + 1 : 1;
            state.productos.push({ id: nuevoId, nombre, precio: pSugerido, stock: 0, margen, temporada });
            state.formulas[nuevoId] = formulaItems;
        }
        this.cancelarEdicionReceta();
        saveState();
        this.renderAll();
        this.showNotification("Receta guardada", "success");
    },

    editarReceta(id) {
        const p = state.productos.find(p => p.id === id);
        const f = state.formulas[id];
        document.getElementById('edit-prod-id').value = id;
        document.getElementById('new-prod-nombre').value = p.nombre;
        document.getElementById('new-prod-margen').value = p.margen || 100;
        document.getElementById('new-prod-temporada').value = p.temporada || 'Todas';
        document.getElementById('recipe-form-title').innerText = "Editando Receta: " + p.nombre;
        document.getElementById('btn-save-recipe').innerText = "Actualizar";
        document.getElementById('btn-cancel-recipe').style.display = "block";
        const container = document.getElementById('formula-items');
        container.innerHTML = "";
        f.forEach(item => this.addFormulaItem(item.insumoId, item.qty));
        document.getElementById('module-recetas').scrollIntoView();
    },

    cancelarEdicionReceta() {
        document.getElementById('edit-prod-id').value = "";
        document.getElementById('new-prod-nombre').value = "";
        document.getElementById('new-prod-margen').value = 100;
        document.getElementById('new-prod-temporada').value = 'Todas';
        document.getElementById('recipe-form-title').innerText = "Definir Nueva Receta";
        document.getElementById('btn-save-recipe').innerText = "Guardar Receta";
        document.getElementById('btn-cancel-recipe').style.display = "none";
        document.getElementById('formula-items').innerHTML = "";
        this.addFormulaItem();
    },

    eliminarProducto(id) {
        if (confirm("¿Estás seguro de que deseas eliminar este producto y su receta?")) {
            state.productos = state.productos.filter(p => p.id !== id);
            delete state.formulas[id];
            saveState();
            this.renderAll();
        }
    },

    eliminarInsumo(id) {
        if (confirm("¿Estás seguro de que deseas eliminar este insumo? Si forma parte de alguna receta, ésta podría verse afectada.")) {
            state.insumos = state.insumos.filter(i => i.id !== id);
            saveState();
            this.renderAll();
        }
    },

    recalcularPreciosSugeridos() {
        state.productos.forEach(p => {
            const f = state.formulas[p.id];
            if (f) {
                let cost = 0;
                f.forEach(item => {
                    const ins = state.insumos.find(i => i.id === item.insumoId);
                    if (ins) cost += (ins.costo * item.qty);
                });
                p.precio = cost * (1 + ((p.margen || 100) / 100));
            }
        });
    },

    // --- PRODUCCIÓN ---
    registrarProduccion() {
        const id = parseInt(document.getElementById('prod-select').value);
        const qty = parseInt(document.getElementById('prod-qty').value);
        const lote = document.getElementById('prod-lote').value || 'S/N';
        const formula = state.formulas[id];
        if (!formula) return;
        for (let item of formula) {
            const ins = state.insumos.find(i => i.id === item.insumoId);
            if (!ins || ins.stock < (item.qty * qty)) return alert("Falta stock de " + ins.nombre);
        }
        formula.forEach(item => state.insumos.find(i => i.id === item.insumoId).stock -= (item.qty * qty));
        state.productos.find(p => p.id === id).stock += qty;
        state.transacciones.unshift({
            tipo: 'PRODUCCIÓN',
            detalle: `Lote [${lote}] fabricado: ${qty}x ${state.productos.find(p => p.id === id).nombre}`,
            monto: 0,
            lote: lote,
            productoId: id,
            fecha: new Date().toLocaleString(),
            timestamp: Date.now()
        });
        document.getElementById('prod-lote').value = "";
        saveState();
        this.renderAll();
        this.showNotification("Producción de lote registrada", "success");
    },

    // --- MODULOS Y RENDER ---
    showModule(id) {
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        document.getElementById('module-' + id).classList.add('active');
        document.getElementById('nav-' + id).classList.add('active');

        // Cerrar menú en móvil al seleccionar
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('menu-toggle').classList.remove('active');
        }
    },

    renderAll() {
        document.getElementById('insumos-compras-body').innerHTML = state.insumos.map(i => `<tr><td data-label="Insumo">${i.nombre}</td><td data-label="Stock">${i.stock.toFixed(2)} ${i.unidad}</td><td data-label="Costo Neto">$${i.costo.toFixed(2)} <button onclick="app.eliminarInsumo(${i.id})" style="border:none; background:none; cursor:pointer; float:right;" title="Eliminar Insumo">🗑️</button></td></tr>`).join('');
        document.getElementById('insumos-body').innerHTML = state.insumos.map(i => `<tr><td data-label="Insumo">${i.nombre}</td><td data-label="Stock">${i.stock.toFixed(2)}</td><td data-label="Estado"><span class="badge ${i.stock < 10 ? 'badge-low' : 'badge-ok'}">${i.stock < 10 ? 'Bajo' : 'OK'}</span></td></tr>`).join('');
        document.getElementById('productos-body').innerHTML = state.productos.map(p => `<tr><td data-label="Producto">${p.nombre}</td><td data-label="Precio">$${p.precio.toFixed(2)}</td><td data-label="Stock">${p.stock}</td><td data-label="Últ. Lote">${this.getLastLot(p.id)}</td><td data-label="Acción">
            <button onclick="app.editarReceta(${p.id})" style="border:none; background:none; cursor:pointer;" title="Editar">✎</button>
            <button onclick="app.eliminarProducto(${p.id})" style="border:none; background:none; cursor:pointer; margin-left:10px;" title="Eliminar">🗑️</button>
        </td></tr>`).join('');
        document.getElementById('productos-ventas-body').innerHTML = state.productos.map(p => {
            const lot = this.getLastLot(p.id);
            return `<tr><td data-label="Producto">${p.nombre}</td><td data-label="Stock">${p.stock} un</td><td data-label="Precio">$${p.precio.toFixed(2)}</td><td data-label="Últ. Lote">${lot}</td></tr>`;
        }).join('');

        const iSel = document.getElementById('compra-insumo-select');
        const prevVal = iSel.value || 'new';
        iSel.innerHTML = '<option value="new">-- CREAR NUEVO --</option>' + state.insumos.map(i => `<option value="${i.id}">${i.nombre}</option>`).join('');
        iSel.value = prevVal;
        this.toggleNuevoInsumo(iSel.value);

        const pOpts = state.productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
        document.getElementById('prod-select').innerHTML = pOpts;
        document.getElementById('venta-select').innerHTML = pOpts;

        this.updateStats();
        this.renderHistorial();
        this.calcTotalVenta();
        this.updateDashboardCharts();
        this.updateSaldosCaja();
    },

    getLastLot(productoId) {
        const last = state.transacciones.find(t => t.tipo === 'PRODUCCIÓN' && t.productoId === productoId);
        return last ? last.lote : '-';
    },

    updateStats() {
        const inv = state.insumos.reduce((a, i) => a + (i.stock * i.costo), 0) + state.productos.reduce((a, p) => a + (p.stock * p.precio), 0);
        document.getElementById('stat-valor').innerText = `$${inv.toFixed(2)}`;
        document.getElementById('stat-ingresos').innerText = `$${state.transacciones.reduce((a, t) => a + t.monto, 0).toFixed(2)}`;
        document.getElementById('stat-trans').innerText = state.transacciones.length;
    },

    renderHistorial() {
        document.getElementById('historial-list').innerHTML = state.transacciones.map(t => `<div style="font-size:0.8rem; border-bottom:1px solid #eee; padding:5px;"><strong>${t.tipo}</strong>: ${t.detalle}</div>`).join('');
    },

    initDashboardCharts() {
        // 1. Gráfico de Áreas - Tendencia de Ventas
        const salesOptions = {
            series: [{ name: 'Ventas ($)', data: [] }],
            chart: { type: 'area', height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
            colors: ['#726191'],
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9, stops: [0, 90, 100] } },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            xaxis: { categories: [] }
        };
        salesAreaChart = new ApexCharts(document.querySelector("#salesAreaChart"), salesOptions);
        salesAreaChart.render();

        // 2. Gráfico Radial - Top 5 Insumos
        const stockOptions = {
            series: [],
            chart: { type: 'radialBar', height: 350, fontFamily: 'Inter, sans-serif' },
            plotOptions: {
                radialBar: {
                    hollow: { size: '30%' },
                    dataLabels: {
                        name: { show: true },
                        value: { show: true, formatter: function (val) { return val + "%" } }
                    }
                }
            },
            colors: ['#726191', '#9ba486', '#a78bfa', '#cbd5e1', '#fcd34d'],
            labels: []
        };
        stockRadialChart = new ApexCharts(document.querySelector("#stockRadialChart"), stockOptions);
        stockRadialChart.render();
    },

    updateDashboardCharts() {
        const temporada = document.getElementById('dash-filtro-temporada').value;
        const filteredProds = state.productos.filter(p => temporada === 'Todas' || p.temporada === temporada);

        // --- Cálculo de Tendencia (Ventas Mensuales) ---
        const salesByMonth = this.getMonthlySales(temporada);
        if (salesAreaChart) {
            salesAreaChart.updateOptions({ xaxis: { categories: salesByMonth.labels } });
            salesAreaChart.updateSeries([{ name: 'Ventas ($)', data: salesByMonth.values }]);
        }

        // --- Variación Mensual (KPI) ---
        const variation = this.calculateMonthlyVariation(salesByMonth.values);
        const varEl = document.getElementById('stat-crecimiento-ventas');
        if (varEl) {
            varEl.innerText = (variation >= 0 ? '+' : '') + variation.toFixed(1) + '%';
            varEl.style.color = variation >= 0 ? 'green' : 'red';
        }

        // --- Rentabilidad Table ---
        const tableBody = document.getElementById('profitabilityTableBody');
        if (tableBody) {
            const sortedProds = [...filteredProds].sort((a, b) => b.margen - a.margen);
            tableBody.innerHTML = sortedProds.map(p => {
                let costoInsumos = 0;
                if (state.formulas[p.id]) {
                    state.formulas[p.id].forEach(item => {
                        const ins = state.insumos.find(i => i.id === item.insumoId);
                        if (ins) costoInsumos += (ins.costo * item.qty);
                    });
                }
                const margenNeto = p.precio > 0 ? ((p.precio - costoInsumos) / p.precio) * 100 : 0;
                const colorMargen = margenNeto >= 50 ? '#9ba486' : (margenNeto >= 20 ? 'orange' : 'red');
                return `<tr>
                     <td data-label="Producto">${p.nombre}</td>
                     <td data-label="Precio Venta">$${p.precio.toFixed(2)}</td>
                     <td data-label="Costo Promedio Insumos">$${costoInsumos.toFixed(2)}</td>
                     <td data-label="Margen Neto (%)" style="font-weight: 700; color: ${colorMargen}">${margenNeto.toFixed(1)}%</td>
                 </tr>`;
            }).join('');
        }

        // --- Radial Top 5 Insumos ---
        const sortedInsumos = [...state.insumos].sort((a, b) => b.stock - a.stock).slice(0, 5);
        if (stockRadialChart) {
            // maxCap generico para graficar a nivel radial
            const maxCap = 1000;
            const insumoPcts = sortedInsumos.map(i => Math.min(Math.round((i.stock / maxCap) * 100), 100));
            stockRadialChart.updateOptions({ labels: sortedInsumos.map(i => i.nombre) });
            stockRadialChart.updateSeries(insumoPcts);
        }

        // --- KPI: Eficiencia (Stock vs Ventas) ---
        const totalStock = filteredProds.reduce((acc, p) => acc + p.stock, 0);
        const totalVentas = salesByMonth.values[salesByMonth.values.length - 1] || 0;
        const eficiencia = totalStock > 0 ? (totalVentas / (totalStock * 10)) * 100 : 0;
        const efiEl = document.getElementById('stat-eficiencia');
        if (efiEl) efiEl.innerText = Math.min(eficiencia, 100).toFixed(1) + '%';

        // --- KPI: Semáforo Días de stock ---
        let diasStock = "0 Días";
        let colorSemaforo = "red";

        const prodTrans = state.transacciones.filter(t => t.tipo === 'VENTA');
        const unidadesVendidas = prodTrans.reduce((a, t) => a + t.cantidad, 0);
        const diasConDatos = prodTrans.length > 0 ? 30 : 0; // Aproximacion simple a 30 dias

        if (diasConDatos > 0 && unidadesVendidas > 0) {
            let ritmoDiario = unidadesVendidas / diasConDatos;
            let diasCalculados = Math.round(totalStock / ritmoDiario);
            diasStock = diasCalculados + " Días";
            colorSemaforo = diasCalculados > 30 ? '#9ba486' : (diasCalculados > 10 ? 'orange' : 'red');
        } else if (totalStock > 0) {
            diasStock = "+90 Días";
            colorSemaforo = "#9ba486";
        }

        const sdEl = document.getElementById('stat-dias-stock');
        const scard = document.getElementById('card-dias-stock');
        if (sdEl && scard) {
            sdEl.innerText = diasStock;
            sdEl.style.color = colorSemaforo;
            scard.style.borderColor = colorSemaforo;
            scard.style.backgroundColor = colorSemaforo === 'red' ? '#ffeeee' : (colorSemaforo === 'orange' ? '#fff6ed' : '#f4fbef');
        }
    },

    getMonthlySales(temporada) {
        const last6Months = [];
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const values = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            last6Months.push(monthNames[d.getMonth()]);

            // Sumar ventas de ese mes filtradas por temporada
            const monthTotal = state.transacciones.filter(t => {
                if (t.tipo !== 'VENTA') return false;
                const tDate = new Date(t.fecha);
                const isSameMonth = tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
                if (!isSameMonth) return false;

                if (temporada === 'Todas') return true;
                // Buscar si el producto de la venta es de esa temporada (simplificado)
                return t.detalle.includes(temporada);
            }).reduce((acc, t) => acc + t.monto, 0);

            values.push(monthTotal);
        }
        return { labels: last6Months, values: values };
    },

    calculateMonthlyVariation(values) {
        if (values.length < 2) return 0;
        const current = values[values.length - 1];
        const previous = values[values.length - 2];
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    },

    getProfitabilityData(products) {
        const sorted = [...products].sort((a, b) => b.margen - a.margen).slice(0, 5);
        return {
            labels: sorted.map(p => p.nombre),
            values: sorted.map(p => p.margen)
        };
    },

    notify(el, m, c) { this.showNotification(m, c === 'red' ? 'error' : 'success'); },
    exportarDoc(tipo, formato) {
        let headers = [];
        let rows = [];
        let title = `Reporte de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
        let filename = `savia_${tipo}_${new Date().toISOString().slice(0, 10)}`;

        // Leer filtros de fecha
        const dateFrom = document.getElementById('report-date-from').value;
        const dateTo = document.getElementById('report-date-to').value;
        const tsFrom = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
        const tsTo = dateTo ? new Date(dateTo).getTime() : Infinity;

        // Función auxiliar para filtrar por rango
        const filterByRange = (items) => {
            return items.filter(t => {
                const ts = t.timestamp || new Date(t.fecha).getTime();
                return ts >= tsFrom && ts <= tsTo;
            });
        };

        // Obtener Datos y Cabeceras
        if (tipo === 'productos') {
            headers = ['ID', 'Nombre', 'Precio ($)', 'Stock', 'Últ. Lote', 'Margen %', 'Temporada'];
            rows = state.productos.map(p => [p.id, p.nombre, p.precio.toFixed(2), p.stock, this.getLastLot(p.id), p.margen, p.temporada]);
        }
        else if (tipo === 'insumos') {
            headers = ['ID', 'Nombre', 'Stock', 'Uni', 'Min', 'Costo'];
            rows = state.insumos.map(i => [i.id, i.nombre, i.stock.toFixed(2), i.unidad, i.minimo, i.costo.toFixed(4)]);
        }
        else if (tipo === 'compras') {
            const compras = filterByRange(state.transacciones.filter(t => t.tipo === 'COMPRA'));
            headers = ['Fecha', 'Comprobante', 'Proveedor', 'Insumo', 'Cant', 'Neto', 'IVA', 'Perc', 'Total'];
            rows = compras.map(t => [
                t.fecha.split(',')[0], t.comprobante || '-', t.proveedor || '-', t.insumo || '-',
                t.cantidad || 0, (t.neto || 0).toFixed(2), (t.iva || 0).toFixed(2),
                (t.percepciones || 0).toFixed(2), Math.abs(t.monto).toFixed(2)
            ]);
        }
        else if (tipo === 'ventas') {
            const ventas = filterByRange(state.transacciones.filter(t => t.tipo === 'VENTA'));
            headers = ['Fecha', 'Comprobante', 'Cliente', 'Producto', 'Cant', 'Sub', 'Bonif', 'Rec', 'Total'];
            rows = ventas.map(t => [
                t.fecha.split(',')[0], t.comprobante || '-', t.cliente || '-', t.producto || '-',
                t.cantidad || 0, (t.subtotal || 0).toFixed(2), (t.bonif || 0).toFixed(2),
                (t.recargo || 0).toFixed(2), (t.monto || 0).toFixed(2)
            ]);
        }
        else if (tipo === 'produccion') {
            const prod = filterByRange(state.transacciones.filter(t => t.tipo === 'PRODUCCIÓN'));
            headers = ['Fecha', 'Producto', 'Lote', 'Cant. Fabricada'];
            rows = prod.map(t => [
                t.fecha.split(',')[0],
                state.productos.find(p => p.id === t.productoId)?.nombre || t.detalle.split('x ')[1] || 'S/D',
                t.lote || 'S/N',
                t.detalle.match(/\d+/) ? t.detalle.match(/\d+/)[0] : '1'
            ]);
        }

        if (rows.length === 0) return alert("No hay datos para exportar.");

        if (formato === 'xlsx') {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            XLSX.utils.book_append_sheet(wb, ws, "Datos");
            XLSX.writeFile(wb, `${filename}.xlsx`);
        }
        else if (formato === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');

            doc.setFontSize(18);
            doc.text(`Savia - ${title}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);

            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 35,
                theme: 'grid',
                headStyles: { fillColor: [114, 97, 145] }, // Savia Violet
                styles: { fontSize: 8 }
            });

            doc.save(`${filename}.pdf`);
        }
    },
    generarListaPrecios() { document.getElementById('price-list-body').innerHTML = state.productos.map(p => `<tr><td data-label="Producto">${p.nombre}</td><td data-label="Precio" style="text-align:right">$${p.precio.toFixed(2)}</td></tr>`).join(''); document.getElementById('price-list-container').style.display = 'block'; },

    resetSistema() {
        if (confirm("🚨 ¡ATENCIÓN! Estás a punto de borrar TODA la información del sistema (productos, compras, ventas e insumos). Esta acción no se puede deshacer.\n\n¿Deseas continuar?")) {
            if (confirm("¿REALMENTE estás seguro? Se perderán todos tus registros históricos.")) {
                localStorage.removeItem('savia_db');
                localStorage.removeItem('savia_guide_seen');
                location.reload();
            }
        }
    },

    // --- GUÍA PROFESIONAL MEJORADA (UX & POSITIONING) ---
    startGuide() {
        const intro = introJs();
        intro.setOptions({
            nextLabel: 'Siguiente →',
            prevLabel: 'Anterior',
            doneLabel: '¡Listo!',
            showProgress: true,
            scrollToElement: true,
            positionPrecedence: ['bottom', 'top', 'right', 'left'],
            steps: [
                {
                    title: '¡Bienvenida a Savia! 🌿',
                    intro: 'Savia es tu centro de inteligencia para cosmética natural. Vamos a configurar tu negocio paso a paso.',
                    position: 'bottom'
                },
                {
                    element: '#sidebar',
                    title: 'Tu Estación de Control',
                    intro: 'Aquí tienes acceso a todos los módulos. El flujo está pensado para que avances desde la compra de insumos hasta la entrega al cliente.',
                    position: 'right'
                },
                {
                    element: '#module-compras',
                    title: '1. Facturación y Compras 🧾',
                    intro: 'Este es el inicio de la cadena. Aquí cargas tus <b>comprobantes de proveedores</b> para alimentar tu stock de materias primas.',
                    position: 'top'
                },
                {
                    element: '#compra-neto',
                    title: 'Precisión de Costos',
                    intro: 'Al ingresar el neto y los impuestos, Savia calcula el <b>Costo Neto Unitario</b>. Este valor es vital porque garantiza que tus precios futuros cubran todos los gastos.',
                    position: 'bottom'
                },
                {
                    element: '#module-recetas',
                    title: '2. Recetas y Productos 📔',
                    intro: 'Aquí defines tus fórmulas. Savia sumará el costo de cada gota, envase y etiqueta para darte un costo total de fabricación.',
                    position: 'top'
                },
                {
                    element: '#new-prod-margen',
                    title: 'Margen de Ganancia',
                    intro: 'Tú decides cuánto ganar. Al poner un margen (ej: 150%), el sistema te sugerirá el precio de venta ideal basado en tus costos reales.',
                    position: 'bottom'
                },
                {
                    element: '#module-produccion',
                    title: '3. Laboratorio (Producción) 🧪',
                    intro: 'Cuando fabricas un lote, el sistema <b>valida automáticamente</b> si tienes stock suficiente. Si confirmas, se descuentan los insumos y se suma el producto terminado.',
                    position: 'top'
                },
                {
                    element: '#module-ventas',
                    title: '4. Punto de Venta 💰',
                    intro: 'Registra tus ventas aquí. Al seleccionar un producto y método de pago (Efectivo, Transferencia o Tarjeta), Savia aplicará los recargos o descuentos automáticamente.',
                    position: 'top'
                },
                {
                    element: '#venta-preview',
                    title: 'Efecto Financiero',
                    intro: 'Antes de emitir, aquí verás exactamente cuánto dinero recibirás neto y cuánto se lleva la pasarela de pago o el descuento.',
                    position: 'left'
                },
                {
                    element: '#module-dashboard',
                    title: '5. Inteligencia de Negocio 📈',
                    intro: '¡Tu brújula! Mira la tendencia de ventas, la salud de tu inventario y cuál es tu producto más rentable por temporada.',
                    position: 'top'
                },
                {
                    title: '¡Savia está Lista! ✨',
                    intro: 'Empieza cargando tus insumos en Facturación. ¡Éxitos con tu producción!',
                    position: 'bottom'
                }
            ]
        });

        // Asegurar que el módulo correcto esté visible para la guía
        intro.onbeforechange(function (targetElement) {
            if (targetElement.id === 'module-compras' || targetElement.id === 'compra-neto') {
                app.showModule('compras');
            } else if (targetElement.id === 'module-recetas' || targetElement.id === 'new-prod-margen') {
                app.showModule('recetas');
            } else if (targetElement.id === 'module-produccion') {
                app.showModule('produccion');
            } else if (targetElement.id === 'module-ventas' || targetElement.id === 'venta-preview') {
                app.showModule('ventas');
            } else if (targetElement.id === 'module-dashboard') {
                app.showModule('dashboard');
            }
        });

        intro.oncomplete(() => {
            localStorage.setItem('savia_guide_seen', 'true');
        });

        intro.start();
    },

    // --- IMPORTACIÓN Y ONBOARDING CON SHEETJS ---
    openImportModal() {
        document.getElementById('modal-import').style.display = 'flex';
        document.getElementById('import-preview-container').style.display = 'none';
        document.getElementById('import-file-input').value = '';
    },
    closeImportModal() { document.getElementById('modal-import').style.display = 'none'; },

    descargarPlantillaImport() {
        const headers = [["Nombre", "Unidad", "Costo", "Stock"]];
        const data = [["Ej: Aceite de Lavanda", "ml", 1500, 100]];
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "Savia_Plantilla_Importacion.xlsx");
    },

    tempImportData: [],

    procesarArchivoImport() {
        const fileInput = document.getElementById('import-file-input');
        const file = fileInput.files[0];
        if (!file) return alert("Por favor, selecciona un archivo.");

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet);

            if (json.length === 0) return alert("El archivo está vacío o tiene un formato incorrecto.");

            // Validar columnas y mapear
            this.tempImportData = json.map(row => ({
                nombre: row.Nombre || row.nombre || "",
                unidad: row.Unidad || row.unidad || "un",
                costo: parseFloat(row.Costo || row.costo) || 0,
                stock: parseFloat(row.Stock || row.stock) || 0
            })).filter(item => item.nombre !== "");

            this.renderImportPreview();
        };
        reader.readAsArrayBuffer(file);
    },

    renderImportPreview() {
        const container = document.getElementById('import-preview-container');
        const body = document.getElementById('import-preview-body');
        const summary = document.getElementById('import-preview-summary');

        body.innerHTML = this.tempImportData.slice(0, 10).map(item => `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.unidad}</td>
                <td>$${item.costo.toFixed(2)}</td>
                <td>${item.stock}</td>
            </tr>
        `).join('');

        if (this.tempImportData.length > 10) {
            body.innerHTML += `<tr><td colspan="4" style="text-align:center; color:grey;">... y ${this.tempImportData.length - 10} elementos más</td></tr>`;
        }

        summary.innerText = `Se detectaron ${this.tempImportData.length} insumos listos para importar.`;
        container.style.display = 'block';
    },

    confirmarImportacionExcel() {
        if (this.tempImportData.length === 0) return;

        this.tempImportData.forEach(item => {
            const nuevoId = state.insumos.length > 0 ? Math.max(...state.insumos.map(i => i.id)) + 1 : 1;
            state.insumos.push({
                id: nuevoId,
                nombre: item.nombre,
                unidad: item.unidad,
                stock: item.stock,
                costo: item.costo,
                minimo: 0
            });

            state.transacciones.unshift({
                tipo: 'SALDO INICIAL',
                detalle: `Carga Masiva: ${item.nombre}`,
                monto: 0,
                fecha: new Date().toLocaleString(),
                timestamp: Date.now()
            });
        });

        saveState();
        this.renderAll();
        this.closeImportModal();
        this.tempImportData = [];
        this.showNotification(`Se importaron ${this.tempImportData.length} insumos correctamente.`, "success");
    },

    // --- CAJA Y FINANZAS ---
    updateSaldosCaja() {
        const saldos = {
            'Efectivo': 0,
            'Transferencia': 0,
            'Mercado Pago': 0
        };

        // Procesar transacciones
        state.transacciones.forEach(t => {
            if (t.tipo === 'VENTA') {
                const metodo = t.pago || 'Efectivo';
                if (saldos.hasOwnProperty(metodo)) saldos[metodo] += t.monto;
                else if (metodo.includes('Tarjeta')) saldos['Transferencia'] += t.monto;
            } else if (t.tipo === 'COMPRA') {
                saldos['Efectivo'] += t.monto; // t.monto es negativo
            } else if (t.tipo === 'AJUSTE CAJA') {
                saldos['Efectivo'] += t.monto;
            }
        });

        const elEf = document.getElementById('saldo-efectivo');
        const elTr = document.getElementById('saldo-transferencia');
        const elMp = document.getElementById('saldo-mercadopago');

        if (elEf) elEf.innerText = `$${saldos['Efectivo'].toFixed(2)}`;
        if (elTr) elTr.innerText = `$${saldos['Transferencia'].toFixed(2)}`;
        if (elMp) elMp.innerText = `$${saldos['Mercado Pago'].toFixed(2)}`;

        // Render movimientos en el módulo de caja
        const movBody = document.getElementById('caja-movimientos-body');
        if (movBody) {
            const movs = state.transacciones.filter(t => ['VENTA', 'COMPRA', 'AJUSTE CAJA'].includes(t.tipo)).slice(0, 10);
            movBody.innerHTML = movs.map(t => {
                const color = t.monto >= 0 ? '#2e7d32' : '#d32f2f';
                const prefix = t.monto >= 0 ? '+' : '';
                return `<tr>
                    <td>${t.fecha.split(',')[0]}</td>
                    <td>${t.detalle}</td>
                    <td style="color:${color}; font-weight:700;">${prefix}$${t.monto.toFixed(2)}</td>
                </tr>`;
            }).join('');
        }

        return saldos;
    },

    realizarArqueo() {
        const fisico = parseFloat(document.getElementById('arqueo-fisico').value);
        if (isNaN(fisico)) return alert("Ingresa un monto válido");

        const saldos = this.updateSaldosCaja();
        const teorico = saldos['Efectivo'];
        const diferencia = fisico - teorico;
        const log = document.getElementById('arqueo-log');

        if (Math.abs(diferencia) < 0.01) {
            this.showNotification("Arqueo correcto. La caja coincide.", "success");
            log.innerHTML = `<div style="color:green; font-weight:700; background:#f0f7f0; padding:10px; border-radius:8px;">✅ Arqueo Exitoso: El físico coincide con el teórico.</div>`;
        } else {
            const tipoAjuste = diferencia > 0 ? 'Sobrante de Caja' : 'Faltante de Caja';

            if (confirm(`Diferencia detectada: $${diferencia.toFixed(2)} (${tipoAjuste}). ¿Deseas realizar un ajuste automático para que el saldo teórico coincida con el dinero físico?`)) {
                state.transacciones.unshift({
                    tipo: 'AJUSTE CAJA',
                    detalle: `Ajuste Arqueo: ${tipoAjuste}`,
                    monto: diferencia,
                    fecha: new Date().toLocaleString(),
                    timestamp: Date.now()
                });
                saveState();
                this.renderAll();
                document.getElementById('arqueo-fisico').value = "";
                this.showNotification("Ajuste de caja realizado", "success");
                log.innerHTML = `<div style="color:#726191; font-weight:700; background:#f4f0f9; padding:10px; border-radius:8px;">ℹ️ Ajuste Realizado: Saldo corregido según conteo físico.</div>`;
            }
        }
    }
};

window.onload = () => app.init();
