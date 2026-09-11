import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  isLang,
  negotiateLang,
} from "@/lib/i18n/config";

export async function proxy(request: NextRequest) {
  // Langue de la première visite.
  //
  // Sans ce bloc, tout le monde arrivait en français et devait trouver le
  // sélecteur pour en changer — ce que personne ne fait sur une page qu'il ne
  // comprend pas. Elle est donc déduite une fois de l'en-tête du navigateur,
  // puis figée dans le cookie.
  //
  // Le cookie existant n'est jamais écrasé : dès que quelqu'un a choisi sa
  // langue, ce choix prime sur son navigateur, y compris pour un francophone
  // qui préfère lire l'anglais.
  const dejaChoisie = request.cookies.get(LANG_COOKIE)?.value;
  const langueDeduite = isLang(dejaChoisie)
    ? null
    : negotiateLang(request.headers.get("accept-language"));
  // Posée sur la requête avant tout rendu : sans ça, la première page
  // s'afficherait encore en français et ne basculerait qu'au rechargement
  // suivant.
  if (langueDeduite) request.cookies.set(LANG_COOKIE, langueDeduite);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  // Posée sur la réponse en dernier : le client Supabase recrée l'objet
  // response à chaque rafraîchissement de session, et un cookie posé plus tôt
  // serait perdu avec lui.
  if (langueDeduite) {
    response.cookies.set(LANG_COOKIE, langueDeduite, {
      path: "/",
      maxAge: LANG_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
