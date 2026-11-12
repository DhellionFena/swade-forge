import { env } from '@/lib/env';

const capabilities = [
  {
    title: 'Campanhas',
    description:
      'Reúna o grupo, convide os jogadores e mantenha NPCs, cenas e anotações no mesmo lugar.',
  },
  {
    title: 'Fichas que conhecem as regras',
    description:
      'Atributos, perícias, vantagens e complicações validados enquanto o personagem é criado.',
  },
  {
    title: 'Rolagens ao vivo',
    description:
      'Dado Selvagem, Ases e Falha Crítica resolvidos na ficha e registrados no log da mesa.',
  },
];

const foundation = [
  { label: 'API', value: 'NestJS + TypeORM' },
  { label: 'Banco', value: 'PostgreSQL 16 + pgcrypto' },
  { label: 'Interface', value: 'Next.js 15 + Tailwind' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-md bg-accent font-mono text-sm font-bold text-canvas"
            >
              FS
            </span>
            <div>
              <p className="font-semibold leading-tight">{env.NEXT_PUBLIC_APP_NAME}</p>
              <p className="text-xs text-muted">Savage Worlds, sem planilhas</p>
            </div>
          </div>
          <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
            Fase 0 · Fundação
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        <section className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Savage Worlds Adventure Edition
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            A campanha inteira em um só lugar.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            O Forja Selvagem tira fichas, NPCs, eventos e rolagens do meio das planilhas e coloca
            tudo na mesa. O sistema aplica as regras; o mestre continua no comando da história.
          </p>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="O que o Forja oferece">
          {capabilities.map((capability) => (
            <article
              key={capability.title}
              className="rounded-lg border border-line bg-surface p-5 transition-colors duration-normal hover:bg-hover"
            >
              <h2 className="font-semibold">{capability.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{capability.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-xl border border-line bg-elevated p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold">Fundação pronta para crescer</h2>
            <span className="font-mono text-xs text-success">todos os serviços no ar</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Monorepo, banco, health checks e containers já estão montados. A próxima fase é a
            autenticação: login, usuários e sessão de ponta a ponta.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            {foundation.map((item) => (
              <div key={item.label} className="rounded-md border border-line bg-surface px-4 py-3">
                <dt className="font-mono text-xs uppercase tracking-wide text-muted">
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-muted">
          <p>Forja Selvagem · projeto não oficial para mesas pequenas</p>
          <p className="font-mono">v0.1.0</p>
        </div>
      </footer>
    </div>
  );
}
