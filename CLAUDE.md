# CalisIQ (ex-Planche Coach) — Spec projet pour Claude Code

## Mission

Application web (PWA) d'analyse biomécanique vidéo pour la planche en
calisthénie. L'utilisateur uploade une vidéo de son hold/tentative, l'app
extrait la pose corporelle, calcule un score par critère technique, et
propose un plan de progression basé sur les points faibles détectés.

Porteur du projet : non-développeur, pilote via Claude Code. Toute décision
d'architecture doit rester simple, lisible, et justifiable à quelqu'un qui
ne code pas.

## Scope MVP — limites strictes

**Une seule figure : la planche**, sur ses 4 progressions (tuck planche,
advanced tuck, straddle planche, full planche). Pas d'autre figure tant que
le MVP n'est pas validé.

**NE PAS FAIRE dans le MVP, même si ça semble facile :**
- Pas de temps réel / analyse caméra live. Upload de vidéo uniquement.
- Pas de comptage de reps.
- Pas de système social / leaderboard / anti-cheat.
- Pas de coach conversationnel LLM.
- Pas d'app native (iOS/Android). Web responsive uniquement, portage
  Capacitor plus tard si validation.
- Pas de multi-langue au lancement (français uniquement).
- Pas de plan d'entraînement complet — uniquement 2-3 exercices correctifs
  ciblés sur le critère le plus faible détecté.

Si une fonctionnalité hors de cette liste semble nécessaire en cours de
dev, s'arrêter et le signaler avant de l'implémenter.

## Stack technique (fixée, ne pas relitiger)

- **Frontend** : Next.js 14+ (App Router), TypeScript, Tailwind CSS.
- **Pose estimation** : MediaPipe Tasks Vision — `PoseLandmarker`, modèle
  `pose_landmarker_full`, exécution côté client (navigateur, WASM/GPU).
- **Backend / DB / Auth / Storage** : Supabase (Postgres + Auth + Storage
  pour les vidéos).
- **Hébergement** : Vercel.
- **Paiement** (à partir de la beta payante, pas du MVP technique v0) :
  Stripe.

## Architecture du pipeline

```
Upload vidéo (client)
  → Extraction frames (canvas, ~5-10 fps échantillonnés sur la durée du hold)
  → PoseLandmarker sur chaque frame → 33 landmarks 3D par frame
  → Filtrage : ne garder que les frames où confidence landmarks > seuil
  → Calcul des angles clés par frame (voir grille de scoring ci-dessous)
  → Agrégation sur la fenêtre de hold (médiane des angles, pas moyenne
    — plus robuste aux frames aberrantes)
  → Comparaison aux seuils cibles → score par critère (0-10)
  → Score global = moyenne pondérée des critères
  → Sélection du critère le plus faible → mapping vers exercice correctif
  → Affichage résultat (overlay squelette sur frame représentative + scores
    + exercice recommandé)
```

## Grille de scoring — DRAFT, confiance modérée

Ces seuils viennent de standards de coaching calisthénie documentés,
pas d'un dataset labellisé. À valider/corriger en Phase 1 (comparaison
avec tes propres holds et ceux de pratiquants confirmés) avant de
considérer les scores comme fiables.

Landmarks MediaPipe utilisés (indices standards du modèle 33 points) :
poignet (15/16), coude (13/14), épaule (11/12), hanche (23/24),
genou (25/26), cheville (27/28).

```json
{
  "figure": "planche",
  "progressions": {
    "tuck_planche": {
      "body_line_angle_from_horizontal": {"target": 25, "tolerance": 10, "unit": "deg"},
      "elbow_angle": {"target": 175, "tolerance": 10, "unit": "deg", "note": "shoulder-elbow-wrist, bras quasi tendus"},
      "hip_angle": {"target": 90, "tolerance": 20, "unit": "deg", "note": "shoulder-hip-knee, genoux ramenés vers poitrine"},
      "shoulder_protraction": {"target": "shoulder_x devant wrist_x d'au moins 5% de la longueur du bras", "note": "à calculer via projection horizontale"}
    },
    "advanced_tuck_planche": {
      "body_line_angle_from_horizontal": {"target": 15, "tolerance": 8, "unit": "deg"},
      "elbow_angle": {"target": 178, "tolerance": 8, "unit": "deg"},
      "hip_angle": {"target": 110, "tolerance": 15, "unit": "deg", "note": "hanches moins fléchies que tuck, genoux plus haut que hanches"}
    },
    "straddle_planche": {
      "body_line_angle_from_horizontal": {"target": 8, "tolerance": 6, "unit": "deg"},
      "elbow_angle": {"target": 180, "tolerance": 6, "unit": "deg"},
      "hip_angle": {"target": 170, "tolerance": 10, "unit": "deg", "note": "hanches quasi étendues, jambes écartées pour réduire le levier"}
    },
    "full_planche": {
      "body_line_angle_from_horizontal": {"target": 0, "tolerance": 5, "unit": "deg", "note": "corps parallèle au sol"},
      "elbow_angle": {"target": 180, "tolerance": 5, "unit": "deg"},
      "hip_angle": {"target": 180, "tolerance": 8, "unit": "deg", "note": "extension complète, pas de pike ni de sag"}
    }
  },
  "criteres_transverses_toutes_progressions": {
    "shoulder_protraction": {"importance": "critique", "erreur_typique": "épaules pas assez avancées devant les poignets = charge insuffisante sur les avant-bras, hold instable"},
    "hip_sag_or_pike": {"importance": "critique", "erreur_typique": "hanches qui tombent (sag) ou qui remontent (pike) au lieu de rester alignées épaule-hanche-cheville"},
    "elbow_bend": {"importance": "haute", "erreur_typique": "coudes fléchis pour compenser le manque de force, invalide la figure à haut niveau"}
  }
}
```

