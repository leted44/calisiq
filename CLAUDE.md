# CalisIQ — Spec projet pour Claude Code

> Mise à jour : 2026-09-07. Ce document décrit les **décisions et le
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
| Encodage du fichier exporté | `src/lib/video/writer.ts` |
| Préparation des illustrations de figures | `scripts/import-figure-image.mjs` |
| Préparation du logo et des icônes | `scripts/import-logo.mjs` |

`grid.ts` contient l'historique de calibration de chaque seuil en
commentaires : d'où vient la valeur, sur combien d'échantillons réels, et
ce qui reste à affiner. C'est le fichier à lire avant de toucher au
scoring.

## État des figures

| Figure | Statut | Base des seuils |
|---|---|---|
| Planche (tuck, advanced tuck, straddle, full) | Actif | Hanche recalibrée le 2026-09-01 sur 34 échantillons notés |
| Planche push-up | Actif, calibrée | Ajoutée le 2026-09-08, recalée trois fois sur 5 séries notées. Écart moyen 0,68 puis 0,19, 0,14, 0,08 |
| Straddle planche | Actif, seuils DRAFT | 3 échantillons seulement |
| Handstand | Actif | Hanche/bassin calibrés sur 8 échantillons réels, coude/épaules raisonnés |
| Front Lever (tuck, advanced tuck, straddle, full) | Actif | Recalibré le 2026-09-01 sur 20 échantillons réels |
| Illustrations front lever | Tuck, advanced tuck, single leg et full faites | Il manque la straddle, qui affiche encore une icône |
| Single Leg Front Lever | Actif | Genou de la jambe libre calibré le 2026-09-01 sur 6 échantillons |
| Dragon Flag (tuck, single leg, full) | Actif, full calibrée | 19 échantillons le 2026-09-07 : full confirmée sur 3 exécutions conformes, single leg confrontée à 4, tuck toujours DRAFT avec une seule |
| Drapeau (tuck, single leg, straddle, full) | Actif, full et single leg calibrées | 31 échantillons le 2026-09-07 : full validée sur 4 exécutions conformes, single leg sur 3, tuck et straddle toujours DRAFT |
| Traction, Dips, Pompes, Pistol squat | Actif, seuils DRAFT | Exercices à répétition, aucun échantillon réel |
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

Passe de recalibration du 2026-09-01 sur l’ensemble des 75 échantillons :
seule la hanche de la tuck planche (tolérance 85 vers 30, erreur 1,73 vers
1,20) et celle de l’advanced tuck planche (cible 110 vers 119, tolérance 30
vers 25, erreur 1,69 vers 1,50) ont bougé. Partout ailleurs l’optimiseur ne
réduisait l’erreur qu’en élargissant les tolérances jusqu’à leur plafond, ce
qui revient à cesser de mesurer. **Une recalibration ne doit jamais élargir
une tolérance** : si le seul moyen de coller aux notes est de relâcher un
critère, c’est qu’il manque une mesure, pas qu’un seuil est faux. L’erreur
résiduelle sur la planche et le handstand (1,2 à 1,5) est concentrée sur des
essais que les angles actuels ne distinguent pas : typiquement une figure
d’une autre variation notée sévèrement, ou un dos arrondi que la grille ne
voit pas.

**Les exécutions soumises dans la mauvaise variation sont volontaires.**
Une même vidéo est notée sous plusieurs variations avec une note qui baisse
à mesure qu’on s’éloigne de la figure réellement exécutée (un full front
lever noté 10 en full, 7,5 en straddle, 7 en single leg, 5 en advanced
tuck, 4 en tuck). C’est ce qui apprend à la grille à sanctionner un
utilisateur qui choisit la mauvaise catégorie. Ces échantillons ne sont
donc pas des erreurs à supprimer, et ils tombent d’ailleurs parmi les mieux
ajustés. Ne pas les écarter d’une recalibration.

**Le dragon flag a introduit deux assouplissements du modèle**, tous deux
justifiés par la figure et réutilisables ailleurs. `elbow_angle` est devenu
optionnel : les bras y servent d'ancrage derrière la tête et leur angle ne dit
rien de la qualité du mouvement, l'inclure aurait ajouté une note qui ne mesure
rien et gonfle le score global. Et les critères d'inclinaison
(`body_line_angle_from_horizontal`, `torso_angle`) acceptent désormais un mode
`maximum` : sur un front lever la cible est l'horizontale et s'en écarter des
deux côtés est une faute, mais sur un dragon flag descendre plus bas n'est
jamais une faute, c'est toute la difficulté.

**Critères à seuil plutôt qu’à bande.** Le genou de la jambe libre du
single leg front lever a d’abord été noté comme une bande (80° ± 40) : la
grille attendait un angle précis alors que la figure demande seulement que
cette jambe reste repliée. Une jambe très repliée était donc pénalisée
autant qu’une jambe tendue. Il est passé en mode `maximum` (10 sous 100°,
décroissance jusqu’à 0 vers 160°), miroir du mode `minimum` déjà utilisé
pour la protraction : erreur 0,89 → 0,63, et le même résultat pour tout
seuil entre 90 et 120°, ce qui indique que c’était bien la forme du critère
qui était fausse et pas sa valeur. Avant de retoucher un seuil, vérifier
d’abord que le critère a la bonne forme.

Vision plus long terme, hors scope : tractions, muscle-up. Ne pas
commencer une nouvelle figure sans validation explicite.

Passe de calibration du 2026-09-07 sur les trois variantes du Dragon Flag,
19 échantillons. **Aucun seuil n'a bougé.** La full est confirmée sur ses
trois exécutions conformes, à 0,0, 0,0 et 0,2 de la note humaine, et le
balayage place hanche 9 et genou 8 pile à l'optimum. La single leg tient à
0,94 sur quatre exécutions conformes. La tuck reste en brouillon : sur cinq
échantillons, un seul est une vraie tuck.

