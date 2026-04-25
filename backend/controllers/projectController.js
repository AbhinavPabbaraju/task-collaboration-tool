const Project = require('../models/Project');
const User = require('../models/User');

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { ownerId: req.user.id },
        { "members.user": req.user.id }
      ]
    }).populate("members.user", "username email").sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch projects." });
  }
};

const createProject = async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!name) return res.status(400).json({ error: "Project name is required" });
    
    const projectMembers = [];
    if (members && Array.isArray(members)) {
      for (const m of members) {
        const u = await User.findOne({ username: m.username });
        if (u && String(u._id) !== req.user.id) {
          projectMembers.push({ user: u._id, role: m.role || "Viewer" });
        }
      }
    }
    
    const project = await Project.create({
      name,
      ownerId: req.user.id,
      members: projectMembers
    });
    
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create project." });
  }
};

const updateMembers = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    
    const isOwner = String(project.ownerId) === String(req.user.id);
    const member = project.members.find(m => String(m.user) === String(req.user.id));
    const isAdmin = member && member.role === "Admin";
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Only admins can update members." });
    }
    
    const { username, role, action } = req.body; // action: 'add', 'remove', 'update'
    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    
    if (String(targetUser._id) === String(project.ownerId)) {
      return res.status(400).json({ error: "Cannot modify owner role." });
    }
    
    const existingIndex = project.members.findIndex(m => String(m.user) === String(targetUser._id));
    
    if (action === 'remove') {
      if (existingIndex > -1) {
        project.members.splice(existingIndex, 1);
      }
    } else {
      if (existingIndex > -1) {
        project.members[existingIndex].role = role || "Viewer";
      } else {
        project.members.push({ user: targetUser._id, role: role || "Viewer" });
      }
    }
    
    await project.save();
    await project.populate("members.user", "username email");
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update project members." });
  }
};

module.exports = { getProjects, createProject, updateMembers };
