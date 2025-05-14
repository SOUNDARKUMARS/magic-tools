import { useEffect, useState } from "react";

export function useTypewriter(html, speed = 20) {
  const [displayedHtml, setDisplayedHtml] = useState("");
  useEffect(() => {
    if (!html) return;

    let i = 0;
    const tempEl = document.createElement("div");
    tempEl.innerHTML = html;
    const fullText = tempEl.textContent || "";

    const interval = setInterval(() => {
      setDisplayedHtml(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [html, speed]);

  return displayedHtml;
}
