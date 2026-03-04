/**
 * Logic for Stock Automation - Savia App
 * This script simulates the backend logic for processing a production batch in Node.js
 */

class StockManager {
    constructor(dbState) {
        this.db = dbState;
    }

    simulateProduction(productoId, cantidad) {
        console.log(`\n--- Iniciando Producción: ${cantidad} unidades de Producto ID ${productoId} ---`);
        
        // 1. Get Formula
        const ingredientsNeeded = this.db.formulas[productoId];
        if (!ingredientsNeeded) {
            return "Error: No se encontró fórmula para este producto.";
        }

        // 2. Check Stock Availability
        const requiredAmounts = [];
        for (const { insumoId, qtyPerUnit } of ingredientsNeeded) {
            const totalRequired = qtyPerUnit * cantidad;
            const currentStock = this.db.insumos[insumoId].stock;
            
            if (currentStock < totalRequired) {
                const insumoName = this.db.insumos[insumoId].nombre;
                return `Error: Stock insuficiente de '${insumoName}'. Necesario: ${totalRequired}, Disponible: ${currentStock}`;
            }
            
            requiredAmounts.push({ insumoId, totalRequired });
        }

        // 3. Process Transaction (Atomic simulation)
        requiredAmounts.forEach(({ insumoId, totalRequired }) => {
            this.db.insumos[insumoId].stock -= totalRequired;
            console.log(`Descontado ${totalRequired} de Insumo ID ${insumoId}`);
        });

        this.db.productos[productoId].stock += cantidad;
        console.log(`Sumado ${cantidad} a Producto ID ${productoId}`);
        
        return "Éxito: Producción completada y stock actualizado.";
    }
}

// Mock Database State
const mockDb = {
    insumos: {
        1: { nombre: 'Aceite de Coco', stock: 1000 },
        2: { nombre: 'Cera de Abeja', stock: 500 }
    },
    productos: {
        1: { nombre: 'Bálsamo Labial', stock: 0 }
    },
    formulas: {
        1: [
            { insumoId: 1, qtyPerUnit: 10 }, 
            { insumoId: 2, qtyPerUnit: 5 }
        ]
    }
};

const manager = new StockManager(mockDb);

// Test 1: Successful Production
console.log(manager.simulateProduction(1, 50));

// Test 2: Insufficient Stock
console.log(manager.simulateProduction(1, 200));
