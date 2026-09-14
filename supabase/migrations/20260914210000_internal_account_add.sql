-- Un septième compte interne, oublié au premier passage.
--
-- Migration séparée plutôt que correction de la précédente : celle-ci est déjà
-- appliquée en base, et retoucher une migration jouée laisse l'historique du
-- dépôt et la base réelle dire deux choses différentes.
--
-- Le fait que l'oubli se produise est attendu, et c'est pourquoi le marquage
-- se fait par adresse : une adresse manquante gonfle les chiffres en silence,
-- et dans le bon sens, donc personne ne la remarque. Le seul garde-fou est de
-- relire la liste des comptes de temps en temps et d'y chercher les siens.

update public.profiles p
set is_internal = true
from auth.users u
where u.id = p.id
  and lower(u.email) = 'taddoss-971@hotmail.com'
  and p.is_internal = false;
