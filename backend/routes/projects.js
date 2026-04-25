const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const { getProjects, createProject, updateMembers } = require("../controllers/projectController");

router.use(protect);

router.get("/", getProjects);
router.post("/", createProject);
router.put("/:id/members", updateMembers);

module.exports = router;
