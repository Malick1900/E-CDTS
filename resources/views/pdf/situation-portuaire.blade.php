{{--
    Situation portuaire — document PDF.

    Écrit pour dompdf, qui ne connaît ni flexbox ni grid : tout est en tableau
    et en styles simples. Les aplats sombres de l'écran deviennent des gris
    clairs — un en-tête bleu nuit sur toute la largeur vide une cartouche
    d'imprimante sans rien apporter à la lecture.
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Situation portuaire — {{ $port->name }}</title>
    <style>
        @page { margin: 14mm 10mm 16mm; }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 8pt;
            color: #1A1F2E;
            margin: 0;
        }

        .entete { border-bottom: 2px solid #1D3E9C; padding-bottom: 6px; margin-bottom: 10px; }
        .entete h1 { font-size: 14pt; color: #142C73; margin: 0 0 2px; }
        .entete .institution { font-size: 7.5pt; color: #5A6478; margin: 0 0 4px; }
        .entete .periode { font-size: 9pt; font-weight: bold; color: #1D3E9C; margin: 0; }
        .entete .edition { font-size: 7pt; color: #8A93A6; margin: 2px 0 0; }

        table.mouvements { width: 100%; border-collapse: collapse; }

        table.mouvements th {
            background: #EEF1F7;
            color: #142C73;
            font-size: 6.8pt;
            text-transform: uppercase;
            letter-spacing: .04em;
            text-align: left;
            padding: 5px 4px;
            border-bottom: 1.5px solid #1D3E9C;
        }

        table.mouvements td {
            padding: 4px;
            border-bottom: .5px solid #E7EBF2;
            vertical-align: top;
        }

        table.mouvements tr.paire td { background: #FAFBFD; }

        .navire { font-weight: bold; }
        .chiffre { white-space: nowrap; }
        .vide { color: #B4BCC9; }

        .pied {
            margin-top: 10px;
            padding-top: 6px;
            border-top: .5px solid #D8DEE9;
            font-size: 7pt;
            color: #5A6478;
        }

        .aucune { padding: 24px; text-align: center; color: #5A6478; font-size: 9pt; }
    </style>
</head>
<body>
    <div class="entete">
        <p class="institution">République gabonaise — Conseil Gabonais des Chargeurs</p>
        <h1>Situation portuaire — {{ $port->name }}</h1>
        <p class="periode">
            Période du {{ $du->format('d/m/Y') }} au {{ $au->format('d/m/Y') }}
        </p>
        <p class="edition">
            Éditée le {{ $edite->format('d/m/Y') }} à {{ $edite->format('H\hi') }} ·
            {{ $mouvements->count() }} navire{{ $mouvements->count() > 1 ? 's' : '' }}
        </p>
    </div>

    @if ($mouvements->isEmpty())
        <p class="aucune">Aucun mouvement de navire sur cette période.</p>
    @else
        <table class="mouvements">
            <thead>
                <tr>
                    <th style="width: 14%">Navire</th>
                    <th style="width: 5%">Type</th>
                    <th style="width: 6%">Sens</th>
                    <th style="width: 13%">Statut</th>
                    <th style="width: 9%">Poste à quai</th>
                    <th style="width: 10%">ETA</th>
                    <th style="width: 10%">ETD</th>
                    <th style="width: 7%">N° voyage</th>
                    <th style="width: 12%">Consignataire</th>
                    <th style="width: 7%">Pavillon</th>
                    <th style="width: 12%">Armateur</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($mouvements as $i => $m)
                    <tr @class(['paire' => $i % 2 === 1])>
                        <td class="navire">{{ $m->navire->name }}</td>
                        <td>{{ $m->navire->typeNavire?->code ?? '—' }}</td>
                        <td>{{ $m->sens->label() }}</td>
                        <td>{{ $statuts[$m->statut->value] }}</td>
                        <td @class(['vide' => $m->posteQuai === null])>{{ $m->posteQuai?->code ?? '—' }}</td>
                        <td class="chiffre @if ($m->eta === null) vide @endif">
                            {{ $m->eta?->format('d/m/Y H:i') ?? '—' }}
                        </td>
                        <td class="chiffre @if ($m->etd === null) vide @endif">
                            {{ $m->etd?->format('d/m/Y H:i') ?? '—' }}
                        </td>
                        <td class="chiffre">{{ $m->voyage }}</td>
                        <td @class(['vide' => $m->consignataire === null])>{{ $m->consignataire?->name ?? '—' }}</td>
                        <td @class(['vide' => $m->navire->pays === null])>{{ $m->navire->pays?->name ?? '—' }}</td>
                        <td @class(['vide' => $m->navire->armement === null])>{{ $m->navire->armement?->name ?? '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="pied">
        Document édité depuis e-CDTS — plateforme officielle de liquidation des droits de trafic
        sectoriels. Les escales retenues sont celles qui touchent la période, y compris commencées
        avant ou non encore achevées.
    </div>
</body>
</html>
