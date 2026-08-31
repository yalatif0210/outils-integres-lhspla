# LLM du Weekly Operations Brief : Mistral primaire, modèle épinglé par `MISTRAL_MODEL`

## Contexte

Le service `BriefLlmService` ([lhspla-api/src/brief/brief-llm.service.ts](../../lhspla-api/src/brief/brief-llm.service.ts))
génère les sections B/C/D du brief hebdomadaire via un LLM. Le code teste
`ANTHROPIC_API_KEY` en premier et n'appelle Mistral que si elle est absente —
la présentation « Claude primaire / Mistral fallback ». En pratique, aucun
abonnement Anthropic n'a encore été souscrit : **Mistral est le fournisseur
réel en staging et en production**, pas un secours.

Le code appelait `mistral-large-latest` en dur. Ce modèle n'est pas inclus
dans le tier de la clé `MISTRAL_API_KEY` utilisée → l'API renvoyait
`403 tier_not_allowed` (code 1910) et le brief n'était pas générable.

## Décision

1. Le modèle Mistral du brief est lu depuis la variable d'environnement
   `MISTRAL_MODEL`, défaut **`mistral-small-latest`** — le seul modèle garanti
   dans le tier actuel (déjà utilisé sans erreur par `collecte-api` pour la
   traduction).
2. `MISTRAL_MODEL` est câblé de bout en bout : `.env.example`,
   `.env.{staging,prod}.example`, `docker-compose.{staging,prod}.yml`
   (`${MISTRAL_MODEL:-mistral-small-latest}`), et les workflows de déploiement
   (`secrets.MISTRAL_MODEL`, vide accepté).
3. `MISTRAL_MODEL` ne pilote **que le brief**. Le service de traduction
   (`collecte-api`) reste figé sur `mistral-small-latest` : son besoin est
   moindre et il ne doit pas dériver suite à un test sur le brief.

## Conséquences

- Passer à un modèle supérieur (`mistral-medium-latest`, `mistral-large-latest`)
  se fait en posant `MISTRAL_MODEL` — **à condition** que le tier de la clé
  l'autorise, sinon le `403` revient.
- Si un jour `ANTHROPIC_API_KEY` est renseignée, Claude (`claude-sonnet-4-6`)
  redevient le chemin actif sans changement de code — ce ne sera plus un
  hypothétique « primaire » mais le fournisseur effectif.
- Le chemin Mistral envoie `cache_control: { type: 'ephemeral' }` sur le prompt
  système ; si `mistral-small-latest` le rejette, le retirer (gain quasi nul
  sur ce modèle).
