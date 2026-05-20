export default function WizardStep({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="storiq-card storiq-card--padding">
      <div className="storiq-card-header">
        <h1 className="storiq-section-title" style={{ fontSize: "1.25rem" }}>
          {title}
        </h1>
        <p className="storiq-section-subtitle">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
