import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { canAssignRole } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { createUser, updateUser } from "@/app/actions/admin";

export default async function Users({ searchParams }: { searchParams: { q?: string; ok?: string; error?: string } }) {
  const u = await requirePermission("users.manage");
  const assignable = ROLES.filter((r) => canAssignRole(u.role, r));
  const [users, inst] = await Promise.all([db.user.findMany({ where: { role: { not: "STUDENT" }, ...(searchParams.q ? { OR: [{ name: { contains: searchParams.q } }, { email: { contains: searchParams.q } }] } : {}) }, include: { institution: true }, orderBy: { role: "asc" } }), db.institution.findMany()]);
  return (
    <>
      <PageHeader title="Users & roles" sub="Staff accounts. Role changes are audited; suspension revokes all sessions." />
      <Flash searchParams={searchParams} />
      <form action={createUser} className="card grid gap-2 md:grid-cols-5"><input name="name" required className="input" placeholder="Name" aria-label="Name" /><input name="email" type="email" required className="input" placeholder="Email" aria-label="Email" /><select name="role" className="input" aria-label="Role">{assignable.map((r) => <option key={r}>{r}</option>)}</select><select name="institutionId" className="input" aria-label="Institution"><option value="">No institution</option>{inst.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select><button className="btn-primary">Create staff user</button></form>
      <form className="mt-4 flex max-w-md gap-2"><input name="q" defaultValue={searchParams.q} className="input" placeholder="Search" aria-label="Search users" /><button className="btn-outline">Search</button></form>
      <div className="card mt-3 overflow-x-auto p-0"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Institution</th><th>Role / status</th></tr></thead><tbody>
        {users.map((x) => <tr key={x.id}><td>{x.name}</td><td className="text-xs">{x.email}</td><td className="text-xs">{x.institution?.name ?? "—"}</td>
          <td>{x.id !== u.id && canAssignRole(u.role, x.role) ? <form action={updateUser} className="flex flex-wrap gap-1"><input type="hidden" name="id" value={x.id} /><select name="role" defaultValue={x.role} className="input w-48" aria-label="Role">{assignable.map((r) => <option key={r}>{r}</option>)}</select><select name="status" defaultValue={x.status} className="input w-32" aria-label="Status"><option>ACTIVE</option><option>SUSPENDED</option></select><input name="reason" className="input w-32" placeholder="Reason" aria-label="Reason" /><button className="btn-outline btn-sm">Save</button></form> : <><Badge>{x.role}</Badge> <Badge>{x.status}</Badge></>}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
