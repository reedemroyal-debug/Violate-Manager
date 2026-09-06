require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "violate-dev-secret",
  resave: false,
  saveUninitialized: false
}));

async function discord(url, token) {
  const r = await fetch(url, {
    headers: {
      Authorization: token
    }
  });

  if (!r.ok) {
    throw new Error(`Discord API ${r.status}`);
  }

  return r.json();
}

app.get("/", async (req, res) => {
  if (!req.session.user) {
    return res.render("index", {
      user: null,
      guilds: []
    });
  }

  try {
    const userGuilds = await discord(
      "https://discord.com/api/users/@me/guilds",
      `Bearer ${req.session.accessToken}`
    );

    const botGuilds = await discord(
      "https://discord.com/api/users/@me/guilds",
      `Bot ${process.env.DISCORD_TOKEN}`
    );

    const botIds = new Set(botGuilds.map(g => g.id));

    const guilds = userGuilds.filter(g =>
      botIds.has(g.id)
    );

    res.render("index", {
      user: req.session.user,
      guilds
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load servers.");
  }
});

app.get("/login", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds"
  });

  res.redirect(
    `https://discord.com/oauth2/authorize?${params}`
  );
});

app.get("/auth/callback", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) return res.redirect("/");

    const body = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI
    });

    const tokenRes = await fetch(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body
      }
    );

    const token = await tokenRes.json();

    if (!token.access_token) {
      return res.status(401).send(
        "Discord authentication failed."
      );
    }

    const userRes = await fetch(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization:
            `Bearer ${token.access_token}`
        }
      }
    );

    const user = await userRes.json();

    req.session.user = user;
    req.session.accessToken = token.access_token;

    res.redirect("/");

  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth error.");
  }
});

app.get("/server/:id", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  try {
    const guilds = await discord(
      "https://discord.com/api/users/@me/guilds",
      `Bearer ${req.session.accessToken}`
    );

    const guild = guilds.find(
      g => g.id === req.params.id
    );

    if (!guild) {
      return res.status(403).send(
        "You don't have access to this server."
      );
    }

    res.render("server", {
      user: req.session.user,
      guild
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load server.");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.listen(PORT, () => {
  console.log(
    `🌐 VIOLATE Dashboard: http://localhost:${PORT}`
  );
});
