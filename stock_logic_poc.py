# Logic for Stock Automation - Savia App
# This script simulates the backend logic for processing a production batch

class StockManager:
    def __init__(self, db_state):
        self.db = db_state

    def simulate_production(self, producto_id, cantidad):
        print(f"\n--- Iniciando Producción: {cantidad} unidades de Producto ID {producto_id} ---")
        
        # 1. Get Formula
        ingredients_needed = self.db['formulas'].get(producto_id, [])
        if not ingredients_needed:
            return "Error: No se encontró fórmula para este producto."

        # 2. Check Stock Availability
        required_amounts = []
        for insumo_id, qty_per_unit in ingredients_needed:
            total_required = qty_per_unit * cantidad
            current_stock = self.db['insumos'][insumo_id]['stock']
            
            if current_stock < total_required:
                insumo_name = self.db['insumos'][insumo_id]['nombre']
                return f"Error: Stock insuficiente de '{insumo_name}'. Necesario: {total_required}, Disponible: {current_stock}"
            
            required_amounts.append((insumo_id, total_required))

        # 3. Process Transaction (Atomic simulation)
        for insumo_id, amount in required_amounts:
            self.db['insumos'][insumo_id]['stock'] -= amount
            print(f"Descontado {amount} de Insumo ID {insumo_id}")

        self.db['productos'][producto_id]['stock'] += cantidad
        print(f"Sumado {cantidad} a Produto ID {producto_id}")
        
        return "Éxito: Producción completada y stock actualizado."

# Mock Database State
mock_db = {
    'insumos': {
        1: {'nombre': 'Aceite de Coco', 'stock': 1000},
        2: {'nombre': 'Cera de Abeja', 'stock': 500}
    },
    'productos': {
        1: {'nombre': 'Bálsamo Labial', 'stock': 0}
    },
    'formulas': {
        1: [(1, 10), (2, 5)] # (InsumoID, Qty)
    }
}

manager = StockManager(mock_db)

# Test 1: Successful Production
print(manager.simulate_production(1, 50))

# Test 2: Insufficient Stock
print(manager.simulate_production(1, 200))
