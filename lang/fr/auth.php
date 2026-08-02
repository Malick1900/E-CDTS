<?php

/*
 * Messages d'échec d'authentification.
 *
 * « failed » reste volontairement vague — elle ne dit pas si c'est l'adresse ou
 * le mot de passe qui est faux. Distinguer les deux confirmerait à un inconnu
 * qu'un compte existe à cette adresse, et les adresses des agents habilités
 * suivent un format devinable.
 */

return [

    'failed' => 'Ces identifiants ne correspondent à aucun compte.',
    'password' => 'Le mot de passe saisi est incorrect.',
    'throttle' => 'Trop de tentatives de connexion. Réessayez dans :seconds secondes.',

];
