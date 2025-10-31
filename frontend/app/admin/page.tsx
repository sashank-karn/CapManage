"use client";

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'classnames';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { publishToast } from '../../lib/toast';
import {
  fetchUsers,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  activateUser as apiActivateUser,
  deactivateUser as apiDeactivateUser,
  deleteUser as apiDeleteUser,
  resendPasswordSetup,
  resendVerificationEmail,
  fetchFacultyRequests,
  updateFacultyRequest,
  fetchActivities,
  fetchReportSummary,
  downloadReport,
  downloadUsersExcel,
  type AdminUserListItem,
  type FacultyRequestItem,
  type ActivityItem,
  type ActivityType
} from '../../services/admin';

type TabId = 'users' | 'faculty' | 'activity' | 'reports';

const createUserSchema = z.object({
  name: z.string().min(2, 'Enter the full name'),
  email: z.string().email('Enter a valid email'),
  role: z.enum(['student', 'faculty', 'admin']),
  enrollmentId: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  expertise: z.string().optional()
});
type CreateUserForm = z.infer<typeof createUserSchema>;

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['student', 'faculty', 'admin']).optional(),
  isActive: z.boolean().optional()
});
type UpdateUserForm = z.infer<typeof updateUserSchema>;

const AdminPage = () => {
  const { initialized, authorized } = useRequireAuth({ roles: ['admin'], redirectTo: '/login', silent: true });

  const [activeTab, setActiveTab] = useState<TabId>('users');

  // Avoid rendering (and thus fetching) until auth is initialized/authorized
  if (!initialized) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-none w-full px-4 py-6 sm:px-6 lg:px-10 xl:px-12 lg:py-8">
          <div className="h-10 w-48 animate-pulse rounded bg-slate-200" />
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-none w-full px-4 py-6 sm:px-6 lg:px-10 xl:px-12 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Admin dashboard</h1>
          <p className="text-sm text-slate-600">Manage users and approve faculty registrations.</p>
        </header>

        <nav className="mb-6 flex gap-2">
          <TabButton id="users" active={activeTab} onClick={setActiveTab} label="Users" />
          <TabButton id="faculty" active={activeTab} onClick={setActiveTab} label="Faculty requests" />
          <TabButton id="activity" active={activeTab} onClick={setActiveTab} label="Activity" />
          <TabButton id="reports" active={activeTab} onClick={setActiveTab} label="Reports" />
        </nav>

        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'faculty' && <FacultyRequestsTab />}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </main>
  );
};

export default AdminPage;

const TabButton = ({ id, active, onClick, label }: { id: TabId; active: TabId; onClick: (id: TabId) => void; label: string }) => (
  <button
    type="button"
    onClick={() => onClick(id)}
    className={clsx(
      'rounded-full px-4 py-2 text-sm font-medium transition',
      active === id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
    )}
  >
    {label}
  </button>
);