## Mapping erreur → exercice correctif (draft, à enrichir)

```json
{
  "shoulder_protraction_faible": ["Planche lean (lean progressif contre mur ou sol)", "Pseudo planche push-up", "Scapula push-up"],
  "hip_sag": ["Hollow body hold", "Tuck planche isométrique avec cue verbal 'nombril vers colonne'"],
  "hip_pike": ["Straddle planche avec cue 'pousser les talons vers l'arrière'"],
  "elbow_bend": ["Renforcement triceps isolé (push-up diamant, dips)", "Réduire la durée du hold, prioriser la forme sur le temps"]
}
```

## Modèle de données Supabase

```sql
-- profiles : géré par Supabase Auth, extension custom
create table profiles (
  id uuid references auth.users primary key,
  created_at timestamptz default now(),
  is_premium boolean default false
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  video_url text not null,
  progression text not null, -- 'tuck_planche' | 'advanced_tuck_planche' | 'straddle_planche' | 'full_planche'
  status text default 'processing' -- 'processing' | 'done' | 'error'
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) not null,
  critere text not null, -- 'body_line' | 'elbow_angle' | 'hip_angle' | 'shoulder_protraction'
  score numeric not null, -- 0-10
  valeur_mesuree numeric,
  valeur_cible numeric,
  created_at timestamptz default now()
);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) not null,
  exercice text not null,
  raison text not null
);
```

## Ordre de build — jalons, un à la fois

Ne pas passer au jalon suivant tant que le précédent n'est pas
fonctionnel et vérifié.

1. **Squelette du projet** : Next.js + Tailwind + Supabase connecté,
   auth email/password fonctionnelle, page vide post-login.
2. **Preuve de concept MediaPipe** : page qui prend la webcam en live,
   affiche le squelette overlay en temps réel. Objectif : valider que
   MediaPipe tourne correctement dans le navigateur cible avant de
   construire quoi que ce soit dessus.
3. **Upload vidéo** : formulaire d'upload vers Supabase Storage, lien
   vidéo stocké en base, lecture de la vidéo uploadée dans une page.
4. **Extraction pose sur vidéo uploadée** : traiter la vidéo frame par
   frame (pas live), extraire les landmarks, les stocker temporairement
   (pas encore de scoring).
5. **Calcul des angles** : implémenter les fonctions de calcul d'angle
   (3 points → angle) et les appliquer aux landmarks extraits. Afficher
   les angles bruts en debug, sans scoring pour l'instant.
6. **Scoring** : comparer les angles calculés aux seuils de la grille
   JSON ci-dessus, produire un score par critère, stocker en base.
7. **Recommandation** : appliquer le mapping erreur → exercice sur le
   critère le plus faible.
8. **UI résultat** : page qui affiche score global, détail par critère,
   overlay squelette sur une frame représentative, exercice recommandé.
9. **Polish minimal** : gestion des erreurs (vidéo trop courte, pas de
   corps détecté, mauvais angle de caméra), état de chargement pendant
   le traitement.

Définition de "MVP terminé" : je peux uploader une vidéo de ma planche,
recevoir un score par critère et un exercice recommandé, en moins de
30 secondes de traitement.

## Règles de collaboration

- Avant toute décision d'architecture non couverte par ce document,
  demander plutôt que de trancher seul.
- Un jalon = une session de travail testable. Ne pas enchaîner
  plusieurs jalons sans validation intermédiaire.
- Si un choix technique a un impact sur le coût (Supabase, Vercel,
  API tierces), le signaler avant de l'implémenter.
- Code commenté en français dans les parties métier (scoring,
  biomécanique), en anglais pour le reste (convention standard).
