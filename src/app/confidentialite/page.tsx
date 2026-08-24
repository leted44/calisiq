export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-slate-950 px-4 py-12 text-slate-300">
      <div>
        <h1 className="text-2xl font-bold text-white">Politique de confidentialité</h1>
        <p className="mt-1 text-sm text-slate-500">Dernière mise à jour : 24 août 2026</p>
      </div>

      <p>
        CalisIQ est une application d&apos;analyse technique de figures de
        callisthénie (planche, handstand) par vidéo. Cette page explique
        quelles données sont collectées, pourquoi, et comment elles sont
        protégées.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Éditeur</h2>
        <p>
          CalisIQ est édité à titre individuel. Pour toute question relative
          à tes données, contacte{" "}
          <a href="mailto:dydyx97114@gmail.com" className="text-cyan-400 underline">
            dydyx97114@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Données collectées</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Email et mot de passe, ou identité Google si tu te connectes via Google</li>
          <li>Les vidéos que tu importes ou filmes pour analyse</li>
          <li>
            Les informations de profil que tu choisis de renseigner : taille,
            poids, date de naissance, sexe, photo de profil
          </li>
          <li>
            Les résultats d&apos;analyse générés à partir de tes vidéos
            (scores, angles mesurés, recommandations)
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Pourquoi ces données</h2>
        <p>
          Elles servent uniquement à faire fonctionner l&apos;application :
          analyser ta posture par intelligence artificielle, calculer tes
          scores techniques, te proposer des exercices correctifs, et
          personnaliser l&apos;expérience selon ton profil.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Hébergement et sécurité</h2>
        <p>
          Les données sont hébergées chez Supabase (Union européenne). Tes
          vidéos sont stockées dans un espace privé, accessible uniquement
          par toi. Aucune donnée n&apos;est vendue ni partagée avec des
          tiers à des fins commerciales.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Connexion avec Google</h2>
        <p>
          Si tu choisis de te connecter avec Google, seules ton adresse
          email et ton nom nous sont transmis par Google, dans le seul but
          de créer et sécuriser ton compte CalisIQ.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Tes droits</h2>
        <p>
          Tu peux supprimer tes vidéos et analyses directement depuis
          l&apos;application (Historique). Pour supprimer ton compte
          entièrement ou exercer un droit d&apos;accès, de rectification ou
          de suppression de tes données, contacte-nous à l&apos;adresse
          ci-dessus.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Cookies</h2>
        <p>
          CalisIQ utilise uniquement des cookies techniques nécessaires au
          maintien de ta session de connexion. Aucun cookie publicitaire ou
          de suivi n&apos;est utilisé.
        </p>
      </section>
    </div>
  );
}
