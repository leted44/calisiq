-- Date réelle à laquelle la figure a été réalisée, distincte de created_at
-- (moment de l'import/analyse dans l'app). Renseignée uniquement quand
-- l'utilisateur importe une vidéo (pas pour un enregistrement caméra,
-- toujours "maintenant" par définition) — sert de date fiable pour
-- l'historique et les courbes de progression, à défaut on retombe sur
-- created_at.
alter table sessions add column performed_at timestamptz;
