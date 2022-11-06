const fileHelper = require("../util/file");

const { validationResult } = require("express-validator");

const Product = require("../models/product");

exports.getAddProduct = (req, res, next) => {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  Product.find({ userId: req.user._id })
    .then((products) => {
      res.render("admin/add-product", {
        prods: products ? products : [],
        path: "/admin" + req.url,
        pageTitle: "Add Products",
        username: res.locals.isAuthenticated ? req.user.name : "",
        errorMessage: [],
        oldInput: { title: "", imageUrl: "", price: "", description: "" },
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postAddProduct = (req, res, next) => {
  const { title, price, description } = req.body;
  const image = req.file;
  const errors = validationResult(req);
  const newError = {
    msg: "Attached file is not an image",
    param: "image",
  };
  if (!errors.isEmpty() || !image) {
    if (!image) {
      errors.errors.push(newError);
    }
    return res.status(422).render("admin/add-product", {
      prods: [],
      path: "/admin" + req.url,
      pageTitle: "Add Products",
      username: res.locals.isAuthenticated ? req.user.name : "",
      errorMessage: errors.array(),
      oldInput: { title, price, description },
    });
  }

  const imageUrl = image.path;
  const product = new Product({
    title,
    imageUrl,
    price,
    description,
    userId: req.user,
  });
  product
    .save()
    .then(() => {
      console.log("Created Product");
      res.redirect("/shop");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit === "true";
  if (!editMode) return res.redirect("/");
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) return res.redirect("/");
      res.render("admin/edit-product", {
        path: req.url,
        pageTitle: "Edit Product",
        username: res.locals.isAuthenticated ? req.user.name : "",
        editing: editMode,
        product: product,
        errorMessage: [],
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const { title, price, description } = req.body;
  const image = req.file;
  const prodId = req.body.productId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      path: "/admin" + req.url,
      pageTitle: "Edit Products",
      errorMessage: errors.array(),
      username: res.locals.isAuthenticated ? req.user.name : "",
      product: { title, price, description, _id: prodId },
    });
  }
  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString())
        return res.redirect("/admin/products");
      product.title = title;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      product.price = price;
      product.description = description;
      return product.save().then(() => {
        console.log("UPDATED PRODUCT");
        res.redirect("/admin/products");
      });
    })

    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return next(new Error("Product not found."));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log("DESTROYED PRODUCT");
      res.status(200).json({ message: "Success" });
    })
    .catch((err) => {
      res.status(500).json({ message: "Deleting Product Failed" });
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        username: res.locals.isAuthenticated ? req.user.name : "",
        path: "/admin" + req.url,
        pageTitle: "Admin Products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
