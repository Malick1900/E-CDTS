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
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            /** Absent tant qu'aucun contrôleur n'a appelé `Inertia::flash()`. */
            flash?: { toast?: FlashToast };
            [key: string]: unknown;
        };
    }
}
