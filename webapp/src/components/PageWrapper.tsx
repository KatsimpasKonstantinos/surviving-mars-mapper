import type { ReactNode } from 'react';

type PageWrapperProps = {
  children: ReactNode;
};

/** Fades/slides a page in on navigation (see .page-enter in index.css). */
export default function PageWrapper({ children }: PageWrapperProps) {
  return <div className="page-enter">{children}</div>;
}
