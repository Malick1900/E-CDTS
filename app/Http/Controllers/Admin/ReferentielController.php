<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Armement;
use App\Models\Navire;
use App\Models\Pays;
use App\Models\Port;
use App\Models\TypeNavire;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Page hôte du module Référentiels (données maîtres du CGC). L'accès est réservé
 * par le middleware de route (`can:referentiels.gerer`, ADR-0015).
 *
 * Les cinq référentiels sont servis en entier : ce sont des volumes de données
 * maîtres (quelques centaines de lignes au plus), la pagination et la recherche
 * vivent donc côté client — pas de `paginate()` ici (ADR-0017 amendé).
 *
 * Chaque référentiel est projeté par une méthode dédiée. Les clés exposées sont
 * celles que le formulaire renvoie (`*_id`) plus le libellé résolu pour
 * l'affichage : le front n'a jamais à recroiser les listes lui-même.
 */
class ReferentielController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/referentiels', [
            'typesNavire' => $this->typesNavire(),
            'pays' => $this->pays(),
            'ports' => $this->ports(),
            'armements' => $this->armements(),
            'navires' => $this->navires(),
        ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function typesNavire(): Collection
    {
        return TypeNavire::query()
            ->withCount('navires')
            ->orderBy('name')
            ->get()
            ->map(fn (TypeNavire $type): array => [
                'id' => $type->id,
                'code' => $type->code,
                'name' => $type->name,
                'actif' => $type->actif,
                'navires_count' => $type->navires_count,
            ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function pays(): Collection
    {
        return Pays::query()
            ->withCount(['navires', 'ports'])
            ->orderBy('name')
            ->get()
            ->map(fn (Pays $pays): array => [
                'id' => $pays->id,
                'code' => $pays->code,
                'name' => $pays->name,
                'actif' => $pays->actif,
                'navires_count' => $pays->navires_count,
                'ports_count' => $pays->ports_count,
            ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function ports(): Collection
    {
        return Port::query()
            ->with('pays:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Port $port): array => [
                'id' => $port->id,
                'code' => $port->code,
                'name' => $port->name,
                'pays_id' => $port->pays_id,
                'pays_name' => $port->pays?->name,
                'prefixe_numerotation' => $port->prefixe_numerotation,
                'actif' => $port->actif,
            ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function armements(): Collection
    {
        return Armement::query()
            ->with(['paysOrigine:id,name', 'paysImmatriculation:id,name'])
            ->withCount('navires')
            ->orderBy('name')
            ->get()
            ->map(fn (Armement $armement): array => [
                'id' => $armement->id,
                'name' => $armement->name,
                'sigle' => $armement->sigle,
                'pays_origine_id' => $armement->pays_origine_id,
                'pays_origine_name' => $armement->paysOrigine?->name,
                'pays_immatriculation_id' => $armement->pays_immatriculation_id,
                'pays_immatriculation_name' => $armement->paysImmatriculation?->name,
                'gerant' => $armement->gerant,
                'rccm_nif' => $armement->rccm_nif,
                'adresse' => $armement->adresse,
                'actif' => $armement->actif,
                'navires_count' => $armement->navires_count,
            ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function navires(): Collection
    {
        return Navire::query()
            ->with(['typeNavire:id,code,name', 'armement:id,name', 'pays:id,name'])
            ->orderBy('name')
            ->get()
            ->map(fn (Navire $navire): array => [
                'id' => $navire->id,
                'name' => $navire->name,
                'imo' => $navire->imo,
                'type_navire_id' => $navire->type_navire_id,
                'type_navire_code' => $navire->typeNavire?->code,
                'type_navire_name' => $navire->typeNavire?->name,
                'armement_id' => $navire->armement_id,
                'armement_name' => $navire->armement?->name,
                'pays_id' => $navire->pays_id,
                'pays_name' => $navire->pays?->name,
                'mode_exploitation_defaut' => $navire->mode_exploitation_defaut?->value,
                'actif' => $navire->actif,
            ]);
    }
}
