import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>AniRec - Personalized Anime Recommendations</title>
        <meta name="description" content="Get personalized anime recommendations based on your MyAnimeList profile. Discover new anime tailored to your taste with our AI-powered recommendation system." />
        <meta name="keywords" content="anime, recommendations, MyAnimeList, AI, machine learning, personalized" />
        <meta name="author" content="AniRec" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="AniRec - Personalized Anime Recommendations" />
        <meta property="og:description" content="Get personalized anime recommendations based on your MyAnimeList profile. Discover new anime tailored to your taste with our AI-powered recommendation system." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AniRec" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AniRec - Personalized Anime Recommendations" />
        <meta name="twitter:description" content="Get personalized anime recommendations based on your MyAnimeList profile. Discover new anime tailored to your taste with our AI-powered recommendation system." />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="theme-color" content="#000000" />
      </Head>

      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
