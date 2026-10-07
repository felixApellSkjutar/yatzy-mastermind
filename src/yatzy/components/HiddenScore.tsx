import { useEffect, useState } from "react";

/** Shows a value blurred until `hidden` is false; click reveals it for `revealSeconds`. */
export function HiddenScore({
  value,
  hidden,
  revealSeconds,
  className = "",
}: {
  value: number;
  hidden: boolean;
  revealSeconds: number;
  className?: string;
}) {
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    if (!peek) return;
    const t = setTimeout(() => setPeek(false), revealSeconds * 1000);
    return () => clearTimeout(t);
  }, [peek, revealSeconds]);

  const blurred = hidden && !peek;
  return (
    <button
      type="button"
      onClick={() => hidden && setPeek(true)}
      title={blurred ? "Click to peek" : undefined}
      className={`w-full select-none font-mono ${blurred ? "score-blur cursor-pointer" : ""} ${className}`}
    >
      {value}
    </button>
  );
}
