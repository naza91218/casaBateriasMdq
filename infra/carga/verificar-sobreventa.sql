-- Después de compras.js: ningún producto quedó con stock negativo y lo reservado por pedidos
-- vivos más el stock actual da el stock que había antes de la prueba.
-- Uso: psql "$DATABASE_URL" -v producto="'<id>'" -f infra/carga/verificar-sobreventa.sql

select count(*) as productos_con_stock_negativo
from productos
where stock < 0;

select p.nombre,
       p.stock as stock_actual,
       coalesce(sum(i.cantidad) filter (where pe.estado <> 'cancelado'), 0) as vendidas_en_pedidos_vivos,
       p.stock + coalesce(sum(i.cantidad) filter (where pe.estado <> 'cancelado'), 0) as stock_inicial_calculado
from productos p
left join pedido_items i on i.producto_id = p.id
left join pedidos pe on pe.id = i.pedido_id
where p.id = :producto
group by p.id;

-- Después de webhooks.js con PAGO: el pedido cambió de estado una sola vez y tiene un solo pago.
-- select count(*) from pedido_eventos where pedido_id = '<id>' and a = 'pagado' and not rechazado;  -- 1
-- select count(*) from pagos where pedido_id = '<id>';  -- 1
