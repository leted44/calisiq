# CalisIQ — Spec projet pour Claude Code

> Mise à jour : 2026-09-01. Ce document décrit les **décisions et le
> contexte** ; il ne recopie plus les données qui vivent dans le code
> (grille de scoring, schéma SQL), parce que toute duplication finit par
> diverger. Voir les pointeurs « source de vérité » ci-dessous.

## Mission

Application web (PWA) d'analyse biomécanique vidéo pour la calisthénie.
L'utilisateur filme ou importe une vidéo de son hold, l'app extrait la pose
corporelle, calcule un score par critère technique, et propose un plan de
progression basé sur les points faibles détectés.

Porteur du projet : non-développeur, pilote via Claude Code. Toute décision
d'architecture doit rester simple, lisible, et justifiable à quelqu'un qui
ne code pas.

## Sources de vérité (ne pas dupliquer ici)

| Sujet | Fichier |
|---|---|
| Seuils de scoring par figure | `src/lib/pose/grid.ts` |
| Calcul des angles | `src/lib/pose/angles.ts` |
| Scoring et score global | `src/lib/pose/scoring.ts` |
| Exercices correctifs | `src/lib/pose/recommendations.ts` |
| Schéma base de données | `supabase/schema.sql` + `supabase/migrations/` |
| Pipeline d'analyse | `src/lib/pose/runAnalysis.ts` |
| Export vidéo annotée | `src/lib/pose/exportVideo.ts` |

`grid.ts` contient l'historique de calibration de chaque seuil en
commentaires : d'où vient la valeur, sur combien d'échantillons réels, et
ce qui reste à affiner. C'est le fichier à lire avant de toucher au
scoring.

## État des figures

| Figure | Statut | Base des seuils |
|---|---|---|
| Planche (tuck, advanced tuck, straddle, full) | Actif | Recalibré sur échantillons réels notés |
| Handstand | Actif | Hanche/bassin calibrés sur 8 échantillons réels, coude/épaules raisonnés |
| Front Lever (tuck, advanced tuck, straddle, full) | Actif | Recalibré le 2026-09-01 sur 20 échantillons réels |
| Single Leg Front Lever | **Actif, seuils DRAFT** | 4 échantillons seulement, dont 2 inexploitables |
| Handstand Push-up, One Arm Handstand | Non commencé | — |

Le Front Lever a été réactivé le 2026-08-31, puis recalibré le 2026-09-01
sur les 20 échantillons notés via `/calibration` (5 par variation).
L'écart moyen entre la note humaine et la note de la grille est passé de
0.60/1.19/0.60/0.72 à 0.44/0.43/0.28/0.25 (tuck, advanced tuck, straddle,
full). Deux règles ont encadré l'ajustement, et doivent l'encadrer aussi
la prochaine fois : les cibles imposées par la biomécanique (coude et genou
tendus à 180°) ne sont **pas** optimisées, seule leur tolérance l'est, sinon
un geste parfait finirait moins bien noté qu'un geste moyen ; et les
tolérances sont bornées à 35°, au-delà desquelles un critère ne discrimine
plus rien et disparaît de fait du barème. 5 échantillons par variation
reste mince, et certains sont la même exécution notée sous des variations
différentes : continuer à en ajouter et refaire le calcul.

La Single Leg Front Lever n'a pas été recalibrée : 4 échantillons, dont 2
antérieurs aux mesures asymétriques et donc inexploitables. Ses seuils
restent DRAFT. Suivre l'écart dans le bloc « Justesse de la grille » de
`/calibration`.

Vision plus long terme, hors scope : tractions, muscle-up. Ne pas
commencer une nouvelle figure sans validation explicite.

## Ce qui existe aujourd'hui

**Analyse** : import de vidéo ou enregistrement caméra, découpe du segment
à analyser, détection de la fenêtre de hold, score par critère,
recommandation ciblée sur le point faible, ré-analyse depuis l'historique.

**Export vidéo** (levier de croissance, voir plus bas) : squelette
superposé, scores qui évoluent en direct, chrono du hold, ralenti sur la
position la mieux tenue avec le point faible entouré et le fantôme de la
position idéale, écran de score final. Filigrane CalisIQ sur chaque image.

**Suivi** : historique, courbes de progression par figure, comparatif
avant/après entre la vidéo de référence et la dernière analyse.

**Administration** (réservé au compte `is_admin`) : page Statistiques
(inscrits, utilisateurs ayant réellement analysé, rétention) et page
Calibration (mesurer et noter des figures pour affiner les seuils).

## Décisions structurantes prises en cours de route