Le résultat marquant n'est pas dans les seuils. Douze des dix-neuf
échantillons sont la même vidéo soumise dans la mauvaise variante, et c'est
là que la grille dérape, d'environ 1,5 point de trop. La cause est la
moyenne, pas un seuil : sur un full dragon flag exécuté à une jambe,
l'inclinaison et le bassin restent parfaits, donc deux critères sur quatre
valent 10 et la note ne peut pas descendre sous 5. Le plafonnement sur faute
majeure, déjà en place sur les exercices à répétition, ramènerait l'écart de
1,48 à 0,61 sur la tuck et de 0,94 à 0,68 sur les exécutions conformes de la
single leg. Il n'a pas été activé : c'est une décision d'agrégation qui
vaudrait pour toutes les figures de hold, à prendre pour elles toutes ou pour
aucune.

## Ce qui existe aujourd'hui

**Analyse** : import de vidéo ou enregistrement caméra, découpe du segment
à analyser, détection de la fenêtre de hold, score par critère,
recommandation ciblée sur le point faible, ré-analyse depuis l'historique.

**Export vidéo** (levier de croissance, voir plus bas) : squelette
superposé, scores qui évoluent en direct, chrono du hold, ralenti sur la
position la mieux tenue avec le point faible entouré et le fantôme de la
position idéale, écran de score final. Filigrane CalisIQ sur chaque image.

**Compte** : installation de l'app sur l'écran d'accueil et suppression
définitive du compte, toutes deux depuis le profil.

L'invite d'installation est **capturée par un script du layout racine**, pas
par le composant qui l'utilise. Chrome n'émet `beforeinstallprompt` qu'une
fois, au chargement initial, et ne la rejoue jamais : un écouteur monté avec la
page Profil, où l'utilisateur arrive plusieurs secondes plus tard, la manque
systématiquement. Le script la retient dans le HTML initial, le bouton vient la
chercher au clic. Celui-ci reste visible en toute circonstance, et adapte
sa forme au navigateur.

**Sur iPhone, l'installation en un clic est impossible**, et aucun code n'y
changera rien : Apple n'implémente pas `beforeinstallprompt` et réserve le
geste à la feuille de partage de Safari. Le composant affiche donc directement
les deux étapes, avec les pictogrammes réels d'iOS plutôt que leur
description — l'utilisateur doit reconnaître le bouton Partager dans sa barre,
pas le déduire d'une phrase. Hors Safari sur iOS (Chrome, ou les navigateurs
intégrés à Instagram et TikTok, par lesquels arriveront la plupart des
visiteurs) l'installation n'est même pas possible : le seul geste utile est de
copier l'adresse pour l'ouvrir dans Safari, et c'est ce que propose la carte.

La suppression passe par `delete_own_account`, qui remonte la chaîne des
tables à la main — aucune clé étrangère du schéma n'est en `on delete cascade`
— puis efface la ligne `auth.users`. Les fichiers du stockage, eux, sont
supprimés côté client juste avant l'appel : **Supabase refuse le `delete`
direct sur `storage.objects`**, y compris à une fonction `security definer`,
avec le message « Direct deletion from storage tables is not allowed ». Seule
l'API de stockage y a droit, et elle exige une session encore valide, donc
avant. Confirmation par recopie d'un mot, parce qu'un « es-tu sûr ? » se clique
par réflexe et que rien n'est restaurable ensuite.

**Suivi** : historique, courbes de progression par figure, comparatif
avant/après entre la vidéo de référence et la dernière analyse.

**Administration** (réservé au compte `is_admin`) : page Statistiques et
page Calibration (mesurer et noter des figures pour affiner les seuils).

Les statistiques sont alimentées automatiquement : un trigger sur
`auth.users` crée le profil à l'inscription, la page compte ces lignes. Elle
montre les inscrits, ceux qui ont réellement analysé, la rétention, et le
détail jour par jour des inscriptions sur 30 jours avec la liste des dates
concernées, pour pouvoir relier un pic à une publication Instagram ou TikTok.
Les séries quotidiennes sont complétées côté SQL pour inclure les jours à
zéro : sans eux la courbe collait les jours actifs les uns aux autres et
mentait sur le rythme.

## Décisions structurantes prises en cours de route

**La carte de résultat est hiérarchisée, pas égalitaire.** Elle affichait le
score global dans la même taille que le reste du texte et tous les critères
dans des anneaux identiques. À cinq critères, cinq cercles de même taille ne
hiérarchisent rien : l'œil n'a pas de point d'entrée et le critère à corriger
se noie au milieu des autres.

Trois niveaux désormais. Le **score global** en bandeau plein cadre sur l'image
de la figure, avec un halo teinté par le niveau : c'est le chiffre qu'on
retient et qu'on capture. Le **point faible nommé** juste en dessous, avec son
score et sa description — c'est la valeur réelle de l'app, pas « 7,4 sur 10 »
mais « ce sont tes hanches qui coûtent des points ». Puis **tous les critères
en barres, classés du plus faible au plus fort**.

Des barres et non des anneaux, pour deux raisons. On compare des longueurs d'un
seul regard là où cinq cercles obligent à lire cinq chiffres. Et c'est la forme
qu'utilise déjà le HUD de la vidéo exportée : l'app et ce qu'on partage
racontent enfin la même chose.

Le composant `ScoreRing` a été supprimé, il n'avait plus d'usage.



**La racine est une page publique, l'app vit sur `/analyser`.** Jusque-là
toutes les routes étaient derrière l'authentification et `/` renvoyait sur
l'écran de connexion : un visiteur venu d'Instagram tombait sur un formulaire,
sans une image ni une phrase expliquant ce que fait l'app. C'était le principal
trou d'acquisition, bien avant l'absence de toute autre fonctionnalité.

