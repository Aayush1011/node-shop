const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

// /admin/add-product => GET
router.get("/add-product", isAuth, adminController.getAddProduct);

router.get("/products", isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  [
    body("title", "Title should be atleast 3 characters long.")
      .isLength({ min: 3 })
      .trim(),
    body("price", "Price field cannot be empty").notEmpty(),
    body(
      "description",
      "Description should be atleast 5 characters long."
    ).isLength({ min: 3 }),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  [
    body("title", "Title should be atleast 3 characters long.")
      .isLength({ min: 3 })
      .trim(),
    body("price", "Price field cannot be empty").notEmpty(),
    body(
      "description",
      "Description should be atleast 5 characters long."
    ).isLength({ min: 3 }),
  ],
  isAuth,
  adminController.postEditProduct
);

router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
