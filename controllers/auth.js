const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator");

const User = require("../models/user");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: req.url,
    pageTitle: "Login",
    username: "",
    errorMessage: [],
    oldInput: { email: "", password: "" },
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: req.url,
    pageTitle: "Signup",
    username: "",
    errorMessage: [],
    oldInput: { email: "", name: "", password: "", confirmPassword: "" },
  });
};

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  const newError = {
    msg: "Invalid email or password.",
    param: "",
  };
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: req.url,
      pageTitle: "Login",
      username: "",
      errorMessage: errors.array(),
      oldInput: { email, password },
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        errors.errors.push(newError);
        return res.status(422).render("auth/login", {
          path: req.url,
          pageTitle: "Login",
          username: "",
          oldInput: { email, password },
          errorMessage: errors.array(),
        });
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          errors.errors.push(newError);
          return res.status(422).render("auth/login", {
            path: req.url,
            pageTitle: "Login",
            username: "",
            oldInput: { email, password },
            errorMessage: errors.array(),
          });
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const { email, password, name } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: req.url,
      pageTitle: "Signup",
      errorMessage: errors.array(),
      username: "",
      oldInput: {
        email,
        password,
        name,
        confirmPassword: req.body.confirmPassword,
      },
    });
  }
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        name: name,
        cart: { items: [] },
      });
      user.save();
    })
    .then(() => {
      res.redirect("/login");
      return transporter.sendMail({
        to: email,
        from: "rameshluitel1234@outlook.com",
        subject: "Signup succeded",
        html: "<h1>Successfully signed up!</h1>",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  res.render("auth/reset", {
    path: req.url,
    username: "",
    pageTitle: "Reset Password",
    errorMessage: message.length > 0 ? message[0] : null,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with provided email found.");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save().then(() => {
          res.redirect("/");
          transporter
            .sendMail({
              to: req.body.email,
              from: "rameshluitel1234@outlook.com",
              subject: "Password reset",
              html: `
              <p>You requested a password resset</p>
              <p>Click this <a href="http://localhost:5000/reset/${token}">link</a> to set a new password.</p>
            `,
            })
            .catch((err) => console.log(err));
        });
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      let message = req.flash("error");
      res.render("auth/new-password", {
        path: req.url,
        pageTitle: "Set New Password",
        username: "",
        errorMessage: message.length > 0 ? message[0] : null,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const { password, userId, confirmPassword, passwordToken } = req.body;
  let resetUser;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render(`auth/new-password`, {
      path: req.url,
      pageTitle: "Set New Password",
      username: "",
      errorMessage: errors.array(),
      userId,
      passwordToken,
      oldInput: { confirmPassword, password },
    });
  }

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(password, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(() => {
      res.redirect("/login");
      transporter.sendMail({
        to: resetUser.email,
        from: "rameshluitel1234@outlook.com",
        subject: "Password changed",
        html: "<h1>Password successfully changed</h1>",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
