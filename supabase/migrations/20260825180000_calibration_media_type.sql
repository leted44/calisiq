alter table calibration_samples
  add column if not exists media_type text not null default 'video'
  check (media_type in ('video', 'photo'));
