const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/category.controller");

router.get("/",        ctrl.getCategories);
router.get("/:slug",   ctrl.getCategoryBySlug);

module.exports = router;
