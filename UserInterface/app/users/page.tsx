import { IconChevronRight } from '@/components/ui/Icons'
import { TopUsers }         from '@/components/dashboard/TopUsers'
import { UsersClient }      from '@/components/users/UsersClient'
import { api }              from '@/lib/api'
import { serverGet }        from '@/lib/server-auth'
import type { SystemUser }  from '@/components/users/UsersClient'

export default async function UsersPage() {
  const [{ data: users, status }, topUsers] = await Promise.all([
    serverGet<SystemUser[]>('/auth/users/'),
    api.topUsers().catch(() => []),
  ])

  const accessDenied = status === 403 || status === 401
  const accounts     = users ?? []

  return (
    <>
      <div className="breadcrumb">
        Admin <IconChevronRight size={10} /> Users
      </div>
      <div className="page-head">
        <h1 className="page-title">Users</h1>
      </div>

      {accessDenied ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Access restricted</div>
          <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)' }}>Only fleet administrators can view system accounts.</p>
        </div>
      ) : (
        <>
          {/* ── KPI strip ───────────────────────────────────── */}
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="card kpi">
              <div className="kpi-label">Total accounts</div>
              <div className="kpi-num">{accounts.length}</div>
            </div>
            <div className="card kpi">
              <div className="kpi-label">Admins</div>
              <div className="kpi-num">{accounts.filter(u => u.role === 'admin').length}</div>
            </div>
            <div className="card kpi">
              <div className="kpi-label">Operators</div>
              <div className="kpi-num">{accounts.filter(u => u.role === 'operator').length}</div>
            </div>
            <div className="card kpi">
              <div className="kpi-label">Viewers</div>
              <div className="kpi-num">{accounts.filter(u => u.role === 'viewer').length}</div>
            </div>
            <div className="card kpi">
              <div className="kpi-label">Print users · 30d</div>
              <div className="kpi-num">{topUsers.length}</div>
            </div>
          </div>

          {/* ── System accounts table + print leaderboard ───── */}
          <div className="dash-grid">
            <UsersClient initialUsers={accounts} />
            <TopUsers users={topUsers} />
          </div>
        </>
      )}
    </>
  )
}
