-- Échantillons de calibration : angles mesurés réels + note subjective de
-- l'utilisateur, pour dériver les seuils de scoring d'une figure non encore
-- calibrée (Handstand, etc.) à partir de données réelles plutôt que de
-- valeurs devinées.
create table calibration_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  figure text not null,
  variation text not null,
  elbow_angle numeric,
  hip_angle numeric,
  body_line_angle_from_horizontal numeric,
  shoulder_protraction numeric,
  pelvis_deviation numeric,
  pelvis_sag_sign numeric,
  user_rating numeric not null,
  notes text
);

alter table calibration_samples enable row level security;

create policy "calibration_samples: all own" on calibration_samples for all
  using (auth.uid() = user_id);
