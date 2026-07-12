'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { eligibleDrivers, eligibleVehicles, label, money } from '@/lib/store';
import { api } from '@/lib/api';
import { allowedPaths, type CurrentUser } from '@/lib/auth';
import { useLiveOperations } from '@/features/operations/use-live-operations';
import { UserAdministration } from '@/features/settings/user-administration';
import { AnalyticsView } from '@/features/analytics/analytics-view';
import type { Role, State, TripStatus } from '@/lib/types';
type User = {
  name: string;
  email: string;
  role: Role;
  initials: string;
  driverId: string | null;
  allowedPaths: string[];
};
const Badge = ({ status }: { status: string }) => (
  <span className={'badge ' + status.toLowerCase().replaceAll('_', '-')}>{label(status)}</span>
);
function Header({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="row between">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="sub">Gandhinagar Depot GTY · live mock operations data</p>
      </div>
      {children}
    </div>
  );
}
function Dashboard({ s, user }: { s: State; user: User }) {
  const active = s.trips.filter((t) => ['DISPATCHED', 'IN_PROGRESS'].includes(t.status)).length;
  const avail = s.vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const cards = [
    ['Active Vehicles', s.vehicles.filter((v) => v.status !== 'RETIRED').length],
    ['Available Vehicles', avail],
    ['In Maintenance', s.vehicles.filter((v) => v.status === 'IN_SHOP').length],
    ['Active Trips', active],
    ['Pending Trips', s.trips.filter((t) => t.status === 'DRAFT').length],
    ['Drivers on Duty', s.drivers.filter((d) => d.status === 'ON_TRIP').length],
    [
      'Fleet Utilization',
      `${Math.round((active / Math.max(1, s.vehicles.filter((v) => v.status !== 'RETIRED').length)) * 100)}%`,
    ],
  ];
  if (user.role === 'DRIVER') {
    const mine = s.trips.filter((t) => t.driverId === user.driverId);
    return (
      <>
        <Header title="My Operations" />
        <div className="kpis grid">
          <div className="card kpi">
            <small>Assigned trips</small>
            <div className="value">{mine.length}</div>
          </div>
          <div className="card kpi">
            <small>Safety score</small>
            <div className="value">96%</div>
          </div>
        </div>
        <Trips s={s} user={user} own />
      </>
    );
  }
  return (
    <>
      <Header title="Operations Dashboard" />
      <div className="kpis grid">
        {cards.map(([n, v]) => (
          <div className="card kpi" key={n as string}>
            <small className="sub">{n}</small>
            <div className="value">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid two">
        <section className="card">
          <h2>Recent Trips</h2>
          <TripTable s={s} />
        </section>
        <section className="card">
          <h2>Vehicle Status</h2>
          {['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'].map((x) => {
            const n = s.vehicles.filter((v) => v.status === x).length;
            return (
              <div key={x}>
                <div className="row between">
                  <Badge status={x} />
                  <span>{n}</span>
                </div>
                <div className="chartbar" style={{ width: `${(n / 4) * 100}%` }} />
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
function TripTable({ s }: { s: State }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Trip</th>
            <th>Route</th>
            <th>Vehicle</th>
            <th>Driver</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {s.trips.map((t) => (
            <tr key={t.id}>
              <td>
                <Link href={'/trips/' + t.id}>{t.tripNumber}</Link>
              </td>
              <td>
                {t.source} → {t.destination}
              </td>
              <td>{s.vehicles.find((v) => v.id === t.vehicleId)?.name || 'Unassigned'}</td>
              <td>{s.drivers.find((d) => d.id === t.driverId)?.name || 'Unassigned'}</td>
              <td>
                <Badge status={t.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Fleet({ s, set }: { s: State; set: (x: State) => void }) {
  const [q, setQ] = useState('');
  const filtered = s.vehicles.filter((v) =>
    (v.name + v.registrationNumber).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <Header title="Vehicle Registry">
        <button
          className="button"
          onClick={() => {
            const n = prompt('Vehicle name');
            if (!n) return;
            const reg = prompt('Registration number');
            if (!reg || s.vehicles.some((v) => v.registrationNumber === reg)) {
              alert('Registration number must be unique');
              return;
            }
            set({
              ...s,
              vehicles: [
                ...s.vehicles,
                {
                  id: crypto.randomUUID(),
                  name: n,
                  registrationNumber: reg,
                  model: 'New vehicle',
                  type: 'VAN',
                  maximumLoadKg: 500,
                  odometerKm: 0,
                  acquisitionCost: 0,
                  status: 'AVAILABLE',
                  region: 'Ahmedabad',
                },
              ],
            });
          }}
        >
          Add Vehicle
        </button>
      </Header>
      <div className="card">
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search registration or name"
        />
        <p className="notice">Retired and In Shop vehicles are hidden from dispatch.</p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Registration</th>
                <th>Name / model</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Odometer</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>{v.registrationNumber}</td>
                  <td>
                    <Link href={'/fleet/' + v.id}>{v.name}</Link>
                    <br />
                    <small>{v.model}</small>
                  </td>
                  <td>{v.type}</td>
                  <td>{v.maximumLoadKg} kg</td>
                  <td>{v.odometerKm.toLocaleString()} km</td>
                  <td>{money(v.acquisitionCost)}</td>
                  <td>
                    <Badge status={v.status} />
                  </td>
                  <td>
                    <button
                      className="button danger"
                      disabled={v.status === 'RETIRED'}
                      onClick={() => {
                        if (confirm('Retire this vehicle?'))
                          set({
                            ...s,
                            vehicles: s.vehicles.map((x) =>
                              x.id === v.id ? { ...x, status: 'RETIRED' } : x,
                            ),
                          });
                      }}
                    >
                      Retire
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
function Drivers({ s, set }: { s: State; set: (x: State) => void }) {
  return (
    <>
      <Header title="Drivers & Safety">
        <button
          className="button"
          onClick={() => {
            const name = prompt('Driver name');
            const license = prompt('License number');
            if (name && license)
              set({
                ...s,
                drivers: [
                  ...s.drivers,
                  {
                    id: crypto.randomUUID(),
                    name,
                    licenseNumber: license,
                    licenseCategory: 'LMV',
                    licenseExpiryDate: '2030-01-01',
                    contactNumber: '+91',
                    safetyScore: 90,
                    tripCompletionRate: 90,
                    status: 'AVAILABLE',
                  },
                ],
              });
          }}
        >
          Add Driver
        </button>
      </Header>
      <div className="card">
        <p className="notice">Expired license or Suspended status blocks trip assignment.</p>
        <TripDriverTable s={s} set={set} />
      </div>
    </>
  );
}
function TripDriverTable({ s, set }: { s: State; set: (x: State) => void }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Driver</th>
            <th>License</th>
            <th>Expiry</th>
            <th>Safety</th>
            <th>Completion</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {s.drivers.map((d) => {
            const expired = new Date(d.licenseExpiryDate) < new Date();
            return (
              <tr key={d.id}>
                <td>
                  <Link href={'/drivers/' + d.id}>{d.name}</Link>
                </td>
                <td>
                  {d.licenseNumber} ({d.licenseCategory})
                </td>
                <td style={{ color: expired ? '#ff7c81' : undefined }}>
                  {d.licenseExpiryDate}
                  {expired ? ' · EXPIRED' : ''}
                </td>
                <td>{d.safetyScore}%</td>
                <td>{d.tripCompletionRate}%</td>
                <td>
                  <Badge status={d.status} />
                </td>
                <td>
                  <button
                    className="button"
                    onClick={() => alert('License reminder sent to ' + d.name)}
                  >
                    Send reminder
                  </button>
                  {d.status !== 'ON_TRIP' && (
                    <button
                      className="button danger"
                      onClick={() => {
                        const reason = prompt('Suspension reason');
                        if (reason)
                          set({
                            ...s,
                            drivers: s.drivers.map((x) =>
                              x.id === d.id ? { ...x, status: 'SUSPENDED' } : x,
                            ),
                          });
                      }}
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function Trips({
  s,
  user,
  own = false,
  set,
}: {
  s: State;
  user: User;
  own?: boolean;
  set?: (x: State) => void;
}) {
  const trips = own ? s.trips.filter((t) => t.driverId === user.driverId) : s.trips;
  return (
    <section className="card">
      <h2>{own ? 'My assigned trips' : 'Trip board'}</h2>
      {trips.map((t) => (
        <div className="card" style={{ margin: '10px 0' }} key={t.id}>
          <div className="row between">
            <b>{t.tripNumber}</b>
            <Badge status={t.status} />
          </div>
          <p>
            {t.source} → {t.destination}
          </p>
          <p className="sub">
            {s.vehicles.find((v) => v.id === t.vehicleId)?.name || 'Awaiting vehicle'} ·{' '}
            {s.drivers.find((d) => d.id === t.driverId)?.name || 'Awaiting driver'}
          </p>
          {own && set && t.status === 'DISPATCHED' && (
            <button
              className="button"
              onClick={() =>
                set({
                  ...s,
                  trips: s.trips.map((x) => (x.id === t.id ? { ...x, status: 'IN_PROGRESS' } : x)),
                })
              }
            >
              Start Trip
            </button>
          )}
          {own && set && t.status === 'IN_PROGRESS' && (
            <button className="button orange" onClick={() => complete(s, set, t.id)}>
              Complete Trip
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
function complete(s: State, set: (x: State) => void, id: string) {
  const t = s.trips.find((x) => x.id === id)!;
  const od = Number(prompt('Final odometer'));
  const fuel = Number(prompt('Fuel consumed (liters)'));
  const v = s.vehicles.find((v) => v.id === t.vehicleId)!;
  if (!od || !fuel || od < v.odometerKm) {
    alert('Final odometer must be at least current odometer and fuel is required.');
    return;
  }
  set({
    ...s,
    trips: s.trips.map((x) =>
      x.id === id
        ? { ...x, status: 'COMPLETED', finalOdometerKm: od, fuelConsumedLiters: fuel }
        : x,
    ),
    vehicles: s.vehicles.map((x) =>
      x.id === t.vehicleId ? { ...x, status: 'AVAILABLE', odometerKm: od } : x,
    ),
    drivers: s.drivers.map((x) => (x.id === t.driverId ? { ...x, status: 'AVAILABLE' } : x)),
  });
}
function Dispatch({ s, set, user }: { s: State; set: (x: State) => void; user: User }) {
  const [form, setForm] = useState({
    source: '',
    destination: '',
    vehicleId: '',
    driverId: '',
    cargo: '',
    distance: '',
    notes: '',
  });
  const v = s.vehicles.find((x) => x.id === form.vehicleId);
  const bad = !!v && Number(form.cargo) > v.maximumLoadKg;
  const ok =
    form.source &&
    form.destination &&
    form.source !== form.destination &&
    form.vehicleId &&
    form.driverId &&
    Number(form.cargo) > 0 &&
    Number(form.distance) > 0 &&
    !bad;
  const update = (k: string, v: string) => setForm({ ...form, [k]: v });
  const submit = (draft: boolean) => {
    if (!draft && !ok) {
      alert('Dispatch blocked: complete valid assignments and capacity.');
      return;
    }
    const t = {
      id: crypto.randomUUID(),
      tripNumber: 'TR' + String(s.trips.length + 1).padStart(3, '0'),
      source: form.source,
      destination: form.destination,
      vehicleId: form.vehicleId || undefined,
      driverId: form.driverId || undefined,
      cargoWeightKg: Number(form.cargo) || 0,
      plannedDistanceKm: Number(form.distance) || 0,
      status: (draft ? 'DRAFT' : 'DISPATCHED') as TripStatus,
      estimatedDurationMinutes: 90,
      notes: form.notes,
    };
    set({
      ...s,
      trips: [...s.trips, t],
      vehicles: s.vehicles.map((x) =>
        x.id === form.vehicleId && !draft ? { ...x, status: 'ON_TRIP' } : x,
      ),
      drivers: s.drivers.map((x) =>
        x.id === form.driverId && !draft ? { ...x, status: 'ON_TRIP' } : x,
      ),
    });
    setForm({
      source: '',
      destination: '',
      vehicleId: '',
      driverId: '',
      cargo: '',
      distance: '',
      notes: '',
    });
  };
  return (
    <>
      <Header title="Trip Dispatcher" />
      <div className="grid two">
        <section className="card">
          <h2>New trip</h2>
          <div className="form">
            <div className="formgrid">
              <label className="field">
                Source
                <input value={form.source} onChange={(e) => update('source', e.target.value)} />
              </label>
              <label className="field">
                Destination
                <input
                  value={form.destination}
                  onChange={(e) => update('destination', e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              Vehicle
              <select value={form.vehicleId} onChange={(e) => update('vehicleId', e.target.value)}>
                <option value="">Select eligible vehicle</option>
                {eligibleVehicles(s).map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name} · {x.maximumLoadKg} kg
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Driver
              <select value={form.driverId} onChange={(e) => update('driverId', e.target.value)}>
                <option value="">Select eligible driver</option>
                {eligibleDrivers(s).map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="formgrid">
              <label className="field">
                Cargo weight (kg)
                <input
                  type="number"
                  value={form.cargo}
                  onChange={(e) => update('cargo', e.target.value)}
                />
              </label>
              <label className="field">
                Distance (km)
                <input
                  type="number"
                  value={form.distance}
                  onChange={(e) => update('distance', e.target.value)}
                />
              </label>
            </div>
            {v && (
              <p className={bad ? 'notice' : 'sub'}>
                Vehicle capacity: {v.maximumLoadKg} kg · Remaining:{' '}
                {v.maximumLoadKg - Number(form.cargo || 0)} kg {bad && '· Dispatch blocked'}
              </p>
            )}
            <label className="field">
              Notes
              <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            </label>
            <div className="row">
              <button className="button" onClick={() => submit(true)}>
                Save Draft
              </button>
              <button
                className="button orange"
                disabled={!ok}
                title={!ok ? 'Complete valid trip requirements to dispatch' : ''}
                onClick={() => submit(false)}
              >
                Dispatch
              </button>
            </div>
          </div>
        </section>
        <Trips s={s} user={user} />
      </div>
    </>
  );
}
function Maintenance({ s, set }: { s: State; set: (x: State) => void }) {
  const [vehicleId, setV] = useState(''),
    [service, setService] = useState('Oil Change'),
    [cost, setCost] = useState('');
  const open = () => {
    if (!vehicleId || !Number(cost)) return alert('Select a vehicle and enter a valid cost.');
    set({
      ...s,
      maintenance: [
        ...s.maintenance,
        {
          id: crypto.randomUUID(),
          vehicleId,
          serviceType: service,
          cost: Number(cost),
          status: 'ACTIVE',
          openedAt: new Date().toISOString().slice(0, 10),
        },
      ],
      vehicles: s.vehicles.map((v) => (v.id === vehicleId ? { ...v, status: 'IN_SHOP' } : v)),
    });
    setV('');
    setCost('');
  };
  return (
    <>
      <Header title="Maintenance" />
      <div className="grid two">
        <section className="card">
          <h2>Log Service Record</h2>
          <div className="form">
            <label className="field">
              Vehicle
              <select value={vehicleId} onChange={(e) => setV(e.target.value)}>
                <option value="">Select vehicle</option>
                {s.vehicles
                  .filter((v) => v.status === 'AVAILABLE')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              Service type
              <input value={service} onChange={(e) => setService(e.target.value)} />
            </label>
            <label className="field">
              Cost
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            </label>
            <p className="sub">Opening maintenance immediately changes the vehicle to In Shop.</p>
            <button className="button orange" onClick={open}>
              Open Maintenance
            </button>
          </div>
        </section>
        <section className="card">
          <h2>Service log</h2>
          {s.maintenance.map((m) => (
            <div
              className="row between"
              style={{ borderBottom: '1px solid var(--line)', padding: '10px 0' }}
              key={m.id}
            >
              <span>
                {s.vehicles.find((v) => v.id === m.vehicleId)?.name} · {m.serviceType}
                <br />
                <small>{money(m.cost)}</small>
              </span>
              <span>
                <Badge status={m.status} />
                {m.status === 'ACTIVE' && (
                  <button
                    className="button"
                    onClick={() => {
                      if (confirm('Close maintenance?'))
                        set({
                          ...s,
                          maintenance: s.maintenance.map((x) =>
                            x.id === m.id ? { ...x, status: 'COMPLETED' } : x,
                          ),
                          vehicles: s.vehicles.map((v) =>
                            v.id === m.vehicleId && v.status !== 'RETIRED'
                              ? { ...v, status: 'AVAILABLE' }
                              : v,
                          ),
                        });
                    }}
                  >
                    Close
                  </button>
                )}
              </span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
function Financials({ s, analytics = false }: { s: State; analytics?: boolean }) {
  const fuel = s.fuel.reduce((a, x) => a + x.cost, 0),
    maint = s.maintenance.reduce((a, x) => a + x.cost, 0),
    other = s.expenses.reduce((a, x) => a + x.amount, 0),
    revenue = s.trips.reduce((a, x) => a + (x.revenue || 0), 0);
  if (analytics)
    return (
      <>
        <Header title="Analytics & Reports">
          <button className="button" onClick={() => window.print()}>
            Export PDF / Print
          </button>
        </Header>
        <div className="kpis grid">
          {[
            [
              'Fuel Efficiency',
              Math.round(
                s.trips
                  .filter((t) => t.status === 'COMPLETED')
                  .reduce((a, t) => a + t.plannedDistanceKm / (t.fuelConsumedLiters || 1), 0),
              ) + ' km/L',
            ],
            [
              'Fleet Utilization',
              Math.round(
                (s.trips.filter((t) => t.status === 'DISPATCHED' || t.status === 'IN_PROGRESS')
                  .length /
                  Math.max(1, s.vehicles.filter((v) => v.status !== 'RETIRED').length)) *
                  100,
              ) + '%',
            ],
            ['Operational Cost', money(fuel + maint)],
            [
              'Vehicle ROI',
              Math.round(
                ((revenue - fuel - maint) / s.vehicles.reduce((a, v) => a + v.acquisitionCost, 0)) *
                  100,
              ) + '%',
            ],
          ].map(([n, v]) => (
            <div className="card kpi" key={n as string}>
              <small>{n}</small>
              <div className="value">{v}</div>
            </div>
          ))}
        </div>
        <div className="grid two">
          <section className="card">
            <h2>Cost by vehicle</h2>
            {s.vehicles.map((v, i) => (
              <div key={v.id}>
                {v.name}
                <div className="chartbar" style={{ width: 95 - i * 18 + '%' }} />
              </div>
            ))}
          </section>
          <section className="card">
            <h2>Monthly revenue</h2>
            <p className="value">{money(revenue)}</p>
            <p className="sub">
              Completed-trip revenue, maintenance and fuel costs update from mock operations data.
            </p>
          </section>
        </div>
      </>
    );
  return (
    <>
      <Header title="Fuel & Expenses">
        <button className="button" onClick={() => window.print()}>
          Export CSV / Print
        </button>
      </Header>
      <div className="kpis grid">
        {[
          ['Fuel cost', fuel],
          ['Maintenance cost', maint],
          ['Toll & miscellaneous', other],
          ['Recorded expenses', fuel + maint + other],
        ].map(([n, v]) => (
          <div className="card kpi" key={n as string}>
            <small>{n}</small>
            <div className="value">{money(v as number)}</div>
          </div>
        ))}
      </div>
      <div className="grid two">
        <section className="card">
          <h2>Fuel logs</h2>
          {s.fuel.map((f) => (
            <p key={f.id}>
              {s.vehicles.find((v) => v.id === f.vehicleId)?.name} · {f.liters} L · {money(f.cost)}
            </p>
          ))}
        </section>
        <section className="card">
          <h2>Other expenses</h2>
          {s.expenses.map((e) => (
            <p key={e.id}>
              {e.category} · {money(e.amount)}
            </p>
          ))}
        </section>
      </div>
    </>
  );
}
function Settings({ set }: { set: (x: State) => void }) {
  const [theme, setTheme] = useState('dark');
  return (
    <>
      <Header title="Settings & RBAC" />
      <div className="grid two">
        <section className="card">
          <h2>General settings</h2>
          <div className="form">
            <label className="field">
              Depot name
              <input defaultValue="Gandhinagar Depot GTY" />
            </label>
            <label className="field">
              Currency
              <select defaultValue="INR">
                <option>INR</option>
              </select>
            </label>
            <label className="field">
              Timezone
              <select defaultValue="Asia/Kolkata">
                <option>Asia/Kolkata</option>
              </select>
            </label>
            <button className="button" onClick={() => alert('Settings saved')}>
              Save Changes
            </button>
            <button
              className="button"
              onClick={() => {
                document.body.classList.toggle('light');
                setTheme(theme === 'dark' ? 'light' : 'dark');
              }}
            >
              Switch to {theme === 'dark' ? 'light' : 'dark'} theme
            </button>
            <button
              className="button danger"
              onClick={() => {
                if (confirm('Reset all demo data?')) {
                  location.reload();
                }
              }}
            >
              Reset demo data
            </button>
          </div>
        </section>
      </div>
      <UserAdministration />
    </>
  );
}
function Detail({ s }: { s: State }) {
  const p = location.pathname;
  const id = p.split('/').pop()!;
  const item = p.startsWith('/fleet')
    ? s.vehicles.find((x) => x.id === id)
    : p.startsWith('/drivers')
      ? s.drivers.find((x) => x.id === id)
      : s.trips.find((x) => x.id === id);
  if (!item)
    return (
      <>
        <Header title="Not found" />
        <div className="card">This record is not available.</div>
      </>
    );
  return (
    <>
      <Header
        title={
          'Record · ' +
          ('name' in item ? item.name : 'tripNumber' in item ? item.tripNumber : 'Driver')
        }
      />
      <section className="card">
        <h2>Summary</h2>
        {Object.entries(item).map(([k, v]) => (
          <p key={k}>
            <span className="sub">{label(k)}: </span>
            {String(v)}
          </p>
        ))}
      </section>
    </>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const operations = useLiveOperations();

  useEffect(() => {
    api<CurrentUser>('/api/v1/me')
      .then((currentUser) => {
        const primaryRole = currentUser.roles[0];
        if (!primaryRole) throw new Error('No operational role is assigned.');
        setUser({
          name: currentUser.name,
          email: currentUser.email,
          role: primaryRole,
          initials: currentUser.name
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          driverId: currentUser.driverId,
          allowedPaths: allowedPaths(currentUser),
        });
      })
      .catch(() => {
        location.href = '/login';
      });
  }, []);

  const s = operations.state;
  if (!user || !s || operations.isLoading)
    return <main className="loginform">Loading TransitOps…</main>;
  if (operations.error)
    return (
      <main className="loginform">
        <h1>Unable to load operations</h1>
        <p>Check that the backend and PostgreSQL are running.</p>
      </main>
    );
  const p = location.pathname;
  if (p === '/unauthorized')
    return (
      <main className="loginform">
        <h1>Unauthorized</h1>
        <p>You do not have access to this module.</p>
        <Link href="/dashboard">Return to dashboard</Link>
      </main>
    );
  const root = '/' + p.split('/')[1];
  if (root !== '/driver' && !user.allowedPaths.includes(root)) {
    location.href = '/unauthorized';
    return null;
  }
  let child: React.ReactNode;
  if (p === '/dashboard') child = <Dashboard s={s} user={user} />;
  else if (p === '/fleet') child = <Fleet s={s} set={operations.set} />;
  else if (p === '/drivers') child = <Drivers s={s} set={operations.set} />;
  else if (p === '/trips') child = <Dispatch s={s} set={operations.set} user={user} />;
  else if (p === '/driver/my-trips') child = <Trips s={s} set={operations.set} user={user} own />;
  else if (p === '/maintenance') child = <Maintenance s={s} set={operations.set} />;
  else if (p === '/fuel-expenses') child = <Financials s={s} />;
  else if (p === '/analytics') child = <Financials s={s} analytics />;
  else if (p === '/settings') child = <Settings set={operations.set} />;
  else child = <Detail s={s} />;
  return <AppShell user={user}>{child}</AppShell>;
}
