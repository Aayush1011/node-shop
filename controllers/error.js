exports.get404 = (req, res, next) => {
  res.render("404", {
    pageTitle: "Page Not Found",
    path: req.url,
    username: res.locals.isAuthenticated ? req.user.name : "",
    isAuthenticated: req.session.isLoggedIn,
  });
};

exports.get500 = (req, res, next) => {
  res.render("500", {
    pageTitle: "Error",
    path: req.url,
    username: res.locals.isAuthenticated ? req.user.name : "",
    isAuthenticated: req.session.isLoggedIn,
  });
};
