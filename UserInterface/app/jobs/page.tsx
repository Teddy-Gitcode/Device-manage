import { IconChevronRight } from '@/components/ui/Icons'
import { JobsClient }        from '@/components/pages/JobsClient'
import { api }               from '@/lib/api'

export default async function JobsPage() {
  const jobs = await api.jobs()

  return (
    <>
      <div className="breadcrumb">
        Operate <IconChevronRight size={10} /> Print jobs
      </div>
      <div className="page-head">
        <h1 className="page-title">Print jobs</h1>
        <button className="btn secondary">Export log</button>
      </div>

      <JobsClient initialJobs={jobs} />
    </>
  )
}
