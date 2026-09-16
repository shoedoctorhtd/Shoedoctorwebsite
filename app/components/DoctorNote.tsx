import type { ReactNode } from "react";
import styles from "./DoctorNote.module.css";

export default function DoctorNote({ children }: { children: ReactNode }) {
  return (
    <aside className={styles.note} aria-label="Doctor's note">
      <div className={styles.label}>
        <span aria-hidden="true">+</span> Doctor&apos;s note
      </div>
      <div className={styles.advice}>{children}</div>
    </aside>
  );
}
