-- Savia Database Initialization Script
-- Focus: Traceability and Stock Automation

-- 1. Insumos (Raw Materials)
CREATE TABLE IF NOT EXISTS insumos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    unidad VARCHAR(10) NOT NULL, -- 'g', 'ml', 'un'
    stock_actual DECIMAL(10, 2) DEFAULT 0,
    stock_minimo DECIMAL(10, 2) DEFAULT 0,
    costo_por_unidad DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Productos Terminados (Finished Products)
CREATE TABLE IF NOT EXISTS productos_terminados (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock_actual INTEGER DEFAULT 0,
    fecha_vencimiento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Fórmulas (Bridge table for Recipes)
CREATE TABLE IF NOT EXISTS formulas (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos_terminados(id) ON DELETE CASCADE,
    insumo_id INTEGER REFERENCES insumos(id),
    cantidad_requerida DECIMAL(10, 2) NOT NULL, -- Quantity per unit of product
    UNIQUE(producto_id, insumo_id)
);

-- 4. Producción (Production Batches)
CREATE TABLE IF NOT EXISTS produccion (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos_terminados(id),
    cantidad_producida INTEGER NOT NULL,
    fecha_produccion DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(20) DEFAULT 'Completado'
);

-- 5. Compras (Purchases for Insumos)
CREATE TABLE IF NOT EXISTS compras (
    id SERIAL PRIMARY KEY,
    insumo_id INTEGER REFERENCES insumos(id),
    cantidad DECIMAL(10, 2) NOT NULL,
    costo_total DECIMAL(10, 2) NOT NULL,
    fecha_compra DATE DEFAULT CURRENT_DATE
);

-- 6. Ventas (Sales of Products)
CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos_terminados(id),
    cantidad INTEGER NOT NULL,
    precio_total DECIMAL(10, 2) NOT NULL,
    fecha_venta DATE DEFAULT CURRENT_DATE
);

-- Sample Data for Verification
INSERT INTO insumos (nombre, unidad, stock_actual, stock_minimo, costo_por_unidad) VALUES
('Aceite de Coco', 'ml', 1000, 200, 0.05),
('Cera de Abeja', 'g', 500, 100, 0.10);

INSERT INTO productos_terminados (nombre, precio, stock_actual) VALUES
('Bálsamo Labial Natural', 5.00, 0);

INSERT INTO formulas (producto_id, insumo_id, cantidad_requerida) VALUES
(1, 1, 10), -- 10ml Aceite Coco per unit
(1, 2, 5);   -- 5g Cera Abeja per unit
