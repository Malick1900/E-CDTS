<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TypeNavire;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Page hôte du module Référentiels (données maîtres du CGC). L'accès est réservé
 * par le middleware de route (`can:referentiels.gerer`, ADR-0015).
 *
 * Câblage progressif, onglet par onglet : seuls les référentiels déjà branchés
 * au backend sont passés en props ; les autres restent alimentés côté front en
 * attendant leur tranche (Phase 3).
 */
class ReferentielController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/referentiels', [
            'typesNavire' => TypeNavire::query()
                ->withCount('navires')
                ->orderBy('name')
                ->get()
                ->map(fn (TypeNavire $type): array => [
                    'id' => $type->id,
                    'code' => $type->code,
                    'name' => $type->name,
                    'actif' => $type->actif,
                    'navires_count' => $type->navires_count,
                ]),
        ]);
    }
}
