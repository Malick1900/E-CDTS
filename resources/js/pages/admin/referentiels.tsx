import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';

/*
 * Référentiels (master data — CGC seul en écriture). Reproduction fidèle de la
 * maquette Claude Design : sous-onglets Navires / Armements / Ports / Types,
 * recherche, tiroir de saisie, modale de confirmation et toast.
 *
 * ⚠️ Données factices pour le rendu visuel. Le câblage backend (routes, requêtes
 * Inertia, validation) viendra ensuite, écran par écran.
 */

type Ligne = 'reguliere' | 'tramping';
type PortStatut = 'actif' | 'inactif';

// Type de navire — câblé au backend (props Inertia, source de vérité serveur).
type TypeNavireRow = { id: number; code: string; name: string; actif: boolean; navires_count: number };
type Navire = { id: number; nom: string; typeCode: string; ligne: Ligne; armementId: number; imo: string };
type Consignataire = { name: string; ville: string; statutText: string };
type Armement = { id: number; code: string; name: string; pays: string; consignataires: Consignataire[]; nn: boolean };
type Port = { id: number; nom: string; locode: string; pays: string; statut: PortStatut };

type Props = { typesNavire: TypeNavireRow[] };

// ── Données factices (onglets pas encore câblés — Phase 3) ────────
const ARMEMENTS_INIT: Armement[] = [
    { id: 1, code: 'MSK', name: 'Maersk Line', pays: 'Danemark', nn: true, consignataires: [
        { name: 'SDV Bolloré Gabon', ville: 'Libreville', statutText: 'Actif' },
        { name: 'Necotrans Gabon', ville: 'Owendo', statutText: 'Actif' },
    ] },
    { id: 2, code: 'CMA', name: 'CMA CGM', pays: 'France', nn: true, consignataires: [
        { name: 'SDV Bolloré Gabon', ville: 'Libreville', statutText: 'Actif' },
        { name: 'OMA — Ocean Maritime Agencies', ville: 'Port-Gentil', statutText: 'Actif' },
    ] },
    { id: 3, code: 'MSC', name: 'Mediterranean Shipping Company', pays: 'Suisse', nn: false, consignataires: [
        { name: 'MSC Gabon', ville: 'Libreville', statutText: 'Actif' },
    ] },
    { id: 4, code: 'PIL', name: 'Pacific International Lines', pays: 'Singapour', nn: false, consignataires: [
        { name: 'Necotrans Gabon', ville: 'Owendo', statutText: 'Actif' },
    ] },
];

const NAVIRES_INIT: Navire[] = [
    { id: 1, nom: 'Maersk Cadiz', typeCode: 'PC', ligne: 'reguliere', armementId: 1, imo: '9525234' },
    { id: 2, nom: 'CMA CGM Congo', typeCode: 'PC', ligne: 'reguliere', armementId: 2, imo: '9764285' },
    { id: 3, nom: 'MSC Bilbao', typeCode: 'PC', ligne: 'reguliere', armementId: 3, imo: '9304596' },
    { id: 4, nom: 'Nordic Okume', typeCode: 'GRUM', ligne: 'tramping', armementId: 4, imo: '9412367' },
    { id: 5, nom: 'Pacific Ozouri', typeCode: 'GRUM', ligne: 'tramping', armementId: 4, imo: '9188025' },
    { id: 6, nom: 'Maersk Nuku', typeCode: 'RORO', ligne: 'reguliere', armementId: 1, imo: '9631401' },
    { id: 7, nom: 'Cap San Owendo', typeCode: 'FRIG', ligne: 'tramping', armementId: 2, imo: '9702631' },
];

const PORTS_INIT: Port[] = [
    { id: 1, nom: 'Owendo', locode: 'GA OWE', pays: 'Gabon', statut: 'actif' },
    { id: 2, nom: 'Port-Gentil', locode: 'GA POG', pays: 'Gabon', statut: 'actif' },
    { id: 3, nom: 'Libreville', locode: 'GA LBV', pays: 'Gabon', statut: 'inactif' },
];

// ── Styles partagés ───────────────────────────────────────────────
const thNavy: React.CSSProperties = {
    background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em',
    textTransform: 'uppercase', textAlign: 'left', padding: '9px 12px', borderBottom: '2px solid #142C73',
};
const card: React.CSSProperties = {
    background: '#fff', border: '1px solid #D8DEE9', borderRadius: 8, boxShadow: '0 1px 3px rgba(20,44,115,.06)', overflow: 'hidden',
};
const searchInput: React.CSSProperties = {
    width: 280, height: 34, border: '1px solid #D8DEE9', borderRadius: 6, padding: '0 12px 0 32px', fontSize: 13, color: '#1A1F2E', background: '#fff', outlineColor: '#1D3E9C',
};
const iconBtn: React.CSSProperties = {
    width: 30, height: 30, border: '1px solid #D8DEE9', borderRadius: 6, background: '#fff', color: '#1D3E9C', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};
const iconBtnDanger: React.CSSProperties = { ...iconBtn, border: '1px solid #E0B4AD', color: '#C0392B' };
const fieldLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#3A4356' };
const fieldInput: React.CSSProperties = { height: 36, border: '1px solid #D8DEE9', borderRadius: 6, padding: '0 10px', fontSize: 13, color: '#1A1F2E', outlineColor: '#1D3E9C', background: '#fff' };
const selectChevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233A4356' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\") no-repeat right 10px center";
const fieldSelect: React.CSSProperties = { ...fieldInput, background: `#fff ${selectChevron}`, appearance: 'none', WebkitAppearance: 'none', padding: '0 30px 0 10px' };

