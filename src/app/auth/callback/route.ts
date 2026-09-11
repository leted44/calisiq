import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Destination après l'échange du code. La connexion Google n'en fournit
  // jamais, et retombe donc sur l'accueil comme avant ; la réinitialisation de
  // mot de passe, elle, en pose un pour atterrir directement sur l'écran où
  // choisir le nouveau mot de passe, plutôt que sur l'app avec une session
  // « recovery » que rien n'explique à l'utilisateur.
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
