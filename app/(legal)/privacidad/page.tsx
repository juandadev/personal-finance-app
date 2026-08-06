import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Logo } from "@/components/sidebar/logo"
import { getPrivacyNoticeConfig } from "@/lib/env/server"

export const metadata: Metadata = {
  title: "Aviso de Privacidad | Finance",
  description:
    "Aviso de privacidad para la beta cerrada de la aplicación de finanzas personales.",
}

export const dynamic = "force-dynamic"

export default function PrivacyNoticePage() {
  const { controllerAddress, controllerName, privacyEmail, securityEmail } =
    getPrivacyNoticeConfig()

  return (
    <div
      lang="es-MX"
      className="bg-background text-foreground min-h-svh px-4 py-6 md:px-10 md:py-10"
    >
      <header className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <Link
          href="/"
          className="bg-primary focus-visible:ring-ring rounded-lg px-4 py-3 outline-none focus-visible:ring-3"
          aria-label="Ir al inicio"
        >
          <Logo />
        </Link>
        <Button asChild variant="secondary" size="sm">
          <Link href="/login">Iniciar Sesión</Link>
        </Button>
      </header>

      <main className="mx-auto mt-8 max-w-4xl">
        <Card asChild>
          <article className="space-y-8">
            <header className="space-y-3">
              <p className="text-muted-foreground text-sm font-bold">
                Beta cerrada en México
              </p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Aviso de Privacidad
              </h1>
              <p className="text-muted-foreground text-sm">
                Última actualización: 1 de agosto de 2026
              </p>
            </header>

            <NoticeSection title="Responsable">
              <p>
                <strong>{controllerName}</strong>, con domicilio en{" "}
                {controllerAddress}, es responsable del tratamiento de sus datos
                personales en esta beta cerrada.
              </p>
            </NoticeSection>

            <NoticeSection title="Datos que tratamos">
              <p>
                Podemos tratar datos de identidad y contacto, datos de acceso y
                seguridad, preferencias de cuenta, y los registros financieros
                que usted capture o que la aplicación derive para mostrar
                balances, transacciones, presupuestos, metas, tarjetas, pagos
                recurrentes y proyecciones.
              </p>
              <p>
                No incluimos contraseñas, secretos de autenticación ni tokens de
                sesión en las exportaciones de datos.
              </p>
            </NoticeSection>

            <NoticeSection title="Finalidades">
              <ul className="list-disc space-y-2 pl-5">
                <li>Crear, autenticar y proteger su cuenta.</li>
                <li>
                  Prestar y dar soporte a las funciones de finanzas personales.
                </li>
                <li>
                  Generar cierres mensuales, exportaciones y solicitudes de
                  eliminación iniciadas por usted.
                </li>
                <li>
                  Prevenir abuso, investigar incidentes y recuperar el servicio
                  ante fallas.
                </li>
              </ul>
            </NoticeSection>

            <NoticeSection title="Encargados y transferencias">
              <p>
                Utilizamos a <strong>Neon</strong> para base de datos y
                autenticación administrada, y a <strong>Vercel</strong> para
                alojamiento y operación de la aplicación. Estos proveedores
                pueden procesar datos fuera de México conforme a sus términos,
                medidas de seguridad y los instrumentos que correspondan.
              </p>
            </NoticeSection>

            <NoticeSection title="Conservación y eliminación">
              <p>
                Conservamos los datos activos mientras su cuenta participe en la
                beta y sean necesarios para las finalidades descritas. Al
                eliminar la cuenta, retiramos los datos activos y el acceso. Las
                copias protegidas de respaldo pueden conservar datos eliminados
                temporalmente y expirarán en un plazo máximo de{" "}
                <strong>30 días</strong>; no se usarán de nuevo como datos
                activos.
              </p>
            </NoticeSection>

            <NoticeSection title="Derechos ARCO y revocación">
              <p>
                Para solicitar acceso, rectificación, cancelación u oposición,
                revocar su consentimiento, plantear una disputa de identidad o
                pedir ayuda con la exportación o eliminación, escriba a{" "}
                <ContactEmail email={privacyEmail} />. Incluya una descripción
                de su solicitud y un medio para recibir respuesta. Podremos
                pedir información razonable para verificar su identidad sin
                solicitar datos desproporcionados.
              </p>
            </NoticeSection>

            <NoticeSection title="Seguridad e incidentes">
              <p>
                Aplicamos controles de acceso, aislamiento por cuenta, cifrado
                en tránsito y medidas operativas para reducir riesgos. Ningún
                sistema es infalible. Para reportar una vulnerabilidad, sospecha
                de acceso indebido o incidente relacionado con sus datos,
                contacte a <ContactEmail email={securityEmail} />.
              </p>
            </NoticeSection>

            <NoticeSection title="Cambios y contacto">
              <p>
                Si este aviso cambia de forma relevante, comunicaremos la nueva
                versión antes de ampliar el tratamiento. Para cualquier pregunta
                sobre privacidad, contacte a{" "}
                <ContactEmail email={privacyEmail} />.
              </p>
            </NoticeSection>
          </article>
        </Card>
      </main>
    </div>
  )
}

function ContactEmail({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="focus-visible:ring-ring rounded-sm font-bold underline underline-offset-2 outline-none focus-visible:ring-3"
    >
      {email}
    </a>
  )
}

function NoticeSection({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="text-muted-foreground space-y-3 text-sm leading-6">
        {children}
      </div>
    </section>
  )
}