const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
        <circle cx="6" cy="6" r="4.6" stroke="#8A93A6" strokeWidth="1.5" />
        <path d="M9.5 9.5L13 13" stroke="#8A93A6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);
const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
);
const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function ligneBadge(ligne: Ligne) {
    const reg = ligne === 'reguliere';

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, borderRadius: 5, padding: '2px 9px',
            color: reg ? '#14509C' : '#B26200',
            background: reg ? '#E4F0FF' : '#FDF1E3',
            border: `1px solid ${reg ? '#B9D3F5' : '#F0CFA0'}`,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: reg ? '#1D3E9C' : '#E07B00', flex: 'none' }} />
            {reg ? 'Ligne régulière' : 'Tramping'}
        </span>
    );
}

function statutBadge(actif: boolean) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, borderRadius: 5, padding: '2px 9px',
            color: actif ? '#0A7D46' : '#8A93A6',
            background: actif ? '#E4F6EC' : '#F0F2F7',
            border: `1px solid ${actif ? '#BCE6CD' : '#D8DEE9'}`,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: actif ? '#009E60' : '#A6AFC0', flex: 'none' }} />
            {actif ? 'Actif' : 'Inactif'}
        </span>
    );
}

type ConfirmState = {
    title: string; body: string; label: string; statLabel?: string; statValue?: string; danger: boolean; onOk: () => void;
} | null;

type DrawerState =
    | { kind: 'navire'; mode: 'create' | 'edit'; id: number | null; nom: string; type: string; imo: string; ligne: Ligne; armementId: number }
    | { kind: 'port'; mode: 'create' | 'edit'; id: number | null; nom: string; locode: string; pays: string; statut: PortStatut }
    | { kind: 'type'; mode: 'edit'; id: number; code: string; name: string }
    | null;

