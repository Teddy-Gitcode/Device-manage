import { IconChevronRight } from '@/components/ui/Icons'
import { TopUsers }          from '@/components/dashboard/TopUsers'
import { api }               from '@/lib/api'

export default async function UsersPage() {
  const topUsers = await api.topUsers()

  const MOCK_SYSTEM_USERS = [
    { username: 'admin',       email: 'admin@ketepa.co.ke',      role: 'Admin',    lastSeen: '2 min ago' },
    { username: 'fleet_ops',   email: 'ops@ketepa.co.ke',        role: 'Operator', lastSeen: '1h ago' },
    { username: 'it_support',  email: 'it@ketepa.co.ke',         role: 'Operator', lastSeen: '3h ago' },
    { username: 'viewer_fin',  email: 'finance@ketepa.co.ke',    role: 'Viewer',   lastSeen: '1d ago' },
  ]

  const ROLE_BADGE: Record<string, string> = { Admin: 'danger', Operator: 'info', Viewer: 'neutral' }

  return (
    <>
      <div className="breadcrumb">
        Admin <IconChevronRight size={10} /> Users
      </div>
      <div className="page-head">
        <h1 className="page-title">Users</h1>
        <button className="btn primary">Add user</button>
      </div>

      <div className="dash-grid">
        {/* System accounts */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '14px 16px', marginBottom: 0 }}>
            <div className="card-title">System accounts</div>
            <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{MOCK_SYSTEM_USERS.length} accounts</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SYSTEM_USERS.map(u => (
                <tr key={u.username} style={{ cursor: 'default' }}>
                  <td style={{ fontWeight: 500 }}>{u.username}</td>
                  <td style={{ color: 'var(--neutral-fg-3)' }}>{u.email}</td>
                  <td>
                    <span className={'badge ' + ROLE_BADGE[u.role]}>
                      <span className="dot" />{u.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--neutral-fg-3)', fontSize: 11 }}>{u.lastSeen}</td>
                  <td>
                    <button className="btn subtle small">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top print users */}
        <TopUsers users={topUsers} />
      </div>
    </>
  )
}
