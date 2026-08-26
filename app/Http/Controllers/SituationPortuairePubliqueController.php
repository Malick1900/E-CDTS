<?php

namespace App\Http\Controllers;

use App\Enums\StatutNavire;
use App\Models\MouvementNavire;
use App\Models\Port;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * La situation portuaire vue du dehors — sans connexion (ADR-0011).
 *
 * C'est le même tableau, amputé de tout ce qui engage : ni édition, ni
 * publication, ni compte. Deux garde-fous en découlent :
 *
 * 1. seules les lignes PUBLIÉES sortent — un brouillon de conférence n'a rien
 *    à faire dehors tant qu'un supérieur ne l'a pas validé (ADR-0013) ;
 * 2. rien de nominatif au-delà de ce que le document papier porte déjà.
 *
 * Elle sert aussi de version imprimable : c'est ce que l'agent CGC envoie à la
 * Capitainerie et à l'OPRAG, qui n'ont pas de compte e-CDTS (ADR-0005).
 */
class SituationPortuairePubliqueController extends Controller
{
    public function index(Request $request): Response
    {
        $ports = Port::query()->where('actif', true)->orderBy('name')->get();
        $code = $request->string('port')->toString();
        $port = ($code !== '' ? $ports->firstWhere('code', $code) : null) ?? $ports->first();

        // Aucun port actif : rien à publier, et surtout rien à interroger.
        if ($port === null) {
            return Inertia::render('situation-portuaire-publique', [
                'ports' => [],
                'portCourant' => null,
                'mouvements' => [],
                'statuts' => $this->statuts(),
                'publieeLe' => null,
            ]);
        }

        $mouvements = MouvementNavire::query()
            ->with(['navire.typeNavire', 'navire.pays', 'navire.armement', 'posteQuai', 'consignataire'])
            ->publiee()
            ->where('port_id', $port->id)
            ->get()
            ->sortBy(MouvementNavire::ordreDeLaSituation())
            ->values();

        return Inertia::render('situation-portuaire-publique', [
            'ports' => $ports->map(fn (Port $p): array => [
                'id' => $p->id,
                'code' => $p->code,
                'label' => $p->name,
            ])->all(),
            'portCourant' => ['id' => $port->id, 'code' => $port->code, 'label' => $port->name],
            'mouvements' => $mouvements->map(fn (MouvementNavire $m): array => [
                'id' => $m->id,
                'navire' => $m->navire->name,
                // Facultatifs sur la fiche navire, à la différence du nom.
                'typeCode' => $m->navire->typeNavire?->code,
                'typeLabel' => $m->navire->typeNavire?->name,
                'pavillon' => $m->navire->pays?->name,
                'armateur' => $m->navire->armement?->name,
                'voyage' => $m->voyage,
                'sens' => $m->sens->value,
                'statut' => $m->statut->value,
                'poste' => $m->posteQuai?->code,
                'eta' => $m->eta?->format('Y-m-d\TH:i'),
                'etd' => $m->etd?->format('Y-m-d\TH:i'),
                'consignataire' => $m->consignataire?->name,
            ])->all(),
            'statuts' => $this->statuts(),
            // La date de la dernière publication : dehors, on doit savoir de
            // quand date ce qu'on lit.
            'publieeLe' => $mouvements->max('publiee_at')?->toIso8601String(),
        ]);
    }

    /**
     * @return array<int, array{value: string, label: string, abrege: string}>
     */
    private function statuts(): array
    {
        return array_map(static fn (StatutNavire $s): array => [
            'value' => $s->value,
            'label' => $s->label(),
            'abrege' => $s->abrege(),
        ], StatutNavire::cases());
    }
}
