'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, postJson } from '@/lib/api';
import type { Role } from '@/lib/types';
type ManagedUser = {
  id: string;
  name: string;
  email: string;
  approvalStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
  roles: Role[];
};
type DriverOption = { id: string; name: string; linkedUserId?: string };
type Permission = { role: Role; resource: string; access: 'NONE' | 'VIEW' | 'MANAGE' };
const roles: Role[] = [
  'FLEET_MANAGER',
  'DISPATCHER',
  'DRIVER',
  'SAFETY_OFFICER',
  'FINANCIAL_ANALYST',
];
function PendingUser({
  user,
  drivers,
  refresh,
}: {
  user: ManagedUser;
  drivers: DriverOption[];
  refresh: () => void;
}) {
  const [role, setRole] = useState<Role>('DISPATCHER');
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);
  async function approve() {
    setBusy(true);
    try {
      await postJson(`/api/v1/settings/users/${user.id}/approve`, {
        role,
        driverId: role === 'DRIVER' ? driverId : undefined,
      });
      refresh();
    } finally {
      setBusy(false);
    }
  }
  async function reject() {
    const reason = prompt('Reason for rejecting this account');
    if (!reason) return;
    setBusy(true);
    try {
      await postJson(`/api/v1/settings/users/${user.id}/reject`, { reason });
      refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card" style={{ margin: '10px 0' }}>
      <div className="row between">
        <span>
          <b>{user.name}</b>
          <br />
          <small>{user.email}</small>
        </span>
        <span className="badge pending">PENDING</span>
      </div>
      <div className="row">
        <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
          {roles.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        {role === 'DRIVER' && (
          <select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
            <option value="">Link driver profile</option>
            {drivers
              .filter((driver) => !driver.linkedUserId)
              .map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
          </select>
        )}
        <button
          className="button"
          disabled={busy || (role === 'DRIVER' && !driverId)}
          onClick={approve}
        >
          Approve
        </button>
        <button className="button danger" disabled={busy} onClick={reject}>
          Reject
        </button>
      </div>
    </div>
  );
}
export function UserAdministration() {
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () => api<ManagedUser[]>('/api/v1/settings/users'),
  });
  const drivers = useQuery({
    queryKey: ['drivers', 'approval-options'],
    queryFn: () => api<DriverOption[]>('/api/v1/drivers?pageSize=100'),
  });
  const permissions = useQuery({
    queryKey: ['settings', 'permissions'],
    queryFn: () => api<Permission[]>('/api/v1/settings/permissions'),
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    void queryClient.invalidateQueries({ queryKey: ['drivers'] });
  };
  const pending = users.data?.filter((user) => user.approvalStatus === 'PENDING') ?? [];
  async function rotateCode() {
    const { code } = await postJson<{ code: string }>(
      '/api/v1/settings/organization/signup-code/rotate',
    );
    alert(`New signup code (shown once): ${code}`);
  }
  return (
    <>
      <section className="card">
        <div className="row between">
          <div>
            <h2>Pending account requests</h2>
            <p className="sub">Approve exactly one operational role.</p>
          </div>
          <button className="button" onClick={() => void rotateCode()}>
            Rotate signup code
          </button>
        </div>
        {users.isLoading && <p>Loading requests...</p>}
        {!users.isLoading && pending.length === 0 && (
          <p className="sub">No pending account requests.</p>
        )}
        {pending.map((user) => (
          <PendingUser key={user.id} user={user} drivers={drivers.data ?? []} refresh={refresh} />
        ))}
      </section>
      <section className="card">
        <h2>Database role permissions</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Resource</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {permissions.data?.map((entry) => (
                <tr key={`${entry.role}-${entry.resource}`}>
                  <td>{entry.role.replaceAll('_', ' ')}</td>
                  <td>{entry.resource}</td>
                  <td>{entry.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