const UsersTab = () => {
  const [roleFilter, setRoleFilter] = useState<AdminUserListItem['role'] | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(['admin-users', roleFilter, search, page], ([, role, q, p]) =>
    fetchUsers({ role: (role || undefined) as any, search: q || undefined, page: p as number, limit })
  );

  const onCreated = async () => {
    await mutate();
    setShowCreate(false);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full max-w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex justify-start md:justify-end">
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            {showCreate ? 'Close' : 'Add user'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Create a new user</h3>
          <CreateUserCard onCreated={onCreated} />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative overflow-hidden">
        <table className="min-w-full table-fixed divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 w-1/4">Name</th>
              <th className="px-4 py-3 w-1/4">Email</th>
              <th className="px-4 py-3 hidden md:table-cell w-1/6">Role</th>
              <th className="px-4 py-3 hidden sm:table-cell w-1/6">Status</th>
              <th className="px-4 py-3 text-right w-1/4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Loading users…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600">
                  Failed to load users
                </td>
              </tr>
            ) : data && data.items.length ? (
              data.items.map((u) => <UserRow key={u._id} user={u} onChange={mutate} />)
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-600">
          {data ? `Showing ${Math.min(limit, data.items.length)} of ${data.total} users` : ' '}
        </p>
        {data && data.total > limit && (
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-slate-600">Page {page} of {Math.max(1, Math.ceil(data.total / limit))}</span>
            <button
              disabled={page >= Math.ceil(data.total / limit)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const CreateUserCard = ({ onCreated }: { onCreated: () => void }) => {
  const {
    handleSubmit,
    register,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'student' }
  });

  const role = watch('role');

  const onSubmit = handleSubmit(async (values) => {
    await apiCreateUser(values);
    publishToast('User created. A password setup email has been sent.', 'success');
    reset({ role: 'student', name: '', email: '', enrollmentId: '', department: '', designation: '', expertise: '' });
    onCreated();
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <input
          placeholder="Full name"
          {...register('name')}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        {errors.name?.message && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
      </div>
      <div>
        <input
          placeholder="Email"
          type="email"
          {...register('email')}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        {errors.email?.message && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
      </div>
      <div>
        {role === 'student' ? (
          <input
            placeholder="Enrollment ID (student)"
            {...register('enrollmentId')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        ) : (
          <input
            placeholder="Department (faculty)"
            {...register('department')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        )}
        {(errors.enrollmentId?.message || errors.department?.message) && (
          <p className="mt-1 text-xs text-rose-600">{errors.enrollmentId?.message || errors.department?.message}</p>
        )}
      </div>
      <div>
        <select
          {...register('role')}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:w-auto"
        >
          {isSubmitting ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  );
};

const UserRow = ({ user, onChange }: { user: AdminUserListItem; onChange: () => void }) => {
  const [editing, setEditing] = useState(false);
  const {
    handleSubmit,
    register,
    formState: { isSubmitting }
  } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: user.name, email: user.email, role: user.role, isActive: user.isActive }
  });

  const onSubmit = handleSubmit(async (values) => {
    await apiUpdateUser(user._id, values);
    publishToast('User updated', 'success');
    setEditing(false);
    onChange();
  });

  const toggleActive = async () => {
    if (user.isActive) {
      await apiDeactivateUser(user._id);
      publishToast('User deactivated', 'info');
    } else {
      await apiActivateUser(user._id);
      publishToast('User activated', 'success');
    }
    onChange();
  };

  const deleteUser = async () => {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    await apiDeleteUser(user._id);
    publishToast('User deleted', 'success');
    onChange();
  };

  return (
    <tr>
      <td className="px-4 py-3 max-w-[220px] truncate">
        {editing ? (
          <input {...register('name')} className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
        ) : (
          <div className="font-medium text-slate-900" title={user.name}>{user.name}</div>
        )}
      </td>
      <td className="px-4 py-3 max-w-[260px] truncate">
        {editing ? (
          <input {...register('email')} type="email" className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
        ) : (
          <div className="text-slate-600" title={user.email}>{user.email}</div>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        {editing ? (
          <select {...register('role')} className="rounded border border-slate-200 px-2 py-1 text-sm">
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{user.role}</span>
        )}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <StatusBadge role={user.role} active={user.isActive} verified={user.isEmailVerified} facultyStatus={user.facultyStatus} />
      </td>
      
  <td className={clsx("px-4 py-3 text-right align-top", !editing && "md:whitespace-nowrap whitespace-normal") }>
        {editing ? (
          <div className="inline-flex gap-2">
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 justify-end flex-wrap md:flex-nowrap">
            {!user.isEmailVerified && (
              <button
                onClick={async () => { await resendVerificationEmail(user._id); publishToast('Verification email sent', 'info'); }}
                className="rounded bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
                title="Resend verification email"
              >
                Resend verify
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Edit
            </button>
            <button
              onClick={toggleActive}
              className={clsx(
                'rounded px-3 py-1 text-xs font-semibold text-white',
                user.isActive ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              )}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={async () => { await resendPasswordSetup(user._id); publishToast('Password setup email sent', 'info'); }}
              className="rounded bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
              title="Resend password setup/reset"
            >
              Resend pwd
            </button>
            <button
              onClick={deleteUser}
              className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500"
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

const StatusBadge = ({ role, active, verified, facultyStatus }: { role: 'admin' | 'student' | 'faculty'; active: boolean; verified: boolean; facultyStatus?: 'pending' | 'approved' | 'rejected' }) => {
  const { label, style } = useMemo(() => {
    if (!active) return { label: 'Inactive', style: 'bg-slate-200 text-slate-700' };
    if (!verified) return { label: 'Email pending', style: 'bg-amber-100 text-amber-700' };

    if (role === 'faculty') {
      if (facultyStatus === 'pending') return { label: 'Faculty pending', style: 'bg-indigo-100 text-indigo-700' };
      if (facultyStatus === 'rejected') return { label: 'Faculty rejected', style: 'bg-rose-100 text-rose-700' };
    }

    return { label: 'Verified', style: 'bg-emerald-100 text-emerald-700' };
  }, [role, active, verified, facultyStatus]);

  return <span className={clsx('rounded-full px-2 py-1 text-xs font-medium', style)}>{label}</span>;
};

const FacultyRequestsTab = () => {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const { data, isLoading, error, mutate } = useSWR(['faculty-requests', status], ([, s]) => fetchFacultyRequests(s as any));

  const update = async (id: string, status: 'approved' | 'rejected') => {
    await updateFacultyRequest(id, status);
    publishToast(`Request ${status}`, status === 'approved' ? 'success' : 'info');
    await mutate();
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Faculty requests</h2>
            <p className="text-sm text-slate-600">Filter by status to review or audit requests.</p>
          </div>
          <div className="inline-flex gap-2">
            {(['pending','approved','rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={clsx('rounded-full px-3 py-1 text-xs font-medium', status === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Loading requests…</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-red-600">Failed to load requests</td></tr>
            ) : data && data.length ? (
              data.map((req: FacultyRequestItem) => (
                <tr key={req._id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{req.user?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{req.user?.email}</td>
                  <td className="px-4 py-3">{req.department}</td>
                  <td className="px-4 py-3">{req.designation}</td>
                  <td className="px-4 py-3 text-right">
                    {status === 'pending' ? (
                      <div className="inline-flex gap-2">
                        <button onClick={() => update(req._id, 'approved')} className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500">Approve</button>
                        <button onClick={() => update(req._id, 'rejected')} className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500">Reject</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">{status[0].toUpperCase() + status.slice(1)}</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No {status} requests</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const ActivityTab = () => {
  const [type, setType] = useState<ActivityType | ''>('');
  const { data, isLoading, error } = useSWR(['activities', type], ([, t]) => fetchActivities({ type: (t || undefined) as any, limit: 20, page: 1 }), { refreshInterval: 5000 });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Activity log</h2>
        <select value={type} onChange={(e) => setType(e.target.value as ActivityType | '')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
          <option value="">All types</option>
          {(['registration','login','user-create','user-update','user-delete','activate','deactivate','role-change','faculty-approve','faculty-reject','password-reset-request','email-verification'] as ActivityType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-red-600">Failed to load</td></tr>
            ) : data && data.items.length ? (
              data.items.map((a: ActivityItem) => (
                <tr key={a._id}>
                  <td className="px-4 py-3 text-slate-600">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{a.user?.name} <span className="text-xs text-slate-500">({a.user?.email})</span></td>
                  <td className="px-4 py-3">{a.message}</td>
                  <td className="px-4 py-3">{a.actor ? `${a.actor.name}` : '-'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No activity</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const ReportsTab = () => {
  const { data, isLoading, error } = useSWR('report-summary', fetchReportSummary, { refreshInterval: 60000 });
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Usage summary</h2>
            <p className="text-sm text-slate-600">Counts of users and submissions.</p>
          </div>
          <div className="inline-flex gap-2">
            <button onClick={() => downloadReport('pdf')} className="rounded bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300">Download PDF</button>
            <button onClick={() => downloadReport('xlsx')} className="rounded bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300">Download Excel</button>
            <button onClick={() => downloadUsersExcel()} className="rounded bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200">Download Users (Excel)</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-slate-200" />
            </div>
          ))
        ) : error ? (
          <div className="col-span-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Failed to load summary</div>
        ) : data ? (
          <>
            <MetricCard label="Students" value={data.students} />
            <MetricCard label="Faculty" value={data.faculty} />
            <MetricCard label="Admins" value={data.admins} />
            <MetricCard label="Submissions" value={data.submissions} />
          </>
        ) : null}
      </div>
    </section>
  );
};

const MetricCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-sm text-slate-600">{label}</div>
    <div className="text-2xl font-semibold text-slate-900">{value}</div>
  </div>
);