**Enregistrement opt-in.** Une analyse n'est pas sauvegardée
automatiquement ; l'utilisateur choisit de garder la figure. Certaines
vidéos sont juste un test.

**Seul le segment analysé est conservé.** À l'enregistrement, la vidéo est
recoupée et ré-encodée à 1080p max, sans audio. Téléverser le clip entier
faisait dépasser la limite de 50 Mo par fichier (plafond du plan gratuit
Supabase, non contournable) et consommait le quota de 1 Go trop vite. Les
bornes de découpe enregistrées sont donc remises à zéro.

**Vidéo de référence par figure.** Une session par (utilisateur, figure)
est marquée `is_reference` et destinée à ne jamais être purgée, pour servir
de « avant » au comparatif même quand une expiration automatique des vidéos
sera mise en place.

**Encodage de l'export.** WebCodecs + `mp4-muxer` en premier choix, car
MediaRecorder écrit une durée de piste média erronée qui rend la vidéo non
navigable et fait tronquer les importeurs stricts comme Instagram. Repli
sur MediaRecorder si l'encodeur de l'appareil refuse, avec réparation de la
durée directement dans le fichier (`src/lib/video/fixMp4Duration.ts`).

**Figures asymétriques.** La Single Leg Front Lever (ajoutée le
2026-09-01) a une jambe tendue et une repliée. Or `hip_angle` et
`knee_angle` sont des moyennes pondérées gauche/droite, et
`body_line_angle_from_horizontal` part du milieu des deux chevilles : sur
une figure asymétrique, ces trois mesures décrivent un corps qui n'existe
pas. Trois mesures ont donc été ajoutées dans `angles.ts` —
`torsoAngleFromHorizontal` (tronc seul, valide quelles que soient les
jambes), `straightestKneeAngle` et `straightestLegHipAngle` (jambe la plus
tendue, celle qui porte la difficulté). Toute future figure asymétrique
doit être notée sur ces critères, pas sur les moyennes.

**Rôle admin en base, pas en dur.** Le drapeau `is_admin` vit sur
`profiles`, ce qui évite de coder une adresse e-mail dans le dépôt et
permet de donner ou retirer le rôle sans redéploiement.

## Stack technique (fixée, ne pas relitiger)

- **Frontend** : Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4
- **Pose estimation** : MediaPipe Tasks Vision, `PoseLandmarker` modèle
  `heavy`, exécution côté client
- **Encodage vidéo** : WebCodecs + `mp4-muxer`, repli MediaRecorder
- **Backend** : Supabase (Postgres + Auth + Storage), RLS active
- **Hébergement** : Vercel, déploiement automatique sur `main`
- **Paiement** : Stripe, pas encore implémenté

## Contraintes connues

- **50 Mo par fichier** : plafond du plan gratuit Supabase, non
  configurable. Le passage à 100 Mo suppose le plan Pro à 25 $/mois.
- **1 Go de stockage total** sur le plan gratuit.
- **Single leg front lever non calibrée** : ses scores, et donc le fantôme
  qui en découle, sont approximatifs. Les autres variations de front lever
  ont été recalibrées le 2026-09-01.
- **Pas de multi-langue.** Français uniquement. L'anglais a été demandé
  mais reporté : environ 950 lignes de texte dans 46 fichiers, à faire
  quand on saura si l'audience est francophone ou internationale.

## Stratégie produit (contexte des priorités)

Le lancement passe par Instagram et TikTok (`calisiq.app` sur les deux).
L'export vidéo est le moteur d'acquisition : chaque vidéo publiée porte le
filigrane. **Il doit donc rester gratuit** ; ce qui sera payant plus tard,
c'est le retrait du filigrane, les analyses illimitées et la conservation
des vidéos.

Conséquence sur les arbitrages : tout ce qui touche à l'export et au
partage prime sur les fonctionnalités internes, tant qu'il n'y a pas
d'utilisateurs.

## Règles de collaboration

- Avant toute décision d'architecture non couverte par ce document,
  demander plutôt que de trancher seul.
- Vérifier `npx tsc --noEmit`, `npx eslint .` et `npm run build` avant
  chaque commit.
- Si un choix technique a un impact sur le coût (Supabase, Vercel, API
  tierces), le signaler avant de l'implémenter.
- Code commenté en français dans les parties métier (scoring,
  biomécanique), en anglais pour le reste.
- **Tenir ce document à jour** : à chaque modification qui change l'état
  des figures, les décisions structurantes, les contraintes ou la stack,
  mettre à jour la section concernée dans le même commit. Ne pas y recopier
  de valeurs qui vivent dans le code.
