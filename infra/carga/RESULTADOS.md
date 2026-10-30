# Pruebas de carga (T150)

Metas: **p95 < 500 ms**, **0 errores** y **ninguna sobreventa**. Además, anotar CPU y RAM del VPS
para decidir si alcanzan los 4 GB. La prueba que cuenta es en **staging, en el VPS** (fase 9). La
de abajo, en la PC de desarrollo, solo confirma que los scripts funcionan y da una referencia.

## Cómo se corren

Con Docker, sin instalar k6:

```bash
docker run --rm -v "$PWD/infra/carga:/carga" -e API=https://staging.<dominio>/api/v1 grafana/k6:1.8.1 run /carga/buscador.js
```

| Script | Qué simula | Variables |
| :- | :- | :- |
| `buscador.js` | 100 personas a la vez buscando batería (marca → modelo → año → resultados y página del modelo) | `API`, `DURACION` (por defecto `2m`) |
| `compras.js` | Muchas compras simultáneas del mismo producto, con menos stock que compradores | `API`, `PRODUCTO` (id), `COMPRAS` (por defecto 50) |
| `webhooks.js` | Avisos falsificados de Mercado Pago (siempre) y el mismo aviso válido repetido 100 veces (con `PAGO` y `SECRETO`) | `API`, `PAGO`, `SECRETO` |
| `verificar-sobreventa.sql` | Después de `compras.js`: que el stock no haya quedado negativo ni se haya vendido de más | `producto` |

- **Desde dónde:** `buscador.js` y `webhooks.js`, desde afuera (una PC), para medir con la red
  real. `compras.js`, desde el mismo VPS: cada compra simula una IP distinta y la API solo cree
  esa IP si el pedido llega desde la red del servidor. Desde afuera, el límite de 10 compras por
  minuto por IP frena la ráfaga, que también es el comportamiento esperado.
- **CPU y RAM:** mientras corre cada prueba, en el VPS: `docker stats --no-stream` cada 10
  segundos y `free -m` al final.
- **Después:** en staging, cancelar los pedidos de prueba desde el panel; vuelven el stock y los
  datos quedan marcados como de carga (`carga-N@prueba.test`).

## Referencia en la PC de desarrollo (30/10/2026)

API en modo desarrollo (`tsx watch`, sin compilar), Windows 11 y Docker Desktop. **No representa
al VPS.**

| Prueba | Pedidos | Errores | p95 | Resultado |
| :- | -: | -: | -: | :- |
| Buscador: 100 usuarios, 1 minuto a pleno | 4.461 | 0 | 34 ms | OK |
| Compras: 20 a la vez sobre un producto con stock 5 | 20 | 0 | 565 ms | 5 creadas y 15 "sin stock". **Sin sobreventa** (stock final 0, 5 unidades en pedidos) |
| Avisos de Mercado Pago falsificados: 50 por segundo durante 30 s | 1.501 | 0 | 5 ms | Todos rechazados (401) |

Las compras simultáneas del **mismo** producto se procesan en fila: cada una bloquea la fila
del producto hasta terminar, que es lo que evita vender de más. Por eso, con 20 a la vez, las
últimas esperan a las anteriores. Para una casa de baterías, 20 compras del mismo modelo en el
mismo segundo no es un caso real. Si en staging el p95 de esta prueba supera los 500 ms con
cargas realistas (5 a 10 a la vez), se revisa.

## Staging en el VPS

Pendiente: se completa en la fase 9.

| Prueba | Pedidos | Errores | p95 | CPU máx. | RAM máx. | Resultado |
| :- | -: | -: | -: | -: | -: | :- |
| Buscador | | | | | | |
| Compras | | | | | | |
| Avisos de Mercado Pago | | | | | | |

**Conclusión sobre los 4 GB:** pendiente.
