const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const BASE_URL = "https://animoon.me";
const VIMALKING_API = "https://vimal.animoon.me/api/az-list";
const HIANIME_EPISODES_API = "https://hianimes.animoon.me/anime/episodes";

// Function to launch Puppeteer and visit a page
const visitPage = async (url, page) => {
  console.log(`Visiting: ${url}`);

  try {
    // Navigate to the page and wait for it to load
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Get the page content
    const content = await page.content();

    // Parse the HTML content with Cheerio (optional)
    const $ = cheerio.load(content);

    // Example: Scraping title using Cheerio
    const title = $('title').text();
    console.log('Page Title:', title);
  } catch (error) {
    console.error(`Error visiting page ${url}:`, error.message);
  }
};

// Function to visit all anime pages
const visitAnimePages = async (browser) => {
  console.log("Fetching anime list...");

  const page = await browser.newPage();
  const firstPage = await fetchURL(`${VIMALKING_API}?page=1`);
  if (!firstPage) return;

  const totalPages = firstPage.results.totalPages;

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const animeListData = await fetchURL(`${VIMALKING_API}?page=${pageNumber}`);
    if (!animeListData) continue;

    const animeList = animeListData.results.data;
    for (const anime of animeList) {
      const animeId = anime.data_id;
      const animeUrl = `${BASE_URL}/watch${animeId}`;
      await visitPage(animeUrl, page);

      const episodesData = await fetchURL(`${HIANIME_EPISODES_API}${animeId}`);
      if (!episodesData) continue;

      for (const episode of episodesData.episodes) {
        const episodeUrl = `${BASE_URL}/watch/${episode.episodeId}`;
        await visitPage(episodeUrl, page);
      }
    }
  }
};

// Function to visit all genre pages
const visitGenrePages = async (browser) => {
  console.log("Visiting genre pages...");

  const genres = [
    "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Romance",
    "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller", "Vampire"
  ];

  const page = await browser.newPage();

  for (const genre of genres) {
    const genreUrl = `${BASE_URL}/genre?id=${genre}&name=${genre}`;
    await visitPage(genreUrl, page);
  }
};

// Function to visit all category pages
const visitCategoryPages = async (browser) => {
  console.log("Visiting category pages...");

  const categories = [
    "most-favorite", "most-popular", "subbed-anime", "dubbed-anime",
    "recently-updated", "recently-added", "top-upcoming", "top-airing",
    "movie", "special", "ova", "ona", "tv", "completed"
  ];

  const page = await browser.newPage();

  for (const category of categories) {
    const categoryUrl = `${BASE_URL}/grid?name=${category}`;
    await visitPage(categoryUrl, page);
  }
};

// Fetch a URL with error handling
const fetchURL = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url} - ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error(`Error visiting ${url}:`, error.message);
    return null;
  }
};

// Main function to run all tasks
const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Add this line if running as root
  });

  try {
    console.log("Starting page visits...");
    await visitAnimePages(browser);
    await visitGenrePages(browser);
    await visitCategoryPages(browser);
    console.log("All pages visited successfully!");
  } catch (error) {
    console.error("Error in visiting pages:", error);
  } finally {
    await browser.close();
  }
};

// Restart after visiting all pages
const startVisitLoop = async () => {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      await main();
      console.log("All pages visited, restarting...");
    } catch (error) {
      console.error("Error in visiting pages:", error);
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`Retrying (${retryCount}/${maxRetries})...`);
      } else {
        console.log("Max retries reached. Stopping.");
      }
    }
  }
};

// Start the loop
startVisitLoop();
