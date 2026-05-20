export default function RequiredFieldBadge({ missing }: { missing?: boolean }) {
  if (!missing) return null;
  return <span className="storiq-badge storiq-badge-fail">Required</span>;
}
