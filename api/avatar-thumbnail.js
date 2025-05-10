export default async function handler(req, res) {
  const {
    userId,
    type = "avatar",
    isCircular = false,
    size = 420,
    format = "Png",
    responseType = "image"
  } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID not specified!" });
  }

  const thumbUrl = `https://thumbnails.roblox.com/v1/users/${type}?userIds=${userId}&size=${size}x${size}&format=${format}&isCircular=${isCircular}`;
  const userUrl = `https://users.roblox.com/v1/users/${userId}`;

  try {
    // Fetch both thumbnail and user info in parallel
    const [thumbRes, userRes] = await Promise.all([
      fetch(thumbUrl),
      fetch(userUrl)
    ]);

    const thumbJson = await thumbRes.json();
    const thumbData = thumbJson?.data?.[0];

    if (!thumbData || !thumbData.imageUrl) {
      return res.status(404).json({ error: "Thumbnail data not found" });
    }

    if (responseType == "image") {
      const imageResponse = await fetch(thumbData.imageUrl);
      const contentType = imageResponse.headers.get("content-type");
      const buffer = await imageResponse.arrayBuffer();

      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).send(Buffer.from(buffer));
    }

    if (responseType == "json") {
      if (!userRes.ok) {
        return res.status(404).json({ error: "User info not found" });
      }

      const userJson = await userRes.json();

      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).json({
        userId: userJson.id,
        username: userJson.name,
        displayName: userJson.displayName,
        avatarThumbnail: {
          customImageUrl: thumbUrl,
          imageUrl: thumbData.imageUrl,
          type,
          size,
          format,
          isCircular
        }
      });
    }

    res.status(400).json({ error: "Invalid response type" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch from Roblox", details: error.message });
  }
}
