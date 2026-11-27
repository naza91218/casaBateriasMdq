import type { Plantilla } from './index.js';
import { Caja, LayoutSimple, Linea, Parrafo, texto } from './layout.js';

/** Constancia del botón de arrepentimiento para el comprador (FR-058). Se conecta en la fase 8. */
export const plantillasLegales: Record<string, Plantilla> = {
  arrepentimiento_recibido: (d) => ({
    asunto: `Recibimos tu solicitud de arrepentimiento · ${texto(d.codigo)}`,
    cuerpo: (
      <LayoutSimple
        titulo="Recibimos tu solicitud"
        comercio={d.comercio as Record<string, string> | undefined}
      >
        <Parrafo>{d.nombre ? `Hola, ${texto(d.nombre)}:` : 'Hola:'}</Parrafo>
        <Parrafo>
          Registramos tu pedido de arrepentimiento de la compra. Te vamos a contactar para coordinar
          la devolución.
        </Parrafo>
        <Caja>
          <Linea>Pedido: #{texto(d.numero)}</Linea>
          <Linea>
            Código de la solicitud: <strong>{texto(d.codigo)}</strong>
          </Linea>
        </Caja>
        <Parrafo>Guardá este código: te sirve para consultar el estado de la solicitud.</Parrafo>
      </LayoutSimple>
    ),
  }),
};
