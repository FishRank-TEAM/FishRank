import Link from 'next/link';

type Props = {
  href: string;
  label: string;
};

export default function PageBackLink({ href, label }: Props) {
  return (
    <Link href={href} className="page-back-link">
      ← {label}
    </Link>
  );
}
