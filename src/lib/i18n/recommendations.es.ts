import type { TieredRecommendations } from "@/lib/pose/recommendations";

// Recommandations d'exercices en espagnol.
//
// Généré depuis la structure anglaise, table par table, pour qu'aucune
// entrée ne puisse manquer : la génération échoue si une seule chaîne n'a pas
// de traduction. Les commentaires qui documentent les choix restent côté
// français, où ils sont à leur place ; les dupliquer ici les ferait diverger.
export const recommendationsEs: Record<
  string,
  Record<string, TieredRecommendations>
> = {
  PLANCHE: {
  shoulder_protraction: {
    faible: [
      {
        exercice: "Planche lean (inclinación progresiva contra una pared o en el suelo)",
        raison:
          "Unos hombros poco adelantados respecto a las muñecas significan carga insuficiente en los antebrazos y un hold inestable.",
      },
      {
        exercice: "Scapula push-up",
        raison: "Trabaja el control escapular del que depende una buena protracción.",
      },
    ],
    bon: [
      {
        exercice: "Pseudo planche push-up, tempo lento (3s abajo)",
        raison:
          "La protracción está ahí pero aún se queda corta. El tempo lento obliga a buscar los últimos grados.",
      },
    ],
    optimal: [
      {
        exercice: "Mantén la consigna «empuja el suelo lejos hacia delante» en holds más largos",
        raison: "La protracción ya es excelente; ahora se trata de mantenerla en el tiempo.",
      },
    ],
  },
  pelvis_deviation_sag: {
    faible: [
      {
        exercice: "Hollow body hold",
        raison: "La cadera cae en lugar de mantenerse alineada de hombro a tobillo.",
      },
      {
        exercice: "Tuck planche isométrica con la consigna «ombligo hacia la columna»",
        raison: "Desarrolla la fuerza de core necesaria para que la cadera deje de caer.",
      },
    ],
    bon: [
      {
        exercice: "Hollow body hold con pausa al final de la serie, piernas más estiradas",
        raison: "La caída es leve. Un poco más de tensión de core al final de la serie cierra el último hueco.",
      },
    ],
    optimal: [
      {
        exercice: "Nada que corregir en el core, solo vigila la fatiga al final del hold",
        raison: "La alineación ya es casi perfecta; el único riesgo que queda es soltar al final del esfuerzo.",
      },
    ],
  },
  pelvis_deviation_pike: {
    faible: [
      {
        exercice: "Straddle planche con la consigna «empuja los talones hacia atrás»",
        raison: "La cadera sube en pike en lugar de mantenerse alineada de hombro a tobillo.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición con la consigna «abre la cadera ligeramente hacia delante»",
        raison: "Queda un ligero pike. Basta con ajustar la consigna, no hace falta volver a un ejercicio más fácil.",
      },
    ],
    optimal: [
      {
        exercice: "Nada que corregir, solo vigila que el pike no aparezca al cansarte",
        raison: "La alineación ya es casi perfecta.",
      },
    ],
  },
  hip_angle: {
    faible: [
      {
        exercice: "Hold isométrico en tuck (palmas en el suelo)",
        raison: "Trabaja el control del ángulo cadera-rodilla propio de tu progresión actual.",
      },
      {
        exercice: "L-sit progresiva",
        raison: "Desarrolla la fuerza de los flexores de cadera necesaria para sostener el ángulo objetivo.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, cierra el ángulo de cadera unos grados en cada serie",
        raison: "El ángulo está cerca del objetivo. Un ajuste progresivo antes que un ejercicio nuevo.",
      },
    ],
    optimal: [
      {
        exercice: "Ángulo de cadera ya controlado, trabaja mejor la duración del hold en ese ángulo",
        raison: "Nada que corregir aquí; la prioridad pasa de la técnica a la resistencia.",
      },
    ],
  },

  hip_angle_open: {
    faible: [
      {
        exercice: "Hold isométrico en tuck con la consigna «redondea la espalda, lleva la cadera hacia el pecho»",
        raison:
          "La cadera está demasiado abierta para esta progresión. Un tuck más compacto y redondeado hace la posición más estable.",
      },
      {
        exercice: "L-sit progresiva, rodillas bien recogidas contra el pecho",
        raison: "Desarrolla la fuerza de flexión de cadera necesaria para compactar el tuck.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, consigna «redondea un poco más la espalda» en cada serie",
        raison: "El ángulo está cerca del objetivo. Compacta el tuck en lugar de cambiar de ejercicio.",
      },
    ],
    optimal: [
      {
        exercice: "Compactación del tuck ya controlada, trabaja mejor la duración del hold",
        raison: "Nada que corregir aquí; la prioridad pasa de la técnica a la resistencia.",
      },
    ],
  },
  hip_angle_closed: {
    faible: [
      {
        exercice: "Hold isométrico en tuck con la consigna «abre la cadera muy ligeramente»",
        raison:
          "El tuck está más cerrado que el objetivo. Demasiada flexión de cadera perjudica el equilibrio tanto como demasiado poca.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, consigna «abre la cadera muy ligeramente» en cada serie",
        raison: "El ángulo está cerca del objetivo; basta con un ajuste fino.",
      },
    ],
    optimal: [
      {
        exercice: "Ángulo de cadera ya controlado, trabaja mejor la duración del hold en ese ángulo",
        raison: "Nada que corregir aquí; la prioridad pasa de la técnica a la resistencia.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Trabajo aislado de tríceps (flexiones diamante, fondos)",
        raison: "Codos doblados para compensar una falta de fuerza, lo que invalida la figura a alto nivel.",
      },
      {
        exercice: "Acorta el hold y pon la técnica por delante del tiempo",
        raison: "Un hold corto con los brazos rectos vale más que uno largo apoyado en codos doblados.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «bloquea los codos activamente» desde el primer segundo del hold",
        raison: "La flexión es leve y suele aparecer tras unos segundos. Una consigna de bloqueo activo lo corrige.",
      },
    ],
    optimal: [
      {
        exercice: "Bloqueo ya excelente, nada que añadir aquí",
        raison: "Los brazos se mantienen rectos durante todo el hold.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Estiramientos de isquiotibiales más trabajo de core con piernas estiradas",
        raison:
          "Rodillas dobladas. Las piernas deben quedarse rectas incluso en tuck, o el siguiente paso (straddle, full) costará más de trasladar.",
      },
      {
        exercice: "Straddle-L progresiva, piernas bloqueadas",
        raison: "Crea el hábito de mantener las rodillas rectas bajo tensión.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «punta de pie activa» para terminar de estirar las piernas",
        raison: "La flexión que queda es pequeña; una consigna activa arregla el resto.",
      },
    ],
    optimal: [
      {
        exercice: "Piernas ya bien bloqueadas, nada que añadir aquí",
        raison: "La línea de las piernas se mantiene limpia durante todo el hold.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Hold isométrico en la posición objetivo con la consigna «empuja contra el suelo»",
        raison:
          "El cuerpo no está lo bastante paralelo al suelo para esta progresión, casi siempre por falta de fuerza de hombros más que por técnica.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, busca bajar los pies unos centímetros más",
        raison: "La línea está cerca de la horizontal. Un ajuste fino antes que volver a un ejercicio más fácil.",
      },
    ],
    optimal: [
      {
        exercice: "Línea del cuerpo ya excelente, trabaja mejor la duración del hold en esta posición",
        raison: "Nada que corregir en la alineación del cuerpo.",
      },
    ],
  },
  },
  HANDSTAND: {
  shoulder_flexion: {
    faible: [
      {
        exercice: "Handstand de pecho a la pared",
        raison:
          "Apertura de hombros insuficiente. Empuja fuerte contra el suelo e intenta taparte las orejas con los hombros para no arquear la espalda.",
      },
      {
        exercice: "Pike push-up",
        raison: "Refuerza los hombros en el recorrido por encima de la cabeza que exige una apertura completa.",
      },
    ],
    bon: [
      {
        exercice: "Handstand de pecho a la pared con la consigna «empuja más fuerte el suelo, orejas tapadas»",
        raison: "La apertura casi está; una consigna de final de recorrido cierra lo que falta.",
      },
    ],
    optimal: [
      {
        exercice: "Apertura de hombros ya excelente, nada que añadir aquí",
        raison: "Los brazos se mantienen bien alineados sobre la cabeza durante todo el hold.",
      },
    ],
  },
  pelvis_deviation_sag: {
    faible: [
      {
        exercice: "Hollow body hold",
        raison: "La cadera se arquea en banana en lugar de mantenerse alineada de hombro a tobillo.",
      },
      {
        exercice: "Handstand de pecho a la pared con la consigna «aprieta los glúteos, ombligo dentro»",
        raison: "Desarrolla la fuerza de core necesaria para mantener una línea recta boca abajo.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, consigna «aprieta los glúteos» desde los primeros segundos del hold",
        raison: "El arqueo es leve y suele aparecer al final del hold. Una consigna temprana lo corrige.",
      },
    ],
    optimal: [
      {
        exercice: "Línea del cuerpo ya recta, nada que añadir aquí",
        raison: "El core aguanta bien durante todo el hold.",
      },
    ],
  },
  pelvis_deviation_pike: {
    faible: [
      {
        exercice: "Handstand de espalda a la pared con la consigna «empuja el suelo, cadera abierta»",
        raison: "La cadera está demasiado plegada hacia delante en lugar de mantenerse alineada de hombro a tobillo.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, consigna «abre un poco más la cadera»",
        raison: "El pliegue es leve; basta con ajustar la consigna.",
      },
    ],
    optimal: [
      {
        exercice: "Línea del cuerpo ya recta, nada que añadir aquí",
        raison: "La alineación ya es casi perfecta.",
      },
    ],
  },
  hip_angle: {
    faible: [
      {
        exercice: "Hollow body hold",
        raison: "Desarrolla la fuerza de core que mantiene recta la línea cadera-rodilla en equilibrio.",
      },
      {
        exercice: "Handstand de pecho a la pared, espalda plana contra la pared",
        raison: "Da una referencia física de lo que se siente con una línea de cuerpo realmente recta.",
      },
    ],
    bon: [
      {
        exercice: "Handstand de pecho a la pared, consigna «alarga la cadera» al final del hold",
        raison: "La apertura de cadera casi está completa; basta una consigna de final de recorrido.",
      },
    ],
    optimal: [
      {
        exercice: "Línea cadera-rodilla ya recta, nada que añadir aquí",
        raison: "El equilibrio no depende de una compensación de cadera.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Handstand push-up negativo contra una pared",
        raison: "Codos doblados para compensar una falta de fuerza de hombros, lo que invalida la figura a alto nivel.",
      },
      {
        exercice: "Acorta el hold y pon los brazos rectos por delante del tiempo",
        raison: "Un hold corto con los brazos bloqueados vale más que uno largo apoyado en codos doblados.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «bloquea los codos activamente» desde el primer segundo del hold",
        raison: "La flexión es leve; una consigna de bloqueo activo arregla el resto.",
      },
    ],
    optimal: [
      {
        exercice: "Bloqueo ya excelente, nada que añadir aquí",
        raison: "Los brazos se mantienen rectos durante todo el hold.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Handstand de pecho a la pared, piernas activas y estiradas",
        raison: "Rodillas dobladas, lo que rompe la línea vertical del cuerpo y dificulta el equilibrio.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «puntas activas, piernas empujando hacia el techo»",
        raison: "La flexión que queda es pequeña; una consigna activa basta para terminar de estirar las piernas.",
      },
    ],
    optimal: [
      {
        exercice: "Piernas ya bien bloqueadas, nada que añadir aquí",
        raison: "La línea vertical se mantiene limpia durante todo el hold.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Handstand de pecho a la pared para sentir la línea vertical",
        raison: "El cuerpo no está lo bastante vertical. Una referencia física ayuda a corregir la línea general.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, consigna «estírate aún más hacia el techo»",
        raison: "La línea está cerca de la vertical. Un ajuste fino antes que volver a la pared.",
      },
    ],
    optimal: [
      {
        exercice: "Línea ya vertical, trabaja mejor la duración del hold sin pared",
        raison: "Nada que corregir en la alineación del cuerpo.",
      },
    ],
  },
  },
  FRONT_LEVER: {
  hip_angle: {
    faible: [
      {
        exercice: "Tuck front lever hold (rodillas al pecho, colgado de la barra)",
        raison: "Trabaja el control del ángulo cadera-rodilla propio de tu progresión actual.",
      },
      {
        exercice: "Ice cream makers (remo excéntrico hacia la posición tuck)",
        raison: "Desarrolla la fuerza de tracción necesaria para sostener el ángulo objetivo sin romperse.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, cierra el ángulo de cadera unos grados en cada serie",
        raison: "El ángulo está cerca del objetivo. Un ajuste progresivo antes que un ejercicio nuevo.",
      },
    ],
    optimal: [
      {
        exercice: "Ángulo de cadera ya controlado, trabaja mejor la duración del hold en ese ángulo",
        raison: "Nada que corregir aquí; la prioridad pasa de la técnica a la resistencia.",
      },
    ],
  },

  hip_angle_open: {
    faible: [
      {
        exercice: "Tuck front lever hold con la consigna «redondea la espalda, rodillas bien al pecho»",
        raison:
          "La cadera está demasiado abierta para esta progresión. Un tuck más compacto y redondeado hace la posición más sostenible.",
      },
      {
        exercice: "Ice cream makers, insistiendo en la posición más recogida",
        raison: "Desarrolla la fuerza de tracción necesaria para compactar el tuck sin romperse.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, consigna «redondea un poco más la espalda» en cada serie",
        raison: "El ángulo está cerca del objetivo. Compacta el tuck en lugar de cambiar de ejercicio.",
      },
    ],
    optimal: [
      {
        exercice: "Compactación del tuck ya controlada, trabaja mejor la duración del hold",
        raison: "Nada que corregir aquí; la prioridad pasa de la técnica a la resistencia.",
      },
    ],
  },
  hip_angle_closed: {
    faible: [
      {
        exercice: "Tuck front lever hold con la consigna «abre la cadera muy ligeramente»",
        raison:
          "El tuck está más cerrado que el objetivo. Demasiada flexión de cadera perjudica el control tanto como demasiado poca.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, consigna «abre la cadera muy ligeramente» en cada serie",
        raison: "El ángulo está cerca del objetivo; basta con un ajuste fino.",
      },
    ],
    optimal: [
      {
        exercice: "Ángulo de cadera ya controlado, trabaja mejor la duración del hold en ese ángulo",
        raison: "Nada que corregir aquí; la prioridad pasa de la técnica a la resistencia.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Straight-arm pulldown (polea o goma, brazos bloqueados)",
        raison:
          "Refuerza los dorsales con los brazos rectos, exactamente la fuerza que falta cuando los codos se doblan en lugar de quedarse bloqueados.",
      },
      {
        exercice: "Acorta el hold y pon la técnica por delante del tiempo",
        raison: "Un hold corto con los brazos rectos vale más que uno largo apoyado en codos doblados.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «bloquea los codos activamente» desde que tiras a la posición",
        raison: "La flexión es leve; una consigna de bloqueo activo arregla el resto.",
      },
    ],
    optimal: [
      {
        exercice: "Bloqueo ya excelente, nada que añadir aquí",
        raison: "Los brazos se mantienen rectos durante todo el hold.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Estiramientos de isquiotibiales más trabajo de core con piernas estiradas en suspensión",
        raison: "Rodillas dobladas. Las piernas deben quedarse rectas en esta variante.",
      },
      {
        exercice: "Straddle-L progresiva, piernas bloqueadas",
        raison: "Crea el hábito de mantener las rodillas rectas bajo tensión.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «punta de pie activa» para terminar de estirar las piernas",
        raison: "La flexión que queda es pequeña; una consigna activa arregla el resto.",
      },
    ],
    optimal: [
      {
        exercice: "Piernas ya bien bloqueadas, nada que añadir aquí",
        raison: "La línea de las piernas se mantiene limpia durante todo el hold.",
      },
    ],
  },

  torso_angle: {
    faible: [
      {
        exercice: "Tuck front lever hold con la consigna «pecho abierto, cadera a la altura de los hombros»",
        raison:
          "El torso no está lo bastante horizontal. Es la base de la figura, antes incluso de que las piernas importen.",
      },
      {
        exercice: "Ice cream makers (remo excéntrico con brazos rectos)",
        raison: "Desarrolla la fuerza de tracción necesaria para sostener el torso horizontal.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, consigna «sube ligeramente el pecho» al final del hold",
        raison: "El torso casi está horizontal; basta con un ajuste fino.",
      },
    ],
    optimal: [
      {
        exercice: "Torso ya bien horizontal, trabaja mejor la duración del hold",
        raison: "Nada que corregir en la alineación del torso.",
      },
    ],
  },
  straightest_knee_angle: {
    faible: [
      {
        exercice: "Estiramientos de isquiotibiales más consigna «punta activa» en la pierna estirada",
        raison:
          "La pierna que debería estar estirada se queda doblada, lo que acorta la palanca y falsea la dificultad real de la figura.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «bloquea la rodilla» desde que tiras a la posición",
        raison: "La flexión que queda es pequeña; una consigna activa basta para terminar de estirar.",
      },
    ],
    optimal: [
      {
        exercice: "Pierna estirada ya bien bloqueada, nada que añadir aquí",
        raison: "La línea de las piernas se mantiene limpia durante todo el hold.",
      },
    ],
  },
  straightest_leg_hip_angle: {
    faible: [
      {
        exercice: "Tuck front lever hold con la consigna «lleva el talón de la pierna estirada lejos hacia atrás»",
        raison:
          "La pierna estirada se queda plegada hacia el pecho en lugar de prolongar el torso, así que la palanca es más corta de lo que aparenta la figura.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, consigna «alarga la cadera» en la pierna estirada",
        raison: "La apertura casi está completa; una consigna de final de recorrido cierra el hueco.",
      },
    ],
    optimal: [
      {
        exercice: "Cadera de la pierna estirada ya bien abierta, trabaja la duración",
        raison: "Nada que corregir en la alineación de esta pierna.",
      },
    ],
  },
  bent_knee_angle: {
    faible: [
      {
        exercice: "Cambia de variante: tus dos piernas están estiradas, esto es un full front lever",
        raison:
          "La rodilla que debería quedarse recogida está casi estirada. La figura que has hecho es más difícil que la seleccionada, y puntuada en esta categoría recibe una nota que no la describe.",
      },
    ],
    bon: [
      {
        exercice: "Lleva la rodilla otra vez contra el pecho y mantenla apretada durante todo el hold",
        raison:
          "La rodilla se abre durante el hold, casi siempre cuando llega la fatiga. Y sin embargo es ella la que define la variante: dejarla escapar cambia la figura a mitad de camino.",
      },
    ],
    optimal: [
      {
        exercice: "La pierna recogida se mantiene apretada, nada que corregir por ese lado",
        raison: "Esa pierna mantiene su posición limpia de principio a fin.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Skin the cat más hold isométrico en la posición objetivo",
        raison:
          "El cuerpo no está lo bastante paralelo al suelo para esta progresión, casi siempre por falta de core y de fuerza de tracción más que por técnica.",
      },
    ],
    bon: [
      {
        exercice: "La misma posición, busca subir ligeramente los pies hasta la horizontal",
        raison: "La línea está cerca de la horizontal. Un ajuste fino antes que volver a un ejercicio más fácil.",
      },
    ],
    optimal: [
      {
        exercice: "Línea del cuerpo ya excelente, trabaja mejor la duración del hold en esta posición",
        raison: "Nada que corregir en la alineación del cuerpo.",
      },
    ],
  },
  },
  DRAGON_FLAG: {
  pelvis_sag: {
    faible: [
      {
        exercice: "Hollow body hold, 3 x 30s, zona lumbar pegada al suelo",
        raison:
          "La cadera cae porque la zona lumbar se arquea. Sostener la posición hollow en el suelo enseña al cuerpo la colocación exacta que falta en el aire.",
      },
      {
        exercice: "Dead bug lento, 3 x 8 por lado",
        raison:
          "Trabaja el sostén de la cadera mientras las piernas se alejan, que es justo donde cede un dragon flag.",
      },
    ],
    bon: [
      {
        exercice: "Tuck dragon flag con pausa de 3s, ombligo hacia dentro",
        raison:
          "El core casi aguanta. La pausa lo obliga a sostener exactamente donde empieza a fallar.",
      },
    ],
    optimal: [
      {
        exercice: "Bajada completa de 6s, piernas estiradas",
        raison:
          "El core está bloqueado; el margen de progreso está en el tiempo bajo tensión.",
      },
    ],
  },
  hip_angle: {
    faible: [
      {
        exercice: "Dragon flag negativo, bajada de 5 segundos",
        raison:
          "La cadera se quiebra porque el core falla antes de terminar la bajada. Las excéntricas lentas construyen justo el recorrido que cede.",
      },
      {
        exercice: "Hollow body hold, 3 x 30s",
        raison:
          "Si la posición hollow no aguanta en el suelo, tampoco aguantará boca abajo.",
      },
    ],
    bon: [
      {
        exercice: "Tuck dragon flag con pausas de 3s a media bajada",
        raison:
          "La línea casi está. Las pausas te obligan a sostenerla donde empieza a ceder.",
      },
    ],
    optimal: [
      {
        exercice: "Alarga el tiempo de hold en lugar de abrirte más",
        raison: "La cadera está bloqueada; el reto pasa a ser la resistencia del core.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Dragon flag con piernas juntas y puntas estiradas",
        raison:
          "Las rodillas dobladas acortan la palanca y falsean la dificultad anunciada.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «lleva los talones hacia la pared del fondo»",
        raison: "Las piernas casi se estiran del todo; esta consigna encuentra los últimos grados.",
      },
    ],
    optimal: [
      {
        exercice: "Nada que corregir en las rodillas",
        raison: "Línea de piernas limpia.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Tuck y luego straddle dragon flag antes de la versión completa",
        raison:
          "El cuerpo se queda demasiado alto: la palanca actual supera tu fuerza de core. Acórtala antes de alargarla.",
      },
    ],
    bon: [
      {
        exercice: "Negativas hasta la horizontal con vuelta asistida",
        raison: "La bajada es buena; faltan los últimos grados hasta la horizontal.",
      },
    ],
    optimal: [
      {
        exercice: "Trabaja el tiempo de hold en este ángulo",
        raison: "El ángulo es excelente; el tiempo bajo tensión es lo que marcará la diferencia ahora.",
      },
    ],
  },
  torso_angle: {
    faible: [
      {
        exercice: "Tuck dragon flag negativo, hombros bien pegados al banco",
        raison:
          "El torso se queda demasiado vertical: la rotación debe ocurrir alrededor de los hombros, no de la cadera.",
      },
    ],
    bon: [
      {
        exercice: "Pausas isométricas al final de la bajada",
        raison: "El torso baja bien; falta control en los últimos grados.",
      },
    ],
    optimal: [
      {
        exercice: "Pasa a la variante superior",
        raison: "El torso está bajo y controlado; el tuck ya no te hace progresar.",
      },
    ],
  },
  straightest_knee_angle: {
    faible: [
      {
        exercice: "Hold con la pierna activa apoyada en un soporte bajo, 3 x 20 s por lado",
        raison:
          "La rodilla se dobla porque la pierna cede antes que el core. El apoyo quita parte de la carga y deja tiempo para bloquear la extensión.",
      },
      {
        exercice: "Bloqueo activo del cuádriceps en el suelo, 8 x 5 s por pierna",
        raison:
          "Estirar una rodilla es una acción muscular, no una posición que caiga sola. Entrénala aparte antes de exigirla bajo tensión.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «punta del pie hacia ti, rodilla apretada» desde que entras en posición",
        raison: "La extensión casi está completa; se pierde en los últimos grados.",
      },
    ],
    optimal: [
      {
        exercice: "Pierna activa bloqueada, alarga el hold",
        raison: "Esa pierna dibuja una línea limpia; ya no es ella la que limita.",
      },
    ],
  },
  straightest_leg_hip_angle: {
    faible: [
      {
        exercice: "Hollow body con una pierna estirada y la otra recogida, 3 x 20 s por lado",
        raison:
          "La cadera se cierra para acortar la palanca, el reflejo natural cuando la posición se pone dura. En el suelo se puede sostener la misma forma sin miedo a caer, y la colocación se asienta.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «empuja el talón lejos» en la pierna estirada",
        raison: "La apertura casi está completa; una consigna de final de recorrido cierra el hueco.",
      },
    ],
    optimal: [
      {
        exercice: "Pierna estirada bien alineada con el torso, trabaja la duración",
        raison: "Ya no queda nada que recolocar en esa alineación.",
      },
    ],
  },
  bent_knee_angle: {
    faible: [
      {
        exercice: "Cambia de variante: tus dos piernas están estiradas",
        raison:
          "La rodilla que debería quedarse recogida está casi estirada. Estás haciendo la variante superior, y puntuada en esta categoría recibe una nota que no la describe.",
      },
    ],
    bon: [
      {
        exercice: "Lleva la rodilla otra vez contra el pecho y mantenla apretada durante todo el hold",
        raison:
          "La rodilla se abre durante el hold, casi siempre cuando llega la fatiga. Y sin embargo es ella la que define la variante.",
      },
    ],
    optimal: [
      {
        exercice: "La pierna recogida se mantiene apretada, nada que corregir por ese lado",
        raison: "Esa pierna mantiene su posición de principio a fin.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Apoyo lateral con brazos rectos en una barra baja, 3 x 15 s por lado",
        raison:
          "El brazo de abajo se dobla y el cuerpo se hunde hacia la barra. Ese brazo es el que empuja: mientras no aguante la carga con el codo bloqueado, la figura se seguirá cerrando.",
      },
      {
        exercice: "Negativas de bandera, bajada lenta con los codos bloqueados",
        raison: "Te obliga a sostener la extensión justo en el momento en que cede.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «empuja la barra lejos» con el brazo de abajo",
        raison: "Los codos aguantan; quedan unos grados por bloquear.",
      },
    ],
    optimal: [
      {
        exercice: "Brazos bloqueados, pasa el trabajo a la duración del hold",
        raison: "El anclaje es sólido; ya no es él quien limita el hold.",
      },
    ],
  },
  },
  REP: {
  rep_lockout: {
    faible: [
      {
        exercice: "Marca una pausa de un segundo abajo en cada repetición",
        raison:
          "Volver a empezar sin extensión completa se salta la parte más dura del movimiento, la que construye fuerza.",
      },
      {
        exercice: "Reduce el número de repeticiones y busca el recorrido completo",
        raison: "Cinco repeticiones completas valen más que doce cortadas.",
      },
    ],
    bon: [
      {
        exercice: "Bajada controlada de 3 segundos",
        raison: "La extensión casi está completa; el tempo lento encuentra los últimos grados.",
      },
    ],
    optimal: [
      {
        exercice: "Nada que corregir en la extensión",
        raison: "Cada repetición vuelve a empezar desde una posición completa.",
      },
    ],
  },
  rep_peak: {
    faible: [
      {
        exercice: "Baja la dificultad hasta que puedas completar el recorrido",
        raison:
          "Las repeticiones se cortan arriba: la carga actual supera lo que puedes llevar hasta el final.",
      },
    ],
    bon: [
      {
        exercice: "Pausa de un segundo arriba en cada repetición",
        raison: "El recorrido casi está; la pausa impide cortar el final del movimiento.",
      },
    ],
    optimal: [
      {
        exercice: "Recorrido completo, puedes añadir volumen",
        raison: "Las repeticiones se llevan hasta el final.",
      },
    ],
  },
  rep_control: {
    faible: [
      {
        exercice: "Repeticiones estrictas con una pausa de un segundo abajo",
        raison:
          "La cadera oscila: el movimiento se lanza. La pausa mata la inercia y obliga a partir solo de la fuerza.",
      },
      {
        exercice: "Hollow body hold, 3 x 30s",
        raison: "La oscilación viene de un torso que no está firme; ahí es donde hay que trabajar.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «aprieta glúteos y abdomen antes de tirar»",
        raison: "La oscilación es leve; una consigna de core suele bastar para quitarla.",
      },
    ],
    optimal: [
      {
        exercice: "Nada que corregir, el cuerpo se mantiene firme",
        raison: "Las repeticiones se traccionan, no se lanzan.",
      },
    ],
  },
  rep_form: {
    faible: [
      {
        exercice: "Plancha frontal 3 x 40s, y vuelve luego a la serie",
        raison:
          "El cuerpo se queda quebrado en la cadera todo el rato: es un problema de core más que de fuerza de brazos, y acorta el recorrido.",
      },
      {
        exercice: "Consigna «aprieta los glúteos, una línea de hombros a talones»",
        raison:
          "El quiebre suele ser inconsciente. Una consigna verbal antes de cada serie suele bastar para corregirlo.",
      },
    ],
    bon: [
      {
        exercice: "Grábate de perfil y comprueba la línea a media repetición",
        raison:
          "La posición es correcta pero se escapa a ratos, casi siempre en el punto más duro del movimiento.",
      },
    ],
    optimal: [
      {
        exercice: "Nada que corregir, el cuerpo se mantiene alineado",
        raison: "La posición aguanta de la primera repetición a la última.",
      },
    ],
  },
  rep_protraction: {
    faible: [
      {
        exercice: "Planche lean estático, 4 x 15 s, hombros muy por delante de las manos",
        raison:
          "Los hombros no pasan lo bastante por delante de las muñecas: el peso se queda en las manos en vez de cargar los brazos, y el movimiento es una flexión, no una planche push-up.",
      },
      {
        exercice: "Pseudo planche push-up, tempo lento, 4 x 6",
        raison:
          "Entrena exactamente la acción que falta, el avance de los hombros, a una intensidad en la que todavía puedes controlarla.",
      },
    ],
    bon: [
      {
        exercice: "Consigna «empuja el suelo lejos hacia atrás» en cada repetición",
        raison:
          "El avance está en la primera repetición y se pierde durante la serie, a menudo ya en la segunda.",
      },
    ],
    optimal: [
      {
        exercice: "Avance de hombros mantenido toda la serie, alarga la serie",
        raison: "La posición aguanta de principio a fin; ya no es ella la que limita.",
      },
    ],
  },
  rep_tempo: {
    faible: [
      {
        exercice: "Corta la serie dos repeticiones antes del fallo",
        raison:
          "El ritmo se hunde al final de la serie: las últimas repeticiones salen de la compensación más que de la fuerza.",
      },
    ],
    bon: [
      {
        exercice: "Cuenta tu tempo, 2 segundos al subir y 2 al bajar",
        raison: "La regularidad es correcta; contar el tempo la dejará limpia.",
      },
    ],
    optimal: [
      {
        exercice: "Ritmo controlado, puedes alargar la serie",
        raison: "La regularidad aguanta de principio a fin.",
      },
    ],
  },
  },
};
