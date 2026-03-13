const styles = {
  active:     'bg-yellow-100 text-yellow-700',
  inProgress: 'bg-blue-100 text-blue-700',
  done:       'bg-green-100 text-green-700',
}

const labels = {
  active:     'Active',
  inProgress: 'In Progress',
  done:       'Done',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}
