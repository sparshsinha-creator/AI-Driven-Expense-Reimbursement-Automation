export default function StatusBadge({ tone, children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
