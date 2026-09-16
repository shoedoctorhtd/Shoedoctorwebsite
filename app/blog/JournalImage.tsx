/* eslint-disable @next/next/no-img-element */
import styles from "./Journal.module.css";

// Pre-sized local WebP assets avoid a runtime image service on the Worker.
export default function JournalImage({
  name,
  alt,
  hero = false,
}: {
  name: string;
  alt: string;
  hero?: boolean;
}) {
  return (
    <div className={hero ? styles.heroImage : styles.articleImage}>
      <img
        src={`/images/blog/${name}.webp`}
        srcSet={`/images/blog/${name}-480.webp 480w, /images/blog/${name}-800.webp 800w, /images/blog/${name}.webp ${hero ? 1600 : 1200}w`}
        sizes="(max-width: 760px) calc(100vw - 36px), (min-width: 1440px) 620px, 45vw"
        alt={alt}
        width={hero ? 1600 : 1200}
        height={900}
        loading={hero ? "eager" : "lazy"}
        fetchPriority={hero ? "high" : undefined}
        decoding="async"
      />
    </div>
  );
}
