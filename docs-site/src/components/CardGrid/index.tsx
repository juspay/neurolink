import type React from "react";
import styles from "./CardGrid.module.css";

interface CardGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}

export function CardGrid({ children, cols = 3 }: CardGridProps) {
  return (
    <div className={styles.grid} data-cols={cols}>
      {children}
    </div>
  );
}

interface CardGridItemProps {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function CardGridItem({
  title,
  href,
  icon,
  children,
}: CardGridItemProps) {
  const content = (
    <>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.description}>{children}</div>
    </>
  );

  if (href) {
    return (
      <a href={href} className={styles.card}>
        {content}
      </a>
    );
  }

  return <div className={styles.card}>{content}</div>;
}
