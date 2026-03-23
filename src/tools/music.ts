import { ToolInstance } from "./types.js";
import { logger } from "../utils/logger.js";

/**
 * Tool to search and fetch music links.
 */
export const searchMusic: ToolInstance = {
  schema: {
    type: "function",
    function: {
      name: "search_and_play_music",
      description: "Search for a song and return a stream/download link for the user.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The name of the song or artist to search for.",
          },
        },
        required: ["query"],
      },
    },
  },
  execute: async ({ query }) => {
    logger.info(`Searching music for: ${query}`);
    try {
      // 1. Search for the song
      const searchUrl = `https://musicapi.x007.workers.dev/search?q=${encodeURIComponent(query)}&searchEngine=seevn`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json() as any;

      if (!searchData.response || searchData.response.length === 0) {
        return "Désolé, je n'ai trouvé aucune musique correspondant à cette recherche.";
      }

      const song = searchData.response[0];
      const songId = song.id;

      // 2. Fetch the actual download/stream link
      const fetchUrl = `https://musicapi.x007.workers.dev/fetch?id=${songId}`;
      const fetchRes = await fetch(fetchUrl);
      const fetchData = await fetchRes.json() as any;

      if (fetchData.status !== 200 || !fetchData.response) {
        return `J'ai trouvé "${song.title}", mais je n'ai pas pu récupérer le lien de lecture.`;
      }

      return `J'ai trouvé la musique : **${song.title}**\n\nVoici le lien pour l'écouter ou la télécharger :\n${fetchData.response}`;
    } catch (error: any) {
      logger.error("Music tool error:", error.message);
      return "Une erreur est survenue lors de la recherche de musique.";
    }
  },
};
