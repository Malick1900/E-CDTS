<?php

namespace App\Http\Controllers;

use App\Enums\StatutNavire;
use App\Models\MouvementNavire;
use App\Models\Port;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/**
 * Export PDF du tableau de la situation portuaire, sur une période choisie.
 *
 * La période n'est pas un confort : une situation portuaire vit indéfiniment
 * (une ligne naît à l'annonce du navire et ne s'efface jamais), donc exporter
 * « tout » ne veut rien dire. On exporte une fenêtre de temps, et le document
 * la porte en tête — c'est ce qui le rend opposable.
 *
 * Le PDF reprend le tableau de l'écran, pas la vue publique : mêmes colonnes,
 * même ordre, sans la frise d'escale qui ne dit rien à qui lit sur papier.
 */
class SituationPortuaireExportController extends Controller
{
    public function pdf(Request $request, Port $port): Response
    {
        $valide = $request->validate([
            'du' => ['required', 'date'],
            'au' => ['required', 'date', 'after_or_equal:du'],
        ]);

        $du = Carbon::parse($valide['du'])->startOfDay();
        $au = Carbon::parse($valide['au'])->endOfDay();

        $mouvements = MouvementNavire::query()
            ->with(['navire.typeNavire', 'navire.pays', 'navire.armement', 'posteQuai', 'consignataire'])
            ->where('port_id', $port->id)
            ->dansLaPeriode($du, $au)
            ->get()
            ->sortBy(MouvementNavire::ordreDeLaSituation())
            ->values();

        $pdf = Pdf::loadView('pdf.situation-portuaire', [
            'port' => $port,
            'du' => $du,
            'au' => $au,
            'mouvements' => $mouvements,
            'edite' => now(),
            'statuts' => collect(StatutNavire::cases())->mapWithKeys(
                static fn (StatutNavire $s): array => [$s->value => $s->label()],
            ),
        ])->setPaper('a4', 'landscape');

        $nom = sprintf(
            'situation-portuaire-%s-%s-%s.pdf',
            str($port->name)->slug(),
            $du->format('Y-m-d'),
            $au->format('Y-m-d'),
        );

        return $pdf->download($nom);
    }
}
