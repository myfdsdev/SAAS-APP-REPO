import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Group from '../models/Group.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Upload single file (generic)
// @route   POST /api/upload
// @access  Private
// @form    file (multipart/form-data)
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const folder = req.body.folder || 'workflow/general';

  const result = await uploadToCloudinary(req.file.buffer, folder);

  res.status(201).json({
    url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
    size: result.bytes,
    resource_type: result.resource_type,
    original_name: req.file.originalname,
  });
});

// @desc    Upload multiple files
// @route   POST /api/upload/multiple
// @access  Private
// @form    files[] (multipart/form-data)
export const uploadMultiple = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const folder = req.body.folder || 'workflow/general';

  const uploads = await Promise.all(
    req.files.map((file) => uploadToCloudinary(file.buffer, folder))
  );

  const files = uploads.map((result, i) => ({
    url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
    size: result.bytes,
    original_name: req.files[i].originalname,
  }));

  res.status(201).json({ files, count: files.length });
});

// @desc    Upload profile photo (updates user record)
// @route   POST /api/upload/profile-photo
// @access  Private
// @form    photo
export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  // Only images
  if (!req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ error: 'Only images allowed' });
  }

  const result = await uploadToCloudinary(
    req.file.buffer,
    `workflow/profile-photos/${req.user._id}`
  );

  // Update user
  const user = await User.findById(req.user._id);

  // Delete old photo if exists (if URL contains cloudinary public_id)
  if (user.profile_photo && user.profile_photo.includes('cloudinary')) {
    try {
      const oldPublicId = user.profile_photo
        .split('/')
        .slice(-2)
        .join('/')
        .split('.')[0];
      await deleteFromCloudinary(oldPublicId);
    } catch (err) {
      console.error('Old photo delete failed:', err.message);
    }
  }

  user.profile_photo = result.secure_url;
  await user.save();

  res.json({
    message: 'Profile photo updated',
    profile_photo: result.secure_url,
    public_id: result.public_id,
  });
});

// @desc    Upload project file (adds to project.files array)
// @route   POST /api/upload/project/:projectId
// @access  Private (project member)
// @form    file
export const uploadProjectFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const project = await Project.findOne({
    _id: req.params.projectId,
    company_id: req.user.company_id,
  });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const result = await uploadToCloudinary(
    req.file.buffer,
    `workflow/projects/${project._id}`
  );

  const fileEntry = {
    file_name: req.file.originalname,
    file_url: result.secure_url,
    uploaded_by: req.user.full_name,
    uploaded_at: new Date(),
  };

  project.files.push(fileEntry);
  await project.save();

  res.status(201).json({
    message: 'File uploaded',
    file: fileEntry,
    public_id: result.public_id,
    project_id: project._id,
  });
});

// @desc    Upload group photo
// @route   POST /api/upload/group/:groupId/photo
// @access  Private (group admin)
// @form    photo
export const uploadGroupPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  const group = await Group.findOne({
    _id: req.params.groupId,
    company_id: req.user.company_id,
  });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const result = await uploadToCloudinary(
    req.file.buffer,
    `workflow/groups/${group._id}`
  );

  group.group_photo = result.secure_url;
  await group.save();

  res.json({
    message: 'Group photo updated',
    group_photo: result.secure_url,
  });
});

// @desc    Upload message attachment
// @route   POST /api/upload/message-attachment
// @access  Private
// @form    file
export const uploadMessageAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const result = await uploadToCloudinary(
    req.file.buffer,
    `workflow/messages/${req.user._id}`
  );

  res.status(201).json({
    url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
    size: result.bytes,
    resource_type: result.resource_type,
    original_name: req.file.originalname,
  });
});

// @desc    Delete file from Cloudinary
// @route   DELETE /api/upload/:publicId
// @access  Private
export const deleteFile = asyncHandler(async (req, res) => {
  const { public_id } = req.query;

  if (!public_id) {
    return res.status(400).json({ error: 'public_id query param required' });
  }

  const result = await deleteFromCloudinary(public_id);

  if (result.result !== 'ok' && result.result !== 'not found') {
    return res.status(400).json({ error: 'Delete failed', details: result });
  }

  res.json({ message: 'File deleted', result });
});