export default function Referentiels({ typesNavire = [] }: Props) {
    const [tab, setTab] = useState<'navires' | 'armements' | 'ports' | 'types'>('navires');
    const [armements] = useState<Armement[]>(ARMEMENTS_INIT);
    const [navires, setNavires] = useState<Navire[]>(NAVIRES_INIT);
    const [ports, setPorts] = useState<Port[]>(PORTS_INIT);

    const [nSearch, setNSearch] = useState('');
    const [armSearch, setArmSearch] = useState('');
    const [portSearch, setPortSearch] = useState('');
    const [armDetailId, setArmDetailId] = useState<number | null>(null);
    const [newType, setNewType] = useState({ code: '', name: '' });
    const [typeErrors, setTypeErrors] = useState<Record<string, string>>({});
    const [drawerErrors, setDrawerErrors] = useState<Record<string, string>>({});

    const [drawer, setDrawer] = useState<DrawerState>(null);
    const [confirm, setConfirm] = useState<ConfirmState>(null);
    const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'info' } | null>(null);

    // Types actifs seulement pour la saisie des navires ; libellé depuis le back.
    const activeTypes = useMemo(() => typesNavire.filter((t) => t.actif), [typesNavire]);
    const typeLabel = (code: string) => typesNavire.find((t) => t.code === code)?.name ?? code;
    const armName = (id: number) => armements.find((a) => a.id === id)?.name ?? '—';

    // ── Type de navire : mutations Inertia (les toasts viennent du flash) ──
    const submitNewType = () => {
        router.post('/admin/referentiels/types-navire', newType, {
            preserveScroll: true, preserveState: true,
            onSuccess: () => {
 setNewType({ code: '', name: '' }); setTypeErrors({});
},
            onError: (e) => setTypeErrors(e as Record<string, string>),
        });
    };
    const openTypeEdit = (t: TypeNavireRow) => {
 setDrawerErrors({}); setDrawer({ kind: 'type', mode: 'edit', id: t.id, code: t.code, name: t.name });
};
    const askToggleType = (t: TypeNavireRow) => {
        const next = !t.actif;
        setConfirm({
            title: next ? 'Réactiver ce type ?' : 'Désactiver ce type ?',
            body: next ? 'Le type redeviendra sélectionnable à la saisie des navires.' : 'Un type inactif n’est plus proposé à la saisie des navires. Les navires déjà rattachés ne sont pas affectés.',
            label: next ? 'Réactiver' : 'Désactiver', danger: !next, statLabel: 'Type', statValue: `${t.code} — ${t.name}`,
            onOk: () => {
 setConfirm(null); router.patch(`/admin/referentiels/types-navire/${t.id}/activation`, {}, { preserveScroll: true, preserveState: true });
},
        });
    };

    const fireToast = (msg: string, kind: 'ok' | 'info' = 'ok') => setToast({ msg, kind });

    useEffect(() => {
        if (!toast) {
return;
}

        const id = setTimeout(() => setToast(null), 2600);

        return () => clearTimeout(id);
    }, [toast]);

    // ── Filtres ──
    const navRows = useMemo(() => {
        const q = nSearch.trim().toLowerCase();

        const nameOf = (id: number) => armements.find((a) => a.id === id)?.name ?? '';

        return navires.filter((n) => !q || n.nom.toLowerCase().includes(q) || n.imo.includes(q) || nameOf(n.armementId).toLowerCase().includes(q));
    }, [armements, navires, nSearch]);
    const armRows = useMemo(() => {
        const q = armSearch.trim().toLowerCase();

        return armements.filter((a) => !q || a.name.toLowerCase().includes(q) || a.pays.toLowerCase().includes(q));
    }, [armements, armSearch]);
    const portRows = useMemo(() => {
        const q = portSearch.trim().toLowerCase();

        return ports.filter((p) => !q || p.nom.toLowerCase().includes(q) || p.locode.toLowerCase().includes(q));
    }, [ports, portSearch]);

    const armNavCount = (id: number) => navires.filter((n) => n.armementId === id).length;

    // ── Ouverture du tiroir ──
    const openNavireCreate = () => setDrawer({ kind: 'navire', mode: 'create', id: null, nom: '', type: activeTypes[0]?.code ?? '', imo: '', ligne: 'reguliere', armementId: armements[0]?.id ?? 0 });
    const openNavireEdit = (n: Navire) => setDrawer({ kind: 'navire', mode: 'edit', id: n.id, nom: n.nom, type: n.typeCode, imo: n.imo, ligne: n.ligne, armementId: n.armementId });
    const openPortCreate = () => setDrawer({ kind: 'port', mode: 'create', id: null, nom: '', locode: '', pays: 'Gabon', statut: 'actif' });
    const openPortEdit = (p: Port) => setDrawer({ kind: 'port', mode: 'edit', id: p.id, nom: p.nom, locode: p.locode, pays: p.pays, statut: p.statut });

    const drawerValid = !drawer
        ? false
        : drawer.kind === 'navire'
            ? drawer.nom.trim() !== '' && drawer.type !== '' && drawer.armementId > 0
            : drawer.kind === 'port'
                ? drawer.nom.trim() !== '' && drawer.locode.trim() !== ''
                : drawer.code.trim() !== '' && drawer.name.trim() !== '';

    const saveDrawer = () => {
        if (!drawer || !drawerValid) {
return;
}

        if (drawer.kind === 'type') {
            router.patch(`/admin/referentiels/types-navire/${drawer.id}`, { code: drawer.code, name: drawer.name }, {
                preserveScroll: true, preserveState: true,
                onSuccess: () => setDrawer(null),
                onError: (e) => setDrawerErrors(e as Record<string, string>),
            });

            return;
        }

        if (drawer.kind === 'navire') {
            if (drawer.mode === 'create') {
                setNavires((prev) => [...prev, { id: Math.max(0, ...prev.map((n) => n.id)) + 1, nom: drawer.nom.trim(), typeCode: drawer.type, ligne: drawer.ligne, armementId: drawer.armementId, imo: drawer.imo.trim() }]);
                fireToast('Navire ajouté au référentiel.');
            } else {
                setNavires((prev) => prev.map((n) => (n.id === drawer.id ? { ...n, nom: drawer.nom.trim(), typeCode: drawer.type, ligne: drawer.ligne, armementId: drawer.armementId, imo: drawer.imo.trim() } : n)));
                fireToast('Navire mis à jour.');
            }
        } else {
            if (drawer.mode === 'create') {
                setPorts((prev) => [...prev, { id: Math.max(0, ...prev.map((p) => p.id)) + 1, nom: drawer.nom.trim(), locode: drawer.locode.trim().toUpperCase(), pays: drawer.pays.trim() || 'Gabon', statut: drawer.statut }]);
                fireToast('Port ajouté au référentiel.');
            } else {
                setPorts((prev) => prev.map((p) => (p.id === drawer.id ? { ...p, nom: drawer.nom.trim(), locode: drawer.locode.trim().toUpperCase(), pays: drawer.pays.trim() || 'Gabon', statut: drawer.statut } : p)));
                fireToast('Port mis à jour.');
            }
        }

        setDrawer(null);
    };

    // ── Suppressions / bascules ──
    const askDeleteNavire = (n: Navire) => setConfirm({
        title: 'Supprimer ce navire ?', body: 'Le navire sera retiré du référentiel. Les dossiers déjà liquidés ne sont pas affectés.',
        label: 'Supprimer', danger: true, statLabel: 'Navire', statValue: n.nom,
        onOk: () => {
 setNavires((prev) => prev.filter((x) => x.id !== n.id)); setConfirm(null); fireToast('Navire supprimé.', 'info'); 
},
    });
    const askTogglePort = (p: Port) => {
        const next: PortStatut = p.statut === 'actif' ? 'inactif' : 'actif';
        setConfirm({
            title: next === 'inactif' ? 'Désactiver ce port ?' : 'Réactiver ce port ?',
            body: next === 'inactif' ? 'Un port inactif n’est plus proposé à l’ouverture des dossiers d’escale.' : 'Le port redeviendra sélectionnable pour les nouvelles escales.',
            label: next === 'inactif' ? 'Désactiver' : 'Réactiver', danger: next === 'inactif', statLabel: 'Port', statValue: `${p.nom} · ${p.locode}`,
            onOk: () => {
 setPorts((prev) => prev.map((x) => (x.id === p.id ? { ...x, statut: next } : x))); setConfirm(null); fireToast(next === 'inactif' ? 'Port désactivé.' : 'Port réactivé.'); 
},
        });
    };

    // ── Onglets + action principale de l'en-tête ──
    const tabs = [
        { key: 'navires', label: 'Navires', badge: navires.length },
        { key: 'armements', label: 'Armements', badge: armements.length },
        { key: 'ports', label: 'Ports', badge: ports.length },
        { key: 'types', label: 'Types de navire', badge: typesNavire.length },
    ];
    const detailArm = armDetailId != null ? armements.find((a) => a.id === armDetailId) ?? null : null;
    const primary =
        tab === 'navires' ? { label: 'Nouveau navire', onClick: openNavireCreate }
        : tab === 'ports' ? { label: 'Nouveau port', onClick: openPortCreate }
        : undefined;

    return (
        <>
            <Head title="Référentiels — Administration" />
            <AdminShell
                module="ref"
                title="Référentiels"
                subtitle="Données maîtres du CGC (écriture réservée) — navires, armements, ports et types de navire."
                crumbSub={detailArm ? detailArm.name : undefined}
                primary={detailArm ? undefined : primary}
                tabs={tabs}
                activeTab={tab}
                onTab={(k) => {
 setArmDetailId(null); setTab(k as typeof tab); 
}}
            >
                {/* ── Navires ── */}
                {tab === 'navires' && (
                    <div style={{ padding: '18px 26px 26px' }}>
                        <div style={card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E7EBF2', background: '#FBFCFE', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 'none' }}>
                                    <SearchIcon />
                                    <input type="text" value={nSearch} onChange={(e) => setNSearch(e.target.value)} placeholder="Rechercher un navire, un n° IMO…" style={searchInput} />
                                </div>
                                <div style={{ flex: 1 }} />
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#5A6478' }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#7EC8F0', flex: 'none' }} />Type &amp; ligne : lus par le moteur de calcul</span>
                                <span style={{ fontSize: 12, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{navRows.length} navire{navRows.length > 1 ? 's' : ''}</span>
                            </div>
                            {navRows.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', minWidth: 940, borderCollapse: 'separate', borderSpacing: 0 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...thNavy, padding: '9px 16px' }}>Navire</th>
                                                <th style={{ ...thNavy, borderLeft: '3px solid #7EC8F0', width: 210 }}>Type</th>
                                                <th style={{ ...thNavy, width: 170 }}>Ligne / Tramping</th>
                                                <th style={thNavy}>Armement rattaché</th>
                                                <th style={{ ...thNavy, width: 130 }}>Code IMO</th>
                                                <th style={{ ...thNavy, textAlign: 'center', width: 104 }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {navRows.map((n) => (
                                                <tr key={n.id} className="ea-row">
                                                    <td style={{ padding: '9px 16px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                            <svg width="20" height="15" viewBox="0 0 30 22" fill="none" style={{ flex: 'none' }}><path d="M3 11h24l-3.4 6H6.4L3 11z" fill="#1D3E9C" /><rect x="12.2" y="4" width="4.6" height="6" fill="#7EC8F0" /><path d="M1 20c2 0 2-1.2 4-1.2s2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2" stroke="#7EC8F0" strokeWidth="1.4" strokeLinecap="round" fill="none" /></svg>
                                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1F2E' }}>{n.nom}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #E7EBF2', borderLeft: '3px solid #7EC8F0', background: '#FBFDFF', verticalAlign: 'middle' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#3A4356', background: '#EEF1F7', border: '1px solid #D8DEE9', borderRadius: 5, padding: '2px 7px' }}>{n.typeCode}</span>
                                                            <span style={{ fontSize: 12, color: '#5A6478' }}>{typeLabel(n.typeCode)}</span>
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>{ligneBadge(n.ligne)}</td>
                                                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#3A4356', verticalAlign: 'middle' }}>{armName(n.armementId)}</td>
                                                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#3A4356', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>{n.imo || '—'}</td>
                                                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                            <button onClick={() => openNavireEdit(n)} title="Modifier" className="ea-icon-btn" style={iconBtn}><EditIcon /></button>
                                                            <button onClick={() => askDeleteNavire(n)} title="Supprimer" className="ea-icon-danger" style={iconBtnDanger}><TrashIcon /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ padding: '44px 20px', textAlign: 'center', color: '#8A93A6', fontSize: 13 }}>Aucun navire ne correspond à la recherche.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Armements (liste) ── */}
                {tab === 'armements' && !detailArm && (
                    <div style={{ padding: '18px 26px 26px' }}>
                        <div style={card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E7EBF2', background: '#FBFCFE' }}>
                                <div style={{ position: 'relative', flex: 'none' }}>
                                    <SearchIcon />
                                    <input type="text" value={armSearch} onChange={(e) => setArmSearch(e.target.value)} placeholder="Rechercher un armement…" style={searchInput} />
                                </div>
                                <div style={{ flex: 1 }} />
                                <span style={{ fontSize: 12, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{armRows.length} armement{armRows.length > 1 ? 's' : ''}</span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', minWidth: 920, borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...thNavy, padding: '9px 16px' }}>Armement (compagnie maritime)</th>
                                            <th style={{ ...thNavy, width: 120 }}>Pays</th>
                                            <th style={thNavy}>Consignataires (N-N)</th>
                                            <th style={{ ...thNavy, width: 120 }}>Navires</th>
                                            <th style={{ ...thNavy, textAlign: 'center', width: 96 }}>Détail</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {armRows.map((a) => (
                                            <tr key={a.id} className="ea-row" onClick={() => setArmDetailId(a.id)} style={{ cursor: 'pointer' }}>
                                                <td style={{ padding: '10px 16px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                                        <div style={{ width: 32, height: 32, borderRadius: 7, background: '#EEF3FF', border: '1px solid #C3D0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#1D3E9C', flex: 'none' }}>{a.code}</div>
                                                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1A1F2E' }}>{a.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#3A4356', verticalAlign: 'middle' }}>{a.pays}</td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 340, alignItems: 'center' }}>
                                                        {a.consignataires.map((c) => (
                                                            <span key={c.name} style={{ fontSize: 11, fontWeight: 600, color: '#3A4356', background: '#EEF1F7', border: '1px solid #D8DEE9', borderRadius: 5, padding: '2px 8px' }}>{c.name}</span>
                                                        ))}
                                                        {a.nn && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: '#B26200', background: '#FDF1E3', border: '1px solid #F0CFA0', borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase' }}>Partagé</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#3A4356', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>{armNavCount(a.id)}</td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: '1px solid #D8DEE9', borderRadius: 6, background: '#fff', color: '#1D3E9C' }}>
                                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <p style={{ margin: '12px 2px 0', fontSize: 11.5, color: '#8A93A6', lineHeight: 1.5 }}>
                            Les armements portent l’identité société complète et sont créés depuis le module <strong style={{ fontWeight: 700, color: '#5A6478' }}>Utilisateurs &amp; habilitations</strong>. Ici, ils sont consultés en lecture avec leur relation N-N aux consignataires.
                        </p>
                    </div>
                )}

                {/* ── Armement (détail N-N) ── */}
                {tab === 'armements' && detailArm && (
                    <div style={{ padding: '16px 26px 28px', maxWidth: 1120 }}>
                        <button onClick={() => setArmDetailId(null)} className="ea-backbtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px 0 6px', border: '1px solid #D8DEE9', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
                            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M9.5 3.5L5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>Armements
                        </button>
                        <div style={{ ...card, padding: '18px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, overflow: 'visible' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 10, background: '#EEF3FF', border: '1px solid #C3D0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#1D3E9C', flex: 'none' }}>{detailArm.code}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#142C73', letterSpacing: '-.01em' }}>{detailArm.name}</h2>
                                <span style={{ fontSize: 12, color: '#5A6478' }}>Compagnie maritime · {detailArm.pays}</span>
                            </div>
                        </div>
                        <div style={{ ...card, marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: '1px solid #E7EBF2' }}>
                                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A1F2E' }}>Consignataires représentant cet armement</h3>
                                <span style={{ fontSize: 11.5, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{detailArm.consignataires.length}</span>
                                {detailArm.nn && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: '#B26200', background: '#FDF1E3', border: '1px solid #F0CFA0', borderRadius: 4, padding: '1px 7px', textTransform: 'uppercase' }}>Relation N-N</span>}
                            </div>
                            <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {detailArm.consignataires.map((c) => (
                                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1px solid #D8DEE9', borderRadius: 8, background: '#FBFCFE', minWidth: 230 }}>
                                        <div style={{ width: 30, height: 30, borderRadius: 7, background: '#E4F3FC', border: '1px solid #B5DFF7', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="4" y="8" width="16" height="12" rx="1.5" stroke="#14509C" strokeWidth="1.6" /><path d="M8 8V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V8" stroke="#14509C" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1A1F2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                                            <span style={{ fontSize: 11, color: '#8A93A6' }}>{c.ville} · {c.statutText}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: '0 18px 14px', fontSize: 11.5, color: '#8A93A6', lineHeight: 1.45 }}>Relation <strong style={{ fontWeight: 700, color: '#5A6478' }}>N-N</strong> : un même armement peut être représenté par plusieurs consignataires selon les lignes et les escales.</div>
                        </div>
                        <div style={card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: '1px solid #E7EBF2' }}>
                                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A1F2E' }}>Navires rattachés</h3>
                                <span style={{ fontSize: 11.5, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{armNavCount(detailArm.id)}</span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', minWidth: 660, borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ background: '#F0F3F9', color: '#3A4356', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'left', padding: '8px 18px', borderBottom: '1px solid #D8DEE9' }}>Navire</th>
                                            <th style={{ background: '#F0F3F9', color: '#3A4356', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #D8DEE9', width: 210 }}>Type</th>
                                            <th style={{ background: '#F0F3F9', color: '#3A4356', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #D8DEE9', width: 160 }}>Ligne / Tramping</th>
                                            <th style={{ background: '#F0F3F9', color: '#3A4356', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'left', padding: '8px 18px', borderBottom: '1px solid #D8DEE9', width: 130 }}>Code IMO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {navires.filter((n) => n.armementId === detailArm.id).map((n) => (
                                            <tr key={n.id}>
                                                <td style={{ padding: '9px 18px', borderBottom: '1px solid #E7EBF2', fontSize: 13, fontWeight: 700, color: '#1A1F2E', verticalAlign: 'middle' }}>{n.nom}</td>
                                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#3A4356', background: '#EEF1F7', border: '1px solid #D8DEE9', borderRadius: 5, padding: '2px 7px' }}>{n.typeCode}</span>
                                                        <span style={{ fontSize: 12, color: '#5A6478' }}>{typeLabel(n.typeCode)}</span>
                                                    </span>
                                                </td>
                                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>{ligneBadge(n.ligne)}</td>
                                                <td style={{ padding: '9px 18px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#3A4356', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>{n.imo || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Ports ── */}
                {tab === 'ports' && (
                    <div style={{ padding: '18px 26px 26px' }}>
                        <div style={card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E7EBF2', background: '#FBFCFE' }}>
                                <div style={{ position: 'relative', flex: 'none' }}>
                                    <SearchIcon />
                                    <input type="text" value={portSearch} onChange={(e) => setPortSearch(e.target.value)} placeholder="Rechercher un port, un code…" style={searchInput} />
                                </div>
                                <div style={{ flex: 1 }} />
                                <span style={{ fontSize: 12, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{portRows.length} port{portRows.length > 1 ? 's' : ''}</span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', minWidth: 720, borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...thNavy, padding: '9px 16px' }}>Port</th>
                                            <th style={{ ...thNavy, width: 170 }}>Code UN/LOCODE</th>
                                            <th style={{ ...thNavy, width: 150 }}>Pays</th>
                                            <th style={{ ...thNavy, width: 120 }}>Statut</th>
                                            <th style={{ ...thNavy, textAlign: 'center', width: 104 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {portRows.map((p) => (
                                            <tr key={p.id} className="ea-row">
                                                <td style={{ padding: '10px 16px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flex: 'none' }}><path d="M8 1.5c-2.4 0-4.3 1.9-4.3 4.2C3.7 9 8 14.3 8 14.3s4.3-5.3 4.3-8.6C12.3 3.4 10.4 1.5 8 1.5z" stroke="#1D3E9C" strokeWidth="1.3" /><circle cx="8" cy="5.7" r="1.7" stroke="#1D3E9C" strokeWidth="1.3" /></svg>
                                                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1A1F2E' }}>{p.nom}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, fontWeight: 600, color: '#1A1F2E', fontVariantNumeric: 'tabular-nums', letterSpacing: '.04em', verticalAlign: 'middle' }}>{p.locode}</td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#3A4356', verticalAlign: 'middle' }}>{p.pays}</td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, borderRadius: 5, padding: '2px 9px', color: p.statut === 'actif' ? '#0A7D46' : '#8A93A6', background: p.statut === 'actif' ? '#E4F6EC' : '#F0F2F7', border: `1px solid ${p.statut === 'actif' ? '#BCE6CD' : '#D8DEE9'}` }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.statut === 'actif' ? '#009E60' : '#A6AFC0', flex: 'none' }} />
                                                        {p.statut === 'actif' ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                        <button onClick={() => openPortEdit(p)} title="Modifier" className="ea-icon-btn" style={iconBtn}><EditIcon /></button>
                                                        <button onClick={() => askTogglePort(p)} title={p.statut === 'actif' ? 'Désactiver' : 'Réactiver'} className="ea-icon-btn" style={{ ...iconBtn, color: p.statut === 'actif' ? '#C0392B' : '#0A7D46' }}>
                                                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2.2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M4.7 4.4a4.6 4.6 0 1 0 6.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Types de navire (câblé backend) ── */}
                {tab === 'types' && (
                    <div style={{ padding: '18px 26px 26px', maxWidth: 860 }}>
                        <div style={card}>
                            <div style={{ padding: '12px 18px', borderBottom: '1px solid #E7EBF2', background: '#FBFCFE' }}>
                                <span style={{ fontSize: 12.5, color: '#5A6478' }}>Référentiel extensible — ajoutez un type ci-dessous. Un type peut être désactivé (il disparaît de la saisie) mais jamais supprimé : les navires déjà rattachés restent intacts.</span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...thNavy, padding: '9px 18px', width: 110 }}>Code</th>
                                        <th style={thNavy}>Désignation</th>
                                        <th style={{ ...thNavy, width: 120 }}>Navires</th>
                                        <th style={{ ...thNavy, width: 120 }}>Statut</th>
                                        <th style={{ ...thNavy, textAlign: 'center', width: 104 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {typesNavire.map((t) => (
                                        <tr key={t.id} className="ea-row">
                                            <td style={{ padding: '10px 18px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}><span style={{ fontSize: 12, fontWeight: 800, color: '#1D3E9C', background: '#EEF3FF', border: '1px solid #C3D0F0', borderRadius: 5, padding: '2px 9px', fontVariantNumeric: 'tabular-nums' }}>{t.code}</span></td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 13, color: '#1A1F2E', verticalAlign: 'middle' }}>{t.name}</td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#5A6478', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>{t.navires_count === 0 ? '—' : `${t.navires_count} navire${t.navires_count > 1 ? 's' : ''}`}</td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>{statutBadge(t.actif)}</td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                    <button onClick={() => openTypeEdit(t)} title="Modifier" className="ea-icon-btn" style={iconBtn}><EditIcon /></button>
                                                    <button onClick={() => askToggleType(t)} title={t.actif ? 'Désactiver' : 'Réactiver'} className="ea-icon-btn" style={{ ...iconBtn, color: t.actif ? '#C0392B' : '#0A7D46' }}>
                                                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2.2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M4.7 4.4a4.6 4.6 0 1 0 6.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {typesNavire.length === 0 && (
                                        <tr><td colSpan={5} style={{ padding: '32px 20px', textAlign: 'center', color: '#8A93A6', fontSize: 13, borderBottom: '1px solid #E7EBF2' }}>Aucun type de navire — ajoutez-en un ci-dessous.</td></tr>
                                    )}
                                    <tr style={{ background: '#FBFCFE' }}>
                                        <td style={{ padding: '10px 18px', borderTop: '1px solid #E7EBF2', verticalAlign: 'top' }}>
                                            <input type="text" value={newType.code} onChange={(e) => setNewType((s) => ({ ...s, code: e.target.value }))} placeholder="Code" style={{ width: 74, height: 34, border: `1px solid ${typeErrors.code ? '#E0B4AD' : '#D8DEE9'}`, borderRadius: 6, padding: '0 8px', fontSize: 12.5, fontWeight: 700, color: '#1D3E9C', textTransform: 'uppercase', outlineColor: '#1D3E9C', background: '#fff' }} />
                                        </td>
                                        <td style={{ padding: '10px 12px', borderTop: '1px solid #E7EBF2', verticalAlign: 'top' }} colSpan={3}>
                                            <input type="text" value={newType.name} onChange={(e) => setNewType((s) => ({ ...s, name: e.target.value }))} placeholder="Désignation du type de navire" style={{ width: '100%', height: 34, border: `1px solid ${typeErrors.name ? '#E0B4AD' : '#D8DEE9'}`, borderRadius: 6, padding: '0 10px', fontSize: 13, color: '#1A1F2E', outlineColor: '#1D3E9C', background: '#fff' }} />
                                            {(typeErrors.code || typeErrors.name) && (
                                                <div style={{ marginTop: 5, fontSize: 11, color: '#C0392B' }}>{typeErrors.code ?? typeErrors.name}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 12px', borderTop: '1px solid #E7EBF2', textAlign: 'center', verticalAlign: 'top' }}>
                                            <button onClick={submitNewType} disabled={!newType.code.trim() || !newType.name.trim()} className={!newType.code.trim() || !newType.name.trim() ? undefined : 'ea-btn-primary'} style={{ height: 34, padding: '0 14px', border: 'none', borderRadius: 6, background: !newType.code.trim() || !newType.name.trim() ? '#C3CBDA' : '#1D3E9C', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: !newType.code.trim() || !newType.name.trim() ? 'not-allowed' : 'pointer' }}>Ajouter</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Tiroir : navire / port ── */}
                {drawer && (
                    <>
                        <div onClick={() => setDrawer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,31,46,.42)', zIndex: 50, animation: 'ecdtsFade .18s ease' }} />
                        <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 452, background: '#fff', zIndex: 51, boxShadow: '-14px 0 40px rgba(20,44,115,.22)', display: 'flex', flexDirection: 'column', animation: 'ecdtsPanel .22s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #E7EBF2', flex: 'none' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1A1F2E' }}>
                                        {drawer.kind === 'navire'
                                            ? (drawer.mode === 'create' ? 'Nouveau navire' : 'Modifier le navire')
                                            : drawer.kind === 'port'
                                                ? (drawer.mode === 'create' ? 'Nouveau port' : 'Modifier le port')
                                                : 'Modifier le type de navire'}
                                    </h3>
                                    <span style={{ fontSize: 11.5, color: '#5A6478' }}>{drawer.kind === 'navire' ? 'Référentiel Navires — lu par le moteur de calcul.' : drawer.kind === 'port' ? 'Référentiel Ports — code UN/LOCODE.' : 'Référentiel Types de navire.'}</span>
                                </div>
                                <div style={{ flex: 1 }} />
                                <button onClick={() => setDrawer(null)} title="Fermer" className="ea-close" style={{ width: 30, height: 30, border: 'none', background: '#F0F2F7', color: '#5A6478', borderRadius: 6, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>✕</button>
                            </div>
                            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {drawer.kind === 'navire' ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={fieldLabel}>Nom du navire <span style={{ color: '#C0392B' }}>*</span></span>
                                            <input type="text" value={drawer.nom} onChange={(e) => setDrawer({ ...drawer, nom: e.target.value })} placeholder="Nom du navire" style={fieldInput} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                <span style={fieldLabel}>Type <span style={{ color: '#C0392B' }}>*</span></span>
                                                <select value={drawer.type} onChange={(e) => setDrawer({ ...drawer, type: e.target.value })} style={fieldSelect}>
                                                    {activeTypes.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                <span style={fieldLabel}>Code IMO</span>
                                                <input type="text" value={drawer.imo} onChange={(e) => setDrawer({ ...drawer, imo: e.target.value })} placeholder="ex. 9412367" style={{ ...fieldInput, fontVariantNumeric: 'tabular-nums' }} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={fieldLabel}>Ligne régulière / Tramping <span style={{ color: '#C0392B' }}>*</span></span>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {(['reguliere', 'tramping'] as Ligne[]).map((lg) => {
                                                    const on = drawer.ligne === lg;

                                                    return (
                                                        <button key={lg} onClick={() => setDrawer({ ...drawer, ligne: lg })} style={{ flex: 1, height: 36, borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, border: `1px solid ${on ? '#1D3E9C' : '#D8DEE9'}`, background: on ? '#EEF3FF' : '#fff', color: on ? '#1D3E9C' : '#5A6478' }}>
                                                            {lg === 'reguliere' ? 'Ligne régulière' : 'Tramping'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <span style={{ fontSize: 11, color: '#8A93A6', lineHeight: 1.4 }}>Lu par le moteur de calcul (ex. bois : EXP11 régulier vs EXP11B tramping).</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={fieldLabel}>Armement rattaché <span style={{ color: '#C0392B' }}>*</span></span>
                                            <select value={drawer.armementId} onChange={(e) => setDrawer({ ...drawer, armementId: Number(e.target.value) })} style={fieldSelect}>
                                                {armements.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                ) : drawer.kind === 'port' ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={fieldLabel}>Nom du port <span style={{ color: '#C0392B' }}>*</span></span>
                                            <input type="text" value={drawer.nom} onChange={(e) => setDrawer({ ...drawer, nom: e.target.value })} placeholder="ex. Owendo" style={fieldInput} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                <span style={fieldLabel}>Code UN/LOCODE <span style={{ color: '#C0392B' }}>*</span></span>
                                                <input type="text" value={drawer.locode} onChange={(e) => setDrawer({ ...drawer, locode: e.target.value })} placeholder="ex. GA OWE" style={{ ...fieldInput, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                <span style={fieldLabel}>Pays</span>
                                                <input type="text" value={drawer.pays} onChange={(e) => setDrawer({ ...drawer, pays: e.target.value })} placeholder="Gabon" style={fieldInput} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={fieldLabel}>Statut</span>
                                            <select value={drawer.statut} onChange={(e) => setDrawer({ ...drawer, statut: e.target.value as PortStatut })} style={fieldSelect}>
                                                <option value="actif">Actif</option>
                                                <option value="inactif">Inactif</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={fieldLabel}>Code <span style={{ color: '#C0392B' }}>*</span></span>
                                            <input type="text" value={drawer.code} onChange={(e) => setDrawer({ ...drawer, code: e.target.value })} placeholder="ex. PC" style={{ ...fieldInput, fontWeight: 600, textTransform: 'uppercase' }} />
                                            {drawerErrors.code && <span style={{ fontSize: 11, color: '#C0392B' }}>{drawerErrors.code}</span>}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={fieldLabel}>Désignation <span style={{ color: '#C0392B' }}>*</span></span>
                                            <input type="text" value={drawer.name} onChange={(e) => setDrawer({ ...drawer, name: e.target.value })} placeholder="ex. Porte-conteneurs" style={fieldInput} />
                                            {drawerErrors.name && <span style={{ fontSize: 11, color: '#C0392B' }}>{drawerErrors.name}</span>}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: '1px solid #E7EBF2', flex: 'none', background: '#FBFCFE' }}>
                                <span style={{ fontSize: 11.5, color: '#8A93A6', flex: 1 }}>Champs marqués <span style={{ color: '#C0392B' }}>*</span> obligatoires.</span>
                                <button onClick={() => setDrawer(null)} className="ea-btn-cancel" style={{ height: 38, padding: '0 16px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                                <button onClick={saveDrawer} disabled={!drawerValid} className={drawerValid ? 'ea-btn-primary' : undefined} style={{ height: 38, padding: '0 18px', border: 'none', borderRadius: 6, background: drawerValid ? '#1D3E9C' : '#C3CBDA', color: '#fff', fontSize: 13, fontWeight: 700, cursor: drawerValid ? 'pointer' : 'not-allowed' }}>
                                    {drawer.mode === 'create' ? 'Enregistrer' : 'Mettre à jour'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Modale de confirmation ── */}
                {confirm && (
                    <div onClick={() => setConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,31,46,.48)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'ecdtsFade .18s ease' }}>
                        <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: 452, maxWidth: '100%', background: '#fff', borderRadius: 9, boxShadow: '0 18px 50px rgba(20,44,115,.30)', overflow: 'hidden', animation: 'ecdtsPop .18s ease' }}>
                            <div style={{ padding: '18px 22px 8px', display: 'flex', gap: 13 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 9, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: confirm.danger ? '#FBEAE7' : '#EAF4FC', color: confirm.danger ? '#C0392B' : '#1D3E9C' }}>
                                    <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><path d="M10 2.5L18 16.5H2L10 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M10 8v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="10" cy="14" r="0.9" fill="currentColor" /></svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#1A1F2E' }}>{confirm.title}</h3>
                                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#3A4356' }}>{confirm.body}</p>
                                </div>
                            </div>
                            {confirm.statLabel && (
                                <div style={{ padding: '6px 22px 4px' }}>
                                    <div style={{ background: '#F5F8FD', border: '1px solid #D8DEE9', borderRadius: 6, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
                                        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: '#5A6478', textTransform: 'uppercase' }}>{confirm.statLabel}</span>
                                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1A1F2E' }}>{confirm.statValue}</span>
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #E7EBF2', background: '#FBFCFE', marginTop: 8 }}>
                                <button onClick={() => setConfirm(null)} className="ea-btn-cancel" style={{ height: 36, padding: '0 16px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                                <button onClick={confirm.onOk} style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 6, background: confirm.danger ? '#C0392B' : '#1D3E9C', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{confirm.label}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Toast ── */}
                {toast && (
                    <div key={toast.msg} style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', zIndex: 70, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '11px 18px', borderRadius: 9, background: '#142C73', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 10px 30px rgba(20,44,115,.35)', animation: 'ecdtsToast .22s ease' }}>
                        <span style={{ display: 'inline-flex', width: 18, height: 18, borderRadius: '50%', background: toast.kind === 'ok' ? '#009E60' : '#7EC8F0', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3L9.5 3.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        {toast.msg}
                    </div>
                )}
            </AdminShell>
        </>
    );
}
