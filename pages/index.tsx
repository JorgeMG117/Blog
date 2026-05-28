import { useEffect } from "react";
import type { GetStaticProps } from "next";
import Head from "next/head";
import Script from "next/script";
import fs from "fs";
import path from "path";

interface IndexProps {
  bodyContent: string;
}

export default function Index({ bodyContent }: IndexProps) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const htmlClasses = ["scroll-smooth"];
    const bodyClasses = [
      "bg-slate-900",
      "leading-relaxed",
      "text-slate-400",
      "antialiased",
      "selection:bg-teal-300",
      "selection:text-teal-900",
    ];

    html.classList.add(...htmlClasses);
    body.classList.add(...bodyClasses);

    return () => {
      html.classList.remove(...htmlClasses);
      body.classList.remove(...bodyClasses);
    };
  }, []);

  useEffect(() => {
    const navLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("nav ul li a[href^='#']")
    );
    const sections = navLinks
      .map((link) => {
        const href = link.getAttribute("href");
        return href ? document.getElementById(href.slice(1)) : null;
      })
      .filter((section): section is HTMLElement => section !== null);

    const setActiveLink = (activeId: string) => {
      navLinks.forEach((link) => {
        const isActive = link.hash === `#${activeId}`;
        link.classList.toggle("active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    const handleScroll = () => {
      const activeSection =
        sections.findLast(
          (section) => section.getBoundingClientRect().top <= window.innerHeight / 3
        ) ?? sections[0];

      if (activeSection) {
        setActiveLink(activeSection.id);
      }
    };

    const handleClick = (event: MouseEvent) => {
      const link = event.currentTarget as HTMLAnchorElement;
      const target = document.getElementById(link.hash.slice(1));

      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", link.hash);
      setActiveLink(target.id);
    };

    navLinks.forEach((link) => {
      link.addEventListener("click", handleClick);
    });
    document.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      navLinks.forEach((link) => {
        link.removeEventListener("click", handleClick);
      });
      document.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>Jorge Martinez</title>
        <meta
          name="description"
          content="Jorge Martinez is a software engineer who crafts elegant solutions through high-quality software."
        />
        <meta name="image" content="https://jorgemartinezgil.com/profile.jpg" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="Jorge Martinez Gil" />
        <meta property="og:type" content="website" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:creator" content="@KoreDump" />
        <meta property="twitter:site" content="@KoreDump" />
        <meta property="og:title" content="Jorge Martinez Gil" />
        <meta
          property="og:description"
          content="Jorge Martinez is a software engineer who crafts elegant solutions through high-quality software."
        />
        <meta property="og:url" content="https://jorgemartinezgil.com/" />
        <meta property="og:image" content="https://jorgemartinezgil.com/profile.jpg" />
        <meta property="twitter:title" content="Jorge Martinez Gil" />
        <meta
          property="twitter:description"
          content="Jorge Martinez is a software engineer who crafts elegant solutions through high-quality software."
        />
        <meta property="twitter:url" content="https://jorgemartinezgil.com/" />
        <meta property="twitter:image" content="https://jorgemartinezgil.com/profile.jpg" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link
          rel="preload"
          as="image"
          href="/profile.jpg"
          imageSrcSet="/profile.avif 1x, /profile.webp 1x, /profile.jpg 1x"
          fetchPriority="high"
        />
        <link rel="icon" href="/favicon.ico" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="theme-color" content="#0f172a" />
        <meta
          name="google-site-verification"
          content="DCl7VAf9tcz6eD9gb67NfkNnJ1PKRNcg8qQiwpbx9Lk"
        />
      </Head>

      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-4FFCWEC2WB"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag('js', new Date());
gtag('config', 'G-4FFCWEC2WB', {
  page_path: window.location.pathname,
});`}
      </Script>

      <style jsx global>{`
        section[data-cv-section] {
          content-visibility: auto;
          contain-intrinsic-size: 800px 800px;
        }

        @font-face {
          font-family: "__inter_20b187";
          src: url("/static/media/730e8169368baf37-s.p.woff2") format("woff2");
          font-display: swap;
        }

        @font-face {
          font-family: "__inter_20b187";
          src: url("/static/media/f1f0c35b32161446-s.p.woff2") format("woff2");
          font-display: swap;
          font-weight: 400;
          font-style: normal;
        }

        @font-face {
          font-family: "__inter_20b187";
          src: url("/static/media/dc792b508e6f91c7-s.p.woff2") format("woff2");
          font-display: swap;
          font-weight: 600;
          font-style: normal;
        }
      `}</style>

      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </>
  );
}

export const getStaticProps: GetStaticProps<IndexProps> = async () => {
  const filePath = path.join(process.cwd(), "public", "index.html");
  const htmlContent = fs.readFileSync(filePath, "utf8");
  const bodyStart = htmlContent.indexOf("<body");
  const bodyTagEnd = htmlContent.indexOf(">", bodyStart) + 1;
  const bodyEnd = htmlContent.lastIndexOf("</body>");
  let bodyContent = htmlContent.slice(bodyTagEnd, bodyEnd);

  const nextWrapper = "<div id=\"__next\">";
  const nextIndex = bodyContent.indexOf(nextWrapper);
  if (nextIndex !== -1) {
    const nextContentStart = nextIndex + nextWrapper.length;
    const nextContentEnd = bodyContent.lastIndexOf("</div>");
    bodyContent = bodyContent.slice(nextContentStart, nextContentEnd);
  }

  bodyContent = bodyContent.replace(
    /<script[^>]*static\/js\/script\.js[^>]*><\/script>/,
    ""
  );

  return {
    props: {
      bodyContent,
    },
  };
};
