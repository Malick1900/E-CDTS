import { Form, Head } from '@inertiajs/react';
import {
    Anchor,
    FileText,
    Lock,
    ReceiptText,
    ShieldCheck,
} from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

const atouts = [
    {
        icon: FileText,
        texte: 'Dépôt du manifeste, dépouillement et PV de réconciliation en ligne',
    },
    {
        icon: ReceiptText,
        texte: 'Devis liquidé automatiquement, facture officielle rattachée au dossier',
    },
    {
        icon: ShieldCheck,
        texte: 'Traçabilité intégrale : chaque action horodatée, aucune pièce supprimée',
    },
];

export default function Login({ status, canResetPassword }: Props) {
    return (
        <div
            className="flex min-h-svh flex-col bg-[#F5F7FA] text-[#1A1F2E]"
            style={{
                fontFamily:
                    "'Public Sans', ui-sans-serif, system-ui, sans-serif",
            }}
        >
            <Head title="Connexion" />

            {/* Bandeau institutionnel */}
            <div className="flex items-center justify-between gap-4 bg-[#142C73] px-6 py-2.5 text-xs text-[#8FA3D9]">
                <div className="flex items-center gap-2.5">
                    <span
                        aria-hidden
                        className="flex h-3.5 w-5 overflow-hidden rounded-[2px] ring-1 ring-white/25"
                    >
                        <span className="flex-1 bg-[#009E60]" />
                        <span className="flex-1 bg-[#FCD116]" />
                        <span className="flex-1 bg-[#3A75C4]" />
                    </span>
                    <span className="font-semibold tracking-wide text-[#E8EDFA]">
                        RÉPUBLIQUE GABONAISE
                    </span>
                    <span className="hidden sm:inline">
                        — Ministère des Transports, de la Marine Marchande
                        chargé de la Logistique
                    </span>
                </div>
                <span className="hidden text-right lg:inline">
                    Plateforme officielle de liquidation des droits de trafic
                    sectoriels
                </span>
            </div>

            {/* Corps : deux panneaux */}
            <div className="grid flex-1 lg:grid-cols-[1.05fr_560px]">
                {/* Panneau gauche — argumentaire institutionnel */}
                <section className="relative hidden flex-col justify-between overflow-hidden bg-[#142C73] px-12 pt-11 text-white lg:flex">
                    {/* cercles décoratifs discrets */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -top-24 -right-28 h-[420px] w-[420px] rounded-full bg-[#1B3888]/55"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute bottom-28 -left-32 h-[300px] w-[300px] rounded-full bg-[#0F2360]/50"
                    />

                    <div className="relative z-10 flex max-w-[520px] flex-col gap-[34px]">
                        <div className="flex items-center gap-3.5">
                            <img
                                src="/images/logo-cgc.webp"
                                alt="Logo du Conseil Gabonais des Chargeurs"
                                className="h-[58px] w-[58px] rounded-full object-cover shadow-md"
                            />
                            <div className="flex flex-col gap-[3px]">
                                <div className="text-[27px] leading-none font-extrabold tracking-[-0.015em]">
                                    e-CDTS
                                </div>
                                <div className="text-[10.5px] font-semibold tracking-[0.1em] text-[#8FA3D9] uppercase">
                                    Conseil Gabonais des Chargeurs
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3.5">
                            <h1 className="text-[33px] leading-[1.2] font-extrabold tracking-[-0.02em]">
                                Liquidation dématérialisée des droits de trafic
                                sectoriels
                            </h1>
                            <p className="max-w-[470px] text-[15px] leading-[1.6] text-[#B9C7EB]">
                                Du manifeste au recouvrement : un circuit
                                unique, traçable et partagé entre consignataires
                                et agents du CGC.
                            </p>
                        </div>

                        <ul className="flex flex-col gap-[13px] pt-0.5">
                            {atouts.map(({ icon: Icon, texte }) => (
                                <li
                                    key={texte}
                                    className="flex items-start gap-3"
                                >
                                    <span className="mt-px flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-[#7EC8F0]/15 ring-1 ring-[#7EC8F0]/30">
                                        <Icon className="size-3.5 text-[#7EC8F0]" />
                                    </span>
                                    <span className="text-[13.5px] leading-[1.5] text-[#D5DFF5]">
                                        {texte}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-wrap items-center justify-between gap-6 pb-5">
                            <div className="flex flex-col gap-px">
                                <div className="text-[19px] leading-[1.1] font-extrabold tabular-nums">
                                    24 heures sur 24, 7 jours sur 7
                                </div>
                                <div className="text-[11px] text-[#8FA3D9]">
                                    Dépôt des dossiers d'escale
                                </div>
                            </div>
                            {/* Lien public — écran « situation portuaire » à venir */}
                            <a
                                href="#"
                                className="inline-flex items-center gap-2 rounded-lg border border-[#7EC8F0]/40 bg-[#7EC8F0]/10 px-4 py-2.5 text-sm font-semibold text-[#D5DFF5] transition hover:border-[#7EC8F0]/70 hover:bg-[#7EC8F0]/20 hover:text-white"
                            >
                                <Anchor className="size-4" />
                                Voir la situation portuaire
                            </a>
                        </div>

                        {/* Onde CGC — motif officiel repris de l'interface d'administration */}
                        <div
                            aria-hidden
                            className="pointer-events-none h-11"
                            style={{
                                backgroundImage:
                                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='9' viewBox='0 0 72 9'%3E%3Cpath d='M0 4.5 Q9 0.5 18 4.5 T36 4.5 T54 4.5 T72 4.5' fill='none' stroke='%237EC8F0' stroke-opacity='0.45' stroke-width='1.4'/%3E%3C/svg%3E\")",
                                backgroundRepeat: 'repeat-x',
                                backgroundPosition: 'bottom 14px left 0',
                            }}
                        />
                    </div>
                </section>

                {/* Panneau droit — formulaire */}
                <section className="flex items-center justify-center p-6 md:p-14">
                    <div className="w-full max-w-[404px]">
                        {/* En-tête logo (mobile uniquement) */}
                        <div className="mb-8 flex items-center gap-3 lg:hidden">
                            <img
                                src="/images/logo-cgc.webp"
                                alt="Logo du Conseil Gabonais des Chargeurs"
                                className="h-11 w-11 rounded-full object-cover shadow-sm"
                            />
                            <span className="text-xl font-bold text-[#142C73]">
                                e-CDTS
                            </span>
                        </div>

                        <h2 className="text-2xl font-bold text-[#1A1F2E]">
                            Connexion à votre espace
                        </h2>
                        <p className="mt-2 text-sm text-[#5B6472]">
                            Accès réservé aux consignataires agréés et aux
                            agents habilités du CGC.
                        </p>

                        {status && (
                            <div className="mt-4 rounded-md bg-[#E7F5E7] px-3 py-2 text-sm font-medium text-[#2F9E2F]">
                                {status}
                            </div>
                        )}

                        <Form
                            {...store.form()}
                            resetOnSuccess={['password']}
                            className="mt-8 flex flex-col gap-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="email"
                                            className="text-[#3A4356]"
                                        >
                                            Identifiant professionnel
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="username"
                                            placeholder="prenom.nom@organisation.ga"
                                            className="h-11 border-[#D8DEE9] bg-white focus-visible:!border-[#1D3E9C] focus-visible:!ring-[#1D3E9C]/30"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="text-[#3A4356]"
                                        >
                                            Mot de passe
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            required
                                            tabIndex={2}
                                            autoComplete="current-password"
                                            placeholder="••••••••••"
                                            className="h-11 border-[#D8DEE9] bg-white focus-visible:!border-[#1D3E9C] focus-visible:!ring-[#1D3E9C]/30"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2.5 text-sm text-[#3A4356]">
                                            <Checkbox
                                                id="remember"
                                                name="remember"
                                                tabIndex={3}
                                            />
                                            Rester connecté
                                        </label>
                                        {canResetPassword && (
                                            <TextLink
                                                href={request()}
                                                tabIndex={5}
                                                className="text-sm font-medium text-[#1D3E9C]"
                                            >
                                                Mot de passe oublié ?
                                            </TextLink>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        tabIndex={4}
                                        disabled={processing}
                                        data-test="login-button"
                                        className="h-11 w-full bg-[#1D3E9C] text-base font-semibold text-white hover:bg-[#142C73]"
                                    >
                                        {processing && <Spinner />}
                                        Se connecter
                                    </Button>
                                </>
                            )}
                        </Form>

                        {/* Encart sécurité */}
                        <div className="mt-8 flex items-start gap-2.5 rounded-lg border border-[#E2E7F0] bg-[#EEF1F7] px-4 py-3 text-xs leading-relaxed text-[#5A6478]">
                            <Lock className="mt-0.5 size-4 shrink-0 text-[#5A6478]" />
                            <span>
                                Connexion chiffrée. Toute tentative d'accès est
                                journalisée. L'usage des identifiants engage la
                                responsabilité de leur titulaire.
                            </span>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E7F0] pt-4 text-xs text-[#8A93A6]">
                            <span>
                                Besoin d'un compte ?{' '}
                                <a
                                    href="#"
                                    className="font-semibold text-[#1D3E9C] hover:underline"
                                >
                                    Contacter le CGC
                                </a>
                            </span>
                            <span className="tabular-nums text-[#A6AFC0]">
                                e-CDTS v1.4
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
