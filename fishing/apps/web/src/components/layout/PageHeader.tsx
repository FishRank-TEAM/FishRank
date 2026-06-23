type Props = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export default function PageHeader({ title, description, children }: Props) {
  return (
    <header className="site-page-header">
      <div className="site-container site-page-header-inner">
        <div>
          <h1 className="site-page-title">{title}</h1>
          {description && <p className="site-page-desc">{description}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}
