import "@/styles/globals.css";
import Head from "next/head";
import Script from "next/script";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {/* Load the GA script from Google */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-LRXXP8R8JY"
        strategy="afterInteractive"
      />
      {/* Inline GA initialization script */}
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-LRXXP8R8JY');
          `,
        }}
      />
      <Component {...pageProps} />
    </>
  );
}
