/**
 * Seed entrypoint.
 *
 * Phase 0 intentionally ships a placeholder: catalog seeds (attributes, skills,
 * races, edges, powers, bestiary) and the bootstrap admin arrive in Phase 2.
 */
async function main(): Promise<void> {
  console.warn('[seed] Nenhuma seed implementada na Fase 0. Catálogos entram na Fase 2.');
}

main().catch((error: unknown) => {
  console.error('[seed] Falha ao executar seed', error);
  process.exitCode = 1;
});