`src/app/page.tsx` présente donc le produit aux visiteurs et redirige les
utilisateurs connectés vers `/analyser`. Une seule adresse à communiquer, qui
s'adapte à qui l'ouvre. Le `start_url` du manifest reste `/` et traverse
cette redirection sans encombre.

La page ne promet que ce que le scoring tient : trois figures, dix variations,
et le fait que l'analyse tourne dans le navigateur. Ne pas y annoncer de
figures non calibrées.



**L'indicateur d'activité de l'accueil est en partie simulé.** Le « N ont
analysé aujourd'hui » additionne le total réel du jour (fonction
`analyses_today`, la RLS empêchant de le calculer côté client) et une valeur
simulée destinée à meubler l'écran tant que l'audience se construit. C'est un
choix produit assumé, demandé explicitement, et la constante
`SIMULATION_ACTIVE` de `TodayActivity.tsx` suffit à le rendre entièrement
honnête le jour où le trafic réel se suffit à lui-même.

Deux propriétés à préserver si la simulation évolue. Elle est **déterministe** :
deux personnes qui ouvrent l'app à la même seconde voient le même nombre, sans
quoi une capture d'écran partagée trahirait le procédé. Et elle est
**strictement croissante** sur la journée : un compteur qui recule sous les yeux
de l'utilisateur se remarque immédiatement. La fourchette est volontairement
modeste, un chiffre invraisemblable pour une application qui démarre
décrédibilise davantage qu'il ne rassure.



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

**Tout ce qui est dessiné sur la vidéo exportée doit être proportionnel à la
largeur de l'image.** Le squelette était tracé en pixels absolus, 3 px de trait
et 4 px de point. Tant que l'export était plafonné à 1080 le rendu était juste,
mais depuis qu'il sort en résolution native le même trait sur une image 4K
devient deux fois plus fin à l'écran, et le squelette cesse d'être lisible une
fois republié sur les réseaux — ce qui est précisément la raison d'être de la
vidéo annotée. Les valeurs sont désormais multipliées par `canvas.width / 1080`,
calibrées sur ce qui était rendu avant. Le HUD, lui, utilisait déjà un facteur
d'échelle : c'est le squelette qui y avait échappé.

**L'export sort en résolution native, le stockage reste en 1080p.** Ce sont
deux chemins distincts qu'il ne faut pas confondre. Le fichier téléchargé
avec le squelette suit désormais la résolution de la vidéo source, plafonnée
à l'UHD : une vidéo filmée en 4K se télécharge en 4K. Le fichier téléversé
sur Supabase, lui, reste ré-encodé à 1080p, parce que la limite de 50 Mo par
fichier et le quota de 1 Go du plan gratuit sont des contraintes dures.
Conséquence à connaître et à ne pas traiter comme un bug : un export lancé
juste après l'analyse part du fichier d'origine et sort en 4K, un export
relancé depuis l'historique part du fichier stocké et sort en 1080p. Monter
la résolution supposait aussi de suivre le niveau H.264 (4.2 s'arrête vers
le 1080p, la 4K demande 5.1 ou 5.2) et de relever le plafond de débit, sans
quoi la 4K sortait plus compressée que la 1080p.

**Deux marques d'état, à ne pas confondre.** Le sélecteur signale deux choses
différentes avec deux pictogrammes distincts, et les fondre en un seul
tromperait l'utilisateur dans un sens ou dans l'autre.

Le **cadenas gris** dit que l'app ne sait pas analyser la figure du tout. Il ne
concerne que les variations `available: false`. Le **signe « environ » ambre**
dit qu'elle s'analyse, mais que ses seuils n'ont jamais été validés sur des
figures réelles : la note existe et est utilisable, elle est seulement
approximative. Le test est `isCalibrated()`, qui lit `CALIBRATED_CRITERIA` :
une progression dont la liste est vide porte la marque. Elle disparaît d'elle
même dès qu'une recalibration y inscrit un critère, sans intervention.

Une tuile de figure porte la marque ambre quand **aucune** de ses variations
n'est calibrée. Dès qu'une seule l'est, la famille a une base fiable et la
marque tombe. Les badges des variations sont ancrés à la pastille numérotée et
non au coin du bouton : la largeur d'un nœud varie de deux à six colonnes selon
la figure, et au coin le badge finissait par sembler appartenir au nœud voisin.

**Le choix de la variation ne repose pas sur l'illustration.** Les figures et
les variations avaient le même traitement visuel, si bien qu'une carte
« Planche » et une carte « Full » se lisaient comme deux choix de même
niveau. Pire, à la taille d'une vignette et vues de profil, une straddle et
une full planche sont deux silhouettes presque identiques : aucune
illustration ne permettait de les départager, quelle que soit sa qualité.

Les deux niveaux sont donc traités différemment. Les figures sont des cartes
larges portant le nom et la nature du geste, avec un halo qui matérialise la
sélection. Les variations forment un rail de progression numéroté : elles
constituent une suite ordonnée de la plus accessible à la plus dure, et c'est
cette information, pas le dessin, qui les distingue. Un panneau sous le rail
donne la jauge de difficulté et surtout la **ligne de texte qui définit la
position** (« jambes tendues et écartées », « corps entièrement tendu »).
C'est ce texte qui tranche là où l'image ne peut pas : le champ `cue` de
chaque variation n'est pas décoratif, ne pas le retirer.

**Le logo ne se détoure pas, il se compose en `screen`.** C'est la décision
la plus importante du sujet, et elle a coûté deux essais ratés qu'il ne faut
pas refaire. Le visuel de marque est une illustration lumineuse sur fond noir.
Un seuil de luminance rend transparents les noirs qui appartiennent au sujet —
cheveux, short, parallettes — et le fond de la page les traverse : les cheveux
sont ressortis à 3 d'opacité sur 255, avec un voile de fumée sur tout le logo.
Un remplissage depuis les bords échoue autrement : les noirs du corps
communiquent avec le fond là où le liseré lumineux s'interrompt, et la
transparence fuit jusque dans le torse.

