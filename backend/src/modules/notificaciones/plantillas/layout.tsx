import type { ReactNode } from 'react';
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'react-email';

/**
 * Diseño común de los mails (T117) con los colores de DESIGN.md. Estilos en línea, que es lo
 * único que respetan todos los clientes de correo. React escapa los textos, así que ningún dato
 * del comprador se interpreta como HTML. Ninguna plantilla recibe ni muestra el DNI (FR-038).
 */
export type Datos = Record<string, unknown>;

export const NOMBRE_COMERCIAL = 'La Casa de las Baterías';

const C = {
  rojo: '#FF2610',
  rojoTexto: '#D41A00',
  rojoVelo: '#FFF1EE',
  negro: '#0B0B0B',
  gris800: '#333333',
  gris600: '#5C5C5C',
  gris200: '#EDEDED',
  gris100: '#F4F4F4',
  blanco: '#FFFFFF',
  whatsapp: '#25D366',
};

const FUENTE = 'Montserrat, Helvetica, Arial, sans-serif';

const s = {
  body: { backgroundColor: C.gris100, fontFamily: FUENTE, margin: 0, padding: '24px 0' },
  contenedor: {
    backgroundColor: C.blanco,
    maxWidth: '560px',
    margin: '0 auto',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  marca: { backgroundColor: C.negro, padding: '20px 28px' },
  marcaTexto: {
    color: C.blanco,
    fontSize: '20px',
    fontWeight: 800,
    margin: 0,
    letterSpacing: '0.5px',
  },
  marcaRayo: { color: C.rojo },
  cuerpo: { padding: '24px 28px 8px' },
  titulo: {
    color: C.negro,
    fontSize: '22px',
    fontWeight: 800,
    lineHeight: '28px',
    margin: '0 0 12px',
  },
  texto: { color: C.gris800, fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' },
  chico: { color: C.gris600, fontSize: '13px', lineHeight: '20px', margin: '0 0 4px' },
  caja: {
    backgroundColor: C.rojoVelo,
    borderRadius: '6px',
    padding: '16px 20px',
    margin: '8px 0 16px',
  },
  item: { color: C.gris800, fontSize: '14px', lineHeight: '20px', margin: '0 0 6px' },
  total: { color: C.negro, fontSize: '16px', fontWeight: 800, margin: '8px 0 0' },
  botonPrincipal: {
    backgroundColor: C.rojoTexto,
    color: C.blanco,
    fontSize: '15px',
    fontWeight: 700,
    padding: '12px 20px',
    borderRadius: '6px',
    textDecoration: 'none',
  },
  botonWhatsapp: {
    backgroundColor: C.whatsapp,
    color: C.negro,
    fontSize: '15px',
    fontWeight: 700,
    padding: '12px 20px',
    borderRadius: '6px',
    textDecoration: 'none',
  },
  hr: { borderColor: C.gris200, margin: '20px 0' },
  pie: { padding: '0 28px 24px' },
  enlace: { color: C.rojoTexto },
};

export const pesos = (centavos: unknown) =>
  `$${(Number(centavos) / 100).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const texto = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export function Parrafo({ children }: { children: ReactNode }) {
  return <Text style={s.texto}>{children}</Text>;
}

export function Caja({ children }: { children: ReactNode }) {
  return <Section style={s.caja}>{children}</Section>;
}

export function Linea({ children }: { children: ReactNode }) {
  return <Text style={s.item}>{children}</Text>;
}

export function Boton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: '4px 0 16px' }}>
      <Button href={href} style={s.botonPrincipal}>
        {children}
      </Button>
    </Section>
  );
}

function Marco({
  vistaPrevia,
  children,
  pie,
}: {
  vistaPrevia: string;
  children: ReactNode;
  pie: ReactNode;
}) {
  return (
    <Html lang="es">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Preview>{vistaPrevia}</Preview>
      <Body style={s.body}>
        <Container style={s.contenedor}>
          <Section style={s.marca}>
            <Text style={s.marcaTexto}>
              La Casa de las Baterías <span style={s.marcaRayo}>⚡</span>
            </Text>
          </Section>
          <Section style={s.cuerpo}>{children}</Section>
          <Section style={s.pie}>
            <Hr style={s.hr} />
            {pie}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface Item {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

function ResumenPedido({ d }: { d: Datos }) {
  const items = (d.items as Item[] | undefined) ?? [];
  const entrega = d.entrega === 'colocacion' ? 'Colocación a domicilio' : 'Retiro en el local';
  return (
    <Caja>
      <Text style={{ ...s.texto, fontWeight: 700, margin: '0 0 8px' }}>
        Pedido #{texto(d.numero)}
      </Text>
      {items.map((i, n) => (
        <Row key={n}>
          <Column>
            <Text style={s.item}>
              {i.cantidad} × {i.nombre}
            </Text>
          </Column>
          <Column align="right">
            <Text style={s.item}>{pesos(i.precioUnitario * i.cantidad)}</Text>
          </Column>
        </Row>
      ))}
      {Number(d.descuento) > 0 ? (
        <Text style={s.item}>
          Descuento por pago en efectivo o transferencia: −{pesos(d.descuento)}
        </Text>
      ) : null}
      {Number(d.costoZona) > 0 ? (
        <Text style={s.item}>Colocación en tu zona: {pesos(d.costoZona)}</Text>
      ) : null}
      <Text style={s.item}>Entrega: {entrega}</Text>
      <Text style={s.total}>Total: {pesos(d.total)}</Text>
    </Caja>
  );
}

interface Comercio {
  razonSocial?: string;
  cuit?: string;
  domicilio?: string;
  telefono?: string;
}

function DatosDelComercio({ comercio }: { comercio: Comercio | undefined }) {
  const c = comercio ?? {};
  const legal = [c.razonSocial, c.cuit ? `CUIT ${c.cuit}` : ''].filter(Boolean).join(' · ');
  return (
    <>
      <Text style={{ ...s.chico, fontWeight: 700, color: C.gris800 }}>{NOMBRE_COMERCIAL}</Text>
      {c.domicilio ? <Text style={s.chico}>{c.domicilio}</Text> : null}
      {c.telefono ? <Text style={s.chico}>Tel.: {c.telefono}</Text> : null}
      {legal ? <Text style={s.chico}>{legal}</Text> : null}
    </>
  );
}

/**
 * Mail al comprador sobre su pedido: saludo, mensaje, bloque propio de cada plantilla, resumen,
 * botones de seguimiento y WhatsApp y los datos del comercio (FR-038).
 */
export function LayoutComprador({
  d,
  titulo,
  intro,
  children,
}: {
  d: Datos;
  titulo: string;
  intro: string;
  children?: ReactNode;
}) {
  const saludo = d.nombre ? `Hola, ${texto(d.nombre)}:` : 'Hola:';
  return (
    <Marco
      vistaPrevia={`${titulo} · pedido #${texto(d.numero)}`}
      pie={<DatosDelComercio comercio={d.comercio as Comercio | undefined} />}
    >
      <Text style={s.titulo}>{titulo}</Text>
      <Parrafo>{saludo}</Parrafo>
      <Parrafo>{intro}</Parrafo>
      {children}
      <ResumenPedido d={d} />
      <Boton href={texto(d.urlSeguimiento)}>Seguí tu pedido</Boton>
      {d.whatsappUrl ? (
        <Section style={{ margin: '0 0 16px' }}>
          <Button href={texto(d.whatsappUrl)} style={s.botonWhatsapp}>
            Escribinos por WhatsApp
          </Button>
        </Section>
      ) : null}
    </Marco>
  );
}

/** Mail sin pedido de por medio para el comprador (por ejemplo, el arrepentimiento). */
export function LayoutSimple({
  titulo,
  children,
  comercio,
}: {
  titulo: string;
  children: ReactNode;
  comercio?: Comercio;
}) {
  return (
    <Marco vistaPrevia={titulo} pie={<DatosDelComercio comercio={comercio} />}>
      <Text style={s.titulo}>{titulo}</Text>
      {children}
    </Marco>
  );
}

/** Avisos internos: al administrador del panel. */
export function LayoutAdmin({
  titulo,
  children,
  enlace,
}: {
  titulo: string;
  children: ReactNode;
  enlace?: { href: string; texto: string };
}) {
  return (
    <Marco
      vistaPrevia={titulo}
      pie={<Text style={s.chico}>Aviso automático de la tienda online.</Text>}
    >
      <Text style={s.titulo}>{titulo}</Text>
      {children}
      {enlace?.href ? <Boton href={enlace.href}>{enlace.texto}</Boton> : null}
    </Marco>
  );
}

export function Enlace({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={s.enlace}>
      {children}
    </Link>
  );
}
