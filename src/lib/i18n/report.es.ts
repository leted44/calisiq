import type { ScoreTier } from "@/lib/pose/report";

// Textes du rapport d'analyse en espagnol.
//
// Ce sont des textes de domaine et non d'habillage : ils suivent la grille de
// notation, pas les écrans. D'où ce fichier distinct du dictionnaire
// d'interface, comme pour les noms de figures.
type Descriptions = Record<string, Record<ScoreTier, string>>;

export const reportEs = {
  tierLabels: {
    optimal: "Óptimo",
    bon: "Bien",
    faible: "A mejorar",
  } as Record<ScoreTier, string>,

  critereDefinitions: {
    rep_lockout:
      "Ángulo alcanzado en la posición extendida, promediado sobre la serie. Mide si cada repetición parte de una extensión completa.",
    rep_peak:
      "Ángulo alcanzado en la posición flexionada, promediado sobre la serie. Mide si cada repetición se lleva hasta el final.",
    rep_control:
      "Desviación típica del ángulo de cadera en la serie. Mide el impulso: una cadera que oscila delata un movimiento lanzado en lugar de traccionado.",
    rep_form:
      "Ángulo de cadera medio en la serie. Mide cómo se sostiene el cuerpo durante el movimiento, donde el control mide el impulso.",
    rep_protraction:
      "Avance medio de los hombros por delante de las muñecas durante la serie, relativo a la longitud del torso. Es lo que separa una planche push-up de una flexión normal: los demás criterios solo miran el codo, la cadera y el ritmo.",
    rep_tempo:
      "Regularidad de la duración de las repeticiones, en porcentaje. Una serie que se degrada se alarga en las últimas repeticiones.",
    elbow_angle:
      "Ángulo hombro-codo-muñeca. Mide si el brazo está bloqueado (cerca de 180 grados) o flexionado.",
    hip_angle:
      "Ángulo hombro-cadera-rodilla. Define hasta qué punto el cuerpo está plegado o extendido a la altura de la cadera.",
    knee_angle:
      "Ángulo cadera-rodilla-tobillo. Mide si la pierna está estirada (cerca de 180 grados) o doblada.",
    shoulder_protraction:
      "Distancia horizontal entre el hombro y la muñeca, relativa a la longitud del torso. Mide cuánto avanzan los hombros por delante de las manos.",
    shoulder_flexion:
      "Ángulo cadera-hombro-muñeca. Mide la apertura del brazo por encima de la cabeza.",
    pelvis_deviation:
      "Distancia entre la cadera y la línea recta hombro-tobillo. Detecta una cadera que cae (sag) o que sube (pike).",
    pelvis_sag:
      "Caída de la cadera por debajo de la línea hombro-tobillo, relativa a la longitud del cuerpo. A diferencia del ángulo de cadera, que no distingue una espalda arqueada de una cadera cerrada, este criterio solo mira el hundimiento.",
    body_line_angle:
      "Ángulo del cuerpo entero (hombro-tobillo) respecto a la horizontal. Mide si el cuerpo está bien alineado para la progresión buscada.",
    torso_angle:
      "Ángulo del torso solo (hombro-cadera) respecto a la horizontal. Se usa en figuras donde las piernas no están en la misma posición, y donde una línea hombro-tobillo no significaría nada.",
    straightest_knee_angle:
      "Ángulo de rodilla de la pierna más estirada. En una figura a una pierna es ella la que soporta la dificultad; promediar ambas no describiría ninguna.",
    straightest_leg_hip_angle:
      "Ángulo hombro-cadera-rodilla del lado de la pierna estirada. Mide si esa pierna prolonga el torso en lugar de plegarse hacia él.",
    bent_knee_angle:
      "Ángulo de rodilla de la pierna que debe quedarse recogida. Es lo que separa una figura a una pierna de una figura con las dos piernas estiradas: sin él, una posición más difícil sacaría una nota perfecta en la categoría equivocada.",
  } as Record<string, string>,

  planche: {
    shoulder_protraction: {
      optimal: "Hombros bien por delante de las muñecas, la carga pasa correctamente a los brazos.",
      bon: "Protracción correcta, todavía queda margen para adelantar más los hombros.",
      faible: "Hombros poco adelantados respecto a las muñecas: carga insuficiente en los brazos y hold inestable.",
    },
    pelvis_deviation: {
      optimal: "Cadera perfectamente alineada entre hombros y tobillos.",
      bon: "Cadera bien alineada en general, ligeramente fuera de la línea ideal.",
      faible: "La cadera se aparta claramente de la línea hombro-cadera-tobillo.",
    },
    hip_angle: {
      optimal: "Ángulo cadera-rodilla muy cerca del objetivo de esta variante.",
      bon: "Ángulo cadera-rodilla razonablemente cerca del objetivo.",
      faible: "El ángulo cadera-rodilla se aparta de lo que pide esta variante.",
    },
    knee_angle: {
      optimal: "Piernas bien estiradas, palanca completa.",
      bon: "Piernas casi rectas, queda algo de flexión.",
      faible: "Piernas claramente dobladas: la palanca se acorta y la figura resulta más fácil.",
    },
    elbow_angle: {
      optimal: "Brazos bloqueados, la posición se sostiene con la estructura y no con la fuerza.",
      bon: "Brazos casi bloqueados, queda una ligera flexión.",
      faible: "Brazos doblados: el hold recae en el bíceps en lugar de la articulación bloqueada.",
    },
    body_line_angle: {
      optimal: "Cuerpo horizontal, línea limpia de hombros a tobillos.",
      bon: "Cuerpo cerca de la horizontal, ligeramente inclinado.",
      faible: "Cuerpo lejos de la horizontal: todavía no es la posición buscada.",
    },
  } as Descriptions,

  handstand: {
    shoulder_flexion: {
      optimal: "Hombros totalmente abiertos, brazos sobre la cabeza, orejas tapadas por los hombros.",
      bon: "Apertura de hombros correcta, todavía queda margen para empujar contra el suelo.",
      faible: "Apertura de hombros insuficiente, con riesgo de arquear la espalda para compensar.",
    },
    pelvis_deviation: {
      optimal: "Línea del cuerpo perfectamente recta, sin arqueo.",
      bon: "Línea del cuerpo recta en general, ligeramente desviada.",
      faible: "El cuerpo se arquea claramente: un handstand en banana en lugar de una línea recta.",
    },
    hip_angle: {
      optimal: "Cadera bien abierta, cuerpo apilado en vertical.",
      bon: "Cadera razonablemente abierta, ligero pliegue.",
      faible: "Cadera plegada, cuidado con el handstand en banana.",
    },
    elbow_angle: {
      optimal: "Brazos bien extendidos, correctamente bloqueados.",
      bon: "Brazos casi rectos, ligera flexión.",
      faible: "Codos doblados: la posición la sostienen los brazos y no el equilibrio.",
    },
    knee_angle: {
      optimal: "Rodillas bien extendidas, línea vertical limpia.",
      bon: "Rodillas casi rectas, ligera flexión.",
      faible: "Rodillas dobladas, lo que rompe la línea vertical del cuerpo.",
    },
    body_line_angle: {
      optimal: "Cuerpo correctamente vertical.",
      bon: "Cuerpo vertical en general, ligeramente desviado.",
      faible: "El cuerpo no está lo bastante vertical.",
    },
  } as Descriptions,

  front_lever: {
    hip_angle: {
      optimal: "Ángulo cadera-rodilla muy cerca del objetivo de esta variante.",
      bon: "Ángulo cadera-rodilla razonablemente cerca del objetivo.",
      faible: "El ángulo cadera-rodilla se aparta de lo que pide esta variante.",
    },
    elbow_angle: {
      optimal: "Brazos bien extendidos, correctamente bloqueados.",
      bon: "Brazos casi rectos, ligera flexión.",
      faible: "Codos doblados: la posición la sostienen los brazos y no la fuerza de espalda.",
    },
    knee_angle: {
      optimal: "Rodillas bien extendidas.",
      bon: "Rodillas casi rectas, ligera flexión.",
      faible: "Rodillas dobladas: las piernas deben quedarse rectas en esta variante.",
    },
    body_line_angle: {
      optimal: "Cuerpo bien paralelo al suelo para esta progresión.",
      bon: "Cuerpo paralelo al suelo en general, ligeramente desviado.",
      faible: "El cuerpo no está lo bastante paralelo al suelo para esta progresión.",
    },
  } as Descriptions,

  dragon_flag: {
    pelvis_sag: {
      optimal: "Core sostenido todo el rato, la cadera nunca cae por debajo de la línea del cuerpo.",
      bon: "La cadera cae un poco al final del recorrido, el core aguanta en general.",
      faible:
        "La cadera cae y la zona lumbar se arquea. Es la falta que invalida la figura, y la que lesiona: un dragon flag se sostiene en hollow, no arqueado.",
    },
    hip_angle: {
      optimal: "Línea del cuerpo bloqueada, sin quiebre en la cadera.",
      bon: "Ligero quiebre en la cadera, la línea aguanta en general.",
      faible:
        "El cuerpo se quiebra en la cadera, la forma clásica de acortar la palanca y aliviar el core.",
    },
    knee_angle: {
      optimal: "Piernas bien estiradas, palanca completa.",
      bon: "Rodillas casi rectas, ligera flexión.",
      faible: "Rodillas dobladas: la palanca se acorta y la figura es más fácil de lo que parece.",
    },
    body_line_angle: {
      optimal: "Cuerpo cerca de la horizontal, la palanca está en su punto más largo.",
      bon: "Cuerpo bien bajado, todavía quedan unos grados.",
      faible: "El cuerpo se queda demasiado vertical: el ángulo actual supera lo que tu core aguanta.",
    },
    torso_angle: {
      optimal: "Torso bajo y controlado, la rotación ocurre alrededor de los hombros.",
      bon: "Torso bien bajado, todavía queda margen.",
      faible: "Torso demasiado vertical: la rotación ocurre en la cadera en lugar de en los hombros.",
    },
  } as Descriptions,

  reps: {
    rep_lockout: {
      optimal: "Cada repetición parte de una extensión completa.",
      bon: "Extensión casi completa al final de cada repetición.",
      faible: "Las repeticiones no parten de una extensión completa, el recorrido se corta abajo.",
    },
    rep_peak: {
      optimal: "Repeticiones llevadas hasta el final.",
      bon: "Amplitud correcta, faltan unos grados arriba.",
      faible: "Repeticiones cortadas arriba, el movimiento no se lleva hasta su final.",
    },
    rep_control: {
      optimal: "Cuerpo firme, sin impulso.",
      bon: "Ligera oscilación de cadera, el movimiento sigue siendo traccionado en general.",
      faible: "La cadera oscila claramente: las repeticiones se lanzan en lugar de traccionarse.",
    },
    rep_form: {
      optimal: "Cuerpo mantenido recto durante toda la serie.",
      bon: "Posición correcta en general, con un ligero quiebre en la cadera.",
      faible:
        "El cuerpo se queda quebrado en la cadera durante las repeticiones: el recorrido se acorta y la figura es más fácil de lo que parece.",
    },
    rep_protraction: {
      optimal: "Hombros bien por delante de las muñecas durante toda la serie.",
      bon: "Avance de hombros presente, pero que se pierde a lo largo de la serie.",
      faible:
        "Los hombros no pasan lo bastante por delante de las muñecas: el movimiento es una flexión, no una planche push-up.",
    },
    rep_tempo: {
      optimal: "Ritmo constante de la primera repetición a la última.",
      bon: "Ritmo constante en general, con una ligera ralentización.",
      faible: "El ritmo se degrada mucho: las últimas repeticiones son mucho más lentas que las primeras.",
    },
  } as Descriptions,
};
