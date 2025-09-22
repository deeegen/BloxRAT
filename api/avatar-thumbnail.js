export default async function handler(req, res) {
  // Destructure query params
  let { mode, responseType = "json", placeId, userId, type = "avatar", isCircular = false, size = 420, format = "Png" } = req.query;

  // Ensure parameters are strings if arrays
  if (Array.isArray(mode)) mode = mode[0];
  if (Array.isArray(responseType)) responseType = responseType[0];
  if (Array.isArray(placeId)) placeId = placeId[0];
  if (Array.isArray(userId)) userId = userId[0];
  if (Array.isArray(type)) type = type[0];
  if (Array.isArray(isCircular)) isCircular = isCircular[0] === "true";
  if (Array.isArray(size)) size = parseInt(size[0], 10);
  if (Array.isArray(format)) format = format[0];

  if (!mode) {
    return res.status(400).json({ error: "Mode not specified! Use 'game' or 'user'" });
  }

  try {
    // ---------- GAME MODE ----------
    if (mode === "game") {
      if (!placeId) {
        return res.status(400).json({ error: "Place ID not specified!" });
      }

      const gameDetailsUrl = `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`;
      const gameDetailsResponse = await fetch(gameDetailsUrl);

      if (!gameDetailsResponse.ok) {
        return res.status(404).json({ error: "Game details not found" });
      }

      const gameDetails = await gameDetailsResponse.json();
      const gameData = gameDetails[0];

      if (responseType === "json") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(200).json({
          placeId: gameData.id,
          name: gameData.name,
          description: gameData.description,
          visits: gameData.visits,
          favorites: gameData.favoritesCount,
          url: `https://www.roblox.com/games/${gameData.id}`,
        });
      }

      return res.status(400).json({ error: "Invalid response type. Only 'json' is supported for games." });
    }

    // ---------- USER MODE ----------
    if (mode === "user") {
      if (!userId) {
        return res.status(400).json({ error: "User ID not specified!" });
      }

      const thumbUrl = `https://thumbnails.roblox.com/v1/users/${type}?userIds=${userId}&size=${size}x${size}&format=${format}&isCircular=${isCircular}`;
      const userUrl = `https://users.roblox.com/v1/users/${userId}`;

      const [thumbRes, userRes] = await Promise.all([fetch(thumbUrl), fetch(userUrl)]);
      const thumbJson = await thumbRes.json();
      const thumbData = thumbJson?.data?.[0];

      if (!thumbData || !thumbData.imageUrl) {
        return res.status(404).json({ error: "Thumbnail data not found" });
      }

      // IMAGE RESPONSE
      if (responseType === "image") {
        const imageResponse = await fetch(thumbData.imageUrl);
        const contentType = imageResponse.headers.get("content-type");
        const buffer = await imageResponse.arrayBuffer();

        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        res.setHeader("Content-Type", contentType);
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(200).send(Buffer.from(buffer));
      }

      // JSON RESPONSE
      if (responseType === "json") {
        if (!userRes.ok) {
          return res.status(404).json({ error: "User info not found" });
        }

        const userJson = await userRes.json();
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(200).json({
          userId: userJson.id,
          username: userJson.name,
          isBanned: userJson.isBanned,
          profileInfo: {
            created: userJson.created,
            hasVerifiedBadge: userJson.hasVerifiedBadge,
            displayName: userJson.displayName,
            description: userJson.description,
          },
          avatarThumbnail: {
            imageUrl: thumbData.imageUrl,
            type,
            size,
            isCircular,
            format
          }
        });
      }

      return res.status(400).json({ error: "Invalid response type for user" });
    }

    return res.status(400).json({ error: "Invalid mode. Use 'game' or 'user'." });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch from Roblox", details: error.message });
  }
}