Les fichiers produits sont donc **opaques et strictement identiques à
l'original**, à la mise à l'échelle près, et c'est l'affichage qui fait le
travail : `mix-blend-screen` sur les `<img>`. Le noir pur n'ajoute rien et
s'efface exactement, les lumières s'additionnent au fond. Deux conséquences à
respecter en touchant à ces écrans : le fond derrière le logo doit rester
sombre et uni — les halos cyan décoratifs qui s'y trouvaient ont été retirés,
ils transparaissaient dans les noirs — et pas de `drop-shadow`, le visuel
porte son propre éclairage.

`scripts/import-logo.mjs` découpe le visuel en `logo-full.webp` (le verrou
complet, connexion et accueil), `logo-emblem.webp` (l'athlète et son anneau,
sans le mot-logo, pour l'onboarding) et `logo-mark.webp` (le glyphe « IQ »).
Sortie en WebP : l'image est opaque et photoréaliste, 912 Ko en PNG contre 90
en WebP pour un rendu indiscernable. La qualité est tenue haut exprès, parce
que la composition en `screen` exige des noirs à zéro — le moindre bruit
s'ajouterait au fond et se verrait comme un voile.

Les icônes sont faites à partir du **glyphe**, pas de l'emblème : vérifié en
maquette, l'athlète devient illisible dès 32 px alors que deux lettres pleines
et une loupe restent nettes. Elles sont posées sur le fond de marque, également
en `screen`, et la version `maskable` garde 24 % de marge parce qu'Android
recadre ces icônes en cercle ou en goutte.

**Les illustrations de figures passent par un script, pas par un glisser
déposer.** Les visuels arrivent sur fond noir alors que l'application les
affiche en `object-contain` sur une carte ardoise avec un halo cyan quand la
figure est sélectionnée : un fond opaque produirait un rectangle noir et un
halo carré. `scripts/import-figure-image.mjs` détoure, cadre et doit être
utilisé pour toute nouvelle illustration plutôt qu'une copie à la main.

Deux partis pris s'y trouvent, tous deux demandés explicitement. Le reflet au
sol est **conservé**, il fait partie du style. Mais il n'est pas traité comme
le corps : un halo est une lumière, il doit éclaircir le fond, et opacifié
comme le reste il devenait une tache bleu nuit plus sombre que la carte
qu'il était censé illuminer. Son opacité est donc proportionnelle à son
intensité, seule approximation d'un rendu additif possible dans un PNG. Le
corps, lui, reste franchement opaque, sinon ses zones d'ombre laisseraient
passer le fond.

Ce rendu en semi-transparent a révélé un second élément de décor, invisible
tant que le fond était noir : une brume diffuse autour du sujet, qui devenait
un nuage laiteux une fois posée sur la carte ardoise. Elle est écartée par un
plancher d'intensité, la brume vivant entre 30 et 120 quand le reflet monte
de 150 à 250. Ne pas confondre les deux en retouchant le script : couper la
brume au niveau du reflet effacerait aussi ce dernier.

Toutes les illustrations sortent au **même format**, 960x640, et le corps y
est mis à l'échelle sur son **aire**. Les deux vont ensemble et aucun des
deux ne suffit seul.

Le format d'abord : la vignette affiche l'image en `object-contain`, donc
c'est le cadre et non le corps qui décide de la taille à l'écran. Deux cadres
de proportions différentes se réajustent chacun à la tuile, et toute
normalisation du corps est perdue en route. Un cadre commun est la condition
pour que les tailles soient comparables ; il reprend la proportion des tuiles,
trois pour deux.

L'échelle ensuite : ni la hauteur ni la longueur du corps ne conviennent.
Mises à l'échelle sur leur plus grande dimension, la tuck planche, ramassée,
remplissait le cadre pendant que la full, étirée, n'en occupait qu'une bande
et paraissait deux fois plus petite. C'est pourtant le même corps, et de fait
son aire projetée est identique à 5 % près sur les trois variations de
planche. C'est donc l'aire qui est normalisée : une figure repliée occupe
naturellement moins de longueur sans paraître plus petite. L'échelle est
ensuite bridée pour que le corps tienne dans le cadre, ce qui joue sur les
silhouettes très étirées comme la full planche : elles finissent un peu sous
l'aire visée, prix à payer pour ne pas les rogner.

Un plafond de hauteur complète l'aire, et c'est un jugement visuel assumé,
pas un calcul. L'aire seule n'harmonise pas une figure verticale avec des
figures horizontales : le handstand a la plus petite aire et la plus courte
étendue de toutes, et paraissait pourtant le plus imposant, parce que dans
une tuile plus large que haute c'est la hauteur occupée que l'œil compare et
que lui seul touchait le haut et le bas du cadre. La valeur s'arbitre en comparant plusieurs hauteurs côte
à côte sur la grille réelle, et **elle dépend de la mise en page** : basse
quand les vignettes sont petites et serrées, où une figure verticale écrase
la ligne ; haute avec les cartes larges du sélecteur, où l'équilibre
s'inverse et où la même figure flotte au milieu d'un vide horizontal pendant
que la planche remplit toute la largeur. La revoir si le sélecteur change de
forme. Seules les figures verticales sont concernées, toutes les autres
passent dessous sans être touchées.

Le décor suit le cadre. Un élément détaché qui n'y tient pas entièrement est
retiré, pas rogné : un reflet coupé net par le bord se lit comme un défaut de
découpe alors que son absence passe inaperçue. Le retrait va jusqu'au bord de
l'image et pas seulement jusqu'à la bande détectée, parce qu'un reflet
s'accompagne d'une frange trop diffuse pour former une bande et qu'elle
laisserait un trait pâle en travers du cadre.

La séparation corps / décor repose sur le canal rouge, nul dans le décor et
supérieur à 120 sur le corps. Deux exceptions à connaître avant d'y toucher :
les points d'articulation sont eux aussi d'un cyan sans rouge et se
creusaient en trous noirs, ils sont rattrapés par leur intensité ; et le
cœur d'un reflet est assez lumineux pour passer pour du corps, ce qui
interdit d'utiliser ce rattrapage dans le calcul du cadrage.

**Rôle admin en base, pas en dur.** Le drapeau `is_admin` vit sur
`profiles`, ce qui évite de coder une adresse e-mail dans le dépôt et
permet de donner ou retirer le rôle sans redéploiement.

**Le drapeau réutilise la famille du dragon flag** pour ses descriptions et
ses conseils : mêmes critères, et surtout même faute dominante, celle de
casser à la hanche pour raccourcir le levier. Une différence à ne pas confondre
en touchant aux seuils : son inclinaison est une vraie **bande** centrée sur
l'horizontale, là où celle du dragon flag est un seuil maximum. Sur un drapeau,
un corps qui pointe vers le haut s'éloigne de la figure autant qu'un corps qui
pique vers le bas ; sur un dragon flag, descendre plus bas est toujours mieux.

**L'immobilité se mesure sur la silhouette, pas sur l'image.** La fenêtre de
hold était trouvée en suivant le centre du corps dans l'image. Ça supposait une
caméra fixe : dès que quelqu'un filmait à main levée, le corps traversait
l'image sans que la personne bouge, chaque image dépassait le seuil de
mouvement, aucun segment stable n'était trouvé et le chrono restait vide alors
que la figure était tenue. Le handstand en souffrait le plus, parce qu'on s'y
fait presque toujours filmer par quelqu'un d'autre.

`detectHoldWindow` ramène désormais chaque pose dans son propre repère avant de
comparer : recentrée sur son barycentre, divisée par son étalement. Un
panoramique et un zoom disparaissent de la mesure, il ne reste que la
déformation de la silhouette, seul mouvement qui appartienne à la personne
filmée. La division par l'étalement corrige au passage un biais plus discret :
à oscillation égale, un corps filmé de près bougeait beaucoup de pixels et un
corps filmé de loin presque aucun, donc deux vidéos de la même tenue n'étaient
pas jugées avec la même exigence.

Le mouvement est en plus rapporté au temps écoulé entre deux images, et non
plus compté par image. Les images d'analyse ne sont pas capturées à intervalle
régulier — le décodage suit ce que le téléphone fournit — et sans cette
division un simple ralenti du décodage suffisait à couper un hold tenu.

Conséquence à connaître : le seuil de mouvement a changé d'unité et a donc été
repris à zéro. Sa valeur et le raisonnement qui la fixe vivent dans
`angles.ts`, et restent à revalider sur des vidéos réelles.

**Le drapeau a désormais sa Single Leg.** Il manquait l'étape la plus utilisée
de la progression réelle : une jambe se tend le long du mât, la seconde reste
repliée. C'est le premier moment où le levier s'allonge vraiment, sans encore
demander l'ouverture de hanche de la straddle, et l'écart de difficulté entre
la tuck et la straddle était trop grand pour n'avoir aucun palier au milieu.

Elle reprend les trois critères de jambe de la Single Leg Front Lever,
calibrés eux sur 6 échantillons, et l'inclinaison en bande de la famille
drapeau. Ses seuils d'inclinaison et de coude sont interpolés entre la tuck et
la straddle : entièrement raisonnés, donc DRAFT, et la marque « environ »
s'affiche tant qu'un échantillon réel n'aura pas été enregistré.

Le trou de recommandations qu'elle a mis en lumière est comblé dans la
foulée. `straightest_knee_angle`, `straightest_leg_hip_angle` et
`bent_knee_angle` n'ouvraient sur aucun exercice correctif, pas plus que le
coude de la famille drapeau : un point faible désigné sur la jambe tendue
était nommé sans que rien ne soit proposé pour le corriger. Les quatre sont
écrits, dans les deux langues, et le dictionnaire de traduction est à jour.

Vérifié par balayage : chaque critère noté par `SCORING_GRID` ouvre
désormais sur des exercices, pour les seize progressions tenues comme pour
les neuf exercices à répétition.

Passe de calibration du 2026-09-07 sur les quatre variantes du Drapeau,
31 échantillons. **Aucun seuil n'a bougé**, et une seule variante en sort
validée : la full, sur 4 exécutions conformes, écart absolu moyen 0,29, avec
ses quatre critères réellement mis à l'épreuve. Le balayage place chaque
valeur actuelle à son optimum.

**Un contrôle méthodologique est né de cette passe.** Douze des trente et un
échantillons portent une note humaine identique au centième à celle que la
grille calcule. Deux lectures possibles : soit le score affiché a été
ressaisi comme note de référence, et l'accord ne prouve alors rien puisqu'on
confronte la grille à sa propre sortie, soit le jugement est réellement tombé
sur la même valeur. **La question se tranche en demandant, pas en supposant.**
Le même signal touche 4 des 19 échantillons du dragon flag ; il est à lever à
chaque passe.

Pour la Single Leg Drapeau, la vérification a été faite : ses notes sont
indépendantes. Elle est donc validée sur ses trois exécutions conformes, avec
deux critères confirmés — la jambe repliée, qui sépare les vraies exécutions
des corps tendus de 10 à 0 pendant que les notes humaines suivent, et
l'inclinaison du tronc. Le coude et les deux critères de jambe tendue restent
au-dessus de 6,5 sur tout le lot : rien ne les a mis en défaut, ils ne
comptent pas comme calibrés.

La Straddle Drapeau, elle, bute sur autre chose qu'un manque d'échantillons :
**rien ne mesure l'écartement des jambes**. Une straddle et une full
présentent les mêmes angles de hanche et de genou, seule leur ouverture
latérale les sépare. Tant que ce critère n'existe pas, une full soumise en
straddle obtient une excellente note, et aucun réglage de seuil n'y changera
quoi que ce soit. C'est un critère qui manque, pas un seuil mal réglé.
## Exercices à répétition

Deuxième modèle de notation, à côté de celui des holds, et volontairement
séparé de bout en bout. Un hold se note sur des angles tenus, repérés par
`detectHoldWindow` qui cherche le segment le plus immobile de la vidéo. Un
mouvement dynamique n'a pas de segment immobile : sa qualité est dans la
trajectoire.

`repAnalysis.ts` découpe la série en répétitions par hystérésis sur un angle
pilote (le coude pour les tractions et pompes, le genou pour les squats), avec
une bande morte de 40 % qui empêche un signal tremblant de produire de fausses
répétitions. `REP_SCORING_GRID` porte les seuils, séparée de `SCORING_GRID`
parce que les deux n'ont pas les mêmes champs.

**Cinq critères communs à tous les mouvements**, seuls les seuils changent :
extension atteinte en position tendue (seuil minimum), amplitude atteinte en
position fléchie (seuil maximum), oscillation de hanche qui mesure l'élan
(seuil maximum), tenue du corps (bande), et régularité du tempo (seuil
minimum). Les modes sont structurels et non configurables : on ne peut pas
dépasser l'extension complète, descendre plus bas que demandé n'est jamais une
faute.

**Contrôle et forme ne mesurent pas la même chose, et une seule ne suffit
pas.** Le contrôle est l'écart type de l'angle de hanche, la forme en est la
moyenne. Quelqu'un qui reste cassé à la hanche du début à la fin d'une série a
une oscillation faible, donc un excellent score de contrôle, alors que sa
position est mauvaise sur toutes les répétitions. Le contrôle voit l'élan, la
forme voit la posture. C'est ce critère qui manquait au handstand push-up, où
casser à la hanche pour raccourcir la course est la triche classique.

L'oscillation de hanche est **absente des mouvements de jambes** : dans un
squat la hanche se ferme et s'ouvre par construction, son écart type mesurerait
alors le mouvement lui-même et non la triche.

Deux points d'articulation avec l'existant. La sortie est un
`CriterionScore[]`, exactement le type produit par le scoring des holds :
l'affichage, les recommandations et l'export fonctionnent donc sans
modification. Et `repCount` est l'exact pendant de `holdDurationSeconds` —
les deux ne sont jamais renseignés ensemble, ce qui permet à l'historique
d'afficher la bonne mesure sans connaître le type d'exercice. L'export vidéo
remplace le chrono par un compteur qui s'incrémente au fil de la lecture.

**Leur calibration passe par des colonnes dédiées.** Les colonnes d'angles de
`calibration_samples` stockent la médiane sur la fenêtre de hold : sur une
série, le coude fait des allers-retours entre 45 et 175 degrés et cette médiane
ne décrit aucune position réelle. Cinq colonnes ont donc été ajoutées
(`rep_lockout`, `rep_peak`, `rep_hip_swing`, `rep_tempo`, `rep_count`), qui
portent exactement ce que note `REP_SCORING_GRID`. La page de calibration
affiche ces mesures dans un bloc distinct et signale que les angles médians
sont sans objet, plutôt que de laisser croire à une lecture aberrante.

Le rescoring depuis les valeurs stockées ne fonctionne pas sur ces exercices :
le contrôle est un écart type sur toute la série, le tempo un pourcentage,
aucun des deux n'est un angle isolé. Les recalibrer demandera de réanalyser la
vidéo.

**La planche push-up, et le critère qui la rend possible.** Ajoutée le
2026-09-08 comme exercice à répétitions de la famille planche. Le modèle à
répétitions notait quatre choses : extension, amplitude, oscillation de
hanche, tempo. Une pompe au sol bien exécutée les satisfait toutes, et une
planche push-up aussi — rien n'y regardait où sont les épaules par rapport aux
poignets, qui est pourtant la seule différence entre les deux mouvements. La
variation aurait été décorative.

D'où `rep_protraction`, cinquième critère du modèle, optionnel et réservé
aux mouvements de planche : avancée moyenne des épaules devant les poignets
sur la série, notée en seuil minimum comme sur les holds.

**Ses seuils sont transférés, pas devinés.** Le haut d'une répétition est une
full planche : sur les 6 full planches notées 8 ou plus, le coude mesure 165
à 176 degrés, moyenne 169,4, d'où un verrouillage visé à 170 plutôt qu'aux
180 théoriques que personne n'atteint sous ce levier. La tenue du corps est
la valeur la mieux soutenue de la grille : la hanche moyenne de ces mêmes 6
planches vaut 169,9, et le handstand push-up a été recalé indépendamment à
exactement 170. L'avancée d'épaules reprend le 0,7 calibré de la full
planche, dont les bonnes exécutions mesurent 0,79. Restent l'amplitude et
l'oscillation, raisonnées sans données.

La variation porte donc la marque « environ » : aucun échantillon ne la
concerne elle. La migration `20260908120000` ajoute la colonne
`rep_protraction` aux échantillons, sans quoi la page de calibration
rejouerait la note sans ce critère et s'écarterait de celle affichée.
**Le palier est gravé dans la vidéo exportée.** L'écran de fin n'affichait
que le score sur 10, or ce chiffre ne situe rien tout seul : 9 sur 10 en tuck
planche et 9 sur 10 en full planche racontent deux histoires différentes, et
c'est le palier qui fait la différence. C'est aussi le mot qu'on retient et
qu'on répète, bien avant la décimale — « je suis passé Élite » se dit, « j'ai
eu 9,0 » beaucoup moins.

Une pastille apparaît donc sous le score, avec le palier et ses points, aux
couleurs de `TIER_CANVAS_COLORS`. Cette table double `TIER_STYLES`, qui ne
contient que des classes Tailwind illisibles pour un canvas ; les deux vivent
côte à côte dans `level.ts` pour qu'un palier recoloré le soit des deux
côtés.

Elle arrive en fondu une fois le compteur posé, pas pendant qu'il monte :
annoncer « Élite » alors que le chiffre défile encore vend la mèche et vide
la montée de son intérêt.
Recalibration de la planche push-up le 2026-09-08, 3 séries notées, quelques
heures après sa création. Écart absolu moyen 0,68 puis **0,19**, et les
erreurs cessent d'être toutes du même côté.

**Ce que le transfert avait manqué est instructif pour les prochains.** Les
trois seuils repris de figures *tenues* étaient tous trop sévères, et
toujours dans le même sens. La raison est mécanique : un hold mesure une
position immobile, une répétition moyenne un corps en mouvement qui passe
par la position idéale sans y rester. Une valeur moyennée sur une série est
donc structurellement plus basse que celle d'une tenue. Verrouillage 170 vers
165, amplitude 100 vers 110, protraction 0,7 vers 0,6.

À retenir pour tout futur transfert entre un hold et sa version dynamique :
**décaler les seuils repris vers le bas, ou s'attendre à un biais dans ce
sens.**

Chaque valeur retenue est la plus exigeante que les données admettent, et les
dents ont été vérifiées sur des contre-exemples construits : la grille note
2,0 une pompe au sol impeccable, 4,5 la même avec les épaules déjà avancées,
5,5 une série cassée à la hanche. C'est le plafond sur faute majeure qui fait
ce travail — la protraction tombe à 0 et écrase la moyenne au lieu d'y être
diluée, exactement ce qui manque aux figures tenues.

Réserve : les trois séries sont notées 9,5 et plus. La calibration prouve que
la grille n'était pas trop sévère, pas encore qu'elle est assez exigeante. Il
y faudrait une série volontairement ratée, comme celle qui a servi au
handstand push-up.
**Sur une série, les barres se construisent au lieu d'attendre.** Le HUD
recalcule le score image par image sur un hold, mais une série se note sur
l'ensemble de ses répétitions : les barres restaient donc figées du début à
la fin, à afficher un verdict avant même la première répétition.

`runAnalysis` renvoie désormais `repProgressScores`, la même notation rejouée
sur les k premières répétitions pour chaque k. Le HUD affiche l'instantané
correspondant au nombre de répétitions achevées à cet instant. **Rien n'est
simulé** : chaque valeur est la vraie note de ce qui a été exécuté jusque-là,
et la dernière est exactement la note finale. Tant qu'aucune répétition n'est
terminée, les barres sont vides, ce qui est exact et non décoratif.

La liste des critères reste celle du résultat final, y compris le tempo qui
n'existe pas sous trois répétitions : il garde sa ligne à zéro plutôt que
d'apparaître en cours de route et de faire grandir la carte au milieu de la
vidéo.

Au passage, l'export lancé depuis l'historique ne transmettait ni les
instants de répétition ni ces instantanés : son compteur de répétitions
affichait le total dès la première image, alors que celui de l'écran
d'analyse s'incrémentait correctement. Les deux chemins passent maintenant
les mêmes données.
Seconde passe sur la planche push-up le 2026-09-09, une quatrième série.
Écart moyen 0,24 puis **0,14**. Un seul seuil bouge, la tenue du corps, de
170 à 166 : c'est le même décalage hold vers série que la veille, et il se
lit directement, la hanche moyenne des quatre séries valant 166,0 quand la
même mesure sur des full planches tenues donne 169,9. Le critère est une
bande, le recentrer ne l'émousse donc pas.

**Un gain refusé, et c'est le plus instructif.** Déplacer l'amplitude de 110
à 118 aurait ramené l'écart à 0,15 — deux des quatre séries ne descendent
qu'à 118 degrés et sont notées 9,7 et 10. Mais rejouée sur un contre-exemple,
cette valeur note **9,3 une planche à peine fléchie à 135 degrés**, contre 5,8
aujourd'hui. Le critère perdrait exactement ce qu'il sert à mesurer.

Règle qui se dégage de ces deux passes : **avec des échantillons tous notés
au-dessus de 9,5, minimiser l'écart revient à tout faire tendre vers 10.**
Chaque seuil candidat doit donc être rejoué sur un contre-exemple construit
avant d'être retenu, et celui qui perd ses dents est refusé même s'il gagne
sur l'écart moyen.
Troisième passe le 2026-09-09, cinquième série. Écart moyen 0,18 puis
**0,08**. L'amplitude passe de 110 à 118 degrés, et sa rampe de 40 à 25.

**Ce refus de la veille était à moitié juste, et c'est la leçon.** La passe
précédente avait écarté le déplacement de la cible parce qu'à rampe
inchangée, viser 118 notait 9,3 une planche à peine fléchie à 135 degrés. Le
raisonnement était bon, la conclusion trop courte : **la cible et la rampe
répondent à deux questions différentes.** La cible dit à partir de quelle
profondeur une répétition est pleine, la rampe dit à quelle vitesse une
répétition trop courte perd ses points. Corriger la première sans resserrer
la seconde étale la pénalité sur 40 degrés et vide le critère.

Les deux ensemble tiennent : trois des cinq séries descendent à 118 degrés et
sont notées 9,7, 10 et 10, donc 118 est bien la profondeur d'une bonne
exécution ; et avec une rampe de 25, une flexion à 135 degrés retombe à 3,2,
sous le seuil de faute majeure, ce qui plafonne la série à 5,2, exactement la
sévérité d'avant.

Réserve sur ce lot : les séries 4 et 5 sont à quelques dixièmes l'une de
l'autre sur les six mesures, ce sont probablement deux prises de la même
exécution. Cinq échantillons pour quatre exécutions distinctes. Et les cinq
restent notées 9,5 et plus : toujours aucune série ratée pour vérifier que la
grille est assez exigeante.
**L'espagnol, et la fin des ternaires de langue.** Ajouté le 2026-09-11,
troisième langue complète : interface, textes de rapport, noms de figures et
les 292 libellés d'exercices correctifs.

Le type fait le travail sur les dictionnaires d'interface : `Dictionary` est
dérivé de `fr.ts`, donc `es.ts` ne compile que s'il porte exactement les
mêmes 413 clés. C'est ailleurs que le risque se cachait. Une dizaine
d'endroits choisissaient la langue avec un ternaire `lang === "en" ? en :
fr` : le rapport, les recommandations, l'export vidéo, les avertissements
d'analyse, l'encodeur. **Aucun n'aurait échoué à la compilation** avec une
troisième langue, tous seraient simplement retombés en français, en silence.

Ils passent tous par des tables indexées par `Lang` — `DICTIONARIES` pour
l'interface, `TEXTES` dans `report.ts`, `TABLES` dans `recommendations.ts`.
La prochaine langue ajoutée signalera donc elle-même tout ce qui lui manque,
au lieu de se taire. C'était la vraie demande derrière « qu'on ne puisse pas
revenir dessus à chaque fois ».

Deux effets de bord utiles : `server.ts` et `client.tsx` tenaient chacun leur
copie de la table des dictionnaires, elles n'en font plus qu'une ; et les
deux textes du ralenti de l'export, jusque-là écrits en dur dans
`exportVideo.ts`, vivent maintenant dans les dictionnaires comme le reste.

La traduction des recommandations n'a pas été recopiée à la main : un script
a réécrit le fichier anglais en remplaçant chaque libellé par sa traduction,
et **échoue si une seule chaîne manque**. La structure des deux tables est
donc identique par construction, pas par relecture.
**La langue se devine à la première visite.** Tout le monde arrivait en
français et devait trouver le sélecteur pour en changer, ce que personne ne
fait sur une page qu'il ne comprend pas. Le proxy lit désormais
`Accept-Language` quand le cookie est absent, et le fige pour un an.

**La langue du navigateur, pas le pays.** Le pays se devine aussi, par
l'adresse IP, et Vercel le fournit gratuitement en en-tête. Mais il répond à
la mauvaise question : un Français en vacances à Barcelone recevrait
l'espagnol, un hispanophone installé à Lyon recevrait le français. La langue
du navigateur est le réglage que la personne a choisi elle-même.

**Le repli est l'anglais, pas le français.** Un navigateur allemand ou
portugais ne correspond à aucune des trois langues ; lui servir du français
parce que c'est la langue d'origine du projet n'a aucun sens de son point de
vue. Les francophones reçoivent le français par leur propre en-tête, sans
dépendre de ce repli.

Deux détails d'implémentation qui comptent. Le cookie est posé **sur la
requête** avant tout rendu, sinon la première page s'afficherait encore en
français et ne basculerait qu'au rechargement suivant ; et **sur la réponse
en dernier**, après Supabase, parce que son client recrée l'objet réponse à
chaque rafraîchissement de session et emporterait un cookie posé plus tôt.

Un choix explicite n'est jamais écrasé : dès que le cookie existe, l'en-tête
est ignoré.
**Signaler un bug, depuis le profil.** Formulaire sur `/bug`, accessible à
tout le monde depuis les réglages du profil, et enregistré dans la table
`bug_reports`.

**Une table plutôt qu'un lien mailto.** Le mailto coûte une ligne et paraît
suffisant, mais il perd l'essentiel : le signalement arrive sans structure,
sans contexte technique, et on ne peut ni le retrouver ni savoir lequel a
déjà été traité. Surtout, trois rapports sur la même figure disent quelque
chose qu'aucun d'eux ne dit seul, et ça ne se voit que dans une table.

**La catégorie est demandée avant le texte.** Un champ libre seul produit
des « ça marche pas ». Six catégories en gros boutons — analyse, import,
export, progression, compte, autre — chacune avec ses exemples. Elle coûte
un geste, elle trie, et surtout elle oriente ce que la personne écrit
ensuite : on décrit mieux un problème quand on vient de choisir sa famille.

La figure concernée n'est proposée que sur les catégories analyse et export,
les seules où elle veut dire quelque chose ; la demander sur un bug de
connexion ferait hésiter pour rien. La liste est dérivée des grilles, donc
une figure ajoutée y apparaît d'elle-même.

**Le contexte technique est relevé sans être demandé** : navigateur, taille
d'écran, langue de l'interface. C'est exactement ce que personne ne pense à
joindre et ce dont on a besoin en premier pour reproduire — un bug de caméra
tient souvent au navigateur, un bug d'affichage à la largeur d'écran. Rien
de nouveau n'est collecté : ce sont des informations que le navigateur envoie
déjà à chaque requête.

RLS : chacun dépose et relit les siens, l'administrateur lit tout. La
suppression de compte emporte les signalements, sans quoi la clé étrangère
bloquerait l'effacement au milieu du travail de `delete_own_account`.
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
- **Straddle planche encore en DRAFT** : 3 échantillons seulement, ses
  scores et le fantôme qui en découle restent approximatifs.
- **Export 4K plus lent** : le rendu par image coûte quatre fois plus cher
  qu'en 1080p, et le fichier est gardé en mémoire avant téléchargement
  (environ 170 Mo pour trente secondes). Si l'encodeur de l'appareil refuse
  la résolution native, `writer.ts` redescend par paliers plutôt que
  d'échouer.
- **Trois langues : français, anglais, espagnol.** Le français reste la
  langue source, celle dont le type `Dictionary` est dérivé : une clé
  ajoutée dans `fr.ts` et absente ailleurs casse la compilation.

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
