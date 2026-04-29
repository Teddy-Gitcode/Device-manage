import { IconChevronRight } from '@/components/ui/Icons'
import { DevicesClient }    from '@/components/pages/DevicesClient'
import { DevicesActions }   from '@/components/pages/DevicesActions'
import { api }              from '@/lib/api'
import { normalizeDevices } from '@/lib/normalize'

export default async function DevicesPage() {
  const raw = await api.printers().catch(() => [])
  const devices = normalizeDevices(raw as Parameters<typeof normalizeDevices>[0])

  return (
    <>
      <div className="breadcrumb">
        Monitor <IconChevronRight size={10} /> Devices
      </div>
      <div className="page-head">
        <h1 className="page-title">Devices</h1>
        <DevicesActions />
      </div>

      <DevicesClient devices={devices} />
    </>
  )
}
