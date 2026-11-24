import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Flash, PageHeader } from "@/components/ui";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { saveSettings, saveSignatory } from "@/app/actions/admin";

const ROOT_ONLY = ["payments.mode", "flags.maintenance", "issuer.verified"];

export default async function Settings({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requirePermission("settings.manage");
  const s = await getSettings();
  const sigs = await db.signatory.findMany({ orderBy: { createdAt: "desc" } });
  const groups = Object.keys(DEFAULT_SETTINGS).filter((k) => k !== "receipt.seq").reduce<Record<string, string[]>>((a, k) => { (a[k.split(".")[0]] ??= []).push(k); return a; }, {});
  return (
    <>
      <PageHeader title="Settings" sub="All changes are audited. Legal identity and issuer verification must reflect real, documented facts." />
      <Flash searchParams={searchParams} />
      <form action={saveSettings} className="space-y-4">
        {Object.entries(groups).map(([g, keys]) => (
          <fieldset key={g} className="card grid gap-3 md:grid-cols-3"><legend className="h2 px-1 capitalize">{g}</legend>
            {keys.map((k) => { const locked = ROOT_ONLY.includes(k) && u.role !== "ROOT_OWNER"; const v = s[k as keyof typeof s]; return (
              <div key={k}><label className="label" htmlFor={k}>{k}{locked && " (root only)"}</label>
                {v === "true" || v === "false" ? <select id={k} name={k} defaultValue={v} disabled={locked} className="input"><option>true</option><option>false</option></select>
                  : k === "payments.mode" ? <select id={k} name={k} defaultValue={v} disabled={locked} className="input"><option>TEST</option><option>LIVE</option></select>
                  : <input id={k} name={k} defaultValue={v} disabled={locked} className="input" />}</div>); })}
          </fieldset>
        ))}
        <button className="btn-primary">Save settings</button>
      </form>
      <div className="card mt-6"><div className="h2">Signatories</div>
        <ul className="mt-2 text-sm">{sigs.map((x) => <li key={x.id}>{x.name}, {x.title} {x.active ? "(active)" : ""} — evidence: {x.authorityEvidence ?? "none"}</li>)}</ul>
        {can(u.role, "settings.root") && <form action={saveSignatory} className="mt-3 grid gap-2 md:grid-cols-5"><input name="name" required className="input" placeholder="Name" aria-label="Signatory name" /><input name="title" required className="input" placeholder="Designation" aria-label="Designation" /><input name="authorityEvidence" required className="input" placeholder="Board resolution / authority ref" aria-label="Authority evidence" /><label className="text-sm"><input type="checkbox" name="makeActive" defaultChecked /> Make active</label><button className="btn-primary">Add</button></form>}
      </div>
    </>
  );
}
