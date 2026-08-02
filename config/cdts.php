<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Taux de conversion franc CFA → euro
    |--------------------------------------------------------------------------
    |
    | La parité XAF/EUR est fixe : 1 € = 655,96 FCFA. C'est donc une constante
    | et non un référentiel — elle ne se saisit nulle part et n'apparaît sur
    | aucun écran. Le barème est tenu en francs ; l'euro en est la lecture.
    |
    | Déclarée ici plutôt qu'en dur dans un modèle pour n'avoir qu'un seul
    | endroit à corriger si la parité était un jour redéfinie par traité.
    |
    */

    'taux_euro_cfa' => 655.96,

];
