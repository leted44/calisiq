-- Outil interne mono-utilisateur : la lecture des echantillons de
-- calibration ne doit pas dependre du compte connecte (l'utilisateur a
-- plusieurs comptes de test). L'ecriture reste restreinte a ses propres
-- lignes via la policy "calibration_samples: all own" existante.
create policy "calibration_samples: select all" on calibration_samples
  for select using (true);
