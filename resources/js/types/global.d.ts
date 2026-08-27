import type { Auth } from '@/types/auth';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

/**
 * Notification à usage unique poussée par le serveur via `Inertia::flash()`.
 * Elle n'est pas conservée dans l'historique du navigateur : elle vaut pour la
 * réponse en cours, puis disparaît.
 */
export type FlashToast = {
    type: 'success' | 'error' | 'info';
    message: string;
};

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        /*
         * Le flash n'est PAS une prop de page : Inertia le dépose à la racine
         * de l'objet page, à côté de `props`, et l'expose par `usePage().flash`.
         * Le déclarer dans `sharedPageProps` rendait `props.flash` toujours
         * indéfini — et tous les toasts muets.
         */
        flashDataType: {
            /** Absent tant qu'aucun contrôleur n'a appelé `Inertia::flash()`. */
            toast?: FlashToast;
        };
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
