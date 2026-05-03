"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getEventPartners,
  createEventPartner,
  updateEventPartner,
  deleteEventPartner,
} from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import {
  Gift,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";

const GRADIENTS = [
  "from-rose-400 to-pink-500",
  "from-fuchsia-400 to-purple-500",
  "from-violet-400 to-indigo-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
];

const EMPTY = {
  name: "", subtitle: "", taglineFr: "", taglineHt: "",
  descFr: "", descHt: "",
  servicesFr: "", servicesHt: "",
  email: "", phone: "",
  gradient: GRADIENTS[0], heroSrc: "", active: true,
};

export default function AdminEventPartnersPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) { router.push("/"); return; }
    getEventPartners().then((data) => { setPartners(data); setLoading(false); });
  }, [user, isAdmin, authLoading, router]);

  function startEdit(p) {
    setEditing(p.id);
    setForm({
      ...p,
      servicesFr: Array.isArray(p.servicesFr) ? p.servicesFr.join(", ") : "",
      servicesHt: Array.isArray(p.servicesHt) ? p.servicesHt.join(", ") : "",
    });
    setExpanded(p.id);
    setShowNew(false);
  }

  function cancelEdit() { setEditing(null); setForm(EMPTY); }

  function parseServices(str) {
    return String(str || "").split(",").map((s) => s.trim()).filter(Boolean);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        servicesFr: parseServices(form.servicesFr),
        servicesHt: parseServices(form.servicesHt),
      };
      if (editing === "new") {
        await createEventPartner(payload);
      } else {
        await updateEventPartner(editing, payload);
      }
      const fresh = await getEventPartners();
      setPartners(fresh);
      setEditing(null);
      setForm(EMPTY);
      setShowNew(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce partenaire ?")) return;
    await deleteEventPartner(id);
    setPartners((p) => p.filter((x) => x.id !== id));
  }

  async function toggleActive(p) {
    await updateEventPartner(p.id, { active: !p.active });
    setPartners((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !p.active } : x));
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
      </div>
    );
  }

  const isEditingNew = editing === "new";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500 shadow-lg">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-rose-900">Partenaires événements</h1>
              <p className="text-sm text-slate-500">{partners.length} partenaire{partners.length !== 1 ? "s" : ""} enregistré{partners.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Button
            onClick={() => { setEditing("new"); setForm(EMPTY); setShowNew(true); }}
            className="rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white">
            <Plus className="mr-2 h-4 w-4" /> Nouveau
          </Button>
        </div>

        {/* New partner form */}
        {showNew && isEditingNew && (
          <PartnerForm
            form={form} setForm={setForm} saving={saving}
            onSave={handleSave} onCancel={() => { setEditing(null); setShowNew(false); }}
            isNew
          />
        )}

        {/* Partner list */}
        <div className="space-y-3">
          {partners.map((p) => {
            const isExp = expanded === p.id;
            const isEd = editing === p.id;
            return (
              <div key={p.id} className={`rounded-[2rem] border bg-white shadow-sm ${p.active ? "border-slate-100" : "border-slate-200 opacity-60"}`}>

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${p.gradient || "from-rose-400 to-pink-500"} shadow`}>
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-rose-900">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(p)} title={p.active ? "Désactiver" : "Activer"}
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-50">
                      {p.active ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => startEdit(p)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-fuchsia-50 hover:text-fuchsia-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setExpanded(isExp ? null : p.id)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-50">
                      {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Edit form or details */}
                {isExp && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    {isEd ? (
                      <PartnerForm form={form} setForm={setForm} saving={saving}
                        onSave={handleSave} onCancel={cancelEdit} />
                    ) : (
                      <div className="space-y-2 text-sm text-slate-600">
                        <p><span className="font-semibold text-rose-700">Tagline FR :</span> {p.taglineFr}</p>
                        <p><span className="font-semibold text-rose-700">Tagline HT :</span> {p.taglineHt}</p>
                        <p><span className="font-semibold text-rose-700">Services FR :</span> {(p.servicesFr || []).join(", ")}</p>
                        <p><span className="font-semibold text-rose-700">Services HT :</span> {(p.servicesHt || []).join(", ")}</p>
                        {p.email && <p><span className="font-semibold text-rose-700">Email :</span> {p.email}</p>}
                        {p.phone && <p><span className="font-semibold text-rose-700">Tél :</span> {p.phone}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PartnerForm({ form, setForm, saving, onSave, onCancel, isNew }) {
  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300";
  const label = "text-xs font-bold text-rose-700 mb-1 block";

  return (
    <div className="space-y-4 rounded-2xl border border-rose-100 bg-rose-50 p-4">
      <p className="font-bold text-rose-900">{isNew ? "Nouveau partenaire" : "Modifier le partenaire"}</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Nom *</label>
          <input className={input} value={form.name} onChange={f("name")} placeholder="Eventoria" />
        </div>
        <div>
          <label className={label}>Sous-titre</label>
          <input className={input} value={form.subtitle} onChange={f("subtitle")} placeholder="by Lakou Manman" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Tagline FR</label>
          <input className={input} value={form.taglineFr} onChange={f("taglineFr")} placeholder="Chaque détail, un moment magique ♥" />
        </div>
        <div>
          <label className={label}>Tagline HT</label>
          <input className={input} value={form.taglineHt} onChange={f("taglineHt")} placeholder="Chak detay, yon moman majik ♥" />
        </div>
      </div>

      <div>
        <label className={label}>Description FR</label>
        <textarea className={input} rows={2} value={form.descFr} onChange={f("descFr")} />
      </div>
      <div>
        <label className={label}>Description HT</label>
        <textarea className={input} rows={2} value={form.descHt} onChange={f("descHt")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Services FR (séparés par ,)</label>
          <input className={input} value={form.servicesFr} onChange={f("servicesFr")} placeholder="Baby Shower, Anniversaire, Fête privée" />
        </div>
        <div>
          <label className={label}>Services HT (séparés par ,)</label>
          <input className={input} value={form.servicesHt} onChange={f("servicesHt")} placeholder="Baby Shower, Anivèsè, Fèt prive" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Email contact</label>
          <input className={input} type="email" value={form.email} onChange={f("email")} />
        </div>
        <div>
          <label className={label}>Téléphone</label>
          <input className={input} value={form.phone} onChange={f("phone")} />
        </div>
      </div>

      <div>
        <label className={label}>URL image hero</label>
        <input className={input} value={form.heroSrc} onChange={f("heroSrc")} placeholder="https://images.unsplash.com/..." />
      </div>

      <div>
        <label className={label}>Couleur gradient</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {["from-rose-400 to-pink-500","from-fuchsia-400 to-purple-500","from-violet-400 to-indigo-500","from-amber-400 to-orange-500","from-emerald-400 to-teal-500","from-sky-400 to-blue-500"].map((g) => (
            <button key={g} type="button" onClick={() => setForm((p) => ({ ...p, gradient: g }))}
              className={`h-8 w-8 rounded-xl bg-gradient-to-br ${g} transition ${form.gradient === g ? "ring-2 ring-offset-2 ring-rose-400 scale-110" : "opacity-70 hover:opacity-100"}`} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button disabled={!form.name.trim() || saving} onClick={onSave}
          className="rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white disabled:opacity-40">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-2xl border-slate-200 text-slate-500">
          <X className="mr-2 h-4 w-4" /> Annuler
        </Button>
      </div>
    </div>
  );
}
