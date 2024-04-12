// Require necessary modules
const express = require('express');
const clientSessions = require('client-sessions');
const authData = require('./modules/auth-service'); // Import auth-service.js
const unCountryData = require("./modules/unCountries");

// Create Express app
const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// Add client-sessions middleware
app.use(
  clientSessions({
    cookieName: 'session',
    secret: 'o6LjQ5EVNC28ZgK64hDELM18ScpFQr',
    duration: 2 * 60 * 1000,
    activeDuration: 1000 * 60,
  })
);

// Custom middleware to expose session data to all templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Define ensureLogin middleware
function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

// Routes

// Route for login form
app.get("/login", (req, res) => {
  res.render("login");
});

// Route for register form
app.get("/register", (req, res) => {
  res.render("register");
});

// Route for registering a new user
app.post("/register", async (req, res) => {
  try {
    await authData.registerUser(req.body);
    res.render("register", { successMessage: "User created" });
  } catch (err) {
    res.render("register", { errorMessage: err, userName: req.body.userName });
  }
});

// Route for logging in
app.post("/login", async (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  try {
    const user = await authData.checkUser(req.body);
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
    };
    res.redirect("/un/countries");
  } catch (err) {
    res.render("login", { errorMessage: err, userName: req.body.userName });
  }
});

// Route for logging out
app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect('/');
});

// Route for user history
app.get("/userHistory", ensureLogin, (req, res) => {
  res.render("userHistory");
});

// Route for adding UN Country
app.post("/un/addCountry", ensureLogin, async (req, res) => {
  try {
    await unCountryData.addCountry(req.body);
    res.redirect("/un/countries");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

// Route for editing UN Country
app.post("/un/editCountry", ensureLogin, async (req, res) => {
  try {
    await unCountryData.editCountry(req.body.a2code, req.body);
    res.redirect("/un/countries");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

// Route for deleting UN Country
app.get("/un/deleteCountry/:code", ensureLogin, async (req, res) => {
  try {
    await unCountryData.deleteCountry(req.params.code);
    res.redirect("/un/countries");
  } catch (err) {
    res.status(500).render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

// Start the server
unCountryData.initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`Server is running on port ${HTTP_PORT}`);
    });
  })
  .catch((err) => {
    console.log(`Unable to start server: ${err}`);
  });

// 404 middleware
app.use((req, res, next) => {
  res.status(404).render("404", { message: "I'm sorry, we're unable to find what you're looking for" });
});
