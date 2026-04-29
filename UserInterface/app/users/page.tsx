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

  return (
    <>
      <div className="breadcrumb">
        Admin <IconChevronRight size={10} /> Users
      </div>
      <div className="page-head">
        <h1 className="page-title">Users</h1>
      </div>

      {accessDenied ? (
        <div className="card" style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--neutral-fg-3)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--neutral-fg-1)' }}>Access restricted</div>
          <p style={{ fontSize: 13 }}>Only fleet administrators can view system accounts.</p>
        </div>
      ) : (
        <div className="dash-grid">
          <UsersClient initialUsers={users ?? []} />
          <TopUsers users={topUsers} />
        </div>
      )}
    </>
  )
}
