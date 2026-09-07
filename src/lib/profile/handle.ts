// Règles du pseudo public, partagées entre la saisie et la vérification.
//
// Écrites une seule fois et importées des deux côtés : une validation
// dupliquée finit toujours par diverger, et le jour où elle diverge un
// utilisateur voit son pseudo accepté à l'écran puis refusé par la base.
//
// La même règle est aussi posée en contrainte SQL, parce qu'une validation
// qui ne vit que dans le navigateur se contourne en une requête.

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

/** Minuscules, chiffres et tiret bas. Rien d'autre ne survit à une URL. */
export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

export type HandleProblem = "empty" | "tooShort" | "format";

/**
 * Normalise une saisie : ce que l'utilisateur tape devient directement ce qui
 * sera enregistré. Corriger en silence plutôt que refuser évite de faire
 * échouer quelqu'un qui a simplement tapé une majuscule ou un accent.
 */
export function normalizeHandle(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      // Retire les accents : « théo » devient « theo » plutôt que d'être refusé.
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, HANDLE_MAX)
  );
}

/** Null quand le pseudo est valide, sinon la nature du problème. */
export function handleProblem(handle: string): HandleProblem | null {
  if (handle.length === 0) return "empty";
  if (handle.length < HANDLE_MIN) return "tooShort";
  if (!HANDLE_PATTERN.test(handle)) return "format";
  return null;
}
