<?php

namespace App\Concerns;

use App\Models\Escale;
use App\Models\Manifeste;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Les trois gardes que tout geste sur un manifeste doit passer.
 *
 * Elles se répètent d'un contrôleur à l'autre — import, saisie, pièce probante,
 * transmission — et se répéteraient à l'identique : les regrouper évite qu'une
 * porte d'entrée en oublie une. Un dossier hors périmètre rend 404 et non 403 :
 * un 403 confirmerait son existence à qui n'a rien à en savoir.
 *
 * @see docs/DECISIONS.md ADR-0007, ADR-0043
 */
trait GardeLeManifeste
{
    /**
     * Le dossier existe-t-il pour ce compte, et l'écran est-il le sien ?
     *
     * La seconde question est le même dictionnaire qui a servi à aiguiller
     * (ADR-0043) : on ne touche pas au manifeste d'un dossier déjà facturé sous
     * couvert d'URL.
     */
    protected function assureLeDossier(Request $request, Escale $escale): void
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($escale->estVisiblePar($user), 404);
        abort_unless($escale->etape->ecran() === 'dossiers.manifeste', 404);
    }

    /**
     * Le manifeste du dossier, encore ouvert à la correction.
     *
     * Avant transmission, la correction est libre : le consignataire redépose
     * et refait le circuit, sans formalisme. Après, plus rien ne bouge de son
     * côté — les manifestes additifs et rectificatifs relèveront d'un autre
     * régime et d'une permission CGC (WF4).
     */
    protected function manifesteModifiable(Escale $escale): Manifeste
    {
        $manifeste = $escale->manifeste;

        abort_if($manifeste === null, 404);
        abort_unless($manifeste->modifiable(), 403);

        return $manifeste;
    }

    /** Le dossier ne doit pas déjà porter un manifeste : il n'en a qu'un (ADR-0008). */
    protected function assureAucunManifeste(Escale $escale): void
    {
        abort_unless($escale->manifeste === null, 409);
    }
}
