import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="theme-color" content="#000000" />
        <meta charSet="UTF-8" />
      </Head>

      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
