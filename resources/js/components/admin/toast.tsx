import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FlashToast } from '@/types/global';

/**
 * Confirmation des écritures. La source est le flash serveur (`Inertia::flash`)
 * : le toast suit donc ce qui a RÉELLEMENT été enregistré, et non ce que le
 * front croit avoir envoyé.
 */
export default function Toast() {
    const flash = usePage().props.flash?.toast;

    // Le toast visible se DÉRIVE du flash : il s'affiche dès la réponse, sans
    // rendu intermédiaire. L'état ne mémorise que le flash déjà expiré, et il
    // n'est écrit que depuis le minuteur — jamais pendant le rendu ni dans le
    // corps de l'effet.
    const [expire, setExpire] = useState<FlashToast | null>(null);

    useEffect(() => {
        if (!flash) {
            return;
        }

        const id = setTimeout(() => setExpire(flash), 2800);

        return () => clearTimeout(id);
    }, [flash]);

    const toast = flash && flash !== expire ? flash : null;

    if (!toast) {
        return null;
    }

    const erreur = toast.type === 'error';

    return (
        <div
            role="status"
            aria-live="polite"
            style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', zIndex: 70, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '11px 18px', borderRadius: 9, background: erreur ? '#8E2A1E' : '#142C73', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 10px 30px rgba(20,44,115,.35)', animation: 'ecdtsToast .22s ease' }}
        >
            <span style={{ display: 'inline-flex', width: 18, height: 18, borderRadius: '50%', background: erreur ? '#E4735F' : '#009E60', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.2l2.3 2.3L9.5 3.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
            {toast.message}
        </div>
    );
}
